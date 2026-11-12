<script lang="ts" module>
  export interface Acciones {
    alternarOculto(ruta: string): void;
    editar(ruta: string, texto: string | null): void;
    espacio(ruta: string, delta: number): void;
    decidir(ruta: string, estado: 'aceptada' | 'rechazada' | 'pendiente'): void;
  }
</script>

<script lang="ts">
  import type { ApartadoHoja, EjercicioHoja, Hoja, Propuesta } from '../lib/adaptar';
  import Bloques from './Bloques.svelte';
  import Espacio from './Espacio.svelte';
  import TablaVista from './TablaVista.svelte';
  import Texto from './Texto.svelte';

  let { hoja, editable = false, acciones }: { hoja: Hoja; editable?: boolean; acciones?: Acciones } = $props();
  const o = $derived(hoja.opciones);

  let editando = $state<string | null>(null);
  let borrador = $state('');

  function empezarEdicion(ruta: string, actual: string) {
    editando = ruta;
    borrador = actual;
  }
  function guardar() {
    if (editando) acciones?.editar(editando, borrador.trim());
    editando = null;
  }
</script>

{#snippet propuesta(ruta: string, p: Propuesta | undefined, editado: boolean)}
  {#if editable && p && !editado && o.usarSimplificados}
    {#if p.estado === 'pendiente'}
      <div class="propuesta no-imprimir">
        <div class="cab">Propuesta de la IA</div>
        <div class="nuevo">{@html p.texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>
        {#if p.avisos.length}<div class="avisos">⚠ {p.avisos.join(' · ')}</div>{/if}
        <div class="botones">
          <button class="si" onclick={() => acciones?.decidir(ruta, 'aceptada')}>Aceptar</button>
          <button onclick={() => acciones?.decidir(ruta, 'rechazada')}>Rechazar</button>
          <button onclick={() => empezarEdicion(ruta, p.texto)}>Editar</button>
        </div>
      </div>
    {:else if p.estado === 'aceptada'}
      <span class="etiqueta no-imprimir">simplificado <button class="enlace" onclick={() => acciones?.decidir(ruta, 'pendiente')}>deshacer</button></span>
    {/if}
  {/if}
{/snippet}

{#snippet herramientas(ruta: string, oculto: boolean, textoActual: string, editado: boolean, espacio?: number)}
  {#if editable}
    <div class="herr no-imprimir">
      {#if !oculto}
        <button title="Editar el texto" onclick={() => empezarEdicion(ruta, textoActual)}>✎ Editar</button>
        {#if editado}<button title="Volver al texto original" onclick={() => acciones?.editar(ruta, null)}>↺ Original</button>{/if}
        {#if espacio !== undefined}
          <button title="Menos espacio para responder" disabled={espacio <= -2} onclick={() => acciones?.espacio(ruta, -1)}>− espacio</button>
          <button title="Más espacio para responder" disabled={espacio >= 4} onclick={() => acciones?.espacio(ruta, 1)}>+ espacio</button>
        {/if}
      {/if}
      <button class:recuperar={oculto} onclick={() => acciones?.alternarOculto(ruta)}>{oculto ? '↩ Recuperar' : '✕ Quitar'}</button>
    </div>
  {/if}
{/snippet}

{#snippet editor()}
  <div class="editor no-imprimir">
    <textarea bind:value={borrador} rows={Math.max(2, borrador.split('\n').length + 1)}></textarea>
    <div class="ayuda">Usa **dos asteriscos** para poner una palabra en negrita y una línea por paso.</div>
    <div class="botones">
      <button class="si" onclick={guardar}>Guardar</button>
      <button onclick={() => (editando = null)}>Cancelar</button>
    </div>
  </div>
{/snippet}

{#snippet apartado(a: ApartadoHoja)}
  {#if !a.oculto || editable}
    <div class="apartado" class:oculto={a.oculto} class:junto={o.evitarCortes}>
      {@render herramientas(a.ruta, a.oculto, a.textoPlano, a.editado, a.ajusteEspacio)}
      {#if editando === a.ruta}
        {@render editor()}
      {:else if a.texto.length}
        <Texto texto={a.texto} marca={a.marca} />
      {/if}
      {#if a.oculto}<p class="nota no-imprimir">Apartado quitado: no saldrá en el examen.</p>{/if}
      {@render propuesta(a.ruta, a.propuesta, a.editado)}
      {#if !a.oculto}
        <Bloques bloques={a.contexto} />
        {#if a.respuesta.tipo === 'completar'}
          {#each a.respuesta.plantilla.split('\n') as l, i (i)}
            <p class="completar">
              {#each l.split('___') as t, j (j)}{#if j > 0}<span class="hueco" class:amplio={o.espacioAmplio}></span>{/if}{t}{/each}
            </p>
          {/each}
        {:else if a.respuesta.tipo === 'tabla'}
          <TablaVista tabla={a.respuesta.tabla} altoCeldaMm={o.espaciosRespuesta ? (o.espacioAmplio ? 12 : 10) : 0} />
        {:else if a.respuesta.tipo === 'unir'}
          <div class="unir">
            {#each Array(Math.max(a.respuesta.izquierda.length, a.respuesta.derecha.length)) as _, i (i)}
              <div class="izq">{a.respuesta.izquierda[i] ?? ''}{#if a.respuesta.izquierda[i]}<span class="punto">●</span>{/if}</div>
              <div></div>
              <div class="der">{#if a.respuesta.derecha[i]}<span class="punto">●</span>{/if}{a.respuesta.derecha[i] ?? ''}</div>
            {/each}
          </div>
        {:else if a.respuesta.tipo === 'elegir'}
          <p class="elegir">{#each a.respuesta.opciones as op, i (i)}<span>○ {op}</span>{/each}</p>
        {/if}
        <Espacio e={a.espacio} amplio={o.espacioAmplio} />
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet ejercicio(e: EjercicioHoja)}
  {#if !e.oculto || editable}
    <section class="ejercicio" class:separado={o.separarEjercicios} class:oculto={e.oculto} class:junto={o.evitarCortes}>
      {@render herramientas(e.ruta, e.oculto, e.enunciadoPlano, e.editado)}
      <div class="instruccion" class:recuadro={o.recuadroInstrucciones}>
        <span class="num">{e.oculto ? `(${e.numeroOriginal})` : e.numero}.</span>
        <div class="enun">
          {#if editando === e.ruta}{@render editor()}{:else}<Texto texto={e.enunciado} />{/if}
        </div>
      </div>
      {@render propuesta(e.ruta, e.propuesta, e.editado)}
      {#if !e.oculto}
        <Bloques bloques={e.contexto} />
        {#each e.apartados as a (a.ruta)}{@render apartado(a)}{/each}
      {:else}
        <p class="nota no-imprimir">Ejercicio quitado: no saldrá en el examen.</p>
      {/if}
    </section>
  {/if}
{/snippet}

<article class="hoja" style:font-size="{o.tamLetra}pt" style:line-height={o.interlineado} style:font-family="'{o.fuente}', Arial, sans-serif">
  <h1>{hoja.titulo}</h1>
  <p class="nombre">Nombre: <span class="raya"></span> Fecha: <span class="raya corta"></span></p>
  {#if hoja.contexto.length}<div class="contexto"><Bloques bloques={hoja.contexto} /></div>{/if}
  {#each hoja.ejercicios as e (e.ruta)}{@render ejercicio(e)}{/each}
</article>

<style>
  .hoja {
    background: #fff;
    color: #000;
    width: 210mm;
    max-width: 100%;
    min-height: 297mm;
    padding: 20mm;
    box-sizing: border-box;
    margin: 0 auto;
    box-shadow: 0 2px 12px rgb(0 0 0 / 0.25);
  }
  h1 {
    font-size: 1.3em;
    margin: 0 0 4mm;
  }
  .nombre {
    margin: 0 0 6mm;
    display: flex;
    gap: 2mm;
    align-items: flex-end;
  }
  .raya {
    flex: 1;
    border-bottom: 1px solid #000;
    height: 1em;
  }
  .raya.corta {
    flex: 0 0 35mm;
  }
  .contexto {
    margin-bottom: 6mm;
  }
  .ejercicio {
    margin: 0 0 5mm;
    position: relative;
  }
  .ejercicio.separado {
    padding-bottom: 6mm;
    margin-bottom: 8mm;
    border-bottom: 1px solid #d9d9d9;
  }
  .junto .instruccion,
  .apartado.junto {
    break-inside: avoid;
  }
  .instruccion {
    display: flex;
    gap: 2mm;
    margin-bottom: 2mm;
    break-after: avoid;
  }
  .instruccion.recuadro {
    border: 1.5px solid #7f7f7f;
    background: #f2f2f2;
    padding: 2mm 3mm;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .num {
    font-weight: bold;
  }
  .enun {
    flex: 1;
  }
  .apartado {
    margin: 0 0 3mm;
    position: relative;
  }
  .completar {
    margin: 0 0 0.6em;
    line-height: 1.9;
  }
  .hueco {
    display: inline-block;
    width: 25mm;
    border-bottom: 1px solid #000;
    margin: 0 1mm;
  }
  .hueco.amplio {
    width: 38mm;
  }
  .unir {
    display: grid;
    grid-template-columns: 1fr 25mm 1fr;
    row-gap: 4mm;
    margin: 2mm 0 4mm;
  }
  .izq {
    text-align: right;
  }
  .punto {
    margin: 0 2mm;
  }
  .elegir {
    display: flex;
    gap: 8mm;
  }
  .oculto {
    opacity: 0.4;
  }
  .nota {
    font-style: italic;
    font-size: 10pt;
  }

  /* Herramientas de edición (solo pantalla) */
  .herr {
    display: none;
    position: absolute;
    top: -3.5mm;
    right: 0;
    z-index: 2;
    gap: 4px;
    font-family: system-ui, sans-serif;
    font-size: 12px;
    line-height: 1;
  }
  .ejercicio:hover > .herr,
  .apartado:hover > .herr,
  .oculto > .herr {
    display: flex;
  }
  .herr button,
  .botones button,
  .enlace {
    font: 12px system-ui, sans-serif;
    padding: 3px 7px;
    border-radius: 6px;
    border: 1px solid #b9b2a3;
    background: #fff;
    color: #222;
    cursor: pointer;
  }
  .herr button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .herr .recuperar {
    background: #2f6f5e;
    color: #fff;
    border-color: #2f6f5e;
  }
  .propuesta {
    border: 1.5px dashed #2f6f5e;
    background: #eef6f2;
    border-radius: 6px;
    padding: 2mm 3mm;
    margin: 1mm 0 3mm;
    font-size: 0.9em;
  }
  .propuesta .cab {
    font: 600 11px system-ui, sans-serif;
    color: #2f6f5e;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 1mm;
  }
  .avisos {
    color: #a3341f;
    font: 12px system-ui, sans-serif;
    margin-top: 1mm;
  }
  .botones {
    display: flex;
    gap: 6px;
    margin-top: 2mm;
  }
  .botones .si {
    background: #2f6f5e;
    color: #fff;
    border-color: #2f6f5e;
  }
  .etiqueta {
    font: 11px system-ui, sans-serif;
    color: #2f6f5e;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 1mm;
  }
  .enlace {
    padding: 1px 5px;
  }
  .editor textarea {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    padding: 2mm;
    border: 1.5px solid #2f6f5e;
    border-radius: 6px;
  }
  .editor .ayuda {
    font: 11px system-ui, sans-serif;
    color: #6b665c;
  }

  @media print {
    .hoja {
      width: auto;
      min-height: 0;
      padding: 0;
      box-shadow: none;
    }
    :global(.no-imprimir),
    .oculto {
      display: none !important;
    }
  }
</style>
