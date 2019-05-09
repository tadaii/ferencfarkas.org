const Bundler = require('parcel-bundler')
const path = require('path')
const fs = require('fs-extra')
// --entry ../frontend/index.html --target ../assets --hugo-config ../config.toml
const yargs = require('yargs')
  .scriptName('hugo-frontend-builder')
  .usage('$0 [args]')
  .command('$0', 'Builds a frontend for Hugo', (yargs) => {
    yargs.option('entry', {
      type: 'string',
      default: 'index.html',
      describe: 'The parcel entry file'
    }).option('target', {
      type: 'string',
      default: 'dist',
      describe: 'The parcel build output directory'
    }).option('hugo-config', {
      type: 'string',
      default: 'config.toml',
      describe: 'The hugo config file'
    })
  })
  .help()
  .argv

/**
 * @function cleanDir Removes all files in directory
 * @param  {String} dir The directory path to clear
 */
const cleanDir = async dir => {
  const files = await fs.readdir(dir)

  files.forEach(file => {
    fs.unlink(path.join(dir, file))
  })
}

/**
 * @function getFileExtension
 * @param  {String} file The file name or path
 * @return {Streing} The extracted file extension
 */
const getFileExtension = file => {
  return file.substr(file.lastIndexOf('.') + 1)
}

/**
 * @function getHashes Gets bundle hashes by file type (js, css, etc.)
 * @param  {String} dir The parcel target directory path
 * @return {Object} A key/value map with file extension as key and hash as value
 */
const getHashes = async dir => {
  const files = await fs.readdir(dir)

  return files
    .filter(file => !file.endsWith('.map') &&
      ['js', 'css'].includes(getFileExtension(file)))
    .reduce((acc, file) => {
      const extension = getFileExtension(file)
      const fileWoExt = file.substr(0, file.length - extension.length - 1)

      acc[extension] = fileWoExt.substr(fileWoExt.lastIndexOf('.') + 1)
      return acc
    }, {})
}

/**
 * @function getHugoConfig Get hugo config as js obnject
 * @param  {String} hugoConfigFile The hugo config file path
 * @return {Object} The hugo config obejct
 */
const getHugoConfig = async hugoConfigFile => {
  const getContent = () => {
    return fs.readFile(hugoConfigFile, 'utf8')
  }

  let content

  switch (getFileExtension(hugoConfigFile)) {
    case 'toml':
      content = await getContent()
      const toml = require('toml')
      return toml.parse(content)

    case 'yaml':
      content = await getContent()
      const yaml = require('yaml')
      return yaml.parse(content)

    case 'json':
      const json = require(hugoConfigFile)
      return json

    default: throw new Error('Only toml, yaml and json are supported')
  }
}

/**
 * @function setHugoConfig Writes hugo config file
 * @param  {Object} config The js config object
 * @param  {String} hugoConfigFile The hugo config file path
 */
const setHugoConfig = async (config, hugoConfigFile) => {
  let content

  switch (getFileExtension(hugoConfigFile)) {
    case 'toml':
      const toml = require('tomlify-j0.4')
      content = toml.toToml(config, { space: 2 })
      break

    case 'yaml':
      const yaml = require('yaml')
      content = yaml.stringify(config, { space: 2 })
      break

    case 'json':
      content = JSON.stringify(config)
      break

    default: throw new Error('Only toml, yaml and json are supported')
  }

  await fs.writeFile(hugoConfigFile, content, 'utf8')
}

/**
 * @function updateHash Updates frontend build hashes in Hugo config file
 * @param  {Object} hashes The parcel hashes map
 * @param  {String} hugoConfig The Hugo config file path
 */
const updateHashes = async (hashes, hugoConfig) => {
  const config = await getHugoConfig(hugoConfig)

  config.params = Object.assign(config.params, { frontend: { hashes } })

  await setHugoConfig(config, hugoConfig)
}

/**
 * @function build Builds the frontend for Hugo
 */
const build = async () => {
  const entry = path.resolve(yargs.entry)
  const target = path.resolve(yargs.target)
  const hugoConfig = path.resolve(yargs.hugoConfig)

  const options = {
    outDir: target,
    contentHash: false
  }

  const bundler = new Bundler(entry, options)

  bundler.on('bundled', async bundle => {
    const hashes = await getHashes(target)
    await updateHashes(hashes, hugoConfig)

    // Remove index.html from target dir
    fs.unlink(path.join(target, 'index.html'), err => {
      if (err) throw err
    })
  })

  await cleanDir(target)
  bundler.bundle()
}

build()
