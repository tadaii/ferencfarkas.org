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
    'category',
    'date',
    'default',
    'description',
    'facets',
    'genre',
    'id',
    'isDefaultVersion',
    'rework',
    'rework_of',
    'title',
    'versions',
    'works',
  ]

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

  const app = hyperapp.app
  const h = hyperapp.h
  const node = document.getElementById("catalogue")
  const parent = node && node.parentNode

  if (!node) return

  const scrollToTop = () => {
    window.scrollTo(0,400)
  }

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

    const coords = refinePanel.getBoundingClientRect()
    const parent = refinePanel.parentElement
    const inner = refinePanel.querySelector('.refine--inner')
    const parentCoords = parent.getBoundingClientRect()
    const heightOffset = coords.height - inner.scrollHeight
    const unfixBottom = parentCoords.bottom > window.innerHeight + heightOffset

    if (coords.y <= 0 && unfixBottom) {
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

    const results = state.results.map(work => {
      let filtered = false
      for (const facet of activeFacets) {
        if (!work.facets.includes(facet)) {
          filtered = true
          break
        }
      }

      scrollToTop()
      return { ...work, filtered }
    })

    return {
      ...state,
      results,
      activeFacets,
      facets: buildFacets({ ...state, results, activeFacets }),
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

  const categoryTag = (state, category) => h('a', {
    class: 'tag',
    href: '#',
    onclick: (state, event) => {
      event.preventDefault()
      const active = state.facets.c.facets[category].active
      state.facets.c.facets[category].active = !active
      return filterResults(state)
    }
  }, state.categories[category].tag)

  const reworkTag = (state, work) => h('a', {
    class: `tag rework ${state.query.includes('rework:' + work.rework) ? 'active' : ''}`,
    href: '#',
    onclick: (state, event) => {
      event.preventDefault()
      return search({
        ...state,
        query: state.query ? '' : `rework:${work.rework}`
      })
    }
  }, 'Rework')

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

  const workFieldPublishers = ({ value, publishers }) => h('ul', {}, [
    value.map(item =>  h('li', {}, [
      h('span', {}, [ `${item.type}:` ]),
      h('a', { href: '#', class: 'link' }, [
        `${publishers[item.publisher_id].name}`
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

  const workFieldValue = ({ key, value, publishers }) => {
    switch (key) {
      case 'cast':
        return [workFieldCast(value)]
      case 'duration':
        return [formatDuration(value)]
      case 'reworks':
        return [workFieldReworks(value)]
      case 'publications':
        return workFieldPublishers({ value, publishers })
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

  const workField = ({ label, key, value, publishers }) => h(
    'div',
    { class: 'work--field' }, [
      h('dt', { class: key }, [ label ]),
      h('dd', {}, workFieldValue({ key, value, publishers }))
    ])

  const workFields = (state, work) => {
    const fields = state.workFields
    const i18n = state.i18n
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
        publishers
      }))
    )
  }

  const onIdClick = (state, event) => {
    navigator.clipboard.writeText(event.target.textContent)
    return state
  }

  const onWorkClick = (state, event) => {
    if (event.target.classList.contains('tag')) {
      return state
    }
    let container = event.target
    while (container && !container.classList.contains('work')) {
      container = container.parentNode
    }
    container.classList.toggle('open')
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

  const workDescriptionView = (state, work) => h('div', {
    class: 'work--description',
    onclick: onWorkClick
  }, [
    work.description,
    work.note && h('div', { class: 'work--note' }, [ work.note ])
  ])

  const workView = (work, state, type) => {
    return h('li', {
      class: `work work--${type || 'container'}`,
      id: work.id
    }, [
      state.showID && work.id && h('div', {
        class: 'work--id',
        onclick: onIdClick
      }, [work.id]),
      work.category && categoryTag(state, work.category),
      work.rework && reworkTag(state, work),
      work.title && workTitleView(state, work),
      work.description && workDescriptionView(state, work),
      work.version && !work.isDefaultVersion && h('div', {
        class: 'work--version',
        onclick: onWorkClick
      }, [ work.version ]),
      workFields(state, work),
      work.versions && h('ul', { class: 'works--list' }, work.versions
        .map(version => workView(version, state, 'sub')))
    ])
  }

  const worksView = state => h(
    'ul', { class: 'works--list' }, state.results
      .filter(work => !work.filtered)
      .slice(
        state.currentPage * state.resultsPerPage,
        (state.currentPage + 1) * state.resultsPerPage
      )
      .map(work => workView(work, state))
  )

  const facetsView = state => Object.entries(state.facets)
    .filter(([ key, def ]) => Object.keys(def.facets).length)
    .map(([ key, def ]) => h(
      'div', { class: `facets ${key}` }, [
        h('h4', {}, [def.label]),
        h('ul', {}, Object.entries(def.facets)
          .sort((a, b) => b[1].count > a[1].count ? 1 : -1)
          .slice(0,5)
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
        ),
        Object.keys(def.facets).length > 5 && h('a', {
          href: '#',
          class: 'link facet--more'
        }, [ `Show more ${def.label.toLowerCase()} (${Object.keys(def.facets).length - 5})` ])
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
          .reduce((total, r) => total + 1, 0)
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
              scrollToTop()
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

  const buildFacet = ({ group, results, activeFacets, getValue, getLabel }) => {
    return results.reduce((facets, item) => {
      const add = values => {
        for (const value of values) {
          const workFacet = `${group}.${value}`
          const label = getLabel(value)

          if (facets[value]) {
            facets[value].count++
          } else {
            facets[value] = {
              count: 1, label, value, active: activeFacets.includes(workFacet)
            }
          }

          if (!item.facets) {
            item.facets = []
          }

          if (!item.facets.includes(workFacet)) {
            item.facets.push(workFacet)
          }
        }
      }

      const values = getValue(item)

      if (!values) return facets
      if (!values.length) return facets

      add(values)

      return facets
    }, {})
  }

  const buildFacets = state => {
    const results = [...state.results.filter(result => !result.filtered)]
    const activeFacets = [...state.activeFacets]
    return {
      g: {
        label: 'Genres',
        facets: buildFacet({
          group: 'g',
          results,
          activeFacets,
          getValue: item => [item.genre],
          getLabel: facet => state.genres[facet]?.title
        })
      },
      c: {
        label: 'Categories',
        facets: buildFacet({
          group: 'c',
          results,
          activeFacets,
          getValue: item => [item.category],
          getLabel: facet => state.categories[facet]?.title
        })
      },
      p: {
        label: 'Publishers',
        facets: buildFacet({
          group: 'p',
          results,
          activeFacets,
          getValue: item => item.publications
            ? item.publications
              .reduce((grouped, publication) => {
                const id = publication.publisher_id
                if (!grouped.includes(id)) grouped.push(id)
                return grouped
              }, [])
            : ['unpublished'],
          getLabel: facet => facet === 'unpublished'
            ? 'Unpublished'
            : state.publishers[facet]?.shortName ||
              state.publishers[facet]?.name
        })
      },
      m: {
        label: 'Multimedia',
        facets: buildFacet({
          group: 'm',
          results,
          activeFacets,
          getValue: item => [],
          getLabel: facet => facet
        })
      },
      t: {
        label: 'Duration',
        facets: buildFacet({
          group: 't',
          results,
          activeFacets,
          getValue: item => Object.entries(DURATION_RANGES)
            .filter(([id, { compute }]) => compute(item.duration))
            .map(([id]) => id),
          getLabel: facet => DURATION_RANGES[facet].label
        })
      },
      d: {
        label: 'Composition decenny',
        facets: buildFacet({
          group: 'd',
          results,
          activeFacets,
          getValue: item => {
            const r = /(19|20)\d{2}/gmi
            let m
            const matches = []
            while ((m = r.exec(item.composition_date)) !== null) {
              if (m.index === r.lastIndex) r.lastIndex++
              matches.push(m[0])
            }
            return matches.reduce((unique, year) => {
              if (year.endsWith(0)) year -= 1
              const d = Math.floor((parseInt(year) % 1900) / 10)
              const decenny = d > 10 ? `20${d}1 - 20${d+1}0` : `19${d}1 - 19${d+1}0`
              console.log(year, '=>', d, '=>', decenny)
              if (!unique.includes(decenny)) unique.push(decenny)
              return unique
            }, [])
          },
          getLabel: facet => facet
        })
      }
    }
  }

  const loadCatalogue = (state, { catalogue, index, i18n }) => {
    const categories = catalogue.categories
    const genres = catalogue.genres
    const publishers = catalogue.publishers
    const workFields = catalogue.fields
    const works = catalogue.works

    const idx = lunr.Index.load(index)
    const results = searchIdx(works, idx, state.query)
    const facets = buildFacets({ ...state, categories, genres, publishers, results })

    return {
      ...state,
      categories,
      facets,
      genres,
      i18n,
      idx,
      publishers,
      results,
      workFields,
      works
    }
  }

  const fetchJSONs = (dispatch, options) => {
    const responses = {}
    Promise.all(Object.entries(options.urls).map(([ key, url ]) => fetch(url)
      .then(response => response.json())
      .then(data => { responses[key] = data })
    ))
    .then(() => dispatch(options.onresponse, responses))
    .catch(() => dispatch(options.onresponse, {}))
  }

  const init = [{
    activeFacets: [],
    categories: {},
    currentPage: 0,
    facets: {},
    fields: [
      { name: 'title', title: 'Title', checked: true },
      { name: 'description', title: 'Description', checked: true },
      { name: 'version', title: 'Version' },
      { name: 'composition-date', title: 'Composition date' },
      { name: 'composition-location', title: 'Composition location' }
    ],
    focused: false,
    genres: {},
    i18n: { fields: {} },
    idx: {},
    publishers: {},
    query: '',
    results: [],
    resultsPerPage: 10,
    scope: 'full',
    showID: true,
    workFields: [],
    works: []
  }, [
    fetchJSONs,
    {
      urls: {
        catalogue: '/_catalogue/c.json',
        index: '/_catalogue/i.json',
        i18n: '/_catalogue/i18n/en.json'
      },
      onresponse: loadCatalogue
    }
  ]]

  app({
    node,
    init,
    view: state => {
      window.state = state
      return container([
        // scopeView(state.scope),
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
