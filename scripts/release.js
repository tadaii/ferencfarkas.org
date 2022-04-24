const fs = require('fs-extra')
const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const p = require('../package.json')
const pLock = require('../package-lock.json')
const { getLatestTagCommit, bumpVersion } = require('./common')

;(async () => {
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
  await git.pull({ fs, http, dir, ref, singleBranch: true })

  // Check changes since last release

  // Get release (x.x.x) from latest tag
  const { latestTag } = await getLatestTagCommit(dir)

  // Bump release (minor) in package.json and package-lock.json
  const release = await bumpVersion(latestTag.tag)
  // TODO Commit and push release bump

  console.log('p.version', p.version)
  console.log('pLock.version', pLock.version)
  console.log('release', release)

  return

  await git.merge({ fs, dir, ours: ref, theirs: previewBranch })

  const sha = await git.resolveRef({ fs, dir, ref: 'HEAD' })
  const oid = await git.writeTag({
    fs,
    dir,
    tag: {
      object: sha,
      type: 'commit',
      tag: release,
      tagger: {
        name: userName,
        email: userEmail,
        timestamp: Math.floor(Date.now() / 1000),
        timezoneOffset: new Date().getTimezoneOffset(),
      },
      message: `Tag release ${release}`,
    },
  })

  // TODO Commit and push branch merge + tag on master
})()
