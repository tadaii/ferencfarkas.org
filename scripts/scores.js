const { readFile, readdir, stat } = require('fs/promises')
const { dirname, join, sep } = require('path')
const { exec } = require('shelljs')
const yaml = require('yaml')
const { getEnv, sshExec } = require('./common')

const env = getEnv()

const STATE = {
  LOCAL_ONLY: 'LOCAL_ONLY',
  MODIFIED: 'MODIFIED',
  NOT_FOUND: 'NOT_FOUND',
  REMOTE_ONLY: 'REMOTE_ONLY',
  SYNCED: 'SYNCED',
}

const buildRemotePath = scoreId => `/${scoreId}.pdf`

const getLocalRefs = async () => {
  const dir = join('catalogue', 'data', 'scores')
  const refs = []
  const files = await readdir(dir)

  for (const file of files) {
    const content = await readFile(join(dir, file), 'utf8')
    const yamlContent = yaml.parse(content)
    let state = STATE.LOCAL_ONLY

    if (!yamlContent) {
      continue
    }

    for (const item of yamlContent) {
      let size = 0

      try {
        size = (await stat(join(env.SCORES_ROOT, item.ref))).size
      } catch (err) {
        state = STATE.NOT_FOUND
      }

      refs.push({ id: item.id, path: item.ref, size, state })
    }
  }

  return refs
}

const getRemoteRefs = async () => {
  return new Promise((resolve, reject) => {
    let output = ''
    const refs = []
    const cmd = `find ${env.SCORES_REMOTE_DEST} -type f -printf '/%P\t%s\n'`
    const onData = data => (output += data)
    const onError = data => reject(data)
    const onDone = () => {
      for (const line of output
        .toString()
        .split('\n')
        .filter(l => l)) {
        const [path, size] = line.split('\t')
        refs.push({ path, size: parseInt(size) })
      }
      resolve(refs)
    }
    return sshExec(cmd, onData, onError, onDone)
  })
}

const getState = async () => {
  const localRefs = await getLocalRefs()
  const remoteRefs = await getRemoteRefs()

  const refs = []

  for (const localRef of localRefs) {
    const remoteRef = remoteRefs.find(
      ref => ref.path === buildRemotePath(localRef.id),
    )

    if (remoteRef) {
      localRef.state =
        remoteRef.size === localRef.size ? STATE.SYNCED : STATE.MODIFIED
    }

    refs.push(localRef)
  }

  for (const remoteRef of remoteRefs) {
    const ref = refs.find(r => buildRemotePath(r.id) === remoteRef.path)

    if (!ref) {
      refs.push({ ...remoteRef, state: STATE.REMOTE_ONLY })
    }
  }

  return refs
}

const sync = async () => {
  const dirs = []
  const files = []
  const removals = []

  for (const file of await getState()) {
    if ([STATE.LOCAL_ONLY, STATE.MODIFIED].includes(file.state)) {
      files.push(file)

      const dir = dirname(buildRemotePath(file.id))
      if (!dirs.includes(dir)) {
        dirs.push(dir)
      }
    }

    if (STATE.REMOTE_ONLY === file.state) {
      removals.push(file)
    }
  }

  const dirsList = dirs
    .map(dir => `"${env.SCORES_REMOTE_DEST}${dir.replaceAll(sep, '/')}"`)
    .join(' ')

  const cmd = `mkdir -p ${dirsList}`
  const onData = () => {}
  const onError = data => {
    console.error(data)
  }
  const onDone = () => {
    console.log('synced dirs!')
  }

  try {
    await sshExec(cmd, onData, onError, onDone)
  } catch (err) {
    console.error(err)
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`syncing ${file.id}... (${i + 1}/${files.length})`)
    const src = join(env.SCORES_ROOT, file.path)
    const dst = join(
      env.SCORES_REMOTE_DEST,
      buildRemotePath(file.id),
    ).replaceAll(sep, '/')
    const remote = `${env.REMOTE_USER}@${env.REMOTE_HOST}`

    if (process.platform === 'win32') {
      exec(`scp "${src}" ${remote}:"'${dst.replaceAll("'", "\\'")}'"`)
    } else {
      exec(`scp "${src}" ${remote}:"${dst}"`)
    }
  }
}

const run = async command => {
  switch (command) {
    case 'diff':
      console.log(JSON.stringify(await getState()))
      break
    default:
      await sync()
  }
}

run(process.argv[2])
