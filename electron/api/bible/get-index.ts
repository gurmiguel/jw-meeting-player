import { BibleIndex, BookChapter, Verse } from '../../../shared/models/Bible'
import { bibleRepository } from '../../bible'

export async function getBibleIndex(): Promise<BibleIndex[]>
export async function getBibleIndex(booknum: number): Promise<BookChapter[]>
export async function getBibleIndex(booknum: number, chapter: number): Promise<Verse[]>
export async function getBibleIndex(booknum?: number, chapter?: number) {
  if (booknum === undefined)
    return await bibleRepository.getBooks()

  if (chapter === undefined)
    return await bibleRepository.getChapters(booknum)

  return await bibleRepository.getVerses(booknum, chapter)
}
