import fs from 'node:fs/promises'
import path from 'node:path'

export async function getFilesOrder(filepaths: string[]) {
  const dir = path.dirname(filepaths[0])

  const directory = await fs.readdir(path.resolve(dir))

  return filepaths.toSorted((a, b) => {
    const aIndex = directory.findIndex(it => it.endsWith(path.basename(a)))
    const bIndex = directory.findIndex(it => it.endsWith(path.basename(b)))
    return aIndex - bIndex
  })
}
