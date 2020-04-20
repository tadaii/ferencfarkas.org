const { join, resolve } = require('path')
const { readdir, readFile, writeFile } = require('fs-extra')
const yaml = require('yaml')

const src = resolve(__dirname, '../../catalogue')
const dst = resolve(__dirname, '../../website/static/catalogue.json')

const getWorks = async dir => {
  const works = []
  const files = await readdir(dir)

  for (file of files) {
    const content = await readFile(join(dir, file))
    const json = yaml.parse(content.toString())
    json.id = json['catalog-id'].id
    delete json['catalog-id']
    works.push(json)
  }

  return works
}

const prebuild = async ({ src, dst }) => {
  const works = await getWorks(join(src, 'data', 'works'))
  await writeFile(join(dst), JSON.stringify(works), 'utf8')
}

prebuild({ src, dst })
