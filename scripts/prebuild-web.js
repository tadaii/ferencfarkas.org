const { join, resolve } = require('path')
const { copyFile, pathExists, mkdirp, readdir, readFile, writeFile, writeFileSync } = require('fs-extra')
const yaml = require('yaml')
const lunr = require('lunr')

const src = resolve(__dirname, '../catalogue')
const dstAudioList = resolve(__dirname, '../website/static/_catalogue/a.json')
const dstCatalogue = resolve(__dirname, '../website/static/_catalogue/c.json')
const dstWorks = resolve(__dirname, '../website/data/works.json')
const dstSearchIdx = resolve(__dirname, '../website/static/_catalogue/i.json')
const dstI18nDir = resolve(__dirname, '../website/static/_catalogue/i18n')
const dstAudioDir = resolve(__dirname, '../website/static/audio')

const yaml2json = async file => {
  console.log(`> Processing ${file}`)

  const content = await readFile(file)
  return yaml.parse(content.toString())
}

const getWorks = async ({ dir, genres, categories }) => {
  const works = []
  const files = await readdir(dir)

  for (file of files.filter(f => f.endsWith('.yaml'))) {
    let work = await yaml2json(join(dir, file))
    const defaultVersionIndex = work.versions && work.versions
      .findIndex(v => v.default)

    if (defaultVersionIndex > -1) {
      work = {
        ...work,
        ...work.versions[defaultVersionIndex],
        isDefaultVersion: true,
        versions: work.versions.filter(v => !v.default)
      }
    }

    work.genre = categories[work.category].genre
    const hasStory = await pathExists(`./website/content/work/${work.id}.md`)

    if (hasStory) {
      work.story = `/work/${work.id}`
    }

    works.push(work)
  }

  return works.map(work => {
    if (work.rework_of) {
      work.rework = work.rework_of
      work.story = works.find(w => w.id === work.rework_of).story
      works.find(w => w.id === work.rework_of).rework = work.rework_of
    }
    return work
  })
}

const buildCatalogue = async src => {
  const a2o = arr => arr.reduce((acc, obj) => {
    if (!obj) return acc
    const id = obj.id
    delete obj.id
    acc[id] = obj
    return acc
  }, {})

  const genres = a2o(await yaml2json(join(src, 'data', 'genres.yaml')))
  const categories = a2o(await yaml2json(join(src, 'data', 'categories.yaml')))
  const publishers = a2o(await yaml2json(join(src, 'data', 'publishers.yaml')))
  const fields = await yaml2json(join(src, 'data', 'fields.yaml'))
  const works = await getWorks({
    dir: join(src, 'data', 'works'), genres, categories
  })

  return { categories, fields, genres, publishers, works }
}

const buildSearchIndex = catalogue => {
  const idx = lunr(function () {
    this.ref('id')
    this.field('cast')
    this.field('composition_date')
    this.field('description')
    this.field('nb')
    this.field('rework')
    this.field('synopsis')
    this.field('title')
    this.field('version')

    catalogue.works.forEach(work => {
      const doc = { ...work }
      doc.title = Object.values(doc.title.translations).join(', ')
      if (doc.cast) {
        doc.cast = doc.cast.map(c => `${c.voice} ${c.role}`).join(', ')
      }
      this.add(doc)
    }, this)
  })

  console.log(`> Search index written`)

  return idx
}

const buildAudioMap = catalogue => {
  const audioMap = catalogue.works.reduce((map, work) => {
    if (!work.audios) {
      return map
    }

    const title = work.title.translations[work.title.main]
    const category = catalogue.categories[work.category].title

    work.audios.forEach(audio => {
      map[audio.id] = {
        title: audio.description,
        detail: `${title} - ${category}`,
        url: `/audio/${audio.id}.ogg`
      }
    })

    return map
  }, {})

  console.log(`> Audio list written`)

  return audioMap
}

const prebuild = async ({
  src,
  dstAudioList,
  dstCatalogue,
  dstWorks,
  dstSearchIdx,
  dstI18nDir,
  dstAudioDir,
}) => {
  const catalogue = await buildCatalogue(src)
  const searchIdx = buildSearchIndex(catalogue)
  const audioList = buildAudioMap(catalogue)

  // Write catalogue and search index files.
  await writeFile(dstAudioList, JSON.stringify(audioList), 'utf8')
  await writeFile(dstCatalogue, JSON.stringify(catalogue), 'utf8')
  await writeFile(dstSearchIdx, JSON.stringify(searchIdx), 'utf8')

  // Write catalogue works in web data dir.
  const works = catalogue.works.reduce((worksMap, work) => {
    worksMap[work.id] = {
      ...work,
      category: {
        id: work.category,
        ...catalogue.categories[work.category]
      }
    }
    return worksMap
  }, {})

  await writeFile(dstWorks, JSON.stringify(works), 'utf8')

  // Copy i18n files.
  await mkdirp(dstI18nDir)
  const srcI18n = join(src, 'i18n')
  const i18nFiles = await readdir(srcI18n)

  for (let file of i18nFiles) {
    if (!file.endsWith('.json')) {
      continue
    }

    await copyFile(join(srcI18n, file), join(dstI18nDir, file))
    console.log(`> ${file} copied`)
  }

  // Copy audio files.
  await mkdirp(dstAudioDir)
  const srcAudioDir = join(src, 'data', 'audio')
  const audioFiles = await readdir(srcAudioDir)

  for (let file of audioFiles) {
    if (!file.endsWith('.ogg') && !file.endsWith('.mp3')) {
      continue
    }

    await copyFile(join(srcAudioDir, file), join(dstAudioDir, file))
    console.log(`> ${file} copied`)
  }
}

prebuild({
  src,
  dstAudioList,
  dstCatalogue,
  dstWorks,
  dstSearchIdx,
  dstI18nDir,
  dstAudioDir
})
