const { readFile, readdir, stat } = require('fs/promises')
const { join } = require('path')
const yaml = require('yaml')
const { Client } = require('ssh2')
const { getEnv } = require('./common')

const env = getEnv()
const STATE = {
  LOCAL_ONLY: 'LOCAL_ONLY',
  MODIFIED: 'MODIFIED',
  NOT_FOUND: 'NOT_FOUND',
  REMOTE_ONLY: 'REMOTE_ONLY',
  SYNCED: 'SYNCED'
}

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

      refs.push({ path: item.ref, size, state })
    }
  }

  return refs
}

const getRemoteRefs = async () => {
  return new Promise(async (resolve, reject) => {
    const refs = []
    const conn = new Client()
    const privateKey = await readFile(env.REMOTE_KEY)

    conn.on('ready', () => {
      const cmd = `find ${env.SCORES_REMOTE_DEST} -type f -printf '%p %s\n'`
      conn.exec(cmd, (err, stream) => {
        if (err) {
          reject(err)
        }

        stream.on('close', (code, signal) => {
          conn.end()
          resolve(refs)
        }).on('data', (data) => {
          for (const line of data.toString().split('\n').filter(l => l)) {
            const [path, size] = line.split(' ')
            refs.push({
              path: path.replace(env.SCORES_REMOTE_DEST, ''),
              size: parseInt(size)
            })
          }
        }).stderr.on('data', (data) => {
          reject(err)
        })
      })
    }).connect({
      host: env.REMOTE_HOST,
      port: env.REMOTE_PORT,
      username: env.REMOTE_USER,
      privateKey
    })
  })
}

const getState = async () => {
  const localRefs = await getLocalRefs()
  const remoteRefs = await getRemoteRefs()
  const refs = []

  for (const localRef of localRefs) {
    let ref = localRef
    const remoteRef = remoteRefs.find(ref => ref.path === localRefs.path)
    
    if (remoteRef) {
      ref.state = remoteRef.size === localRef.size ? STATE.SYNCED : STATE.MODIFIED
    }

    refs.push(ref)
  }

  for (const remoteRef of remoteRefs) {
    const ref = refs.find(r => r.path === remoteRef.path)

    if (!ref) {
      refs.push({ ...remoteRef, state: STATE.REMOTE_ONLY })
    }
  }

  return refs
}

const sync = async () => {
  console.log('syncing....')
}

const run = async (command) => {
  switch (command) {
    case 'diff':
      console.log(JSON.stringify(await getState()))
      break
    default:
      await sync()
  }
}

run(process.argv[2])