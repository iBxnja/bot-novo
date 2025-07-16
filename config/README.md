# Directorio config/

Configuración del sistema y variables de entorno.

## Estructura

### environments/
- `.env.example` - Ejemplo de variables de entorno
- `.env.development` - Config para desarrollo
- `.env.production` - Config para producción

### keys/
- `jwt.key` - Claves JWT
- `api.keys` - Claves de APIs externas

### database/
- `postgres.config.js` - Configuración PostgreSQL
- `redis.config.js` - Configuración Redis
- `schema.sql` - Esquema de base de datos

## Variables importantes

- `OPENAI_API_KEY` - Clave de OpenAI
- `TWILIO_ACCOUNT_SID` - SID de Twilio
- `DATABASE_URL` - URL de PostgreSQL
- `REDIS_URL` - URL de Redis
