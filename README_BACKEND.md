# README Backend

## Objetivo
Definir un plan claro para sincronizar y desplegar el backend en tu servidor cPanel usando:
- `Git Version Control` (sincronizacion de codigo)
- `Setup Node.js App` (instalar dependencias, variables y restart)

## Contexto actual de tu backend
- Entrada de Node app: `/Users/alonsosantamaria/Desktop/LICORERIA/maqueta_visualizador/server.js`
- Servidor real: `/Users/alonsosantamaria/Desktop/LICORERIA/maqueta_visualizador/backend/server.js`
- Variables de entorno esperadas: `/Users/alonsosantamaria/Desktop/LICORERIA/maqueta_visualizador/.env`
- Dependencias: `/Users/alonsosantamaria/Desktop/LICORERIA/maqueta_visualizador/package.json`
- El backend crea logs en `../logs/last_session.log` relativo a `maqueta_visualizador/backend`.

## Que debes sincronizar al servidor
Recomendado: sincronizar toda la carpeta `maqueta_visualizador/` para mantener consistencia.

Minimo obligatorio:
- `maqueta_visualizador/server.js`
- `maqueta_visualizador/backend/**`
- `maqueta_visualizador/package.json`
- `maqueta_visualizador/package-lock.json`

Si quieres que tambien sirva estaticos desde Node:
- `maqueta_visualizador/index.html`
- `maqueta_visualizador/app.js`
- `maqueta_visualizador/styles.css`
- `maqueta_visualizador/components/**`
- `maqueta_visualizador/functions/**`
- `maqueta_visualizador/pages/**`

No sincronizar por git:
- `.env`
- logs
- cualquier secreto

## Plan de implementacion (sincronizacion + deploy)
1. Crear/usar repo git del proyecto (rama estable: `main`).
2. En cPanel > `Git Version Control`, conectar ese repo y dejar checkout en una ruta de trabajo, por ejemplo:
   - `/home/escon/apps/licoreria-backend`
3. En cPanel > `Setup Node.js App`:
   - Application root: `/home/escon/apps/licoreria-backend/maqueta_visualizador`
   - Startup file: `server.js`
   - Version de Node: LTS compatible (18 o 20)
   - Variables de entorno: cargar todas las de `.env` desde el panel (no en git)
4. Ejecutar `npm ci --omit=dev` dentro de la app.
5. Reiniciar la app desde `Setup Node.js App`.
6. Verificar endpoint de salud sugerido: `GET /api/db/status`.

## Archivos que conviene crear para automatizar
1. `/Users/alonsosantamaria/Desktop/LICORERIA/ops/backend/deploy_backend.sh`
2. `/Users/alonsosantamaria/Desktop/LICORERIA/.github/workflows/deploy-backend.yml` (opcional, para full auto)
3. `/Users/alonsosantamaria/Desktop/LICORERIA/.gitignore` (si aun no existe, para excluir `.env`, logs y temporales)

## Script sugerido de deploy (servidor)
Guia para `ops/backend/deploy_backend.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/escon/apps/licoreria-backend"
APP_DIR="$REPO_DIR/maqueta_visualizador"
LOG_DIR="$REPO_DIR/logs"
BRANCH="main"

echo "[deploy] sync repo"
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] install deps"
cd "$APP_DIR"
npm ci --omit=dev

echo "[deploy] ensure logs dir"
mkdir -p "$LOG_DIR"
touch "$LOG_DIR/last_session.log"

echo "[deploy] restart node app (desde cPanel Setup Node.js App)"
echo "Listo: ahora pulsa Restart en Setup Node.js App o ejecuta el comando de restart del panel."
```

## Secuencia operativa diaria (la rapida)
1. Haces cambios localmente en backend.
2. `git add`, `git commit`, `git push origin main`.
3. En servidor: ejecutar script de deploy (manual o via pipeline).
4. Reinicio de Node.js App.
5. Prueba funcional en `/api/db/status` y rutas principales (`/api/productos`, `/api/ventas`).

## Plan de automatizacion total (sin pasos manuales)
1. Crear llave SSH de deploy (solo lectura de repo + acceso al servidor).
2. Configurar secrets en GitHub Actions (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`).
3. Workflow al hacer push a `main` (solo si cambian rutas backend):
   - conecta por SSH
   - ejecuta `deploy_backend.sh`
   - reinicia app
   - valida `GET /api/db/status`

## Checklist de seguridad
- No subir `.env` al repositorio.
- Rotar credenciales que ya hayan estado en archivos versionados.
- Separar credenciales de produccion vs pruebas.
- Restringir permisos de llave SSH al usuario de deploy.

## Nota de separacion Frontend/Backend
- La carpeta `maqueta_visualizador/functions/**` es frontend (logica JS del navegador), no backend.
- La carpeta `maqueta_visualizador/pages/**` ahora es adaptadora de frontend (no contiene la logica principal).
- El backend real se mantiene en `maqueta_visualizador/backend/**` y su entrada de app en `maqueta_visualizador/server.js`.
