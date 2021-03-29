const DURATION_RANGES = {
  lt2: {
    label: '< 2‘ ',
    compute: duration => duration < 120
  },
  f2t5: {
    label: '2‘ – 5‘',
    compute: duration => duration >= 120 && duration < 300
  },
  f5t15: {
    label: '5‘ – 15‘',
    compute: duration => duration >= 300 && duration < 900
  },
  f15t30: {
    label: '15‘ – 30‘',
    compute: duration => duration >= 900 && duration < 1800
  },
  f30t1h: {
    label: '30‘ – 1h',
    compute: duration => duration >= 1800 && duration < 3600
  },
  f1ht2h: {
    label: '1h – 2h',
    compute: duration => duration >= 3600 && duration <= 7200
  },
  gt2h: {
    label: '> 2h',
    compute: duration => duration > 7200
  }
}

export default {
  g: {
    order: 1,
    collapsed: false,
    label: 'Genres',
    getValues: work => [work.genre],
    getLabel: ({ value, genres = {} }) => genres[value]?.title
  },
  c: {
    order: 2,
    collapsed: false,
    label: 'Categories',
    getValues: work => [work.category],
    getLabel: ({ value, categories = {} }) => categories[value]?.title
  },
  l: {
    order: 3,
    collapsed: true,
    label: 'Languages',
    getValues: work => Object.keys({ ...work.texts, ...work.libretto }),
    getLabel: ({ value }) => value.toUpperCase()
  },
  p: {
    order: 4,
    collapsed: true,
    label: 'Publishers',
    getValues: work => work.publications
      ? work.publications
        .reduce((grouped, publication) => {
          const id = publication.publisher_id
          if (!grouped.includes(id)) grouped.push(id)
          return grouped
        }, [])
      : ['unpublished'],
    getLabel: ({ value, publishers = {} }) => value === 'unpublished'
      ? 'Unpublished'
      : publishers[value]?.shortName || publishers[value]?.name
  },
  m: {
    order: 5,
    collapsed: true,
    label: 'Multimedia',
    getValues: work => [],
    getLabel: ({ value }) => value
  },
  t: {
    order: 6,
    collapsed: true,
    label: 'Durations',
    getValues: work => Object.entries(DURATION_RANGES)
      .filter(([_, { compute }]) => compute(work.duration))
      .map(([id]) => id),
    getLabel: ({ value }) => DURATION_RANGES[value].label
  },
  d: {
    order: 7,
    collapsed: true,
    label: 'Composition decennies',
    getValues: work => {
      const r = /(19|20)\d{2}/gmi
      let m
      const matches = []

      while ((m = r.exec(work.composition_date)) !== null) {
        if (m.index === r.lastIndex) {
          r.lastIndex++
        }

        matches.push(m[0])
      }

      return matches.reduce((unique, year) => {
        if (year.endsWith(0)) {
          year -= 1
        }

        const d = Math.floor((parseInt(year) % 1900) / 10)
        const decenny = (d > 10
          ? `20${d}1 - 20${d+1}0`
          : d === 9
            ? `19${d}1 - 2001`
            :`19${d}1 - 19${d+1}0`).substr(0,3) + '0s'

        if (!unique.includes(decenny)) {
          unique.push(decenny)
        }

        return unique
      }, [])
    },
    getLabel: ({ value }) => {
      const startYear = parseInt(value.substr(0,4))
      return [startYear + 1, startYear + 10].join(' - ')
    }
  }
}
