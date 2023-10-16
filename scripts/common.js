const { readFileSync } = require('fs')
const { readFile } = require('fs/promises')
const { resolve } = require('path')
const { exec } = require('shelljs')
const { Client } = require('ssh2')

const bumpVersion = async (version, level = 'patch') => version
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

const bumpNpmVersion = async (level = 'patch') => {
  return exec(`npm version ${level} --no-git-tag-version`, { silent: true })
}

const getEnv = () => readFileSync(resolve('.env'), 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=')
    acc[key] = value.trim()
    return acc
  }, {})

const git = cmd => {
  const output = exec(`git ${cmd}`, { silent: true })
  
  if (output.code > 0) {
    throw new Error(output.stderr.trim())
  }

  return output.stdout.trim()
}

const sshExec = async (cmd, onData, onError, onDone) => {
  return new Promise(async (resolve, reject) => {
    const env = getEnv()
    const conn = new Client()
    const privateKey = await readFile(env.REMOTE_KEY)

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          reject(err)
        }

        stream
          .on('data', onData)
          .stderr.on('data', onError)
          .on('close', (code, signal) => {
            conn.end()
            onDone(code, signal)
            resolve()
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

module.exports = { bumpVersion, bumpNpmVersion, getEnv, git, sshExec }
