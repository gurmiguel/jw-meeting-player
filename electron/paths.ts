import os from 'node:os'
import path from 'node:path'

const tmpdir = path.join(os.tmpdir(), 'jw-meeting-player')

export const FILES_PATH = process.env.FILES_PATH ?? path.join(tmpdir, 'files')
