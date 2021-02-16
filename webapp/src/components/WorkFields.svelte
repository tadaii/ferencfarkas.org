<script>
  export let fields = []
  export let i18n = {}
  export let publishers = {}
  export let work = {}

  const SKIP_WORK_KEYS = [
    'audios',
    'category',
    'date',
    'default',
    'description',
    'facets',
    'filtered',
    'genre',
    'id',
    'isDefaultVersion',
    'rework',
    'rework_of',
    'story',
    'title',
    'versions',
    'works',
  ]

  const workFields = Object.entries(work)
    .filter(([ key ]) => !SKIP_WORK_KEYS.includes(key))
    .sort((a,b) => {
        const posA = fields.indexOf(a[0])
        const posB = fields.indexOf(b[0])
        return posA > posB ? 1 : posA < posB ? -1 : 0
      })
      .map(([ key, value ]) => ({ key, value }))

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds - (h * 3600)) / 60)
    const s = Math.floor(seconds - (h * 3600) - (m * 60))

    let str = ''

    if (h > 0) str += `${h}h `
    if (m > 0) str += `${m}‘ `
    if (s > 0) str += `${s}”`

    return str
  }

  function formatDate(date) {
    return (new Date(date)).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getWorldPremiere({date, location}) {
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

<dl class="work--fields">
  {#each workFields as { key, value }}
    <div class="work--field">
      <dt class={key}>{i18n.fields[key]}</dt>
      <dd>
        {#if key === 'cast'}
          <ul>
            {#each value as {  role, voice }}
              <li>
                {role} - <span>{voice}</span>
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
            {#each value as publisher}
              <li>
                {#if publisher.type !== 'all'}
                  <span>{publisher.type}:</span>
                {/if}
                <a href="#" class="link">
                  {publishers[publisher.publisher_id].name}
                </a>
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
        {:else}
          {value}
        {/if}
      </dd>
    </div>
  {/each}
</dl>