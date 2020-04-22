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
  }

  const search = (state, query) => ({ ...state, query })

  const container = content => h('form', { class: 'catalogue search', onsubmit }, content)

  const queryView = focused => h(
    'div', { class: [`search--query-wrapper ${focused && 'focused'}`]
  }, [
    h('input', {
      type: 'search',
      name: 'query',
      placeholder: 'Egészségedre!',
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
      categories.find(c => c.id === category).tag
    )
  )

  const workField = (key, value) => h('div', { class: 'work--field' }, [
    h('dt', {}, [ key ]),
    h('dd', {}, [ value.toString() ])
  ])

  const workFields = work => Object.entries(work)
    .filter(([ key, value ]) => !SKIP_WORK_KEYS.includes(key))
    .map(([ key, value ]) => workField(key, value))

  const workView = (work, state) => h('div', { class: 'work' }, [
    h('div', { class: 'work--title' }, [
      h('h3', {}, [work.title.translations[work.title.main]]),
      h('div', { class: 'work--tags' }, categoryTags(work, state.categories))
    ]),
    h('div', { class: 'work--description' }, [ work.description ]),
    h('dl', { class: 'work--fields' }, workFields(work))
  ])

  const workList = state => h(
    'ul', { class: 'works--list' }, state.works
      .map(work => workView(work, state))
  )

  const worksView = state => h('div', { class: 'works' }, [
    h('div', { class: 'works--count' }, [
      h('span', { class: 'works--count-amount' }, [ state.works.length ]),
      ' works'
    ]),
    h('div', { class: 'row' }, [
      h('div', { class: 'column list' }, workList(state)),
      h('div', { class: 'column refine' }, [
        h('h3', {}, ['Refine results'])
      ])
    ])
  ])

  const loadCatalogue = (state, catalogue) => ({
    ...state,
    categories: catalogue.categories,
    works: catalogue.works.slice(0, 10)
  })

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
    categories: [],
    works: []
  }, [
    fetchJSON,
    {
      url: '/catalogue.json',
      onresponse: loadCatalogue
    }
  ]]

  app({
    node,
    init,
    view: state => container([
      queryView(state.focused),
      fieldsView(state.fields),
      worksView(state)
    ])
  })
})()