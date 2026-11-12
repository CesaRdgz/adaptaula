# Adaptaula

Genera **versiones adaptadas de exámenes y fichas de Educación Primaria** a partir del documento Word original
del profesor. No crea exámenes nuevos: mantiene los contenidos, los objetivos y lo que se quiere evaluar, y
cambia solo la forma de presentar y de responder.

Pensada para una docente, en el **ordenador o la tablet**. Sin servidor ni cuentas: todo se guarda en el navegador.

## Cómo se usa

1. **Una sola vez:** arrastra a la ventana la carpeta `examenes` (queda guardada en el navegador).
2. Elige el examen (inicial, tema y modelo, o trimestral).
3. Marca las adaptaciones en el panel de la izquierda, o elige una configuración guardada.
4. Si quieres enunciados más sencillos: **Proponer enunciados más sencillos (IA)** y acepta, rechaza o edita cada propuesta.
5. Pasa el ratón por la hoja para editar un texto, quitar (y recuperar) un ejercicio o apartado, o cambiar su espacio.
6. **Comparar** muestra el original y el adaptado lado a lado.
7. **Descargar Word** (editable) o **Imprimir o guardar PDF**.

Todo se guarda solo: al volver a un examen están tus cambios. El original nunca se modifica.

Especificación completa en [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md).

## Decisiones

- **Entrada:** los exámenes del curso se pasan **una sola vez** a un formato estructurado (`.examen.json`:
  qué es enunciado, qué son datos y qué tipo de respuesta espera cada apartado) y la app trabaja sobre eso.
  El Word de la editorial está convertido desde PDF (cuadros flotantes, líneas partidas), así que leerlo
  directamente cada vez daría malos resultados. El lector de Word queda para exámenes propios.
- **IA:** API de Gemini (nivel gratuito). La clave se introduce en Ajustes y se guarda solo en el navegador.
  Solo se usa para la parte de enunciados (simplificar, dividir en pasos, ejercicios repetitivos);
  el formato visual y los espacios de respuesta no necesitan IA.
- **Privacidad:** nunca se envían nombres de alumnos a la IA.
- **Publicación:** web estática (GitHub Pages), instalable como PWA.

## Desarrollo

Requiere Node 22.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # tests de la lógica (Vitest)
npm run check     # tipos (svelte-check)
npm run build     # → dist/
```

**Stack:** Svelte 5 + TypeScript + Vite. Sin backend. Lectura de Word con mammoth.

```
src/
  lib/          lógica pura en TypeScript (con tests)
    examen.ts       formato .examen.json y su validador
    opciones.ts     adaptaciones disponibles y configuraciones de base
    adaptar.ts      examen + opciones + cambios del docente → hoja adaptada (negritas, espacios, numeración)
    ia.ts           propuestas de enunciados con Gemini y su comprobación (no cambiar datos)
    exportarWord.ts hoja adaptada → .docx
    catalogo.ts     importación de la carpeta de exámenes
    leerWord.ts     lectura de un .docx (para exámenes propios, aún sin usar)
  estado/       almacenamiento en el navegador (IndexedDB)
  pantallas/    Inicio (catálogo), Examen, Ajustes
  componentes/  la hoja y sus piezas
  componentes/  piezas reutilizables
tests/          Vitest (si existe examenes/, valida todo el catálogo)
examenes/       catálogo de exámenes extraídos (NO se sube: copyright)
docs/           especificación y guía de publicación
```

Publicación en GitHub Pages: [docs/PUBLICAR.md](docs/PUBLICAR.md).

## Aviso

Proyecto personal sin ánimo de lucro. No subas exámenes reales al repositorio.

Código bajo licencia MIT.
