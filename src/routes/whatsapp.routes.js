const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const SmartMemoryService = require('../services/nlp/SmartMemoryService');
const logger = require('../utils/logger');

const memoryService = new SmartMemoryService();

// Middleware para logging
router.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Webhook para mensajes entrantes de WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    await whatsappController.handleIncomingMessage(req, res);
  } catch (error) {
    logger.error('Error en webhook WhatsApp:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de prueba para ChatGPT
router.post('/test-ai', async (req, res) => {
  try {
    const { message, phoneNumber = '+543454053077' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    logger.info(`Probando IA con mensaje: ${message}`);
    
    // Procesar mensaje con IA avanzada
    const response = await whatsappController.processMessageWithAdvancedAI(message, phoneNumber, null, null, null);
    
    res.json({
      success: true,
      originalMessage: message,
      aiResponse: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error probando IA:', error);
    res.status(500).json({ 
      error: 'Error procesando con IA',
      details: error.message 
    });
  }
});

// Endpoint de salud
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'WhatsApp Bot',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Endpoint para obtener información del bot
router.get('/info', (req, res) => {
  res.json({
    name: 'NovoBot',
    description: 'Bot de atención por WhatsApp para gestión de taxis',
    features: [
      'Solicitar taxi inmediato',
      'Hacer reservas',
      'Cancelar viajes',
      'Proporcionar ayuda'
    ],
    vehicleTypes: [
      'Taxi Normal',
      'Taxi Rosa',
      'Taxi con Mascota'
    ],
    paymentMethods: [
      'Efectivo',
      'Transferencia bancaria',
      'Pasarela de pago'
    ]
  });
});

// Endpoint para obtener estadísticas de aprendizaje de un usuario
router.get('/learning-stats/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de teléfono requerido' });
    }

    const stats = await memoryService.getLearningStats(phoneNumber);
    
    res.json({
      success: true,
      phoneNumber,
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de aprendizaje:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas',
      details: error.message 
    });
  }
});

// Endpoint para obtener contexto personalizado de un usuario
router.get('/user-context/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de teléfono requerido' });
    }

    const context = await memoryService.getPersonalizedContext(phoneNumber);
    
    res.json({
      success: true,
      phoneNumber,
      context,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error obteniendo contexto personalizado:', error);
    res.status(500).json({ 
      error: 'Error obteniendo contexto',
      details: error.message 
    });
  }
});

// Endpoint para obtener sugerencias inteligentes
router.post('/suggestions', async (req, res) => {
  try {
    const { phoneNumber, currentContext } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de teléfono requerido' });
    }

    const suggestions = await memoryService.generateSmartSuggestions(phoneNumber, currentContext || {});
    const anticipations = await memoryService.anticipateNeeds(phoneNumber, currentContext || {});
    
    res.json({
      success: true,
      phoneNumber,
      suggestions,
      anticipations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error generando sugerencias:', error);
    res.status(500).json({ 
      error: 'Error generando sugerencias',
      details: error.message 
    });
  }
});

module.exports = router; 