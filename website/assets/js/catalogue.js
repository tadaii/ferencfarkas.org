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
      placeholder: 'Type someting...',
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

  const init = {
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
    works: [
      {
        "id": "0001-csinom-palko",
        "date": "2019-04-08T21:35:59+00:00",
        "title": {
          "main": "hu",
          "original": "hu",
          "sort": [
            "hu"
          ],
          "translations": {
            "hu": "Csínom Palkó"
          }
        },
        "description": "popular romantic opera original version for the radio",
        "composition-date": "1949",
        "source": "score : manuscript by András Farkas",
        "world-premiere": "22.1.1950",
        "nb": "Ferenc Farkas recieved the “Kossuth Prize” for this version in 1950"
      },
      {
        "id": "0004-egy-ur-velenceboel-casanova",
        "date": "2019-04-08T21:36:00+00:00",
        "title": {
          "main": "hu",
          "original": "hu",
          "sort": [
            "hu",
            "en",
            "fr",
            "de"
          ],
          "translations": {
            "de": "Ein Herr aus Venedig, Casanova",
            "en": "A gentleman from Venice, Casanova",
            "fr": "Un seigneur de Venise, Casanova",
            "hu": "Egy ur Velencéből, Casanova"
          }
        },
        "description": "opera in 2 acts",
        "composition-date": "1979-1980",
        "synopsis": "Bolzano, 1756. Casanova, escaping from the lead chambers of Venice meets the Comte of Parma and his former love, Francesca.",
        "setting": "1, 1, 1, 1 – 2, 1, 1, 0 – timp., batt. – arpa, pf. (cel.) – 1 vl. I, 1 vl. II, 1 viola, 1 vlc., 1 cb.",
        "source": "score & piano reduction: manuscript by András Farkas performance material: Hungarian State Opera House of Budapest",
        "world-premiere": "Hungarian State Opera House of Budapest, 4 june 1991, conducted by János Kovács, stage dir.: László Vámos, stage design: Attila Csikós, costumes: Tivadar Márk"
      },
      {
        "id": "0005-the-magic-cupboard",
        "date": "2019-04-08T21:36:00+00:00",
        "title": {
          "main": "en",
          "original": "hu",
          "sort": [
            "en",
            "hu",
            "de",
            "fr"
          ],
          "translations": {
            "de": "Der Wunderschrank",
            "en": "The magic cupboard",
            "fr": "L’armoire magique",
            "hu": "A bűvös szekrény"
          }
        },
        "description": "opera in 2 acts original version based on a story from “Thausand-and-one nights”",
        "composition-date": "1942",
        "synopsis": "Suleika will set her husband free from the prison",
        "setting": "2 (picc.), 2 (c.i.), 2 (II=cl.b.), 2 – 4, 3, 3, 1 – timp., batt. – arpa, cel. – archi",
        "reworking": "The magic cupboard for orchestra - concert-overture from the opera “The magic cupboard” Overture to a comedy for orchestra",
        "world-premiere": "Hungarian State Opera of Budapest, 1942, conducted by Otto Berg, stage dir. : Kálmán Nádasdy, stage design : Gusztáv Oláh, costumes : Tivadar Márk"
      }
    ]
  }

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