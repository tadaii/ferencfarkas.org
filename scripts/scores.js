const { readFileSync } = require('fs')
const { resolve } = require('path')
const { Client } = require('ssh2')

const conn = new Client()
const env = readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=')
    acc[key] = value
    return acc
  }, {})

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    sftp.readdir(env.SCORES_REMOTE_DEST, (err, list) => {
      if (err) throw err
      console.dir(list)
      conn.end();
    })
  })
}).connect({
  host: env.REMOTE_HOST,
  port: env.REMOTE_PORT,
  username: env.REMOTE_USER,
  privateKey: readFileSync(env.REMOTE_KEY)
})