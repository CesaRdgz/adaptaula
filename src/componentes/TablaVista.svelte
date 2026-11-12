<script lang="ts">
  import type { Tabla } from '../lib/examen';

  let { tabla, altoCeldaMm = 0 }: { tabla: Tabla; altoCeldaMm?: number } = $props();
</script>

<table>
  {#if tabla.cabecera}
    <thead><tr>{#each tabla.cabecera as c, i (i)}<th>{c}</th>{/each}</tr></thead>
  {/if}
  <tbody>
    {#each tabla.filas as f, i (i)}
      <tr style:height={altoCeldaMm ? `${altoCeldaMm}mm` : undefined}>
        {#each f as c, j (j)}
          {#if j === 0 && tabla.cabecera && f.length > 1 && c !== ''}<th>{c}</th>{:else}<td>{c}</td>{/if}
        {/each}
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1mm 0 3mm;
    break-inside: avoid;
  }
  th,
  td {
    border: 1px solid #999;
    padding: 1mm 2mm;
    text-align: left;
    vertical-align: middle;
  }
  th {
    background: #e7e6e6;
    font-weight: bold;
  }
</style>
