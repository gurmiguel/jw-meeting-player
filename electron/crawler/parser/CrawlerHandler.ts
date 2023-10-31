import { type JSDOM } from 'jsdom'
import { isEqual, uniqWith } from 'lodash'
import { type Downloader } from '../Downloader'
import { CrawlerParser } from './parsers/CrawlerParser'
import { CrawlerUtils } from './parsers/CrawlerUtils'
import { ParsingResult } from './types'

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
  }

  async process() {
    console.log('Fetching from:', this.url)

    const { window: { document: doc } }: JSDOM = await require('jsdom').JSDOM.fromURL(this.url)

    const $result = await Promise.all(this.parsers.map(async parser => {
      return await parser.process(doc)
    }))

    const result = $result.flat().filter(Boolean) as ParsingResult[]

    return uniqWith(result, isEqual)
  }
}
