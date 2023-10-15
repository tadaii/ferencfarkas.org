const { join, resolve } = require('path')
const fs = require('fs/promises')
const yaml = require('yaml')
const fm = require('front-matter')
const lunr = require('lunr')
require('lunr-languages/lunr.stemmer.support')(lunr)
require('lunr-languages/lunr.multi')(lunr)
require('lunr-languages/lunr.hu')(lunr)
require('lunr-languages/lunr.de')(lunr)
require('lunr-languages/lunr.fr')(lunr)
require('lunr-languages/lunr.es')(lunr)
require('lunr-languages/lunr.it')(lunr)

const { getScoresRefs, SCORE_STATE } = require('./common')

const root = resolve(__dirname, '..')
const src = resolve(root, 'catalogue')
const dstAudioList = resolve(root, 'website/static/_catalogue/a.json')
const dstCatalogue = resolve(root, 'website/static/_catalogue/c.json')
const dstWorks = resolve(root, 'website/data/works.json')
const dstSearchIdx = resolve(root, 'website/static/_catalogue/i.json')
const dstI18nDir = resolve(root, 'website/static/_catalogue/i18n')
const dstAudioDir = resolve(root, 'website/static/audio')
const dstAboutTheWorkDir = resolve(root, 'website/content/work')

const yaml2json = async file => {
  const content = await fs.readFile(file)
  return yaml.parse(content.toString())
}

const getWorks = async ({ dir, genres, categories }) => {
  const works = []
  const files = await fs.readdir(dir)

  for (const file of files.filter(f => f.endsWith('.yaml'))) {
    const filePath = join(dir, file)
    let work = await yaml2json(filePath)
    const defaultVersionIndex =
      work.versions && work.versions.findIndex(v => v.default)

    if (defaultVersionIndex > -1) {
      work = {
        ...work,
        ...work.versions[defaultVersionIndex],
        isDefaultVersion: true,
        versions: work.versions.filter(v => !v.default),
        lastUpdate: '',
      }
    }

    work.genre = categories[work.category].genre

    // Story
    const storyFile = `./catalogue/assets/texts/about/${work.id}.md`
    let hasStory = false
    
    try {
      await fs.access(storyFile)
      hasStory = true
    } catch(_) {}

    if (hasStory) {
      const data = await fs.readFile(storyFile, 'utf8')
      const content = fm(data)
      const isDraft = content.attributes.draft

      if (!isDraft) {
        work.story = `/work/${work.id}`
      }
    }

    // Audios
    const audioFile = `./catalogue/data/audios/${work.id}.yaml`
    let hasAudio = false
    
    try {
      await fs.access(audioFile)
      hasAudio = true
    } catch(_) {}

    if (hasAudio) {
      const audios = await yaml2json(audioFile)
      work.audios = audios
    }

    // Scores
    const scoresFile = `./catalogue/data/scores/${work.id}.yaml`
    let hasScores = false

    try {
      await fs.access(scoresFile)
      hasScores = true
    } catch(_) {}

    if (hasScores) {
      const scores = await yaml2json(scoresFile)
      work.scores = scores.map(score => ({
        id: score.id,
        type: score.score_type
      }))
    }

    works.push(work)
  }

  return works.map(work => {
    if (work.rework_of) {
      work.rework = work.rework_of
      try {
        work.story = works.find(w => w.id === work.rework_of).story
      } catch (e) {
        console.error(
          `Error finding story for work ${work.rework} in ${work.id}:`,
          e
        )
      }
      works.find(w => w.id === work.rework_of).rework = work.rework_of
    }
    return work
  })
}

const buildCatalogue = async src => {
  const a2o = arr =>
    arr.reduce((acc, obj) => {
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
    dir: join(src, 'data', 'works'),
    genres,
    categories,
  })

  console.log('> Catalogue built')

  return { categories, fields, genres, publishers, works }
}

const buildSearchIndex = catalogue => {
  const idx = lunr(function () {
    this.use(lunr.multiLanguage('en', 'de', 'fr', 'it', 'hu', 'es'))
    this.ref('id')
    this.field('id')
    this.field('audios')
    this.field('cast')
    this.field('composition_date')
    this.field('description')
    this.field('nb')
    this.field('synopsis')
    this.field('title')
    this.field('version')
    this.field('world_premiere')

    catalogue.works.forEach(work => {
      // TODO normalize work and remove accents manually
      const doc = { ...work }

      try {
        doc.title = Object.values(doc.title.translations).join(', ')
      } catch (e) {
        console.error(`Cannot get title from values for work ${work.id}:`, e)
        console.log('Debug doc.title.translations:', doc.title.translations)
      }

      if (doc.audios) {
        doc.audios = doc.audios.map(audio => audio.description).join(', ')
      }

      if (doc.cast) {
        doc.cast = doc.cast.map(c => `${c.voice} ${c.role}`).join(', ')
      }

      if (doc.world_premiere) {
        doc.world_premiere = Object.values(doc.world_premiere)
          .map(value => [value].join(', '))
          .join(', ')
      }

      this.add(doc)
    }, this)
  })

  console.log('> Search index written')

  return idx
}

const buildAudioMap = async catalogue => {
  const dir = join(src, 'data', 'audios')
  const files = await fs.readdir(dir)
  const map = {}

  for (const file of files.filter(f => f.endsWith('.yaml'))) {
    const filePath = join(dir, file)
    const workId = file.replace('.yaml', '')
    const audios = await yaml2json(filePath)
    const work = catalogue.works.find(work => work.id === workId)

    if (!work) {
      throw new Error(`Work with ID ${workId} not found`)
    }

    const title = work.title.translations[work.title.main]
    const category = catalogue.categories[work.category].title

    audios.forEach(audio => {
      map[audio.id] = {
        title: audio.description,
        detail: `${title} - ${category}`,
        url: `/audio/${audio.id}.mp3`,
      }
    })
  }

  return map
}

async function run() {
  const catalogue = await buildCatalogue(src)
  const searchIdx = buildSearchIndex(catalogue)
  const audioList = await buildAudioMap(catalogue)

  // Write catalogue and search index files.
  await fs.writeFile(dstAudioList, JSON.stringify(audioList), 'utf8')
  console.log('> Audio list written')

  await fs.writeFile(dstCatalogue, JSON.stringify(catalogue), 'utf8')
  await fs.writeFile(dstSearchIdx, JSON.stringify(searchIdx), 'utf8')

  // Write catalogue works in web data dir.
  const works = catalogue.works.reduce((worksMap, work) => {
    worksMap[work.id] = {
      ...work,
      category: {
        id: work.category,
        ...catalogue.categories[work.category],
      },
    }
    return worksMap
  }, {})

  await fs.writeFile(dstWorks, JSON.stringify(works), 'utf8')

  // Copy i18n files.
  await fs.mkdir(dstI18nDir, { recursive: true })
  const srcI18n = join(src, 'i18n')
  const i18nFiles = await fs.readdir(srcI18n)

  for (const file of i18nFiles) {
    if (!file.endsWith('.json')) {
      continue
    }

    await fs.copyFile(join(srcI18n, file), join(dstI18nDir, file))
  }

  // Copy audio files.
  await fs.mkdir(dstAudioDir, { recursive: true })
  const srcAudioDir = join(src, 'assets', 'audios')
  const audioFiles = await fs.readdir(srcAudioDir)

  for (const file of audioFiles) {
    if (!file.endsWith('.mp3')) {
      continue
    }

    await fs.copyFile(join(srcAudioDir, file), join(dstAudioDir, file))
  }

  // Copy "about the work" (md) files
  await fs.mkdir(dstAboutTheWorkDir, { recursive: true })
  const srcAboutTheWork = join(src, 'assets', 'texts', 'about')
  const aboutTheWorkFiles = await fs.readdir(srcAboutTheWork)

  for (const file of aboutTheWorkFiles) {
    if (!file.endsWith('.md')) {
      continue
    }

    await fs.copyFile(
      join(srcAboutTheWork, file),
      join(dstAboutTheWorkDir, file)
    )
  }
}

run()
