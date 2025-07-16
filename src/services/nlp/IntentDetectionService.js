const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

class IntentDetectionService {
  constructor() {
    // Patrones de intenciones con pesos de confianza
    this.intentPatterns = {
      // Intenciones principales
      request_taxi: {
        patterns: [
          'necesito un taxi', 'quiero un taxi', 'pedir taxi', 'llamar taxi',
          'busco taxi', 'taxi por favor', 'taxi urgente', 'taxi ya',
          'me llevas', 'me traes', 'me acercas', 'me llevo',
          'desde [address] hasta [address]', 'de [address] a [address]',
          'salgo de [address]', 'voy a [address]', 'me dirijo a [address]'
        ],
        confidence: 0.9,
        priority: 1
      },
      
      provide_address: {
        patterns: [
          'desde [address]', 'salgo de [address]', 'origen [address]',
          'hasta [address]', 'voy a [address]', 'destino [address]',
          'me dirijo a [address]', 'me llevas a [address]',
          '[address]', 'estoy en [address]', 'vivo en [address]'
        ],
        confidence: 0.8,
        priority: 2
      },
      
      specify_payment: {
        patterns: [
          'pago con [payment]', 'pagás con [payment]', 'pago [payment]',
          'transferencia', 'efectivo', 'tarjeta', 'débito', 'crédito',
          'mercado pago', 'paypal', 'dinero en mano'
        ],
        confidence: 0.85,
        priority: 3
      },
      
      specify_time: {
        patterns: [
          'a las [time]', 'para las [time]', 'hora [time]',
          'ahora', 'ya', 'inmediato', 'urgente', 'para más tarde',
          'mañana', 'hoy', 'esta noche', 'esta tarde'
        ],
        confidence: 0.8,
        priority: 4
      },
      
      ask_question: {
        patterns: [
          '¿[question]?', '?', 'qué', 'cómo', 'cuándo', 'dónde',
          'cuánto cuesta', 'cuánto sale', 'precio', 'tarifa',
          'tiempo de espera', 'cuánto tarda', 'disponibilidad',
          'aceptan [payment]', 'puedo llevar [item]', 'mascotas',
          'equipaje', 'maletas', 'bolsos'
        ],
        confidence: 0.7,
        priority: 5
      },
      
      confirm_action: {
        patterns: [
          'sí', 'confirmo', 'confirmar', 'ok', 'okay', 'dale',
          'perfecto', 'excelente', 'genial', 'listo', 'ya está',
          'proceder', 'adelante', 'hacer el viaje'
        ],
        confidence: 0.9,
        priority: 6
      },
      
      cancel_action: {
        patterns: [
          'no', 'cancelar', 'cancelo', 'no gracias', 'me arrepentí',
          'cambié de opinión', 'no quiero', 'para', 'stop',
          'terminar', 'finalizar'
        ],
        confidence: 0.9,
        priority: 7
      },
      
      request_help: {
        patterns: [
          'ayuda', 'help', 'soporte', 'no entiendo', 'explicame',
          'cómo funciona', 'qué puedo hacer', 'opciones',
          'menú', 'comandos', 'instrucciones'
        ],
        confidence: 0.8,
        priority: 8
      },
      
      express_frustration: {
        patterns: [
          'estoy enojado', 'me molesta', 'no funciona', 'problema',
          'error', 'falla', 'no sirve', 'pésimo', 'terrible',
          'muy mal', 'horrible', 'no puedo más'
        ],
        confidence: 0.7,
        priority: 9
      },
      
      express_urgency: {
        patterns: [
          'urgente', 'ya', 'inmediato', 'rápido', 'apuro',
          'emergencia', 'importante', 'necesito ya',
          'sin demora', 'ahora mismo'
        ],
        confidence: 0.8,
        priority: 10
      }
    };
    
    // Entidades que podemos extraer
    this.entityPatterns = {
      address: {
        patterns: [
          /(?:desde|hasta|a|de|en|para)\s+([^,]+?)(?:\s+(?:hasta|a|de|en|para)|$)/gi,
          /(?:origen|destino|salgo|voy)\s+(?:de|a|en)\s+([^,]+?)(?:\s|$)/gi,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:avenida|av\.|calle|pasaje|plaza|ruta|rta\.|nacional|nro\.|número|#))/gi
        ]
      },
      
      time: {
        patterns: [
          /(?:a las|para las|hora)\s+(\d{1,2}:\d{2})/gi,
          /(?:a las|para las|hora)\s+(\d{1,2}\s*(?:am|pm|AM|PM))/gi,
          /(?:ahora|ya|inmediato|urgente|mañana|hoy|esta noche|esta tarde)/gi
        ]
      },
      
      payment: {
        patterns: [
          /(?:pago|pagás)\s+(?:con\s+)?(transferencia|efectivo|tarjeta|débito|crédito|mercado\s+pago|paypal)/gi,
          /(transferencia|efectivo|tarjeta|débito|crédito|mercado\s+pago|paypal)/gi
        ]
      },
      
      service: {
        patterns: [
          /(?:servicio|tipo)\s+(?:de\s+)?(inmediato|reserva|programado)/gi,
          /(inmediato|reserva|programado|ahora|más tarde)/gi
        ]
      }
    };
  }
  
  // Detectar múltiples intenciones en un mensaje
  detectIntents(message) {
    const normalizedMessage = this.normalizeMessage(message);
    const detectedIntents = [];
    
    // Detectar cada tipo de intención
    for (const [intentType, config] of Object.entries(this.intentPatterns)) {
      const confidence = this.calculateIntentConfidence(normalizedMessage, config.patterns);
      
      if (confidence > 0.5) {
        detectedIntents.push({
          intent: intentType,
          confidence: confidence,
          priority: config.priority,
          patterns: this.findMatchingPatterns(normalizedMessage, config.patterns)
        });
      }
    }
    
    // Ordenar por prioridad y confianza
    detectedIntents.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.confidence - a.confidence;
    });
    
    return {
      intents: detectedIntents,
      primaryIntent: detectedIntents[0] || null,
      hasMultipleIntents: detectedIntents.length > 1,
      message: normalizedMessage
    };
  }
  
  // Extraer entidades del mensaje
  extractEntities(message) {
    const entities = [];
    const normalizedMessage = this.normalizeMessage(message);
    
    for (const [entityType, config] of Object.entries(this.entityPatterns)) {
      for (const pattern of config.patterns) {
        const matches = normalizedMessage.matchAll(pattern);
        
        for (const match of matches) {
          const value = match[1] || match[0];
          const confidence = this.calculateEntityConfidence(value, entityType);
          
          if (confidence > 0.6) {
            entities.push({
              type: entityType,
              value: value.trim(),
              confidence: confidence,
              startIndex: match.index,
              endIndex: match.index + match[0].length
            });
          }
        }
      }
    }
    
    // Remover entidades duplicadas o superpuestas
    return this.deduplicateEntities(entities);
  }
  
  // Analizar sentimiento del mensaje
  analyzeSentiment(message) {
    const positiveWords = [
      'gracias', 'perfecto', 'excelente', 'genial', 'bueno', 'bien',
      'ok', 'okay', 'dale', 'listo', 'ya está', 'confirmo'
    ];
    
    const negativeWords = [
      'no', 'mal', 'pésimo', 'terrible', 'horrible', 'problema',
      'error', 'falla', 'no funciona', 'molesta', 'enojado',
      'cancelar', 'no quiero', 'me arrepentí'
    ];
    
    const words = tokenizer.tokenize(this.normalizeMessage(message));
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const total = words.length;
    const score = total > 0 ? (positiveCount - negativeCount) / total : 0;
    
    let label = 'neutral';
    if (score > 0.1) label = 'positive';
    else if (score < -0.1) label = 'negative';
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      label: label,
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      totalWords: total
    };
  }
  
  // Detectar contexto complejo
  detectComplexContext(message, conversationHistory = []) {
    const intents = this.detectIntents(message);
    const entities = this.extractEntities(message);
    const sentiment = this.analyzeSentiment(message);
    
    // Analizar contexto basado en el historial
    const context = {
      isFollowUp: conversationHistory.length > 0,
      previousIntents: conversationHistory.map(msg => msg.intent).filter(Boolean),
      userMood: this.determineUserMood(sentiment, conversationHistory),
      urgency: this.detectUrgency(message, conversationHistory),
      confusion: this.detectConfusion(message, conversationHistory),
      completion: this.calculateCompletionProgress(entities, conversationHistory)
    };
    
    return {
      intents,
      entities,
      sentiment,
      context,
      suggestions: this.generateSuggestions(intents, entities, context)
    };
  }
  
  // Métodos auxiliares
  normalizeMessage(message) {
    return message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  calculateIntentConfidence(message, patterns) {
    let maxConfidence = 0;
    
    for (const pattern of patterns) {
      const normalizedPattern = pattern.replace(/\[.*?\]/g, '.*?');
      const regex = new RegExp(normalizedPattern, 'gi');
      
      if (regex.test(message)) {
        const confidence = this.calculatePatternMatch(message, pattern);
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }
    
    return maxConfidence;
  }
  
  calculatePatternMatch(message, pattern) {
    const words = message.split(' ');
    const patternWords = pattern.replace(/\[.*?\]/g, '').split(' ').filter(w => w.length > 0);
    
    let matches = 0;
    for (const patternWord of patternWords) {
      if (words.some(word => word.includes(patternWord) || patternWord.includes(word))) {
        matches++;
      }
    }
    
    return matches / patternWords.length;
  }
  
  findMatchingPatterns(message, patterns) {
    const matches = [];
    
    for (const pattern of patterns) {
      const normalizedPattern = pattern.replace(/\[.*?\]/g, '.*?');
      const regex = new RegExp(normalizedPattern, 'gi');
      
      if (regex.test(message)) {
        matches.push(pattern);
      }
    }
    
    return matches;
  }
  
  calculateEntityConfidence(value, entityType) {
    // Lógica simple de confianza basada en el tipo de entidad
    const confidenceScores = {
      address: 0.8,
      time: 0.9,
      payment: 0.95,
      service: 0.85
    };
    
    return confidenceScores[entityType] || 0.7;
  }
  
  deduplicateEntities(entities) {
    const unique = [];
    
    for (const entity of entities) {
      const isDuplicate = unique.some(existing => 
        existing.type === entity.type && 
        existing.value.toLowerCase() === entity.value.toLowerCase()
      );
      
      if (!isDuplicate) {
        unique.push(entity);
      }
    }
    
    return unique;
  }
  
  determineUserMood(sentiment, history) {
    if (sentiment.score > 0.3) return 'happy';
    if (sentiment.score < -0.3) return 'frustrated';
    if (history.some(msg => msg.intent === 'express_urgency')) return 'rushed';
    return 'calm';
  }
  
  detectUrgency(message, history) {
    const urgencyWords = ['urgente', 'ya', 'inmediato', 'rápido', 'apuro', 'emergencia'];
    const hasUrgencyWords = urgencyWords.some(word => message.toLowerCase().includes(word));
    const hasUrgencyHistory = history.some(msg => msg.intent === 'express_urgency');
    
    return hasUrgencyWords || hasUrgencyHistory;
  }
  
  detectConfusion(message, history) {
    const confusionWords = ['no entiendo', 'qué', 'cómo', 'ayuda', 'explicame'];
    const hasConfusionWords = confusionWords.some(word => message.toLowerCase().includes(word));
    const hasConfusionHistory = history.some(msg => msg.intent === 'request_help');
    
    return hasConfusionWords || hasConfusionHistory;
  }
  
  calculateCompletionProgress(entities, history) {
    const requiredSteps = ['origin', 'destination', 'payment', 'time'];
    const completedSteps = [];
    
    // Verificar entidades actuales
    if (entities.some(e => e.type === 'address')) completedSteps.push('address');
    if (entities.some(e => e.type === 'payment')) completedSteps.push('payment');
    if (entities.some(e => e.type === 'time')) completedSteps.push('time');
    
    // Verificar historial
    const historyEntities = history.flatMap(msg => msg.entities || []);
    if (historyEntities.some(e => e.type === 'address')) completedSteps.push('address');
    
    return {
      completed: completedSteps.length,
      total: requiredSteps.length,
      percentage: (completedSteps.length / requiredSteps.length) * 100
    };
  }
  
  generateSuggestions(intents, entities, context) {
    const suggestions = [];
    
    // Sugerir siguiente paso basado en progreso
    if (context.completion.percentage < 50) {
      suggestions.push({
        type: 'next_step',
        message: '¿Desde dónde salís?',
        priority: 'high'
      });
    }
    
    // Sugerir ayuda si hay confusión
    if (context.confusion) {
      suggestions.push({
        type: 'help',
        message: 'Te puedo ayudar con el proceso paso a paso',
        priority: 'high'
      });
    }
    
    // Sugerir opciones de pago si faltan
    if (!entities.some(e => e.type === 'payment')) {
      suggestions.push({
        type: 'payment_options',
        message: 'Tenemos transferencia, efectivo y tarjeta',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }
}

module.exports = IntentDetectionService; 