/**
 * QWEN-VL — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Modelo de visión para:
 * - Análisis de lienzo
 * - Generación de imágenes
 * - Procesamiento de archivos
 * ═══════════════════════════════════════════════════════════════════════════
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const MODEL = 'qwen-vl-max'; // o 'qwen-vl-plus'

/**
 * Analizar y generar (imagen o archivo)
 */
async function analyzeAndGenerate(type, payload, callback) {
  if (!API_KEY) {
    return callback({
      error: 'API_KEY no configurada para Qwen-VL'
    });
  }

  try {
    console.log('[QWEN-VL] 🎨 Procesando:', type);

    if (type === 'image') {
      return await generateImage(payload, callback);
    }

    if (type === 'file') {
      return await analyzeFile(payload, callback);
    }

    callback({
      error: 'Tipo no soportado',
      type
    });

  } catch (error) {
    console.error('[QWEN-VL] ❌ Error:', error.message);
    callback({
      error: 'qwen-vl falló',
      detail: error.message
    });
  }
}

/**
 * Generar imagen desde lienzo + prompt
 */
async function generateImage(payload, callback) {
  try {
    const { text = 'una ilustración técnica detallada', canvasData } = payload;

    // Si hay canvas, guardarlo temporalmente
    let imageUrl = null;
    if (canvasData && canvasData.startsWith('data:image')) {
      const base64 = canvasData.split(',')[1];
      const tempPath = path.join(__dirname, '../../temp/canvas.png');
      
      // Crear directorio temp si no existe
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      await fs.writeFile(tempPath, Buffer.from(base64, 'base64'));
      
      // Convertir a URL para la API (o subir a un servicio)
      imageUrl = `file://${tempPath}`;
    }

    // Construir prompt
    const prompt = imageUrl 
      ? `Basado en el boceto proporcionado, genera: ${text}. Estilo técnico, alta resolución.`
      : `Genera una imagen de: ${text}. Estilo técnico, alta resolución.`;

    // Llamar a Qwen-VL para generación
    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: prompt
                },
                ...(imageUrl ? [{
                  image: imageUrl
                }] : [])
              ]
            }
          ]
        },
        parameters: {
          temperature: 0.7
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutos para generación de imágenes
      }
    );

    const imageUrl_result = response.data?.output?.results?.[0]?.url || 
                           response.data?.output?.image_url || 
                           null;

    if (!imageUrl_result) {
      throw new Error('No se generó imagen');
    }

    callback({
      type: 'image',
      url: imageUrl_result,
      action: 'download|display',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[QWEN-VL] ❌ Error generando imagen:', error.message);
    callback({
      error: 'Generación de imagen falló',
      detail: error.message
    });
  }
}

/**
 * Analizar archivo (imagen, PDF, etc.)
 */
async function analyzeFile(payload, callback) {
  try {
    const { filePath, fileData } = payload;

    if (!filePath && !fileData) {
      return callback({
        error: 'No se proporcionó archivo'
      });
    }

    // Leer archivo
    const fileBuffer = fileData || await fs.readFile(filePath);
    const base64 = fileBuffer.toString('base64');

    // Analizar con Qwen-VL
    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: 'Analiza este archivo y describe su contenido de forma detallada.'
                },
                {
                  image: `data:image/png;base64,${base64}`
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const analysis = response.data?.output?.choices?.[0]?.message?.content || 
                     response.data?.output?.text || 
                     'Análisis no disponible';

    callback({
      type: 'file-analysis',
      analysis,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[QWEN-VL] ❌ Error analizando archivo:', error.message);
    callback({
      error: 'Análisis de archivo falló',
      detail: error.message
    });
  }
}

module.exports = {
  analyzeAndGenerate,
  generateImage,
  analyzeFile
};

