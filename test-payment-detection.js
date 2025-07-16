const AdvancedNLUService = require('./src/services/nlp/AdvancedNLUService');

async function testPaymentDetection() {
  console.log('🧪 Probando detección de métodos de pago...\n');
  
  const nluService = new AdvancedNLUService();
  
  const testMessages = [
    'pago con efectivo',
    'efectivo',
    'pago en efectivo',
    'transferencia',
    'pago con tarjeta',
    'tarjeta de crédito',
    'muchas gracias'
  ];
  
  for (const message of testMessages) {
    console.log(`📝 Mensaje: "${message}"`);
    
    try {
      const analysis = await nluService.analyzeMessage(message);
      
      console.log(`   - Intención: ${analysis.intents.primary?.intent}`);
      console.log(`   - Entidades: ${analysis.entities.length}`);
      
      const paymentEntity = analysis.entities.find(e => e.type === 'payment');
      if (paymentEntity) {
        console.log(`   ✅ Método de pago detectado: ${paymentEntity.value} (confianza: ${paymentEntity.confidence})`);
      } else {
        console.log(`   ❌ No se detectó método de pago`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
}

testPaymentDetection().catch(console.error); 