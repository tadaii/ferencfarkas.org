<script lang="ts">
  import Greet from './lib/Greet.svelte'
  import SyncScores from './lib/SyncScores.svelte'
</script>

<main class="container">
  <h1>ferencfarkas.org publisher</h1>

  <div class="row">
    <SyncScores />
  </div>
</main>

<style>
  .logo.vite:hover {
    filter: drop-shadow(0 0 2em #747bff);
  }

  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00);
  }
</style>