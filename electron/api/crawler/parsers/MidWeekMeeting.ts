import { ParsingResult } from '../types'
import { ArticleMediaParser } from './ArticleMediaParser'

export class MidWeekMeeting extends ArticleMediaParser {
  constructor() {
    super(['video', 'image'])
  }

  async process(doc: Document) {
    const $root = doc.querySelector('.bodyTxt')

    if (!$root) return null

    const media = {} as Record<number, Array<ParsingResult | Error>>

    const $headers = $root.querySelectorAll('h3')

    await Promise.all($headers.values().map(async ($header, i) => {
      media[i] = []
      const $articleElements = $header.parentElement === $root
        ? (function getNext($el: Element): HTMLElement[] {
          const $next = $el.nextElementSibling
          if (!$next || $next.tagName.toLowerCase() !== 'div') return []
          return [$next, ...getNext($next)] as HTMLElement[]
        })($header)
        : [$header.parentElement!]

      if (!$articleElements.length) return

      const articleTitle = $header.textContent?.trim() ?? ''

      const $section = (($head: HTMLElement) => {
        let $section: HTMLElement | null = $head
        while ($section && !Array.from($section.children).some(c => c.tagName === 'H2'))
          $section = $section.previousElementSibling as HTMLElement | null
        
        return $section
      })($header.closest('.bodyTxt > *') ?? $header)

      if ($section?.textContent?.trim().match(/FA.A SEU MELHOR NO MINISTÉRIO/i)) return

      if (articleTitle.match(/cântico \d+/i)) return

      for (const $article of $articleElements) {
        const $mediaItems = $article.querySelectorAll<(HTMLImageElement & { tagName: 'IMG' }) | (HTMLAnchorElement & { tagName: 'A' })>('img, a')
        
        mediaItems: for (const [ index, $el] of $mediaItems.entries()) {
          switch ($el.tagName) {
            case 'IMG':
              const image = await this.processArticleImage($el, index)
              if (image)
                media[i].push({
                  group: articleTitle,
                  type: 'image',
                  ...image,
                })
              break
            case 'A':
              const isVideoAnchor = $el.matches('a[data-video], a[href*="data-video="]')
              if (isVideoAnchor) {
                const video = await this.processArticleVideoAnchor($el)
                if (video)
                  media[i].push({
                    group: articleTitle,
                    type: 'video',
                    ...video,
                  })
                  
              } else {
                const articleURL = $el.href

                const isSourceArticle = $el.parentElement!.innerHTML.match(new RegExp(`\\([^)]*${$el.outerHTML}[^(]*\\)`))

                if (isSourceArticle) continue mediaItems
                if ($el.hasAttribute('data-bid')) continue mediaItems
                if ($el.textContent?.match(/cântico \d+/i)) continue mediaItems

                const articleMedia = await this.utils.fetchArticleMedia(articleURL)
                if (articleMedia instanceof Error)
                  media[i].push(articleMedia)
                else {
                  media[i].push(...articleMedia.map(media =>
                    media instanceof Error 
                      ? media
                      : ({
                        ...media,
                        group: articleTitle.includes(media.group)
                          ? articleTitle
                          : [articleTitle, media.group].join(' :: '),
                      })))
                }
              }
              break
          }
        }
      }    
    }))

    return Object.entries(media)
      .toSorted(([a], [b]) => parseInt(a) - parseInt(b))
      .flatMap(([_, m]) => m)
  }

}
