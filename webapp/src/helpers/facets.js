import config from '../configs/facets'

export function serialize(group = '_', value) {
  const _serialize = value => `${group}.${value}`
  return Array.isArray(value)
    ? [].concat(value).map(value => _serialize(value))
    : _serialize(value)
}

export function deserialize(serializedValue) {
  const values = serializedValue.split('.')
  return { group: values[0], value: values[1] }
}

export function setFacets(works = []) {
  return works.map(work => ({
    ...work,
    facets: Object.entries(config).reduce((list, [ group, def ]) => {
      const values = def.getValues(work)

      if (values.length) {
        list = [...list, ...serialize(group, values)]
      }

      return list
    }, [])
  }))
}

export function getFacets({
  activeFacets = [], categories = {}, genres = {}, publishers = {}, works = []
}) {
  const map = works.reduce((map, work) => {
    for (const facet of work.facets) {
      if (!map[facet]) {
        map[facet] = 0
      }
      map[facet] += 1
    }
    return map
  }, {})

  return Object.entries(map).reduce((list, [ serialized, count ]) => {
    const { group, value } = deserialize(serialized)
    let index = list.findIndex(item => item.group === group)

    if (index === -1) {
      list.push({
        group,
        def: {
          label: config[group].label,
          facets: {}
        }
      })

      index = list.length - 1
    }

    list[index].def.facets[value] = {
      count,
      value,
      active: activeFacets.includes(serialized),
      label: config[group].getLabel({ value, categories, genres, publishers })
    }

    return list.sort((a, b) => {
      return config[a.group].order > config[b.group].order ? 1 : -1
    })
  }, [])
}
