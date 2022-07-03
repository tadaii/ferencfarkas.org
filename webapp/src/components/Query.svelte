<script>
  import { createEventDispatcher } from 'svelte'
  import QueryIcon from './QueryIcon.svelte'

  export let showFields = false
  export let value = ''
  export let loading = false
  export let failed = false

  let placeholder

  $: {
    dispatch('updateQuery', value)
    placeholder = failed
      ? 'Failed to load search index'
      : loading
      ? 'Loading search index...'
      : 'Filter with keywords'
  }

  const dispatch = createEventDispatcher()
  let focused = false
</script>

<div class="search--query">
  <div class="search--query-wrapper" class:loading class:failed class:focused>
    <QueryIcon {loading} {failed} />
    <input
      type="search"
      name="q"
      readonly={failed || loading}
      {placeholder}
      bind:value
      on:focus={() => (focused = !failed && !loading)}
      on:blur={() => (focused = false)}
    />
    <button type="submit"> Search </button>
  </div>
  {#if showFields}
    <div class="search--fields-wrapper">
      <label class="inline">
        <input type="checkbox" name="title" />
        Title
      </label>
      <label class="inline">
        <input type="checkbox" name="description" />
        Description
      </label>
      <label class="inline">
        <input type="checkbox" name="version" />
        Version
      </label>
      <label class="inline">
        <input type="checkbox" name="composition-date" />
        Composition date
      </label>
      <label class="inline">
        <input type="checkbox" name="composition-location" />
        Composition location
      </label>
    </div>
  {/if}
</div>
