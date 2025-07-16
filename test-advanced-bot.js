const AdvancedNLUService = require('./src/services/nlp/AdvancedNLUService');
const ValidationService = require('./src/services/validation/ValidationService');
const ConversationFlowService = require('./src/services/conversation/ConversationFlowService');

// Configurar variables de entorno para OpenAI
require('dotenv').config();

async function testAdvancedBot() {
  console.log('🤖 Testeando Bot Avanzado con NLU Mejorado');
  console.log('==========================================\n');

  // Inicializar servicios
  const nluService = new AdvancedNLUService();
  const validationService = new ValidationService();
  const conversationFlow = new ConversationFlowService();

  // Contexto de usuario simulado
  const userContext = {
    currentConversation: {
      userData: {},
      state: 'initial',
      messages: []
    }
  };

  // Casos de prueba
  const testCases = [
    {
      name: 'Saludo simple',
      message: 'hola',
      expectedIntent: 'greeting'
    },
    {
      name: 'Solicitud de taxi',
      message: 'necesito un taxi',
      expectedIntent: 'taxi_request'
    },
    {
      name: 'Dirección completa',
      message: 'desde 1 de mayo 449, concordia hasta diamante 2500, concordia',
      expectedIntent: 'address_provision'
    },
    {
      name: 'Método de pago',
      message: 'efectivo',
      expectedIntent: 'payment_method'
    },
    {
      name: 'Horario específico',
      message: 'a las 18hs',
      expectedIntent: 'time_specification'
    },
    {
      name: 'Confirmación',
      message: 'sí, confirmo',
      expectedIntent: 'confirmation'
    },
    {
      name: 'Pregunta sobre precios',
      message: 'cuánto cuesta el viaje?',
      expectedIntent: 'question'
    },
    {
      name: 'Mensaje complejo con múltiples entidades',
      message: 'quiero un taxi desde guemes 800, concordia hasta diamante 2500, concordia, pago en efectivo para las 18hs',
      expectedIntent: 'taxi_request'
    }
  ];

  console.log('🧪 Ejecutando casos de prueba...\n');

  for (const testCase of testCases) {
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`💬 Mensaje: "${testCase.message}"`);
    
    try {
      // Test 1: Análisis NLU
      console.log('\n🔍 1. Análisis NLU:');
      const nluAnalysis = await nluService.analyzeMessage(testCase.message);
      console.log(`   - Intención principal: ${nluAnalysis.intents.primary?.intent} (confianza: ${nluAnalysis.intents.primary?.confidence?.toFixed(2)})`);
      console.log(`   - Entidades detectadas: ${nluAnalysis.entities.length}`);
      console.log(`   - Sentimiento: ${nluAnalysis.sentiment.label} (score: ${nluAnalysis.sentiment.score.toFixed(2)})`);
      console.log(`   - Confianza general: ${nluAnalysis.confidence.toFixed(2)}`);
      
      if (nluAnalysis.entities.length > 0) {
        console.log('   - Entidades:');
        nluAnalysis.entities.forEach(entity => {
          console.log(`     • ${entity.type}: "${entity.value}" (confianza: ${entity.confidence})`);
        });
      }

      // Test 2: Validaciones
      console.log('\n✅ 2. Validaciones:');
      const validation = nluAnalysis.validation;
      console.log(`   - Válido: ${validation.isValid}`);
      if (validation.errors.length > 0) {
        console.log('   - Errores:');
        validation.errors.forEach(error => console.log(`     • ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.log('   - Advertencias:');
        validation.warnings.forEach(warning => console.log(`     • ${warning}`));
      }

      // Test 3: Flujo conversacional
      console.log('\n🔄 3. Flujo conversacional:');
      const flowResult = await conversationFlow.processMessage(testCase.message, userContext);
      console.log(`   - Estado: ${flowResult.newState}`);
      console.log(`   - Respuesta: ${flowResult.response.substring(0, 100)}${flowResult.response.length > 100 ? '...' : ''}`);

      // Test 4: Sugerencias
      if (nluAnalysis.suggestions.length > 0) {
        console.log('\n💡 4. Sugerencias:');
        nluAnalysis.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion.type}: ${suggestion.message}`);
        });
      }

      // Verificar expectativa
      const actualIntent = nluAnalysis.intents.primary?.intent;
      const isCorrect = actualIntent === testCase.expectedIntent;
      console.log(`\n🎯 Resultado: ${isCorrect ? '✅ PASÓ' : '❌ FALLÓ'}`);
      if (!isCorrect) {
        console.log(`   Esperado: ${testCase.expectedIntent}`);
        console.log(`   Obtenido: ${actualIntent}`);
      }

    } catch (error) {
      console.error(`❌ Error en test "${testCase.name}":`, error.message);
    }

    console.log('\n' + '─'.repeat(80) + '\n');
  }

  // Test de validaciones específicas
  console.log('🔧 Testeando validaciones específicas...\n');

  // Test de validación de horarios
  console.log('⏰ Validación de horarios:');
  const timeTests = [
    { time: '18hs', expected: true },
    { time: '6:00 PM', expected: true },
    { time: '25:00', expected: false },
    { time: '18:30', expected: true },
    { time: '3 AM', expected: true }
  ];

  for (const timeTest of timeTests) {
    const validation = validationService.validateTime(timeTest.time);
    const result = validation.isValid === timeTest.expected ? '✅' : '❌';
    console.log(`   ${result} "${timeTest.time}" -> ${validation.isValid ? 'Válido' : 'Inválido'}`);
    if (validation.warning) {
      console.log(`      ⚠️ ${validation.warning}`);
    }
  }

  // Test de validación de direcciones
  console.log('\n📍 Validación de direcciones:');
  const addressTests = [
    { address: '1 de mayo 449, concordia', expected: true },
    { address: 'abc', expected: false },
    { address: 'guemes 800, concordia', expected: true }
  ];

  for (const addressTest of addressTests) {
    const validation = await validationService.validateAddress(addressTest.address);
    const result = validation.isValid === addressTest.expected ? '✅' : '❌';
    console.log(`   ${result} "${addressTest.address}" -> ${validation.isValid ? 'Válido' : 'Inválido'}`);
    if (validation.warning) {
      console.log(`      ⚠️ ${validation.warning}`);
    }
  }

  // Test de cálculo de tarifas
  console.log('\n💰 Cálculo de tarifas:');
  const tariffTest = validationService.calculateTariff(
    '1 de mayo 449, concordia',
    'diamante 2500, concordia',
    'normal'
  );
  console.log(`   Origen: 1 de mayo 449, concordia`);
  console.log(`   Destino: diamante 2500, concordia`);
  console.log(`   Precio estimado: $${tariffTest.totalPrice}`);
  console.log(`   Rango: ${tariffTest.priceRange}`);

  console.log('\n🎉 Tests completados!');
}

// Ejecutar tests
testAdvancedBot().catch(console.error); 