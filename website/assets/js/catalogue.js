(() => {
  'use strict'

  const SKIP_WORK_KEYS = [
    'id',
    'date',
    'categories',
    'title',
    'description'
  ]

  const app = hyperapp.app
  const h = hyperapp.h
  const node = document.getElementById("catalogue")

  if (!node) return

  const onsubmit = (state, event) => {
    event.preventDefault()
    const results = state.idx.search(state.query)
    const r = results.map(result => result.ref)

    console.log('=>', results)

    return {
      ...state,
      results: state.works.filter(work => r.includes(work.id)).slice(0,10)
    }
  }

  const search = (state, query) => ({ ...state, query })

  const container = content => h(
    'form',
    { class: 'catalogue search', onsubmit },
    content
  )

  const queryView = focused => h(
    'div', { class: [`search--query-wrapper ${focused && 'focused'}`]
  }, [
    h('input', {
      type: 'search',
      name: 'query',
      placeholder: 'Type your query',
      oninput: [search, event => event.target.value],
      onfocus: (state ,event) => ({ ...state, focused: true }),
      onblur: (state ,event) => ({ ...state, focused: false })
    }),
    h('button', { type: 'submit' }, ['Search'])
  ])

  const fieldView = ({ name, title, checked }) => h('label', {}, [
    h('input', { type: 'checkbox', name, checked }),
    title
  ])

  const fieldsView = fields => h(
    'div', { class: 'search--fields-wrapper' }, fields.map(fieldView)
  )

  const categoryTags = (work, categories) => work.categories
    .map(category => h(
      'a',
      { class: 'tag', href: '#' },
      categories[category].tag
    )
  )

  const workFieldSources = ({ value, owners }) => {
    return h('ul', {}, [
      value.map(source =>  h('li', {}, [
        h('i', {}, [ `${source.type}:` ]),
        h('a', { href: '#', class: 'link' }, [
          `${owners[source.owner_id].name}`
        ])
      ]))
    ])
  }

  const workFieldWorldPremiere = value => {
    let str = value.date || ''
    if (value.location) str += ` -  ${value.location}`
    return value.detail
      ? `${str}<br>${value.detail}`
      : str
  }

  const workFieldValue = ({ key, value, owners, publishers }) => {
    switch (key) {
      case 'sources':
        return workFieldSources({ value, owners })
      case 'world_premiere':
        return workFieldWorldPremiere(value)
      default:
        return typeof value === 'string' ? value : JSON.stringify(value)
    }
  }

  const workField = ({ label, key, value, owners, publishers }) => h(
    'div',
    { class: 'work--field' }, [
      h('dt', {}, [ label ]),
      h('dd', {}, [ workFieldValue({ key, value, owners, publishers }) ])
    ])

  const workFields = ({ work, i18n, owners, publishers }) => Object
    .entries(work)
    .filter(([ key, value ]) => !SKIP_WORK_KEYS.includes(key))
    .map(([ key, value ]) => workField({
      label: i18n.fields[key],
      key,
      value,
      owners,
      publishers
    }))

  const workView = (work, state) => h('div', { class: 'work', id: work.id }, [
    h('div', { class: 'work--title' }, [
      h('h3', {}, [work.title.translations[work.title.main]]),
      h('div', { class: 'work--tags' }, categoryTags(work, state.categories))
    ]),
    h('div', { class: 'work--description' }, [ work.description ]),
    h('dl', { class: 'work--fields' }, workFields({
      work,
      i18n: state.i18n,
      owners: state.owners,
      publishers: state.publishers
    }))
  ])

  const worksView = state => h(
    'ul', { class: 'works--list' }, state.results
      .map(work => workView(work, state))
  )

  const getFacets = (results, key, formatLabel) => {
    return Object.entries(results.reduce((facets, item) => {
      const facet = item[key]
      const label = typeof formatLabel === 'function'
        ? formatLabel(facet)
        : key

      if (facets[facet]) {
        facets[facet].count++
      } else {
        facets[facet] = { count: 1, label }
      }
      return facets
    }, {})).map(([ key, facet ]) => h('li', {}, [
      h('input', { type: 'checkbox', name: key }),
      h('span', { class: 'name' }, [ facet.label ]),
      h('span', { class: 'count' }, [ facet.count ])
    ]))
  }

  const facetCategories = state => h('ul', {}, getFacets(
    state.results, 'categories', facet => state.categories[facet].tag
  ))

  const facetsView = state => [
    h('div', { class: 'facets categories' }, [
      h('h4', {}, [ 'Categories' ]),
      facetCategories(state)
    ])
  ]

  const catalogueView = state => h('div', { class: 'works' }, [
    h('div', { class: 'works--count' }, [
      h('span', { class: 'works--count-amount' }, [ state.results.length ]),
      ' works'
    ]),
    h('div', { class: 'row' }, [
      h('div', { class: 'column list' }, worksView(state)),
      h('div', { class: 'column refine' }, [
        h('h3', {}, ['Refine results']),
        facetsView(state)
      ])
    ])
  ])

  const loadCatalogue = (state, catalogue) => ({
    ...state,
    categories: catalogue.categories,
    works: catalogue.works,
    owners: catalogue.owners,
    publishers: catalogue.publishers,
    results: catalogue.works.slice(0, 10)
  })

  const loadIndex = (state, index) => ({
    ...state,
    idx: lunr.Index.load(index)
  })

  const loadI18n = (state, i18n) => ({ ...state, i18n })

  const fetchJSON = (dispatch, options) =>
    fetch(options.url)
      .then(response => response.json())
      .then(data => dispatch(options.onresponse, data))
      .catch(() => dispatch(options.onresponse, {}))

  const init = [{
    focused: false,
    query: '',
    fields: [
      { name: 'title', title: 'Title', checked: true },
      { name: 'description', title: 'Description', checked: true },
      { name: 'category', title: 'Category', checked: true },
      { name: 'version', title: 'Version' },
      { name: 'composition-date', title: 'Composition date' },
      { name: 'composition-location', title: 'Composition location' }
    ],
    i18n: { fields: {} },
    categories: {},
    owners: {},
    publishers: {},
    works: [],
    results: [],
    idx: {}
  }, [
    fetchJSON,
    {
      url: '/_catalogue/c.json',
      onresponse: loadCatalogue
    }
  ], [
    fetchJSON,
    {
      url: '/_catalogue/i.json',
      onresponse: loadIndex
    }
  ], [
    fetchJSON,
    {
      url: '/_catalogue/i18n/en.json',
      onresponse: loadI18n
    }
  ]]

  app({
    node,
    init,
    view: state => {
      window.state = state
      return container([
        queryView(state.focused),
        fieldsView(state.fields),
        catalogueView(state)
      ])
    }
  })
})()