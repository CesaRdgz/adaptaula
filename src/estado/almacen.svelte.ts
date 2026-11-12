/** Estado global persistido en el navegador (IndexedDB). */
import { createStore, del, get, set } from 'idb-keyval';
import { edicionVacia, type Edicion } from '../lib/adaptar';
import { ordenar } from '../lib/catalogo';
import type { Examen } from '../lib/examen';
import { CONFIGURACIONES_BASE, TODAS, type Configuracion, type Opciones } from '../lib/opciones';

const db = createStore('adaptaula', 'datos');

export interface Ajustes {
  claveIA: string;
  modeloIA: string;
}

export const AJUSTES_INICIALES: Ajustes = { claveIA: '', modeloIA: 'gemini-flash-latest' };

class Almacen {
  cargado = $state(false);
  examenes = $state<Examen[]>([]);
  ediciones = $state<Record<string, Edicion>>({});
  opciones = $state<Record<string, Opciones>>({});
  configuraciones = $state<Configuracion[]>([]);
  ajustes = $state<Ajustes>({ ...AJUSTES_INICIALES });
  private urls = new Map<string, string>();
  private blobs = new Map<string, Blob>();

  async cargar() {
    try {
      const [ex, ed, op, conf, aj] = await Promise.all([
        get<Examen[]>('examenes', db), get('ediciones', db), get('opciones', db), get('configuraciones', db), get('ajustes', db),
      ]);
      this.examenes = ex ?? [];
      this.ediciones = (ed as Record<string, Edicion>) ?? {};
      this.opciones = (op as Record<string, Opciones>) ?? {};
      this.configuraciones = (conf as Configuracion[]) ?? [];
      this.ajustes = { ...AJUSTES_INICIALES, ...((aj as Ajustes) ?? {}) };
    } catch (e) {
      console.warn('No se pudo leer el almacenamiento del navegador', e);
    }
    this.cargado = true;
  }

  async guardarCatalogo(examenes: Examen[], imagenes: Map<string, Blob>) {
    for (const [src, blob] of imagenes) await set(`img:${src}`, blob, db);
    // Se mezclan con los que ya hubiera (un examen con el mismo id se sustituye; sus ediciones se conservan)
    const porId = new Map(this.examenes.map((e) => [e.id, e]));
    for (const e of examenes) porId.set(e.id, e);
    this.examenes = ordenar([...porId.values()]);
    await set('examenes', $state.snapshot(this.examenes), db);
    this.urls.clear();
    this.blobs.clear();
  }

  async borrarCatalogo() {
    this.examenes = [];
    await del('examenes', db);
  }

  async imagen(src: string): Promise<Blob | undefined> {
    if (!this.blobs.has(src)) {
      const b = await get<Blob>(`img:${src}`, db);
      if (b) this.blobs.set(src, b);
    }
    return this.blobs.get(src);
  }

  async urlImagen(src: string): Promise<string | undefined> {
    if (this.urls.has(src)) return this.urls.get(src);
    const b = await this.imagen(src);
    if (!b) return undefined;
    const u = URL.createObjectURL(b);
    this.urls.set(src, u);
    return u;
  }

  edicion(id: string): Edicion {
    return this.ediciones[id] ?? edicionVacia();
  }

  async guardarEdicion(id: string, ed: Edicion) {
    this.ediciones[id] = ed;
    await set('ediciones', $state.snapshot(this.ediciones), db);
  }

  opcionesDe(id: string): Opciones {
    return { ...TODAS, ...(this.opciones[id] ?? {}) };
  }

  async guardarOpciones(id: string, o: Opciones) {
    this.opciones[id] = o;
    await set('opciones', $state.snapshot(this.opciones), db);
  }

  get todasConfiguraciones(): Configuracion[] {
    return [...CONFIGURACIONES_BASE, ...this.configuraciones];
  }

  async guardarConfiguracion(nombre: string, opciones: Opciones) {
    this.configuraciones = [...this.configuraciones.filter((c) => c.nombre !== nombre), { nombre, opciones, propia: true }];
    await set('configuraciones', $state.snapshot(this.configuraciones), db);
  }

  async borrarConfiguracion(nombre: string) {
    this.configuraciones = this.configuraciones.filter((c) => c.nombre !== nombre);
    await set('configuraciones', $state.snapshot(this.configuraciones), db);
  }

  async guardarAjustes(a: Ajustes) {
    this.ajustes = a;
    await set('ajustes', $state.snapshot(a), db);
  }
}

export const almacen = new Almacen();
