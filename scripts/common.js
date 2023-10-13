const { readFileSync } = require('fs')
const { resolve } = require('path')
const { exec } = require('shelljs')

const bumpVersion = async (version, level = 'patch') => {
  exec(`npm version ${level} --tag-version-prefix='' --silent`)
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

const getEnv = () => readFileSync(resolve('.env'), 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=')
    acc[key] = value
    return acc
  }, {})

module.exports = { bumpVersion, getEnv }
