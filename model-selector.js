// model-selector.js - Sistema inteligente de selección de modelos para StudioLab

// Definición de modelos disponibles con sus capacidades
const MODELS = {
  'qwen2.5:7b': {
    name: 'qwen2.5:7b',
    type: 'text',
    capabilities: ['text-generation', 'reasoning'],
    maxTokens: 4096,
    description: 'Modelo de texto general',
    mcp: true,
    vision: false
  },
  'qwen2-vl:7b': {
    name: 'qwen2-vl:7b',
    type: 'vision',
    capabilities: ['text-generation', 'image-analysis', 'vision'],
    maxTokens: 4096,
    description: 'Modelo con capacidad de visión',
    mcp: true,
    vision: true
  },
  'llama3.2:3b': {
    name: 'llama3.2:3b',
    type: 'text',
    capabilities: ['text-generation', 'reasoning'],
    maxTokens: 4096,
    description: 'Modelo ligero de texto',
    mcp: true,
    vision: false
  },
  'llava:7b': {
    name: 'llava:7b',
    type: 'vision',
    capabilities: ['text-generation', 'image-analysis', 'vision'],
    maxTokens: 4096,
    description: 'Modelo de visión y texto',
    mcp: false, // No compatible con MCP
    vision: true
  }
};

// Sistema de detección de tipo de entrada
const InputDetector = {
  // Detectar si la entrada contiene una imagen
  hasImage: (input) => {
    // Verificar si hay una imagen en el input (por ejemplo, como data URL o referencia)
    if (typeof input === 'string') {
      return input.includes('data:image') || input.includes('.jpg') || input.includes('.png') || input.includes('.jpeg') || input.includes('.gif');
    }
    return false;
  },
  
  // Detectar tipo de tarea basado en el texto
  detectTask: (input) => {
    if (typeof input !== 'string') return 'text';
    
    const lowerInput = input.toLowerCase();
    
    // Detectar si es una tarea de análisis de imagen
    if (InputDetector.hasImage(input) || 
        lowerInput.includes('imagen') || 
        lowerInput.includes('image') || 
        lowerInput.includes('foto') || 
        lowerInput.includes('photo') || 
        lowerInput.includes('análisis visual') ||
        lowerInput.includes('describe la imagen') ||
        lowerInput.includes('qué se ve en')) {
      return 'vision';
    }
    
    // Detectar si es una tarea de razonamiento complejo
    if (lowerInput.includes('razona') || 
        lowerInput.includes('analiza') || 
        lowerInput.includes('explica') || 
        lowerInput.includes('détallame') || 
        lowerInput.includes('investiga')) {
      return 'reasoning';
    }
    
    // Detectar si es una tarea de código
    if (lowerInput.includes('código') || 
        lowerInput.includes('code') || 
        lowerInput.includes('programa') || 
        lowerInput.includes('función') || 
        lowerInput.includes('script')) {
      return 'code';
    }
    
    // Por defecto, es una tarea de texto
    return 'text';
  },
  
  // Detectar complejidad de la entrada
  detectComplexity: (input) => {
    if (typeof input !== 'string') return 'low';
    
    const wordCount = input.split(' ').length;
    const charCount = input.length;
    
    if (charCount > 1000 || wordCount > 200) return 'high';
    if (charCount > 500 || wordCount > 100) return 'medium';
    
    return 'low';
  }
};

// Selector de modelos inteligente
class ModelSelector {
  constructor() {
    this.models = MODELS;
    this.currentModel = 'qwen2.5:7b'; // Modelo por defecto
    this.tokenUsage = {};
  }
  
  // Seleccionar modelo basado en entrada y requisitos
  selectModel(input, requirements = {}) {
    const taskType = InputDetector.detectTask(input);
    const complexity = InputDetector.detectComplexity(input);
    const hasImage = InputDetector.hasImage(input);
    
    // Requisitos específicos
    const needsVision = hasImage || taskType === 'vision';
    const needsMCP = requirements.mcp !== false; // Por defecto, se asume que necesita MCP
    const needsReasoning = taskType === 'reasoning';
    
    // Filtrar modelos según requisitos
    let availableModels = Object.values(this.models);
    
    // Filtrar por visión si se necesita
    if (needsVision) {
      availableModels = availableModels.filter(model => model.vision);
    }
    
    // Filtrar por MCP si se necesita
    if (needsMCP) {
      availableModels = availableModels.filter(model => model.mcp);
    }
    
    // Si hay modelos de visión disponibles y se necesita visión
    if (needsVision && availableModels.some(m => m.vision)) {
      // Priorizar modelos de visión que tengan MCP
      const visionMCP = availableModels.filter(m => m.vision && m.mcp);
      if (visionMCP.length > 0) {
        return visionMCP[0];
      }
      
      // Si no hay modelos de visión con MCP, tomar el primero de visión
      const visionModels = availableModels.filter(m => m.vision);
      if (visionModels.length > 0) {
        return visionModels[0];
      }
    }
    
    // Para tareas de razonamiento, priorizar modelos más potentes
    if (needsReasoning) {
      const reasoningModels = availableModels.filter(m => m.capabilities.includes('reasoning'));
      if (reasoningModels.length > 0) {
        // Tomar el modelo con más capacidad de razonamiento
        return reasoningModels[0];
      }
    }
    
    // Si se necesita MCP, priorizar modelos con MCP
    if (needsMCP) {
      const mcpModels = availableModels.filter(m => m.mcp);
      if (mcpModels.length > 0) {
        return mcpModels[0];
      }
    }
    
    // Por defecto, tomar el primer modelo disponible
    if (availableModels.length > 0) {
      return availableModels[0];
    }
    
    // Si no hay modelos disponibles, devolver el modelo por defecto
    return this.models['qwen2.5:7b'];
  }
  
  // Seleccionar modelo basado en tokens disponibles
  selectModelByTokens(input, availableTokens = 4096) {
    // Filtrar modelos por capacidad de tokens
    const modelsByTokenCapacity = Object.values(this.models)
      .filter(model => model.maxTokens >= input.length)
      .sort((a, b) => b.maxTokens - a.maxTokens);
    
    if (modelsByTokenCapacity.length > 0) {
      return modelsByTokenCapacity[0];
    }
    
    // Si no hay modelos con suficiente capacidad, tomar el de mayor capacidad
    return Object.values(this.models)
      .sort((a, b) => b.maxTokens - a.maxTokens)[0];
  }
  
  // Actualizar uso de tokens
  updateTokenUsage(modelName, tokensUsed) {
    if (!this.tokenUsage[modelName]) {
      this.tokenUsage[modelName] = { used: 0, available: 0 };
    }
    
    this.tokenUsage[modelName].used += tokensUsed;
    this.tokenUsage[modelName].available = this.models[modelName].maxTokens - this.tokenUsage[modelName].used;
  }
  
  // Obtener modelo actual
  getCurrentModel() {
    return this.models[this.currentModel];
  }
  
  // Establecer modelo actual
  setCurrentModel(modelName) {
    if (this.models[modelName]) {
      this.currentModel = modelName;
      return true;
    }
    return false;
  }
  
  // Obtener todos los modelos
  getAllModels() {
    return this.models;
  }
  
  // Obtener modelos por tipo
  getModelsByType(type) {
    return Object.values(this.models).filter(model => model.type === type);
  }
  
  // Obtener modelos con MCP
  getMCPModels() {
    return Object.values(this.models).filter(model => model.mcp);
  }
  
  // Obtener modelos con visión
  getVisionModels() {
    return Object.values(this.models).filter(model => model.vision);
  }
}

// Instancia global del selector de modelos
const modelSelector = new ModelSelector();

// Función para seleccionar modelo automáticamente
function selectModelForInput(input, requirements = {}) {
  return modelSelector.selectModel(input, requirements);
}

// Función para detectar tipo de entrada
function detectInputType(input) {
  return {
    taskType: InputDetector.detectTask(input),
    complexity: InputDetector.detectComplexity(input),
    hasImage: InputDetector.hasImage(input)
  };
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ModelSelector,
    modelSelector,
    selectModelForInput,
    detectInputType,
    MODELS
  };
}

// Hacer disponible globalmente
window.ModelSelector = ModelSelector;
window.modelSelector = modelSelector;
window.selectModelForInput = selectModelForInput;
window.detectInputType = detectInputType;

console.log('✅ Sistema inteligente de selección de modelos cargado');
console.log('✅ Disponible: window.modelSelector, window.selectModelForInput');