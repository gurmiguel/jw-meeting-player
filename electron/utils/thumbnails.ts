import log from 'electron-log'
import { downloadBinaries } from 'ffbinaries'
import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { getLibraryDir } from './dirs'
import { getNameAndVersion, isDev } from './electron-utils'

const binariesPromise = new Promise<void>(async resolve => {
  const destination = isDev() ? __dirname : path.join(getLibraryDir(process.platform, getNameAndVersion().name), 'binaries')

  await fs.promises.mkdir(destination, { recursive: true })

  log.debug('ffbinaries directory', destination)

  downloadBinaries(['ffmpeg', 'ffprobe'], { destination }, (err, results) => {
    if (!err) {
      const ffmpegPath = results.find(x => x.filename.includes('ffmpeg'))
      const ffprobePath = results.find(x => x.filename.includes('ffprobe'))
      if (ffmpegPath) ffmpeg.setFfmpegPath(path.join(ffmpegPath.path, ffmpegPath.filename))
      if (ffprobePath) ffmpeg.setFfprobePath(path.join(ffprobePath.path, ffprobePath.filename))
    }
    resolve()
  })
})

export function isVideoFile(filepath: string) {
  return ['mp4', 'mov', 'avi', 'webm', 'wmv', '3gp', 'mkv', 'ogg'].some(ext => filepath.endsWith(`.${ext}`))
}

export async function generateThumbnail(videoPath: string, outputFilepath: string) {
  const filename = path.basename(outputFilepath)
  const dir = path.resolve(outputFilepath).split(path.sep)
    .slice(0, -1).join(path.sep)

  await binariesPromise

  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg(videoPath)
      .addOptions(
        '-map', '0:v',
        '-map', '-0:V',
      )
      .once('end', () => resolve())
      .once('error', () => {
        // fallback to thumbnail generation
        ffmpeg(videoPath)
          .addOption('-f', 'null')  // set format to null 
          .screenshot({
            timemarks: [8],
            size: '280x280',
            filename,
            folder: dir,
          })
          .once('end', () => resolve())
          .once('error', err => reject(err))
          .output('nowhere')  // or '/dev/null' or something else
      })
      .size('280x280')
      .output(outputFilepath)
    command.run()
  })
}
