import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class WeekendParser extends CrawlerParser {
  private static GROUP = 'A Sentinela'

  async process(doc: Document) {
    const $root = doc.querySelector('.todayItem.pub-w')

    if (!$root) return null

    const $watchtowerLink = $root.querySelector<HTMLAnchorElement>('a.pub-w')
    const watchtowerArticleUrl = $watchtowerLink?.href
    const watchtowerTitle = $watchtowerLink?.parentElement?.textContent?.trim()

    if (!watchtowerArticleUrl) return null

    const media = new Array<ParsingResult>()

    media.push(...(await Promise.all([
      this.utils.fetchSongsMedia(watchtowerArticleUrl),
      this.utils.fetchArticleMedia(watchtowerArticleUrl).then(results => results.map(media => ({
        ...media,
        group: [WeekendParser.GROUP, watchtowerTitle ?? media.group].join(' :: '),
      }))),
    ])).flat())

    return media
  }
}
