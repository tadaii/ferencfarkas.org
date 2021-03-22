<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import WorkFields from './WorkFields.svelte'

  export let categories = {}
  export let embedded = false
  export let fields = []
  export let i18n = {}
  export let index = -1
  export let isSub = false
  export let publishers = {}
  export let reworkActive = false
  export let showID = false
  export let work = {}

  const dispatch = createEventDispatcher()

  let open = false
  let clicked = false

  $: isRework = work.rework !== work.id
  $: reworked = reworkActive && !isRework
  $: title = work.title?.translations[work.title?.main]
  $: selected = clicked && reworkActive

  function toggleFields() {
    open = !open
  }

  function toggleRework() {
    clicked = !reworkActive
    dispatch('showReworks', work.rework || work.id)
  }
</script>

<li
  class="work"
  id={work.id}
  data-index={reworkActive || embedded ? '' : reworkActive ? index : index + 1}
>
  {#if !embedded && reworked}
    <div class="work--rework-info">
      <p>
        You are seeing the list of works that have been reworked based on
        <strong>{title}</strong>.
        <br />
        You can go
        <button class="link back" on:click|stopPropagation={toggleRework}
          >back to the previous list</button
        > by clicking ony any of the "Rework" / "Reworked" buttons.
      </p>
    </div>
  {/if}

  <div
    class="work--{isSub ? 'sub' : 'container'}"
    class:open
    class:black={reworked}
    class:selected
    on:click|stopPropagation={toggleFields}
  >
    <!-- Work ID -->
    {#if showID && work.id}
      <button
        class="work--id"
        on:click|stopPropagation={e =>
          navigator.clipboard.writeText(e.target.textContent)}
      >
        {work.id}
      </button>
    {/if}

    <!-- Category -->
    {#if work.category}
      <button
        class="tag"
        disabled={reworkActive}
        on:click|stopPropagation={() =>
          dispatch('selectCategory', work.category)}
      >
        {categories[work.category].tag}
      </button>
    {/if}

    <!-- Rework -->
    {#if work.rework}
      <button
        class="tag rework{isRework ? '' : 'ed border'}"
        class:active={reworkActive}
        on:click|stopPropagation={toggleRework}
      >
        {#if reworked}
          Reworked
        {:else}
          Rework{isRework ? '' : 'ed'}
        {/if}
      </button>
    {/if}

    <!-- Title -->
    {#if work.title}
      <h3 class="work--title">
        <span>
          {title}
        </span>
        {#if work.texts || work.libretto}
          <ul class="work--languages">
            {#each Object.keys({ ...work.texts, ...work.libretto }) as lang}
              <li>{lang}</li>
            {/each}
          </ul>
        {/if}
        {#if work.title.sort.length > 1}
          <div class="work--title-translations">
            {work.title.sort
              .filter(lang => lang !== work.title.main)
              .map(lang => work.title.translations[lang])
              .join(' / ')}
          </div>
        {/if}
      </h3>
    {/if}

    <!-- Description -->
    {#if work.description}
      <div class="work--description">
        {work.description}
        {#if work.note}
          <div class="work--note">{work.note}</div>
        {/if}
      </div>
    {/if}

    <!-- Version -->
    {#if work.version && !work.isDefaultVersion}
      <div class="work--version">
        {work.version}
      </div>
    {/if}

    <!-- Fields -->
    {#if fields.length}
      <WorkFields {work} {fields} {i18n} {publishers} />
    {/if}

    {#if work.versions}
      <ul class="works--list">
        {#each work.versions as version}
          <svelte:self
            work={version}
            isSub={true}
            {categories}
            {fields}
            {i18n}
            {publishers}
          />
        {/each}
      </ul>
    {/if}

    <!-- Multimedia -->
    {#if work.story || work.audios}
      <div class="work--multimedia">
        {#if work.story && !embedded}
          <a class="link work--story" href={work.story}> About the work </a>
        {/if}
        {#if work.audios}
          {#each work.audios as audio}
            <button
              class="play small"
              data-audio={audio.id}
              data-title={audio.description}
              on:click|stopPropagation={event => {
                window.dispatchEvent(
                  new window.CustomEvent('play', {
                    detail: { target: event.target, audio: audio.id },
                  })
                )
              }}
            >
              <div class="play--button" />
              <div class="play--meta">
                <h5>{audio.description}</h5>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
  {#if reworked}
    <div class="work--rework-label">Reworks</div>
  {/if}
</li>
