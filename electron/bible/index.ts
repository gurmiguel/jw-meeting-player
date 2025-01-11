import { NoopFileSystemService } from '../api/NoopFileSystemService'
import { BibleRepository } from './repository'
import { BibleService } from './service'

export const bibleRepository = new BibleRepository(new NoopFileSystemService().setContext('bible'))
export const bibleService = new BibleService()
