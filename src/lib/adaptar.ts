/**
 * Convierte un examen + adaptaciones elegidas + cambios del docente en una "hoja" lista para pintar
 * (en pantalla, al imprimir o en Word). Lógica pura: sin DOM.
 */
import type { Apartado, Bloque, Ejercicio, Examen, Respuesta } from './examen';
import type { Opciones } from './opciones';

/** Cambios del docente sobre un examen. Las rutas son "e3" (ejercicio 3) o "e3.a2" (apartado 2 del ejercicio 3). */
export interface Edicion {
  /** Texto escrito a mano por el docente (manda sobre todo lo demás). */
  textos: Record<string, string>;
  /** Ejercicios o apartados quitados (se pueden recuperar). */
  ocultos: string[];
  /** Propuestas de la IA. */
  propuestas: Record<string, Propuesta>;
  /** Ajuste del espacio de respuesta por apartado: -2 … +4 pasos. */
  espacio: Record<string, number>;
}

export interface Propuesta {
  original: string;
  texto: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  /** Avisos de la comprobación automática (p. ej. cambia un número). */
  avisos: string[];
}

export const edicionVacia = (): Edicion => ({ textos: {}, ocultos: [], propuestas: {}, espacio: {} });

/** Trozo de texto, en negrita o no. */
export interface Trozo {
  t: string;
  b?: boolean;
}
/** Texto ya preparado: lista de líneas, cada una con sus trozos. */
export type Texto = Trozo[][];

export type Espacio =
  | { tipo: 'ninguno' }
  | { tipo: 'lineas'; n: number }
  | { tipo: 'libre'; altoMm: number }
  | { tipo: 'recuadro'; altoMm: number }
  | { tipo: 'cuadricula'; filas: number }
  | { tipo: 'problema'; filasOperacion: number; cuadricula: boolean };

export interface ApartadoHoja {
  ruta: string;
  oculto: boolean;
  /** Letra o viñeta del apartado (a, b, c…), vacía si es el único apartado sin texto. */
  marca: string;
  texto: Texto;
  textoPlano: string;
  contexto: Bloque[];
  respuesta: Respuesta;
  espacio: Espacio;
  ajusteEspacio: number;
  propuesta?: Propuesta;
  editado: boolean;
}

export interface EjercicioHoja {
  ruta: string;
  oculto: boolean;
  numero: number;
  numeroOriginal: number;
  enunciado: Texto;
  enunciadoPlano: string;
  contexto: Bloque[];
  apartados: ApartadoHoja[];
  propuesta?: Propuesta;
  editado: boolean;
}

export interface Hoja {
  titulo: string;
  contexto: Bloque[];
  ejercicios: EjercicioHoja[];
  opciones: Opciones;
}

// Verbos con los que empiezan las instrucciones de Primaria (imperativo).
const VERBOS = [
  'aplica', 'aproxima', 'averigua', 'busca', 'calcula', 'clasifica', 'clasifícalo', 'clasifícalos', 'colorea', 'completa', 'comprueba',
  'contesta', 'descompón', 'describe', 'dibuja', 'divide', 'escribe', 'escríbelo', 'estima', 'explica', 'expresa', 'fíjate', 'haz', 'indica',
  'inventa', 'justifica', 'lee', 'marca', 'mide', 'mídelo', 'multiplica', 'observa', 'ordena', 'ordénalos', 'piensa', 'redondea', 'representa',
  'resta', 'resuelve', 'resuélvelos', 'reescribe', 'reescríbelas', 'responde', 'rodea', 'suma', 'traza', 'une', 'utiliza', 'anota',
];
// Solo cuentan al principio de frase o detrás de «y», «e», «o» o una coma (así «cómo se lee» no se marca)
const RE_VERBO = new RegExp(`(^\\s*|[.:;!?¿¡(«"]\\s*|,\\s+|\\s[yeo]\\s+|•\\s*)(${VERBOS.join('|')})(?=[\\s,.:;!?)»"]|$)`, 'giu');
// Números con su unidad, si la hay (12 €, 1.350 m, 2/3, 08:25, 1 h y 15 min…).
const UNIDADES = '€|cts?\\.?|km|hm|dam|m|dm|cm|mm|kl|hl|dal|l|ℓ|dl|cl|ml|t|q|kg|hg|dag|g|dg|cg|mg|h|min|s|personas|piezas|cajas|paquetes|briks|yogures|rollos|botes|folios|gemas|rocas|aceitunas|fresas|frambuesas';
const RE_DATO = new RegExp(`\\d+(?:[.,:/]\\d+)*(?:\\s?(?:${UNIDADES})(?![\\p{L}]))?`, 'giu');

/** Marca un texto: **negrita** explícita, verbos clave y datos numéricos según las opciones. */
export function prepararTexto(texto: string, o: { clave: boolean; datos: boolean }): Texto {
  const lineas = texto.split('\n').filter((l, i, a) => l.trim() !== '' || a.length === 1);
  return lineas
    // Los pasos "1. 2. 3." se muestran con viñetas para no confundirlos con el número del ejercicio
    .map((l) => (lineas.length > 1 ? l.replace(/^\s*\d+[.)]\s+/, '• ') : l))
    .map((linea) => {
      // 1) Negritas explícitas (**así**), que vienen de la IA o del docente
      const base: Trozo[] = [];
      const partes = linea.split(/(\*\*[^*]+\*\*)/g);
      for (const p of partes) {
        if (!p) continue;
        if (p.startsWith('**') && p.endsWith('**')) base.push({ t: p.slice(2, -2), b: o.clave || o.datos });
        else base.push({ t: p });
      }
      // 2) Verbos y datos sobre los trozos que no están ya en negrita
      const patrones: RegExp[] = [];
      if (o.clave) patrones.push(RE_VERBO);
      if (o.datos) patrones.push(RE_DATO);
      let res = base;
      for (const re of patrones) res = res.flatMap((tr) => (tr.b ? [tr] : resaltar(tr.t, re)));
      return unir(res);
    });
}

function resaltar(t: string, re: RegExp): Trozo[] {
  const out: Trozo[] = [];
  let ult = 0;
  re.lastIndex = 0;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    // En RE_VERBO el grupo 1 es el separador previo, que no va en negrita
    const pre = m.length > 2 ? (m[1] ?? '') : '';
    const ini = m.index + pre.length;
    const fin = m.index + m[0].length;
    if (ini > ult) out.push({ t: t.slice(ult, ini) });
    out.push({ t: t.slice(ini, fin), b: true });
    ult = fin;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (ult < t.length) out.push({ t: t.slice(ult) });
  return out;
}

function unir(tr: Trozo[]): Trozo[] {
  const out: Trozo[] = [];
  for (const x of tr) {
    if (!x.t) continue;
    const prev = out[out.length - 1];
    if (prev && !!prev.b === !!x.b) prev.t += x.t;
    else out.push({ ...x });
  }
  return out;
}

export const textoPlano = (t: string) => t.replace(/\*\*/g, '');

/** Texto vigente de una ruta: lo editado a mano > propuesta aceptada (si se usan) > original. */
export function textoVigente(ruta: string, original: string, ed: Edicion, o: Opciones): string {
  if (ed.textos[ruta] !== undefined) return ed.textos[ruta];
  const p = ed.propuestas[ruta];
  if (o.usarSimplificados && p?.estado === 'aceptada') return p.texto;
  return original;
}

const tieneImagen = (b?: Bloque[]) => !!b?.some((x) => x.tipo === 'imagen');

/** Espacio de respuesta según el tipo de respuesta y las opciones. */
export function espacioPara(a: Apartado, o: Opciones, ajuste = 0): Espacio {
  const amplio = o.espacioAmplio ? 1 : 0;
  const k = 1 + 0.25 * ajuste; // cada paso de ajuste = ±25 %
  const mm = (x: number) => Math.max(8, Math.round(x * (o.espacioAmplio ? 1.4 : 1) * k));
  const r = a.respuesta;
  switch (r.tipo) {
    case 'lineas': {
      const n = Math.max(1, r.lineas + amplio + ajuste);
      return o.espaciosRespuesta ? { tipo: 'lineas', n } : { tipo: 'libre', altoMm: mm(r.lineas * 8) };
    }
    case 'problema':
      if (o.problemaGuiado) return { tipo: 'problema', filasOperacion: Math.max(3, 4 + amplio + ajuste), cuadricula: o.cuadriculas };
      if (o.cuadriculas) return { tipo: 'cuadricula', filas: Math.max(3, 5 + amplio + ajuste) };
      return { tipo: 'libre', altoMm: mm(35) };
    case 'calculo':
      if (o.cuadriculas) return { tipo: 'cuadricula', filas: Math.max(3, 4 + amplio + ajuste) };
      return { tipo: 'libre', altoMm: mm(30) };
    case 'dibujo':
      if (tieneImagen(a.contexto) && ajuste <= 0) return { tipo: 'ninguno' };
      return o.espaciosRespuesta ? { tipo: 'recuadro', altoMm: mm(tieneImagen(a.contexto) ? 20 : 55) } : { tipo: 'libre', altoMm: mm(45) };
    case 'corta':
      return o.espaciosRespuesta ? { tipo: 'recuadro', altoMm: mm(12) } : { tipo: 'lineas', n: 1 };
    default:
      return ajuste > 0 ? { tipo: 'libre', altoMm: 10 * ajuste } : { tipo: 'ninguno' };
  }
}

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

export function adaptar(ex: Examen, o: Opciones, ed: Edicion = edicionVacia()): Hoja {
  const ocultos = new Set(ed.ocultos);
  const marcar = (t: string, esProblema: boolean) =>
    prepararTexto(t, { clave: o.negritaClave, datos: o.destacarDatos && esProblema });
  let n = 0;
  const ejercicios = ex.ejercicios.map((ej: Ejercicio): EjercicioHoja => {
    const ruta = `e${ej.numero}`;
    const oculto = ocultos.has(ruta);
    const enun = textoVigente(ruta, ej.enunciado, ed, o);
    const variosConTexto = ej.apartados.filter((a) => a.texto.trim()).length > 1;
    let letra = 0;
    const apartados = ej.apartados.map((a, i): ApartadoHoja => {
      const r = `${ruta}.a${i + 1}`;
      const ocA = ocultos.has(r);
      const t = textoVigente(r, a.texto, ed, o);
      const esProblema = a.respuesta.tipo === 'problema' || a.respuesta.tipo === 'calculo';
      return {
        ruta: r,
        oculto: ocA,
        marca: a.texto.trim() && variosConTexto && !ocA ? LETRAS[letra++] : '',
        texto: t.trim() ? marcar(t, esProblema) : [],
        textoPlano: textoPlano(t),
        contexto: a.contexto ?? [],
        respuesta: a.respuesta,
        espacio: espacioPara(a, o, ed.espacio[r] ?? 0),
        ajusteEspacio: ed.espacio[r] ?? 0,
        propuesta: ed.propuestas[r],
        editado: ed.textos[r] !== undefined,
      };
    });
    return {
      ruta,
      oculto,
      numero: oculto ? 0 : ++n,
      numeroOriginal: ej.numero,
      enunciado: marcar(enun, false),
      enunciadoPlano: textoPlano(enun),
      contexto: ej.contexto ?? [],
      apartados,
      propuesta: ed.propuestas[ruta],
      editado: ed.textos[ruta] !== undefined,
    };
  });
  return { titulo: ex.titulo, contexto: ex.contexto ?? [], ejercicios, opciones: o };
}

/** Lista de textos de un examen que se pueden simplificar (para la IA). */
export function textosSimplificables(ex: Examen): { ruta: string; texto: string; tipo: 'enunciado' | 'apartado' }[] {
  return ex.ejercicios.flatMap((ej) => [
    { ruta: `e${ej.numero}`, texto: ej.enunciado, tipo: 'enunciado' as const },
    ...ej.apartados
      .map((a, i) => ({ ruta: `e${ej.numero}.a${i + 1}`, texto: a.texto, tipo: 'apartado' as const }))
      .filter((x) => x.texto.trim() && !x.texto.includes('___')),
  ]);
}

/** Números que aparecen en un texto (para comprobar que la IA no los cambia). */
export function numeros(t: string): string[] {
  return (t.match(/\d+(?:[.,:/]\d+)*/g) ?? []).sort();
}

/** Comprueba una propuesta frente al original y devuelve avisos. */
export function revisarPropuesta(original: string, propuesta: string): string[] {
  const avisos: string[] = [];
  const a = numeros(original);
  // Los números de los pasos ("1. ", "2. ") que añade la IA no cuentan
  const b = numeros(textoPlano(propuesta).replace(/^\s*\d+\.\s/gm, ''));
  const faltan = a.filter((x) => !b.includes(x));
  const sobran = b.filter((x) => !a.includes(x));
  if (faltan.length) avisos.push(`Falta${faltan.length > 1 ? 'n' : ''} ${faltan.join(', ')}`);
  if (sobran.length) avisos.push(sobran.length > 1 ? `Aparecen ${sobran.join(', ')}, que no están en el original` : `Aparece ${sobran[0]}, que no está en el original`);
  if (textoPlano(propuesta).length > original.length * 1.8 + 40) avisos.push('Es bastante más largo que el original');
  return avisos;
}
