import { addMinutes, format as formatDate, getWeek } from 'date-fns'
import log from 'electron-log/main'
import { isEqual, sortBy, unionWith, uniqBy } from 'lodash'
import { WeekType } from '../../shared/models/WeekType'
import { getWOLWeekUrl } from '../../shared/utils'
import { windows } from '../windows'
import { Downloader } from './Downloader'
import MetadataLoader from './MetadataLoader'
import { CrawlerHandler } from './crawler/CrawlerHandler'
import { MidWeekMeeting } from './crawler/parsers/MidWeekMeeting'
import { SongsParser } from './crawler/parsers/SongsParser'
import { WeekendParser } from './crawler/parsers/WeekendParser'
import { ProcessedResult } from './crawler/types'

// pnpm run -s script "./electron/api/fetch-week-media.ts" "fetchWeekMedia" "new Date('$(date)')" "0"

export async function fetchWeekMedia(date: Date, type: WeekType, force = false) {
  date = addMinutes(date, date.getTimezoneOffset())

  log.info('Fetching data for date:', formatDate(date, 'yyyy-MM-dd'), 'and type:', WeekType[type])
  if (force)
    log.info('-- Fetching with force enabled')
  
  const downloader = new Downloader()
  downloader.setContext(formatDate(date, 'yyyy-w') + `--${type + 1}`)

  const jwURL = getWOLWeekUrl(date)
  
  const metadataLoader = new MetadataLoader(downloader)
  let loadedMetadata = await metadataLoader.loadMetadata(force)
  // force old non-uid items to reload
  if (loadedMetadata?.some(item => !item.uid)) {
    force = true
    loadedMetadata = await metadataLoader.loadMetadata(force)
  }
  let parsingResult: ProcessedResult[] | null = loadedMetadata
  try {
    if (!parsingResult || force) {
      switch (type) {
        case WeekType.MIDWEEK:
          parsingResult = await fetchMidWeekMeetingMedia(jwURL, downloader)
          break
        case WeekType.WEEKEND:
          parsingResult = await fetchWeekendMeetingMedia(jwURL, downloader)
          break
      }
    }
    const weekNumber = getWeek(date, { weekStartsOn: 1 })
    windows.main.webContents.send(`parsed-results/${weekNumber}`, {
      type,
      items: parsingResult,
    })
  } finally {
    log.info('Starting to download')
    const count = await downloader.flush()
    log.info(`Downloaded ${count} media items`)
  }
  parsingResult.forEach(item => {
    item.media.forEach(media => {
      media.downloadProgress = 100
    })
  })
  const mergedResults = sortBy(uniqBy(unionWith(parsingResult, loadedMetadata, (a, b) => {
    return isEqual(a, b)
  }), it => [it.group, it.type, it.label, it.media.map(m => m.path)].flat().join('||')), (it) => it.group.match(/c.ntico/i) ? '000' : it.group)
  for (const item of mergedResults)
    item
  if (mergedResults.length > 0)
    await metadataLoader.saveMetadata(mergedResults)

  return { items: mergedResults }
}

async function fetchMidWeekMeetingMedia(url: string, downloader: Downloader) {
  const handler = new CrawlerHandler(url, downloader)
  
  handler.addParser(new SongsParser())
  handler.addParser(new MidWeekMeeting())

  const results = await handler.process()

  return results
}

async function fetchWeekendMeetingMedia(url: string, downloader: Downloader) {
  const handler = new CrawlerHandler(url, downloader)
  
  handler.addParser(new WeekendParser())

  const results = await handler.process()

  return results
}
