<script>
  import { onMount } from 'svelte'
  import endpoints from './configs/endpoints'
  import { setFacets, serialize } from './helpers/facets'
  import { defaultState, load as loadQS, sync as syncQS } from './services/qs'
  import { initScrollBehaviors, scrollToTop } from './helpers/scroll'
  import Work from './components/Work.svelte'
  import Refine from './components/Refine.svelte'
  import Pagination from './components/Pagination.svelte'

  export let workId

  let app
  let mounted = false // flag for query string (QS) sync
  let index = {} // lunr search index object
  let works = [] // full list of works (unfiltered)

  let state

  $: embedded = Boolean(workId)
  $: results = filterWorks({ ...state, index, works })
  $: renderedResults = results
  $: scrollToTop(results)
  $: {
    if (mounted && index) {
      syncQS(state)
      initScrollBehaviors(app)
    } else {
      state = loadQS(workId)
    }
  }

  onMount(() => {
    if (!embedded) {
      customizeSection(document.getElementById('catalogue-app'))
    }
    mounted = true
  })

  function customizeSection(container) {
    let section = container

    while (section.tagName.toLowerCase() !== 'section') {
      section = section.parentNode
    }

    if (section) {
      section.style.overflow = 'hidden'
    }
  }

  async function loadData() {
    const responses = {}
    await Promise.all(
      Object.entries(endpoints).map(([key, url]) =>
        fetch(url)
          .then(res => res.json())
          .then(data => {
            responses[key] = data
          })
      )
    )

    works = setFacets(responses.catalogue.works)
    index = lunr.Index.load(responses.index)

    return responses
  }

  function filterWorks({ activeFacets, index, query, reworksOf, sort, works }) {
    let results = works

    if (reworksOf) {
      results = works
        .filter(work => work.rework === reworksOf)
        .sort((a, b) => (a.id === reworksOf ? -1 : 1))
    } else {
      results = handleQuery({ works, index, query })
      results = handleFacets({ activeFacets, works: results })
    }

    return results
  }

  function handleQuery({ index, query, works }) {
    if (query.startsWith('id:')) {
      return works.filter(work => work.id === query.split(':')[1])
    } else {
      if (!index.search) {
        return works
      }

      const results = index.search(query)
      const r = results.map(result => result.ref)
      return works.filter(work => r.includes(work.id))
    }
  }

  function handleFacets({ activeFacets, works }) {
    return activeFacets.length
      ? works.filter(work =>
          activeFacets.every(facet => work.facets.includes(facet))
        )
      : works
  }

  function selectCategory(event) {
    refine({ detail: serialize('c', event.detail) })
  }

  function refine(event) {
    const facet = event.detail

    state.activeFacets = state.activeFacets.includes(facet)
      ? state.activeFacets.filter(f => f !== facet)
      : [...state.activeFacets, facet]
  }

  function clear() {
    state = { ...defaultState }
  }
</script>

<form class="catalogue search" bind:this={app} on:submit|preventDefault>
  <div class="works">
    {#await loadData()}
      <p>Loading catalogue data...</p>
    {:then data}
      <div class="row">
        <div class="column list">
          <ul class="works--list">
            {#each renderedResults as work, index}
              <Work
                categories={data.catalogue.categories}
                {embedded}
                fields={data.catalogue.fields}
                i18n={data.i18n}
                {index}
                publishers={data.catalogue.publishers}
                reworkActive={Boolean(state.reworksOf)}
                showID={state.showID}
                {work}
                on:selectCategory={selectCategory}
                on:showReworks={e =>
                  (state.reworksOf =
                    state.reworksOf === e.detail ? '' : e.detail)}
              />
            {/each}
          </ul>
        </div>
        {#if !embedded}
          <div class="column refine">
            <Refine
              activeFacets={state.activeFacets}
              categories={data.catalogue.categories}
              genres={data.catalogue.genres}
              publishers={data.catalogue.publishers}
              {state}
              works={results}
              on:updateQuery={e => (state.query = e.detail)}
              on:refine={refine}
              on:clear={clear}
            />
          </div>
        {/if}
      </div>
      <Pagination />
    {:catch error}
      <p>Failed to initialize catalogue: <strong>{error.message}</strong>.</p>
      {console.error(error) && ''}
    {/await}
  </div>
</form>
