#!/usr/bin/env node

const SmartMemoryService = require('../src/services/nlp/SmartMemoryService');
const IntentDetectionService = require('../src/services/nlp/IntentDetectionService');
const logger = require('../src/utils/logger');

async function setupIntelligence() {
  console.log('🧠 Configurando sistema de inteligencia avanzada...\n');
  
  try {
    // 1. Inicializar memoria inteligente
    console.log('1. Inicializando memoria inteligente...');
    const memoryService = new SmartMemoryService();
    await memoryService.initialize();
    console.log('✅ Memoria inteligente inicializada\n');
    
    // 2. Probar servicios de inteligencia
    console.log('2. Probando servicios de inteligencia...');
    
    const intentService = new IntentDetectionService();
    
    // Probar detección de intenciones
    const testMessage = "Necesito un taxi desde mi casa hasta el centro";
    const intentAnalysis = intentService.detectComplexContext(testMessage);
    console.log(`✅ Detección de intenciones: ${intentAnalysis.intents.primaryIntent?.intent}`);
    
    // Probar extracción de entidades
    const entities = intentService.extractEntities(testMessage);
    console.log(`✅ Extracción de entidades: ${entities.length} encontradas`);
    
    // Probar análisis de sentimiento
    const sentiment = intentService.analyzeSentiment(testMessage);
    console.log(`✅ Análisis de sentimiento: ${sentiment.label} (${sentiment.score})`);
    
    // 4. Crear usuario de prueba
    console.log('\n4. Creando usuario de prueba...');
    const testPhone = '+1234567890';
    const testUser = await memoryService.getUser(testPhone);
    console.log(`✅ Usuario creado: ${testUser.phoneNumber}`);
    
    // 5. Probar sugerencias inteligentes
    console.log('\n5. Probando sugerencias inteligentes...');
    const suggestions = await memoryService.generateSmartSuggestions(testPhone, {});
    console.log(`✅ Sugerencias generadas: ${suggestions.length}`);
    
    // 6. Probar anticipación de necesidades
    console.log('\n6. Probando anticipación de necesidades...');
    const anticipations = await memoryService.anticipateNeeds(testPhone, {});
    console.log(`✅ Anticipaciones generadas: ${anticipations.length}`);
    
    // 7. Probar contexto personalizado
    console.log('\n7. Probando contexto personalizado...');
    const context = await memoryService.getPersonalizedContext(testPhone);
    console.log(`✅ Contexto personalizado: ${context.isReturningUser ? 'Usuario existente' : 'Nuevo usuario'}`);
    
    // 8. Probar estadísticas de aprendizaje
    console.log('\n8. Probando estadísticas de aprendizaje...');
    const stats = await memoryService.getLearningStats(testPhone);
    console.log(`✅ Estadísticas obtenidas: ${stats.userStats?.useCount || 0} usos`);
    
    console.log('\n🎉 ¡Sistema de inteligencia configurado exitosamente!');
    console.log('\n📊 Funcionalidades disponibles:');
    console.log('   • Memoria inteligente en RAM (super rápida)');
    console.log('   • Detección avanzada de intenciones');
    console.log('   • Análisis de sentimiento');
    console.log('   • Sugerencias inteligentes');
    console.log('   • Anticipación de necesidades');
    console.log('   • Aprendizaje de preferencias');
    console.log('   • Contexto personalizado');
    
    console.log('\n🚀 El bot ahora es mucho más inteligente y puede:');
    console.log('   • Recordar preferencias de cada usuario');
    console.log('   • Sugerir direcciones y métodos de pago frecuentes');
    console.log('   • Anticipar necesidades basadas en patrones');
    console.log('   • Adaptar respuestas según el estado de ánimo');
    console.log('   • Manejar múltiples intenciones en un mensaje');
    console.log('   • Aprender de cada interacción');
    console.log('   • Limpiar memoria automáticamente');
    
    console.log('\n⚡ Ventajas de rendimiento:');
    console.log('   • Acceso instantáneo a datos en RAM');
    console.log('   • Sin latencia de base de datos');
    console.log('   • Limpieza automática de memoria');
    console.log('   • Guardado inteligente de preferencias');
    
  } catch (error) {
    console.error('❌ Error configurando sistema de inteligencia:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupIntelligence();
}

module.exports = setupIntelligence; 