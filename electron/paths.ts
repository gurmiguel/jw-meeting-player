import path from 'node:path'
import { getTempDir } from './utils/dirs'

export const FILES_PATH = process.env.FILES_PATH ?? path.join(getTempDir(), 'files')
