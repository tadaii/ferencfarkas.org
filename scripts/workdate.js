const { writeFile } = require('fs/promises')
const { json2yaml, yaml2json } = require('./common')

const setWorkDate = async filePath => {
  const data = await yaml2json(filePath)
  data.date = new Date().toISOString()

  const content = await json2yaml(data)
  await writeFile(filePath, content, 'utf8')
}

if (process.argv[2]) {
  setWorkDate(process.argv[2])
} else {
  throw new Error('Missing file path argument at position 2')
}
