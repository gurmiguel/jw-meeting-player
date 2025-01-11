import log from 'electron-log/main'

export type FetchBibleIndex = Map<number, { bookName: string, chapters: Map<number, Map<number, { startTime: string, duration: string }>> }>

export class BibleService {
  async fetchAllBooks() {
    const lang  = 'T'
  
    const apiURL = new URL('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS')
    apiURL.searchParams.set('fileformat', 'mp3')
    apiURL.searchParams.set('langwritten', lang)
    apiURL.searchParams.set('txtCMSLang', lang)
    apiURL.searchParams.set('pub', 'nwt')
  
    const data = await fetch(apiURL).then(res => res.json())
  
    const index = new Map() as FetchBibleIndex
  
    for (const file of data.files[lang].MP3) {
      const { title, track: chapter, booknum, markers } = file
  
      let book = index.get(booknum)
      if (!book) {
        book = { bookName: this.getBookNameFromChapterTitle(title), chapters: new Map() }
        index.set(booknum, book)
      }
  
      book.chapters.set(
        chapter,
        new Map((markers?.markers as any[] ?? []).map((verse) => [
          verse.verseNumber,
          { startTime: verse.startTime, duration: verse.duration },
        ])),
      )
    }
  
    return index
  }

  protected getBookNameFromChapterTitle(title: string) {
    const [ bookName ] = title.match(/^[\d\p{L}\s)(]+(?=\s(?:-\scap.tulo|\d+))/ui) ?? []
  
    if (!bookName)
      log.warn('Can\'t find book name for title', title)
  
    return bookName ?? ''
  }
}
