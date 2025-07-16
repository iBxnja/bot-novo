# Directorio tests/

Pruebas automatizadas del sistema.

## Tipos de pruebas

### unit/
Pruebas unitarias de funciones individuales
- `services/` - Pruebas de servicios
- `utils/` - Pruebas de utilidades
- `models/` - Pruebas de modelos

### integration/
Pruebas de integración entre componentes
- `api/` - Pruebas de endpoints
- `database/` - Pruebas de BD
- `external/` - Pruebas de APIs externas

### e2e/
Pruebas end-to-end del flujo completo
- `call-flow.test.js` - Flujo completo de llamada
- `conversation.test.js` - Conversaciones

## Ejecutar pruebas

```bash
npm test              # Todas las pruebas
npm run test:unit     # Solo unitarias
npm run test:integration # Solo integración
npm run test:e2e      # Solo end-to-end
```
