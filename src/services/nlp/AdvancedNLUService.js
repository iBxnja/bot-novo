const nlp = require('compromise');
const numbers = require('compromise-numbers');
const dates = require('compromise-dates');

// Extender compromise con plugins
nlp.extend(numbers);
nlp.extend(dates);

class AdvancedNLUService {
  constructor() {
    this.intentPatterns = this.initializeIntentPatterns();
    this.entityPatterns = this.initializeEntityPatterns();
    this.validationRules = this.initializeValidationRules();
  }

  initializeIntentPatterns() {
    return {
      greeting: [
        'hola', 'buenas', 'buenass', 'buenos días', 'buenas tardes', 'buenas noches',
        'qué tal', 'cómo estás', 'saludos', 'hey', 'hi', 'hello'
      ],
      taxi_request: [
        'necesito un taxi', 'quiero un taxi', 'pedir taxi', 'llamar taxi',
        'buscar taxi', 'taxi por favor', 'viaje', 'transporte', 'llevame',
        'reservar taxi', 'taxi para', 'taxi a las', 'taxi mañana', 'taxi hoy'
      ],
      address_provision: [
        'desde', 'salgo desde', 'parto desde', 'origen', 'salida',
        'hasta', 'voy a', 'destino', 'llegada', 'para ir a'
      ],
      payment_method: [
        'pago', 'pagás', 'pagar', 'efectivo', 'transferencia', 'tarjeta',
        'débito', 'crédito', 'cómo pagar', 'método de pago'
      ],
      time_specification: [
        'hora', 'horario', 'cuándo', 'a las', 'para las', 'mañana', 'tarde',
        'noche', 'ahora', 'inmediato', 'urgente', 'reserva', 'más tarde'
      ],
      confirmation: [
        'sí', 'confirmo', 'confirmar', 'ok', 'okay', 'dale', 'perfecto',
        'excelente', 'genial', 'listo', 'ya está', 'correcto', 'confirmado'
      ],
      cancellation: [
        'no', 'cancelar', 'cancelado', 'no gracias', 'me arrepentí',
        'cambié de opinión', 'no quiero', 'olvidalo'
      ],
      question: [
        'qué', 'cómo', 'cuándo', 'dónde', 'cuánto', 'precio', 'tarifa',
        'tiempo', 'aceptan', 'puedo', 'mascota', 'equipaje', 'disponible'
      ],
      help: [
        'ayuda', 'ayudame', 'no entiendo', 'cómo funciona', 'qué puedo hacer',
        'opciones', 'servicios', 'información'
      ]
    };
  }

  initializeEntityPatterns() {
    return {
      address: {
        patterns: [
          // Patrones argentinos específicos
          /(\d+\s+(?:de\s+)?[a-záéíóúñ]+(?:\s+\d+)?(?:\s*,\s*[a-záéíóúñ]+)?)/gi,
          /(?:desde|de)\s+([^,]+?)\s+(?:hasta|a|para)\s+([^,]+?)(?:\s|$|,)/gi,
          /(?:salgo|salo)\s+(?:desde|de)\s+([^,]+?)(?:\s|$|,)/gi,
          /(?:voy|vamos)\s+(?:a|hasta)\s+([^,]+?)(?:\s|$|,)/gi,
          /(?:desde|de)\s+([^,]+?)(?:\s+(?:hasta|a|para)|$|,)/gi,
          /(?:hasta|a|para)\s+([^,]+?)(?:\s|$|,)/gi
        ],
        cities: ['concordia', 'buenos aires', 'córdoba', 'rosario', 'mendoza', 'la plata']
      },
      time: {
        patterns: [
          /(?:a las|para las|hora)\s+(\d{1,2}:\d{2})/gi,
          /(?:a las|para las|hora)\s+(\d{1,2}\s*(?:am|pm|AM|PM))/gi,
          /(?:a las|para las|hora)\s+(\d{1,2}hs?)/gi
        ],
        timeKeywords: ['mañana', 'tarde', 'noche', 'ahora', 'inmediato', 'urgente']
      },
      payment: {
        methods: ['efectivo', 'transferencia', 'tarjeta', 'débito', 'crédito', 'openpay']
      },
      service_type: {
        immediate: ['ahora', 'inmediato', 'urgente', 'ya', 'lo antes posible'],
        reservation: ['reserva', 'reservar', 'reservado', 'para más tarde', 'para mañana', 'más tarde']
      }
    };
  }

  initializeValidationRules() {
    return {
      time: {
        minHour: 0,
        maxHour: 23,
        minMinute: 0,
        maxMinute: 59,
        businessHours: {
          start: 6, // 6:00 AM
          end: 23   // 11:00 PM
        }
      },
      address: {
        minLength: 5,
        maxLength: 200,
        requiredFields: ['street', 'city']
      },
      payment: {
        validMethods: ['efectivo', 'transferencia', 'tarjeta']
      }
    };
  }

  async analyzeMessage(message) {
    const doc = nlp(message.toLowerCase());
    
    const analysis = {
      originalMessage: message,
      intents: this.detectIntents(message),
      entities: this.extractEntities(message, doc),
      sentiment: this.analyzeSentiment(message),
      confidence: this.calculateConfidence(message),
      suggestions: this.generateSuggestions(message),
      validation: this.validateEntities(message)
    };

    return analysis;
  }

  detectIntents(message) {
    const lowerMessage = message.toLowerCase();
    const detectedIntents = [];

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const confidence = this.calculateIntentConfidence(lowerMessage, patterns);
      if (confidence > 0.3) {
        detectedIntents.push({
          intent,
          confidence,
          patterns: patterns.filter(pattern => lowerMessage.includes(pattern))
        });
      }
    }

    // Ordenar por confianza
    detectedIntents.sort((a, b) => b.confidence - a.confidence);

    return {
      primary: detectedIntents[0] || null,
      all: detectedIntents,
      multiple: detectedIntents.length > 1
    };
  }

  calculateIntentConfidence(message, patterns) {
    let maxConfidence = 0;
    
    for (const pattern of patterns) {
      if (message.includes(pattern)) {
        const confidence = pattern.length / message.length;
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    return Math.min(maxConfidence * 2, 1); // Normalizar a 0-1
  }

  extractEntities(message, doc) {
    const entities = [];

    // Extraer direcciones
    const addresses = this.extractAddresses(message);
    entities.push(...addresses);

    // Extraer horarios usando compromise
    const times = this.extractTimes(message, doc);
    entities.push(...times);

    // Extraer métodos de pago
    const payments = this.extractPaymentMethods(message);
    entities.push(...payments);

    // Extraer tipo de servicio
    const serviceTypes = this.extractServiceTypes(message);
    entities.push(...serviceTypes);

    // Extraer números (precios, cantidades)
    const numbers = this.extractNumbers(message, doc);
    entities.push(...numbers);

    return entities;
  }

  extractAddresses(message) {
    const addresses = [];
    const lowerMessage = message.toLowerCase();

    // Usar patrones específicos para direcciones argentinas
    for (const pattern of this.entityPatterns.address.patterns) {
      const matches = lowerMessage.matchAll(pattern);
      
      for (const match of matches) {
        if (match[1] && match[2]) {
          // Patrón con origen y destino
          addresses.push({
            type: 'address',
            value: match[1].trim(),
            confidence: 0.9,
            role: 'origin'
          });
          
          addresses.push({
            type: 'address',
            value: match[2].trim(),
            confidence: 0.9,
            role: 'destination'
          });
        } else {
          // Patrón de una sola dirección
          const address = match[1] || match[0];
          if (address && address.length > 3) {
            addresses.push({
              type: 'address',
              value: address.trim(),
              confidence: 0.8
            });
          }
        }
      }
    }

    return addresses;
  }

  extractTimes(message, doc) {
    const times = [];
    const lowerMessage = message.toLowerCase();

    // Usar compromise para detectar horarios
    const timeMatches = doc.times().out('array');
    
    for (const timeMatch of timeMatches) {
      times.push({
        type: 'time',
        value: timeMatch,
        confidence: 0.9
      });
    }

    // Usar patrones específicos como respaldo
    for (const pattern of this.entityPatterns.time.patterns) {
      const matches = lowerMessage.matchAll(pattern);
      for (const match of matches) {
        times.push({
          type: 'time',
          value: match[1],
          confidence: 0.9
        });
      }
    }

    // Detectar palabras clave de tiempo
    for (const keyword of this.entityPatterns.time.timeKeywords) {
      if (lowerMessage.includes(keyword)) {
        times.push({
          type: 'time',
          value: keyword,
          confidence: 0.7
        });
      }
    }

    return times;
  }

  extractPaymentMethods(message) {
    const payments = [];
    const lowerMessage = message.toLowerCase();

    // Patrones más específicos para detectar métodos de pago
    const paymentPatterns = [
      { pattern: /pago\s+(?:con\s+)?(efectivo|transferencia|tarjeta|débito|crédito)/i, method: '$1' },
      { pattern: /(?:pagar|pagás|pagaré)\s+(?:con\s+)?(efectivo|transferencia|tarjeta|débito|crédito)/i, method: '$1' },
      { pattern: /(efectivo|transferencia|tarjeta|débito|crédito)\s+(?:por\s+favor|gracias)?/i, method: '$1' },
      { pattern: /(?:método\s+de\s+pago|pago)\s*:\s*(efectivo|transferencia|tarjeta|débito|crédito)/i, method: '$1' }
    ];

    // Usar patrones específicos primero
    for (const pattern of paymentPatterns) {
      const match = lowerMessage.match(pattern.pattern);
      if (match) {
        const method = match[1].toLowerCase();
        payments.push({
          type: 'payment',
          value: method,
          confidence: 0.95
        });
        return payments; // Retornar inmediatamente si encontramos un patrón específico
      }
    }

    // Fallback a búsqueda simple
    for (const method of this.entityPatterns.payment.methods) {
      if (lowerMessage.includes(method)) {
        payments.push({
          type: 'payment',
          value: method,
          confidence: 0.9
        });
      }
    }

    return payments;
  }

  extractServiceTypes(message) {
    const serviceTypes = [];
    const lowerMessage = message.toLowerCase();

    // Detectar servicio inmediato
    for (const keyword of this.entityPatterns.service_type.immediate) {
      if (lowerMessage.includes(keyword)) {
        serviceTypes.push({
          type: 'service_type',
          value: 'inmediato',
          confidence: 0.8
        });
        break;
      }
    }

    // Detectar reserva
    for (const keyword of this.entityPatterns.service_type.reservation) {
      if (lowerMessage.includes(keyword)) {
        serviceTypes.push({
          type: 'service_type',
          value: 'reserva',
          confidence: 0.8
        });
        break;
      }
    }

    return serviceTypes;
  }

  extractNumbers(message, doc) {
    const numbers = [];
    
    // Usar compromise para detectar números
    const numberMatches = doc.numbers().out('array');
    
    for (const numberMatch of numberMatches) {
      numbers.push({
        type: 'number',
        value: numberMatch,
        confidence: 0.8
      });
    }

    return numbers;
  }

  analyzeSentiment(message) {
    const positiveWords = ['gracias', 'perfecto', 'excelente', 'genial', 'bueno', 'ok', 'dale', 'sí', 'confirmo'];
    const negativeWords = ['no', 'mal', 'pésimo', 'terrible', 'problema', 'error', 'molesta', 'lento', 'cancelar'];
    
    const words = message.toLowerCase().split(' ');
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
      positiveCount,
      negativeCount,
      total
    };
  }

  calculateConfidence(message) {
    const intents = this.detectIntents(message);
    const entities = this.extractEntities(message, nlp(message));
    
    let confidence = 0;
    
    // Confianza basada en intenciones
    if (intents.primary) {
      confidence += intents.primary.confidence * 0.4;
    }
    
    // Confianza basada en entidades
    if (entities.length > 0) {
      const avgEntityConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length;
      confidence += avgEntityConfidence * 0.4;
    }
    
    // Confianza basada en longitud del mensaje
    const lengthConfidence = Math.min(message.length / 50, 1) * 0.2;
    confidence += lengthConfidence;
    
    return Math.min(confidence, 1);
  }

  generateSuggestions(message) {
    const suggestions = [];
    const lowerMessage = message.toLowerCase();
    
    // Sugerencias basadas en el contenido del mensaje
    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta')) {
      suggestions.push({
        type: 'price_info',
        message: 'Los precios varían según la distancia. ¿Desde dónde salís para darte un precio preciso?',
        priority: 'high'
      });
    }
    
    if (lowerMessage.includes('mascota') || lowerMessage.includes('perro')) {
      suggestions.push({
        type: 'pet_service',
        message: 'Tenemos taxis que aceptan mascotas. Solo avisame y te asignamos un conductor que lo permita.',
        priority: 'medium'
      });
    }
    
    if (lowerMessage.includes('equipaje') || lowerMessage.includes('maleta')) {
      suggestions.push({
        type: 'luggage_service',
        message: 'No hay problema con el equipaje. ¿Cuántas maletas llevás?',
        priority: 'medium'
      });
    }
    
    return suggestions;
  }

  validateEntities(message) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const entities = this.extractEntities(message, nlp(message));
    
    // Validar horarios
    const timeEntities = entities.filter(e => e.type === 'time');
    for (const timeEntity of timeEntities) {
      const timeValidation = this.validateTime(timeEntity.value);
      if (!timeValidation.isValid) {
        validation.errors.push(timeValidation.error);
        validation.isValid = false;
      }
    }
    
    // Validar direcciones
    const addressEntities = entities.filter(e => e.type === 'address');
    for (const addressEntity of addressEntities) {
      const addressValidation = this.validateAddress(addressEntity.value);
      if (!addressValidation.isValid) {
        validation.warnings.push(addressValidation.warning);
      }
    }
    
    // Validar métodos de pago
    const paymentEntities = entities.filter(e => e.type === 'payment');
    for (const paymentEntity of paymentEntities) {
      const paymentValidation = this.validatePayment(paymentEntity.value);
      if (!paymentValidation.isValid) {
        validation.errors.push(paymentValidation.error);
        validation.isValid = false;
      }
    }

    return validation;
  }

  validateTime(timeValue) {
    const validation = { isValid: true, error: null };
    
    // Validar formato de hora
    const timeRegex = /^(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?$/;
    const match = timeValue.toString().match(timeRegex);
    
    if (!match) {
      validation.isValid = false;
      validation.error = `Formato de hora inválido: ${timeValue}`;
      return validation;
    }
    
    let hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3];
    
    // Convertir formato 12h a 24h
    if (period) {
      if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
    }
    
    // Validar rangos
    if (hour < this.validationRules.time.minHour || hour > this.validationRules.time.maxHour) {
      validation.isValid = false;
      validation.error = `Hora fuera de rango: ${hour}:${minute}`;
      return validation;
    }
    
    if (minute < this.validationRules.time.minMinute || minute > this.validationRules.time.maxMinute) {
      validation.isValid = false;
      validation.error = `Minutos fuera de rango: ${hour}:${minute}`;
      return validation;
    }
    
    return validation;
  }

  validateAddress(addressValue) {
    const validation = { isValid: true, warning: null };
    
    if (addressValue.length < this.validationRules.address.minLength) {
      validation.warning = `Dirección muy corta: ${addressValue}`;
    }
    
    if (addressValue.length > this.validationRules.address.maxLength) {
      validation.warning = `Dirección muy larga: ${addressValue}`;
    }
    
    return validation;
  }

  validatePayment(paymentValue) {
    const validation = { isValid: true, error: null };
    
    if (!this.validationRules.payment.validMethods.includes(paymentValue.toLowerCase())) {
      validation.isValid = false;
      validation.error = `Método de pago no válido: ${paymentValue}`;
    }
    
    return validation;
  }

  // Método para entrenar el modelo con datos reales
  async trainWithData(trainingData) {
    // Aquí se implementaría el entrenamiento con datos reales
    // Por ahora es un placeholder para futuras mejoras
    console.log('🔄 Entrenando modelo NLU con datos reales...');
    
    for (const data of trainingData) {
      // Procesar cada ejemplo de entrenamiento
      const analysis = await this.analyzeMessage(data.message);
      
      // Comparar con la intención esperada
      if (data.expectedIntent && analysis.intents.primary?.intent !== data.expectedIntent) {
        console.log(`⚠️ Discrepancia en entrenamiento: esperado "${data.expectedIntent}", detectado "${analysis.intents.primary?.intent}"`);
      }
    }
    
    console.log('✅ Entrenamiento completado');
  }
}

module.exports = AdvancedNLUService; 