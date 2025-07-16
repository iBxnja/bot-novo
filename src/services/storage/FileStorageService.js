const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class FileStorageService {
  constructor() {
    this.dataDir = path.join(__dirname, '../../../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.users = new Map();
    this.conversations = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Crear directorio de datos si no existe
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Cargar datos existentes
      await this.loadUsers();
      await this.loadConversations();
      
      this.initialized = true;
      logger.info('✅ Sistema de almacenamiento de archivos inicializado');
    } catch (error) {
      logger.error('Error inicializando almacenamiento:', error);
      throw error;
    }
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      const usersArray = JSON.parse(data);
      this.users = new Map(usersArray.map(user => [user.phoneNumber, user]));
      logger.info(`✅ ${this.users.size} usuarios cargados`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Archivo no existe, crear uno vacío
        await this.saveUsers();
        logger.info('✅ Archivo de usuarios creado');
      } else {
        logger.error('Error cargando usuarios:', error);
      }
    }
  }

  async loadConversations() {
    try {
      const data = await fs.readFile(this.conversationsFile, 'utf8');
      const conversationsArray = JSON.parse(data);
      this.conversations = new Map(conversationsArray.map(conv => [conv.sessionId, conv]));
      logger.info(`✅ ${this.conversations.size} conversaciones cargadas`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Archivo no existe, crear uno vacío
        await this.saveConversations();
        logger.info('✅ Archivo de conversaciones creado');
      } else {
        logger.error('Error cargando conversaciones:', error);
      }
    }
  }

  async saveUsers() {
    try {
      const usersArray = Array.from(this.users.values());
      await fs.writeFile(this.usersFile, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      logger.error('Error guardando usuarios:', error);
    }
  }

  async saveConversations() {
    try {
      const conversationsArray = Array.from(this.conversations.values());
      await fs.writeFile(this.conversationsFile, JSON.stringify(conversationsArray, null, 2));
    } catch (error) {
      logger.error('Error guardando conversaciones:', error);
    }
  }

  // Métodos para usuarios
  async getUser(phoneNumber) {
    if (!this.initialized) await this.initialize();
    
    let user = this.users.get(phoneNumber);
    
    if (!user) {
      // Crear nuevo usuario
      user = {
        phoneNumber,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        preferences: {
          frequentOrigins: [],
          frequentDestinations: [],
          preferredPaymentMethods: [],
          frequentTimes: [],
          preferredSpecialServices: [],
          communicationStyle: 'friendly',
          notificationPreferences: {
            confirmTrip: true,
            driverArrival: true,
            tripComplete: true
          }
        },
        stats: {
          totalTrips: 0,
          totalSpent: 0,
          averageTripCost: 0,
          favoriteServiceType: null,
          averageTripDistance: 0,
          lastTripDate: null
        },
        behavior: {
          typicalBookingTime: null,
          typicalTripDay: null,
          averageResponseTime: null,
          conversationLength: 0,
          cancellationRate: 0,
          satisfactionScore: 0
        },
        currentConversation: {
          state: 'idle',
          userData: {},
          context: {
            lastIntent: null,
            pendingQuestions: [],
            userMood: 'calm',
            conversationStartTime: null
          }
        }
      };
      
      this.users.set(phoneNumber, user);
      await this.saveUsers();
      logger.info(`Nuevo usuario creado: ${phoneNumber}`);
    } else {
      // Actualizar última actividad
      user.lastActive = new Date().toISOString();
      await this.saveUsers();
    }
    
    return user;
  }

  async updateUser(phoneNumber, updates) {
    if (!this.initialized) await this.initialize();
    
    const user = this.users.get(phoneNumber);
    if (user) {
      Object.assign(user, updates);
      await this.saveUsers();
    }
    return user;
  }

  async saveConversation(sessionId, conversation) {
    if (!this.initialized) await this.initialize();
    
    this.conversations.set(sessionId, conversation);
    await this.saveConversations();
  }

  async getConversationsByPhone(phoneNumber, limit = 10) {
    if (!this.initialized) await this.initialize();
    
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.phoneNumber === phoneNumber)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, limit);
    
    return userConversations;
  }

  async addMessageToConversation(sessionId, messageData) {
    if (!this.initialized) await this.initialize();
    
    let conversation = this.conversations.get(sessionId);
    
    if (!conversation) {
      conversation = {
        sessionId,
        phoneNumber: messageData.phoneNumber || 'unknown',
        startTime: new Date().toISOString(),
        status: 'active',
        messages: [],
        analysis: {
          intents: [],
          entities: [],
          overallSentiment: { score: 0, label: 'neutral', trend: 'stable' },
          metrics: {
            totalMessages: 0,
            userMessages: 0,
            botMessages: 0,
            averageResponseTime: null,
            conversationDuration: null,
            completionRate: 0,
            userSatisfaction: null
          },
          issues: [],
          suggestions: []
        },
        outcome: {
          success: false,
          tripCreated: false,
          tripId: null,
          userData: {},
          finalState: null,
          completionReason: null
        },
        context: {
          userAgent: null,
          platform: 'whatsapp',
          language: 'es',
          timezone: null,
          location: {}
        }
      };
    }
    
    // Agregar mensaje
    conversation.messages.push({
      ...messageData,
      timestamp: new Date().toISOString()
    });
    
    // Actualizar métricas
    conversation.analysis.metrics.totalMessages += 1;
    if (messageData.sender === 'user') {
      conversation.analysis.metrics.userMessages += 1;
    } else {
      conversation.analysis.metrics.botMessages += 1;
    }
    
    // Actualizar sentimiento si está disponible
    if (messageData.sentiment) {
      this.updateSentimentAnalysis(conversation, messageData.sentiment);
    }
    
    // Actualizar intenciones si están disponibles
    if (messageData.intent) {
      conversation.analysis.intents.push({
        intent: messageData.intent,
        confidence: messageData.confidence || 0.8,
        timestamp: new Date().toISOString()
      });
    }
    
    // Actualizar entidades si están disponibles
    if (messageData.entities) {
      messageData.entities.forEach(entity => {
        const existing = conversation.analysis.entities.find(e => 
          e.type === entity.type && e.value === entity.value
        );
        if (existing) {
          existing.count += 1;
        } else {
          conversation.analysis.entities.push({
            type: entity.type,
            value: entity.value,
            count: 1
          });
        }
      });
    }
    
    this.conversations.set(sessionId, conversation);
    await this.saveConversations();
    
    return conversation;
  }

  updateSentimentAnalysis(conversation, newSentiment) {
    const sentiments = conversation.messages
      .filter(m => m.sentiment && m.sentiment.score !== undefined)
      .map(m => m.sentiment.score);
    
    if (sentiments.length > 0) {
      const average = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
      conversation.analysis.overallSentiment.score = average;
      
      if (average > 0.3) {
        conversation.analysis.overallSentiment.label = 'positive';
      } else if (average < -0.3) {
        conversation.analysis.overallSentiment.label = 'negative';
      } else {
        conversation.analysis.overallSentiment.label = 'neutral';
      }
      
      // Determinar tendencia
      if (sentiments.length >= 2) {
        const recent = sentiments.slice(-3);
        const older = sentiments.slice(0, -3);
        
        if (recent.length > 0 && older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          
          if (recentAvg > olderAvg + 0.1) {
            conversation.analysis.overallSentiment.trend = 'improving';
          } else if (recentAvg < olderAvg - 0.1) {
            conversation.analysis.overallSentiment.trend = 'declining';
          } else {
            conversation.analysis.overallSentiment.trend = 'stable';
          }
        }
      }
    }
  }

  async completeConversation(sessionId, outcome) {
    if (!this.initialized) await this.initialize();
    
    const conversation = this.conversations.get(sessionId);
    if (conversation) {
      conversation.endTime = new Date().toISOString();
      conversation.status = 'completed';
      conversation.outcome = { ...conversation.outcome, ...outcome };
      
      // Calcular duración
      conversation.analysis.metrics.conversationDuration = 
        (new Date(conversation.endTime) - new Date(conversation.startTime)) / 1000;
      
      // Calcular tasa de completitud
      if (conversation.outcome.success) {
        conversation.analysis.metrics.completionRate = 100;
      } else {
        const steps = ['origin', 'destination', 'payment', 'confirmation'];
        const completedSteps = steps.filter(step => 
          conversation.outcome.userData && conversation.outcome.userData[step]
        ).length;
        conversation.analysis.metrics.completionRate = (completedSteps / steps.length) * 100;
      }
      
      await this.saveConversations();
    }
  }

  async getAnalytics(phoneNumber) {
    if (!this.initialized) await this.initialize();
    
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.phoneNumber === phoneNumber);
    
    const totalConversations = userConversations.length;
    const successfulConversations = userConversations.filter(conv => conv.outcome.success).length;
    const averageDuration = userConversations.length > 0 
      ? userConversations.reduce((sum, conv) => sum + (conv.analysis.metrics.conversationDuration || 0), 0) / userConversations.length
      : 0;
    const averageMessages = userConversations.length > 0
      ? userConversations.reduce((sum, conv) => sum + conv.analysis.metrics.totalMessages, 0) / userConversations.length
      : 0;
    const averageSentiment = userConversations.length > 0
      ? userConversations.reduce((sum, conv) => sum + (conv.analysis.overallSentiment.score || 0), 0) / userConversations.length
      : 0;
    
    return [{
      _id: null,
      totalConversations,
      successfulConversations,
      averageDuration,
      averageMessages,
      averageSentiment,
      commonIssues: userConversations.flatMap(conv => conv.analysis.issues)
    }];
  }

  async clearOldData(daysToKeep = 30) {
    if (!this.initialized) await this.initialize();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Limpiar conversaciones antiguas
    const oldConversations = Array.from(this.conversations.values())
      .filter(conv => new Date(conv.startTime) < cutoffDate);
    
    oldConversations.forEach(conv => {
      this.conversations.delete(conv.sessionId);
    });
    
    await this.saveConversations();
    logger.info(`Limpiadas ${oldConversations.length} conversaciones antiguas`);
  }

  getStats() {
    return {
      users: this.users.size,
      conversations: this.conversations.size,
      activeConversations: Array.from(this.conversations.values()).filter(c => c.status === 'active').length
    };
  }
}

module.exports = FileStorageService; 