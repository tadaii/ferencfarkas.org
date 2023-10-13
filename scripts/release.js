const { exec } = require('shelljs')
const { bumpVersion } = require('./common')

const masterBranch = 'master-test'
const previewBranch = 'preview'

const git = cmd => {
  const output = exec(`git ${cmd}`, { silent: true })
  return output.stdout.trim()
}

const init = async () => {
  const changes = git('diff --name-only').split('\n').filter(v => v)

  if (changes.length) {
    console.error(
      'Branch is not clean. Please commit or stash your changes before running this script:'
    )
    console.error(changes)
    return
  }

  const userName = git('config --get user.name')
  const userEmail = git('config --get user.email')

  if (!userName && !userEmail) {
    console.error('> Username and/or user email could not be found.')
    console.error(
      "You can provide them either via the current repo's git config or via command args => `node scripts/release <username> <email>`"
    )
    return
  }

  // Check if current branch is preview
  const currentBranch = git('rev-parse --abbrev-ref HEAD')

  if (currentBranch !== previewBranch) {
    console.error(
      `You're not in the ${previewBranch} branch. Please switch to this branch before running this script.`
    )
    return
  }

  // Pull current branch (preview)
  git('pull')

  // Checkout and pull master branch
  git(`checkout ${masterBranch}`)
  git('pull')

  // Back to preview branch
  git(`checkout ${previewBranch}`)

  return true
}

const check = async () => {
  if (!await init()) {
    return
  }

  const files = git(`diff --name-only ${masterBranch}..${previewBranch}`)
    .split('\n')
    .filter(v => v)

  const commits = git(`log ${masterBranch}..${previewBranch}`)
    .split('commit')
    .filter(v => v)
    .map(commitBlock => {
      const hash = commitBlock.substring(0, commitBlock.indexOf('\n')).trim()
      const author = commitBlock.match(/Author: ([^\n]+)/gmi)[0].replace('Author: ', '').trim()
      const date = new Date(commitBlock.match(/Date: ([^\n]+)/gmi)[0].replace('Date: ', '').trim())
      const message = commitBlock.split('\n\n')[1].trim()
      return { hash, author, date, message }
    })
  
  console.log(JSON.stringify({ commits, files }))
}

const release = async () => {
  if (!await init()) {
    return
  }

  const changes = git(`diff --name-only ${masterBranch}..${previewBranch}`).split('\n')
  
  if (changes.length === 0) {
    console.error('No content changes since last release. Exiting')
    return
  }

  // Get release (x.x.x) from latest tag
  const latestTag = git('describe --abbrev=0')

  // Bump release (minor by default)
  const release = await bumpVersion(latestTag)

  // Push to origin
  git('push')

  // Switch to master branch
  git(`checkout ${masterBranch}`)

  // Merge preview in master and push to origin
  git(`merge ${previewBranch}`)

  // Push to origin
  git('push')

  // Push tag to origin
  git(`push origin ${release}`)

  // Back to preview branch
  git(`checkout ${previewBranch}`)

  console.log(`Version ${release} released!`)
}

if (process.argv[2] === 'check') {
  check()
} else {
  release()
}
