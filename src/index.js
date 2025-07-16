const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const whatsappRoutes = require('./routes/whatsapp.routes');

// Rutas básicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'NovoBot - Bot WhatsApp Taxi con IA',
    version: '1.0.0',
    status: 'active',
    features: [
      '🤖 Procesamiento de lenguaje natural con ChatGPT',
      '🚗 Solicitud de taxis conversacional',
      '📅 Reservas programadas',
      '💳 Múltiples métodos de pago',
      '🎯 Integración con sistema PONT'
    ],
    endpoints: {
      whatsapp: '/api/whatsapp/webhook',
      test_ai: '/api/whatsapp/test-ai',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'novo-whatsapp-bot',
    ai_enabled: !!process.env.OPENAI_API_KEY
  });
});

// Rutas de WhatsApp
app.use('/api/whatsapp', whatsappRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🤖 NovoBot iniciado en puerto ${PORT}`);
  logger.info(`🌐 Accede a http://localhost:${PORT}`);
  logger.info(`📱 Webhook WhatsApp: http://localhost:${PORT}/api/whatsapp/webhook`);
  logger.info(`🧠 IA habilitada: ${!!process.env.OPENAI_API_KEY ? 'Sí' : 'No'}`);
  logger.info(`💾 Memoria inteligente: Activada`);
});

module.exports = app;
