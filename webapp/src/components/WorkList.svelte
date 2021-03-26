<script>
  import { createEventDispatcher } from 'svelte'
  import InfiniteGrid from '@egjs/svelte-infinitegrid'
  import Work from './Work.svelte'

  export let catalogue
  export let embedded
  export let i18n
  export let state
  export let works

  const dispatch = createEventDispatcher()

  let grid
  let items = []
  let loading

  $: updateGrid(works)

  function loadItems(groupKey, nextKey, itemCount) {
    const nextItems = []

    for (let i = 0; i < itemCount; ++i) {
      const key = nextKey + i
      nextItems.push({ groupKey, key, work: works[key] || {} })
    }

    return nextItems
  }

  function onAppend({ detail: { groupKey, startLoading } }) {
    window.grid = grid

    if (grid.isProcessing()) {
      return
    }

    if (items.length >= works.length) {
      return
    }

    startLoading()

    const nextGroupKey = (parseFloat(groupKey) || 0) + 1
    const nextKey = items.length

    items = [...items, ...loadItems(nextGroupKey, nextKey, 10)]
  }

  function onLayoutComplete({ detail: { isLayout, endLoading } }) {
    !isLayout && endLoading()
  }

  function updateGrid(works) {
    console.log(works.length, grid)
  }

  function showReworks(e) {
    grid.updateItems()
    dispatch('showReworks', e.detail)
  }

  function toggleWork(e) {
    window.setTimeout(() => {
      grid.updateItems()
    }, 0)
  }
</script>

<InfiniteGrid
  bind:this={grid}
  {items}
  {loading}
  itemBy={item => item.key}
  groupBy={item => item.groupKey}
  options={{ transitionDuration: 0.2 }}
  layoutOptions={{ margin: 10, align: 'start' }}
  on:append={onAppend}
  on:layoutComplete={onLayoutComplete}
  let:visibleItems
  class="works--list"
>
  <!-- <ul class="works--list"> -->
  {#each visibleItems as item (item.key)}
    <Work
      categories={catalogue.categories}
      {embedded}
      fields={catalogue.fields}
      {i18n}
      index={item.key}
      publishers={catalogue.publishers}
      reworkActive={Boolean(state.reworksOf)}
      showID={state.showID}
      work={item.work}
      on:selectCategory
      on:showReworks={showReworks}
      on:toggle={toggleWork}
    />
  {/each}
  <!-- </ul> -->
  <div bind:this={loading} slot="loading">Loading</div>
</InfiniteGrid>

<!-- <InfiniteGrid
  bind:this={grid}
  {items}
  {loading}
  itemBy={item => item.key}
  groupBy={item => item.groupKey}
  options={{ isConstantSize: true, transitionDuration: 0.2 }}
  layoutOptions={{ margin: 10, align: 'center' }}
  on:append={onAppend}
  on:layoutComplete={onLayoutComplete}
  let:visibleItems
>
  {#each visibleItems as item (item.key)}
    <div class="item">
      <div class="thumbnail">
        {item.key}
        <img
          src={`https://naver.github.io/egjs-infinitegrid/assets/image/${
            (item.key % 59) + 1
          }.jpg`}
          alt="egjs"
          width="400"
          height="400"
        />
      </div>
      <div class="info">{`egjs ${item.key}`}</div>
    </div>
  {/each}
  <div bind:this={loading} slot="loading">Loading</div>
</InfiniteGrid> -->
