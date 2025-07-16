const axios = require('axios');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

// Importar nuevos servicios avanzados
const AdvancedNLUService = require('./src/services/nlp/AdvancedNLUService');
const ValidationService = require('./src/services/validation/ValidationService');
const ConversationFlowService = require('./src/services/conversation/ConversationFlowService');

// ===== CONFIGURACIÓN AVANZADA =====
const BASE_URL = 'http://localhost:3000/api/whatsapp';
const USER_PHONE = '+1234567890';
const PREFERENCES_FILE = './data/preferences.json';

// Cargar variables de entorno si están disponibles
require('dotenv').config();

// Configuración de OpenAI
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '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',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Modelo más inteligente
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.4,
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 300
};

// Log de configuración para debug
console.log('🔧 Configuración OpenAI:');
console.log('  - API Key configurada:', !!OPENAI_CONFIG.apiKey);
console.log('  - Modelo:', OPENAI_CONFIG.model);
console.log('  - Temperatura:', OPENAI_CONFIG.temperature);
console.log('  - Max Tokens:', OPENAI_CONFIG.maxTokens);

// Configuración de IA avanzada
const AI_CONFIG = {
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  maxTokens: 200,
  systemPrompt: `Sos un operador de taxi que atiende por WhatsApp. Tu trabajo es tomar pedidos de taxi de forma directa, rápida y sin vueltas, como lo haría una persona real en Argentina.

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

REGLAS CRÍTICAS PARA NO REPETIR INFORMACIÓN:
- Si el usuario ya te dijo el método de pago (efectivo, transferencia, tarjeta), NO vuelvas a preguntar por métodos de pago ni los menciones.
- Si el usuario ya te dio origen y destino, NO vuelvas a preguntar por direcciones.
- Si el usuario ya te dijo que es reserva, NO vuelvas a preguntar si es inmediato o reserva.
- Si el usuario ya te dijo que es inmediato, NO vuelvas a preguntar si es inmediato o reserva.
- Si el usuario ya te dio la hora, NO vuelvas a preguntar por la hora.
- SIEMPRE recordá toda la información que el usuario ya te dio en la conversación actual.
- Si el usuario te da información nueva, confirmá y continuá con el siguiente paso SIN repetir información anterior.

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
- SIEMPRE recordá toda la información que el usuario ya te dio y NO la repitas.`
};

// ===== SISTEMA DE MEMORIA INTELIGENTE =====
class SmartMemory {
  constructor() {
    this.activeUsers = new Map();
    this.userPreferences = new Map();
    this.messageCount = 0;
    this.lastCleanup = Date.now();
  }

  async initialize() {
    try {
      await fs.mkdir('./data', { recursive: true });
      await this.loadPreferences();
      console.log('✅ Memoria inteligente inicializada');
    } catch (error) {
      console.log('⚠️ Memoria inicializada sin persistencia');
    }
  }

  async loadPreferences() {
    try {
      const data = await fs.readFile(PREFERENCES_FILE, 'utf8');
      const preferences = JSON.parse(data);
      this.userPreferences = new Map(Object.entries(preferences));
    } catch (error) {
      // Archivo no existe, empezar vacío
    }
  }

  async savePreferences() {
    try {
      const preferences = Object.fromEntries(this.userPreferences);
      await fs.writeFile(PREFERENCES_FILE, JSON.stringify(preferences, null, 2));
    } catch (error) {
      // Ignorar errores de guardado
    }
  }

  getUser(phoneNumber) {
    let user = this.activeUsers.get(phoneNumber);
    
    if (!user) {
      user = {
        phoneNumber,
        sessionStart: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        currentConversation: {
          state: 'idle',
          userData: {},
          messages: []
        },
        preferences: this.userPreferences.get(phoneNumber) || {
          frequentOrigins: [],
          frequentDestinations: [],
          preferredPaymentMethods: [],
          frequentTimes: [],
          useCount: 0
        }
      };
      
      this.activeUsers.set(phoneNumber, user);
    } else {
      user.lastActive = new Date().toISOString();
    }
    
    return user;
  }

  learnFromInteraction(phoneNumber, userData) {
    const user = this.activeUsers.get(phoneNumber);
    if (!user) return;

    // Actualizar preferencias
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

    user.preferences.useCount = (user.preferences.useCount || 0) + 1;

    // Guardar si es usuario frecuente
    if (user.preferences.useCount >= 3) {
      this.userPreferences.set(phoneNumber, user.preferences);
      if (user.preferences.useCount % 5 === 0) {
        this.savePreferences();
      }
    }
  }

  updateFrequentItem(array, item) {
    const existing = array.find(p => p.item === item);
    if (existing) {
      existing.count += 1;
    } else {
      array.push({ item, count: 1 });
    }
    
    array.sort((a, b) => b.count - a.count);
    if (array.length > 5) {
      array.splice(5);
    }
  }

  getSuggestions(phoneNumber, currentContext) {
    const user = this.activeUsers.get(phoneNumber);
    if (!user || !user.preferences) return [];

    const suggestions = [];
    
    if (!currentContext.userData?.origin && user.preferences.frequentOrigins.length > 0) {
      suggestions.push({
        type: 'frequent_origin',
        message: `¿Salís desde ${user.preferences.frequentOrigins[0].item}?`,
        data: user.preferences.frequentOrigins[0].item
      });
    }
    
    if (!currentContext.userData?.destination && user.preferences.frequentDestinations.length > 0) {
      suggestions.push({
        type: 'frequent_destination',
        message: `¿Vas a ${user.preferences.frequentDestinations[0].item}?`,
        data: user.preferences.frequentDestinations[0].item
      });
    }
    
    if (!currentContext.userData?.paymentMethod && user.preferences.preferredPaymentMethods.length > 0) {
      suggestions.push({
        type: 'preferred_payment',
        message: `¿Pagás con ${user.preferences.preferredPaymentMethods[0].item}?`,
        data: user.preferences.preferredPaymentMethods[0].item
      });
    }
    
    return suggestions;
  }

  getPersonalizedContext(phoneNumber) {
    const user = this.activeUsers.get(phoneNumber);
    if (!user) return {};

    return {
      isReturningUser: (user.preferences.useCount || 0) > 0,
      isFrequentUser: (user.preferences.useCount || 0) > 3,
      useCount: user.preferences.useCount || 0,
      preferences: {
        frequentOrigins: user.preferences.frequentOrigins.slice(0, 3).map(p => p.item),
        frequentDestinations: user.preferences.frequentDestinations.slice(0, 3).map(p => p.item),
        preferredPaymentMethods: user.preferences.preferredPaymentMethods.slice(0, 2).map(p => p.item)
      }
    };
  }
}

// ===== INTEGRACIÓN CON OPENAI =====
class OpenAIHandler {
  constructor() {
    this.apiKey = OPENAI_CONFIG.apiKey;
    this.model = OPENAI_CONFIG.model;
    this.temperature = OPENAI_CONFIG.temperature;
    this.maxTokens = OPENAI_CONFIG.maxTokens;
  }

  async callOpenAI(messages) {
    try {
      console.log('🤖 Llamando a OpenAI GPT...');
      console.log('📋 Configuración:');
      console.log('  - Modelo:', this.model);
      console.log('  - Temperatura:', this.temperature);
      console.log('  - Max Tokens:', this.maxTokens);
      console.log('  - API Key (primeros 10 chars):', this.apiKey.substring(0, 10) + '...');
      console.log('  - Cantidad de mensajes:', messages.length);
      
      const requestBody = {
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };
      
      console.log('📤 Enviando request a OpenAI...');
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      });

      console.log('✅ Respuesta de OpenAI recibida');
      console.log('📊 Status:', response.status);
      console.log('📝 Contenido de la respuesta:', response.data.choices[0].message.content);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.log('⚠️ Error con OpenAI:', error.message);
      console.log('🔍 Tipo de error:', error.code || 'N/A');
      
      if (error.response) {
        console.log('📊 Status:', error.response.status);
        console.log('📋 Error details:', JSON.stringify(error.response.data, null, 2));
        
        // Errores específicos de OpenAI
        if (error.response.status === 401) {
          console.log('❌ Error 401: API Key inválida o expirada');
        } else if (error.response.status === 429) {
          console.log('❌ Error 429: Rate limit excedido');
        } else if (error.response.status === 500) {
          console.log('❌ Error 500: Error interno de OpenAI');
        }
      } else if (error.request) {
        console.log('❌ Error de red: No se pudo conectar con OpenAI');
        console.log('🔍 Detalles:', error.request);
      } else {
        console.log('❌ Error desconocido:', error.message);
      }
      
      console.log('🔄 Usando respuesta simulada como fallback');
      return this.getSimulatedResponse(messages);
    }
  }

  getSimulatedResponse(messages) {
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    console.log('[DEBUG getSimulatedResponse] Mensaje recibido:', lastMessage); // LOG TEMPORAL
    // Forzar saludo SIEMPRE si es un saludo
    if (lastMessage.includes('hola') || lastMessage.includes('buenas') || lastMessage.includes('buenass')) {
      console.log('[DEBUG getSimulatedResponse] Detectado saludo, respondiendo solo con Buenass'); // LOG TEMPORAL
      return 'Buenass';
    }
    
    // Extraer contexto del mensaje del sistema
    const systemMessage = messages[0].content;
    let contextInfo = '';
    
    if (systemMessage.includes('primera vez')) {
      contextInfo = 'INITIAL';
    } else if (systemMessage.includes('origen')) {
      contextInfo = 'NEEDS_DESTINATION';
    } else if (systemMessage.includes('destino')) {
      contextInfo = 'NEEDS_PAYMENT';
    } else if (systemMessage.includes('todo listo')) {
      contextInfo = 'READY_TO_CONFIRM';
    }
    
    // Lógica inteligente basada en contexto
    if (lastMessage.includes('salo desde') || lastMessage.includes('salgo desde')) {
      const address = lastMessage.replace(/.*(?:salo|salgo)\s+(?:desde|de)\s+/, '').replace(/\s.*$/, '');
      return `Ok, ${address}. ¿A dónde vas?`;
    }
    
    if (lastMessage.includes('voy a') || lastMessage.includes('hasta')) {
      const address = lastMessage.replace(/.*(?:voy a|hasta)\s+/, '').replace(/\s.*$/, '');
      return `${address}. ¿Cómo pagás? Transferencia, efectivo o tarjeta.`;
    }
    
    if (lastMessage.includes('transferencia') || lastMessage.includes('efectivo') || lastMessage.includes('tarjeta')) {
      const method = lastMessage.includes('transferencia') ? 'transferencia' : 
                    lastMessage.includes('efectivo') ? 'efectivo' : 'tarjeta';
      return `${method}. ¿Ahora o para más tarde?`;
    }
    
    if (lastMessage.includes('precio') || lastMessage.includes('cuesta') || lastMessage.includes('tarifa')) {
      return 'Corto $500-800, medio $800-1200, largo $1200-2000. ¿Desde dónde salís?';
    }
    
    if (lastMessage.includes('sí') || lastMessage.includes('confirmo') || lastMessage.includes('ok')) {
      return 'Listo. Te avisamos cuando llegue.';
    }
    
    if (lastMessage.includes('mascota') || lastMessage.includes('perro') || lastMessage.includes('gato')) {
      return 'Sí, aceptamos mascotas. ¿Desde dónde salís?';
    }
    
    if (lastMessage.includes('tiempo') || lastMessage.includes('tarda') || lastMessage.includes('espera')) {
      return '5-15 minutos. ¿Qué necesitás?';
    }
    
    // Respuesta por defecto basada en contexto
    if (contextInfo === 'NEEDS_DESTINATION') {
      return '¿A dónde vas?';
    } else if (contextInfo === 'NEEDS_PAYMENT') {
      return '¿Cómo pagás? Transferencia, efectivo o tarjeta.';
    } else if (contextInfo === 'READY_TO_CONFIRM') {
      return '¿Confirmás?';
    }
    
    return '¿Desde dónde salís?';
  }
}

// ===== IA AVANZADA =====
class AdvancedAI {
  constructor() {
    this.conversationHistory = [];
    this.userContext = {};
    this.openai = new OpenAIHandler();
  }

  async processWithAI(message, user, context, entities) {
    console.log('🔍 [DEBUG AdvancedAI] Iniciando processWithAI');
    console.log('🔍 [DEBUG AdvancedAI] Mensaje:', message);
    console.log('🔍 [DEBUG AdvancedAI] User:', !!user);
    console.log('🔍 [DEBUG AdvancedAI] Context:', !!context);
    console.log('🔍 [DEBUG AdvancedAI] Entities:', entities);
    
    try {
      // Construir el contexto completo para la IA
      console.log('🔍 [DEBUG AdvancedAI] Construyendo contexto...');
      const aiContext = this.buildAIContext(message, user, context, entities);
      console.log('🔍 [DEBUG AdvancedAI] Contexto construido:', !!aiContext);
      
      // Usar OpenAI real si está disponible
      console.log('🔍 [DEBUG AdvancedAI] Llamando a generateAIResponseWithOpenAI...');
      const response = await this.generateAIResponseWithOpenAI(aiContext);
      console.log('🔍 [DEBUG AdvancedAI] Respuesta recibida:', response);
      
      return response;
    } catch (error) {
      console.log('🔍 [DEBUG AdvancedAI] Error en processWithAI:', error.message);
      console.log('🔍 [DEBUG AdvancedAI] Stack trace:', error.stack);
      console.log('⚠️ Error en IA, usando fallback');
      return this.getFallbackResponse(user);
    }
  }

  async generateAIResponseWithOpenAI(aiContext) {
    const { message, userData, context, entities, conversationState } = aiContext;
    
    // Analizar sentimiento del mensaje
    const sentiment = this.analyzeSentiment(message);
    
    // Construir contexto más inteligente para GPT
    let contextInfo = '';
    
    // Información completa del viaje
    if (userData.origin) {
      contextInfo += `Origen: ${userData.origin}. `;
    }
    if (userData.destination) {
      contextInfo += `Destino: ${userData.destination}. `;
    }
    if (userData.paymentMethod) {
      contextInfo += `Método de pago: ${userData.paymentMethod}. `;
    }
    if (userData.time) {
      contextInfo += `Hora: ${userData.time}. `;
    }
    if (userData.serviceType) {
      contextInfo += `Tipo de servicio: ${userData.serviceType}. `;
    }
    if (userData.intermediateStops && userData.intermediateStops.length > 0) {
      contextInfo += `Paradas intermedias: ${userData.intermediateStops.join(', ')}. `;
    }
    
    // Información importante sobre el contexto
    if (userData.serviceType === 'reserva') {
      contextInfo += `IMPORTANTE: El usuario ya confirmó que es una RESERVA. NO preguntes nuevamente si es inmediato o reserva. `;
    } else if (userData.serviceType === 'inmediato') {
      contextInfo += `IMPORTANTE: El usuario ya confirmó que es INMEDIATO. NO preguntes nuevamente si es inmediato o reserva. `;
    }
    
    // Estado de la conversación
    if (conversationState === 'INITIAL') {
      contextInfo += 'Es la primera vez que habla con el usuario.';
    } else if (conversationState === 'NEEDS_DESTINATION') {
      contextInfo += 'Necesita el destino.';
    } else if (conversationState === 'NEEDS_PAYMENT') {
      contextInfo += 'Necesita el método de pago.';
    } else if (conversationState === 'NEEDS_SERVICE_TYPE') {
      contextInfo += 'Necesita saber si es inmediato o reserva.';
    } else if (conversationState === 'NEEDS_TIME') {
      contextInfo += 'Es una reserva, necesita la hora.';
    } else if (conversationState === 'READY_TO_CONFIRM') {
      contextInfo += 'Listo para confirmar el viaje.';
    }
    
    if (context.isFrequentUser) {
      contextInfo += ' Es un usuario frecuente.';
    }
    
    if (entities.length > 0) {
      contextInfo += ` Entidades detectadas: ${entities.map(e => `${e.type}: ${e.value}`).join(', ')}`;
    }
    
    // Agregar información de sentimiento
    if (sentiment.label === 'negative') {
      contextInfo += ' El usuario parece estar frustrado o molesto.';
    } else if (sentiment.label === 'positive') {
      contextInfo += ' El usuario parece estar contento.';
    }
    
    // Construir mensajes para OpenAI
    const messages = [
      {
        role: 'system',
        content: AI_CONFIG.systemPrompt
      }
    ];
    
    // Agregar historial de la conversación si existe
    if (aiContext.user && aiContext.user.currentConversation.messages && aiContext.user.currentConversation.messages.length > 0) {
      // Tomar los últimos 5 mensajes para no sobrecargar el contexto
      const recentMessages = aiContext.user.currentConversation.messages.slice(-5);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
          // Agregar el mensaje actual con contexto
      messages.push({
        role: 'user',
        content: `Contexto actual del viaje: ${contextInfo}\n\nMensaje del usuario: "${message}"\n\nINFORMACIÓN CRÍTICA - NO REPETIR:
- Si el usuario ya te dio origen y destino, NO preguntes por direcciones nuevamente.
- Si el usuario ya te dijo el método de pago (efectivo, transferencia, tarjeta), NO preguntes por métodos de pago ni los menciones.
- Si el usuario ya te dijo que es reserva, NO preguntes si es inmediato o reserva.
- Si el usuario ya te dijo que es inmediato, NO preguntes si es inmediato o reserva.
- Si el usuario ya te dio la hora, NO preguntes por la hora nuevamente.
- Si el usuario solo saluda (hola, buenas, etc.), responde ÚNICAMENTE con un saludo casual sin preguntar nada más.
- Recordá toda la información que ya te dio el usuario en esta conversación.
- Responde de forma natural y conversacional, continuando con el siguiente paso lógico.
- IMPORTANTE: Si el usuario dice "pago con efectivo", "pago en efectivo", "efectivo", etc., ya NO preguntes por métodos de pago.`
      });
    
    // Llamar a OpenAI
    const response = await this.openai.callOpenAI(messages);
    
    // Guardar mensajes en el historial
    try {
      // Guardar el mensaje del usuario
      aiContext.user.currentConversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      
      // Guardar la respuesta del bot
      aiContext.user.currentConversation.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      
      // Mantener solo los últimos 10 mensajes para no sobrecargar la memoria
      if (aiContext.user.currentConversation.messages.length > 10) {
        aiContext.user.currentConversation.messages = aiContext.user.currentConversation.messages.slice(-10);
      }
    } catch (error) {
      console.log('⚠️ Error guardando historial:', error.message);
    }
    
    // Actualizar datos del usuario basado en entidades detectadas
    try {
      this.updateUserDataFromEntitiesInAI(userData, entities);
    } catch (error) {
      console.log('⚠️ Error actualizando datos del usuario:', error.message);
    }
    
    return response;
  }

  analyzeSentiment(message) {
    const positiveWords = ['gracias', 'perfecto', 'excelente', 'genial', 'bueno', 'ok', 'dale', 'sí'];
    const negativeWords = ['no', 'mal', 'pésimo', 'terrible', 'problema', 'error', 'molesta', 'lento'];
    
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
      label: label
    };
  }

  updateUserDataFromEntitiesInAI(userData, entities) {
    try {
      // Procesar direcciones con roles específicos
      const originEntity = entities.find(e => e.type === 'address' && e.role === 'origin');
      const destinationEntity = entities.find(e => e.type === 'address' && e.role === 'destination');
      const addressEntity = entities.find(e => e.type === 'address' && !e.role);
      const paymentEntity = entities.find(e => e.type === 'payment');
      const timeEntity = entities.find(e => e.type === 'time');
      const serviceTypeEntity = entities.find(e => e.type === 'service_type');
      
      // Asignar origen y destino con roles específicos
      if (originEntity) {
        userData.origin = originEntity.value;
        console.log(`📍 Origen detectado: ${originEntity.value}`);
      }
      
      if (destinationEntity) {
        userData.destination = destinationEntity.value;
        console.log(`🎯 Destino detectado: ${destinationEntity.value}`);
      }
      
      // Si no hay roles específicos, usar lógica anterior
      if (addressEntity && !originEntity && !destinationEntity) {
        if (!userData.origin) {
          userData.origin = addressEntity.value;
          console.log(`📍 Origen detectado: ${addressEntity.value}`);
        } else if (!userData.destination) {
          userData.destination = addressEntity.value;
          console.log(`🎯 Destino detectado: ${addressEntity.value}`);
        }
      }
      
      if (paymentEntity) {
        userData.paymentMethod = paymentEntity.value;
        console.log(`💳 Método de pago detectado: ${paymentEntity.value}`);
      }
      
      if (timeEntity) {
        userData.time = timeEntity.value;
        console.log(`⏰ Horario detectado: ${timeEntity.value}`);
      }
      
      if (serviceTypeEntity) {
        userData.serviceType = serviceTypeEntity.value;
        console.log(`🚕 Tipo de servicio detectado: ${serviceTypeEntity.value}`);
      }
    } catch (error) {
      console.log('⚠️ Error en updateUserDataFromEntitiesInAI:', error.message);
    }
  }

  buildAIContext(message, user, context, entities) {
    const userData = user.currentConversation.userData;
    const conversationState = this.getConversationState(userData);
    
    return {
      message: message,
      user: user, // Agregar el objeto user completo
      userData: userData,
      context: context,
      entities: entities,
      conversationState: conversationState,
      userHistory: this.getUserHistory(user),
      systemInfo: {
        isReturningUser: context.isReturningUser,
        isFrequentUser: context.isFrequentUser,
        useCount: context.useCount,
        preferences: context.preferences
      }
    };
  }

  getConversationState(userData) {
    if (!userData.origin && !userData.destination && !userData.paymentMethod) {
      return 'INITIAL';
    } else if (userData.origin && !userData.destination) {
      return 'NEEDS_DESTINATION';
    } else if (userData.origin && userData.destination && !userData.paymentMethod) {
      return 'NEEDS_PAYMENT';
    } else if (userData.origin && userData.destination && userData.paymentMethod && !userData.serviceType) {
      return 'NEEDS_SERVICE_TYPE';
    } else if (userData.origin && userData.destination && userData.paymentMethod && userData.serviceType === 'reserva' && !userData.time) {
      return 'NEEDS_TIME';
    } else if (userData.origin && userData.destination && userData.paymentMethod && userData.serviceType) {
      return 'READY_TO_CONFIRM';
    } else {
      return 'PARTIAL_INFO';
    }
  }

  getUserHistory(user) {
    return {
      sessionStart: user.sessionStart,
      lastActive: user.lastActive,
      messageCount: user.currentConversation.messages.length,
      preferences: user.preferences
    };
  }

  async generateAIResponse(aiContext) {
    // Usar OpenAI para todas las respuestas
    return await this.generateAIResponseWithOpenAI(aiContext);
  }

  isConfirmationMessage(message) {
    const confirmWords = ['sí', 'confirmo', 'confirmar', 'ok', 'okay', 'dale', 'perfecto', 'excelente', 'genial', 'listo', 'ya está', 'correcto'];
    return confirmWords.some(word => message.includes(word));
  }

  isQuestionMessage(message) {
    const questionWords = ['qué', 'cómo', 'cuándo', 'dónde', 'cuánto', 'precio', 'tarifa', 'tiempo', 'aceptan', 'puedo', 'mascota', 'equipaje'];
    return questionWords.some(word => message.includes(word)) || message.includes('?') || message.includes('¿');
  }

  handleInitialState(message, context, addressEntity) {
    let response = '';
    
    // Saludo simple y natural
    if (context.isFrequentUser) {
      response += `Hola! `;
    } else if (context.isReturningUser) {
      response += `Hola! `;
    } else {
      response += `Hola! `;
    }
    
    // Si detectó dirección, procesarla
    if (addressEntity) {
      response += `Perfecto, salís desde ${addressEntity.value}. ¿A dónde vas?`;
    } else {
      response += `¿Desde dónde salís?`;
    }
    
    return response;
  }

  handleNeedsDestination(message, userData, context, addressEntity) {
    if (addressEntity) {
      return `Genial, vas a ${addressEntity.value}. ¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta`;
    } else {
      // Sugerir destinos frecuentes si es usuario frecuente
      if (context.isFrequentUser && context.preferences.frequentDestinations.length > 0) {
        const frequentDest = context.preferences.frequentDestinations[0];
        return `¿Vas a ${frequentDest} como siempre?`;
      }
      return `¿A dónde vas?`;
    }
  }

  handleNeedsPayment(message, userData, context) {
    const lowerMessage = message.toLowerCase();
    
    // Detectar método de pago
    if (lowerMessage.includes('transferencia')) {
      return `Perfecto, pagás con transferencia. ¿Lo querés ahora o es para más tarde?`;
    } else if (lowerMessage.includes('efectivo')) {
      return `Perfecto, pagás con efectivo. ¿Lo querés ahora o es para más tarde?`;
    } else if (lowerMessage.includes('tarjeta')) {
      return `Perfecto, pagás con tarjeta. ¿Lo querés ahora o es para más tarde?`;
    }
    
    // Sugerir método preferido si es usuario frecuente
    if (context.isFrequentUser && context.preferences.preferredPaymentMethods.length > 0) {
      const preferred = context.preferences.preferredPaymentMethods[0];
      return `¿Pagás con ${preferred} como siempre?`;
    }
    
    return `¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta.`;
  }

  handleReadyToConfirm(userData, context) {
    const summary = `Resumen del viaje:\nOrigen: ${userData.origin}\nDestino: ${userData.destination}\nPago: ${userData.paymentMethod}${userData.time ? `\nHora: ${userData.time}` : ''}\n\n¿Confirmás el viaje?`;
    return summary;
  }

  handlePartialInfo(message, userData, context, addressEntity) {
    if (addressEntity) {
      if (!userData.origin) {
        return `Perfecto, salís desde ${addressEntity.value}. ¿A dónde vas?`;
      } else if (!userData.destination) {
        return `Genial, vas a ${addressEntity.value}. ¿Cómo querés pagarlo?`;
      }
    }
    
    return `Necesito más información. ¿Desde dónde salís?`;
  }

  handleConfirmation(userData, context) {
    const summary = `Perfecto! Tu taxi está confirmado:\n\nResumen del viaje:\nOrigen: ${userData.origin}\nDestino: ${userData.destination}\nPago: ${userData.paymentMethod}${userData.time ? `\nHora: ${userData.time}` : ''}\n\nTu taxi está en camino. Te avisamos cuando el conductor llegue.\n\nQue tengas buen viaje!`;
    
    // Limpiar datos para nueva conversación
    return summary;
  }

  handleQuestion(message, userData, context) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('tarifa')) {
      return `Los precios varían según la distancia:\n\nTarifas aproximadas:\nViajes cortos (hasta 2km): $500-800\nViajes medios (2-5km): $800-1200\nViajes largos (5km+): $1200-2000\n\n¿Desde dónde salís para darte un precio más preciso?`;
    }
    
    if (lowerMessage.includes('tiempo') || lowerMessage.includes('tarda') || lowerMessage.includes('espera')) {
      return `Los tiempos de espera son:\n\nTiempos aproximados:\nTaxi inmediato: 5-15 minutos\nReservas: Según el horario que elijas\nHoras pico: 10-20 minutos\n\n¿Qué tipo de servicio necesitás?`;
    }
    
    if (lowerMessage.includes('mascota') || lowerMessage.includes('perro') || lowerMessage.includes('gato')) {
      return `Sí! Tenemos taxis que aceptan mascotas. Solo decime que vas con tu mascota y te asignamos un conductor que lo permita.\n\nServicios para mascotas:\nTransporte seguro\nConductores preparados\nSin cargo adicional\n\n¿Desde dónde salís?`;
    }
    
    if (lowerMessage.includes('equipaje') || lowerMessage.includes('maleta') || lowerMessage.includes('valija')) {
      return `Por supuesto! Todos nuestros taxis tienen espacio para equipaje.\n\nServicios de equipaje:\nMaletas grandes y pequeñas\nBolsos de mano\nSin cargo adicional\nConductores que ayudan con el equipaje\n\n¿Desde dónde salís?`;
    }
    
    if (lowerMessage.includes('zona') || lowerMessage.includes('cobertura') || lowerMessage.includes('lugar')) {
      return `Tenemos cobertura en toda la ciudad y alrededores:\n\nZonas de servicio:\nCentro de la ciudad\nBarrios residenciales\nAeropuerto\nTerminal de ómnibus\nZonas rurales cercanas\n\n¿Desde qué zona salís?`;
    }
    
    return `Te puedo ayudar con:\n\nInformación disponible:\nPrecios y tarifas\nTiempos de espera\nServicios especiales (mascotas, equipaje)\nMétodos de pago\nZonas de cobertura\n\n¿Qué te interesa saber específicamente?`;
  }

  getFallbackResponse(user) {
    if (!user.currentConversation.userData.origin) {
      return `¿Desde dónde salís?`;
    } else if (!user.currentConversation.userData.destination) {
      return `¿A dónde vas?`;
    } else if (!user.currentConversation.userData.paymentMethod) {
      return `¿Cómo pagás? Transferencia, efectivo o tarjeta.`;
    } else {
      return `¿Confirmás?`;
    }
  }
}

// ===== DETECCIÓN DE INTENCIONES =====
class IntentDetection {
  constructor() {
    this.intentPatterns = {
      request_taxi: [
        'necesito un taxi', 'quiero un taxi', 'pedir taxi', 'llamar taxi',
        'busco taxi', 'taxi por favor', 'taxi urgente', 'taxi ya',
        'me llevas', 'me traes', 'me acercas', 'me llevo'
      ],
      provide_address: [
        'desde', 'hasta', 'origen', 'destino', 'salgo de', 'voy a',
        'estoy en', 'mi casa', 'mi ubicación'
      ],
      specify_payment: [
        'pago con', 'pagás con', 'transferencia', 'efectivo', 'tarjeta',
        'débito', 'crédito', 'mercado pago'
      ],
      specify_time: [
        'a las', 'para las', 'hora', 'ahora', 'ya', 'inmediato',
        'urgente', 'para más tarde', 'mañana', 'hoy'
      ],
      specify_service_type: [
        'reserva', 'reservar', 'reservado', 'para más tarde', 'para mañana',
        'inmediato', 'ya', 'ahora', 'urgente', 'lo antes posible'
      ],
      ask_question: [
        '¿', '?', 'qué', 'cómo', 'cuándo', 'dónde', 'cuánto cuesta',
        'precio', 'tarifa', 'tiempo de espera', 'aceptan', 'puedo llevar'
      ],
      confirm_action: [
        'sí', 'confirmo', 'confirmar', 'ok', 'okay', 'dale',
        'perfecto', 'excelente', 'genial', 'listo', 'ya está'
      ],
      cancel_action: [
        'no', 'cancelar', 'cancelo', 'no gracias', 'me arrepentí',
        'cambié de opinión', 'no quiero', 'para', 'stop'
      ],
      request_help: [
        'ayuda', 'help', 'soporte', 'no entiendo', 'explicame',
        'cómo funciona', 'qué puedo hacer', 'opciones'
      ]
    };
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    const detectedIntents = [];

    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          detectedIntents.push({
            intent: intentType,
            confidence: 0.8,
            pattern: pattern
          });
          break;
        }
      }
    }

    return {
      intents: detectedIntents,
      primaryIntent: detectedIntents[0] || null,
      hasMultipleIntents: detectedIntents.length > 1
    };
  }

  extractEntities(message) {
    const entities = [];
    const lowerMessage = message.toLowerCase();
    const foundAddresses = new Set(); // Para evitar duplicados

    // Detectar direcciones - patrones mejorados
    const addressPatterns = [
      // Patrón para "desde [dirección] hasta [dirección]"
      /(?:desde|de)\s+([^,]+?)\s+(?:hasta|a|para)\s+([^,]+?)(?:\s|$|,)/gi,
      // Patrón para "salgo desde [dirección]"
      /(?:salgo|salo)\s+(?:desde|de)\s+([^,]+?)(?:\s|$|,)/gi,
      // Patrón para "voy a [dirección]"
      /(?:voy|vamos)\s+(?:a|hasta)\s+([^,]+?)(?:\s|$|,)/gi,
      // Patrón para "desde [dirección]"
      /(?:desde|de)\s+([^,]+?)(?:\s+(?:hasta|a|para)|$|,)/gi,
      // Patrón para "hasta [dirección]"
      /(?:hasta|a|para)\s+([^,]+?)(?:\s|$|,)/gi,
      // Patrón para direcciones completas con números y ciudad
      /(\d+\s+(?:de\s+)?[a-záéíóúñ]+(?:\s+\d+)?(?:\s*,\s*[a-záéíóúñ]+)?)/gi
    ];

    for (const pattern of addressPatterns) {
      const matches = lowerMessage.matchAll(pattern);
      for (const match of matches) {
        // Si el patrón tiene dos grupos (origen y destino)
        if (match[1] && match[2]) {
          const origin = match[1].trim();
          const destination = match[2].trim();
          
          if (origin.length > 3 && !foundAddresses.has(origin.toLowerCase())) {
            foundAddresses.add(origin.toLowerCase());
            entities.push({
              type: 'address',
              value: origin,
              confidence: 0.9,
              role: 'origin'
            });
          }
          
          if (destination.length > 3 && !foundAddresses.has(destination.toLowerCase())) {
            foundAddresses.add(destination.toLowerCase());
            entities.push({
              type: 'address',
              value: destination,
              confidence: 0.9,
              role: 'destination'
            });
          }
        } else {
          // Patrón de una sola dirección
          const address = match[1] || match[0];
          if (address && address.length > 3) {
            // Limpiar la dirección
            let cleanAddress = address.trim();
            // Remover palabras comunes al final
            cleanAddress = cleanAddress.replace(/\s+(?:por favor|gracias|ok|dale)$/i, '');
            
            if (cleanAddress.length > 3 && !foundAddresses.has(cleanAddress.toLowerCase())) {
              foundAddresses.add(cleanAddress.toLowerCase());
              entities.push({
                type: 'address',
                value: cleanAddress,
                confidence: 0.8
              });
            }
          }
        }
      }
    }

    // Detectar métodos de pago
    const paymentMethods = ['transferencia', 'efectivo', 'tarjeta', 'débito', 'crédito'];
    for (const method of paymentMethods) {
      if (lowerMessage.includes(method)) {
        entities.push({
          type: 'payment',
          value: method,
          confidence: 0.9
        });
      }
    }

    // Detectar horarios
    const timePatterns = [
      /(?:a las|para las|hora)\s+(\d{1,2}:\d{2})/gi,
      /(?:a las|para las|hora)\s+(\d{1,2}\s*(?:am|pm|AM|PM))/gi
    ];

    for (const pattern of timePatterns) {
      const matches = lowerMessage.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          type: 'time',
          value: match[1],
          confidence: 0.9
        });
      }
    }

    // Detectar tipo de servicio (reserva o inmediato)
    if (lowerMessage.includes('reserva') || lowerMessage.includes('reservar') || lowerMessage.includes('reservado') || 
        lowerMessage.includes('para más tarde') || lowerMessage.includes('para mañana')) {
      entities.push({
        type: 'service_type',
        value: 'reserva',
        confidence: 0.9
      });
    } else if (lowerMessage.includes('inmediato') || lowerMessage.includes('ya') || lowerMessage.includes('ahora') || 
               lowerMessage.includes('urgente') || lowerMessage.includes('lo antes posible')) {
      entities.push({
        type: 'service_type',
        value: 'inmediato',
        confidence: 0.9
      });
    }

    return entities;
  }

  analyzeSentiment(message) {
    const positiveWords = ['gracias', 'perfecto', 'excelente', 'genial', 'bueno', 'ok', 'dale'];
    const negativeWords = ['no', 'mal', 'pésimo', 'terrible', 'problema', 'error', 'molesta'];
    
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
      label: label
    };
  }
}

// ===== PROCESAMIENTO INTELIGENTE =====
class IntelligentProcessor {
  constructor() {
    this.memory = new SmartMemory();
    this.intentDetection = new IntentDetection();
    this.advancedAI = new AdvancedAI();
    
    // Nuevos servicios avanzados
    this.advancedNLU = new AdvancedNLUService();
    this.validationService = new ValidationService();
    this.conversationFlow = new ConversationFlowService();
  }

  async processMessage(message, phoneNumber) {
    // Inicializar memoria si es necesario
    if (!this.memory.activeUsers.size) {
      await this.memory.initialize();
    }

    // DETECCIÓN INMEDIATA DE SALUDOS - PRIORIDAD MÁXIMA
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || lowerMessage.includes('buenass')) {
      console.log('[DEBUG processMessage] Detectado saludo, respondiendo inmediatamente con Buenass');
      return 'Buenass';
    }

    // Obtener usuario y contexto
    const user = this.memory.getUser(phoneNumber);
    const context = this.memory.getPersonalizedContext(phoneNumber);

    // USAR NUEVO SISTEMA DE FLUJO CONVERSACIONAL AVANZADO
    try {
      console.log('🚀 [DEBUG] Usando nuevo sistema de flujo conversacional');
      
      // Procesar con el nuevo flujo conversacional
      const flowResult = await this.conversationFlow.processMessage(message, user);
      
      // Aprender de la interacción
      this.memory.learnFromInteraction(phoneNumber, user.currentConversation.userData);
      
      // Si hay sugerencias, agregarlas al contexto
      if (flowResult.suggestions && flowResult.suggestions.length > 0) {
        console.log('💡 [DEBUG] Sugerencias generadas:', flowResult.suggestions);
      }
      
      return flowResult.response;
      
    } catch (error) {
      console.error('❌ [DEBUG] Error en nuevo flujo conversacional:', error);
      
      // Fallback al sistema anterior
      console.log('🔄 [DEBUG] Usando sistema anterior como fallback');
      
      // Analizar mensaje con sistema anterior
      const intentAnalysis = this.intentDetection.detectIntent(message);
      const entities = this.intentDetection.extractEntities(message);
      const sentiment = this.intentDetection.analyzeSentiment(message);

      // Generar sugerencias
      const suggestions = this.memory.getSuggestions(phoneNumber, { userData: user.currentConversation.userData });

      // Procesar con lógica inteligente anterior
      const response = await this.processWithIntelligence(message, user, intentAnalysis, entities, sentiment, suggestions, context);

      // Aprender de la interacción
      this.memory.learnFromInteraction(phoneNumber, user.currentConversation.userData);

      return response;
    }
  }

  async processWithIntelligence(message, user, intentAnalysis, entities, sentiment, suggestions, context) {
    console.log('🔍 [DEBUG] Iniciando processWithIntelligence');
    console.log('🔍 [DEBUG] Mensaje:', message);
    console.log('🔍 [DEBUG] Intent analysis:', intentAnalysis);
    console.log('🔍 [DEBUG] Entities:', entities);
    console.log('🔍 [DEBUG] Sentiment:', sentiment);
    
    const primaryIntent = intentAnalysis.primaryIntent?.intent;
    const userMood = sentiment.label;

    // Manejar usuarios frustrados
    if (userMood === 'negative') {
      console.log('🔍 [DEBUG] Usuario frustrado, usando handleFrustratedUser');
      return this.handleFrustratedUser(user);
    }

    console.log('🔍 [DEBUG] Llamando a processWithAI...');
    
    // Usar IA avanzada para procesar el mensaje
    try {
      const aiResponse = await this.advancedAI.processWithAI(message, user, context, entities);
      console.log('🔍 [DEBUG] Respuesta de IA recibida:', aiResponse);
      
      // Actualizar datos del usuario basado en las entidades detectadas
      this.updateUserDataFromEntities(user, entities);
      
      return aiResponse;
    } catch (error) {
      console.log('🔍 [DEBUG] Error en processWithAI:', error.message);
      console.log('🔍 [DEBUG] Stack trace:', error.stack);
      throw error; // Re-lanzar el error para que se maneje en el nivel superior
    }
  }

  updateUserDataFromEntities(user, entities) {
    // Procesar direcciones con roles específicos
    const originEntity = entities.find(e => e.type === 'address' && e.role === 'origin');
    const destinationEntity = entities.find(e => e.type === 'address' && e.role === 'destination');
    const addressEntity = entities.find(e => e.type === 'address' && !e.role);
    const paymentEntity = entities.find(e => e.type === 'payment');
    const timeEntity = entities.find(e => e.type === 'time');
    const serviceTypeEntity = entities.find(e => e.type === 'service_type');
    
    // Asignar origen y destino con roles específicos
    if (originEntity) {
      user.currentConversation.userData.origin = originEntity.value;
      console.log(`📍 Origen detectado: ${originEntity.value}`);
    }
    
    if (destinationEntity) {
      user.currentConversation.userData.destination = destinationEntity.value;
      console.log(`🎯 Destino detectado: ${destinationEntity.value}`);
    }
    
    // Si no hay roles específicos, usar lógica anterior
    if (addressEntity && !originEntity && !destinationEntity) {
      if (!user.currentConversation.userData.origin) {
        user.currentConversation.userData.origin = addressEntity.value;
        console.log(`📍 Origen detectado: ${addressEntity.value}`);
      } else if (!user.currentConversation.userData.destination) {
        user.currentConversation.userData.destination = addressEntity.value;
        console.log(`🎯 Destino detectado: ${addressEntity.value}`);
      }
    }
    
    if (paymentEntity) {
      user.currentConversation.userData.paymentMethod = paymentEntity.value;
      console.log(`💳 Método de pago detectado: ${paymentEntity.value}`);
    }
    
    if (timeEntity) {
      user.currentConversation.userData.time = timeEntity.value;
      console.log(`⏰ Horario detectado: ${timeEntity.value}`);
    }
    
    if (serviceTypeEntity) {
      user.currentConversation.userData.serviceType = serviceTypeEntity.value;
      console.log(`🚕 Tipo de servicio detectado: ${serviceTypeEntity.value}`);
    }
  }

  handleTaxiRequest(user, suggestions, context) {
    let response = '';
    
    // Saludo personalizado
    if (context.isFrequentUser) {
      response += `¡Hola! Veo que sos un cliente frecuente. `;
    } else if (context.isReturningUser) {
      response += `¡Hola de nuevo! `;
    } else {
      response += `¡Hola! `;
    }
    
    // Sugerencias inteligentes
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      response += `${suggestion.message}\n\n`;
    }
    
    // Preguntar siguiente paso
    if (!user.currentConversation.userData.origin) {
      response += `¿Desde dónde salís?`;
    } else if (!user.currentConversation.userData.destination) {
      response += `¿A dónde vas?`;
    } else {
      response += `Perfecto, ya tenés origen y destino. ¿Cómo querés pagarlo?`;
    }
    
    return response;
  }

  handleAddressProvision(message, user, entities) {
    const addressEntity = entities.find(e => e.type === 'address');
    
    if (addressEntity) {
      // Determinar si es origen o destino
      if (!user.currentConversation.userData.origin) {
        user.currentConversation.userData.origin = addressEntity.value;
        return `Perfecto, salís desde ${addressEntity.value}\n\n¿A dónde vas?`;
      } else if (!user.currentConversation.userData.destination) {
        user.currentConversation.userData.destination = addressEntity.value;
        return `Genial, vas a ${addressEntity.value}\n\n¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta`;
      }
    }
    
    return `No pude entender la dirección. ¿Podrías ser más específico?`;
  }

  handlePaymentSpecification(message, user, entities, context) {
    const paymentEntity = entities.find(e => e.type === 'payment');
    
    if (paymentEntity) {
      user.currentConversation.userData.paymentMethod = paymentEntity.value;
      return `Perfecto, pagás con ${paymentEntity.value}\n\n¿Lo querés ahora o es para más tarde?`;
    }
    
    // Sugerir método preferido si es usuario frecuente
    if (context.isFrequentUser && context.preferences.preferredPaymentMethods.length > 0) {
      const preferred = context.preferences.preferredPaymentMethods[0];
      return `¿Pagás con ${preferred} como siempre?`;
    }
    
    return `¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta.`;
  }

  handleTimeSpecification(message, user, entities, context) {
    const timeEntity = entities.find(e => e.type === 'time');
    
    if (timeEntity) {
      user.currentConversation.userData.time = timeEntity.value;
      return `Perfecto, a las ${timeEntity.value}\n\n¿Confirmás el viaje?`;
    }
    
    return `¿A qué hora lo necesitás?`;
  }

  handleQuestion(message, user) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('tarifa')) {
      return `Los precios varían según la distancia. En general:\n• Viajes cortos: $500-800\n• Viajes medios: $800-1200\n• Viajes largos: $1200-2000\n\n¿Desde dónde salís para darte un precio más preciso?`;
    }
    
    if (lowerMessage.includes('tiempo') || lowerMessage.includes('tarda')) {
      return `Los tiempos de espera son:\n• Taxi inmediato: 5-15 minutos\n• Reservas: Según el horario que elijas\n\n¿Qué tipo de servicio necesitás?`;
    }
    
    if (lowerMessage.includes('mascota') || lowerMessage.includes('perro') || lowerMessage.includes('gato')) {
      return `¡Sí! Tenemos taxis que aceptan mascotas. Solo decime que vas con tu mascota y te asignamos un conductor que lo permita.\n\n¿Desde dónde salís?`;
    }
    
    return `Te puedo ayudar con:\n• Precios y tarifas\n• Tiempos de espera\n• Servicios especiales (mascotas, equipaje)\n• Métodos de pago\n\n¿Qué te interesa saber?`;
  }

  handleConfirmation(user) {
    const userData = user.currentConversation.userData;
    
    if (userData.origin && userData.destination && userData.paymentMethod) {
      const summary = `Resumen del viaje:\n• Origen: ${userData.origin}\n• Destino: ${userData.destination}\n• Pago: ${userData.paymentMethod}${userData.time ? `\n• Hora: ${userData.time}` : ''}\n\n¡Perfecto! Tu taxi está en camino. Te avisamos cuando el conductor llegue. ¡Que tengas buen viaje!`;
      
      // Limpiar datos para nueva conversación
      user.currentConversation.userData = {};
      user.currentConversation.state = 'idle';
      
      return summary;
    }
    
    return `Necesito más información para confirmar el viaje. ¿Desde dónde salís?`;
  }

  handleCancellation(user) {
    user.currentConversation.userData = {};
    user.currentConversation.state = 'idle';
    return `Ok, cancelado. Si necesitás algo más, avisame.`;
  }

  handleHelpRequest(user) {
    let helpMessage = `Te ayudo con el proceso:\n\n`;
    
    if (!user.currentConversation.userData.origin) {
      helpMessage += `1. Primero decime desde dónde salís\n`;
    } else if (!user.currentConversation.userData.destination) {
      helpMessage += `1. ✅ Origen: ${user.currentConversation.userData.origin}\n2. Ahora decime a dónde vas\n`;
    } else if (!user.currentConversation.userData.paymentMethod) {
      helpMessage += `1. ✅ Origen: ${user.currentConversation.userData.origin}\n2. ✅ Destino: ${user.currentConversation.userData.destination}\n3. Ahora elegí cómo pagar: transferencia, efectivo o tarjeta\n`;
    } else {
      helpMessage += `1. ✅ Origen: ${user.currentConversation.userData.origin}\n2. ✅ Destino: ${user.currentConversation.userData.destination}\n3. ✅ Pago: ${user.currentConversation.userData.paymentMethod}\n4. Solo confirmá el viaje\n`;
    }
    
    return helpMessage;
  }

  handleFrustratedUser(user) {
    const response = `Entiendo que puede ser frustrante. Te ayudo paso a paso.\n\n`;
    
    if (!user.currentConversation.userData.origin) {
      return response + `¿Desde dónde salís? Te puedo ayudar a encontrar la dirección.`;
    } else if (!user.currentConversation.userData.destination) {
      return response + `¿A dónde vas? Te ayudo a configurar el destino.`;
    } else if (!user.currentConversation.userData.paymentMethod) {
      return response + `¿Cómo querés pagarlo? Tenemos transferencia, efectivo o tarjeta.`;
    } else {
      return response + `¿Querés que te ayude con algo específico?`;
    }
  }

  handleMultipleIntents(message, user, entities) {
    // Si tiene dirección y pago, procesar ambos
    const hasAddress = entities.some(e => e.type === 'address');
    const hasPayment = entities.some(e => e.type === 'payment');
    
    if (hasAddress && hasPayment) {
      return this.handleAddressProvision(message, user, entities);
    }
    
    return this.getFallbackResponse(user, message);
  }

  getFallbackResponse(user, currentMessage = '') {
    // Usar el mensaje actual para detectar saludos
    const lastMessage = currentMessage.toLowerCase();
    console.log('[DEBUG getFallbackResponse] Mensaje recibido:', lastMessage); // LOG TEMPORAL
    
    // Detectar saludos primero
    if (lastMessage.includes('hola') || lastMessage.includes('buenas') || lastMessage.includes('buenass')) {
      console.log('[DEBUG getFallbackResponse] Detectado saludo, respondiendo solo con Buenass'); // LOG TEMPORAL
      return 'Buenass';
    }
    
    // Lógica normal para otros casos
    if (!user.currentConversation.userData.origin) {
      return `¿Desde dónde salís?`;
    } else if (!user.currentConversation.userData.destination) {
      return `¿A dónde vas?`;
    } else if (!user.currentConversation.userData.paymentMethod) {
      return `¿Cómo pagás? Transferencia, efectivo o tarjeta.`;
    } else {
      return `¿Confirmás?`;
    }
  }
}

// ===== EXPORTAR CLASES PARA PRUEBAS =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SmartMemory,
    IntentDetection,
    AdvancedAI,
    IntelligentProcessor,
    OpenAIHandler
  };
}

// ===== INTERFAZ DE CHAT =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const processor = new IntelligentProcessor();

console.log('🤖 NovoBot - Chat Inteligente');
console.log('=============================');
console.log('Escribe tus mensajes y el bot te responderá con inteligencia artificial.');
console.log('Comandos disponibles:');
console.log('  - "salir" - Terminar la conversación');
console.log('  - "limpiar" - Limpiar el historial de conversación');
console.log('  - "ayuda" - Mostrar esta ayuda');
console.log('  - "estado" - Ver el estado actual de la conversación');
console.log('  - "stats" - Ver estadísticas de aprendizaje\n');

function clearScreen() {
  console.clear();
  console.log('🤖 NovoBot - Chat Inteligente');
  console.log('=============================\n');
}

function showHelp() {
  console.log('\n📚 Comandos disponibles:');
  console.log('  - "salir" - Terminar la conversación');
  console.log('  - "limpiar" - Limpiar el historial de conversación');
  console.log('  - "ayuda" - Mostrar esta ayuda');
  console.log('  - "estado" - Ver el estado actual de la conversación');
  console.log('  - "stats" - Ver estadísticas de aprendizaje');
  console.log('  - "test" - Enviar un mensaje de prueba\n');
}

function showStats() {
  const user = processor.memory.getUser(USER_PHONE);
  const context = processor.memory.getPersonalizedContext(USER_PHONE);
  
  console.log('\n📊 Estadísticas de aprendizaje:');
  console.log(`  - Usos totales: ${context.useCount}`);
  console.log(`  - Usuario frecuente: ${context.isFrequentUser ? 'Sí' : 'No'}`);
  console.log(`  - Orígenes frecuentes: ${context.preferences.frequentOrigins.length}`);
  console.log(`  - Destinos frecuentes: ${context.preferences.frequentDestinations.length}`);
  console.log(`  - Métodos de pago preferidos: ${context.preferences.preferredPaymentMethods.length}`);
  console.log(`  - Usuarios activos en memoria: ${processor.memory.activeUsers.size}\n`);
}

function chat() {
  rl.question('📤 Tú: ', async (userMessage) => {
    const message = userMessage.trim();
    
    if (message.toLowerCase() === 'salir') {
      console.log('\n👋 ¡Hasta luego!');
      rl.close();
      return;
    }
    
    if (message.toLowerCase() === 'limpiar') {
      clearScreen();
      chat();
      return;
    }
    
    if (message.toLowerCase() === 'ayuda') {
      showHelp();
      chat();
      return;
    }
    
    if (message.toLowerCase() === 'estado') {
      const user = processor.memory.getUser(USER_PHONE);
      console.log('\n📊 Estado actual:');
      console.log(`  - Número de teléfono: ${USER_PHONE}`);
      console.log(`  - Estado de conversación: ${user.currentConversation.state}`);
      console.log(`  - Origen: ${user.currentConversation.userData.origin || 'No especificado'}`);
      console.log(`  - Destino: ${user.currentConversation.userData.destination || 'No especificado'}`);
      console.log(`  - Método de pago: ${user.currentConversation.userData.paymentMethod || 'No especificado'}`);
      console.log(`  - Hora: ${user.currentConversation.userData.time || 'No especificada'}\n`);
      chat();
      return;
    }
    
    if (message.toLowerCase() === 'stats') {
      showStats();
      chat();
      return;
    }
    
    if (message.toLowerCase() === 'test') {
      console.log('\n🧪 Enviando mensaje de prueba...');
      try {
        const response = await processor.processMessage('Hola, necesito un taxi', USER_PHONE);
        console.log(`🤖 NovoBot: ${response}\n`);
      } catch (error) {
        console.log(`❌ Error en prueba: ${error.message}\n`);
      }
      chat();
      return;
    }
    
    if (message === '') {
      console.log('⚠️ Por favor, escribe un mensaje válido.\n');
      chat();
      return;
    }

    try {
      console.log('⏳ Procesando con IA...');
      const response = await processor.processMessage(message, USER_PHONE);
      console.log(`🤖 NovoBot: ${response}\n`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }

    // Continuar la conversación
    chat();
  });
}

// Manejar la salida del programa
process.on('SIGINT', () => {
  console.log('\n\n👋 ¡Hasta luego!');
  rl.close();
  process.exit(0);
});

// Iniciar el chat
console.log('🚀 Inicializando sistema de inteligencia...');
chat(); 