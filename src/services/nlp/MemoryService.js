const FileStorageService = require('../storage/FileStorageService');
const logger = require('../../utils/logger');

class MemoryService {
  constructor() {
    this.storage = new FileStorageService();
    this.userCache = new Map(); // Cache en memoria para acceso rápido
    this.conversationCache = new Map();
  }
  
  // Obtener o crear usuario con memoria persistente
  async getUser(phoneNumber) {
    try {
      // Verificar cache primero
      if (this.userCache.has(phoneNumber)) {
        return this.userCache.get(phoneNumber);
      }
      
      // Buscar en almacenamiento de archivos
      let user = await this.storage.getUser(phoneNumber);
      
      // Guardar en cache
      this.userCache.set(phoneNumber, user);
      
      return user;
    } catch (error) {
      logger.error('Error obteniendo usuario:', error);
      throw error;
    }
  }
  
  // Obtener historial de conversaciones
  async getConversationHistory(phoneNumber, limit = 5) {
    try {
      const conversations = await this.storage.getConversationsByPhone(phoneNumber, limit);
      return conversations;
    } catch (error) {
      logger.error('Error obteniendo historial:', error);
      return [];
    }
  }
  
  // Guardar mensaje en la conversación actual
  async saveMessage(phoneNumber, sessionId, messageData) {
    try {
      // Agregar phoneNumber al mensaje si no está presente
      if (!messageData.phoneNumber) {
        messageData.phoneNumber = phoneNumber;
      }
      
      const conversation = await this.storage.addMessageToConversation(sessionId, messageData);
      
      // Actualizar cache
      this.conversationCache.set(sessionId, conversation);
      
      return conversation;
    } catch (error) {
      logger.error('Error guardando mensaje:', error);
      throw error;
    }
  }
  
  // Aprender de la interacción actual
  async learnFromInteraction(phoneNumber, userData, outcome) {
    try {
      const user = await this.getUser(phoneNumber);
      
      // Actualizar preferencias si el viaje fue exitoso
      if (outcome.success && userData) {
        user.updatePreferences(userData);
      }
      
      // Actualizar estadísticas
      if (outcome.tripCreated) {
        user.updateStats({
          cost: outcome.cost || 0,
          distance: outcome.distance || 0,
          serviceType: userData?.serviceType
        });
      }
      
      // Actualizar comportamiento
      await this.updateBehaviorPatterns(user, userData, outcome);
      
      await user.save();
      
      // Actualizar cache
      this.userCache.set(phoneNumber, user);
      
      logger.info(`Aprendizaje completado para usuario: ${phoneNumber}`);
    } catch (error) {
      logger.error('Error en aprendizaje:', error);
    }
  }
  
  // Generar sugerencias inteligentes basadas en el historial
  async generateSmartSuggestions(phoneNumber, currentContext) {
    try {
      const user = await this.getUser(phoneNumber);
      const suggestions = [];
      
      // Sugerencias basadas en preferencias frecuentes
      const userSuggestions = user.getSuggestions();
      
      // Si no tiene origen, sugerir orígenes frecuentes
      if (!currentContext.userData?.origin && userSuggestions.origins.length > 0) {
        suggestions.push({
          type: 'frequent_origin',
          message: `¿Salís desde ${userSuggestions.origins[0]}?`,
          confidence: 0.8,
          data: userSuggestions.origins[0]
        });
      }
      
      // Si no tiene destino, sugerir destinos frecuentes
      if (!currentContext.userData?.destination && userSuggestions.destinations.length > 0) {
        suggestions.push({
          type: 'frequent_destination',
          message: `¿Vas a ${userSuggestions.destinations[0]}?`,
          confidence: 0.8,
          data: userSuggestions.destinations[0]
        });
      }
      
      // Si no tiene método de pago, sugerir preferido
      if (!currentContext.userData?.paymentMethod && userSuggestions.paymentMethods.length > 0) {
        suggestions.push({
          type: 'preferred_payment',
          message: `¿Pagás con ${userSuggestions.paymentMethods[0]}?`,
          confidence: 0.9,
          data: userSuggestions.paymentMethods[0]
        });
      }
      
      // Sugerencias basadas en patrones de tiempo
      const timeSuggestions = this.generateTimeSuggestions(user);
      suggestions.push(...timeSuggestions);
      
      // Sugerencias basadas en servicios especiales frecuentes
      if (userSuggestions.specialServices.length > 0) {
        suggestions.push({
          type: 'special_service',
          message: `¿Necesitás ${userSuggestions.specialServices[0]}?`,
          confidence: 0.7,
          data: userSuggestions.specialServices[0]
        });
      }
      
      return suggestions;
    } catch (error) {
      logger.error('Error generando sugerencias:', error);
      return [];
    }
  }
  
  // Anticipar necesidades basadas en el contexto
  async anticipateNeeds(phoneNumber, currentContext) {
    try {
      const user = await this.getUser(phoneNumber);
      const history = await this.getConversationHistory(phoneNumber, 3);
      const anticipations = [];
      
      // Anticipar servicio especial si es frecuente
      if (user.preferences.preferredSpecialServices.length > 0) {
        const mostUsed = user.preferences.preferredSpecialServices[0];
        if (mostUsed.useCount > 2) {
          anticipations.push({
            type: 'special_service',
            service: mostUsed.service,
            confidence: 0.8,
            message: `¿Necesitás ${mostUsed.service} para este viaje?`
          });
        }
      }
      
      // Anticipar horario si es patrón común
      const currentHour = new Date().getHours();
      const typicalTime = user.behavior.typicalBookingTime;
      
      if (typicalTime && this.isSimilarTime(currentHour, typicalTime)) {
        anticipations.push({
          type: 'typical_time',
          time: typicalTime,
          confidence: 0.7,
          message: `¿Es para ${typicalTime} como siempre?`
        });
      }
      
      // Anticipar método de pago preferido
      if (user.preferences.preferredPaymentMethods.length > 0) {
        const preferred = user.preferences.preferredPaymentMethods[0];
        if (preferred.useCount > 3) {
          anticipations.push({
            type: 'preferred_payment',
            method: preferred.method,
            confidence: 0.9,
            message: `¿Pagás con ${preferred.method} como siempre?`
          });
        }
      }
      
      return anticipations;
    } catch (error) {
      logger.error('Error anticipando necesidades:', error);
      return [];
    }
  }
  
  // Actualizar patrones de comportamiento
  async updateBehaviorPatterns(user, userData, outcome) {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.toLocaleDateString('es-ES', { weekday: 'long' });
      
      // Actualizar hora típica de reserva
      if (!user.behavior.typicalBookingTime) {
        user.behavior.typicalBookingTime = `${currentHour}:00`;
      } else {
        // Calcular promedio ponderado
        const currentTime = parseInt(user.behavior.typicalBookingTime.split(':')[0]);
        const newTime = Math.round((currentTime + currentHour) / 2);
        user.behavior.typicalBookingTime = `${newTime}:00`;
      }
      
      // Actualizar día típico
      if (!user.behavior.typicalTripDay) {
        user.behavior.typicalTripDay = currentDay;
      }
      
      // Actualizar tasa de cancelación
      if (outcome.completionReason === 'user_cancelled') {
        const totalTrips = user.stats.totalTrips + 1;
        const currentCancellations = user.behavior.cancellationRate * (totalTrips - 1) / 100;
        user.behavior.cancellationRate = ((currentCancellations + 1) / totalTrips) * 100;
      }
      
      // Actualizar puntuación de satisfacción (basada en sentimiento)
      if (outcome.sentiment) {
        const currentScore = user.behavior.satisfactionScore || 3;
        const newScore = outcome.sentiment.score > 0 ? 
          Math.min(5, currentScore + 0.1) : 
          Math.max(1, currentScore - 0.1);
        user.behavior.satisfactionScore = newScore;
      }
      
    } catch (error) {
      logger.error('Error actualizando patrones de comportamiento:', error);
    }
  }
  
  // Generar sugerencias de tiempo basadas en patrones
  generateTimeSuggestions(user) {
    const suggestions = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Si es usuario frecuente, sugerir horarios típicos
    if (user.stats.totalTrips > 5) {
      const frequentTimes = user.preferences.frequentTimes.slice(0, 2);
      
      frequentTimes.forEach(time => {
        suggestions.push({
          type: 'frequent_time',
          message: `¿A las ${time.time}?`,
          confidence: 0.7,
          data: time.time
        });
      });
    }
    
    // Sugerir horarios comunes basados en la hora actual
    if (currentHour >= 6 && currentHour <= 9) {
      suggestions.push({
        type: 'contextual_time',
        message: '¿Para ir al trabajo?',
        confidence: 0.6,
        data: 'work_time'
      });
    } else if (currentHour >= 17 && currentHour <= 20) {
      suggestions.push({
        type: 'contextual_time',
        message: '¿Para volver a casa?',
        confidence: 0.6,
        data: 'home_time'
      });
    } else if (currentHour >= 21 || currentHour <= 2) {
      suggestions.push({
        type: 'contextual_time',
        message: '¿Para salir de noche?',
        confidence: 0.7,
        data: 'night_time'
      });
    }
    
    return suggestions;
  }
  
  // Verificar si una hora es similar a otra
  isSimilarTime(hour1, hour2) {
    const time1 = typeof hour1 === 'string' ? parseInt(hour1.split(':')[0]) : hour1;
    const time2 = typeof hour2 === 'string' ? parseInt(hour2.split(':')[0]) : hour2;
    
    return Math.abs(time1 - time2) <= 2;
  }
  
  // Obtener contexto personalizado para el usuario
  async getPersonalizedContext(phoneNumber) {
    try {
      const user = await this.getUser(phoneNumber);
      const history = await this.getConversationHistory(phoneNumber, 3);
      
      return {
        user: {
          totalTrips: user.stats.totalTrips,
          averageCost: user.stats.averageTripCost,
          favoriteService: user.stats.favoriteServiceType,
          satisfactionScore: user.behavior.satisfactionScore,
          typicalTime: user.behavior.typicalBookingTime,
          typicalDay: user.behavior.typicalTripDay
        },
        preferences: user.getSuggestions(),
        recentActivity: history.map(conv => ({
          date: conv.startTime,
          success: conv.outcome.success,
          duration: conv.analysis.metrics.conversationDuration
        })),
        isReturningUser: user.stats.totalTrips > 0,
        isFrequentUser: user.stats.totalTrips > 5,
        isSatisfiedUser: (user.behavior.satisfactionScore || 3) > 3.5
      };
    } catch (error) {
      logger.error('Error obteniendo contexto personalizado:', error);
      return {};
    }
  }
  
  // Limpiar cache periódicamente
  clearCache() {
    this.userCache.clear();
    this.conversationCache.clear();
    logger.info('Cache de memoria limpiado');
  }
  
  // Obtener estadísticas de aprendizaje
  async getLearningStats(phoneNumber) {
    try {
      const user = await this.getUser(phoneNumber);
      const analytics = await Conversation.getAnalytics(phoneNumber);
      
      return {
        userStats: {
          totalTrips: user.stats.totalTrips,
          totalSpent: user.stats.totalSpent,
          averageTripCost: user.stats.averageTripCost,
          satisfactionScore: user.behavior.satisfactionScore,
          cancellationRate: user.behavior.cancellationRate
        },
        conversationStats: analytics[0] || {},
        preferences: {
          frequentOrigins: user.preferences.frequentOrigins.length,
          frequentDestinations: user.preferences.frequentDestinations.length,
          preferredPaymentMethods: user.preferences.preferredPaymentMethods.length,
          frequentTimes: user.preferences.frequentTimes.length
        },
        learningProgress: {
          patternsIdentified: user.preferences.frequentOrigins.length + 
                             user.preferences.frequentDestinations.length,
          preferencesLearned: user.preferences.preferredPaymentMethods.length > 0,
          behaviorAnalyzed: user.behavior.typicalBookingTime !== undefined
        }
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de aprendizaje:', error);
      return {};
    }
  }
}

module.exports = MemoryService; 