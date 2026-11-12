<script lang="ts">
  import type { Espacio } from '../lib/adaptar';

  let { e, amplio }: { e: Espacio; amplio: boolean } = $props();
  const CELDA = 7;
</script>

{#if e.tipo === 'lineas'}
  <div class="lineas">
    {#each Array(e.n) as _, i (i)}<div class="linea" style:height="{amplio ? 11 : 9}mm"></div>{/each}
  </div>
{:else if e.tipo === 'libre'}
  <div style:height="{e.altoMm}mm"></div>
{:else if e.tipo === 'recuadro'}
  <div class="recuadro" style:height="{e.altoMm}mm"></div>
{:else if e.tipo === 'cuadricula'}
  <div class="cuadricula" style:height="{e.filas * CELDA}mm"></div>
{:else if e.tipo === 'problema'}
  <div class="problema">
    <div class="parte" style:min-height="22mm"><b>Datos</b></div>
    <div class="parte">
      <b>Operación</b>
      {#if e.cuadricula}
        <div class="cuadricula" style:height="{e.filasOperacion * CELDA}mm"></div>
      {:else}
        <div style:height="{e.filasOperacion * CELDA}mm"></div>
      {/if}
    </div>
    <div class="parte" style:min-height="16mm"><b>Solución</b></div>
  </div>
{/if}

<style>
  .lineas {
    margin: 1mm 0 2mm;
  }
  .linea {
    border-bottom: 1px solid #a6a6a6;
  }
  .recuadro {
    border: 1.5px solid #000;
    margin: 1mm 0 2mm;
  }
  .cuadricula {
    width: calc(100% - 1px);
    margin: 1mm 0 2mm;
    background-image:
      linear-gradient(#bfbfbf 1px, transparent 1px),
      linear-gradient(90deg, #bfbfbf 1px, transparent 1px);
    background-size: 7mm 7mm;
    border-right: 1px solid #bfbfbf;
    border-bottom: 1px solid #bfbfbf;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .problema {
    border: 1.5px solid #000;
    margin: 1mm 0 2mm;
    break-inside: avoid;
  }
  .parte {
    padding: 1.5mm 2.5mm;
  }
  .parte + .parte {
    border-top: 1.5px solid #000;
  }
</style>
