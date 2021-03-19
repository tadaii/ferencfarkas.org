
const { join, resolve } = require('path')
const fs = require('fs-extra')
const yaml = require('yaml')
const lunr = require('lunr')
const git = require('isomorphic-git')
const format = require('date-fns/format')
const addDays = require('date-fns/addDays')

const isDev = process.argv.slice(2)[0] === 'dev'
const src = resolve(__dirname, '../catalogue')
const dstAudioList = resolve(__dirname, '../website/static/_catalogue/a.json')
const dstCatalogue = resolve(__dirname, '../website/static/_catalogue/c.json')
const dstWorks = resolve(__dirname, '../website/data/works.json')
const dstLastUpdates = resolve(__dirname, '../website/data/lastUpdates.json')
const dstSearchIdx = resolve(__dirname, '../website/static/_catalogue/i.json')
const dstI18nDir = resolve(__dirname, '../website/static/_catalogue/i18n')
const dstAudioDir = resolve(__dirname, '../website/static/audio')

const yaml2json = async file => {
  console.log(`> Processing ${file}`)

  const content = await fs.readFile(file)
  return yaml.parse(content.toString())
}

const getWorks = async ({ dir, genres, categories }) => {
  const works = []
  const files = await fs.readdir(dir)

  for (file of files.filter(f => f.endsWith('.yaml'))) {
    const filePath = join(dir, file)
    let work = await yaml2json(filePath)
    const defaultVersionIndex = work.versions && work.versions
      .findIndex(v => v.default)

    if (defaultVersionIndex > -1) {
      work = {
        ...work,
        ...work.versions[defaultVersionIndex],
        isDefaultVersion: true,
        versions: work.versions.filter(v => !v.default),
        lastUpdate: ''
      }
    }

    work.genre = categories[work.category].genre
    const hasStory = await fs.pathExists(`./website/content/work/${work.id}.md`)

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
      const doc = { ...work }

      doc.title = Object.values(doc.title.translations).join(', ')

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

const getLastUpdates = async () => {
  const dir = '.'
  const tags = await git.listTags({ fs, dir })
  const latestTag = tags.map(tag => ({
    tag,
    num: parseInt(tag.split('.').map(n => n.padStart(2, '0')).join(''))
  }))
    .sort((a, b) => a < b ? 1 : a > b ? -1 : 0)
    .reverse()[0]

  console.log('> latest git tag', latestTag)

  const latestRef = await git.resolveRef({ fs, dir, ref: latestTag.tag })
  const since = isDev
    ? addDays(new Date(), -3)
    : new Date((await git.readCommit({ fs, dir, oid: latestRef }))
      .commit.author.timestamp * 1000)

  console.log(`> Gathering updates since ${format(since, 'yyyy-MM-dd')}...`)

  const commits = (await git.log({ fs, dir, since }))
  const hashes = commits.map(c => c.oid)

  async function getFileStateChanges(dir, commitHash1, commitHash2) {
    return git.walk({
      fs,
      dir,
      trees: [
        git.TREE({ ref: commitHash1 }),
        git.TREE({ ref: commitHash2 })
      ],
      map: async function (filepath, [A, B]) {
        if (filepath === '.') return
        if (await (A && A.type()) === 'tree') return
        if (await (B && B.type()) === 'tree') return

        // generate ids
        const Aoid = await (A && A.oid())
        const Boid = await (B && B.oid())

        if (!Aoid && !Boid) {
          console.log('Something weird happened:')
          console.log({ A, B })
        }

        // determine modification type
        const type = !Aoid
          ? 'D' // Deleted
          : !Boid
            ? 'A' // Added
            : Aoid !== Boid
              ? 'U' // Updated
              : '-' // Unchanged

        if (type === '-') {
          return
        }

        return { filepath, type }
      }
    })
  }

  const lastUpdates = {
    date: format(new Date(), 'yyyy-MM-dd'),
    since: format(since, 'yyyy-MM-dd'),
    audios: { A: [], U: [], D: [] },
    works: { A: [], U: [], D: [] },
    stories: { A: [], U: [], D: [] },
    pages: { A: [], U: [], D: [] }
  }

  for (let i = 0; i < hashes.length; i++) {
    if (i === hashes.length - 1) {
      break
    }

    const hash = hashes[i]
    const prevHash = hashes[i + 1]
    const changes = (await getFileStateChanges(dir, hash, prevHash))

    for (const change of changes) {
      let list

      if (change.filepath.startsWith('catalogue/data/works/')) {
        list = lastUpdates.works[change.type]
      } else if (change.filepath.startsWith('catalogue/data/audio/')) {
        list = lastUpdates.audios[change.type]
      } else if (change.filepath.startsWith('website/content/work/')) {
        list = lastUpdates.stories[change.type]
      } else if (change.filepath.startsWith('website/content/')) {
        list = lastUpdates.pages[change.type]
      }

      if (!list) {
        continue
      }

      if (!list.includes(change.filepath)) {
        list.push(change.filepath)
      }
    }
  }

  console.log('> last updates', lastUpdates)
  return lastUpdates
}

  ; (async () => {
    const catalogue = await buildCatalogue(src)
    const searchIdx = buildSearchIndex(catalogue)
    const audioList = buildAudioMap(catalogue)

    // Write catalogue and search index files.
    await fs.writeFile(dstAudioList, JSON.stringify(audioList), 'utf8')
    await fs.writeFile(dstCatalogue, JSON.stringify(catalogue), 'utf8')
    await fs.writeFile(dstSearchIdx, JSON.stringify(searchIdx), 'utf8')

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

    await fs.writeFile(dstWorks, JSON.stringify(works), 'utf8')

    // Copy i18n files.
    await fs.mkdirp(dstI18nDir)
    const srcI18n = join(src, 'i18n')
    const i18nFiles = await fs.readdir(srcI18n)

    for (let file of i18nFiles) {
      if (!file.endsWith('.json')) {
        continue
      }

      await fs.copyFile(join(srcI18n, file), join(dstI18nDir, file))
      console.log(`> ${file} copied`)
    }

    // Copy audio files.
    await fs.mkdirp(dstAudioDir)
    const srcAudioDir = join(src, 'data', 'audio')
    const audioFiles = await fs.readdir(srcAudioDir)

    for (let file of audioFiles) {
      if (!file.endsWith('.ogg') && !file.endsWith('.mp3')) {
        continue
      }

      await fs.copyFile(join(srcAudioDir, file), join(dstAudioDir, file))
      console.log(`> ${file} copied`)
    }

    // Get and write last updates data
    const lastUpdates = await getLastUpdates()
    await fs.writeFile(dstLastUpdates, JSON.stringify(lastUpdates), 'utf8')
  })()
