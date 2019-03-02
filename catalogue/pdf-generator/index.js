'use strict'

const config = require('./config.json')
const PdfPrinter = require('pdfmake')
const yaml = require('yaml')
const shell = require('shelljs')
const { join, resolve, dirname, basename, extname } = require('path')
const { readdirSync, readFileSync, createWriteStream } = require('fs')

// Load yaml file
const loadFile = file => {
  return yaml.parse(readFileSync(resolve(file), 'utf-8'))
}

// Load yaml files from dir
const loadDir = (dir, asMap = false) => {
  const files = readdirSync(resolve(dir)).filter(file =>
    config.src.fileExtensions.includes(extname(file))
  )

  if (asMap) {
    return files.reduce((acc, file) => {
      acc[basename(file, extname(file))] = loadFile(join(dir, file))
      return acc
    }, {})
  }

  return files.map(y => loadFile(join(dir, y)))
}

// Load works from yaml files
const works = loadDir(config.src.works)

// Load relations from yaml files
const relations = loadDir(config.src.relations, true)

// Load categories from yaml file
const categories = loadFile(config.src.categories)

// Load publishers from yaml file
// const publishers = loadFile(config.src.publishers)

// Build PDF content
const dd = {
  footer: function (currentPage, pageCount) {
    return {
      text: currentPage.toString() + ' / ' + pageCount,
      height: 320,
      margin: [0, 10, 0, 0],
      alignment: 'center'
    }
  },
  content: [
    categories.map((category, index) => {
      const worksInCategory = relations.categories[
        category['catalog-id'].uuid
      ].map(uuid => {
        const work = works.find(w => uuid === w['catalog-id'].uuid)
        let workTable = Object.keys(work)
          .filter(
            key =>
              !['catalog-id', 'date', 'original-value', 'movements'].includes(
                key
              )
          )
          .map(key => {
            if (key === 'title') {
              return [
                {},
                {
                  text: work.title,
                  bold: true,
                  fontSize: 9,
                  margin: [0, 22, 40, 0]
                }
              ]
            } else {
              return [
                {
                  text: key,
                  alignment: 'right',
                  bold: true,
                  fontSize: 6,
                  margin: [0, 0, 0, 1]
                },
                { text: work[key], margin: [0, -1, 40, -1] }
              ]
            }
          })

        console.log(JSON.parse(JSON.stringify(work)))
        console.log('------')

        return {
          table: {
            widths: [65, '*'],
            body: workTable
          },
          layout: 'noBorders'
        }
      })

      return [
        {
          table: {
            widths: [62, '*'],
            body: [
              [{}, { text: (category.title + '').toUpperCase(), fontSize: 15 }]
            ]
          },
          margin: [0, 15, 0, 0],
          layout: 'noBorders',
          pageBreak: index > 0 ? 'before' : ''
        },
        worksInCategory
      ]
    })
  ],
  defaultStyle: {
    font: 'OpenSans',
    fontSize: 7.5
  }
}

// Define fonts to use in PDF file
const fonts = {
  OpenSans: {
    normal: resolve('./fonts/OpenSans-Light.ttf'),
    bold: resolve('./fonts/OpenSans-Semibold.ttf'),
    italics: resolve('./fonts/OpenSans-Italic.ttf'),
    bolditalics: resolve('./fonts/OpenSans-BoldItalic.ttf')
  }
}

// Set destination file and create folders if needed
const dst = resolve(config.dst)
const dstDir = dirname(dst)

shell.mkdir('-p', dstDir)

// Print PDF content
const printer = new PdfPrinter(fonts)
const doc = printer.createPdfKitDocument(dd)

// Write PDF file to disk
doc.pipe(createWriteStream(resolve(config.dst)))
doc.end()
