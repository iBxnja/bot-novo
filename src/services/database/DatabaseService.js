const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const config = require('../../../config/environment');

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info('Base de datos ya conectada');
        return;
      }

      const mongoUrl = config.database.url;
      logger.info(`Conectando a MongoDB: ${mongoUrl}`);

      await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      logger.info('✅ Base de datos MongoDB conectada exitosamente');

      // Configurar eventos de conexión
      mongoose.connection.on('error', (error) => {
        logger.error('Error de conexión MongoDB:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB desconectado');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconectado');
        this.isConnected = true;
      });

      // Manejar cierre graceful
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

    } catch (error) {
      logger.error('Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('Base de datos desconectada');
      }
    } catch (error) {
      logger.error('Error desconectando de MongoDB:', error);
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Base de datos no conectada' };
      }

      // Verificar conexión
      const adminDb = mongoose.connection.db.admin();
      await adminDb.ping();

      return { status: 'healthy', message: 'Base de datos funcionando correctamente' };
    } catch (error) {
      logger.error('Error en health check de base de datos:', error);
      return { status: 'error', message: error.message };
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async createIndexes() {
    try {
      logger.info('Creando índices de base de datos...');

      // Importar modelos
      const User = require('../../models/user/User');
      const Conversation = require('../../models/conversation/Conversation');

      // Crear índices para User
      await User.collection.createIndex({ phoneNumber: 1 }, { unique: true });
      await User.collection.createIndex({ 'preferences.frequentOrigins.address': 1 });
      await User.collection.createIndex({ 'preferences.frequentDestinations.address': 1 });
      await User.collection.createIndex({ lastActive: -1 });

      // Crear índices para Conversation
      await Conversation.collection.createIndex({ phoneNumber: 1 });
      await Conversation.collection.createIndex({ sessionId: 1 });
      await Conversation.collection.createIndex({ startTime: -1 });
      await Conversation.collection.createIndex({ status: 1 });

      logger.info('✅ Índices creados exitosamente');
    } catch (error) {
      logger.error('Error creando índices:', error);
      throw error;
    }
  }

  async clearTestData() {
    try {
      if (config.nodeEnv === 'production') {
        logger.warn('No se puede limpiar datos en producción');
        return;
      }

      logger.info('Limpiando datos de prueba...');

      const User = require('../../models/user/User');
      const Conversation = require('../../models/conversation/Conversation');

      await User.deleteMany({});
      await Conversation.deleteMany({});

      logger.info('✅ Datos de prueba limpiados');
    } catch (error) {
      logger.error('Error limpiando datos de prueba:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService; 