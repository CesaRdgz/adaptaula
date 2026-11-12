/** Simplificación de enunciados con la API de Gemini. Solo se envía el texto del examen (nunca datos de alumnos). */
import { revisarPropuesta, textosSimplificables, type Propuesta } from './adaptar';
import type { Examen } from './examen';

const INSTRUCCIONES = `Eres especialista en adaptaciones curriculares de acceso para alumnado de Educación Primaria (dificultades de lectura, atención o comprensión).
Vas a reescribir enunciados de un examen de {AREA} de {CURSO} para que sean más fáciles de entender, SIN cambiar lo que se evalúa.

Reglas obligatorias:
- Frases cortas, vocabulario sencillo y orden directo (sujeto, verbo, complemento).
- Di exactamente qué tiene que hacer el alumno. Usa verbos en imperativo al principio.
- Si una instrucción tiene varias acciones, sepárala en pasos numerados, uno por línea: "1. ...\\n2. ...".
- Quita información que no haga falta para responder, pero CONSERVA TODOS LOS DATOS: todos los números, unidades, nombres y cantidades deben seguir apareciendo exactamente igual escritos.
- No cambies la operación matemática que se evalúa, no des pistas, no digas qué operación hay que hacer si el original no lo dice, no reveles ni sugieras la respuesta.
- Evita dobles negaciones y expresiones ambiguas.
- Marca con **doble asterisco** las 1-3 palabras clave de cada texto (la acción y el dato principal).
- Si un texto ya es corto y claro, devuélvelo igual (solo con las negritas).
- Escribe en español de España.

Responde SOLO con un JSON: una lista de objetos {"ruta": "...", "texto": "..."}, uno por cada texto recibido, con la misma ruta.`;

export interface SolicitudIA {
  clave: string;
  modelo: string;
}

export async function simplificar(ex: Examen, s: SolicitudIA, rutas?: string[]): Promise<Record<string, Propuesta>> {
  if (!s.clave.trim()) throw new Error('Falta la clave de la API de Gemini (Ajustes).');
  const textos = textosSimplificables(ex).filter((t) => !rutas || rutas.includes(t.ruta));
  if (!textos.length) return {};
  const contexto = (ex.contexto ?? []).map((b) => ('texto' in b ? b.texto : b.tipo === 'lista' ? b.items.join('; ') : '')).filter(Boolean).join(' ');
  const prompt =
    INSTRUCCIONES.replace('{AREA}', ex.area).replace('{CURSO}', ex.curso) +
    `\n\nSituación del examen (solo como contexto, no la reescribas): ${contexto || '—'}\n\nTextos (los de ruta "eN" son la instrucción del ejercicio N; "eN.aM" son sus apartados):\n` +
    JSON.stringify(textos.map(({ ruta, texto }) => ({ ruta, texto })), null, 1);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.modelo)}:generateContent`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.clave.trim() },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!r.ok) {
    const det = await r.text().catch(() => '');
    if (r.status === 400 && /API key/i.test(det)) throw new Error('La clave de Gemini no es válida. Revísala en Ajustes.');
    if (r.status === 403) throw new Error('La clave de Gemini no tiene permiso. Revísala en Ajustes.');
    if (r.status === 404) throw new Error(`El modelo «${s.modelo}» no existe. Cámbialo en Ajustes.`);
    if (r.status === 429) throw new Error('Se ha alcanzado el límite gratuito de Gemini por ahora. Prueba dentro de un rato.');
    throw new Error(`Gemini respondió con un error (${r.status}).`);
  }
  const datos = await r.json();
  const salida: string = datos?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  return interpretar(salida, textos);
}

/** Convierte la respuesta de la IA en propuestas, revisadas. Exportada para los tests. */
export function interpretar(salida: string, textos: { ruta: string; texto: string }[]): Record<string, Propuesta> {
  let lista: unknown;
  try {
    lista = JSON.parse(salida.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new Error('La IA no ha devuelto una respuesta válida. Vuelve a intentarlo.');
  }
  if (!Array.isArray(lista)) throw new Error('La IA no ha devuelto una lista. Vuelve a intentarlo.');
  const orig = new Map(textos.map((t) => [t.ruta, t.texto]));
  const out: Record<string, Propuesta> = {};
  for (const it of lista as { ruta?: unknown; texto?: unknown }[]) {
    if (typeof it?.ruta !== 'string' || typeof it?.texto !== 'string' || !orig.has(it.ruta)) continue;
    const original = orig.get(it.ruta)!;
    const texto = it.texto.trim();
    if (!texto || texto.replace(/\*\*/g, '') === original) continue; // sin cambios: no hace falta revisar nada
    out[it.ruta] = { original, texto, estado: 'pendiente', avisos: revisarPropuesta(original, texto) };
  }
  return out;
}
