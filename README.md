# 🤖 NovoBot - Bot WhatsApp Taxi con IA

Bot de WhatsApp humanizado para solicitud de taxis que utiliza ChatGPT para procesar lenguaje natural y mantener conversaciones fluidas.

## ✨ Características

- 🤖 **Procesamiento de lenguaje natural** con ChatGPT
- 🧠 **Inteligencia artificial avanzada** con memoria persistente
- 💬 **Conversaciones humanizadas** - No más menús rígidos
- 🚗 **Solicitud de taxis** conversacional
- 📅 **Reservas programadas**
- 💳 **Múltiples métodos de pago**
- 🎯 **Integración con sistema PONT**
- 📱 **Soporte completo de WhatsApp**
- 🧠 **Memoria de conversación persistente**
- 🎯 **Detección avanzada de intenciones**
- 📊 **Aprendizaje de preferencias de usuario**
- 🔮 **Anticipación de necesidades**
- 😊 **Análisis de sentimiento en tiempo real**
- 💡 **Sugerencias inteligentes**

## 🚀 Instalación

### Prerrequisitos

- Node.js 16+
- Redis (opcional, para cache)
- PostgreSQL (para integración con sistema existente)

### Configuración

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd bot-novo
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# OpenAI Configuration
OPENAI_API_KEY=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
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=200
OPENAI_TEMPERATURE=0.4

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Base de datos (opcional)
DATABASE_URL=postgresql://username:password@localhost:5432/novoapp
REDIS_URL=redis://localhost:6379

# Integración con sistema existente
PONT_API_URL=http://localhost:8000/api
PONT_API_TOKEN=your_pont_api_token
```

4. **Configurar sistema de inteligencia**
```bash
npm run setup:intelligence
```

5. **Iniciar el servidor**
```bash
npm run dev
```

## 📱 Configuración de WhatsApp

### Con Twilio

1. Crear cuenta en [Twilio](https://www.twilio.com/)
2. Obtener credenciales de WhatsApp Business API
3. Configurar webhook: `https://tu-dominio.com/api/whatsapp/webhook`

### Webhook URL
```
POST https://tu-dominio.com/api/whatsapp/webhook
```

## 🧠 Cómo funciona

### Sistema de Inteligencia Avanzada

El bot ahora incluye un sistema completo de inteligencia artificial que lo hace realmente humano:

#### 🧠 **Memoria Inteligente**
- **RAM súper rápida**: Todo en memoria para acceso instantáneo
- **Preferencias aprendidas**: Recuerda direcciones, métodos de pago, horarios favoritos
- **Limpieza automática**: Elimina datos antiguos para optimizar rendimiento
- **Guardado inteligente**: Solo guarda preferencias de usuarios frecuentes

#### 🎯 **Detección Avanzada de Intenciones**
- **Múltiples intenciones**: Entiende cuando el usuario dice varias cosas a la vez
- **Contexto complejo**: Considera el historial de la conversación
- **Entidades inteligentes**: Extrae direcciones, horarios, métodos de pago automáticamente
- **Análisis de sentimiento**: Detecta si el usuario está frustrado, apurado o contento

#### 🔮 **Anticipación de Necesidades**
- **Sugerencias inteligentes**: Propone opciones basadas en uso previo
- **Patrones temporales**: Anticipa horarios típicos
- **Servicios especiales**: Recuerda si suele viajar con mascotas o equipaje
- **Métodos de pago preferidos**: Sugiere el método más usado

### Flujo de conversación inteligente

1. **Usuario envía mensaje**: "Hola, necesito un taxi"
2. **Análisis inteligente**: 
   - Detecta intención de pedir taxi
   - Analiza sentimiento (positivo)
   - Busca preferencias previas
   - Genera sugerencias personalizadas
3. **Respuesta contextualizada**: "¡Hola! Veo que sos un cliente frecuente. ¿Salís desde tu casa como siempre?"
4. **Recolección inteligente**: Guía adaptándose al usuario
5. **Confirmación personalizada**: Muestra resumen con opciones preferidas
6. **Aprendizaje**: Guarda la interacción para mejorar futuras respuestas

### Ejemplos de conversación

```
Usuario: "Hola, necesito ir al centro"
Bot: "¡Hola! 😊 Claro, te ayudo a conseguir un taxi para ir al centro. 
     ¿Desde dónde quieres que te recojan?"

Usuario: "Desde mi casa en Av. Principal 123"
Bot: "Perfecto, Av. Principal 123. ¿Cuál es tu nombre para el viaje?"

Usuario: "Me llamo María"
Bot: "¡Hola María! 👋 Ahora necesito saber a dónde vas exactamente en el centro."
```

## 🔧 API Endpoints

### Webhook WhatsApp
```
POST /api/whatsapp/webhook
```

### Test IA
```
POST /api/whatsapp/test-ai
Body: { "message": "Hola, necesito un taxi", "state": {} }
```

### Estadísticas de aprendizaje
```
GET /api/whatsapp/learning-stats/:phoneNumber
```

### Contexto personalizado
```
GET /api/whatsapp/user-context/:phoneNumber
```

### Sugerencias inteligentes
```
POST /api/whatsapp/suggestions
Body: { "phoneNumber": "+1234567890", "currentContext": {} }
```

### Enviar mensaje manual
```
POST /api/whatsapp/send
Body: { "to": "+1234567890", "message": "Hola" }
```

### Estado de salud
```
GET /health
```

## 🛠️ Desarrollo

### Estructura del proyecto
```
bot-novo/
├── src/
│   ├── controllers/
│   │   └── whatsapp.controller.js    # Controlador principal
│   ├── routes/
│   │   └── whatsapp.routes.js        # Rutas de WhatsApp
│   ├── services/                     # Servicios (futuro)
│   ├── utils/
│   │   └── logger.js                 # Sistema de logging
│   └── index.js                      # Punto de entrada
├── config/
│   └── environment.js                # Configuración
├── logs/                             # Archivos de log
└── package.json
```

### Scripts disponibles

```bash
npm start              # Iniciar en producción
npm run dev            # Iniciar en desarrollo con nodemon
npm run setup:intelligence # Configurar sistema de inteligencia
npm test               # Ejecutar tests
npm run docker:build   # Construir imagen Docker
```

## 🔒 Seguridad

- Validación de webhooks de Twilio
- Logging de todas las conversaciones
- Manejo seguro de tokens de API
- Rate limiting (futuro)

## 📊 Monitoreo

Los logs se guardan en:
- `logs/error.log` - Errores
- `logs/combined.log` - Todos los logs
- `logs/whatsapp.log` - Conversaciones de WhatsApp

## 🤝 Integración con PONT

El bot se integra con el sistema existente de PONT para:
- Crear viajes
- Asignar conductores
- Gestionar pagos
- Enviar notificaciones

## 🚀 Despliegue

### Docker
```bash
docker build -t novo-whatsapp-bot .
docker run -p 3000:3000 novo-whatsapp-bot
```

### Variables de entorno requeridas
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `OPENAI_API_KEY`
- `PONT_API_URL`
- `PONT_API_TOKEN`

## 📞 Soporte

Para soporte técnico o preguntas sobre el bot, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ por el equipo de NovoApp**






