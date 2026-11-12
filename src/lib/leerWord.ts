import mammoth from 'mammoth';

/** Lee un .docx y devuelve su contenido como HTML (con imágenes en línea). El archivo original no se toca. */
export async function leerWord(datos: ArrayBuffer): Promise<{ html: string; avisos: string[] }> {
  const r = await mammoth.convertToHtml({ arrayBuffer: datos });
  return { html: r.value, avisos: r.messages.map((m) => m.message) };
}

export function esWord(nombre: string): boolean {
  return nombre.toLowerCase().endsWith('.docx');
}
