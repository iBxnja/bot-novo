const AdvancedNLUService = require('../nlp/AdvancedNLUService');
const ValidationService = require('../validation/ValidationService');

class ConversationFlowService {
  constructor() {
    this.nluService = new AdvancedNLUService();
    this.validationService = new ValidationService();
    this.conversationStates = this.initializeConversationStates();
    this.errorRecoveryStrategies = this.initializeErrorRecoveryStrategies();
  }

  initializeConversationStates() {
    return {
      INITIAL: 'initial',
      GREETING: 'greeting',
      TAXI_REQUEST: 'taxi_request',
      ADDRESS_COLLECTION: 'address_collection',
      PAYMENT_COLLECTION: 'payment_collection',
      TIME_COLLECTION: 'time_collection',
      CONFIRMATION: 'confirmation',
      COMPLETED: 'completed',
      ERROR: 'error',
      HELP: 'help'
    };
  }

  initializeErrorRecoveryStrategies() {
    return {
      unclear_intent: {
        strategies: [
          'ask_clarification',
          'provide_options',
          'suggest_common_actions'
        ],
        messages: {
          ask_clarification: 'No estoy seguro de qué necesitás. ¿Podrías ser más específico?',
          provide_options: 'Te puedo ayudar con:\n• Pedir un taxi\n• Consultar precios\n• Hacer una reserva\n• Información del servicio',
          suggest_common_actions: '¿Querés pedir un taxi o consultar algo específico?'
        }
      },
      invalid_address: {
        strategies: [
          'ask_for_clarification',
          'suggest_format',
          'offer_help'
        ],
        messages: {
          ask_for_clarification: 'No pude entender la dirección. ¿Podrías escribirla de otra forma?',
          suggest_format: 'Ejemplo: "1 de mayo 449, concordia" o "desde guemes 800 hasta diamante 2500"',
          offer_help: '¿Te ayudo a encontrar la dirección correcta?'
        }
      },
      invalid_time: {
        strategies: [
          'suggest_format',
          'ask_for_clarification',
          'provide_examples'
        ],
        messages: {
          suggest_format: 'Podés escribir la hora así: "18hs", "6:00 PM", "18:30"',
          ask_for_clarification: '¿A qué hora exactamente lo necesitás?',
          provide_examples: 'Ejemplos: "a las 18hs", "para las 6 de la tarde", "18:30"'
        }
      },
      payment_confusion: {
        strategies: [
          'list_methods',
          'ask_preference',
          'suggest_popular'
        ],
        messages: {
          list_methods: 'Aceptamos:\n• Efectivo\n• Transferencia bancaria\n• Tarjeta (débito/crédito)',
          ask_preference: '¿Cuál te resulta más cómodo?',
          suggest_popular: 'La mayoría de nuestros clientes pagan en efectivo o transferencia'
        }
      }
    };
  }

  async processMessage(message, userContext) {
    try {
      // Analizar el mensaje con NLU avanzado
      const analysis = await this.nluService.analyzeMessage(message);
      
      // Determinar el estado actual de la conversación
      const currentState = this.determineConversationState(userContext, analysis);
      
      // Procesar el mensaje según el estado
      const response = await this.handleConversationState(currentState, analysis, userContext);
      
      // Actualizar el contexto del usuario
      this.updateUserContext(userContext, analysis, currentState);
      
      return {
        response,
        newState: currentState,
        analysis,
        suggestions: analysis.suggestions,
        validation: analysis.validation
      };

    } catch (error) {
      console.error('Error en ConversationFlowService:', error);
      return this.handleError(error, userContext);
    }
  }

  determineConversationState(userContext, analysis) {
    const { intents, entities } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    // Detectar saludos
    if (intents.primary?.intent === 'greeting') {
      return this.conversationStates.GREETING;
    }

    // Detectar solicitud de taxi
    if (intents.primary?.intent === 'taxi_request') {
      return this.conversationStates.TAXI_REQUEST;
    }

    // Detectar preguntas de ayuda
    if (intents.primary?.intent === 'help' || intents.primary?.intent === 'question') {
      return this.conversationStates.HELP;
    }

    // Detectar cancelación
    if (intents.primary?.intent === 'cancellation') {
      return this.conversationStates.INITIAL;
    }

    // Estado basado en información faltante
    if (!userData.origin && !userData.destination) {
      return this.conversationStates.ADDRESS_COLLECTION;
    }

    if (userData.origin && !userData.destination) {
      return this.conversationStates.ADDRESS_COLLECTION;
    }

    if (userData.origin && userData.destination && !userData.paymentMethod) {
      return this.conversationStates.PAYMENT_COLLECTION;
    }

    if (userData.origin && userData.destination && userData.paymentMethod && !userData.serviceType) {
      return this.conversationStates.TIME_COLLECTION;
    }

    if (userData.origin && userData.destination && userData.paymentMethod && userData.serviceType) {
      return this.conversationStates.CONFIRMATION;
    }

    // Estado por defecto
    return this.conversationStates.INITIAL;
  }

  async handleConversationState(state, analysis, userContext) {
    const { intents, entities, sentiment } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    switch (state) {
      case this.conversationStates.GREETING:
        return this.handleGreeting(analysis, userContext);

      case this.conversationStates.TAXI_REQUEST:
        return this.handleTaxiRequest(analysis, userContext);

      case this.conversationStates.ADDRESS_COLLECTION:
        return this.handleAddressCollection(analysis, userContext);

      case this.conversationStates.PAYMENT_COLLECTION:
        return this.handlePaymentCollection(analysis, userContext);

      case this.conversationStates.TIME_COLLECTION:
        return this.handleTimeCollection(analysis, userContext);

      case this.conversationStates.CONFIRMATION:
        return this.handleConfirmation(analysis, userContext);

      case this.conversationStates.HELP:
        return this.handleHelp(analysis, userContext);

      case this.conversationStates.ERROR:
        return this.handleErrorRecovery(analysis, userContext);

      default:
        return this.handleInitialState(analysis, userContext);
    }
  }

  handleGreeting(analysis, userContext) {
    const greetings = ['Buenass', 'Hola', 'Qué tal', 'Hola!'];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    return randomGreeting;
  }

  handleTaxiRequest(analysis, userContext) {
    const userData = userContext.currentConversation?.userData || {};
    
    if (!userData.origin) {
      return '¿Desde dónde salís?';
    } else if (!userData.destination) {
      return `Perfecto, salís desde ${userData.origin}. ¿A dónde vas?`;
    } else {
      return `Genial, vas de ${userData.origin} a ${userData.destination}. ¿Cómo querés pagarlo?`;
    }
  }

  async handleAddressCollection(analysis, userContext) {
    const { entities, validation } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    // Extraer direcciones del mensaje
    const addressEntities = entities.filter(e => e.type === 'address');
    
    if (addressEntities.length === 0) {
      return this.getErrorRecoveryMessage('invalid_address', 'ask_for_clarification');
    }

    // Procesar direcciones
    for (const addressEntity of addressEntities) {
      if (addressEntity.role === 'origin' || !userData.origin) {
        // Validar dirección de origen
        const addressValidation = await this.validationService.validateAddress(addressEntity.value);
        if (!addressValidation.isValid) {
          return `No pude entender la dirección de origen: ${addressValidation.error}`;
        }
        userData.origin = addressEntity.value;
      } else if (addressEntity.role === 'destination' || !userData.destination) {
        // Validar dirección de destino
        const addressValidation = await this.validationService.validateAddress(addressEntity.value);
        if (!addressValidation.isValid) {
          return `No pude entender la dirección de destino: ${addressValidation.error}`;
        }
        userData.destination = addressEntity.value;
      }
    }

    // Determinar siguiente paso
    if (!userData.origin) {
      return '¿Desde dónde salís?';
    } else if (!userData.destination) {
      return `Perfecto, salís desde ${userData.origin}. ¿A dónde vas?`;
    } else {
      return `Genial, vas de ${userData.origin} a ${userData.destination}. ¿Cómo querés pagarlo?`;
    }
  }

  async handlePaymentCollection(analysis, userContext) {
    const { entities, intents } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    console.log('🔍 [DEBUG PaymentCollection] Entidades detectadas:', entities);
    console.log('🔍 [DEBUG PaymentCollection] Datos del usuario:', userData);

    // Detectar método de pago
    const paymentEntity = entities.find(e => e.type === 'payment');
    
    if (paymentEntity) {
      console.log('✅ [DEBUG PaymentCollection] Método de pago detectado:', paymentEntity.value);
      
      const paymentValidation = this.validationService.validatePaymentMethod(paymentEntity.value);
      if (!paymentValidation.isValid) {
        return paymentValidation.error;
      }
      
      userData.paymentMethod = paymentEntity.value;
      
      if (paymentValidation.warning) {
        return `Perfecto, pagás con ${paymentEntity.value}. ${paymentValidation.warning}\n\n¿Lo querés ahora o es para más tarde?`;
      }
      
      return `Perfecto, pagás con ${paymentEntity.value}. ¿Lo querés ahora o es para más tarde?`;
    }

    console.log('❌ [DEBUG PaymentCollection] No se detectó método de pago');
    // Si no detectó método de pago, preguntar
    return this.getErrorRecoveryMessage('payment_confusion', 'list_methods');
  }

  async handleTimeCollection(analysis, userContext) {
    const { entities, intents } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    // Detectar tipo de servicio
    const serviceEntity = entities.find(e => e.type === 'service_type');
    const timeEntity = entities.find(e => e.type === 'time');

    if (serviceEntity) {
      userData.serviceType = serviceEntity.value;
    }

    if (timeEntity) {
      const timeValidation = this.validationService.validateTime(timeEntity.value, userData.serviceType === 'reserva');
      if (!timeValidation.isValid) {
        return timeValidation.error;
      }
      
      userData.time = timeValidation.normalizedTime;
      
      if (timeValidation.warning) {
        return `Perfecto, a las ${timeEntity.value}. ${timeValidation.warning}\n\n¿Confirmás el viaje?`;
      }
      
      return `Perfecto, a las ${timeEntity.value}. ¿Confirmás el viaje?`;
    }

    // Si no detectó horario, preguntar
    if (userData.serviceType === 'reserva') {
      return '¿A qué hora lo necesitás?';
    } else {
      return '¿Lo querés ahora o es para más tarde?';
    }
  }

  async handleConfirmation(analysis, userContext) {
    const { intents } = analysis;
    const userData = userContext.currentConversation?.userData || {};

    // Detectar confirmación
    if (intents.primary?.intent === 'confirmation') {
      // Validar pedido completo
      const orderValidation = await this.validationService.validateOrder(userData);
      
      if (!orderValidation.isValid) {
        return `Hay algunos problemas con tu pedido:\n${orderValidation.errors.join('\n')}`;
      }

      // Calcular tarifa final
      const tariff = this.validationService.calculateTariff(userData.origin, userData.destination, userData.serviceType);
      
      // Generar resumen
      const summary = this.generateOrderSummary(userData, tariff, orderValidation);
      
      // Limpiar contexto para nueva conversación
      userContext.currentConversation.userData = {};
      userContext.currentConversation.state = this.conversationStates.COMPLETED;
      
      return summary;
    }

    // Mostrar resumen para confirmación
    const tariff = this.validationService.calculateTariff(userData.origin, userData.destination, userData.serviceType);
    return this.generateOrderSummary(userData, tariff, null, true);
  }

  handleHelp(analysis, userContext) {
    const helpMessage = `Te ayudo con el proceso de pedir un taxi:

📋 **Pasos para pedir un taxi:**
1. Decime desde dónde salís
2. Decime a dónde vas
3. Elegí cómo pagar (efectivo, transferencia, tarjeta)
4. Decime si es inmediato o reserva
5. Si es reserva, decime la hora
6. Confirmá el viaje

💰 **Precios aproximados:**
• Viajes cortos: $500-800
• Viajes medios: $800-1200
• Viajes largos: $1200-2000

🚕 **Servicios especiales:**
• Taxi con mascota (+$200)
• Taxi rosa (+$100)
• Tarifa nocturna (+$150)

¿En qué paso estás o qué necesitás saber?`;

    return helpMessage;
  }

  handleErrorRecovery(analysis, userContext) {
    // Intentar recuperar del error basado en el análisis
    const errorType = this.detectErrorType(analysis);
    const strategy = this.getErrorRecoveryStrategy(errorType);
    
    return this.getErrorRecoveryMessage(errorType, strategy);
  }

  handleInitialState(analysis, userContext) {
    // Estado inicial - preguntar qué necesita el usuario
    return '¿En qué te puedo ayudar? Podés pedir un taxi, consultar precios o hacer una reserva.';
  }

  detectErrorType(analysis) {
    const { intents, entities, validation } = analysis;
    
    if (intents.primary?.confidence < 0.5) {
      return 'unclear_intent';
    }
    
    if (validation.errors.length > 0) {
      if (validation.errors.some(e => e.includes('dirección'))) {
        return 'invalid_address';
      }
      if (validation.errors.some(e => e.includes('hora'))) {
        return 'invalid_time';
      }
      if (validation.errors.some(e => e.includes('pago'))) {
        return 'payment_confusion';
      }
    }
    
    return 'unclear_intent';
  }

  getErrorRecoveryStrategy(errorType) {
    const strategies = this.errorRecoveryStrategies[errorType]?.strategies || ['ask_clarification'];
    return strategies[0]; // Usar la primera estrategia por defecto
  }

  getErrorRecoveryMessage(errorType, strategy) {
    return this.errorRecoveryStrategies[errorType]?.messages?.[strategy] || 
           'No pude entender eso. ¿Podrías decirlo de otra forma?';
  }

  generateOrderSummary(userData, tariff, validation, isPreview = false) {
    let summary = isPreview ? '📋 **Resumen del pedido:**\n' : '✅ **¡Viaje confirmado!**\n\n';
    
    summary += `📍 **Origen:** ${userData.origin}\n`;
    summary += `🎯 **Destino:** ${userData.destination}\n`;
    summary += `💳 **Pago:** ${userData.paymentMethod}\n`;
    summary += `⏰ **Servicio:** ${userData.serviceType}`;
    
    if (userData.time) {
      summary += ` a las ${userData.time.hour}:${userData.time.minute.toString().padStart(2, '0')}\n`;
    } else {
      summary += '\n';
    }
    
    if (tariff) {
      summary += `💰 **Precio estimado:** $${tariff.totalPrice}\n`;
      
      if (tariff.additionalFees.length > 0) {
        summary += '📝 **Cargos adicionales:**\n';
        tariff.additionalFees.forEach(fee => {
          summary += `   • ${fee.type}: $${fee.amount}\n`;
        });
      }
    }
    
    if (validation?.warnings.length > 0) {
      summary += '\n⚠️ **Notas importantes:**\n';
      validation.warnings.forEach(warning => {
        summary += `   • ${warning}\n`;
      });
    }
    
    if (isPreview) {
      summary += '\n¿Confirmás este viaje?';
    } else {
      summary += '\n🚕 Tu taxi está en camino. Te avisamos cuando el conductor llegue.\n\n¡Que tengas buen viaje!';
    }
    
    return summary;
  }

  updateUserContext(userContext, analysis, newState) {
    if (!userContext.currentConversation) {
      userContext.currentConversation = {
        userData: {},
        state: newState,
        messages: []
      };
    }

    // Actualizar estado
    userContext.currentConversation.state = newState;

    // Actualizar datos del usuario basado en entidades
    const { entities } = analysis;
    const userData = userContext.currentConversation.userData;

    entities.forEach(entity => {
      switch (entity.type) {
        case 'address':
          if (entity.role === 'origin' || !userData.origin) {
            userData.origin = entity.value;
          } else if (entity.role === 'destination' || !userData.destination) {
            userData.destination = entity.value;
          }
          break;
        case 'payment':
          userData.paymentMethod = entity.value;
          break;
        case 'time':
          userData.time = entity.value;
          break;
        case 'service_type':
          userData.serviceType = entity.value;
          break;
      }
    });

    // Guardar mensaje en historial
    userContext.currentConversation.messages.push({
      role: 'user',
      content: analysis.originalMessage,
      timestamp: new Date().toISOString()
    });
  }

  handleError(error, userContext) {
    console.error('Error en flujo conversacional:', error);
    
    return {
      response: 'Disculpá, hubo un problema técnico. ¿Podrías intentar de nuevo?',
      newState: this.conversationStates.ERROR,
      analysis: null,
      suggestions: [],
      validation: { isValid: false, errors: [error.message] }
    };
  }
}

module.exports = ConversationFlowService; 