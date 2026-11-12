import { describe, expect, it } from 'vitest';
import { adaptar, edicionVacia, espacioPara, prepararTexto, revisarPropuesta, textosSimplificables } from '../src/lib/adaptar';
import type { Examen } from '../src/lib/examen';
import { ORIGINAL, TODAS } from '../src/lib/opciones';

const EX: Examen = {
  formato: 1, id: 'x', titulo: 'Prueba', tipo: 'tema', curso: '4.º', area: 'Mates', fuente: { documento: 'd', paginas: [1] },
  ejercicios: [
    { numero: 1, enunciado: 'Lee y resuelve.', apartados: [
      { texto: 'Juan tiene 12 canicas y regala 5. ¿Cuántas le quedan?', respuesta: { tipo: 'problema' } },
      { texto: '¿Y si regala 3 €?', respuesta: { tipo: 'problema' } },
    ] },
    { numero: 2, enunciado: 'Escribe la lectura.', apartados: [{ texto: '', respuesta: { tipo: 'lineas', lineas: 2 } }] },
    { numero: 3, enunciado: 'Completa.', apartados: [{ texto: '', respuesta: { tipo: 'completar', plantilla: '5 cm = ___ mm' } }] },
  ],
};

const negritas = (t: ReturnType<typeof prepararTexto>) => t.flat().filter((x) => x.b).map((x) => x.t);

describe('prepararTexto', () => {
  it('pone en negrita los verbos de instrucción', () => {
    expect(negritas(prepararTexto('Lee y resuelve.', { clave: true, datos: false }))).toEqual(['Lee', 'resuelve']);
    expect(negritas(prepararTexto('Lee y resuelve.', { clave: false, datos: false }))).toEqual([]);
    expect(negritas(prepararTexto('Escribe cómo se lee el número.', { clave: true, datos: false }))).toEqual(['Escribe']);
    expect(negritas(prepararTexto('Observa los datos y, después, calcula.', { clave: true, datos: false }))).toEqual(['Observa', 'calcula']);
  });
  it('destaca los datos con su unidad sin tocar palabras', () => {
    expect(negritas(prepararTexto('Pagó 3,50 € por 2 cajas de 1.350 m', { clave: false, datos: true }))).toEqual(['3,50 €', '2 cajas', '1.350 m']);
    expect(negritas(prepararTexto('Hay 12 manzanas', { clave: false, datos: true }))).toEqual(['12']);
  });
  it('respeta las negritas explícitas y los saltos de línea', () => {
    const t = prepararTexto('1. Mira la **tabla**.\n2. Suma.', { clave: true, datos: false });
    expect(t).toHaveLength(2);
    expect(negritas(t)).toEqual(['tabla', 'Suma']);
    expect(t[0][0].t).toBe('• Mira la ');
  });
});

describe('adaptar', () => {
  it('renumera al quitar ejercicios y aplica textos editados', () => {
    const ed = edicionVacia();
    ed.ocultos.push('e1');
    ed.textos['e2'] = 'Escribe cómo se lee.';
    const h = adaptar(EX, TODAS, ed);
    expect(h.ejercicios.map((e) => [e.oculto, e.numero])).toEqual([[true, 0], [false, 1], [false, 2]]);
    expect(h.ejercicios[1].enunciadoPlano).toBe('Escribe cómo se lee.');
  });
  it('usa propuestas aceptadas solo si la opción está activa', () => {
    const ed = edicionVacia();
    ed.propuestas['e1.a1'] = { original: '', texto: 'Juan tiene **12** canicas.', estado: 'aceptada', avisos: [] };
    expect(adaptar(EX, TODAS, ed).ejercicios[0].apartados[0].textoPlano).toBe('Juan tiene 12 canicas.');
    expect(adaptar(EX, ORIGINAL, ed).ejercicios[0].apartados[0].textoPlano).toContain('regala 5');
    ed.propuestas['e1.a1'].estado = 'rechazada';
    expect(adaptar(EX, TODAS, ed).ejercicios[0].apartados[0].textoPlano).toContain('regala 5');
  });
  it('pone letras solo cuando hay varios apartados con texto', () => {
    const h = adaptar(EX, TODAS);
    expect(h.ejercicios[0].apartados.map((a) => a.marca)).toEqual(['a', 'b']);
    expect(h.ejercicios[1].apartados[0].marca).toBe('');
  });
});

describe('espacioPara', () => {
  it('elige el espacio según el tipo de respuesta', () => {
    expect(espacioPara(EX.ejercicios[0].apartados[0], TODAS).tipo).toBe('problema');
    expect(espacioPara(EX.ejercicios[0].apartados[0], { ...TODAS, problemaGuiado: false }).tipo).toBe('cuadricula');
    expect(espacioPara(EX.ejercicios[0].apartados[0], ORIGINAL).tipo).toBe('libre');
    expect(espacioPara(EX.ejercicios[1].apartados[0], TODAS)).toEqual({ tipo: 'lineas', n: 3 });
    expect(espacioPara(EX.ejercicios[1].apartados[0], TODAS, 2)).toEqual({ tipo: 'lineas', n: 5 });
    expect(espacioPara(EX.ejercicios[2].apartados[0], TODAS).tipo).toBe('ninguno');
  });
});

describe('IA', () => {
  it('lista enunciados y apartados con texto, sin plantillas', () => {
    expect(textosSimplificables(EX).map((x) => x.ruta)).toEqual(['e1', 'e1.a1', 'e1.a2', 'e2', 'e3']);
  });
  it('avisa si una propuesta cambia los números', () => {
    expect(revisarPropuesta('Tiene 12 y regala 5.', '1. Tiene **12**.\n2. Regala **5**.')).toEqual([]);
    expect(revisarPropuesta('Tiene 12 y regala 5.', 'Tiene 12 y regala 6.')).toEqual(['Falta 5', 'Aparece 6, que no está en el original']);
  });
});

import { interpretar } from '../src/lib/ia';

describe('interpretar respuesta de la IA', () => {
  const textos = [{ ruta: 'e1', texto: 'Observa los datos y resuelve.' }, { ruta: 'e1.a1', texto: 'Juan tiene 12 canicas y regala 5.' }];
  it('crea propuestas pendientes revisadas e ignora rutas desconocidas o sin cambios', () => {
    const r = interpretar(
      '```json\n[{"ruta":"e1","texto":"Observa los datos y resuelve."},{"ruta":"e1.a1","texto":"Juan tiene **12** canicas. Regala 6."},{"ruta":"zz","texto":"x"}]\n```',
      textos,
    );
    expect(Object.keys(r)).toEqual(['e1.a1']);
    expect(r['e1.a1'].estado).toBe('pendiente');
    expect(r['e1.a1'].avisos[0]).toContain('Falta 5');
  });
  it('da un error claro si la respuesta no es JSON', () => {
    expect(() => interpretar('lo siento', textos)).toThrow(/respuesta válida/);
  });
});
