(() => {
  'use strict'

  const app = hyperapp.app
  const h = hyperapp.h
  const node = document.getElementById("catalogue")

  if (!node) return

  const onsubmit = (state, event) => {
    event.preventDefault()
    console.log(state)
  }

  const container = content => h('form', { class: 'search', onsubmit }, content)

  const queryView = h('div', { class: 'search--query-wrapper' }, [
    h('input', {
      type: 'search',
      name: 'query',
      placeholder: 'Type someting...'
    }),
    h('button', { type: 'submit' }, ['Search'])
  ])

  const fieldView = ({ name, title, checked }) => h('label', {}, [
    h('input', { type: 'checkbox', name, checked }),
    title
  ])

  const fieldsView = h('div', { class: 'search--fields-wrapper' }, [
    fieldView({ name: 'title', title: 'Title', checked: true }),
    fieldView({ name: 'description', title: 'Description', checked: true }),
    fieldView({ name: 'version', title: 'Version' }),
    fieldView({ name: 'composition-date', title: 'Composition date' }),
    fieldView({ name: 'composition-location', title: 'Composition location' })
  ])

  const init = {
    works: []
  }

  app({
    node,
    init,
    view: state => container([
      queryView,
      fieldsView
    ])
  })
})()