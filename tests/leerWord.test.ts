import { describe, expect, it } from 'vitest';
import { esWord } from '../src/lib/leerWord';

describe('esWord', () => {
  it('acepta .docx y rechaza el resto', () => {
    expect(esWord('Examen Tema 3.DOCX')).toBe(true);
    expect(esWord('examen.doc')).toBe(false);
    expect(esWord('examen.pdf')).toBe(false);
  });
});
