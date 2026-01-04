// 🌙 Servidor HTTP para Sandra Elysium
// Sirve el index.html en el dominio sandra.guestsvalencia.es
// Maneja rutas SPA: todas las rutas sin extensión sirven index.html

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DOMAIN = 'sandra.guestsvalencia.es';

// MIME types para diferentes archivos
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.apk': 'application/vnd.android.package-archive'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Parsear la URL y limpiar query strings
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let filePath = parsedUrl.pathname;
    
    // Normalizar rutas
    // Si es la raíz o no tiene extensión, servir index.html
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }
    
    // Construir ruta completa del archivo
    let fullPath = path.join(__dirname, filePath);
    
    // Si el archivo no tiene extensión, intentar servir index.html (SPA routing)
    const extname = String(path.extname(filePath)).toLowerCase();
    const hasExtension = extname && extname.length > 0;
    
    // Si no tiene extensión y no es un archivo específico, servir index.html
    if (!hasExtension && filePath !== '/index.html' && filePath !== '/sw.js') {
        fullPath = path.join(__dirname, 'index.html');
    }

    // Obtener el tipo de contenido
    const contentType = mimeTypes[extname] || (hasExtension ? 'application/octet-stream' : 'text/html');

    // Leer el archivo
    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Archivo no encontrado - servir index.html como fallback (SPA routing)
                const indexPath = path.join(__dirname, 'index.html');
                fs.readFile(indexPath, (err, html) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Error del servidor: ' + err.code);
                    } else {
                        res.writeHead(200, { 
                            'Content-Type': 'text/html',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(html, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error del servidor: ' + error.code);
            }
        } else {
            // Archivo encontrado
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'X-Powered-By': 'Sandra-Elysium',
                'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=31536000'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   🌙 Sandra Elysium - Servidor HTTP Activo              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║   Puerto: ${PORT.toString().padEnd(47)} ║`);
    console.log(`║   Dominio: ${DOMAIN.padEnd(45)} ║`);
    console.log(`║   URL: http://localhost:${PORT.toString().padEnd(40)} ║`);
    console.log(`║   URL: https://${DOMAIN.padEnd(42)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n✨ Servidor listo para servir Sandra Elysium\n');
});

// Manejo de errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Error: El puerto ${PORT} ya está en uso.`);
        console.error(`   Intenta usar otro puerto: PORT=3001 node server.js`);
    } else {
        console.error('❌ Error del servidor:', error);
    }
    process.exit(1);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});
