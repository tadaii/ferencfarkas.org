const { join, resolve } = require('path')
const { readdir, readFile, writeFile } = require('fs-extra')
const yaml = require('yaml')

const src = resolve(__dirname, '../catalogue')
const dst = resolve(__dirname, '../website/static/catalogue.json')

const yaml2json = async file => {
  console.log(`> Processing ${file}`)

  const content = await readFile(file)
  return yaml.parse(content.toString())
}

const getWorks = async dir => {
  const works = []
  const files = await readdir(dir)

  for (file of files) {
    works.push(await yaml2json(join(dir, file)))
  }

  return works
}

const prebuild = async ({ src, dst }) => {
  const categories = await yaml2json(join(src, 'data', 'categories.yaml'))
  const owners = await yaml2json(join(src, 'data', 'owners.yaml'))
  const publishers = await yaml2json(join(src, 'data', 'publishers.yaml'))
  const samples = await yaml2json(join(src, 'data', 'samples.yaml'))
  const works = await getWorks(join(src, 'data', 'works'))

  const catalogue = { categories, owners, publishers, samples, works }

  await writeFile(join(dst), JSON.stringify(catalogue), 'utf8')
}

prebuild({ src, dst })
