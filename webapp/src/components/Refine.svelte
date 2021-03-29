<script>
  import { createEventDispatcher } from 'svelte'
  import { getFacets, deserialize } from '../helpers/facets'
  import { defaultState } from '../services/qs'
  import RefineTitle from './RefineTitle.svelte'
  import Query from './Query.svelte'
  import FacetGroup from './FacetGroup.svelte'

  export let activeFacets = []
  export let categories = {}
  export let genres = {}
  export let publishers = {}
  export let state = {}
  export let works = []

  const dispatch = createEventDispatcher()

  let collapsed
  let wrapper

  $: facetsList = _getFacets(
    { activeFacets, categories, genres, publishers, works }
  )

  $: cropped = isCropped(works, wrapper)

  function _getFacets() {
    const list = getFacets(
      { activeFacets, categories, genres, publishers, works }
    )

    // Feed collapsed based on facets config
    if (!collapsed) {
      collapsed = list
        .filter(item => item.def.collapsed)
        .map(item => item.group)
    }

    // Force opening facet groups with active filters
    state.activeFacets
      .map(f => deserialize(f).group)
      .forEach(group => {
        if (collapsed.includes(group)) {
          collapsed = collapsed.filter(g => g !== group)
        }
      })

    return list
  }

  function toggleRefine(e) {
    document.querySelector('.refine').classList.toggle('open')
  }

  function toggleCollapse(group) {
    if (collapsed.includes(group)) {
      collapsed = collapsed.filter(g => g !== group)
    } else {
      collapsed = [...collapsed, group]
    }
    console.log(collapsed)
  }

  function isCropped(works, wrapper) {
    if (!wrapper) {
      return
    }

    return wrapper.offsetHeight > window.innerHeight
  }
</script>

<div class="refine--wrapper" bind:this={wrapper} class:cropped>
  <button class="refine--handler" on:click|preventDefault={toggleRefine}>
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z"/>
    </svg>
    <span class="refine--handler-label">
      <RefineTitle count={works.length} />
    </span>
  </button>
  <div class="refine--inner">
    <h3>
      <RefineTitle count={works.length} />
      <span class="spacer"></span>
      <button
        aria-label="clear filters"
        title="clear filters"
        disabled={JSON.stringify(state) === JSON.stringify(defaultState)}
        on:click={() => dispatch('clear')}
      >
        <svg style="width:24px;height:24px" viewBox="0 0 24 24">
          <path fill="currentColor" d="M21 8H3V6H21V8M13.81 16H10V18H13.09C13.21 17.28 13.46 16.61 13.81 16M18 11H6V13H18V11M21.12 15.46L19 17.59L16.88 15.46L15.47 16.88L17.59 19L15.47 21.12L16.88 22.54L19 20.41L21.12 22.54L22.54 21.12L20.41 19L22.54 16.88L21.12 15.46Z" />
        </svg>
      </button>
    </h3>
    <Query
      value={state.query}
      on:updateQuery
    />
    <div class="facets">
      {#each facetsList as {group, def}}
        <div class="facet {group}" class:collapsed={collapsed.includes(group)}>
          <h4 on:click={toggleCollapse(group)}>
            <button
              class="collapse"
              class:open={!collapsed.includes(group)}
              aria-label="toggle facets group"
              title="toggle facets group"
            ></button>
            {def.label}
          </h4>
          <FacetGroup {group} label={def.label} facets={def.facets} on:refine />
        </div>
      {/each}
    </div>
  </div>
</div>