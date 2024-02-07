import { ParsingResult } from '../types'
import { ArticleMediaParser } from './ArticleMediaParser'

export class NewMidWeekMeeting extends ArticleMediaParser {
  constructor() {
    super(['video', 'image'])
  }

  async process(doc: Document) {
    const $root = doc.querySelector('.bodyTxt')

    if (!$root) return null

    const media = new Array<ParsingResult>()

    const $headers = $root.querySelectorAll('h3')

    for (const [ , $header] of $headers.entries()) {
      const $articleElements = $header.parentElement === $root
        ? (function getNext($el: Element): HTMLElement[] {
          const $next = $el.nextElementSibling
          if (!$next || $next.tagName.toLowerCase() !== 'div') return []
          return [$next, ...getNext($next)] as HTMLElement[]
        })($header)
        : [$header.parentElement!]

      if (!$articleElements.length) continue

      const articleTitle = $header.textContent?.trim() ?? ''

      if (articleTitle.match(/cântico/i)) continue

      for (const $article of $articleElements) {
        const $mediaItems = $article.querySelectorAll<(HTMLImageElement & { tagName: 'IMG' }) | (HTMLAnchorElement & { tagName: 'A' })>('img, a')
        
        mediaItems: for (const [ , $el] of $mediaItems.entries()) {
          switch ($el.tagName) {
            case 'IMG':
              const image = await this.processArticleImage($el)
              if (image)
                media.push({
                  group: articleTitle,
                  type: 'image',
                  ...image,
                })
              break
            case 'A':
              const isVideoAnchor = $el.matches('a[data-video], a[href*="data-video="]')
              if (isVideoAnchor) {
                const video = await this.processArticleVideo($el)
                if (video)
                  media.push({
                    group: articleTitle,
                    type: 'video',
                    ...video,
                  })
              } else {
                const articleURL = $el.href

                const isSourceArticle = $el.parentElement!.innerHTML.match(new RegExp(`\\([^)]*${$el.outerHTML}[^(]*\\)`))

                if (isSourceArticle) continue mediaItems
                if ($el.hasAttribute('data-bid')) continue mediaItems
                if ($el.textContent?.match(/cântico/i)) continue mediaItems

                const articleMedia = await this.utils.fetchArticleMedia(articleURL)
                media.push(...articleMedia.map(media => ({
                  ...media,
                  group: articleTitle.includes(media.group)
                    ? articleTitle
                    : [articleTitle, media.group].join(' :: '),
                })))
              }
              break
          }
        }
      }

    }

    return media
  }

}
