# README Frontend

## Objetivo
Documentar el deploy del frontend a Firebase Hosting para publicar cambios rapido y de forma repetible.

## Estado actual del proyecto
- Proyecto Firebase: `licoreria-firebase-2026` (definido en `/Users/alonsosantamaria/Desktop/LICORERIA/.firebaserc`).
- Hosting sirve archivos desde `maqueta_visualizador` (definido en `/Users/alonsosantamaria/Desktop/LICORERIA/firebase.json`).
- El backend (`maqueta_visualizador/backend/**`) y archivos sensibles (`.env*`) ya estan excluidos del deploy de Hosting.

## Requisitos previos
1. Node.js 18+ y npm.
2. Firebase CLI instalado globalmente:
   ```bash
   npm install -g firebase-tools
   ```
3. Login en Firebase:
   ```bash
   firebase login
   ```
4. Estar ubicado en:
   ```bash
   cd /Users/alonsosantamaria/Desktop/LICORERIA
   ```

## Flujo recomendado de deploy
1. Validar que los cambios de frontend estan en `maqueta_visualizador/` (HTML, CSS, JS, componentes, paginas).
2. (Opcional) Probar hosting local:
   ```bash
   firebase emulators:start --only hosting
   ```
3. Publicar a produccion:
   ```bash
   firebase deploy --only hosting
   ```
4. Verificar en el dominio de Firebase Hosting.

## Comandos utiles
```bash
# Ver proyecto activo
firebase use

# Listar sitios de hosting del proyecto
firebase hosting:sites:list

# Deploy directo de hosting (comando principal)
firebase deploy --only hosting
```

## Que SI y que NO se despliega
Si se despliega:
- `maqueta_visualizador/index.html`
- `maqueta_visualizador/app.js`
- `maqueta_visualizador/styles.css`
- `maqueta_visualizador/components/**`
- `maqueta_visualizador/pages/**`

No se despliega (por `ignore`):
- `maqueta_visualizador/backend/**`
- `maqueta_visualizador/server.js`
- `maqueta_visualizador/productos_db.js`
- `maqueta_visualizador/.env*`
- `**/node_modules/**`

## Nota de arquitectura
Firebase Hosting aqui se usa para frontend estatico. El backend Node.js se despliega aparte en tu servidor/cPanel (ver `/Users/alonsosantamaria/Desktop/LICORERIA/README_BACKEND.md`).
