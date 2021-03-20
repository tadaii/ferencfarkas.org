export const defaultState = {
  activeFacets: [], // facet filters
  page: 1, // page number
  query: '', // lunr search query
  reworksOf: '', // reworks for given work id
  showID: false, // shows work ID
  sort: { field: 'title', dir: 'asc' } // results' sort order
}

export function sync(state) {
  const url = stringify({
    q: state.query,
    f: state.activeFacets,
    r: state.reworksOf,
    showID: state.showID,
    // s: `${state.sort.field}.${state.sort.dir}`,
    // p: state.page
  })

  window.history.replaceState(state, '', `${window.location.pathname}${url}`)
}

export function load(workId) {
  const params = parse(window.location.search)
  return {
    activeFacets: (params.f && [].concat(params.f)) || defaultState.activeFacets,
    page: params.p || defaultState.page,
    query: workId ? `id:${workId}` : params.q || defaultState.query,
    reworksOf: workId || params.r || defaultState.reworksOf,
    showID: params.showID || defaultState.showID,
    sort: params.s?.split('.').reduce((obj, part, i) => {
      if (i === 0) {
        obj.field = part
      } else {
        obj.dir = part
      }
      return obj
    }, {}) || defaultState.sort
  }
}

function parse(queryString) {
  return queryString
    .split(/[\?&]/)
    .filter(value => value)
    .reduce((params, param) => {
      const [key, value] = param.split('=')
      let values = value?.split(',') || true

      if (values === true) {
        params[key] = true
      } else if (values.length === 1) {
        params[key] = decodeURIComponent(value)
      } else {
        params[key] = values.map(value => decodeURIComponent(value))
      }

      return params
    }, {})
}

function stringify(obj) {
  const qs = Object.entries(obj)
    .filter(([_, value]) => value)
    .reduce((stringified, [key, value]) => {
      if (Array.isArray(value) && value.length) {
        stringified.push(`${key}=${value.join(',')}`)
      } else if (typeof value === 'string' && value !== '') {
        stringified.push(`${key}=${value}`)
      } else if (value === true) {
        stringified.push(`${key}`)
      }

      return stringified
    }, []).join('&')

  return qs && `?${qs}`
}
