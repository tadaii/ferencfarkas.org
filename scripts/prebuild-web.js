const { join, resolve } = require('path')
const { copyFile, mkdirp, readdir, readFile, writeFile } = require('fs-extra')
const yaml = require('yaml')
const lunr = require('lunr')

const src = resolve(__dirname, '../catalogue')
const dstCatalogue = resolve(__dirname, '../website/static/_catalogue/c.json')
const dstSearchIdx = resolve(__dirname, '../website/static/_catalogue/i.json')
const dstI18n = resolve(__dirname, '../website/static/_catalogue/i18n')

const yaml2json = async file => {
  console.log(`> Processing ${file}`)

  const content = await readFile(file)
  return yaml.parse(content.toString())
}

const getWorks = async dir => {
  const works = []
  const files = await readdir(dir)

  for (file of files.filter(f => f.endsWith('.yaml'))) {
    works.push(await yaml2json(join(dir, file)))
  }

  return works
}

const buildCatalogue = async src => {
  const a2o = arr => arr.reduce((acc, obj) => {
    if (!obj) return acc
    const id = obj.id
    delete obj.id
    acc[id] = obj
    return acc
  }, {})

  const categories = a2o(await yaml2json(join(src, 'data', 'categories.yaml')))
  const owners = a2o(await yaml2json(join(src, 'data', 'owners.yaml')))
  const publishers = a2o(await yaml2json(join(src, 'data', 'publishers.yaml')))
  const samples = await yaml2json(join(src, 'data', 'samples.yaml'))
  const works = await getWorks(join(src, 'data', 'works'))

  return { categories, owners, publishers, samples, works }
}

const buildSearchIndex = catalogue => {
  const idx = lunr(function () {
    this.ref('id')
    // this.field('cast')
    this.field('composition_date')
    this.field('description')
    this.field('nb')
    // this.field('synopsis')
    this.field('version')

    catalogue.works.forEach(doc => {
      this.add(doc)
    }, this)
  })

  console.log(`> Search index written`)

  return idx
}

const prebuild = async ({ src, dstCatalogue, dstSearchIdx, dstI18n }) => {
  const catalogue = await buildCatalogue(src)
  const searchIdx = buildSearchIndex(catalogue)

  // Write catalogue and search index files.
  await writeFile(dstCatalogue, JSON.stringify(catalogue), 'utf8')
  await writeFile(dstSearchIdx, JSON.stringify(searchIdx), 'utf8')

  // Copy i18n files.
  await mkdirp(dstI18n)
  const srcI18n = join(src, 'i18n')
  const i18nFiles = await readdir(srcI18n)

  for (let file of i18nFiles) {
    await copyFile(join(srcI18n, file), join(dstI18n, file))
    console.log(`> ${file} copied`)
  }
}

prebuild({ src, dstCatalogue, dstSearchIdx, dstI18n })
