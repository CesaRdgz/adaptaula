/** Adaptaciones que el docente puede activar, y configuraciones guardadas. */

export interface Opciones {
  // A. Formato visual
  tamLetra: number; // puntos
  interlineado: number;
  fuente: string;
  negritaClave: boolean;
  separarEjercicios: boolean;
  recuadroInstrucciones: boolean;
  evitarCortes: boolean;
  // B. Enunciados (las propuestas de la IA se aceptan una a una; esto decide si se usan)
  usarSimplificados: boolean;
  // D. Espacios de respuesta
  espaciosRespuesta: boolean;
  cuadriculas: boolean;
  espacioAmplio: boolean;
  // E. Problemas
  problemaGuiado: boolean;
  destacarDatos: boolean;
}

export const FUENTES = ['Arial', 'Verdana', 'Century Gothic', 'Comic Sans MS'] as const;

export const TODAS: Opciones = {
  tamLetra: 14,
  interlineado: 1.5,
  fuente: 'Arial',
  negritaClave: true,
  separarEjercicios: true,
  recuadroInstrucciones: true,
  evitarCortes: true,
  usarSimplificados: true,
  espaciosRespuesta: true,
  cuadriculas: true,
  espacioAmplio: true,
  problemaGuiado: true,
  destacarDatos: true,
};

/** Cómo se ve el examen sin adaptar (para comparar). */
export const ORIGINAL: Opciones = {
  tamLetra: 11,
  interlineado: 1.15,
  fuente: 'Arial',
  negritaClave: false,
  separarEjercicios: false,
  recuadroInstrucciones: false,
  evitarCortes: false,
  usarSimplificados: false,
  espaciosRespuesta: false,
  cuadriculas: false,
  espacioAmplio: false,
  problemaGuiado: false,
  destacarDatos: false,
};

export interface Configuracion {
  nombre: string;
  opciones: Opciones;
  propia?: boolean;
}

export const CONFIGURACIONES_BASE: Configuracion[] = [
  { nombre: 'Todas las adaptaciones', opciones: TODAS },
  {
    nombre: 'Solo formato visual',
    opciones: { ...ORIGINAL, tamLetra: 14, interlineado: 1.5, negritaClave: true, separarEjercicios: true, recuadroInstrucciones: true, evitarCortes: true },
  },
  {
    nombre: 'Formato y espacios de respuesta',
    opciones: { ...TODAS, usarSimplificados: false },
  },
];

/** Etiquetas para la interfaz, agrupadas como en la especificación. */
export const GRUPOS: { titulo: string; casillas: { clave: keyof Opciones; texto: string; ayuda?: string }[] }[] = [
  {
    titulo: 'Formato visual',
    casillas: [
      { clave: 'negritaClave', texto: 'Palabras clave en negrita', ayuda: 'Los verbos de cada instrucción (calcula, escribe, une…) y lo que marque la IA.' },
      { clave: 'separarEjercicios', texto: 'Separar los ejercicios', ayuda: 'Cada ejercicio en su propio bloque, con más espacio entre ellos.' },
      { clave: 'recuadroInstrucciones', texto: 'Instrucciones en recuadro' },
      { clave: 'evitarCortes', texto: 'No partir preguntas entre páginas' },
    ],
  },
  {
    titulo: 'Enunciados',
    casillas: [{ clave: 'usarSimplificados', texto: 'Usar los enunciados simplificados', ayuda: 'Solo los que hayas aceptado o editado.' }],
  },
  {
    titulo: 'Espacios de respuesta',
    casillas: [
      { clave: 'espaciosRespuesta', texto: 'Líneas y recuadros para responder' },
      { clave: 'cuadriculas', texto: 'Cuadrícula para las operaciones' },
      { clave: 'espacioAmplio', texto: 'Espacios más amplios' },
    ],
  },
  {
    titulo: 'Problemas',
    casillas: [
      { clave: 'problemaGuiado', texto: 'Apartados Datos · Operación · Solución' },
      { clave: 'destacarDatos', texto: 'Destacar los datos (números)' },
    ],
  },
];
