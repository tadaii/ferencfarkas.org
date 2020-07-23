(() => {
  'use strict'

  const SCOPES = {
    full: 'Full catalogue',
    popular: 'Most popular works'
  }

  const SKIP_WORK_KEYS = [
    'id',
    'date',
    'categories',
    'title',
    'description',
    'version'
  ]

  const app = hyperapp.app
  const h = hyperapp.h
  const node = document.getElementById("catalogue")
  const parent = node && node.parentNode

  if (!node) return

  const formatDate = date => {
    return (new Date(date)).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = seconds => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds - (h * 3600)) / 60)
    const s = Math.floor(seconds - (h * 3600) - (m * 60))

    let str = ''

    if (h > 0) str += `${h}h `
    if (m > 0) str += `${m}‘ `
    if (s > 0) str += `${s}”`

    return str
  }

  window.addEventListener('scroll', () => {
    const refinePanel = document.querySelector('.refine')
    const refinePanelWrapper = document.querySelector('.refine--wrapper')

    if (refinePanel.getBoundingClientRect().y <= 0) {
      refinePanelWrapper.classList.add('sticked')
    } else {
      refinePanelWrapper.classList.remove('sticked')
    }
  })

  const search = state => {
    const results = state.idx.search(state.query)
    const r = results.map(result => result.ref)

    return {
      ...state,
      results: state.works.filter(work => r.includes(work.id)),
      currentPage: 0
    }
  }

  const onSearchInput = (state, query) => {
    return search({ ...state, query })
  }

  const onSubmit = (state, event) => {
    event.preventDefault()
    return search(state)
  }

  const facetFilter = ({ state, field, value }) => {
    const key = `${field}.${value}`
    const facet = state.facets[key]
    state.facets[key] = facet === undefined ? true : !facet

    return {
      ...state,
      results: state.facets[key]
        ? state.results.filter(work => {
            if (Array.isArray(work[field])) {
              return work[field].includes(value)
            }
          })
        : search(state).results,
      currentPage: 0
    }
  }

  const container = content => h(
    'form',
    { class: 'catalogue search', onsubmit: onSubmit },
    content
  )

  const scopeView = scope => h(
    'fieldset', { class: 'catalogue--scope' }, Object.entries(SCOPES)
      .map(([ value, label ]) => h(
        'label', { class: `inline ${scope === value ? 'selected': ''}` }, [
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
    'div', { class: [`search--query-wrapper ${focused ? 'focused' : ''}`]
  }, [
    h('input', {
      type: 'search',
      name: 'query',
      placeholder: `Filter ${SCOPES[scope].toLowerCase()} with keywords`,
      oninput: [onSearchInput, event => event.target.value],
      onfocus: (state ,event) => ({ ...state, focused: true }),
      onblur: (state ,event) => ({ ...state, focused: false })
    }),
    h('button', { type: 'submit' }, ['Search'])
  ])

  const fieldView = ({ name, title, checked }) => h(
    'label', { class: 'inline' }, [
      h('input', { type: 'checkbox', name, checked }),
      title
    ])

  const fieldsView = fields => h(
    'div', { class: 'search--fields-wrapper' }, fields.map(fieldView)
  )

  const categoryTags = (state, work) => work.categories
    .map(category => h('a', {
      class: 'tag',
      href: '#',
      onclick: (state, event) => {
        event.preventDefault()
        return facetFilter({state, field: 'categories', value: category})
      }
    },
    state.categories[category].tag))

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

  const workFieldOwners = ({ value, owners }) => h('ul', {}, [
    value.map(item =>  h('li', {}, [
      h('span', {}, [ `${item.type}:` ]),
      h('a', { href: '#', class: 'link' }, [
        `${owners[item.owner_id].name}`
      ])
    ]))
  ])

  const workFieldWorldPremiere = value => {
    let dateLocation = []

    if (value.date) {
      let date = value.date
      if (date.toString().includes('T')) {
        date = formatDate(date)
      }
      dateLocation.push(date)
    }

    if (value.location) {
      dateLocation.push(value.location)
    }

    dateLocation = dateLocation.join(' - ')

    return value.credits
      ? [dateLocation, h('ul', {}, value.credits.join(', '))]
      : [dateLocation]
  }

  const workFieldValue = ({ key, value, owners, publishers }) => {
    switch (key) {
      case 'cast':
        return [workFieldCast(value)]
      case 'duration':
        return [formatDuration(value)]
      case 'reworks':
        return [workFieldReworks(value)]
      case 'publications':
      case 'sources':
        return workFieldOwners({ value, owners: {...owners, ...publishers} })
      case 'libretto':
      case 'texts':
        return [h('ul', {}, value.map(v => h('li', {}, [v])))]
      case 'world_premiere':
        return workFieldWorldPremiere(value)
      default:
        return [typeof value === 'string' ? value : JSON.stringify(value)]
    }
  }

  const workField = ({ label, key, value, owners, publishers }) => h(
    'div',
    { class: 'work--field' }, [
      h('dt', {}, [ label ]),
      h('dd', {}, workFieldValue({ key, value, owners, publishers }))
    ])

  const workFields = ({ work, fields, i18n, owners, publishers }) => Object
    .entries(work)
    .filter(([ key, value ]) => !SKIP_WORK_KEYS.includes(key))
    .sort((a,b) => {
      const posA = fields.indexOf(a[0])
      const posB = fields.indexOf(b[0])
      return posA > posB ? 1 : posA < posB ? -1 : 0
    })
    .map(([ key, value ]) => workField({
      label: i18n.fields[key],
      key,
      value,
      owners,
      publishers
    }))

  const workTitleView = (state, work) => h('h3', { class: 'work--title' }, [
    categoryTags(state, work),
    work.title.translations[work.title.main],
    work.title.sort.length > 1
      ? h('span', {}, [work.title.sort
          .filter(key => key !== work.title.main)
          .map(key => work.title.translations[key])
          .join(' / ')
        ])
      : ''
  ])

  const workView = (work, state) => h('li', {}, [
    h('div', {
      class: 'work',
      id: work.id,
      href: '#',
      onclick: (state, event) => {
        if (!event.target.classList.contains('tag')) {
          let container = event.target

          while (container && !container.classList.contains('work')) {
            container = container.parentNode
          }

          container.classList.toggle('open')
        }

        event.preventDefault()
        return state
      }
    }, [
      workTitleView(state, work),
      work.version
        ? h('div', { class: 'work--version' }, [ work.version ])
        : '',
      h('div', { class: 'work--description' }, [ work.description ]),
      h('dl', { class: 'work--fields' }, workFields({
        work,
        fields: state.fields,
        i18n: state.i18n,
        owners: state.owners,
        publishers: state.publishers
      }))
    ])
  ])

  const worksView = state => h(
    'ul', { class: 'works--list' }, state.results
      .slice(
        state.currentPage * state.resultsPerPage,
        (state.currentPage + 1) * state.resultsPerPage
      )
      .map(work => workView(work, state))
  )

  const getFacets = (state, key, formatLabel) => {
    return Object.entries(state.results.reduce((facets, item) => {
      const facet = item[key]
      const label = typeof formatLabel === 'function'
        ? formatLabel(facet)
        : key

      if (facets[facet]) {
        facets[facet].count++
      } else {
        facets[facet] = { count: 1, label, value: facet }
      }
      return facets
    }, {})).map(([ subKey, facet ]) => {
      const facetKey = `${key}.${subKey}`
      return h('li', {}, [
        h('label', {}, [
          h('input', {
            type: 'checkbox',
            name: facetKey,
            checked: state.facets[facetKey],
            onclick: (state, event) => {
              return facetFilter({ state, field: key, value: facet.value[0] })
            }
          }),
          h('span', { class: 'facet--name' }, [ facet.label ]),
          h('span', { class: 'facet--count' }, [ facet.count ])
        ])
      ])
    })
  }

  const facetCategories = state => h('ul', {}, getFacets(
    state, 'categories', facet => state.categories[facet].tag
  ))

  const facetsView = state => [
    h('div', { class: 'facets categories' }, [
      h('h4', {}, [ 'Categories' ]),
      facetCategories(state)
    ])
  ]

  const refineHandlerView = () => h('a', {
    class: 'refine--handler',
    href: '#',
    onclick: (state, event) => {
      document.querySelector('.refine').classList.toggle('open')
      event.preventDefault()
      return state
    }
  }, [
    h('svg', { viewBox: '0 0 24 24', width: 24, height: 24 }, [
      h('path', { d: 'M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z' }, [])
    ]),
    h('span', { class: 'refine--handler-label' }, ['Refine results'])
  ])

  const resultsView = state => h('div', { class: 'works' }, [
    h('div', { class: 'works--count' }, [
      h('span', { class: 'works--count-amount' }, [ state.results.length ]),
      ' works'
    ]),
    h('div', { class: 'row' }, [
      h('div', { class: 'column list' }, worksView(state)),
      h('div', { class: 'column refine' }, [
        h('div', { class: 'refine--wrapper' }, [
          refineHandlerView(),
          h('h3', {}, ['Refine results']),
          facetsView(state)
        ])
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

    if (totalPages - current < maxPages) {
      displayLastPage = false

      if (current === rangeOffset) {
        countPages = totalPages - current
      }
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
          h('button', {
            class: page === current + 1 && 'active',
            onclick: (state, event) => {
              event.preventDefault()
              return { ...state, currentPage: page-1 }
            }
          }, [ page ])
        ]
      ))
    )
  }

  const customizeSection = (state, container) => {
    const scopeClasses = {
      full: 'highlight',
      popular: 'focus'
    }

    let section = container

    while (section.tagName.toLowerCase() !== 'section') {
      section = section.parentNode
    }

    if (section) {
      section.style.overflow = 'hidden'
    }

    [document.body, section].forEach(el => {
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
    fields: catalogue.fields,
    results: catalogue.works
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
    fields: [],
    works: [],
    results: [],
    facets: {},
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
        // fieldsView(state.fields),
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
          dispatch(customizeSection(state, options.parent))
          return () => {}
        }, { parent }
      ]
    ]
  })
})()
