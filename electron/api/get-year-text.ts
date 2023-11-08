import log from 'electron-log'
import fs from 'fs'
import path from 'path'
import { NoopFileSystemService } from './NoopFileSystemService'

// pnpm run -s script "./electron/api/get-year-text.ts" "getYearText" "2023"

const yearTextFilename = 'year-text.json'

export async function getYearText(year: number) {
  const fileSystem = new NoopFileSystemService()

  fileSystem.setContext(year.toString())

  let yearText: string
  try {
    await fileSystem.ensureDirectoryIsCreated(fileSystem.targetDir)

    const yearTextFile = await fs.promises.readFile(path.join(fileSystem.targetDir, yearTextFilename), 'utf-8')

    log.debug('Loading Year Text from cache')

    yearText = JSON.parse(yearTextFile).content
  } catch {
    const url = new URL('https://wol.jw.org/wol/finder')
    url.searchParams.set('docid', `110${year}800`)
    url.searchParams.set('wtlocale', 't')
    url.searchParams.set('format', 'json')
    url.searchParams.set('snip', 'yes')
  
    log.debug('Fetching Year Text:', url.href)
  
    const data = await fetch(url).then(res => res.json())

    await fs.promises.writeFile(path.join(fileSystem.targetDir, yearTextFilename), JSON.stringify(data, null, 2))
  
    yearText = data.content
  }

  return yearText
}
