<script lang="ts">
  import { almacen, AJUSTES_INICIALES } from '../estado/almacen.svelte';

  let clave = $state(almacen.ajustes.claveIA);
  let modelo = $state(almacen.ajustes.modeloIA);
  let guardado = $state(false);

  async function guardar() {
    await almacen.guardarAjustes({ claveIA: clave.trim(), modeloIA: modelo.trim() || AJUSTES_INICIALES.modeloIA });
    guardado = true;
    setTimeout(() => (guardado = false), 2000);
  }
</script>

<section class="ajustes">
  <h2>Ajustes</h2>

  <h3>Inteligencia artificial (Gemini)</h3>
  <p class="pista">
    Se usa solo para proponer enunciados más sencillos. Consigue una clave gratuita en
    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> (botón «Create API key») y pégala aquí.
    Se guarda solo en este navegador. Al usarla se envía el texto del examen a Google; nunca pongas nombres de alumnos.
  </p>
  <label>Clave de la API
    <input type="password" bind:value={clave} placeholder="AIza…" autocomplete="off" />
  </label>
  <label>Modelo
    <input bind:value={modelo} />
    <span class="pista">Normalmente no hace falta cambiarlo.</span>
  </label>
  <button class="principal" onclick={guardar}>Guardar</button>
  {#if guardado}<span class="ok">Guardado</span>{/if}

  <h3>Exámenes</h3>
  <p class="pista">Hay {almacen.examenes.length} exámenes cargados en este navegador.</p>
  <button onclick={() => confirm('¿Quitar todos los exámenes de este navegador? Los cambios que hayas hecho se conservan por si los vuelves a cargar.') && almacen.borrarCatalogo()}>
    Quitar los exámenes cargados
  </button>

  <p class="version">Adaptaula v{__VERSION__}</p>
</section>

<style>
  .ajustes {
    max-width: 38rem;
    margin: 0 auto;
  }
  h3 {
    margin: 2rem 0 0.4rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
    margin: 0.9rem 0;
    font-weight: 600;
  }
  label .pista {
    font-weight: normal;
  }
  input {
    font: inherit;
    padding: 0.5rem 0.7rem;
    border-radius: 8px;
    border: 1px solid var(--borde);
    background: var(--hoja);
    color: var(--texto);
  }
  .pista {
    color: var(--suave);
    font-size: 0.9rem;
  }
  .ok {
    color: var(--acento);
    margin-left: 0.6rem;
  }
  .version {
    margin-top: 3rem;
    color: var(--suave);
    font-size: 0.85rem;
  }
</style>
