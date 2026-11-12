import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarExamen, type Bloque, type Examen } from '../src/lib/examen';

// Los exámenes no están en el repositorio (copyright de la editorial). Si la carpeta existe, se comprueban todos.
const CARPETA = join(__dirname, '..', 'examenes');
const archivos = existsSync(CARPETA) ? readdirSync(CARPETA).filter((f) => f.endsWith('.examen.json')) : [];

function imagenes(ex: Examen): string[] {
  const bloques: Bloque[] = [
    ...(ex.contexto ?? []),
    ...ex.ejercicios.flatMap((e) => [...(e.contexto ?? []), ...e.apartados.flatMap((a) => a.contexto ?? [])]),
  ];
  return bloques.flatMap((b) => (b.tipo === 'imagen' ? [b.src] : []));
}

describe.skipIf(archivos.length === 0)('catálogo de exámenes', () => {
  it.each(archivos)('%s es válido y sus imágenes existen', (f) => {
    const ex = JSON.parse(readFileSync(join(CARPETA, f), 'utf8')) as Examen;
    expect(validarExamen(ex)).toEqual([]);
    expect(f).toBe(`${ex.id}.examen.json`);
    for (const src of imagenes(ex)) expect(existsSync(join(CARPETA, src)), src).toBe(true);
  });

  it('los identificadores no se repiten', () => {
    const ids = archivos.map((f) => JSON.parse(readFileSync(join(CARPETA, f), 'utf8')).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validarExamen', () => {
  it('detecta errores de estructura', () => {
    expect(validarExamen({ formato: 1, id: 'x', titulo: 'x', tipo: 'tema', curso: 'c', area: 'a', ejercicios: [] })).toContain('sin ejercicios');
    expect(
      validarExamen({
        formato: 1, id: 'x', titulo: 'x', tipo: 'tema', curso: 'c', area: 'a',
        ejercicios: [{ numero: 1, enunciado: 'E', apartados: [{ texto: '', respuesta: { tipo: 'completar', plantilla: 'sin hueco' } }] }],
      }),
    ).toEqual(['ejercicio 1 apartado 1: plantilla sin huecos']);
  });
});
