<script>
  import { createEventDispatcher } from 'svelte'

  export let state = {}

  const dispatch = createEventDispatcher()

  $: {
    items = items.map(item => ({
      ...item,
      active: item.key === state.sort.field,
      dir: item.key === state.sort.field ? state.sort.dir : item.dir,
    }))
  }

  let items = [
    {
      key: 't',
      dir: 'asc',
      label: 'Title',
    },
    {
      key: 'u',
      dir: 'asc',
      label: 'Update',
    },
    {
      key: 'd',
      dir: 'asc',
      label: 'Duration',
    },
    {
      key: 'c',
      dir: 'asc',
      label: 'Composition date',
    },
  ]

  function sort(item) {
    dispatch('sort', {
      field: item.key,
      dir:
        item.key === state.sort.field
          ? state.sort.dir === 'asc'
            ? 'desc'
            : 'asc'
          : item.dir,
    })
  }
</script>

<ul class="works-sort">
  {#each items as item}
    <li class:active={item.active} class:desc={item.dir === 'desc'}>
      <button on:click={sort(item)}>{item.label}</button>
    </li>
  {/each}
</ul>
