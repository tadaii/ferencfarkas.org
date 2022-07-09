<script>
  import { onMount } from 'svelte'
  import endpoints from './configs/endpoints'
  import { setFacets, serialize } from './helpers/facets'
  import { defaultState, load as loadQS, sync as syncQS } from './services/qs'
  import { initScrollBehaviors, scrollToTop } from './helpers/scroll'
  import Sort from './components/Sort.svelte'
  import WorkList from './components/WorkList.svelte'
  import Refine from './components/Refine.svelte'
  import Pagination from './components/Pagination.svelte'
  import Spinner from './components/Spinner.svelte'

  export let workId

  let app
  let mounted = false // flag for query string (QS) sync
  let index = {} // lunr search index object
  let works = [] // full list of works (unfiltered)
  let data = {}
  let state

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

  function normalizeString(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  function customizeSection(container) {
    let section = container

    while (section.tagName.toLowerCase() !== 'section') {
      section = section.parentNode
    }

    if (section) {
      section.style.overflow = 'hidden'
    }
  }

  async function loadCatalogue() {
    const responses = {}

    await Promise.all(
      Object.entries(endpoints)
        .filter(([key]) => key !== 'index')
        .map(([key, url]) =>
          fetch(url)
            .then(res => res.json())
            .then(data => {
              responses[key] = data
            })
        )
    )

    works = setFacets(responses.catalogue.works)
    data = responses
  }

  async function loadSearchIndex() {
    console.log('loadSearchIndex')
    const res = await fetch(endpoints.index)
    const data = await res.json()

    if (res) {
      index = lunr.Index.load(data)
    }
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
          const titleA = normalizeString(a.title.translations[a.title.main])
          const titleB = normalizeString(b.title.translations[b.title.main])
          return titleA > titleB
            ? state.sort.dir === 'asc'
              ? -1
              : 1
            : titleA === titleB
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
      console.log('index.search', index.search)
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
    <div class="row">
      <div class="column list">
        {#if !embedded && !state.reworksOf}
          <Sort {state} on:sort={e => (state.sort = e.detail)} />
        {/if}
        {#await loadCatalogue()}
          <div class="catalogue--loader">
            <Spinner size="20" radius="8" stroke="2.5" />
            <p>Loading catalogue data</p>
          </div>
        {:then}
          <WorkList
            catalogue={data.catalogue}
            {embedded}
            fields={data.catalogue.fields}
            fullList={works}
            filteredList={results}
            i18n={data.i18n}
            publishers={data.catalogue.publishers}
            {state}
            on:refine={refine}
            on:toggleReworks={e =>
              (state.reworksOf = state.reworksOf === e.detail ? '' : e.detail)}
          />
        {:catch error}
          <p>
            Failed to initialize catalogue: <strong>{error.message}</strong>.
          </p>
          {console.error(error) && ''}
        {/await}
      </div>
      {#if !embedded}
        <div class="column refine">
          <Refine
            activeFacets={state.activeFacets}
            categories={data.catalogue?.categories}
            genres={data.catalogue?.genres}
            publishers={data.catalogue?.publishers}
            {loadSearchIndex}
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
  </div>
</form>
