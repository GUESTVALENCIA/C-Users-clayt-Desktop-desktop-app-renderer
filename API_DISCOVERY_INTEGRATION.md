# 🔍 API DISCOVERY SYSTEM - Integración Completa

## Descripción General

Sistema centralizado de **descubrimiento automático de APIs gratuitas** para todos los modelos IA en el MCP Universal.

**1292 APIs documentadas** en **51 categorías**, con información de:
- Autenticación requerida
- Soporte HTTPS
- Soporte CORS
- Documentación oficial
- Alternativas gratuitas

---

## Componentes

### 1. **api-parser.js**
Extrae todas las APIs del repo `public-apis/README.md` y genera `public-apis-database.json`

**Uso:**
```bash
node api-parser.js
```

**Output:** `public-apis-database.json` (1292 APIs en formato JSON)

### 2. **api-discovery-service.js**
Servicio Node.js con métodos para:
- Buscar APIs por cualquier criterio
- Filtrar por características (HTTPS, CORS, auth)
- Obtener alternativas gratuitas
- Generar recomendaciones por tarea
- Crear instrucciones del sistema para modelos IA

**Métodos principales:**
```javascript
const service = new APIDiscoveryService();

service.search('weather');                    // Búsqueda general
service.getByCategory('Weather');             // Todas las APIs de una categoría
service.getFreeAPIs('weather');               // Solo APIs gratuitas
service.getAlternatives('payment');           // Alternativas para un servicio
service.getRecommendations('weather app');    // Recomendaciones para tarea
service.getSystemInstruction();               // Prompt para modelos IA
```

### 3. **api-discovery-routes.js**
Rutas Express para exponer el servicio via HTTP

**Endpoints:**
```
GET  /api/discovery/search              - Buscar APIs
GET  /api/discovery/category/:name      - APIs de categoría
GET  /api/discovery/categories          - Todas las categorías
GET  /api/discovery/free                - APIs gratuitas
POST /api/discovery/filter              - Filtrar por características
GET  /api/discovery/alternatives/:svc   - Alternativas para servicio
POST /api/discovery/recommend           - Recomendaciones por tarea
GET  /api/discovery/stats               - Estadísticas
GET  /api/discovery/system-instruction  - Prompt para modelos
GET  /api/discovery/all                 - Todas las APIs (caché)
```

---

## 📋 Estadísticas de Base de Datos

```
Total APIs:               1292
Categorías:              51
APIs Gratuitas:          638 (49%)
APIs HTTPS:              1204 (93%)
APIs CORS:               364 (28%)
APIs con Auth:           654 (51%)

Top Categorías:
- Development:           120 APIs
- Cryptocurrency:        64 APIs
- Games & Comics:        96 APIs
- Geocoding:             86 APIs
- Government:            86 APIs
```

---

## 🚀 Integración en MCP Universal

### Paso 1: Copiar Archivos

```bash
# En /tmp/PWA (repo del MCP)
cp /path/to/api-parser.js .
cp /path/to/api-discovery-service.js ./src/services/
cp /path/to/api-discovery-routes.js ./src/routes/
cp /path/to/public-apis-database.json ./database/
cp -r /path/to/public-apis ./
```

### Paso 2: Actualizar `server.js`

```javascript
// Importar servicio
import apiDiscoveryRoutes from './src/routes/api-discovery-routes.js';

// En setup de rutas:
app.use('/api/discovery', apiDiscoveryRoutes);
```

### Paso 3: Cargar en NEON PostgreSQL

```javascript
// En NeonService.js, agregar tabla:
CREATE TABLE public_apis (
  id SERIAL PRIMARY KEY,
  api_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  auth VARCHAR(50),
  https BOOLEAN DEFAULT true,
  cors BOOLEAN DEFAULT false,
  requires_key BOOLEAN DEFAULT false,
  auth_type VARCHAR(100),
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  search_vector tsvector
);

CREATE INDEX idx_category ON public_apis(category);
CREATE INDEX idx_search ON public_apis USING GIN(search_vector);
```

**Script de carga:**
```javascript
// load-apis-to-neon.js
const { APIDiscoveryService } = require('./api-discovery-service');
const neon = require('@neondatabase/serverless');

async function loadAPIsToNeon() {
  const service = new APIDiscoveryService();
  const apis = service.apis;

  const client = neon(process.env.DATABASE_URL);

  for (const api of apis) {
    await client.query(
      `INSERT INTO public_apis (api_id, name, url, description, category, auth, https, cors, requires_key, auth_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (api_id) DO UPDATE SET updated_at = NOW()`,
      [api.id, api.name, api.url, api.description, api.category, api.auth, api.https, api.cors, api.requiresKey, api.authType]
    );
  }

  console.log(`✓ Cargadas ${apis.length} APIs en NEON`);
}

loadAPIsToNeon();
```

---

## 🧠 Sistema de Instrucciones para Modelos IA

Cada modelo IA recibe automáticamente un "system instruction" que le dice:

```
ANTES DE REALIZAR CUALQUIER TAREA:
1. Consultar la base de datos de APIs gratuitas
2. Si existe API gratuita → USAR ESA
3. Si es de pago → Solicitar alternativa gratuita
4. Como último recurso → Solución local

Endpoint: GET /api/discovery/system-instruction
```

---

## 💻 Integración en Desktop App

### 1. Importar en `main.js`

```javascript
const { APIDiscoveryService } = require('./api-discovery-service');

app.whenReady().then(() => {
  // Inicializar servicio
  global.apiDiscoveryService = new APIDiscoveryService();
  console.log(`[Desktop] API Discovery: ${global.apiDiscoveryService.apis.length} APIs disponibles`);
});
```

### 2. Exponer en `preload.js`

```javascript
contextBridge.exposeInMainWorld('apiDiscovery', {
  search: (query) => ipcRenderer.invoke('api:search', query),
  getCategory: (category) => ipcRenderer.invoke('api:getCategory', category),
  getRecommendations: (task) => ipcRenderer.invoke('api:recommend', task),
  getFreeAPIs: () => ipcRenderer.invoke('api:free'),
  getStats: () => ipcRenderer.invoke('api:stats')
});
```

### 3. IPC Handlers en `main.js`

```javascript
ipcMain.handle('api:search', async (_, query) => {
  return global.apiDiscoveryService.search(query);
});

ipcMain.handle('api:recommend', async (_, task) => {
  return global.apiDiscoveryService.getRecommendations(task);
});

ipcMain.handle('api:free', async () => {
  return global.apiDiscoveryService.getFreeAPIs();
});

ipcMain.handle('api:stats', async () => {
  return global.apiDiscoveryService.getStats();
});
```

### 4. Usar en HTML/JS

```javascript
// Obtener recomendaciones para tarea actual
const recommendations = await window.apiDiscovery.getRecommendations('build weather app');

// Mostrar APIs gratuitas al usuario
const freeAPIs = await window.apiDiscovery.getFreeAPIs();

// Buscar alternativas
const alternatives = await window.apiDiscovery.search('payment');
```

---

## 🔄 Workflow Completo

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario pide: "Necesito integrar pagos en mi app"          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Modelo IA recibe SYSTEM INSTRUCTION:                        │
│  "Primero consulta /api/discovery/recommend"                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  POST /api/discovery/recommend                               │
│  { "task": "pagos app" }                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Retorna alternativas:                                       │
│  - Stripe (gratis hasta $X)                                  │
│  - Square (gratis primeros 30 días)                          │
│  - PayPal (sin setup fees)                                   │
│  - Razorpay (en ciertos países gratis)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Modelo IA propone la mejor opción                           │
│  Envía Proposal al MCP Universal                             │
│  Otros agentes pueden revisar y comentar                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Usuario aprueba → Implementación automática                 │
│  Genera código de integración                                │
│  Configura API keys                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Casos de Uso

### 1. Búsqueda Simple
```
Usuario: "Quiero datos del clima"
Modelo busca: /api/discovery/search?query=weather&filters={"free":true}
Resultado: 33 APIs de clima, 15 son gratuitas
```

### 2. Alternativas Gratuitas
```
Usuario: "Necesito autenticación OAuth"
Modelo busca: /api/discovery/free?query=oauth
Resultado: Auth0, Firebase Auth, Supabase (todas gratis con límite)
```

### 3. Recomendaciones por Categoría
```
Usuario: "Voy a hacer una app de mapas"
Modelo pide: POST /api/discovery/recommend { "task": "mapas" }
Resultado: Google Maps API, Mapbox, OpenStreetMap, Leaflet
```

### 4. Filtrado Avanzado
```
POST /api/discovery/filter
{
  "https": true,
  "cors": true,
  "requiresAuth": false,
  "category": "development"
}
Resultado: APIs seguras, CORS-enabled, sin auth, de desarrollo
```

---

## ⚙️ Configuración en .env

```env
# MCP Universal Server
DATABASE_URL=postgresql://...neon.tech/neondb
API_DISCOVERY_ENABLED=true
API_DISCOVERY_CACHE_TTL=3600

# Desktop App
API_DISCOVERY_LOCAL=true
API_DISCOVERY_SERVICE_URL=http://localhost:3000/api/discovery
```

---

## 🔒 Seguridad

- ✓ No expone API keys en búsquedas
- ✓ Caché local para offline mode
- ✓ Rate limiting en endpoints
- ✓ CORS restringido a dominios autorizados
- ✓ Validación de entrada

---

## 📈 Beneficios

| Beneficio | Impacto |
|-----------|---------|
| **Costo Reducido** | 638 APIs gratuitas disponibles |
| **Desarrollo Rápido** | Documentación centralizada |
| **Compatibilidad** | HTTPS/CORS verificados |
| **Inteligencia** | Recomendaciones automáticas |
| **Disponibilidad** | Alternativas para cada servicio |

---

## 🚀 Próximos Pasos

- [ ] Deploy a Render.com (MCP Universal)
- [ ] Agregar 1292 APIs a NEON PostgreSQL
- [ ] Crear dashboard de estadísticas
- [ ] Implementar caché Redis
- [ ] Notificaciones de nuevas APIs
- [ ] Feedback de usuarios sobre APIs
- [ ] Integración con GitHub updates

---

## 📞 Endpoints Rápida Referencia

```bash
# Búsqueda rápida
curl "http://localhost:3000/api/discovery/search?query=weather&free=true"

# Obtener categorías
curl http://localhost:3000/api/discovery/categories

# APIs de una categoría
curl http://localhost:3000/api/discovery/category/Weather

# Estadísticas
curl http://localhost:3000/api/discovery/stats

# System instruction para modelos
curl http://localhost:3000/api/discovery/system-instruction

# Todas las APIs (para caché local)
curl http://localhost:3000/api/discovery/all
```

---

**Sistema listo para que TODOS los modelos IA utilicen APIs gratuitas automáticamente.**
