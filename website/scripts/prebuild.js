const { join, resolve } = require('path')
const { readdir, readFile, writeFile } = require('fs-extra')
const yaml = require('yaml')

const src = resolve('..', 'catalogue')
const dst = resolve('..', 'website/data')

const getWorks = async dir => {
  const works = []
  const files = await readdir(dir)

  for (file of files) {
    const content = await readFile(join(dir, file))
    works.push(yaml.parse(content.toString()))
  }

  return works
}

const prebuild = async ({ src, dst }) => {
  const works = await getWorks(join(src, 'data', 'works'))
  await writeFile(join(dst, 'works.json'), JSON.stringify(works), 'utf8')
}

prebuild({ src, dst })
