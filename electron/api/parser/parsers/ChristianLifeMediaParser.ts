import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class ChristianLifeMediaParser extends CrawlerParser {
  private static GROUP = 'Nossa Vida Cristã'

  async process(doc: Document) {
    const $root = doc.querySelector('#section4')

    if (!$root) return null

    const $discoursesAnchors = Array.from($root.querySelectorAll<HTMLAnchorElement>('.pGroup > ul > li:nth-child(n+2):nth-last-child(n+3) a'))

    const $bibleStudy = Array.from($root.querySelectorAll('.pGroup > ul > li') ?? [])
      .find($li => $li.textContent?.includes('Estudo bíblico de congregação')) ?? null

    const media = await Promise.all($discoursesAnchors.map<Promise<ParsingResult[] | null>>(async $anchor => {
      if (!$anchor) return null

      if ($anchor.hasAttribute('data-video') || $anchor.href.includes('data-video=')) {
        const dataVideo = this.utils.parseAnchorDataVideo($anchor)

        if (!dataVideo) return null
        
        const video = await this.utils.fetchPublicationVideo(dataVideo)
        
        if (!video) return null

        let $titleCandidate = $anchor.closest('li')?.querySelector('strong')
        if ($titleCandidate?.textContent?.trim() === '“')
          $titleCandidate = $titleCandidate.nextElementSibling as HTMLElement
        const discourseTitle = $titleCandidate?.textContent?.trim().replace(/:$/, '')
        
        return [{
          group: [ChristianLifeMediaParser.GROUP, discourseTitle].filter(Boolean).join(' :: '),
          label: video.title,
          type: 'video',
          media: [
            { path: video.path, type: 'video' },
            { path: video.thumbnail, type: 'image' },
          ],
        }]
      } else {
        const discourseMedia = await this.utils.fetchArticleMedia($anchor.href)

        const isBibleStudy = $anchor.closest('li')?.isEqualNode($bibleStudy) ?? false

        return discourseMedia.map(media => ({
          ...media,
          group: 
            (isBibleStudy
              ? [$bibleStudy?.querySelector('strong')?.textContent?.trim().replace(/:$/, '') ?? media.group, $anchor.text.trim()]
              : [ChristianLifeMediaParser.GROUP, media.group]
            ).filter(Boolean).join(' :: '),
        }))
      }
    }))

    const nonNullableMedia = media.filter(Boolean) as NonNullableObject<typeof media>

    return nonNullableMedia.flat()
  }
}