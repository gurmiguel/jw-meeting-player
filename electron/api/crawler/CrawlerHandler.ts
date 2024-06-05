import log from 'electron-log/main'
import { type JSDOM } from 'jsdom'
import { isEqual, uniqWith } from 'lodash'
import { type Downloader } from '../Downloader'
import { CrawlerUtils } from './CrawlerUtils'
import { CrawlerParser } from './parsers/CrawlerParser'
import { ProcessedResult } from './types'

export class CrawlerHandler {
  private utils: CrawlerUtils
  private parsers = new Array<CrawlerParser>()

  constructor(protected url: string, protected downloader: Downloader) {
    this.utils = new CrawlerUtils(downloader)
  }

  private get baseURL() {
    return new URL(this.url).origin
  }

  addParser(parser: CrawlerParser) {
    parser.setBaseURL(this.baseURL)
    parser.setUtils(this.utils)
    this.parsers.push(parser)

    return this
  }

  async process(): Promise<ProcessedResult[]> {
    log.info('Fetching from:', this.url)

    const { window: { document: doc } }: JSDOM = await require('jsdom').JSDOM.fromURL(this.url)

    const $result = (await Promise.all(this.parsers.map(async parser => {
      const parsedResult = await parser.process(doc)
        .catch(err => {
          log.error('Error parsing result', err)
          throw err
        })

      return parsedResult?.map(res => ({
        ...res,
        manual: false,
      }))
    }))).flat()

    const result = $result.filter(Boolean) as NonNullableObject<typeof $result>

    return uniqWith(result, isEqual)
  }
}
