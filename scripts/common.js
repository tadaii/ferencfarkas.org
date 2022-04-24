const format = require('date-fns/format')
const fs = require('fs-extra')
const git = require('isomorphic-git')
const { exec } = require('shelljs')

const getLatestTagCommit = async (dir = '.', tagHistoryIndex = 1) => {
  const tags = await git.listTags({ fs, dir })
  const latestTag = tags
    .map(tag => ({
      tag,
      num: parseInt(
        tag
          .split('.')
          .map(n => n.padStart(2, '0'))
          .join('')
      ),
    }))
    .sort((a, b) => (a.num > b.num ? 1 : a.num < b ? -1 : 0))
    .reverse()[tagHistoryIndex]

  const latestRef = await git.resolveRef({ fs, dir, ref: latestTag.tag })
  const latestCommit = await git.readCommit({ fs, dir, oid: latestRef })

  return { tags, latestTag, latestRef, latestCommit }
}

const bumpVersion = async (version, level = 'minor') => {
  exec(`npm version ${level} --tag-version-prefix=''`)
  return version
    .split('.')
    .map((n, i) => {
      const v = parseInt(n)

      if (
        (level === 'major' && i === 0) ||
        (level === 'minor' && i === 1) ||
        (level === 'patch' && i === 2)
      ) {
        return v + 1
      }

      return v
    })
    .join('.')
}

const getLastUpdates = async function () {
  const dir = '.'
  const { latestTag, latestCommit } = await getLatestTagCommit(dir)

  const since = new Date(latestCommit.commit.author.timestamp * 1000)

  console.log(
    `> Gathering updates since release ${latestTag.tag} (${format(
      since,
      'yyyy-MM-dd'
    )})...`
  )

  const commits = await git.log({ fs, dir, since })
  const hashes = commits.map(c => c.oid)

  async function getFileStateChanges(dir, commitHash1, commitHash2) {
    return git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: commitHash1 }), git.TREE({ ref: commitHash2 })],
      map: async function (filepath, [A, B]) {
        if (filepath === '.') return
        if ((await (A && A.type())) === 'tree') return
        if ((await (B && B.type())) === 'tree') return

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
      },
    })
  }

  const lastUpdates = {
    date: format(new Date(), 'yyyy-MM-dd'),
    since: format(since, 'yyyy-MM-dd'),
    audios: { A: [], U: [], D: [] },
    works: { A: [], U: [], D: [] },
    stories: { A: [], U: [], D: [] },
    pages: { A: [], U: [], D: [] },
  }

  for (let i = 0; i < hashes.length; i++) {
    if (i === hashes.length - 1) {
      break
    }

    const hash = hashes[i]
    const prevHash = hashes[i + 1]
    const changes = await getFileStateChanges(dir, hash, prevHash)

    for (const change of changes) {
      let cat

      if (change.filepath.startsWith('catalogue/data/works/')) {
        cat = 'works'
      } else if (
        change.filepath.startsWith('catalogue/data/audio/') ||
        change.filepath.startsWith('catalogue/assets/audios/')
      ) {
        cat = 'audios'
      } else if (change.filepath.startsWith('website/content/work/')) {
        cat = 'stories'
      } else if (change.filepath.startsWith('website/content/')) {
        cat = 'pages'
      }

      if (!cat) {
        continue
      }

      const list = lastUpdates[cat][change.type]

      if (!list.includes(change.filepath)) {
        list.push(change.filepath)
      }
    }
  }

  // cleanup: remove files from U array if present in A array
  for (const cat of Object.keys(lastUpdates)) {
    if (['date', 'since'].includes(cat)) {
      continue
    }

    lastUpdates[cat].U = lastUpdates[cat].U.filter(
      file => !lastUpdates[cat].A.includes(file)
    )
  }

  const lastUpdatesSummary = Object.entries(lastUpdates).reduce(
    (result, [key, value]) => {
      if (['date', 'since'].includes(key)) {
        result[key] = value
      } else {
        result[key] = {
          added: value.A.length,
          updated: value.U.length,
          deleted: value.D.length,
        }
      }

      return result
    },
    {}
  )

  console.log('> last updates', lastUpdatesSummary)
  return { lastUpdates, lastUpdatesSummary }
}

module.exports = { bumpVersion, getLatestTagCommit, getLastUpdates }
