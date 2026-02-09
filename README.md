# Licoreria AQP

README principal del estado actual del proyecto y como se conecta todo.

## Estado actual (resumen)
- Frontend y backend conviven dentro de `maqueta_visualizador/`.
- El frontend fue modularizado: `app.js` orquesta; la logica por dominio vive en `functions/`; `pages/` es capa adaptadora.
- El backend real sigue en `maqueta_visualizador/backend/` (no en `functions/`).
- `custom-functions.js` frontend ya fue movido a `maqueta_visualizador/functions/custom-functions.js`.

## Arquitectura actual

### Frontend
- Orquestador:
  - `maqueta_visualizador/app.js`
- Logica por objeto:
  - `maqueta_visualizador/functions/products-functions.js`
  - `maqueta_visualizador/functions/sales-functions.js`
  - `maqueta_visualizador/functions/kardex-functions.js`
  - `maqueta_visualizador/functions/settings-functions.js`
  - `maqueta_visualizador/functions/custom-functions.js`
- Adaptadores (pages):
  - `maqueta_visualizador/pages/products-page.js`
  - `maqueta_visualizador/pages/sales-page.js`
  - `maqueta_visualizador/pages/kardex-page.js`
  - `maqueta_visualizador/pages/settings-page.js`
- Componentes de render:
  - `maqueta_visualizador/components/*.js`

### Backend
- Entrada de app:
  - `maqueta_visualizador/server.js`
- API y objetos de servidor:
  - `maqueta_visualizador/backend/server.js`
  - `maqueta_visualizador/backend/objects/**`
- Utilidades backend:
  - `maqueta_visualizador/backend/custom-functions.js`

## Orden de carga frontend (index.html)
En `maqueta_visualizador/index.html` se carga en este orden:
1. `functions/custom-functions.js`
2. `components/*.js`
3. `functions/*-functions.js`
4. `pages/*.js`
5. `app.js`

Esto permite que `app.js` use `window.*Page`, y cada `*Page` use `window.*Functions`.

## Documentacion complementaria
- Frontend deploy y estructura: `README_FRONTEND.md`
- Backend deploy y sincronizacion cPanel/Git: `README_BACKEND.md`

## Validacion tecnica realizada
- Referencias entre archivos revisadas.
- Validacion de sintaxis JS con `node --check` en `app.js`, `functions/*.js` y `pages/*.js`.

## Nota de cache
Si subes cambios y no los ves en navegador, usa recarga dura:
- macOS: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`
