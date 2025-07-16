# Directorio data/

Datos del sistema y entrenamiento.

## Estructura

### training/
Datos para entrenar modelos
- `intents.json` - Intenciones de usuario
- `entities.json` - Entidades reconocidas
- `responses.json` - Respuestas del bot

### conversations/
Historial de conversaciones
- `logs/` - Logs de conversaciones
- `analytics/` - Datos procesados

### analytics/
Métricas y reportes
- `daily/` - Métricas diarias
- `monthly/` - Métricas mensuales
- `reports/` - Reportes generados

## Formato de datos

Los archivos JSON siguen el formato:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "session_id": "uuid",
  "data": {}
}
```
