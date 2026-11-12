<script lang="ts">
  import type { Bloque } from '../lib/examen';
  import Imagen from './Imagen.svelte';
  import TablaVista from './TablaVista.svelte';

  let { bloques }: { bloques: Bloque[] } = $props();
</script>

{#each bloques as b, i (i)}
  {#if b.tipo === 'titulo'}
    <p class="titulo">{b.texto}</p>
  {:else if b.tipo === 'texto'}
    <p>{b.texto}</p>
  {:else if b.tipo === 'lista'}
    <ul>
      {#each b.items as it, j (j)}<li>{it}</li>{/each}
    </ul>
  {:else if b.tipo === 'tabla'}
    <TablaVista tabla={b.tabla} />
  {:else if b.tipo === 'imagen'}
    <Imagen src={b.src} alt={b.alt} anchoMm={b.anchoMm} />
  {/if}
{/each}

<style>
  p {
    margin: 0 0 0.35em;
  }
  .titulo {
    font-weight: bold;
    font-size: 1.15em;
  }
  ul {
    margin: 0 0 0.4em;
    padding-left: 1.4em;
  }
</style>
