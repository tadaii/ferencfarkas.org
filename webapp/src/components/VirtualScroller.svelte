<script>
  import { onMount } from 'svelte'

  export let items
  export let cclass

  let container

  $: {
    console.log($$slots)
  }

  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0,
  }

  const callback = (entries, observer) => {
    console.log(entries, observer)
  }

  onMount(() => {
    Array.from(container.children).forEach(item => {
      new IntersectionObserver(callback, options).observe(item)
    })
  })

  function loadNext() {
    console.log('load next')
  }
</script>

<ul class={cclass} bind:this={container}>
  <slot results={items.slice(0, 20)} />
</ul>
<slot name="next" onNext={loadNext} />

<!--
{#each r as work, index (work.id)}
  <template>
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
  </template>
{/each}
-->
