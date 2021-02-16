<script>
  import { getFacets } from '../helpers/facets'
  import FacetGroup from './FacetGroup.svelte'

  export let activeFacets = []
  export let categories = {}
  export let genres = {}
  export let publishers = {}
  export let works = []

  $: facetsList = getFacets(
    { activeFacets, categories, genres, publishers, works }
  )

  function toggleRefine(e) {
    document.querySelector('.refine').classList.toggle('open')
  }

  window.addEventListener('scroll', () => {
    const refinePanel = document.querySelector('.refine')
    const refinePanelWrapper = document.querySelector('.refine--wrapper')

    if (!refinePanel) return

    const coords = refinePanel.getBoundingClientRect()
    const parent = refinePanel.parentElement
    const inner = refinePanel.querySelector('.refine--inner')
    const parentCoords = parent.getBoundingClientRect()
    const heightOffset = coords.height - inner.scrollHeight
    const unfixBottom = parentCoords.bottom > window.innerHeight + heightOffset

    if (coords.y <= 0 && unfixBottom) {
      refinePanelWrapper.classList.add('sticked')
    } else {
      refinePanelWrapper.classList.remove('sticked')
    }
  })
</script>

<div class="refine--wrapper">
  <button class="refine--handler" on:click|preventDefault={toggleRefine}>
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z"/>
    </svg>
    <span class="refine--handler-label">Refine results</span>
  </button>
  <div class="refine--inner">
    <h3>Refine results</h3>
    <div class="facets">
      {#each facetsList as {group, def}}
        <div class="facets {group}">
          <h4>{def.label}</h4>
          <FacetGroup {group} {...def} on:refine />
        </div>
      {/each}
    </div>
  </div>
</div>