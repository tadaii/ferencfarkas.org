<script>
  import { onMount } from 'svelte'
  import endpoints from './configs/endpoints'
  import { setFacets, serialize } from './helpers/facets'
  import { defaultState, load as loadQS, sync as syncQS } from './services/qs'
  import { initScrollBehaviors, scrollToTop } from './helpers/scroll'
  import Sort from './components/Sort.svelte'
  import Refine from './components/Refine.svelte'
  import Worklist from './components/WorkList.svelte'

  export let workId

  let app, state
  let mounted = false // flag for query string (QS) sync
  let index = {} // lunr search index object
  let works = [] // full list of works (unfiltered)

  $: embedded = Boolean(workId)
  $: results = filterWorks({ ...state, index, works })
  $: scrollToTop(results)
  $: {
    if (mounted && index && !embedded) {
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
      Object.entries(endpoints)
        .filter(([key]) => (embedded ? key !== 'index' : true))
        .map(([key, url]) =>
          fetch(url)
            .then(res => res.json())
            .then(data => {
              responses[key] = data
            })
        )
    )

    works = setFacets(responses.catalogue.works)

    if (responses.index) {
      index = lunr.Index.load(responses.index)
    }

    return responses
  }

  function filterWorks({ activeFacets, index, query, reworksOf, sort, works }) {
    let results = works

    if (reworksOf) {
      results = works.filter(
        work => work.id === reworksOf || work.rework === reworksOf
      )
    } else {
      results = handleQuery({ works, index, query })
      results = handleFacets({ activeFacets, works: results })
    }

    if (embedded || reworksOf) {
      return results.sort(a => (a.id === reworksOf ? -1 : 1))
    }

    results.sort((a, b) => {
      const getDuration = work => parseInt(`${work.duration || 0}`)
      const getYear = work =>
        parseInt(`${work.composition_date || 1905}`.substr(0, 4))

      switch (sort.field) {
        case 'u':
          const dateA = new Date(a.date)
          const dateB = new Date(b.date)
          return dateA > dateB
            ? state.sort.dir === 'asc'
              ? 1
              : -1
            : dateA === dateB
            ? 0
            : state.sort.dir === 'asc'
            ? -1
            : 1
        case 'c':
          const yearA = getYear(a)
          const yearB = getYear(b)
          return yearA > yearB
            ? state.sort.dir === 'asc'
              ? 1
              : -1
            : yearA === yearB
            ? 0
            : state.sort.dir === 'asc'
            ? -1
            : 1
        case 't':
          return a.title > b.title
            ? state.sort.dir === 'asc'
              ? -1
              : 1
            : a.title === b.title
            ? 0
            : state.sort.dir === 'asc'
            ? 1
            : -1
        case 'd':
          const durationA = getDuration(a)
          const durationB = getDuration(b)
          return durationA > durationB
            ? state.sort.dir === 'asc'
              ? 1
              : -1
            : durationA === durationB
            ? 0
            : state.sort.dir === 'asc'
            ? -1
            : 1
      }
    })

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

<form
  class="catalogue search"
  class:embedded
  class:rework-mode={state.reworksOf}
  bind:this={app}
  on:submit|preventDefault
>
  <div class="works">
    {#await loadData()}
      <p>Loading catalogue data...</p>
    {:then data}
      <div class="row">
        <div class="column list">
          {#if !embedded && !state.reworksOf}
            <Sort {state} on:sort={e => (state.sort = e.detail)} />
          {/if}
          <Worklist
            catalogue={data.catalogue}
            {embedded}
            i18n={data.i18n}
            {state}
            works={results}
            on:selectCategory={selectCategory}
            on:showReworks={e =>
              (state.reworksOf = state.reworksOf === e.detail ? '' : e.detail)}
          />
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
    {:catch error}
      <p>Failed to initialize catalogue: <strong>{error.message}</strong>.</p>
      {console.error(error) && ''}
    {/await}
  </div>
</form>

<style>
  .item {
    width: 250px;
    opacity: 1;
  }
  .item .thumbnail {
    max-height: 300px;
    overflow: hidden;
    border-radius: 8px;
  }
  .item .thumbnail img {
    width: 100%;
    border-radius: 8px;
  }
  .item .info {
    margin-top: 10px;
    font-weight: bold;
    color: #777;
  }
  .item.animate {
    transition: opacity ease 1s;
    transition-delay: 0.2s;
    opacity: 1;
  }
  .loading {
    position: absolute;
    width: 100%;
    height: 50px;
    line-height: 50px;
    text-align: center;
    font-weight: bold;
  }
</style>
