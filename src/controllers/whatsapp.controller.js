const OpenAI = require('openai');
const logger = require('../utils/logger');
const config = require('../../config/environment');
const { validateAddress } = require('../services/googleMaps.service');
const IntentDetectionService = require('../services/nlp/IntentDetectionService');
const SmartMemoryService = require('../services/nlp/SmartMemoryService');
const { v4: uuidv4 } = require('uuid');

// Estado en memoria (por usuario)
const conversationStates = {};

class WhatsAppController {
  constructor() {
    // Inicializar OpenAI con configuración
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    
    // Inicializar servicios de inteligencia
    this.intentService = new IntentDetectionService();
    this.memoryService = new SmartMemoryService();
  }

  // Manejar mensajes entrantes de WhatsApp
  async handleIncomingMessage(req, res) {
    try {
      const { Body, From, To } = req.body;
      logger.info(`Mensaje recibido de ${From}: ${Body}`);
      
      // Generar ID de sesión si no existe
      const sessionId = conversationStates[From]?.sessionId || uuidv4();
      
      // Obtener usuario y contexto personalizado
      const user = await this.memoryService.getUser(From);
      const personalizedContext = await this.memoryService.getPersonalizedContext(From);
      
      // Obtener el estado de la conversación del usuario
      const conversationState = await this.getConversationState(From);
      
      // Procesar el mensaje con IA avanzada
      const response = await this.processMessageWithAdvancedAI(Body, From, conversationState, sessionId, personalizedContext);
      
      // Enviar respuesta
      await this.sendMessage(From, response);
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error procesando mensaje WhatsApp:', error);
      res.status(500).send('Error interno');
    }
  }

  // Procesar mensaje con IA avanzada, memoria y detección de intenciones
  async processMessageWithAdvancedAI(message, from, state, sessionId, personalizedContext) {
    const currentState = state || (await this.getConversationState(from)) || {};
    
    // Guardar mensaje del usuario en la memoria
    await this.memoryService.saveMessage(from, sessionId, {
      sender: 'user',
      content: message,
      timestamp: new Date(),
      context: {
        state: currentState.userData ? 'in_progress' : 'starting',
        userData: currentState.userData || {},
        pendingQuestions: []
      }
    });
    
    // Detectar intenciones y contexto complejo
    const intentAnalysis = this.intentService.detectComplexContext(message);
    const entities = this.intentService.extractEntities(message);
    const sentiment = this.intentService.analyzeSentiment(message);
    
    // Generar sugerencias inteligentes
    const suggestions = await this.memoryService.generateSmartSuggestions(from, currentState);
    const anticipations = await this.memoryService.anticipateNeeds(from, currentState);
    
    // Procesar con lógica avanzada
    const response = await this.processWithAdvancedLogic(message, from, currentState, intentAnalysis, entities, sentiment, suggestions, anticipations, personalizedContext);
    
    // Guardar respuesta del bot en la memoria
    await this.memoryService.saveMessage(from, sessionId, {
      sender: 'bot',
      content: response,
      timestamp: new Date(),
      intent: intentAnalysis.intents.primaryIntent?.intent,
      entities: entities,
      sentiment: sentiment,
      context: {
        state: currentState.userData ? 'in_progress' : 'starting',
        userData: currentState.userData || {},
        pendingQuestions: []
      }
    });
    
    return response;
  }

  // Método de fallback simple para casos no manejados por el sistema avanzado
  async processFallbackLogic(message, from, currentState) {
    const lowerMessage = message.toLowerCase();
    
    // Detectar saludos simples
    const isOnlyGreeting = lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('buenass') || 
                          lowerMessage.includes('buenos días') || lowerMessage.includes('buenas tardes') || lowerMessage.includes('buenas noches');
    
    if (isOnlyGreeting && !lowerMessage.includes('taxi') && !lowerMessage.includes('pedir') && !lowerMessage.includes('necesito') && 
        !lowerMessage.includes('quiero') && !lowerMessage.includes('busco') && !lowerMessage.includes('solicitar')) {
      return 'Buenass';
    }
    
    // Detectar reinicio
    if (lowerMessage.includes('reiniciar') || lowerMessage.includes('limpiar') || lowerMessage.includes('nuevo')) {
      await this.clearConversationState(from);
      return `Ok, empezamos de nuevo\n\n¿Desde dónde salís?`;
    }
    
    // Detectar direcciones simples
    const addressInfo = this.detectAddressInMessage(message);
    if (addressInfo.isAddress) {
      if (!currentState.userData) currentState.userData = {};
      
      if (!currentState.userData.origin) {
        currentState.userData.origin = addressInfo.address;
        await this.updateConversationState(from, currentState);
        return `Perfecto, salís desde ${addressInfo.address}. ¿A dónde vas?`;
      } else if (!currentState.userData.destination) {
        currentState.userData.destination = addressInfo.address;
        await this.updateConversationState(from, currentState);
        return `Genial, vas a ${addressInfo.address}. ¿Cómo querés pagarlo?`;
      }
    }
    
    // Detectar método de pago
    const paymentInfo = this.detectPaymentMethod(message);
    if (paymentInfo.isPayment && currentState.userData?.origin && currentState.userData?.destination) {
      if (!currentState.userData) currentState.userData = {};
      currentState.userData.paymentMethod = paymentInfo.method;
      await this.updateConversationState(from, currentState);
      return `Perfecto, pagás con ${paymentInfo.method}. ¿Lo querés ahora o es para más tarde?`;
    }
    
    // Detectar hora
    const timeInfo = this.detectTime(message);
    if (timeInfo.hasTime && currentState.userData?.origin && currentState.userData?.destination) {
      if (!currentState.userData) currentState.userData = {};
      currentState.userData.time = timeInfo.time;
      currentState.userData.serviceType = 'Reserva';
      await this.updateConversationState(from, currentState);
      
      const summary = this.buildTripSummary(currentState.userData);
      return `Resumen:\n${summary}\n\nConfirmar? (Sí/No)`;
    }
    
    // Respuesta genérica
    return this.getFallbackResponse();
  }

  // Procesar con lógica avanzada usando memoria e intenciones
  async processWithAdvancedLogic(message, from, currentState, intentAnalysis, entities, sentiment, suggestions, anticipations, personalizedContext) {
    const primaryIntent = intentAnalysis.intents.primaryIntent;
    const userMood = intentAnalysis.context.userMood;
    const isReturningUser = personalizedContext.isReturningUser;
    
    // Manejar usuarios frustrados o confundidos
    if (userMood === 'frustrated' || intentAnalysis.context.confusion) {
      return this.handleFrustratedUser(message, from, currentState, personalizedContext);
    }
    
    // Manejar usuarios apurados
    if (intentAnalysis.context.urgency) {
      return this.handleUrgentUser(message, from, currentState, entities, suggestions);
    }
    
    // Manejar múltiples intenciones en un mensaje
    if (intentAnalysis.intents.hasMultipleIntents) {
      return this.handleMultipleIntents(message, from, currentState, intentAnalysis, entities);
    }
    
    // Procesar según la intención principal
    switch (primaryIntent?.intent) {
      case 'request_taxi':
        return this.handleTaxiRequest(message, from, currentState, entities, suggestions, anticipations, personalizedContext);
      
      case 'provide_address':
        return this.handleAddressProvision(message, from, currentState, entities, personalizedContext);
      
      case 'specify_payment':
        return this.handlePaymentSpecification(message, from, currentState, entities, personalizedContext);
      
      case 'specify_time':
        return this.handleTimeSpecification(message, from, currentState, entities, personalizedContext);
      
      case 'ask_question':
        return this.handleQuestion(message, from, currentState, entities, personalizedContext);
      
      case 'confirm_action':
        return this.handleConfirmation(message, from, currentState, personalizedContext);
      
      case 'cancel_action':
        return this.handleCancellation(message, from, currentState, personalizedContext);
      
      case 'request_help':
        return this.handleHelpRequest(message, from, currentState, personalizedContext);
      
      default:
        // Usar lógica de fallback simple
        return this.processFallbackLogic(message, from, currentState);
    }
  }

  // Manejar usuarios frustrados
  async handleFrustratedUser(message, from, currentState, personalizedContext) {
    const response = `Entiendo que puede ser frustrante. Te ayudo paso a paso.\n\n`;
    
    if (!currentState.userData?.origin) {
      return response + `¿Desde dónde salís? Te puedo ayudar a encontrar la dirección.`;
    } else if (!currentState.userData?.destination) {
      return response + `¿A dónde vas? Te ayudo a configurar el destino.`;
    } else if (!currentState.userData?.paymentMethod) {
      return response + `¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta.`;
    } else {
      return response + `¿Querés que te ayude con algo específico?`;
    }
  }

  // Manejar usuarios apurados
  async handleUrgentUser(message, from, currentState, entities, suggestions) {
    // Si tiene sugerencias frecuentes, usarlas para acelerar
    if (suggestions.length > 0) {
      const bestSuggestion = suggestions.find(s => s.confidence > 0.8);
      if (bestSuggestion) {
        return `Entiendo que es urgente. ${bestSuggestion.message}\n\nO si preferís, decime directamente qué necesitás.`;
      }
    }
    
    return `Entiendo que es urgente. Te ayudo rápido:\n\n¿Desde dónde y a dónde vas?`;
  }

  // Manejar múltiples intenciones
  async handleMultipleIntents(message, from, currentState, intentAnalysis, entities) {
    const intents = intentAnalysis.intents.intents;
    
    // Si tiene dirección y pago, procesar ambos
    const hasAddress = entities.some(e => e.type === 'address');
    const hasPayment = entities.some(e => e.type === 'payment');
    
    if (hasAddress && hasPayment) {
      // Procesar dirección primero
      const addressResponse = await this.handleAddressProvision(message, from, currentState, entities, {});
      return addressResponse;
    }
    
    // Si no, usar la intención de mayor prioridad
    return this.processMessageWithAI(message, from, currentState);
  }

  // Manejar solicitud de taxi con sugerencias inteligentes
  async handleTaxiRequest(message, from, currentState, entities, suggestions, anticipations, personalizedContext) {
    let response = '';
    
    // Saludo personalizado para usuarios frecuentes
    if (personalizedContext.isFrequentUser) {
      response += `¡Hola! Veo que sos un cliente frecuente. `;
    } else if (personalizedContext.isReturningUser) {
      response += `¡Hola de nuevo! `;
    } else {
      response += `¡Hola! `;
    }
    
    // Si tiene anticipaciones, mostrarlas
    if (anticipations.length > 0) {
      const anticipation = anticipations[0];
      response += `${anticipation.message}\n\n`;
    }
    
    // Si no tiene origen, preguntar con sugerencias
    if (!currentState.userData?.origin) {
      if (suggestions.some(s => s.type === 'frequent_origin')) {
        const suggestion = suggestions.find(s => s.type === 'frequent_origin');
        response += `¿Desde dónde salís? ${suggestion.message}`;
      } else {
        response += `¿Desde dónde salís?`;
      }
    } else if (!currentState.userData?.destination) {
      if (suggestions.some(s => s.type === 'frequent_destination')) {
        const suggestion = suggestions.find(s => s.type === 'frequent_destination');
        response += `¿A dónde vas? ${suggestion.message}`;
      } else {
        response += `¿A dónde vas?`;
      }
    } else {
      response += `Perfecto, ya tenés origen y destino. ¿Cómo querés pagarlo?`;
    }
    
    return response;
  }

  // Manejar provisión de dirección con contexto
  async handleAddressProvision(message, from, currentState, entities, personalizedContext) {
    const addressEntity = entities.find(e => e.type === 'address');
    
    if (!addressEntity) {
      return this.processMessageWithAI(message, from, currentState);
    }
    
    // Usar lógica original de validación de direcciones
    const addressInfo = this.detectAddressInMessage(message);
    if (addressInfo.isAddress) {
      return this.processMessageWithAI(message, from, currentState);
    }
    
    return `No pude entender la dirección. ¿Podrías ser más específico?`;
  }

  // Manejar especificación de pago con preferencias
  async handlePaymentSpecification(message, from, currentState, entities, personalizedContext) {
    const paymentEntity = entities.find(e => e.type === 'payment');
    
    if (paymentEntity) {
      // Usar lógica original
      return this.processMessageWithAI(message, from, currentState);
    }
    
    // Si es usuario frecuente, sugerir método preferido
    if (personalizedContext.isFrequentUser && personalizedContext.preferences.paymentMethods.length > 0) {
      const preferred = personalizedContext.preferences.paymentMethods[0];
      return `¿Pagás con ${preferred} como siempre?`;
    }
    
    return `¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta.`;
  }

  // Manejar especificación de tiempo con patrones
  async handleTimeSpecification(message, from, currentState, entities, personalizedContext) {
    const timeEntity = entities.find(e => e.type === 'time');
    
    if (timeEntity) {
      return this.processMessageWithAI(message, from, currentState);
    }
    
    // Si es usuario frecuente, sugerir horario típico
    if (personalizedContext.isFrequentUser && personalizedContext.user.typicalTime) {
      return `¿A las ${personalizedContext.user.typicalTime} como siempre?`;
    }
    
    return `¿A qué hora lo necesitás?`;
  }

  // Manejar preguntas con contexto personalizado
  async handleQuestion(message, from, currentState, entities, personalizedContext) {
    // Usar lógica original para preguntas sobre el servicio
    const serviceQuestion = this.detectServiceQuestion(message);
    if (serviceQuestion.isQuestion) {
      const answer = this.answerServiceQuestion(serviceQuestion.type);
      const nextStep = this.getNextStep(currentState.userData);
      return `${answer}\n\n${nextStep}`;
    }
    
    return this.processMessageWithAI(message, from, currentState);
  }

  // Manejar confirmación con contexto
  async handleConfirmation(message, from, currentState, personalizedContext) {
    if (this.hasCompleteTripData(currentState.userData)) {
      const tripResult = await this.createTrip(currentState.userData, from);
      if (tripResult.success) {
        // Aprender de la interacción exitosa
        await this.memoryService.learnFromInteraction(from, currentState.userData, {
          success: true,
          tripCreated: true,
          tripId: tripResult.tripId,
          cost: tripResult.cost,
          distance: tripResult.distance
        });
        
        await this.clearConversationState(from);
        return `¡Listo! Tu taxi está en camino\n\nID del viaje: ${tripResult.tripId}\nTe avisamos cuando el conductor llegue. ¡Que tengas buen viaje!`;
      }
    }
    
    return this.processMessageWithAI(message, from, currentState);
  }

  // Manejar cancelación
  async handleCancellation(message, from, currentState, personalizedContext) {
    await this.clearConversationState(from);
    
    // Aprender de la cancelación
    await this.memoryService.learnFromInteraction(from, currentState.userData, {
      success: false,
      tripCreated: false,
      completionReason: 'user_cancelled'
    });
    
    return `Ok, cancelado. Si necesitás algo más, avisame.`;
  }

  // Manejar solicitud de ayuda
  async handleHelpRequest(message, from, currentState, personalizedContext) {
    let helpMessage = `Te ayudo con el proceso:\n\n`;
    
    if (!currentState.userData?.origin) {
      helpMessage += `1. Primero decime desde dónde salís\n`;
    } else if (!currentState.userData?.destination) {
      helpMessage += `1. ✅ Origen: ${currentState.userData.origin}\n2. Ahora decime a dónde vas\n`;
    } else if (!currentState.userData?.paymentMethod) {
      helpMessage += `1. ✅ Origen: ${currentState.userData.origin}\n2. ✅ Destino: ${currentState.userData.destination}\n3. Ahora elegí cómo pagar: transferencia, efectivo o tarjeta\n`;
    } else {
      helpMessage += `1. ✅ Origen: ${currentState.userData.origin}\n2. ✅ Destino: ${currentState.userData.destination}\n3. ✅ Pago: ${currentState.userData.paymentMethod}\n4. Solo confirmá el viaje\n`;
    }
    
    return helpMessage;
  }

    // Detectar si el mensaje contiene una dirección
  detectAddressInMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Patrones mejorados para detectar direcciones con contexto
    const originPatterns = [
      /(?:mi origen es|origen es|desde|parto de|salgo de|estoy en|me encuentro en|mi casa es|mi ubicación es)\s+(.+?)(?:\s+y\s+mi\s+destino\s+es|\s+destino\s+es|\s+a\s+|\s+para\s+|\s+hacia\s+|$)/i,
      /^(.+?)\s+(?:es mi origen|es donde estoy|es mi ubicación|es mi casa)/i
    ];
    
    const destinationPatterns = [
      /(?:mi destino es|destino es|voy a|quiero ir a|necesito ir a|hacia|para|rumbo a|a)\s+(.+?)(?:\s+y\s+mi\s+origen\s+es|\s+origen\s+es|\s+desde\s+|$)/i,
      /^(.+?)\s+(?:es mi destino|es donde voy|es a donde voy)/i
    ];
    
    // Patrón para detectar "origen X y destino Y"
    const bothPattern = /(?:mi\s+)?origen\s+es\s+(.+?)\s+(?:y\s+mi\s+)?destino\s+es\s+(.+)/i;
    const bothMatch = message.match(bothPattern);
    if (bothMatch) {
      return {
        isAddress: true,
        address: bothMatch[1].trim(),
        isOrigin: true,
        isDestination: false,
        hasBoth: true,
        secondAddress: bothMatch[2].trim()
      };
    }
    
    // Patrón para detectar "desde X hasta Y" o "desde X a Y"
    const fromToPattern = /desde\s+(.+?)\s+(?:hasta|a|para)\s+(.+)/i;
    const fromToMatch = message.match(fromToPattern);
    if (fromToMatch) {
      return {
        isAddress: true,
        address: fromToMatch[1].trim(),
        isOrigin: true,
        isDestination: false,
        hasBoth: true,
        secondAddress: fromToMatch[2].trim()
      };
    }

    // Buscar patrones de origen
    for (const pattern of originPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          isAddress: true,
          address: match[1].trim(),
          isOrigin: true,
          isDestination: false
        };
      }
    }

    // Buscar patrones de destino
    for (const pattern of destinationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          isAddress: true,
          address: match[1].trim(),
          isOrigin: false,
          isDestination: true
        };
      }
    }

    // Si no hay patrones específicos, verificar si parece una dirección
    const addressKeywords = [
      'avenida', 'av.', 'calle', 'plaza', 'esquina', 'barrio', 'zona',
      'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
      'diamante', 'concordia', 'buenos aires', 'caba', 'argentina'
    ];

    const hasAddressKeywords = addressKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasNumbers = /\d+/.test(message);

    // Si tiene palabras clave de dirección o números, probablemente es una dirección
    if (hasAddressKeywords || hasNumbers) {
      // Limpiar el mensaje de palabras innecesarias
      let cleanAddress = message;

      // Remover palabras comunes que no son parte de la dirección
      const commonWords = ['estoy', 'estyo', 'en', 'a', 'hacia', 'para', 'quiero', 'ir', 'voy', 'necesito', 'mi', 'es', 'destino', 'origen'];
      commonWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleanAddress = cleanAddress.replace(regex, '').trim();
      });

      // Si después de limpiar queda algo, es una dirección
      if (cleanAddress.length > 3) {
        return {
          isAddress: true,
          address: cleanAddress,
          isOrigin: false,
          isDestination: false
        };
      }
    }

    return {
      isAddress: false,
      address: null,
      isOrigin: false,
      isDestination: false
    };
  }

  // Detectar método de pago
  detectPaymentMethod(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('efectivo') || lowerMessage.includes('cash')) {
      return { isPayment: true, method: 'Efectivo' };
    }
    if (lowerMessage.includes('tarjeta') || lowerMessage.includes('card') || lowerMessage.includes('crédito') || lowerMessage.includes('débito')) {
      return { isPayment: true, method: 'Tarjeta' };
    }
    if (lowerMessage.includes('transferencia') || lowerMessage.includes('transfer')) {
      return { isPayment: true, method: 'Transferencia' };
    }

    return { isPayment: false, method: null };
  }

  // Detectar tipo de servicio
  detectServiceType(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('inmediato') || lowerMessage.includes('ahora') || lowerMessage.includes('ya') ||
      lowerMessage.includes('ahora mismo') || lowerMessage.includes('para ahora') || lowerMessage.includes('inmediatamente') ||
      lowerMessage.includes('ahora mismo')) {
      return { isService: true, type: 'Inmediato' };
    }
    if (lowerMessage.includes('reserva') || lowerMessage.includes('más tarde') || lowerMessage.includes('después') ||
      lowerMessage.includes('programar') || lowerMessage.includes('para más tarde') || lowerMessage.includes('más adelante') ||
      lowerMessage.includes('mas tarde')) {
      return { isService: true, type: 'Reserva' };
    }

    return { isService: false, type: null };
  }

  // Detectar confirmación
  isConfirmation(message) {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('sí') || lowerMessage.includes('si') || lowerMessage.includes('confirmo') ||
      lowerMessage.includes('ok') || lowerMessage.includes('perfecto') || lowerMessage.includes('correcto');
  }

  // Detectar horario
  detectTime(message) {
    const lowerMessage = message.toLowerCase();
    
    // Patrón para formato HH:MM
    const timePattern = /(\d{1,2}):(\d{2})/;
    const match = message.match(timePattern);
    if (match) {
      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hasTime: true, time: `${hour}:${minute.toString().padStart(2, '0')}` };
      }
    }
    
    // Patrón para "18hs", "las 18hs", "a las 18hs", "para las 18hs"
    const hourPattern = /(?:a las|para las|las|a)\s*(\d{1,2})\s*(?:hs|horas|hora)?/i;
    const hourMatch = message.match(hourPattern);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      if (hour >= 0 && hour <= 23) {
        return { hasTime: true, time: `${hour}:00` };
      }
    }
    
    // Patrón para "18:00hs", "18hs"
    const simpleHourPattern = /(\d{1,2})\s*(?:hs|horas|hora)/i;
    const simpleMatch = message.match(simpleHourPattern);
    if (simpleMatch) {
      const hour = parseInt(simpleMatch[1]);
      if (hour >= 0 && hour <= 23) {
        return { hasTime: true, time: `${hour}:00` };
      }
    }
    
    return { hasTime: false, time: null };
  }

  // Detectar intención de pedir taxi
  detectTaxiIntention(message) {
    const lowerMessage = message.toLowerCase();
    
    const taxiKeywords = [
      'taxi', 'taxis', 'remis', 'remises', 'auto', 'coche', 'carro',
      'solicitar', 'pedir', 'necesito', 'quiero', 'busco', 'buscar',
      'llamar', 'conseguir', 'agendar', 'reservar', 'programar'
    ];
    
    const hasTaxiKeyword = taxiKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Patrones específicos para solicitudes de taxi
    const taxiPatterns = [
      /(?:necesito|quiero|busco|buscar|pedir|solicitar|llamar)\s+(?:un\s+)?(?:taxi|remis|auto|coche)/i,
      /(?:taxi|remis|auto|coche)\s+(?:por\s+favor|porfa|please)/i,
      /(?:me\s+)?(?:puedes|podrías|puede)\s+(?:ayudar\s+)?(?:con\s+)?(?:un\s+)?(?:taxi|remis|auto|coche)/i,
      /(?:ayuda|ayudame)\s+(?:con\s+)?(?:un\s+)?(?:taxi|remis|auto|coche)/i,
      /(?:tendrás|tienes|hay|disponible)\s+(?:un\s+)?(?:taxi|remis|auto|coche)/i,
      /(?:puedo\s+)?(?:pedir|solicitar|conseguir)\s+(?:un\s+)?(?:taxi|remis|auto|coche)/i
    ];
    
    const hasTaxiPattern = taxiPatterns.some(pattern => pattern.test(message));
    
    return {
      isTaxiRequest: hasTaxiKeyword || hasTaxiPattern,
      confidence: hasTaxiPattern ? 'high' : hasTaxiKeyword ? 'medium' : 'low'
    };
  }

  // Detectar preguntas sobre el servicio
  detectServiceQuestion(message) {
    const lowerMessage = message.toLowerCase();
    
    // Preguntas sobre precios
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuánto') || lowerMessage.includes('cuanto') || lowerMessage.includes('tarifa')) {
      return { isQuestion: true, type: 'pricing' };
    }
    
    // Preguntas sobre zonas
    if (lowerMessage.includes('zona') || lowerMessage.includes('dónde') || lowerMessage.includes('donde') || lowerMessage.includes('cubren') || lowerMessage.includes('llegar')) {
      return { isQuestion: true, type: 'zones' };
    }
    
    // Preguntas sobre conductores
    if (lowerMessage.includes('conductor') || lowerMessage.includes('chofer') || lowerMessage.includes('seguro') || lowerMessage.includes('verificado')) {
      return { isQuestion: true, type: 'drivers' };
    }
    
    // Preguntas sobre equipaje/mascotas
    if (lowerMessage.includes('equipaje') || lowerMessage.includes('mascota') || lowerMessage.includes('maleta') || lowerMessage.includes('perro') || lowerMessage.includes('gato')) {
      return { isQuestion: true, type: 'luggage' };
    }
    
    // Preguntas sobre horarios
    if (lowerMessage.includes('hora') || lowerMessage.includes('horario') || lowerMessage.includes('cuándo') || lowerMessage.includes('cuando') || lowerMessage.includes('disponible')) {
      return { isQuestion: true, type: 'hours' };
    }
    
    // Preguntas sobre métodos de pago
    if (lowerMessage.includes('pago') || lowerMessage.includes('pagar') || lowerMessage.includes('efectivo') || lowerMessage.includes('tarjeta') || lowerMessage.includes('transferencia')) {
      return { isQuestion: true, type: 'payment' };
    }
    
    return { isQuestion: false, type: null };
  }

  // Detectar confirmación de servicios especiales
  detectSpecialService(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('con mascota') || lowerMessage.includes('mascota') || lowerMessage.includes('perro') || lowerMessage.includes('gato')) {
      return { isSpecialService: true, type: 'pet' };
    }
    
    if (lowerMessage.includes('con equipaje') || lowerMessage.includes('equipaje') || lowerMessage.includes('maleta') || lowerMessage.includes('valija')) {
      return { isSpecialService: true, type: 'luggage' };
    }
    
    return { isSpecialService: false, type: null };
  }

  // Responder preguntas sobre el servicio
  answerServiceQuestion(type) {
    switch (type) {
      case 'pricing':
        return `Nuestras tarifas se calculan por distancia y horario:\n\n- Tarifa mínima base\n- Por kilómetro adicional después de la distancia mínima\n- Adicional nocturno de 22:00 a 06:00\n- Las tarifas varían según la zona de la ciudad\n\n¿Querés que te ayude a pedir un taxi para ver el precio exacto?`;
      
      case 'zones':
        return `Cubrimos Concordia y alrededores. Tenemos zonas definidas por polígonos geográficos para calcular las tarifas correctamente.\n\n¿Desde qué zona querés salir?`;
      
      case 'drivers':
        return `Todos nuestros conductores están verificados y aprobados. Tienen:\n\n- Documentación al día\n- Vehículos aprobados\n- Seguros vigentes\n- Calificaciones de usuarios\n\n¿Te ayudo a pedir un taxi?`;
      
      case 'luggage':
        return `Sí, permitimos equipaje y mascotas:\n\n- Equipaje excedente (informar al conductor)\n- Mascotas de cualquier tamaño\n- Solo necesitás avisar al conductor\n\n¿Querés pedir un taxi con equipaje o mascota?`;
      
      case 'hours':
        return `Estamos disponibles 24/7:\n\n- Servicio inmediato todo el día\n- Reservas para cualquier horario\n- Adicional nocturno de 22:00 a 06:00\n\n¿Querés un taxi ahora o hacer una reserva?`;
      
      case 'payment':
        return `Aceptamos varios métodos de pago:\n\n- Efectivo\n- Transferencia bancaria\n- Tarjeta (Openpay)\n\n¿Cómo te gustaría pagar?`;
      
      default:
        return `¿En qué te puedo ayudar? Puedo informarte sobre precios, zonas, conductores, equipaje, horarios o métodos de pago.`;
    }
  }

  // Obtener el siguiente paso lógico
  getNextStep(userData) {
    if (!userData.origin) {
      return "¿Desde dónde salís?";
    }
    if (!userData.destination) {
      return "¿A dónde vas?";
    }
    if (!userData.paymentMethod) {
      return "¿Cómo querés pagarlo? Tenemos efectivo, transferencia o tarjeta";
    }
    if (!userData.serviceType) {
      return "¿Lo querés ahora o es para más tarde?";
    }
    if (userData.serviceType === 'Reserva' && !userData.time) {
      return "¿A qué hora lo necesitás?";
    }
    return "¿Confirmás el viaje? (Sí/No)";
  }

  // Actualizar estado desde la respuesta de la IA
  updateStateFromAIResponse(currentState, message, aiResponse) {
    if (!currentState.userData) currentState.userData = {};
    
    // Detectar hora si no está configurada
    const timeInfo = this.detectTime(message);
    if (timeInfo.hasTime && !currentState.userData.time) {
      currentState.userData.time = timeInfo.time;
      currentState.userData.serviceType = 'Reserva';
    }
    
    // Detectar método de pago si no está configurado
    const paymentInfo = this.detectPaymentMethod(message);
    if (paymentInfo.isPayment && !currentState.userData.paymentMethod) {
      currentState.userData.paymentMethod = paymentInfo.method;
    }
    
    // Detectar paradas intermedias
    if (message.toLowerCase().includes('paso por') || message.toLowerCase().includes('paro en')) {
      currentState.userData.hasIntermediateStops = true;
      // Extraer paradas intermedias del mensaje
      const stops = this.extractIntermediateStops(message);
      if (stops.length > 0) {
        currentState.userData.intermediateStops = stops;
      }
    }
  }

  // Extraer paradas intermedias del mensaje
  extractIntermediateStops(message) {
    const stops = [];
    const lowerMessage = message.toLowerCase();
    
    // Patrón para "paso por X" o "paro en X"
    const stopPatterns = [
      /(?:paso por|paro en)\s+([^,]+?)(?:\s+y\s+después|\s+y\s+luego|\s+después|\s+luego|$)/gi,
      /(?:después voy a|luego voy a)\s+([^,]+?)(?:\s*$)/gi
    ];
    
    for (const pattern of stopPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          stops.push(match[1].trim());
        }
      }
    }
    
    return stops;
  }

  // Calcular precio estimado basado en la distancia
  calculateEstimatedPrice(userData) {
    // Simulación de cálculo de precio basado en distancia
    // En un sistema real, esto se calcularía con Google Maps API
    
    const origin = userData.origin || '';
    const destination = userData.destination || '';
    
    // Estimación simple basada en las direcciones
    if (origin.includes('Concordia') && destination.includes('Concordia')) {
      // Viaje dentro de Concordia
      if (origin.includes('1 de Mayo') && destination.includes('Diamante')) {
        return '800-1200'; // Distancia media
      }
      return '500-800'; // Distancia corta
    }
    
    // Viaje interurbano
    if (origin.includes('Concordia') && !destination.includes('Concordia')) {
      return '1200-2000'; // Distancia larga
    }
    
    // Precio por defecto
    return '800-1200';
  }

  // Construir resumen del viaje
  buildTripSummary(userData) {
    let summary = `Origen: ${userData.origin}\nDestino: ${userData.destination}\nPago: ${userData.paymentMethod}\nServicio: ${userData.serviceType}`;
    
    if (userData.time) {
      summary += `\nHora: ${userData.time}`;
    }
    
    summary += `\n\nLa tarifa se calcula por distancia y horario. Si es después de las 22:00 hay adicional nocturno.`;
    
    return summary;
  }

  // Construir prompt del sistema
  buildSystemPrompt(state) {
    const userData = state?.userData || {};
    const hasOrigin = !!userData.origin;
    const hasDestination = !!userData.destination;
    const hasPayment = !!userData.paymentMethod;
    const hasService = !!userData.serviceType;

    let contextInfo = '';
    if (hasOrigin) contextInfo += `\n- Origen: ${userData.origin}`;
    if (hasDestination) contextInfo += `\n- Destino: ${userData.destination}`;
    if (hasPayment) contextInfo += `\n- Método de pago: ${userData.paymentMethod}`;
    if (hasService) contextInfo += `\n- Tipo de servicio: ${userData.serviceType}`;

    const basePrompt = `Sos un operador de taxi que atiende por WhatsApp. Tu trabajo es tomar pedidos de taxi de forma directa, rápida y sin vueltas, como lo haría una persona real en Argentina.

INSTRUCCIONES DE ESTILO:
- No te presentes como bot, asistente ni IA.
- Usá voseo argentino (vos, salís, querés, etc.).
- Sé natural y conversacional, como una persona real.
- No uses emojis ni signos de exclamación excesivos.
- Interpretá primero lo que dice el usuario y respondé de forma coherente.
- Si el usuario saluda, respondé ÚNICAMENTE con un saludo casual como "Buenass", "holaa", "qué tal" o similar. NO preguntes "¿cómo estás?" ni ofrezcas ayuda ni preguntes qué necesita.
- Si el usuario dice que necesita un taxi o pide un taxi, preguntá desde dónde sale SIN saludar de nuevo.
- Si el usuario da información de viaje, confirma y continúa el flujo SIN saludar.
- Si el usuario da información incompleta, pedila de forma natural.
- Si el usuario pregunta por precios, explicá que depende de la distancia y mostrá el rango: "Corto $500-800, medio $800-1200, largo $1200-2000".
- Si el usuario menciona mascotas, exceso de equipaje o taxi rosa, aclaralo y pedí confirmación.
- Si el usuario menciona paradas intermedias (ej: "paso por X antes de ir a Y"), confirmá y preguntá si hay más paradas.
- NUNCA inventes direcciones o datos que el usuario no te dio.
- Mantené siempre el contexto de la conversación y no te confundas con las direcciones.
- Si el usuario te corrige una dirección (ej: "el destino es X"), actualizala inmediatamente y confirma el cambio.
- Si el usuario ya te dijo que es reserva, NO preguntes nuevamente si es inmediato o reserva.
- Si el usuario ya te dijo que es inmediato, NO preguntes nuevamente si es inmediato o reserva.
- Si no hay choferes, ofrecé reserva.
- Si hay un error grave, indicá que se va a contactar soporte humano.
- Cuando se confirme el viaje, agradecé y mostrá un resumen completo con todos los datos recopilados.
- Sé conciso y no repitas información que ya confirmaste.
- Si el usuario ya te dio toda la información, ve directo a confirmar sin repetir.
- NUNCA repitas preguntas que ya hiciste en la conversación.
- Si ya preguntaste algo y el usuario te respondió, recordá esa respuesta y no preguntes lo mismo de nuevo.
- Mantené siempre el contexto completo de la conversación.

FLUJO DE CONVERSACIÓN:
1. Interpretá la intención del usuario: ¿saluda, pide taxi, da información, pregunta algo?
2. Si saluda, respondé de forma casual y natural, sin ofrecer ayuda ni preguntar qué necesita.
3. Si pide taxi o dice que necesita transporte, preguntá desde dónde sale.
4. Si da una dirección, confirma y preguntá a dónde va.
5. Si da ambas direcciones, confirma y preguntá cómo paga.
6. Si menciona método de pago, confirma y preguntá si es inmediato o reserva.
7. Si es reserva, preguntá la hora.
8. Si menciona paradas intermedias, confirmá y preguntá si hay más paradas.
9. Antes de confirmar, mostrá el precio estimado y pedí confirmación.
10. Si confirma, agradecé y mostrá el resumen completo del viaje.
11. Si quiere cancelar, permitilo sin vueltas.
12. Si pide ayuda, explicá de forma simple.

DATOS DEL SERVICIO:
- Flota: taxi común, taxi rosa, taxi con mascota (tarifa diferente).
- No hay vehículos para personas con movilidad reducida.
- Se aceptan mascotas solo si se avisa antes.
- Cobertura: toda la ciudad y alrededores.
- Horario: 24/7.
- Si no hay choferes, ofrecé reserva.
- Si el usuario quiere dejar nota para el conductor, permitilo.

MÉTODOS DE PAGO SOPORTADOS:
- Efectivo
- Transferencia bancaria
- Pasarela de pago (tarjeta)

TIPOS DE VEHÍCULOS Y TARIFAS:
- Taxi Normal: tarifa estándar
- Taxi Rosa: tarifa estándar (servicio especial)
- Taxi con Mascota: tarifa diferenciada (más cara)
- No hay vehículos para personas con movilidad reducida

INFORMACIÓN QUE SE LE DA AL PASAJERO SOBRE EL CONDUCTOR Y VEHÍCULO:
Cuando un conductor acepta el viaje, el bot debe enviar al pasajero:
- Nombre del conductor
- Modelo y patente del auto
- Tiempo estimado de llegada
- Opción de compartir viaje

TARIFAS Y PRECIOS:
- Tarifa mínima base
- Por kilómetro adicional después de distancia mínima
- Adicional nocturno de 22:00 a 06:00
- Tarifas varían por zona de la ciudad
- Rango aproximado: corto $500-800, medio $800-1200, largo $1200-2000

ESTADOS DEL VIAJE:
- Esperando: Buscando conductor
- En curso: Viaje activo
- Completado: Viaje finalizado
- Cancelado: Por conductor o pasajero

VALIDACIONES Y ERRORES:
- Si el usuario pone una dirección mal, se debe llamar a alguien de soporte
- Si no hay choferes disponibles, se hace reserva automáticamente
- Si hay errores graves, indicar que se contactará soporte humano

MANEJO DE CONTEXTO:
- Recordá siempre las direcciones que te dio el usuario en la conversación.
- Si el usuario te dio origen, destino y paradas intermedias, mantenelos en memoria.
- NUNCA cambies las direcciones que te dio el usuario.
- Si no estás seguro de alguna dirección, preguntá para confirmar.

RESUMEN FINAL DEL VIAJE:
Cuando el usuario confirme el viaje, agradecé y mostrá un resumen completo con:
- Origen
- Destino
- Paradas intermedias (si las hay)
- Método de pago
- Tipo de servicio (inmediato/reserva)
- Hora (si es reserva)
- Servicios especiales (mascotas, equipaje, taxi rosa)
- Precio estimado
- Notas para el conductor (si las hay)

RESPONDE SIEMPRE EN ESPAÑOL ARGENTINO, DE FORMA NATURAL Y DIRECTA.

IMPORTANTE: 
- Si el usuario dice "hola", "buenas", "buenass" o cualquier saludo, respondé ÚNICAMENTE con un saludo casual como "Buenass", "holaa", "qué tal". NO agregues preguntas ni ofrezcas ayuda ni preguntes qué necesita.
- Si el usuario pide un taxi o da información de viaje, NO saludes de nuevo, ve directo al punto.
- Interpretá correctamente las intenciones del usuario antes de responder.
- NUNCA inventes direcciones, orígenes o destinos que el usuario no te dio.
- Mantené siempre el contexto de la conversación y recordá las direcciones que te dio el usuario.
- Si el usuario te dio múltiples direcciones, recordalas todas y no te confundas.
- NUNCA pongas la misma dirección como origen y destino a menos que el usuario lo especifique.
- Si el usuario te corrige una dirección, actualizala inmediatamente.

Información actual del viaje:${contextInfo || '\n- Sin información aún'}`;

    return basePrompt;
  }

  // Verificar si tenemos todos los datos del viaje
  hasCompleteTripData(userData) {
    if (!userData || !userData.origin || !userData.destination || !userData.paymentMethod || !userData.serviceType) {
      return false;
    }
    
    // Si es reserva, necesitamos la hora
    if (userData.serviceType === 'Reserva' && !userData.time) {
      return false;
    }
    
    return true;
  }

  // Enviar mensaje por WhatsApp
  async sendMessage(to, message) {
    try {
      logger.info(`[MODO TEST] Mensaje que se enviaría a ${to}: ${message}`);
    } catch (error) {
      logger.error('Error enviando mensaje WhatsApp:', error);
      throw error;
    }
  }

  // Obtener estado de conversación
  async getConversationState(phoneNumber) {
    return conversationStates[phoneNumber] || null;
  }

  // Actualizar estado de conversación
  async updateConversationState(phoneNumber, state) {
    conversationStates[phoneNumber] = state;
    logger.info(`Estado actualizado para ${phoneNumber}:`, state);
  }

  // Limpiar estado de conversación
  async clearConversationState(phoneNumber) {
    delete conversationStates[phoneNumber];
    logger.info(`Estado limpiado para ${phoneNumber}`);
  }

  // Crear viaje en el sistema
  async createTrip(userData, phoneNumber) {
    try {
      logger.info('Creando viaje:', { userData, phoneNumber });
      return {
        success: true,
        tripId: 'TRIP-' + Date.now()
      };
    } catch (error) {
      logger.error('Error creando viaje:', error);
      return {
        success: false,
        error: 'Error interno del sistema'
      };
    }
  }

  // Respuesta de fallback
  getFallbackResponse() {
    return `¡Hola! Soy NovoBot, tu asistente de taxi de NovoApp\n\nTuve un pequeño problema técnico. ¿Podrías decirme de nuevo qué necesitás?\n\nTe puedo ayudar con:\n- Pedir un taxi inmediato\n- Hacer una reserva\n- Cancelar un viaje\n- Consultar precios\n- Información sobre zonas de servicio\n- Preguntas sobre equipaje o mascotas\n- Información sobre conductores\n\n¿En qué te ayudo?`;
  }
}

module.exports = new WhatsAppController(); 