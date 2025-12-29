#!/usr/bin/env python3
"""
MCP Server para Memoria Persistente de QWEN en NEON
Puerto: 8765
Endpoint: /mcp
Conecta con la base de datos PostgreSQL de NEON para almacenar memoria persistente de la Reina QWEN
"""
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Cargar variables de entorno
try:
    from dotenv import load_dotenv
    load_dotenv()  # Cargar desde .env
    print("[OK] Variables de entorno cargadas")
except ImportError:
    print("[WARN] python-dotenv no instalado. Usando variables de entorno del sistema.")

# Obtener DATABASE_URL - URL real de NEON desde variables de entorno
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("[ERROR] DATABASE_URL no encontrado en variables de entorno")
    print("   Por favor configura DATABASE_URL en tu archivo .env")
    sys.exit(1)
else:
    print("[OK] DATABASE_URL encontrado en variables de entorno")

MCP_PORT = int(os.getenv('MCP_NEON_PORT', 8765))

# Importar psycopg2
try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("[ERROR] psycopg2 no instalado")
    print("   Ejecuta: pip install psycopg2-binary")
    sys.exit(1)

def get_neon_conn():
    """Obtener conexion a NEON"""
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print("[ERROR] Error conectando a NEON: " + str(e))
        raise

def init_reina_memory():
    """Inicializar tabla en NEON (si no existe)"""
    try:
        with get_neon_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS reina_memory (
                        id SERIAL PRIMARY KEY,
                        session_id TEXT NOT NULL,
                        key TEXT NOT NULL,
                        value JSONB NOT NULL,
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(session_id, key)
                    );
                    CREATE INDEX IF NOT EXISTS idx_session_key ON reina_memory(session_id, key);
                    CREATE INDEX IF NOT EXISTS idx_updated_at ON reina_memory(updated_at DESC);
                """)
                conn.commit()
        print("[OK] Tabla reina_memory verificada/creada en NEON")
        return True
    except Exception as e:
        print("[WARN] Advertencia al inicializar tabla: " + str(e))
        return False

class MCPHandler(BaseHTTPRequestHandler):
    """Handler para peticiones MCP"""
    
    def log_message(self, format, *args):
        """Silenciar logs HTTP estandar"""
        pass
    
    def do_OPTIONS(self):
        """Manejar CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Manejar peticiones POST a /mcp"""
        if self.path == '/mcp':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                req = json.loads(post_body.decode('utf-8'))
                
                if req.get("mcp") and isinstance(req.get("calls"), list):
                    results = []
                    for call in req["calls"]:
                        server = call.get("server")
                        tool = call.get("tool")
                        args = call.get("arguments", {})
                        result = self.handle_tool(server, tool, args)
                        results.append({
                            "server": server,
                            "tool": tool,
                            "result": result
                        })
                    self.respond(200, {"status": "ok", "results": results})
                    return
            except Exception as e:
                print("[ERROR] Error procesando peticion MCP: " + str(e))
                self.respond(500, {"error": str(e)})
                return
        
        self.respond(404, {"error": "Not Found"})
    
    def handle_tool(self, server, tool, args):
        """Ejecutar herramienta MCP"""
        # Memoria de la Reina (NEON) - con manejo de errores mejorado
        if server == "reina" and tool in ("get_memory", "set_memory"):
            try:
                return self.handle_reina_memory(tool, args)
            except psycopg2.OperationalError as e:
                print("[ERROR] Error de conexion a la base de datos: " + str(e))
                return {"error": "Error de conexion a la base de datos. Usando modo offline.", "fallback": True}
            except Exception as e:
                print("[ERROR] Error en herramienta de memoria: " + str(e))
                return {"error": "Error en operación de memoria: " + str(e)}
        
        # Ejecucion de codigo Python
        if server == "python" and tool == "run_code":
            return self.run_code(args.get("code", ""), args.get("timeout_ms", 5000))
        
        # Sistema de archivos
        if server == "fs" and tool == "read_file":
            return self.read_file(args.get("path", ""))
        if server == "fs" and tool == "write_file":
            return self.write_file(args.get("path", ""), args.get("content", ""))
        
        # Comandos shell
        if server == "shell" and tool == "run_command":
            return self.run_command(args.get("command", ""), args.get("timeout_ms", 10000))
        
        return {"error": "Herramienta no soportada: " + server + "/" + tool}
    
    def handle_reina_memory(self, tool, args):
        """Manejar memoria de la Reina en NEON"""
        session_id = args.get("session_id", "clay_main")
        key = args.get("key", "core_identity")
        
        try:
            if tool == "get_memory":
                with get_neon_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """SELECT value FROM reina_memory 
                               WHERE session_id = %s AND key = %s 
                               ORDER BY updated_at DESC LIMIT 1""",
                            (session_id, key)
                        )
                        row = cur.fetchone()
                        if row:
                            # psycopg2 devuelve JSONB como dict/list directamente
                            value = row[0]
                            if isinstance(value, str):
                                return json.loads(value)
                            return value
                        else:
                            return {"status": "empty"}
            
            elif tool == "set_memory":
                value = args.get("value", {})
                with get_neon_conn() as conn:
                    with conn.cursor() as cur:
                        # Usar Json() para convertir dict a JSONB
                        cur.execute("""
                            INSERT INTO reina_memory (session_id, key, value)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (session_id, key)
                            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                        """, (session_id, key, Json(value)))
                        conn.commit()
                return {"status": "saved", "session_id": session_id, "key": key}
        
        except psycopg2.OperationalError as e:
            print("[ERROR] Error de conexion a la base de datos: " + str(e))
            return {"error": "Error de conexion a la base de datos. Usando modo offline.", "fallback": True}
        except Exception as e:
            print("[ERROR] Error en handle_reina_memory: " + str(e))
            return {"error": str(e), "tool": tool}
    
    def run_code(self, code, timeout_ms):
        """Ejecutar codigo Python"""
        import tempfile
        import subprocess
        import os
        
        with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as f:
            f.write(code)
            f_path = f.name
        
        try:
            result = subprocess.run(
                [sys.executable, f_path],
                capture_output=True,
                text=True,
                timeout=timeout_ms / 1000
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "timeout"}
        finally:
            try:
                os.unlink(f_path)
            except:
                pass
    
    def read_file(self, path):
        """Leer archivo"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return {"content": f.read()}
        except Exception as e:
            return {"error": str(e)}
    
    def write_file(self, path, content):
        """Escribir archivo"""
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {"status": "written", "path": path}
        except Exception as e:
            return {"error": str(e)}
    
    def run_command(self, cmd, timeout_ms):
        """Ejecutar comando shell"""
        import subprocess
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout_ms / 1000
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"error": "timeout"}
    
    def respond(self, code, data):
        """Responder peticion HTTP"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

if __name__ == '__main__':
    print("[INFO] Iniciando MCP Server NEON en puerto " + str(MCP_PORT) + "...")
    print("[INFO] Conectando a NEON: " + DATABASE_URL.split('@')[1].split('/')[0])
    
    # Inicializar tabla
    if init_reina_memory():
        print("[OK] NEON lista. Reina puede reinar.")
    else:
        print("[WARN] Advertencia: No se pudo verificar tabla. Verifica DATABASE_URL.")
    
    try:
        server = HTTPServer(('localhost', MCP_PORT), MCPHandler)
        print("[OK] MCP Server NEON corriendo en http://localhost:" + str(MCP_PORT) + "/mcp")
        print("   Presiona Ctrl+C para detener")
        server.serve_forever()
    except KeyboardInterrupt:
        print("[STOP] MCP Server NEON detenido")
    except Exception as e:
        print("[ERROR] Error iniciando servidor: " + str(e))
        sys.exit(1)