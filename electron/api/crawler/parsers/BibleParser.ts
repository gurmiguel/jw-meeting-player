import { JWApiUrlBuilder } from '../../../utils/jw-api'
import { ParsingResult } from '../types'
import { CrawlerParser } from './CrawlerParser'

export class BibleParser extends CrawlerParser {
  constructor(
    private booknum: number,
    private chapter: number,
    private verses: number[],
  ) {
    super()
  }

  async process(doc: Document): Promise<ParsingResult[]> {
    const content = new Array<string>()

    let $prev: Element | null = null

    this.verses.forEach((verse, i) => {
      if (i > 0 && verse - this.verses[i - 1] > 1) {
        content.push('<br/> [...] ')
      }
      const $verses = doc.querySelectorAll(`[id^="v${this.booknum}-${this.chapter}-${verse}-"`)

      $verses.forEach(($el, i) => {
        const $verse = $el?.cloneNode(true) as HTMLElement

        $verse.querySelectorAll('a').forEach($anchor => {
          $anchor.parentElement?.removeChild($anchor)
        })

        let verseContent = ''
        if ($prev && $prev.parentElement !== $el.parentElement)
          verseContent += '<br/>'
        if (i === 0)
          verseContent += `<sup>${verse}</sup><span id="v${verse}">`
        verseContent += `${$verse?.textContent?.trim()}`
        if (i === $verses.length - 1)
          verseContent += '</span>'

        content.push(verseContent)

        $prev = $el
      })
    })

    const uid = `bible-${this.booknum}-${this.chapter}-${this.verses.join(':')}`

    const lang = 'T'

    const pubURL = new JWApiUrlBuilder(lang)
      .setPub('nwt')
      .setFileFormat('mp3')
      .setBookNum(this.booknum)
      .setChapter(this.chapter)
      .build()

    const data = await fetch(pubURL).then(res => res.json())

    const fileObject = data.files[lang].MP3[0]
    
    const audioURL = fileObject.file.url

    const markers = fileObject.markers.markers.filter((v: any) => this.verses.includes(v.verseNumber))

    return [
      {
        uid,
        group: 'bible',
        alt: '',
        label: '',
        type: 'text',
        media: [
          {
            type: 'text',
            booknum: this.booknum,
            chapter: this.chapter,
            verses: this.verses,
            content: content.join('\n'),
            audioURL,
            duration: fileObject.duration,
            markers,
          },
        ],
      },
    ]
  }
}
