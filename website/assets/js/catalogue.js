(() => {
  'use strict'

  const app = hyperapp.app
  const h = hyperapp.h
  const node = document.getElementById("catalogue")

  if (!node) return

  const onsubmit = (state, event) => {
    event.preventDefault()
  }

  const search = (state, query) => ({ ...state, query })

  const container = content => h('form', { class: 'search', onsubmit }, content)

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

  const workFields = work => h('')

  const workView = work => h('div', { class: 'work' }, [
    h('div', { class: 'work--title' }, [
      h('h3', {}, [work.title.translations[work.title.main]]),
      h('div', { class: 'work--tags' }, [])
    ]),
    h('dl', { class: 'work-fields' }, [])
  ])

  const workList = works => h(
    'ul', { class: 'works--list' }, works.map(workView)
  )

  const worksView = works => h('div', { class: 'works' }, [
    h('div', { class: 'works--count' }, [
      h('span', { class: 'works--count-amount' }, [ works.length ]),
      ' works'
    ]),
    workList(works)
  ])

  const loadCatalogue = (state, works) => ({
    ...state,
    works
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
    ]
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
      worksView(state.works)
    ])
  })
})()