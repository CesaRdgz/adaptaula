/** Importación del catálogo de exámenes (carpeta con .examen.json + imagenes/) y lectura de archivos soltados. */
import { validarExamen, type Examen } from './examen';

export interface ArchivoSuelto {
  /** Ruta relativa dentro de lo que se soltó, con "/" (p. ej. "examenes/imagenes/t04-B-01.png"). */
  ruta: string;
  archivo: File;
}

export interface ResultadoImportacion {
  examenes: Examen[];
  imagenes: Map<string, Blob>;
  errores: string[];
}

/** Orden del curso: inicial, temas (B antes que A), trimestres. */
export function ordenar(xs: Examen[]): Examen[] {
  const clave = (x: Examen) => [{ inicial: 0, tema: 1, trimestre: 2 }[x.tipo], x.tema ?? x.trimestre ?? 0, x.modelo === 'A' ? 1 : 0];
  return [...xs].sort((a, b) => {
    const ka = clave(a), kb = clave(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}

/** Lee los archivos soltados y devuelve los exámenes válidos con sus imágenes. */
export async function importar(archivos: ArchivoSuelto[]): Promise<ResultadoImportacion> {
  const examenes: Examen[] = [];
  const errores: string[] = [];
  const imagenes = new Map<string, Blob>();
  for (const { ruta, archivo } of archivos) {
    if (!ruta.endsWith('.examen.json')) continue;
    try {
      const x = JSON.parse(await archivo.text());
      const e = validarExamen(x);
      if (e.length) errores.push(`${nombre(ruta)}: ${e.slice(0, 3).join('; ')}`);
      else examenes.push(x as Examen);
    } catch {
      errores.push(`${nombre(ruta)}: no es un JSON válido`);
    }
  }
  // Imágenes: se buscan por el final de la ruta ("imagenes/xxx.png"), dé igual cómo se llame la carpeta de arriba
  const porFinal = new Map(archivos.map((a) => [a.ruta.split('/').slice(-2).join('/'), a.archivo]));
  for (const ex of examenes) {
    for (const src of imagenesDe(ex)) {
      const f = porFinal.get(src);
      if (f) imagenes.set(src, f);
      else errores.push(`${ex.id}: falta la imagen ${src}`);
    }
  }
  if (!examenes.length && !errores.length) errores.push('No hay ningún archivo .examen.json en lo que has soltado.');
  return { examenes: ordenar(examenes), imagenes, errores };
}

const nombre = (r: string) => r.split('/').pop() ?? r;

export function imagenesDe(ex: Examen): string[] {
  const bloques = [
    ...(ex.contexto ?? []),
    ...ex.ejercicios.flatMap((e) => [...(e.contexto ?? []), ...e.apartados.flatMap((a) => a.contexto ?? [])]),
  ];
  return [...new Set(bloques.flatMap((b) => (b.tipo === 'imagen' ? [b.src] : [])))];
}

/** Recorre lo soltado en la ventana (archivos o carpetas completas). */
export async function leerSoltado(dt: DataTransfer): Promise<ArchivoSuelto[]> {
  const entradas = [...dt.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (!entradas.length) return [...dt.files].map((f) => ({ ruta: f.name, archivo: f }));
  const out: ArchivoSuelto[] = [];
  for (const e of entradas) await recorrer(e, '', out);
  return out;
}

async function recorrer(e: FileSystemEntry, base: string, out: ArchivoSuelto[]) {
  const ruta = base ? `${base}/${e.name}` : e.name;
  if (e.isFile) {
    const archivo = await new Promise<File>((ok, ko) => (e as FileSystemFileEntry).file(ok, ko));
    out.push({ ruta, archivo });
  } else if (e.isDirectory) {
    const lector = (e as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const lote = await new Promise<FileSystemEntry[]>((ok, ko) => lector.readEntries(ok, ko));
      if (!lote.length) break;
      for (const h of lote) await recorrer(h, ruta, out);
    }
  }
}

/** Archivos elegidos con <input webkitdirectory> o múltiple. */
export function leerInput(files: FileList): ArchivoSuelto[] {
  return [...files].map((f) => ({ ruta: f.webkitRelativePath || f.name, archivo: f }));
}
