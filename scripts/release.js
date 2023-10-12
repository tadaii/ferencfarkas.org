const { exec } = require('shelljs')
const fs = require('fs-extra')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')

const { bumpVersion, getLatestTagCommit, getLastUpdates } = require('./common')

const check = async () => {
  const dir = '.'
  const masterBranch = 'master'
  const previewBranch = 'preview'

  const statusMatrix = await git.statusMatrix({ fs, dir })
  const changes = statusMatrix.filter(
    f => !(f[1] === 1 && f[2] === 1 && f[3] === 1)
  )
  const isClean = changes.length === 0

  if (!isClean) {
    console.error(
      '> Branch is not clean. Please commit or stash your changes before running this script:'
    )
    console.error(changes)
    return
  }
}

const release = async () => {
  const dir = '.'
  const masterBranch = 'master'
  const previewBranch = 'preview'

  const statusMatrix = await git.statusMatrix({ fs, dir })
  const changes = statusMatrix.filter(
    f => !(f[1] === 1 && f[2] === 1 && f[3] === 1)
  )
  const isClean = changes.length === 0

  if (!isClean) {
    console.error(
      '> Branch is not clean. Please commit or stash your changes before running this script:'
    )
    console.error(changes)
    return
  }

  let userName = process.argv[3]
  let userEmail = process.argv[4]

  if (!userName) {
    userName = await git.getConfig({ fs, dir, path: 'user.name' })
  }

  if (!userEmail) {
    userEmail = await git.getConfig({ fs, dir, path: 'user.email' })
  }

  if (!userName && !userEmail) {
    console.error('> Username and/or user email could not be found.')
    console.error(
      "> You can provide them either via the current repo's git config or via command args => `node scripts/release <username> <email>`"
    )
    return
  }

  // Check if current branch is preview
  const currentBranch = await git.currentBranch({ fs, dir, fullname: false })

  if (currentBranch !== previewBranch) {
    console.error(
      `> You're not in the ${previewBranch} branch. Please switch to this branch before running this script.`
    )
    return
  }

  // Pull current branch (preview)
  let ref = previewBranch
  await git.pull({
    fs,
    http,
    dir,
    ref,
    singleBranch: true,
    author: {
      name: userName,
      email: userEmail,
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: new Date().getTimezoneOffset(),
    },
  })

  // Checkout and pull master branch
  ref = masterBranch
  await git.checkout({ fs, dir, ref })
  await git.pull({
    fs,
    http,
    dir,
    ref,
    singleBranch: true,
    author: {
      name: userName,
      email: userEmail,
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: new Date().getTimezoneOffset(),
    },
  })

  // Back to preview branch
  ref = previewBranch
  await git.checkout({ fs, dir, ref })

  // Check content changes since last release
  const { lastUpdatesSummary } = await getLastUpdates()
  const countContentChanges = Object.entries(lastUpdatesSummary).reduce(
    (countChanges, [key, value]) => {
      if (typeof value !== 'object') {
        return countChanges
      }

      countChanges += value.added + value.updated + value.deleted
      return countChanges
    },
    0
  )

  if (countContentChanges === 0) {
    console.error('> No content changes since last release. Exiting')
    return
  }

  // Get release (x.x.x) from latest tag
  const { latestTag } = await getLatestTagCommit(dir)

  // Bump release (minor by default)
  const release = await bumpVersion(latestTag.tag)

  // Push to origin with os client to use system credentials
  exec('git push')

  // Switch to master branch
  ref = masterBranch
  await git.checkout({ fs, dir, ref })

  // Merge preview in master and push to origin
  await git.merge({ fs, dir, ours: ref, theirs: previewBranch })

  // Push to origin with os client to use system credentials
  exec('git push')

  // Push tag to origin
  // Push to origin with os client to use system credentials
  exec(`git push origin ${release}`)
}

if (process.argv[2] === 'check') {
  check()
} else {
  release()
}
