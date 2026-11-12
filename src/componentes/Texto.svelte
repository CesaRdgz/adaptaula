<script lang="ts">
  import type { Texto } from '../lib/adaptar';

  let { texto, marca = '' }: { texto: Texto; marca?: string } = $props();
</script>

{#each texto as linea, i (i)}
  <p class="linea">
    {#if i === 0 && marca}<b class="letra">{marca})</b>{/if}
    {#each linea as tr, j (j)}{#if tr.b}<b>{tr.t}</b>{:else}{tr.t}{/if}{/each}
  </p>
{/each}

<style>
  .linea {
    margin: 0 0 0.25em;
  }
  .letra {
    margin-right: 0.4em;
  }
</style>
