<script lang="ts">
  import HojaVista, { type Acciones } from '../componentes/HojaVista.svelte';
  import { almacen } from '../estado/almacen.svelte';
  import { adaptar, edicionVacia, type Edicion } from '../lib/adaptar';
  import { exportarWord, type ImagenDatos } from '../lib/exportarWord';
  import { simplificar } from '../lib/ia';
  import { FUENTES, GRUPOS, ORIGINAL, type Opciones } from '../lib/opciones';

  import { untrack } from 'svelte';

  let { id }: { id: string } = $props();
  // La pantalla se vuelve a crear al cambiar de examen ({#key} en App), así que basta el valor inicial
  const idInicial = untrack(() => id);

  const examen = $derived(almacen.examenes.find((e) => e.id === id));
  let opciones = $state<Opciones>(almacen.opcionesDe(idInicial));
  let edicion = $state<Edicion>(structuredClone($state.snapshot(almacen.edicion(idInicial))));
  let vista = $state<'adaptado' | 'comparar' | 'original'>('adaptado');
  let iaEstado = $state<'' | 'trabajando' | 'hecho'>('');
  let iaError = $state('');
  let exportando = $state(false);

  const hoja = $derived(examen ? adaptar(examen, opciones, edicion) : null);
  const hojaOriginal = $derived(examen ? adaptar(examen, ORIGINAL, edicionVacia()) : null);
  const pendientes = $derived(Object.values(edicion.propuestas).filter((p) => p.estado === 'pendiente').length);
  const conAvisos = $derived(Object.values(edicion.propuestas).filter((p) => p.estado === 'pendiente' && p.avisos.length).length);
  const quitados = $derived(hoja ? hoja.ejercicios.filter((e) => e.oculto).length + hoja.ejercicios.flatMap((e) => e.apartados).filter((a) => a.oculto).length : 0);

  // Guardado automático
  $effect(() => {
    const o = $state.snapshot(opciones);
    untrack(() => almacen.guardarOpciones(idInicial, o));
  });
  function guardarEdicion() {
    almacen.guardarEdicion(id, $state.snapshot(edicion));
  }

  const acciones: Acciones = {
    alternarOculto(ruta) {
      edicion.ocultos = edicion.ocultos.includes(ruta) ? edicion.ocultos.filter((r) => r !== ruta) : [...edicion.ocultos, ruta];
      guardarEdicion();
    },
    editar(ruta, texto) {
      if (texto === null || texto === '') delete edicion.textos[ruta];
      else edicion.textos[ruta] = texto;
      guardarEdicion();
    },
    espacio(ruta, d) {
      edicion.espacio[ruta] = Math.max(-2, Math.min(4, (edicion.espacio[ruta] ?? 0) + d));
      guardarEdicion();
    },
    decidir(ruta, estado) {
      const p = edicion.propuestas[ruta];
      if (p) p.estado = estado;
      guardarEdicion();
    },
  };

  function decidirTodas(estado: 'aceptada' | 'rechazada') {
    for (const p of Object.values(edicion.propuestas)) if (p.estado === 'pendiente') p.estado = estado;
    guardarEdicion();
  }

  async function pedirIA() {
    if (!examen) return;
    iaError = '';
    iaEstado = 'trabajando';
    try {
      const nuevas = await simplificar(examen, { clave: almacen.ajustes.claveIA, modelo: almacen.ajustes.modeloIA });
      // Las decisiones ya tomadas se mantienen; solo se sustituyen las pendientes o las nuevas
      for (const [r, p] of Object.entries(nuevas)) {
        const vieja = edicion.propuestas[r];
        if (!vieja || vieja.estado === 'pendiente' || vieja.estado === 'rechazada') edicion.propuestas[r] = p;
      }
      opciones.usarSimplificados = true;
      guardarEdicion();
      iaEstado = 'hecho';
    } catch (e) {
      iaError = e instanceof Error ? e.message : String(e);
      iaEstado = '';
    }
  }

  function aplicarConfiguracion(nombre: string) {
    const c = almacen.todasConfiguraciones.find((x) => x.nombre === nombre);
    if (c) opciones = { ...c.opciones };
  }
  async function guardarConfiguracion() {
    const nombre = prompt('Nombre de esta configuración (por ejemplo, «Para Lucía»):')?.trim();
    if (nombre) await almacen.guardarConfiguracion(nombre, $state.snapshot(opciones));
  }

  async function datosImagen(src: string): Promise<ImagenDatos | undefined> {
    const b = await almacen.imagen(src);
    if (!b) return undefined;
    const bmp = await createImageBitmap(b);
    const r = { data: await b.arrayBuffer(), ancho: bmp.width, alto: bmp.height, tipo: (b.type.includes('jpeg') ? 'jpg' : 'png') as 'jpg' | 'png' };
    bmp.close();
    return r;
  }

  async function descargarWord() {
    if (!hoja || !examen) return;
    exportando = true;
    try {
      const blob = await exportarWord($state.snapshot(hoja) as typeof hoja, datosImagen);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${examen.titulo.replace(/[·]/g, '-').replace(/\s+/g, ' ').trim()} (adaptado).docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      exportando = false;
    }
  }

  function imprimir() {
    const antes = vista;
    vista = 'adaptado';
    setTimeout(() => {
      window.print();
      vista = antes;
    }, 50);
  }
</script>

{#if !examen || !hoja || !hojaOriginal}
  <p>No encuentro este examen. <a href="#/">Volver al inicio</a></p>
{:else}
  <div class="pantalla">
    <aside class="panel no-imprimir">
      <a class="volver" href="#/">← Todos los exámenes</a>
      <h2>{examen.titulo}</h2>

      <label class="campo">Configuración
        <select onchange={(e) => { aplicarConfiguracion(e.currentTarget.value); e.currentTarget.value = ''; }}>
          <option value="">Elegir…</option>
          {#each almacen.todasConfiguraciones as c (c.nombre)}<option value={c.nombre}>{c.nombre}</option>{/each}
        </select>
      </label>
      <div class="fila">
        <button class="pequeño" onclick={guardarConfiguracion}>Guardar como configuración</button>
        {#if almacen.configuraciones.length}
          <select class="pequeño" onchange={(e) => { if (e.currentTarget.value && confirm(`¿Borrar «${e.currentTarget.value}»?`)) almacen.borrarConfiguracion(e.currentTarget.value); e.currentTarget.value = ''; }}>
            <option value="">Borrar una…</option>
            {#each almacen.configuraciones as c (c.nombre)}<option value={c.nombre}>{c.nombre}</option>{/each}
          </select>
        {/if}
      </div>

      <fieldset>
        <legend>Letra</legend>
        <div class="tres">
          <label>Tamaño
            <select bind:value={opciones.tamLetra}>{#each [11, 12, 14, 16, 18] as t (t)}<option value={t}>{t} pt</option>{/each}</select>
          </label>
          <label>Interlineado
            <select bind:value={opciones.interlineado}>{#each [1.15, 1.5, 2] as t (t)}<option value={t}>{t}</option>{/each}</select>
          </label>
          <label>Tipo
            <select bind:value={opciones.fuente}>{#each FUENTES as f (f)}<option value={f}>{f}</option>{/each}</select>
          </label>
        </div>
      </fieldset>

      {#each GRUPOS as g (g.titulo)}
        <fieldset>
          <legend>{g.titulo}</legend>
          {#each g.casillas as c (c.clave)}
            <label class="casilla" title={c.ayuda}>
              <input type="checkbox" bind:checked={opciones[c.clave] as boolean} />
              {c.texto}
            </label>
          {/each}
          {#if g.titulo === 'Enunciados'}
            <button class="ia" onclick={pedirIA} disabled={iaEstado === 'trabajando'}>
              {iaEstado === 'trabajando' ? 'La IA está trabajando…' : Object.keys(edicion.propuestas).length ? 'Volver a pedir propuestas' : 'Proponer enunciados más sencillos (IA)'}
            </button>
            {#if !almacen.ajustes.claveIA}<p class="pista">Antes, pon tu clave de Gemini en <a href="#/ajustes">Ajustes</a>.</p>{/if}
            {#if iaError}<p class="error">{iaError}</p>{/if}
            {#if pendientes}
              <p class="pista">{pendientes} propuesta{pendientes > 1 ? 's' : ''} por revisar en la hoja{#if conAvisos} ({conAvisos} con avisos){/if}.</p>
              <div class="fila">
                <button class="pequeño" onclick={() => decidirTodas('aceptada')}>Aceptar todas</button>
                <button class="pequeño" onclick={() => decidirTodas('rechazada')}>Rechazar todas</button>
              </div>
            {:else if iaEstado === 'hecho'}
              <p class="pista">Propuestas revisadas.</p>
            {/if}
          {/if}
        </fieldset>
      {/each}

      {#if quitados}
        <p class="aviso">Has quitado {quitados} elemento{quitados > 1 ? 's' : ''}. Comprueba que se siguen evaluando todos los contenidos.</p>
      {/if}

      <div class="descargas">
        <button class="principal" onclick={descargarWord} disabled={exportando}>{exportando ? 'Generando…' : 'Descargar Word'}</button>
        <button onclick={imprimir}>Imprimir o guardar PDF</button>
      </div>
      <p class="pista">Pasa el ratón por la hoja para editar un texto, quitar un apartado o cambiar su espacio.</p>
    </aside>

    <div class="zona">
      <div class="pestañas no-imprimir">
        <button class:activa={vista === 'adaptado'} onclick={() => (vista = 'adaptado')}>Adaptado</button>
        <button class:activa={vista === 'comparar'} onclick={() => (vista = 'comparar')}>Comparar</button>
        <button class:activa={vista === 'original'} onclick={() => (vista = 'original')}>Original</button>
      </div>
      {#if vista === 'adaptado'}
        <HojaVista {hoja} editable {acciones} />
      {:else if vista === 'original'}
        <HojaVista hoja={hojaOriginal} />
      {:else}
        <div class="comparar">
          <div><div class="rotulo">Original</div><div class="mini"><HojaVista hoja={hojaOriginal} /></div></div>
          <div><div class="rotulo">Adaptado</div><div class="mini"><HojaVista {hoja} /></div></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .pantalla {
    display: grid;
    grid-template-columns: 20rem 1fr;
    gap: 1.5rem;
    align-items: start;
  }
  .panel {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow: auto;
    padding-right: 0.4rem;
  }
  .volver {
    color: var(--suave);
    text-decoration: none;
    font-size: 0.9rem;
  }
  h2 {
    font-size: 1.15rem;
    margin: 0.5rem 0 1rem;
  }
  fieldset {
    border: 1px solid var(--borde);
    border-radius: 10px;
    margin: 0 0 0.8rem;
    padding: 0.5rem 0.8rem 0.7rem;
  }
  legend {
    font-weight: 600;
    padding: 0 0.3rem;
  }
  .casilla {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin: 0.35rem 0;
    cursor: pointer;
  }
  .casilla input {
    margin-top: 0.25rem;
  }
  .campo,
  .tres label {
    display: grid;
    gap: 0.2rem;
    font-size: 0.85rem;
    color: var(--suave);
  }
  .campo {
    margin-bottom: 0.4rem;
  }
  .tres {
    display: grid;
    grid-template-columns: 1fr 1fr 1.4fr;
    gap: 0.4rem;
  }
  select {
    font: inherit;
    font-size: 0.9rem;
    padding: 0.3rem;
    border-radius: 6px;
    border: 1px solid var(--borde);
    background: var(--hoja);
    color: var(--texto);
  }
  .fila {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-bottom: 0.9rem;
  }
  .pequeño {
    font-size: 0.82rem;
    padding: 0.3rem 0.6rem;
  }
  .ia {
    width: 100%;
    margin-top: 0.5rem;
    border-color: var(--acento);
    color: var(--acento);
  }
  .pista {
    color: var(--suave);
    font-size: 0.85rem;
    margin: 0.4rem 0;
  }
  .aviso {
    color: var(--error);
    font-size: 0.9rem;
  }
  .error {
    color: var(--error);
    font-size: 0.85rem;
  }
  .descargas {
    display: grid;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .pestañas {
    display: flex;
    gap: 0.3rem;
    justify-content: center;
    margin-bottom: 1rem;
  }
  .pestañas button.activa {
    background: var(--acento);
    border-color: var(--acento);
    color: var(--hoja);
  }
  .comparar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .rotulo {
    text-align: center;
    color: var(--suave);
    margin-bottom: 0.4rem;
  }
  .mini {
    zoom: 0.55;
  }
  @media (max-width: 900px) {
    .pantalla {
      grid-template-columns: 1fr;
    }
    .panel {
      position: static;
      max-height: none;
    }
  }
  @media print {
    .pantalla {
      display: block;
    }
    .zona {
      margin: 0;
    }
  }
</style>
