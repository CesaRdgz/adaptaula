<script lang="ts">
  import { almacen } from '../estado/almacen.svelte';

  let { src, alt, anchoMm }: { src: string; alt: string; anchoMm: number } = $props();
  let url = $state<string | undefined>();
  let falta = $state(false);

  $effect(() => {
    const s = src;
    almacen.urlImagen(s).then((u) => {
      url = u;
      falta = !u;
    });
  });
</script>

{#if url}
  <img src={url} {alt} title={alt} style:width="{Math.min(anchoMm, 170)}mm" />
{:else if falta}
  <div class="sin-imagen">Falta la imagen: {alt}</div>
{/if}

<style>
  img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 2mm auto;
  }
  .sin-imagen {
    border: 1px dashed #c33;
    color: #c33;
    padding: 2mm;
    font-size: 9pt;
  }
</style>
