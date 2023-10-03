<script lang="ts">
  import { invoke } from '@tauri-apps/api/tauri'
  import { onMount } from 'svelte'

  let synced = false
  let syncDiff: string[] = []

  async function getDiff() {
    syncDiff = await invoke("scores_get_diff") as any[]
  }

  async function sync() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    synced = await invoke("scores_sync")
  }

  onMount(() => {
    getDiff()
  })
</script>

<div>
  <form class="row" on:submit|preventDefault={sync}>
    <button type="submit">Sync scores</button>
  </form>
  <p>syncDiff: {syncDiff.length}</p>
  <p>synced: {synced}</p>
</div>