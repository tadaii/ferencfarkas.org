const fs = require('fs-extra')
const path = require('path')
const yaml = require('yaml')
const root = './catalogue/data'

  ; (async () => {
    const works = await fs.readdir(path.resolve(root, 'works'))

    for (const file of works) {
      if (!file.endsWith('.yaml')) {
        continue
      }

      const content = await fs.readFile(
        path.resolve(root, 'works', file),
        'utf8'
      )
      const work = yaml.parse(content)
      const audios = work.audios || []

      if (!audios.length) {
        continue
      }

      const data = []

      for (const audio of audios) {
        data.push({ ...audio })
      }

      await fs.writeFile(
        path.resolve(root, 'audios', file),
        yaml.stringify(data)
      )

      delete work.audios

      await fs.writeFile(
        path.resolve(root, 'works', file),
        yaml.stringify(work)
      )
    }
  })()