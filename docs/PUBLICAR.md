# Publicar Adaptaula en GitHub Pages

Una sola vez (unos 10 minutos). Después, cada vez que subas cambios se publica sola.

## 0. Colocar el archivo de publicación

Mueve `docs\publicar.yml` a `.github\workflows\publicar.yml` (crea las dos carpetas; la primera empieza por punto).
Es el que compila y publica la web. No he podido dejarlo ahí yo: Windows protege las carpetas que empiezan por punto
frente a herramientas externas.

## 1. Crear el repositorio

1. En GitHub: **New repository**.
   - Nombre: `adaptaula` (la web quedará en `https://TU-USUARIO.github.io/adaptaula/`).
   - **Public** (GitHub Pages gratis solo funciona con repositorios públicos).
   - No marques README, .gitignore ni licencia: ya vienen en el proyecto.
2. Sube la carpeta `C:\Proyectos\adaptaula` a ese repositorio, en la rama `main`
   (con SourceTree: *Create local repository* sobre la carpeta → commit → añade el remoto → push).

> Antes del primer commit, comprueba que **no** hay exámenes reales (.docx) dentro de la carpeta.
> El `.gitignore` ya excluye `node_modules/`, `dist/` los `.docx` y una carpeta `examenes/` por si los guardas ahí.

## 2. Activar GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Ve a la pestaña **Actions**: verás «Publicar en GitHub Pages» en marcha (si no, pulsa *Run workflow*).
4. En 1-2 minutos estará en verde y la web en `https://TU-USUARIO.github.io/adaptaula/`.

Si el paso de tests falla, la web no se publica (así nunca se sube una versión rota).

## 3. Actualizar

Cambia lo que quieras, commit y push a `main`. Se vuelve a publicar sola.
Sube también la versión en `package.json` (`"version"`), que aparece en Ajustes → Acerca de.

## Notas

- **Privacidad:** no hay servidor ni cuentas. Los exámenes y la configuración quedan solo en el navegador.
- **Clave de Gemini:** se introduce en Ajustes dentro de la app; nunca va en el repositorio.
- **Instalar como app (opcional):** en Chrome/Edge, icono de «Instalar» en la barra de direcciones.
