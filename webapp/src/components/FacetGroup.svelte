<script>
  import { createEventDispatcher } from 'svelte'
  import { serialize } from '../helpers/facets'

  export let group = ''
  export let label = ''
  export let facets = {}

  const MAX_FACETS = 5
  const dispatch = createEventDispatcher()

  let expanded = false

  $: facetsList = getFacets(facets)
    .slice(0, expanded ? facets.length : MAX_FACETS)

  function getFacets(facets) {
    return Object.entries(facets)
      .sort((a, b) => b[1].count > a[1].count ? 1 : -1)
      .map(([ value, facet ]) => ({ value, facet }))
  }
</script>

<ul>
  {#each facetsList as { value, facet }}
    <li>
      <label>
        <input
          type="checkbox"
          name={serialize(group, value)}
          bind:checked={facet.active}
          on:click={() => dispatch(
            'refine',
            serialize(group, value)
          )}
        >
        <span class="facet--name">{facet.label}</span>
        <span class="facet--count">{facet.count}</span>
      </label>
    </li>
  {/each}
</ul>
{#if Object.keys(facets).length > MAX_FACETS}
  <button
    class="link facet--more"
    on:click|preventDefault={() => { expanded = !expanded }}
  >
    {#if expanded}
      Show first {MAX_FACETS} {label.toLowerCase()}
    {:else}
      Show more {label.toLowerCase()} ({Object.keys(facets).length - MAX_FACETS})
    {/if}
  </button>
{/if}