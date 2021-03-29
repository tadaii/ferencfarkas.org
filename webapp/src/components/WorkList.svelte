<script>
  import { createEventDispatcher } from 'svelte'
  import { deserialize, serialize } from '../helpers/facets'
  import Work from './Work.svelte'
  import WorkFields from './WorkFields.svelte'

  export let catalogue = {}
  export let embedded = false
  export let i18n = {}
  export let fields = []
  export let filteredList = []
  export let fullList = []
  export let publishers = {}
  export let state = {}

  const dispatch = createEventDispatcher()

  let works = []
  let container

  $: updateWorks(fullList, filteredList)
  $: reworkActive = state.reworksOf && filteredList.length > 1
  $: reworkTitle = getReworkTitle(state.reworksOf)

  function updateWorks(fullList, filteredList) {
    const list = works.length ? works : [...fullList]

    for (let i = 0; i < list.length; i++) {
      const order = filteredList.findIndex(item => item.id === list[i].id)
      const visible = order > -1

      list[i].visible = visible
      list[i].order = order
    }

    if (!works.length) {
      works = [...fullList]
    } else {
      for (let i = 0; i < works.length; i++) {
        const work = works[i]
        const workEl = document.getElementById(work.id)

        workEl.style.order = work.order

        if (work.visible) {
          workEl.classList.remove('hidden')
        } else {
          workEl.classList.add('hidden')
        }
      }
    }
  }

  function onClick(event) {
    const caller = event.target
    let workEl = caller

    while (!workEl.id) {
      workEl = workEl.parentNode
    }

    const workId = workEl.id
    const work = works.find(w => w.id === workId)

    const facets = work.facets.reduce((facets, facet) => {
      const { group, value } = deserialize(facet)
      facets[group] = value
      return facets
    }, {})

    if (caller === workEl) {
      navigator.clipboard.writeText(work.id)
    }

    if (caller.classList.contains('work--composition-date')) {
      dispatch('refine', serialize('d', facets.d))
    }

    if (caller.classList.contains('work--duration')) {
      dispatch('refine', serialize('t', facets.t))
    }

    if (
      caller.classList.contains('rework') ||
      caller.classList.contains('reworked')
    ) {
      dispatch('toggleReworks', work.rework || work.id)
    }

    if (caller.classList.contains('category')) {
      dispatch('refine', serialize('c', facets.c))
    }

    if (caller.classList.contains('work--language')) {
      dispatch('refine', serialize('l', facets.l))
    }

    if (caller.classList.contains('play')) {
      window.dispatchEvent(
        new window.CustomEvent('play', {
          detail: { target: caller, audio: caller.getAttribute('data-audio') },
        })
      )
    }

    if (caller.classList.contains('work--story')) {
    }

    if (caller.classList.contains('work--detail-toogle')) {
      const fieldsEl = workEl.querySelector('dl')

      if (fieldsEl) {
        fieldsEl.remove()
        workEl.classList.remove('show-fields')
      } else {
        workEl.classList.add('show-fields')
        new WorkFields({
          target: workEl,
          anchor: caller,
          intro: true,
          props: { fields, i18n, publishers, work },
        })
      }
    }
  }

  function getReworkTitle(reworksOf) {
    if (!reworksOf) {
      return
    }

    const work = works.find(work => work.id === reworksOf)
    return work.title?.translations[work.title?.main]
  }
</script>

<div class="works--rework-info" class:visible={reworkActive}>
  <p>
    You are seeing the list of works that have been reworked based on
    <strong>{reworkTitle}</strong>.
    <br />
    You can go
    <button
      class="link back"
      on:click|stopPropagation={dispatch('toggleReworks', state.reworksOf)}
      >back to the previous list</button
    > by clicking ony any of the "Rework" / "Reworked" buttons.
  </p>
</div>

{#if embedded && !reworkActive}
  <br />
{/if}

<ul
  class="works--list"
  bind:this={container}
  on:click={onClick}
  class:show-id={state.showID}
  class:show-reworks={reworkActive}
>
  <li class="reworks-sep">Reworks</li>
  {#each works as work (work.id)}
    <Work
      categories={catalogue.categories}
      {embedded}
      index={work.index}
      {reworkActive}
      {work}
    />
  {/each}
</ul>
