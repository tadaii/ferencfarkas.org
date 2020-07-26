(() => {
  'use strict'

  const SCOPES = {
    full: {
      label: 'Full catalogue',
      class: 'highlight'
    },
    popular: {
      label: 'Most popular works',
      class: 'focus'
    }
  }

  const SKIP_WORK_KEYS = [
    'id',
    'date',
    'categories',
    'title',
    'description',
    'versions',
    'works'
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

    if (!refinePanel) return

    if (refinePanel.getBoundingClientRect().y <= 0) {
      refinePanelWrapper.classList.add('sticked')
    } else {
      refinePanelWrapper.classList.remove('sticked')
    }
  })

  const searchIdx = (works, idx, query) => {
    const results = idx.search(query)
    const r = results.map(result => result.ref)
    return works.filter(work => r.includes(work.id))
  }

  const search = state => {
    const results = searchIdx(state.works, state.idx, state.query)
    return {
      ...state,
      results,
      facets: buildFacets({ ...state, results }),
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

  const filterResults = state => {
    const activeFacets = Object.entries(state.facets)
      .reduce((allActiveFacets, [key, def]) => {
        const activeFacets = Object.entries(def.facets)
          .filter(([key, { active }]) => active)
          .map(([value]) => `${key}.${value}`)

        return [
          ...allActiveFacets,
          ...activeFacets
        ]}, [])

    return {
      ...state,
      results: state.results.map(work => {
        const filtered =
          activeFacets.length &&
          !work.facets.some(f => activeFacets.includes(f))

        return { ...work, filtered }
      })
    }
  }

  const container = content => h(
    'form',
    { class: 'catalogue search', onsubmit: onSubmit },
    content
  )

  const scopeView = scope => h(
    'fieldset', { class: 'catalogue--scope' }, Object.entries(SCOPES)
      .map(([ value, { label } ]) => h(
        'label', { class: `inline ${scope === value ? 'selected': ''}` }, [
          h('input', {
            type: 'radio',
            name: 'scope',
            value,
            checked: value === scope,
            onchange: (state, event) => ({
              ...state,
              scope: event.target.value
            })
          }),
          label
        ]))
    )

  const queryView = state => h(
    'div', { class: [`search--query-wrapper ${state.focused ? 'focused' : ''}`]
  }, [
    h('input', {
      type: 'search',
      name: 'query',
      value: state.query,
      placeholder: `Filter ${SCOPES[state.scope].label.toLowerCase()} with keywords`,
      oninput: [onSearchInput, event => event.target.value],
      onfocus: (state, event) => ({ ...state, focused: true }),
      onblur: (state, event) => ({ ...state, focused: false })
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
        const active = state.facets.c.facets[category].active
        state.facets.c.facets[category].active = !active
        return filterResults(state)
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
        return [
          typeof value === 'string' || typeof value === 'number' ? value : ''
        ]
    }
  }

  const workField = ({ label, key, value, owners, publishers }) => h(
    'div',
    { class: 'work--field' }, [
      h('dt', {}, [ label ]),
      h('dd', {}, workFieldValue({ key, value, owners, publishers }))
    ])

  const workFields = (state, work) => {
    const fields = state.fields
    const i18n = state.i18n
    const owners = state.owners
    const publishers = state.publishers

    const workFields = Object
      .entries(work)
      .filter(([ key, value ]) => !SKIP_WORK_KEYS.includes(key))

    if (!workFields.length) return

    return h('dl', { class: 'work--fields' }, workFields
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
    )
  }

  const onWorkClick = (state, event) => {
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

  const workTitleView = (state, work) => h('h3', {
    class: 'work--title',
    onclick: onWorkClick
  }, [
    work.title.translations[work.title.main],
    work.title.sort.length > 1
      ? h('span', {}, [work.title.sort
          .filter(key => key !== work.title.main)
          .map(key => work.title.translations[key])
          .join(' / ')
        ])
      : ''
  ])

  const workView = (work, state, type) => {
    return h('li', {
      class: `work work--item-${type || 'container'}`,
      id: work.id
    }, [
      work.categories && categoryTags(state, work),
      work.title && workTitleView(state, work),
      work.version && h('div', {
        class: 'work--version',
        onclick: onWorkClick
      }, [ work.version ]),
      work.description && h('div', {
        class: 'work--description',
        onclick: onWorkClick
      }, [ work.description ]),
      workFields(state, work),
      work.works && h('ul', { class: 'works--list' }, work.works
        .map(subWork => workView(subWork, state, 'work'))),
      work.versions && h('ul', { class: 'works--list' }, work.versions
        .map(version => workView(version, state, 'version')))
    ])
  }

  const worksView = state => h(
    'ul', { class: 'works--list' }, state.results
      .slice(
        state.currentPage * state.resultsPerPage,
        (state.currentPage + 1) * state.resultsPerPage
      )
      .filter(work => !work.filtered)
      .map(work => workView(work, state))
  )

  const facetsView = state => Object.entries(state.facets)
    .filter(([ key, def ]) => Object.keys(def.facets).length)
    .map(([ key, def ]) => h(
      'div', { class: `facets ${key}` }, [
        h('h4', {}, [def.label]),
        h('ul', {}, Object.entries(def.facets)
          .sort()
          .map(([ fKey, facet ]) => h(
            'li', {}, [
              h('label', {}, [
                h('input', {
                  type: 'checkbox',
                  name: `${key}.${fKey}`,
                  checked: facet.active,
                  onclick: (state, event) => {
                    facet.active = event.target.checked
                    return filterResults(state)
                  }
                }),
                h('span', { class: 'facet--name' }, [ facet.label ]),
                h('span', { class: 'facet--count' }, [ facet.count ])
              ])
            ])
          )
        )
      ]))

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
      h('span', { class: 'works--count-amount' }, [
        state.results
          .filter(result => !result.filtered)
          .reduce((total, r) => total + r.works.length, 0)
      ]),
      ' works'
    ]),
    h('div', { class: 'row' }, [
      h('div', { class: 'column list' }, worksView(state)),
      h('div', { class: 'column refine' }, [
        h('div', { class: 'refine--wrapper' }, [
          refineHandlerView(),
          h('div', { class: 'refine--inner' }, [
            h('h3', {}, ['Refine results']),
            facetsView(state)
          ])
        ])
      ])
    ])
  ])

  const paginationView = ({ results, size, current }) => {
    const total = results.filter(result => !result.filtered).length

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
              return { ...state, currentPage: page - 1 }
            }
          }, [ page ])
        ]
      ))
    )
  }

  const customizeSection = (state, container) => {
    let section = container

    while (section.tagName.toLowerCase() !== 'section') {
      section = section.parentNode
    }

    if (section) {
      section.style.overflow = 'hidden'
    }

    [document.body, section].forEach(el => {
      Object.values(SCOPES).forEach(scope => {
        el.classList.remove(scope.class)
      })

      el.classList.add(SCOPES[state.scope].class)
    })

    return state
  }

  const buildFacet = (group, results, getValue, getLabel) => results
    .reduce((facets, item) => {
      const add = values => {
        for (const value of values) {
          const label = getLabel(value)

          if (facets[value]) {
            facets[value].count++
          } else {
            facets[value] = { count: 1, label, value, active: false }
          }

          if (!item.facets) {
            item.facets = []
          }

          const workFacet = `${group}.${value}`

          if (!item.facets.includes(workFacet)) {
            item.facets.push(workFacet)
          }
        }
      }

      if (item.works || item.versions) {
        const subFacets = buildFacet(
          group,
          item.works ? item.works : item.versions,
          getValue,
          getLabel
        )

        Object.values(subFacets).forEach(({ count, value }) => {
          const arr = []
          for(var i = 0; i < count; i++) {
            arr.push(value)
          }
          add(arr)
        })
      }

      const values = getValue(item)

      if (!values) return facets
      if (!values.length) return facets

      add(values)

      return facets
    }, {})

  const buildFacets = state => ({
    c: {
      label: 'Categories',
      facets: buildFacet(
        'c',
        state.results,
        item => item.categories,
        facet => state.categories[facet]?.tag
      )
    },
    p: {
      label: 'Publishers',
      facets: buildFacet(
        'p',
        state.results,
        item => {
          // TODO only count 1 for same publisher but different types (e.g. ldz on Paradies der Schwiegersöhne)
          return item.publications?.map(p => p.owner_id)
        },
        facet =>
          state.publishers[facet]?.shortName ||
          state.publishers[facet]?.name
      )
    }
  })

  const loadCatalogue = (state, catalogue) => ({
    ...state,
    categories: catalogue.categories,
    works: catalogue.works,
    owners: catalogue.owners,
    publishers: catalogue.publishers,
    fields: catalogue.fields
  })

  const loadIndex = (state, index) => {
    const idx = lunr.Index.load(index)
    const results = searchIdx(state.works, idx, state.query)
    return {
      ...state,
      idx,
      results,
      facets: buildFacets({ ...state, results })
    }
  }

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
        queryView(state),
        // fieldsView(state.fields),
        resultsView(state),
        paginationView({
          results: state.results,
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
