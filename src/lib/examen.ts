/**
 * Formato de un examen ya extraído y estructurado (archivo .examen.json).
 *
 * La idea: el original se pasa una sola vez a esta estructura (qué es enunciado, qué son datos,
 * qué tipo de respuesta espera cada apartado). A partir de aquí la app adapta y maqueta desde cero.
 */

export const VERSION_FORMATO = 1;

export interface Examen {
  formato: typeof VERSION_FORMATO;
  /** Identificador estable: "inicial", "t01-A", "tr2-B"… */
  id: string;
  titulo: string;
  tipo: 'inicial' | 'tema' | 'trimestre';
  tema?: number;
  trimestre?: 1 | 2 | 3;
  /** Modelo A (más completo) o B (más guiado) del cuaderno. */
  modelo?: 'A' | 'B';
  curso: string;
  area: string;
  /** Situación de partida que abre el examen (título, texto, datos, imagen). */
  contexto?: Bloque[];
  ejercicios: Ejercicio[];
  fuente: { documento: string; paginas: number[] };
}

export interface Ejercicio {
  numero: number;
  /** Instrucción principal, tal como está en el original. */
  enunciado: string;
  /** Material propio del ejercicio: texto de situación, tabla de datos, imagen… */
  contexto?: Bloque[];
  apartados: Apartado[];
}

export interface Apartado {
  /** Pregunta o elemento concreto. Vacío si el ejercicio tiene una sola respuesta sin pregunta propia. */
  texto: string;
  /** Material propio del apartado (p. ej. la imagen de un reloj). */
  contexto?: Bloque[];
  respuesta: Respuesta;
}

export type Respuesta =
  /** Respuesta escrita en líneas. */
  | { tipo: 'lineas'; lineas: number }
  /** Problema: la adaptación puede añadir Datos / Operación / Solución y cuadrícula. */
  | { tipo: 'problema' }
  /** Cálculo directo (operación en vertical, división con prueba…). */
  | { tipo: 'calculo' }
  /** Texto con huecos: cada "___" es un hueco. */
  | { tipo: 'completar'; plantilla: string }
  /** Tabla en la que hay que rellenar las celdas vacías (''). */
  | { tipo: 'tabla'; tabla: Tabla }
  /** Unir con flechas elementos de dos columnas. */
  | { tipo: 'unir'; izquierda: string[]; derecha: string[] }
  /** Rodear / marcar entre opciones. */
  | { tipo: 'elegir'; opciones: string[] }
  /** Dibujar, trazar, colorear o representar sobre la figura o en un espacio libre. */
  | { tipo: 'dibujo' }
  /** Respuesta de una palabra o un número. */
  | { tipo: 'corta' };

export type Bloque =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'lista'; items: string[] }
  | { tipo: 'tabla'; tabla: Tabla }
  /**
   * src relativo a la carpeta del catálogo (imagenes/…). anchoMm: ancho impreso en el original.
   * medir: el alumno tiene que medir sobre la figura, así que se imprime siempre a tamaño real.
   */
  | { tipo: 'imagen'; src: string; alt: string; anchoMm: number; medir?: boolean };

export interface Tabla {
  cabecera?: string[];
  /** Celdas: '' significa celda a rellenar por el alumno. */
  filas: string[][];
}

/** Comprueba la estructura y devuelve los errores encontrados (vacío = válido). */
export function validarExamen(x: unknown): string[] {
  const e: string[] = [];
  const ex = x as Examen;
  if (!ex || typeof ex !== 'object') return ['No es un objeto'];
  if (ex.formato !== VERSION_FORMATO) e.push(`formato distinto de ${VERSION_FORMATO}`);
  for (const k of ['id', 'titulo', 'curso', 'area'] as const) if (!ex[k]) e.push(`falta ${k}`);
  if (!['inicial', 'tema', 'trimestre'].includes(ex.tipo)) e.push('tipo no válido');
  if (!Array.isArray(ex.ejercicios) || ex.ejercicios.length === 0) e.push('sin ejercicios');
  ex.contexto?.forEach((b, i) => validarBloque(b, `contexto[${i}]`, e));
  ex.ejercicios?.forEach((ej, i) => {
    const p = `ejercicio ${ej.numero ?? i + 1}`;
    if (ej.numero !== i + 1) e.push(`${p}: numeración no correlativa`);
    if (!ej.enunciado?.trim()) e.push(`${p}: sin enunciado`);
    if (!Array.isArray(ej.apartados) || ej.apartados.length === 0) e.push(`${p}: sin apartados`);
    ej.contexto?.forEach((b, j) => validarBloque(b, `${p} contexto[${j}]`, e));
    ej.apartados?.forEach((a, j) => {
      const q = `${p} apartado ${j + 1}`;
      if (typeof a.texto !== 'string') e.push(`${q}: texto no es cadena`);
      a.contexto?.forEach((b, k) => validarBloque(b, `${q} contexto[${k}]`, e));
      validarRespuesta(a.respuesta, q, e);
    });
  });
  return e;
}

function validarTabla(t: Tabla | undefined, p: string, e: string[]) {
  if (!t || !Array.isArray(t.filas) || t.filas.length === 0) return e.push(`${p}: tabla vacía`);
  const n = t.cabecera?.length ?? t.filas[0].length;
  t.filas.forEach((f, i) => f.length !== n && e.push(`${p}: fila ${i + 1} con ${f.length} celdas (esperadas ${n})`));
}

function validarBloque(b: Bloque, p: string, e: string[]) {
  switch (b?.tipo) {
    case 'titulo':
    case 'texto':
      if (!b.texto?.trim()) e.push(`${p}: texto vacío`);
      break;
    case 'lista':
      if (!b.items?.length) e.push(`${p}: lista vacía`);
      break;
    case 'tabla':
      validarTabla(b.tabla, p, e);
      break;
    case 'imagen':
      if (!b.src || !b.alt || !(b.anchoMm > 0)) e.push(`${p}: imagen sin src, alt o anchoMm`);
      break;
    default:
      e.push(`${p}: bloque desconocido`);
  }
}

function validarRespuesta(r: Respuesta, p: string, e: string[]) {
  switch (r?.tipo) {
    case 'lineas':
      if (!(r.lineas >= 1)) e.push(`${p}: líneas no válidas`);
      break;
    case 'completar':
      if (!r.plantilla?.includes('___')) e.push(`${p}: plantilla sin huecos`);
      break;
    case 'tabla':
      validarTabla(r.tabla, p, e);
      break;
    case 'unir':
      if (!r.izquierda?.length || !r.derecha?.length) e.push(`${p}: unir sin columnas`);
      break;
    case 'elegir':
      if (!(r.opciones?.length >= 2)) e.push(`${p}: elegir con menos de 2 opciones`);
      break;
    case 'problema':
    case 'calculo':
    case 'dibujo':
    case 'corta':
      break;
    default:
      e.push(`${p}: respuesta desconocida`);
  }
}
