(() => {
  'use strict'

  const SCOPES = {
    full: 'Full catalogue',
    selection: 'Our selection',
    popular: 'Most popular works'
  }

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
  const parent = node.parentNode

  if (!node) return

  const onSubmit = (state, event) => {
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
    { class: 'catalogue search', onsubmit: onSubmit },
    content
  )

  const scopeView = scope => h(
    'fieldset', { class: 'catalogue--scope' }, Object.entries(SCOPES)
      .map(([ value, label ]) => h(
        'label', { class: scope === value ? 'selected': '' }, [
          h('input', {
            type: 'radio',
            name: 'scope',
            value: value,
            checked: value === scope,
            onchange: (state, event) => ({
              ...state,
              scope: event.target.value
            })
          }),
          label
        ]))
    )

  const queryView = (focused, scope) => h(
    'div', { class: [`search--query-wrapper ${focused && 'focused'}`]
  }, [
    h('input', {
      type: 'search',
      name: 'query',
      placeholder: `Filter ${SCOPES[scope].toLowerCase()} with keywords`,
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

  const workFieldCast = value => h('ul', {}, [
    value.map(person =>  h('li', {}, [
      person.role,
      person.voice && h('span', {}, [` - ${person.voice} `])
    ]))
  ])

  const workFieldReworks = value => h('ul', {}, [
    value.map(rework =>  h('li', {}, [
      h('a', { href: '#', class: 'link' }, [ rework ])
    ]))
  ])

  const workFieldSources = ({ value, owners }) => h('ul', {}, [
    value.map(source =>  h('li', {}, [
      h('span', {}, [ `${source.type}:` ]),
      h('a', { href: '#', class: 'link' }, [
        `${owners[source.owner_id].name}`
      ])
    ]))
  ])

  const workFieldWorldPremiere = value => {
    let str = value.date || ''
    if (value.location) str += ` -  ${value.location}`
    return value.detail
      ? `${str}<br>${value.detail}`
      : str
  }

  const workFieldValue = ({ key, value, owners, publishers }) => {
    switch (key) {
      case 'cast':
        return workFieldCast(value)
      case 'reworks':
        return workFieldReworks(value)
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
      h('span', { class: 'facet--name' }, [ facet.label ]),
      h('span', { class: 'facet--count' }, [ facet.count ])
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

  const resultsView = state => h('div', { class: 'works' }, [
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

  const paginationView = ({ total, size, current }) => {
    if (total <= size) {
      return
    }

    const maxPages = 7
    const totalPages = Math.ceil(total/size)
    const rangeOffset = (Math.floor(current/maxPages) * maxPages)
    const pageOffest = Math.round((current - rangeOffset) / maxPages)
    const offset = rangeOffset + pageOffest
    let countPages = Math.min(totalPages, maxPages)
    let displayLastPage = true

    if (current === rangeOffset && totalPages - current < maxPages) {
      displayLastPage = false
      countPages = totalPages - current
    }

    const pages = [
      ...[...Array(countPages).keys()].map(index => index + offset + 1),
      ...(displayLastPage
        ? [
          ...(rangeOffset + maxPages + 2 === totalPages ? [] : ['...']),
          ...[totalPages]
        ]
        : []
      )
    ]

    return h(
      'ul', { class: 'works-pagination' }, pages.map(page => h(
        'li', {}, [
          h('button', { class: page === current + 1 && 'active' }, [ page ])
        ]
      ))
    )
  }

  const setSectionBackground = (state, container) => {
    const scopeClasses = {
      full: 'highlight',
      popular: 'invert',
      selection: 'focus'
    }

    let section = container

    while(section.tagName.toLowerCase() !== 'section') {
      section = section.parentNode
    }

    [section, document.body].forEach(el => {
      Object.values(scopeClasses).forEach(className => {
        el.classList.remove(className)
      })

      el.classList.add(scopeClasses[state.scope])
    })

    return state
  }

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
    scope: 'full',
    fields: [
      { name: 'title', title: 'Title', checked: true },
      { name: 'description', title: 'Description', checked: true },
      { name: 'category', title: 'Category', checked: true },
      { name: 'version', title: 'Version' },
      { name: 'composition-date', title: 'Composition date' },
      { name: 'composition-location', title: 'Composition location' }
    ],
    resultsPerPage: 10,
    currentPage: 0,
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
        scopeView(state.scope),
        queryView(state.focused, state.scope),
        fieldsView(state.fields),
        resultsView(state),
        paginationView({
          total: state.results.length,
          size: state.resultsPerPage,
          current: state.currentPage
        })
      ])
    },
    subscriptions: state => [
      [
        (dispatch, options) => {
          dispatch(setSectionBackground(state, options.parent))
          return () => {}
        }, { parent }
      ]
    ]
  })
})()
