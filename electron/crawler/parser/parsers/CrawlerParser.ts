import { ParsingResult } from '../types'
import { CrawlerUtils } from './CrawlerUtils'

export abstract class CrawlerParser {
  protected baseURL!: string
  protected utils!: CrawlerUtils

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL
  }

  setUtils(utils: CrawlerUtils) {
    this.utils = utils
  }

  abstract process(doc: Document): Promise<ParsingResult[] | null>
}
