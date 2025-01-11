import { app } from 'electron'
import path from 'node:path'
import sqlite from 'sqlite'
import sqlite3 from 'sqlite3'
import { FileSystemService } from '../api/FileSystemService'
import { BibleIndex, BookChapter, Verse } from './models'
import { FetchBibleIndex } from './service'

export class BibleRepository {
  constructor(private fs: FileSystemService) {}

  async initializeDatabase() {
    const db = await this.getDb()

    await db.migrate({
      migrationsPath: path.join(app.isPackaged ? process.resourcesPath : __dirname + '/..', 'migrations'),
    })

    return this.pathToDatabase
  }

  async hasData() {
    const db = await this.getDb()

    const result = await db.get<{ $count: number }>('SELECT COUNT(*) as \'$count\' FROM BibleIndex')

    return (result?.$count ?? 0) > 0
  }

  async updateIndex(index: FetchBibleIndex) {
    const books = new Array<BibleIndex>()
    const chapters = new Array<BookChapter>()
    const verses = new Array<Verse>()

    for (const [bookNum, book] of index) {
      books.push({
        id: bookNum,
        bookName: book.bookName,
        chapters: book.chapters.size,
      })

      for (const [chapter, chapterVerses] of book.chapters) {
        chapters.push({
          bookId: bookNum,
          chapter,
          verses: chapterVerses.size,
        })

        for (const [verse, { startTime, duration }] of chapterVerses) {
          verses.push({
            bookId: bookNum,
            chapter,
            verse,
            startTime,
            duration,
          })
        }
      }
    }

    const db = await this.getDb()

    sqlite3.verbose()

    await db.run(
      `INSERT INTO BibleIndex (id, bookName, chapters) VALUES (${books.map(book => [book.id, `"${book.bookName}"`, book.chapters].join(',')).join('),(')})`)
    await db.run(
      `INSERT INTO BookChapters (bookId, chapter, verses) VALUES (${chapters.map(chapter => [chapter.bookId, chapter.chapter, chapter.verses].join(',')).join('),(')})`,
    )
    await db.run(
      `INSERT INTO Verses (bookId, chapter, verse, startTime, duration) VALUES (${verses.map(v => [v.bookId, v.chapter, v.verse, `"${v.startTime}"`, `"${v.duration}"`].join(',')).join('),(')})`,
    )
  }

  protected async getDb() {
    this.fs.ensureDirectoryIsCreated(this.fs.targetDir)
    return await sqlite.open({ filename: this.pathToDatabase, driver: sqlite3.cached.Database })
  }

  private get pathToDatabase() {
    return path.join(this.fs.targetDir, 'index.db')
  }
}
