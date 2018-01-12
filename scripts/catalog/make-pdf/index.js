'use strict'

const PdfPrinter = require('../../../node_modules/pdfmake/src/printer')
const yaml = require('js-yaml');
const { lstatSync, readdirSync, readFileSync, createWriteStream } = require('fs')
const { join } = require('path')

const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = source =>
  readdirSync(source).map(name => join(source, name)).filter(isDirectory)

let  categories
const dirs = getDirectories('/Users/istvan/things/dev/hugo/ferencfarkas.org/public/work/catalog')
const works = dirs.map((dir) => {
  return require(join(dir, readdirSync(dir).filter((file) => file === 'index.json').join('')))
})
try {
  categories = yaml.safeLoad(readFileSync('/Users/istvan/things/dev/hugo/ferencfarkas.org/data/catalog/categories.yaml', 'utf8'));
} catch (e) {
  console.log(e);
}

const dd = {
  footer: function(currentPage, pageCount) {
    return {
      text: currentPage.toString() + ' / ' + pageCount,
      height: 320,
      margin: [0, 10, 0, 0],
      alignment: 'center'
    }
  },
  content: [
    categories.map((category, index) => {
      const worksForCategory = works
        .filter((work) => {
          return work.category_id === category.ff_catalog_id.name
        })
        .map(work => {
          let workTable = Object.keys(work).filter((key) => {
            return key !== 'catalog_id' && key !== 'category_id'
          })
          .map((key) => {
            if (key === 'title') {
              return [
                {},
                { text: work.title, bold: true, fontSize: 9, margin: [0, 22, 40, 0] }
              ]
            } else {
              return [
                { text: key, alignment: 'right', bold: true, fontSize: 6, margin: [0, 0, 0, 1] },
                { text: work[key], margin: [0, -1, 40, -1] }
              ]
            }
          })

          return {
            table: {
              widths: [ 65, '*' ],
              body: workTable
            },
            layout: 'noBorders'
          }
        })

      return [{
        table: {
          widths: [62, '*'],
          body: [
            [{}, { text: (category.ff_title + '').toUpperCase(), fontSize: 15 }]
          ]
        },
        margin: [0, 15, 0, 0],
        layout: 'noBorders',
        pageBreak: index > 0 ? 'before' : ''
      }, worksForCategory]
    })
  ],
  defaultStyle: {
    font: 'OpenSans',
    fontSize: 7.5
  }
}

const root = '/Users/istvan/things/dev/hugo/ferencfarkas.org/scripts/catalog/make-pdf'
const fonts = {
  OpenSans: {
      normal: root + '/fonts/OpenSans-Light.ttf',
      bold: root + '/fonts/OpenSans-Semibold.ttf',
      italics: root + '/fonts/OpenSans-Italic.ttf',
      bolditalics: root + '/fonts/OpenSans-BoldItalic.ttf'
  }
}
const printer = new PdfPrinter(fonts)
const doc = printer.createPdfKitDocument(dd)

doc.pipe(createWriteStream(root + '/catalogue.pdf'))
doc.end()