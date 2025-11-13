# Sistema de API con Fallback Automático

## Configuración Actual

El sistema está configurado para conectarse automáticamente al backend con la siguiente prioridad:

### 1. Backend Local (Prioridad)
- **URL:** `http://localhost:5000`
- **Timeout:** 5 segundos
- **Uso:** Desarrollo local

### 2. Backend Desplegado (Fallback)
- **URL:** `https://cierre-caja-api.onrender.com`
- **Timeout:** 30 segundos
- **Uso:** Producción / Fallback cuando el local no responde

## Cómo Funciona

### Flujo de Conexión

```
┌─────────────────────────────────────────┐
│  Usuario hace una petición al API      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  ¿Ya sabemos qué backend funciona?      │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       SÍ                NO
        │                 │
        ▼                 ▼
┌──────────────┐   ┌─────────────────┐
│ Usar ese     │   │ Intentar LOCAL  │
│ backend      │   │ (5 seg timeout) │
└──────┬───────┘   └────────┬────────┘
       │                    │
       │           ┌────────┴────────┐
       │           │                 │
       │         ÉXITO             FALLO
       │           │                 │
       │           ▼                 ▼
       │    ┌──────────────┐  ┌────────────────┐
       │    │ Guardar      │  │ Intentar       │
       │    │ como activo  │  │ DESPLEGADO     │
       │    └──────┬───────┘  │ (30s timeout)  │
       │           │          └────────┬───────┘
       │           │                   │
       └───────────┴───────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Retornar        │
          │ respuesta       │
          └─────────────────┘
```

### Optimización Inteligente

Una vez que el sistema identifica qué backend está funcionando, **guarda esa información** y la usa para futuras peticiones. Esto significa:

- **Primera petición:** Intenta local → Si falla → Intenta desplegado
- **Siguientes peticiones:** Va directo al que funcionó antes
- **Si falla el guardado:** Resetea y vuelve a intentar con ambos

## Ventajas

1. **Desarrollo sin interrupciones:** Si el backend local está corriendo, siempre lo usará (más rápido)
2. **Fallback automático:** Si el local no responde, automáticamente usa el desplegado
3. **Sin configuración manual:** No necesitas cambiar código entre desarrollo y producción
4. **Logs en consola:** Puedes ver en la consola del navegador qué backend está usando

## Ejemplos de Uso

### En Desarrollo (Backend Local Activo)
```
Consola del navegador:
→ Intentando conectar con backend local: http://localhost:5000
✓ Conectado exitosamente con backend local
```

### En Producción (Backend Local No Disponible)
```
Consola del navegador:
→ Intentando conectar con backend local: http://localhost:5000
⚠ Backend local no disponible, intentando con backend desplegado...
→ Intentando conectar con backend desplegado: https://cierre-caja-api.onrender.com
✓ Conectado exitosamente con backend desplegado
```

### Ambos Backends Caídos
```
Consola del navegador:
→ Intentando conectar con backend local: http://localhost:5000
⚠ Backend local no disponible, intentando con backend desplegado...
→ Intentando conectar con backend desplegado: https://cierre-caja-api.onrender.com
✗ Ambos backends fallaron
Error mostrado al usuario: "No se pudo conectar con ningún servidor. Por favor verifica tu conexión a internet."
```

## Configuración

Si necesitas cambiar las URLs o timeouts, edita el archivo `src/services/api.js`:

```javascript
// URLs de los backends (prioridad: local -> desplegado)
const API_LOCAL = 'http://localhost:5000';
const API_DEPLOYED = 'https://cierre-caja-api.onrender.com';
const API_TIMEOUT = 5000; // 5 segundos de timeout para el backend local
```

## Archivo Modificado

- **`src/services/api.js`** - Contiene toda la lógica de fallback y manejo de peticiones

## Funciones Principales

### `fetchWithTimeout(url, options, timeout)`
Realiza un fetch con timeout configurable para evitar esperas infinitas.

### `authenticatedFetch(endpoint, options)`
Función principal que implementa el sistema de fallback. Todas las peticiones de la app usan esta función.

### `submitCashClosing(payload)`
Función específica para enviar el cierre de caja, usa `authenticatedFetch` internamente.

## Notas Importantes

- El sistema **siempre prioriza el backend local** para desarrollo
- Los timeouts son diferentes: 5s para local, 30s para desplegado
- El sistema **recuerda** qué backend funcionó para optimizar futuras peticiones
- Puedes ver logs en la consola del navegador para debugging
