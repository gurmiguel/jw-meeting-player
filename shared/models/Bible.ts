export interface BibleIndex {
  id: number
  bookName: string
  chapters: number
}

export interface BookChapter {
  bookId: number
  chapter: number
  verses: number
}

export interface Verse {
  bookId: number
  chapter: number
  verse: number
  startTime: string
  duration: string
}
