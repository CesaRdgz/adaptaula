/** Genera el Word (.docx) editable a partir de la hoja adaptada. */
import {
  AlignmentType, BorderStyle, Document, HeightRule, ImageRun, LineRuleType, Packer, Paragraph, ShadingType, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType, type IBorderOptions, type ParagraphChild,
} from 'docx';
import type { ApartadoHoja, EjercicioHoja, Espacio, Hoja, Texto } from './adaptar';
import type { Bloque, Respuesta, Tabla } from './examen';

export interface ImagenDatos {
  data: ArrayBuffer;
  ancho: number; // px
  alto: number; // px
  tipo: 'png' | 'jpg';
}

const MM = 56.7; // twips por mm
const ANCHO_UTIL_MM = 170; // A4 con márgenes de 2 cm
const CELDA_MM = 7;
const GRIS = 'A6A6A6';
const SUAVE = 'F2F2F2';

const borde = (color = '000000', size = 6): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const sinBorde: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const bordes = (b: IBorderOptions) => ({ top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b });

export async function exportarWord(h: Hoja, imagen: (src: string) => Promise<ImagenDatos | undefined>): Promise<Blob> {
  const o = h.opciones;
  const pt = o.tamLetra;
  const linea = Math.round(240 * o.interlineado);
  const juntos = o.evitarCortes;

  const run = (t: string, extra: { bold?: boolean; size?: number; underline?: boolean; color?: string } = {}) =>
    new TextRun({ text: t, bold: extra.bold, size: (extra.size ?? pt) * 2, font: o.fuente, color: extra.color, underline: extra.underline ? {} : undefined });

  const runsTexto = (t: Texto, pre?: ParagraphChild[]) =>
    t.map((lin, i) => [...(i === 0 && pre ? pre : []), ...lin.map((tr) => run(tr.t, { bold: tr.b }))]);

  const parrafo = (children: ParagraphChild[], extra: Partial<ConstructorParameters<typeof Paragraph>[0] & object> = {}) =>
    new Paragraph({ children, spacing: { line: linea, after: 80 }, keepNext: juntos, keepLines: juntos, ...extra });

  const tablaSimple = (t: Tabla, celdaAltaMm = 0) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: bordes(borde(GRIS)),
      rows: [
        ...(t.cabecera ? [t.cabecera] : []).map(
          (f) => new TableRow({ cantSplit: true, tableHeader: true, children: f.map((c) => celda(c, true)) }),
        ),
        ...t.filas.map(
          (f) =>
            new TableRow({
              cantSplit: true,
              height: celdaAltaMm ? { value: celdaAltaMm * MM, rule: HeightRule.ATLEAST } : undefined,
              children: f.map((c, i) => celda(c, i === 0 && !!t.cabecera && f.length > 1 && c !== '')),
            }),
        ),
      ],
    });

  const celda = (c: string, cab: boolean) =>
    new TableCell({
      shading: cab ? { type: ShadingType.CLEAR, fill: 'E7E6E6', color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: [run(c, { bold: cab })], spacing: { line: linea } })],
    });

  async function bloques(bs: Bloque[]): Promise<(Paragraph | Table)[]> {
    const out: (Paragraph | Table)[] = [];
    for (const b of bs) {
      if (b.tipo === 'titulo') out.push(parrafo([run(b.texto, { bold: true, size: pt + 2 })]));
      else if (b.tipo === 'texto') out.push(parrafo(runsTexto([[{ t: b.texto }]])[0]));
      else if (b.tipo === 'lista') for (const it of b.items) out.push(parrafo([run('•  ' + it)], { indent: { left: 360 } }));
      else if (b.tipo === 'tabla') out.push(tablaSimple(b.tabla), parrafo([]));
      else if (b.tipo === 'imagen') {
        const img = await imagen(b.src);
        if (!img) continue;
        const anchoMm = Math.min(b.anchoMm, ANCHO_UTIL_MM);
        const w = (anchoMm / 25.4) * 96;
        out.push(
          new Paragraph({
            children: [new ImageRun({ type: img.tipo, data: img.data, transformation: { width: w, height: (w * img.alto) / img.ancho }, altText: { name: b.alt, description: b.alt, title: b.alt } })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 120 },
            keepNext: juntos,
          }),
        );
      }
    }
    return out;
  }

  // Líneas para escribir: filas de tabla con solo el borde inferior (los párrafos con borde Word los agrupa en uno)
  const lineasEscribir = (n: number) => {
    const raya = borde(GRIS, 4);
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: sinBorde, left: sinBorde, right: sinBorde, insideVertical: sinBorde, bottom: raya, insideHorizontal: raya },
        rows: Array.from({ length: n }, () =>
          new TableRow({
            cantSplit: true,
            height: { value: (o.espacioAmplio ? 11 : 9) * MM, rule: HeightRule.EXACT },
            children: [new TableCell({ children: [new Paragraph({ children: [] })] })],
          }),
        ),
      }),
    ];
  };

  const hueco = (altoMm: number) => [new Paragraph({ children: [], spacing: { line: Math.round(altoMm * MM), lineRule: LineRuleType.EXACT, after: 0 }, keepNext: juntos })];

  const recuadro = (altoMm: number, contenido: (Paragraph | Table)[] = [new Paragraph({ children: [] })]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: bordes(borde('000000', 8)),
      rows: [new TableRow({ cantSplit: true, height: { value: altoMm * MM, rule: HeightRule.ATLEAST }, children: [new TableCell({ children: contenido })] })],
    });

  const cuadricula = (filas: number, anchoMm = ANCHO_UTIL_MM) => {
    const cols = Math.floor(anchoMm / CELDA_MM);
    return new Table({
      layout: TableLayoutType.FIXED,
      width: { size: cols * CELDA_MM * MM, type: WidthType.DXA },
      columnWidths: Array(cols).fill(CELDA_MM * MM),
      borders: bordes(borde('BFBFBF', 4)),
      rows: Array.from({ length: filas }, () =>
        new TableRow({
          cantSplit: true,
          height: { value: CELDA_MM * MM, rule: HeightRule.EXACT },
          children: Array.from({ length: cols }, () => new TableCell({ children: [new Paragraph({ children: [] })] })),
        }),
      ),
    });
  };

  const etiqueta = (t: string) => new Paragraph({ children: [run(t, { bold: true })], spacing: { after: 40 }, keepNext: true });

  function espacio(e: Espacio): (Paragraph | Table)[] {
    switch (e.tipo) {
      case 'ninguno':
        return [];
      case 'lineas':
        return lineasEscribir(e.n);
      case 'libre':
        return hueco(e.altoMm);
      case 'recuadro':
        return [recuadro(e.altoMm)];
      case 'cuadricula':
        return [cuadricula(e.filas)];
      case 'problema': {
        const ancho = ANCHO_UTIL_MM - 6;
        const fila = (titulo: string, contenido: (Paragraph | Table)[], alto: number) =>
          new TableRow({
            cantSplit: true,
            height: { value: alto * MM, rule: HeightRule.ATLEAST },
            children: [new TableCell({ margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [etiqueta(titulo), ...contenido] })],
          });
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: bordes(borde('000000', 8)),
            rows: [
              fila('Datos', [new Paragraph({ children: [] })], 22),
              fila('Operación', e.cuadricula ? [cuadricula(e.filasOperacion, ancho), new Paragraph({ children: [] })] : [new Paragraph({ children: [] })], e.cuadricula ? 0 : e.filasOperacion * CELDA_MM),
              fila('Solución', [new Paragraph({ children: [] })], 16),
            ],
          }),
        ];
      }
    }
  }

  function respuestaEnLinea(r: Respuesta): (Paragraph | Table)[] {
    switch (r.tipo) {
      case 'completar':
        return r.plantilla.split('\n').map((l) =>
          parrafo(
            l.split('___').flatMap((trozo, i) => [
              ...(i > 0 ? [run(' ' + '_'.repeat(o.espacioAmplio ? 16 : 11) + ' ')] : []),
              ...(trozo ? [run(trozo)] : []),
            ]),
            { spacing: { line: Math.round(linea * 1.3), after: 120 } },
          ),
        );
      case 'tabla':
        return [tablaSimple(r.tabla, o.espaciosRespuesta ? (o.espacioAmplio ? 12 : 10) : 0), parrafo([])];
      case 'unir': {
        const n = Math.max(r.izquierda.length, r.derecha.length);
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: bordes(sinBorde),
            columnWidths: [45, 10, 45].map((p) => (p * ANCHO_UTIL_MM * MM) / 100),
            rows: Array.from({ length: n }, (_, i) =>
              new TableRow({
                cantSplit: true,
                height: { value: 12 * MM, rule: HeightRule.ATLEAST },
                children: [
                  new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run((r.izquierda[i] ?? '') + (r.izquierda[i] ? '  ●' : ''))] })] }),
                  new TableCell({ children: [new Paragraph({ children: [] })] }),
                  new TableCell({ children: [new Paragraph({ children: [run((r.derecha[i] ? '●  ' : '') + (r.derecha[i] ?? ''))] })] }),
                ],
              }),
            ),
          }),
        ];
      }
      case 'elegir':
        return [parrafo(r.opciones.flatMap((op, i) => [run((i ? '      ' : '') + '○ '), run(op)]))];
      default:
        return [];
    }
  }

  async function apartado(a: ApartadoHoja): Promise<(Paragraph | Table)[]> {
    const out: (Paragraph | Table)[] = [];
    const pre = a.marca ? [run(`${a.marca}) `, { bold: true })] : undefined;
    for (const r of runsTexto(a.texto, pre)) out.push(parrafo(r, { indent: { left: a.marca ? 0 : 0 } }));
    out.push(...(await bloques(a.contexto)));
    out.push(...respuestaEnLinea(a.respuesta));
    out.push(...espacio(a.espacio));
    out.push(new Paragraph({ children: [], spacing: { after: o.separarEjercicios ? 160 : 60 }, keepNext: false }));
    return out;
  }

  async function ejercicio(e: EjercicioHoja): Promise<(Paragraph | Table)[]> {
    const out: (Paragraph | Table)[] = [];
    const num = run(`${e.numero}.  `, { bold: true, size: pt + 1 });
    const enun = runsTexto(e.enunciado, [num]).map((r) => parrafo(r, { spacing: { line: linea, after: 60 } }));
    if (o.recuadroInstrucciones) {
      out.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: bordes(borde('7F7F7F', 8)),
          rows: [new TableRow({ cantSplit: true, children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: SUAVE, color: 'auto' }, margins: { top: 100, bottom: 60, left: 140, right: 140 }, children: enun })] })],
        }),
        parrafo([], { spacing: { after: 60 } }),
      );
    } else out.push(...enun);
    out.push(...(await bloques(e.contexto)));
    for (const a of e.apartados) if (!a.oculto) out.push(...(await apartado(a)));
    if (o.separarEjercicios)
      out.push(new Paragraph({ children: [], border: { bottom: borde('D9D9D9', 6) }, spacing: { after: 280 } }));
    return out;
  }

  const cuerpo: (Paragraph | Table)[] = [
    new Paragraph({ children: [run(h.titulo, { bold: true, size: pt + 4 })], spacing: { after: 200 } }),
    new Paragraph({ children: [run('Nombre: ' + '_'.repeat(Math.round(500 / pt)) + '   Fecha: ' + '_'.repeat(Math.round(160 / pt)))], spacing: { after: 300 } }),
    ...(await bloques(h.contexto)),
    new Paragraph({ children: [], spacing: { after: 200 } }),
  ];
  for (const e of h.ejercicios) if (!e.oculto) cuerpo.push(...(await ejercicio(e)));

  const doc = new Document({
    creator: 'Adaptaula',
    title: h.titulo,
    styles: { default: { document: { run: { font: o.fuente, size: pt * 2 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: cuerpo }],
  });
  return Packer.toBlob(doc);
}
