const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

class SmartMemoryService {
  constructor() {
    // Memoria RAM para sesiones activas (super rápido)
    this.activeUsers = new Map();
    this.activeConversations = new Map();
    
    // Cache de preferencias frecuentes (se guarda ocasionalmente)
    this.userPreferences = new Map();
    
    // Archivo simple para preferencias importantes
    this.preferencesFile = path.join(__dirname, '../../../data/preferences.json');
    
    // Contador para limpiar memoria
    this.messageCount = 0;
    this.lastCleanup = Date.now();
    
    this.initialized = false;
  }

  async initialize() {
    try {
      // Crear directorio si no existe
      const dataDir = path.dirname(this.preferencesFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Cargar preferencias guardadas
      await this.loadPreferences();
      
      this.initialized = true;
      logger.info('✅ Servicio de memoria inteligente inicializado');
    } catch (error) {
      logger.error('Error inicializando memoria:', error);
    }
  }

  async loadPreferences() {
    try {
      const data = await fs.readFile(this.preferencesFile, 'utf8');
      const preferences = JSON.parse(data);
      this.userPreferences = new Map(Object.entries(preferences));
      logger.info(`✅ ${this.userPreferences.size} preferencias cargadas`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Error cargando preferencias:', error);
      }
    }
  }

  async savePreferences() {
    try {
      const preferences = Object.fromEntries(this.userPreferences);
      await fs.writeFile(this.preferencesFile, JSON.stringify(preferences, null, 2));
    } catch (error) {
      logger.error('Error guardando preferencias:', error);
    }
  }

  // Obtener usuario (RAM primero, crear si no existe)
  async getUser(phoneNumber) {
    if (!this.initialized) await this.initialize();
    
    // Buscar en RAM (super rápido)
    let user = this.activeUsers.get(phoneNumber);
    
    if (!user) {
      // Crear nuevo usuario en RAM
      user = {
        phoneNumber,
        sessionStart: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        currentConversation: {
          state: 'idle',
          userData: {},
          messages: []
        },
        // Cargar preferencias guardadas si existen
        preferences: this.userPreferences.get(phoneNumber) || {
          frequentOrigins: [],
          frequentDestinations: [],
          preferredPaymentMethods: [],
          frequentTimes: [],
          useCount: 0
        }
      };
      
      this.activeUsers.set(phoneNumber, user);
      logger.info(`Nuevo usuario en memoria: ${phoneNumber}`);
    } else {
      // Actualizar actividad
      user.lastActive = new Date().toISOString();
    }
    
    return user;
  }

  // Guardar mensaje (solo en RAM, super rápido)
  async saveMessage(phoneNumber, sessionId, messageData) {
    if (!this.initialized) await this.initialize();
    
    // Agregar a conversación activa en RAM
    let conversation = this.activeConversations.get(sessionId);
    
    if (!conversation) {
      conversation = {
        sessionId,
        phoneNumber,
        startTime: new Date().toISOString(),
        messages: [],
        analysis: {
          intents: [],
          entities: [],
          sentiment: { score: 0, label: 'neutral' }
        }
      };
      this.activeConversations.set(sessionId, conversation);
    }
    
    // Agregar mensaje
    conversation.messages.push({
      ...messageData,
      timestamp: new Date().toISOString()
    });
    
    // Actualizar análisis
    if (messageData.sentiment) {
      conversation.analysis.sentiment = messageData.sentiment;
    }
    if (messageData.intent) {
      conversation.analysis.intents.push(messageData.intent);
    }
    if (messageData.entities) {
      conversation.analysis.entities.push(...messageData.entities);
    }
    
    // Incrementar contador para limpieza
    this.messageCount++;
    
    // Limpiar memoria ocasionalmente
    if (this.messageCount > 100 || Date.now() - this.lastCleanup > 300000) { // 5 minutos
      this.cleanupMemory();
    }
    
    return conversation;
  }

  // Aprender de la interacción (guardar solo lo importante)
  async learnFromInteraction(phoneNumber, userData, outcome) {
    if (!this.initialized) await this.initialize();
    
    const user = this.activeUsers.get(phoneNumber);
    if (!user) return;
    
    // Actualizar preferencias en RAM
    if (userData.origin) {
      this.updateFrequentItem(user.preferences.frequentOrigins, userData.origin);
    }
    if (userData.destination) {
      this.updateFrequentItem(user.preferences.frequentDestinations, userData.destination);
    }
    if (userData.paymentMethod) {
      this.updateFrequentItem(user.preferences.preferredPaymentMethods, userData.paymentMethod);
    }
    if (userData.time) {
      this.updateFrequentItem(user.preferences.frequentTimes, userData.time);
    }
    
    // Incrementar contador de uso
    user.preferences.useCount = (user.preferences.useCount || 0) + 1;
    
    // Guardar preferencias solo si el usuario es frecuente (más de 3 usos)
    if (user.preferences.useCount >= 3) {
      this.userPreferences.set(phoneNumber, user.preferences);
      // Guardar en archivo ocasionalmente (no en cada interacción)
      if (user.preferences.useCount % 5 === 0) {
        await this.savePreferences();
      }
    }
  }

  // Generar sugerencias inteligentes (desde RAM)
  async generateSmartSuggestions(phoneNumber, currentContext) {
    if (!this.initialized) await this.initialize();
    
    const user = this.activeUsers.get(phoneNumber);
    if (!user || !user.preferences) return [];
    
    const suggestions = [];
    
    // Sugerencias basadas en preferencias frecuentes
    if (!currentContext.userData?.origin && user.preferences.frequentOrigins.length > 0) {
      suggestions.push({
        type: 'frequent_origin',
        message: `¿Salís desde ${user.preferences.frequentOrigins[0].item}?`,
        confidence: 0.8,
        data: user.preferences.frequentOrigins[0].item
      });
    }
    
    if (!currentContext.userData?.destination && user.preferences.frequentDestinations.length > 0) {
      suggestions.push({
        type: 'frequent_destination',
        message: `¿Vas a ${user.preferences.frequentDestinations[0].item}?`,
        confidence: 0.8,
        data: user.preferences.frequentDestinations[0].item
      });
    }
    
    if (!currentContext.userData?.paymentMethod && user.preferences.preferredPaymentMethods.length > 0) {
      suggestions.push({
        type: 'preferred_payment',
        message: `¿Pagás con ${user.preferences.preferredPaymentMethods[0].item}?`,
        confidence: 0.9,
        data: user.preferences.preferredPaymentMethods[0].item
      });
    }
    
    return suggestions;
  }

  // Anticipar necesidades (desde RAM)
  async anticipateNeeds(phoneNumber, currentContext) {
    if (!this.initialized) await this.initialize();
    
    const user = this.activeUsers.get(phoneNumber);
    if (!user || !user.preferences) return [];
    
    const anticipations = [];
    
    // Solo anticipar si el usuario es frecuente
    if (user.preferences.useCount > 3) {
      if (user.preferences.preferredPaymentMethods.length > 0) {
        anticipations.push({
          type: 'preferred_payment',
          method: user.preferences.preferredPaymentMethods[0].item,
          confidence: 0.9,
          message: `¿Pagás con ${user.preferences.preferredPaymentMethods[0].item} como siempre?`
        });
      }
    }
    
    return anticipations;
  }

  // Obtener contexto personalizado (desde RAM)
  async getPersonalizedContext(phoneNumber) {
    if (!this.initialized) await this.initialize();
    
    const user = this.activeUsers.get(phoneNumber);
    if (!user) return {};
    
    return {
      user: {
        useCount: user.preferences.useCount || 0,
        lastActive: user.lastActive
      },
      preferences: {
        frequentOrigins: user.preferences.frequentOrigins.slice(0, 3).map(p => p.item),
        frequentDestinations: user.preferences.frequentDestinations.slice(0, 3).map(p => p.item),
        preferredPaymentMethods: user.preferences.preferredPaymentMethods.slice(0, 2).map(p => p.item)
      },
      isReturningUser: (user.preferences.useCount || 0) > 0,
      isFrequentUser: (user.preferences.useCount || 0) > 3
    };
  }

  // Obtener estadísticas (desde RAM)
  async getLearningStats(phoneNumber) {
    if (!this.initialized) await this.initialize();
    
    const user = this.activeUsers.get(phoneNumber);
    if (!user) return {};
    
    return {
      userStats: {
        useCount: user.preferences.useCount || 0,
        lastActive: user.lastActive
      },
      preferences: {
        frequentOrigins: user.preferences.frequentOrigins.length,
        frequentDestinations: user.preferences.frequentDestinations.length,
        preferredPaymentMethods: user.preferences.preferredPaymentMethods.length
      },
      learningProgress: {
        preferencesLearned: user.preferences.useCount > 0,
        isFrequentUser: user.preferences.useCount > 3
      }
    };
  }

  // Métodos auxiliares
  updateFrequentItem(array, item) {
    const existing = array.find(p => p.item === item);
    if (existing) {
      existing.count += 1;
    } else {
      array.push({ item, count: 1 });
    }
    
    // Mantener solo los 5 más frecuentes
    array.sort((a, b) => b.count - a.count);
    if (array.length > 5) {
      array.splice(5);
    }
  }

  // Limpiar memoria para evitar fugas
  cleanupMemory() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutos
    
    // Limpiar usuarios inactivos
    for (const [phone, user] of this.activeUsers.entries()) {
      if (now - new Date(user.lastActive).getTime() > inactiveThreshold) {
        this.activeUsers.delete(phone);
      }
    }
    
    // Limpiar conversaciones antiguas
    for (const [sessionId, conversation] of this.activeConversations.entries()) {
      if (now - new Date(conversation.startTime).getTime() > inactiveThreshold) {
        this.activeConversations.delete(sessionId);
      }
    }
    
    this.messageCount = 0;
    this.lastCleanup = now;
    
    logger.info(`Memoria limpiada: ${this.activeUsers.size} usuarios activos, ${this.activeConversations.size} conversaciones`);
  }

  // Obtener estadísticas del sistema
  getStats() {
    return {
      activeUsers: this.activeUsers.size,
      activeConversations: this.activeConversations.size,
      savedPreferences: this.userPreferences.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = SmartMemoryService; 