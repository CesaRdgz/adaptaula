<script lang="ts">
  import { almacen } from './estado/almacen.svelte';
  import Ajustes from './pantallas/Ajustes.svelte';
  import Examen from './pantallas/Examen.svelte';
  import Inicio from './pantallas/Inicio.svelte';

  let ruta = $state(location.hash.slice(1) || '/');
  const actualizar = () => {
    ruta = location.hash.slice(1) || '/';
    window.scrollTo(0, 0);
  };

  almacen.cargar();

  const idExamen = $derived(ruta.startsWith('/examen/') ? decodeURIComponent(ruta.slice(8)) : null);
</script>

<svelte:window onhashchange={actualizar} />

<header class="no-imprimir">
  <a class="marca" href="#/">Adaptaula</a>
  <nav>
    <a href="#/" class:activo={ruta === '/'}>Exámenes</a>
    <a href="#/ajustes" class:activo={ruta === '/ajustes'}>Ajustes</a>
  </nav>
</header>

<main class:ancho={!!idExamen}>
  {#if !almacen.cargado}
    <p class="cargando">Cargando…</p>
  {:else if idExamen}
    {#key idExamen}<Examen id={idExamen} />{/key}
  {:else if ruta === '/ajustes'}
    <Ajustes />
  {:else}
    <Inicio />
  {/if}
</main>
