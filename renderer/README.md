# Sandra Orchestrator — Backend Local

Backend orquestador para **Sandra Studio Ultimate** que coordina múltiples modelos de IA:

- **Qwen3-Max**: Texto puro, sin modificaciones
- **Qwen-VL**: Visión + análisis de lienzo
- **DeepSeek-R1**: Razonamiento + código

## ✅ Funcionalidades

- ✅ Generación de imágenes (desde lienzo + prompt)
- ✅ Video en tiempo real (FFmpeg + audio local)
- ✅ Artefactos descargables (código, JSON, HTML)
- ✅ Comunicación segura con Electron (IPC)
- ✅ 100% offline-capable (con Ollama + modelos descargados)

## 🔧 Instalación

```bash
npm install
```

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto:

```env
QWEN_API_KEY=tu_api_key_de_dashscope
DEEPSEEK_API_KEY=tu_api_key_de_deepseek
```

O usa variables de entorno del sistema.

## 🚀 Uso

```bash
npm start
```

## 📁 Estructura

```
sandra-orchestrator/
├── main.js                 # Electron main (IPC listeners)
├── orchestrator/
│   ├── index.js            # Router central
│   ├── models/
│   │   ├── qwen3-max.js    # Modelo de texto
│   │   ├── qwen-vl.js      # Modelo de visión
│   │   └── deepseek-r1.js  # Modelo de razonamiento
│   └── generators/
│       ├── image.js        # Generador de imágenes
│       ├── video.js        # Generador de video
│       └── artefact.js     # Generador de artefactos
├── temp/                   # Archivos temporales
├── outputs/                # Archivos generados
└── package.json
```

## 🔌 Integración con Electron

El orquestador se comunica con Electron mediante IPC:

- `sandra:chat` → Mensajes de chat
- `sandra:button` → Acciones de botones
- `sandra:canvas-update` → Actualizaciones del lienzo

## ⚠️ Privacidad

- Ningún modelo modificado
- Qwen3-Max usado en estado puro
- Datos locales por defecto (con Ollama)
- Sin tracking ni telemetría

## 🛠️ Requisitos

- Node.js >= 18.0.0
- FFmpeg (para generación de video)
- Python 3.x (opcional, para scripts de generación)

## 📝 Notas

- El orquestador intenta usar APIs primero, luego fallback a Ollama local
- Los archivos generados se guardan en `outputs/`
- Los archivos temporales se guardan en `temp/`

