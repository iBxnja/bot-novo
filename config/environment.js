require('dotenv').config();

// Debug: Verificar si las variables de entorno se cargan
console.log('🔧 [DEBUG config] Verificando variables de entorno:');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Configurada' : 'NO CONFIGURADA');
console.log('  - OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-3.5-turbo');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'No configurado');

module.exports = {
  // Configuración del servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.4
  },
  
  // Google Maps API
  googleMaps: {
    apiKey: "AIzaSyCravdbFCI8ZQbcpR_3_0Z0uRKERML-1ss"
  },
  
  // Base de datos
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/novoapp',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // Integración con sistema existente
  pont: {
    apiUrl: process.env.PONT_API_URL || 'http://localhost:8000/api',
    apiToken: process.env.PONT_API_TOKEN
  },
  
  // Configuración de pagos
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },
  
  // Configuración de logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  },
  
  // Configuración de seguridad
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key'
  }
}; 