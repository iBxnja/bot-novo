#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 Configuración rápida de NovoBot WhatsApp\n');
console.log('===========================================\n');

// Verificar si existe .env
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ Archivo .env encontrado');
} else {
  console.log('📝 Creando archivo .env...');
  fs.copyFileSync(path.join(__dirname, 'env.example'), envPath);
  console.log('✅ Archivo .env creado');
}

console.log('\n📱 Para conectar WhatsApp necesitas:\n');
console.log('1. Crear cuenta en Twilio: https://www.twilio.com/');
console.log('2. Obtener credenciales de WhatsApp Business API');
console.log('3. Configurar webhook\n');

console.log('🔧 Configuración manual:\n');
console.log('1. Edita el archivo .env con tus credenciales de Twilio');
console.log('2. Ejecuta: npm run dev');
console.log('3. Usa ngrok para exponer tu servidor: ngrok http 3000');
console.log('4. Configura el webhook en Twilio: https://tu-ngrok.ngrok.io/api/whatsapp/webhook\n');

console.log('🧪 Para probar sin Twilio (solo IA):\n');
console.log('1. Ejecuta: npm run dev');
console.log('2. Ve a: http://localhost:3000/api/whatsapp/test-ai');
console.log('3. Envía un mensaje de prueba\n');

console.log('📞 Número de WhatsApp de prueba: +14155238886');
console.log('🌐 URL del webhook: http://localhost:3000/api/whatsapp/webhook');

rl.close(); 