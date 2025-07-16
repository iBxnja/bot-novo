const axios = require('axios');

async function testBot() {
  const baseURL = 'http://localhost:3000/api/whatsapp';
  
  console.log('🤖 Probando NovoBot con ChatGPT...\n');
  
  const testMessages = [
    "Hola, necesito un taxi",
    "Me llamo Juan Pérez",
    "Voy desde Av. Corrientes 1234",
    "Hacia Plaza de Mayo",
    "Efectivo",
    "Sí, confirmo"
  ];
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`📤 Usuario: ${message}`);
    
    try {
      const response = await axios.post(`${baseURL}/test-ai`, {
        message: message,
        phoneNumber: '+1234567890'
      });
      
      console.log(`🤖 NovoBot: ${response.data.aiResponse}\n`);
      
      // Pausa entre mensajes para simular conversación real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
  
  console.log('✅ Prueba completada!');
}

// Ejecutar la prueba
testBot().catch(console.error); 