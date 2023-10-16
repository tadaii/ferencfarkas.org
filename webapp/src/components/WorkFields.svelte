<script>
  import { formatDate, formatDuration } from '../helpers/format'
  export let fields = []
  export let i18n = {}
  export let publishers = {}
  export let work = {}

  const SKIP_WORK_KEYS = [
    'audios',
    'category',
    'composition_date',
    'default',
    'description',
    'duration',
    'facets',
    'filtered',
    'genre',
    'id',
    'isDefaultVersion',
    'lastUpdate',
    'order',
    'rework',
    'rework_of',
    'scores',
    'story',
    'title',
    'versions',
    'visible',
    'works',
  ]

  const workFields = Object.entries(work)
    .filter(([key]) => !SKIP_WORK_KEYS.includes(key))
    .sort((a, b) => {
      const posA = fields.indexOf(a[0])
      const posB = fields.indexOf(b[0])
      return posA > posB ? 1 : posA < posB ? -1 : 0
    })
    .map(([key, value]) => ({ key, value }))

  function getWorldPremiere({ date, location }) {
    let dateLocation = []

    if (date) {
      if (date.toString().includes('T')) {
        date = formatDate(date)
      }
      dateLocation.push(date)
    }

    if (location) {
      dateLocation.push(location)
    }

    return dateLocation.join(' - ')
  }
</script>

<dl>
  {#each workFields as { key, value }}
    <dt>{i18n.fields[key] || key}</dt>
    <dd>
      {#if key === 'cast'}
        <ul>
          {#each value as { role, voice }}
            <li>
              {role}
              {#if voice}
                - <em>{voice}</em>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if key === 'duration'}
        {formatDuration(value)}
      {:else if key === 'libretto' || key === 'texts'}
        <ul>
          {#each Object.values(value) as item}
            <li>{item}</li>
          {/each}
        </ul>
      {:else if key === 'movements'}
        <ul class="movements">
          {#each value as movement, index}
            <li class="movement">
              <span class="movement--pos">{index + 1})</span>
              <span class="movement--title">{movement.title}</span>
              {#if movement.duration}
                <span class="movement--duration">
                  {formatDuration(movement.duration)}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if key === 'publications'}
        <ul>
          {#each value as publication}
            <li>
              {#if publication.type !== 'all'}
                <em>{publication.type}:</em>
              {/if}
              {#if publication.download}
                Free download
              {:else if publishers[publication.publisher_id].url}
                <a
                  href={publishers[publication.publisher_id].url}
                  class="link"
                  target="_blank"
                >
                  {publishers[publication.publisher_id].name}
                </a>
              {:else}
                {publishers[publication.publisher_id].name}
                <div class="work-input">
                  Do you have info about this publisher?
                  <br />
                  <a
                    href="/contact?publisher={publication.publisher_id}"
                    target="_blank"
                    class="button"
                    on:click={e => e.stopPropagation()}
                  >
                    Please let us know!
                  </a>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if key === 'world_premiere'}
        {#if value.credits}
          <ul>
            <li>{getWorldPremiere(value)}</li>
            {#each value.credits as credit}
              <li>{credit}</li>
            {/each}
          </ul>
        {:else}
          {getWorldPremiere(value)}
        {/if}
      {:else if key === 'date'}
        {formatDate(value)}
      {:else}
        {value || '-'}
      {/if}
    </dd>
  {/each}
</dl>
