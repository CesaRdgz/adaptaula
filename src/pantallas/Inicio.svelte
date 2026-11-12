<script lang="ts">
  import { almacen } from '../estado/almacen.svelte';
  import { importar, leerInput, leerSoltado, type ArchivoSuelto } from '../lib/catalogo';
  import type { Examen } from '../lib/examen';

  let arrastrando = $state(false);
  let mensaje = $state('');
  let errores = $state<string[]>([]);
  let ocupado = $state(false);

  async function cargar(archivos: ArchivoSuelto[]) {
    ocupado = true;
    mensaje = '';
    errores = [];
    try {
      const r = await importar(archivos);
      errores = r.errores;
      if (r.examenes.length) {
        await almacen.guardarCatalogo(r.examenes, r.imagenes);
        mensaje = `${r.examenes.length} exámenes cargados.`;
      }
    } catch (e) {
      errores = [String(e)];
    }
    ocupado = false;
  }

  const temas = $derived.by(() => {
    const m = new Map<number, Examen[]>();
    for (const e of almacen.examenes.filter((x) => x.tipo === 'tema')) m.set(e.tema!, [...(m.get(e.tema!) ?? []), e]);
    return [...m.entries()];
  });
  const iniciales = $derived(almacen.examenes.filter((x) => x.tipo === 'inicial'));
  const trimestres = $derived.by(() => {
    const m = new Map<number, Examen[]>();
    for (const e of almacen.examenes.filter((x) => x.tipo === 'trimestre')) m.set(e.trimestre!, [...(m.get(e.trimestre!) ?? []), e]);
    return [...m.entries()];
  });
  const NOMBRE_TRIM = ['', 'Primer trimestre', 'Segundo trimestre', 'Tercer trimestre'];
  const tocado = (id: string) => {
    const ed = almacen.ediciones[id];
    return !!ed && (Object.keys(ed.textos).length + ed.ocultos.length + Object.values(ed.propuestas).filter((p) => p.estado === 'aceptada').length > 0);
  };
</script>

<svelte:window
  ondragover={(e) => { e.preventDefault(); arrastrando = true; }}
  ondragleave={(e) => { if (!e.relatedTarget) arrastrando = false; }}
  ondrop={async (e) => { e.preventDefault(); arrastrando = false; if (e.dataTransfer) await cargar(await leerSoltado(e.dataTransfer)); }}
/>

{#snippet boton(e: Examen, texto: string)}
  <a class="examen" href="#/examen/{e.id}">
    {texto}
    {#if tocado(e.id)}<span class="punto" title="Tiene cambios guardados">●</span>{/if}
  </a>
{/snippet}

{#if !almacen.examenes.length}
  <section class="bienvenida">
    <h2>Carga los exámenes</h2>
    <p>Arrastra a esta ventana la carpeta <code>examenes</code> (la que está dentro de <code>C:\Proyectos\adaptaula</code>).</p>
    <p>Solo hace falta una vez: quedan guardados en este navegador.</p>
    <label class="soltar" class:arrastrando>
      <strong>{ocupado ? 'Cargando…' : 'Suelta aquí la carpeta de exámenes'}</strong>
      <span>o pulsa para elegirla</span>
      <input type="file" webkitdirectory multiple onchange={(e) => e.currentTarget.files && cargar(leerInput(e.currentTarget.files))} />
    </label>
  </section>
{:else}
  <section class="catalogo">
    {#each iniciales as e (e.id)}
      <div class="grupo">
        <h3>Evaluación inicial</h3>
        <div class="fila">{@render boton(e, 'Abrir')}</div>
      </div>
    {/each}

    <div class="grupo">
      <h3>Pruebas por tema</h3>
      <p class="pista">El modelo B es la versión más guiada; el A, la más completa.</p>
      <div class="temas">
        {#each temas as [n, xs] (n)}
          <div class="tema">
            <span class="n">Tema {n}</span>
            {#each xs as e (e.id)}{@render boton(e, `Modelo ${e.modelo}`)}{/each}
          </div>
        {/each}
      </div>
    </div>

    <div class="grupo">
      <h3>Evaluaciones trimestrales</h3>
      <div class="temas">
        {#each trimestres as [n, xs] (n)}
          <div class="tema">
            <span class="n">{NOMBRE_TRIM[n]}</span>
            {#each xs as e (e.id)}{@render boton(e, `Modelo ${e.modelo}`)}{/each}
          </div>
        {/each}
      </div>
    </div>

    <p class="pista">Para actualizar los exámenes, vuelve a arrastrar la carpeta a la ventana. Los cambios que hayas hecho se conservan.</p>
  </section>
{/if}

{#if arrastrando && almacen.examenes.length}<div class="velo">Suelta la carpeta para actualizar los exámenes</div>{/if}
{#if mensaje}<p class="ok">{mensaje}</p>{/if}
{#if errores.length}
  <div class="error">
    <strong>Hay problemas con algunos archivos:</strong>
    <ul>{#each errores.slice(0, 8) as er, i (i)}<li>{er}</li>{/each}</ul>
  </div>
{/if}

<style>
  .bienvenida {
    max-width: 40rem;
    margin: 2rem auto;
    text-align: center;
  }
  .bienvenida h2 {
    margin-bottom: 0.5rem;
  }
  .bienvenida p {
    color: var(--suave);
    margin: 0.3rem 0;
  }
  .soltar {
    display: grid;
    place-items: center;
    gap: 0.4rem;
    margin-top: 1.5rem;
    padding: 4rem 1rem;
    border: 2px dashed var(--borde);
    border-radius: 12px;
    cursor: pointer;
  }
  .soltar.arrastrando,
  .soltar:hover {
    border-color: var(--acento);
  }
  .soltar span {
    color: var(--suave);
  }
  .soltar input {
    display: none;
  }
  .catalogo {
    max-width: 52rem;
    margin: 0 auto;
  }
  .grupo {
    margin-bottom: 2rem;
  }
  h3 {
    margin: 0 0 0.6rem;
    font-size: 1.05rem;
  }
  .pista {
    color: var(--suave);
    font-size: 0.9rem;
    margin: -0.3rem 0 0.8rem;
  }
  .temas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.6rem;
  }
  .tema,
  .fila {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--borde);
    border-radius: 10px;
    background: var(--hoja);
  }
  .tema {
    flex-wrap: wrap;
  }
  .tema .n {
    flex: 1 0 100%;
    font-weight: 600;
  }
  .examen {
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--acento);
    color: var(--acento);
    text-decoration: none;
    white-space: nowrap;
  }
  .examen:hover {
    background: var(--acento);
    color: var(--hoja);
  }
  .punto {
    font-size: 0.7em;
    margin-left: 0.25rem;
  }
  .velo {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgb(0 0 0 / 0.5);
    color: #fff;
    font-size: 1.4rem;
    pointer-events: none;
  }
  .ok {
    text-align: center;
    color: var(--acento);
  }
  .error {
    color: var(--error);
    max-width: 40rem;
    margin: 1rem auto;
  }
</style>
