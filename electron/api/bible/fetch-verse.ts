import { bibleService } from '../../bible'

export async function fetchBibleVerses(booknum: number, chapter: number, verses: number[]) {
  return bibleService.fetchVersesText(booknum, chapter, verses)
}
