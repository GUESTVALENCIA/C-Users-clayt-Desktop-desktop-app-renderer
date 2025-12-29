# 🤖 AUTO MULTIMODAL BUTTON - Guía Completa

## ✨ Capacidades Principales

El botón **AUTO** ahora es un orquestador inteligente multimodal que soporta:

- 📝 **Texto**: Procesamiento de mensajes
- 📷 **Imágenes**: Hasta 5 imágenes simultáneamente
- 🔊 **Audio**: Transcripción (futuro)
- 🤯 **AUTO Selection**: Elige el modelo óptimo automáticamente

---

## 🚀 Cómo Usar

### Paso 1: Cargar Imágenes (Opcional)
```
1. Click en botón ➕ (esquina inferior izquierda)
2. Seleccionar "🖼️ Imágenes"
3. Elegir 1-5 imágenes
4. Verás miniaturas 80x80px debajo del input
5. Puedes eliminar con el ✕ rojo
```

### Paso 2: Escribir Mensaje
```
Escribe tu pregunta/solicitud en el textarea:

Ejemplos:
- "¿Qué ves en esta imagen?" (+ 1 imagen)
- "Analiza el contenido de estos documentos" (+ 3 PDFs/imágenes)
- "Describa la escena" (+ screenshot)
```

### Paso 3: Click en AUTO
```
1. Click en botón ⚡ AUTO
2. Verás logs en terminal:
   🤖 AUTO MULTIMODAL: Analizando mensaje + N imagen(es)...
   ✅ AUTO: Modelo seleccionado: [MODELO]
   📊 Respuesta en el chat
```

---

## 🧠 Selección Automática de Modelos

### AUTO elige automáticamente:

```
INPUT                          MODELO SELECCIONADO
────────────────────────────────────────────────────
Texto simple (< 1000 chars)  → Llama 3.1 8B Instant
Texto complejo (> 1000)      → Llama 3.3 70B
Razonamiento complejo        → GPT-OSS 120B
Texto + 1 imagen             → Llama 4 Scout
Texto + 2+ imágenes          → Llama 4 Maverick
Audio solamente              → Whisper Large V3
```

### Especificaciones de Modelos

| Modelo | Tokens/seg | Contexto | Capacidades |
|--------|-----------|----------|------------|
| Llama 3.1 8B | 560 | 8K | Chat rápido |
| Llama 3.3 70B | 280 | 8K | Análisis profundo |
| GPT-OSS 120B | 500 | 8K | Razonamiento |
| Llama 4 Scout | Fast | 128K | Visión compacta |
| Llama 4 Maverick | Fast | 128K | Visión avanzada |
| Whisper V3 | Variable | - | Transcripción |

---

## 📊 Casos de Uso

### 1️⃣ Análisis de Screenshots
```
Usuario: "¿Qué está mal en esta UI?" + [screenshot.png]
↓
AUTO: Selecciona Llama 4 Scout
↓
Respuesta: Análisis detallado de la interfaz
```

### 2️⃣ OCR de Documentos
```
Usuario: "Extrae el texto de esta imagen" + [documento.jpg]
↓
AUTO: Selecciona Llama 4 Scout con modo OCR
↓
Respuesta: Texto extraído preservando formato
```

### 3️⃣ Descripción de Imágenes
```
Usuario: "Describe qué ves aquí" + [foto.jpg]
↓
AUTO: Selecciona Llama 4 Scout
↓
Respuesta: Descripción detallada y análisis visual
```

### 4️⃣ Q&A sobre Múltiples Imágenes
```
Usuario: "Compara estas 3 screenshots" + [img1, img2, img3]
↓
AUTO: Selecciona Llama 4 Maverick (mejor para múltiples)
↓
Respuesta: Comparación lado a lado
```

### 5️⃣ Clasificación Visual
```
Usuario: "¿Qué categoría?" + [imagen]
↓
AUTO: Selecciona Llama 4 Scout con modo classification
↓
Respuesta: Categorización automática
```

---

## 🔧 Detalles Técnicos

### Limitaciones de Imágenes
```
✅ Máximo 5 imágenes por solicitud
✅ URL: máx 20MB por imagen
✅ Base64: máx 4MB por imagen
✅ Resolución máx: 33 MP (megapixeles)
✅ Formatos: JPG, PNG, GIF, WebP, JPEG
```

### Token Costs (Aproximado)
```
Texto corto (< 100 tokens)    ≈ 0.001 USD
Texto medio (500 tokens)      ≈ 0.005 USD
Imagen (promedio)             ≈ 200 tokens
Texto + 1 imagen              ≈ 300 tokens
```

### Velocidad de Procesamiento
```
Texto solo:      < 2 segundos (modelo rápido)
Imagen simple:   2-5 segundos (Scout)
Múltiples imag:  5-10 segundos (Maverick)
Razonamiento:    5-15 segundos (GPT-OSS)
```

---

## 💡 Tips y Tricks

### 1. Prompts Efectivos
```
❌ MAL:    "Analiza esta imagen"
✅ BIEN:   "Analiza esta captura de pantalla de error. ¿Qué falla hay?"

❌ MAL:    "Extrae texto"
✅ BIEN:   "Extrae TODO el texto de este documento, mantén formato"

❌ MAL:    "¿Qué ves?"
✅ BIEN:   "Describe en detalle la composición y elementos de esta foto"
```

### 2. Máxima Precisión
```
- Subir imágenes bien iluminadas
- Evitar imágenes borrosas o giradas
- Especificar qué tipo de análisis necesitas
- Para OCR: imágenes de frente sin ángulo
```

### 3. Guardar Contexto
```
- Terminal muestra qué modelo se usó
- Puedes ver tokens consumidos
- Adjuntos se guardan en localStorage
- Historial mantiene context anterior
```

### 4. Limpiar Adjuntos
```
- Click en ✕ rojo para eliminar una imagen
- Se limpian automáticamente después de procesar
- O manualmente si no usas AUTO
```

---

## 🐛 Troubleshooting

### Problema: "Groq API multimodal no disponible"
```
Solución:
1. Verificar conexión a internet
2. Verificar GROQ_API_KEY en .env
3. Reiniciar app
4. Verificar logs en terminal
```

### Problema: Imágenes no aparecen en preview
```
Solución:
1. Verificar que sea archivo imagen (JPG, PNG)
2. Verificar tamaño < 20MB
3. Esperar a que se cargue
4. Actualizar página si falla
```

### Problema: Respuesta es genérica sin análisis visual
```
Solución:
1. Probar con otra imagen más clara
2. Escribir prompt más específico
3. Verificar que AUTO seleccionó modelo de visión
4. Revisar logs de terminal para errores
```

### Problema: Lentitud excesiva
```
Solución:
1. Usar Llama 3.1 8B (rápido) en lugar de 3.3
2. Reducir cantidad de imágenes a < 3
3. Usar screenshots en lugar de fotos HD
4. Esperar a que responda (no hacer spam)
```

---

## 📈 Flujo Completo Paso a Paso

```
START
  ↓
Usuario escribe: "Analiza esta UI"
  ↓
Click ➕ Imágenes → Selecciona screenshot.png
  ↓
Miniatura aparece en preview (80x80px)
  ↓
Click botón ⚡ AUTO
  ↓
[Terminal] 🤖 AUTO MULTIMODAL: Analizando mensaje + 1 imagen(es)...
  ↓
[Groq API] Detecta: {text: "...", images: ["data:image/png;base64,..."], ...}
  ↓
[AUTO selector] Detecta modalidad "multimodal" (texto + imágenes)
  ↓
[AUTO selector] Elige modelo: Llama 4 Scout (compacto, rápido)
  ↓
[Groq API] Procesa petición con Llama 4 Scout
  ↓
[Terminal] ✅ AUTO: Modelo seleccionado: meta-llama/llama-4-scout-17b-16e-instruct
  ↓
[Terminal] Modalidad: multimodal
  ↓
[Terminal] Imágenes analizadas: 1
  ↓
[Terminal] Tokens usados: entrada=450, salida=320
  ↓
[Chat] Respuesta: "Análisis detallado de la UI..."
  ↓
[Terminal] 🧹 AUTO: Imágenes procesadas y limpiadas
  ↓
Preview de imágenes desaparece (estado limpio)
  ↓
END
```

---

## 🔗 Integración con Groq API

### Métodos Disponibles en window.groq

```javascript
// Chat simple
window.groq.chat("Hola", {model: "llama-3.1-8b-instant"})

// Chat con visión
window.groq.chatWithVision("¿Qué ves?", ["image.jpg"])

// Análisis visual
window.groq.analyzeImage("image.jpg", "ocr")

// AUTO Multimodal (selección automática)
window.groq.autoMultimodal({
  text: "Mensaje",
  images: ["img1.jpg", "img2.jpg"],
  complexReasoning: true
})
```

---

## 📚 Referencias

- **Groq Docs**: https://console.groq.com/docs
- **Vision API**: https://console.groq.com/docs/vision
- **Models**: https://console.groq.com/docs/models
- **Pricing**: https://console.groq.com/pricing

---

## ✅ Checklist: Usar AUTO Multimodal

- [ ] App abierta y funcionando
- [ ] Mensaje escrito en textarea
- [ ] Imágenes cargadas (opcional) con ➕
- [ ] Terminal visible para ver logs
- [ ] Click en botón ⚡ AUTO
- [ ] Esperar respuesta y revisar logs
- [ ] Verificar qué modelo se seleccionó
- [ ] Limpiar adjuntos cuando termines

---

**Status**: ✅ MULTIMODAL COMPLETAMENTE FUNCIONAL

**Versión**: 1.0.0

**Última actualización**: 2025-12-29
