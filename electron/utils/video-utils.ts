import log from 'electron-log'
import { downloadBinaries } from 'ffbinaries'
import ffmpeg, { ffprobe } from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { getJWLibraryVideosDir, getLibraryDir } from './dirs'
import { getNameAndVersion, isDev } from './electron-utils'

const FALLBACK_VIDEO_THUMBNAIL = path.join(__dirname, '../../shared/assets/video-placeholder.png')

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

  const inputStream = fs.createReadStream(videoPath)

  try {
    return await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputStream)
        .addOptions(
          '-map', '0:v',
          '-map', '-0:V',
        )
        .once('end', () => resolve())
        .once('error', (err) => reject(err))
        .autopad()
        .size('280x280')
        .output(outputFilepath)
      command.run()
    })
  } catch {
    log.debug(`Fallback to thumbnail generation: "${videoPath}"`)
    return await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .once('end', () => resolve())
        .once('error', err => reject(err))
        .autopad()
        .thumbnail({
          timemarks: ['00:00:08.000'],
          size: '280x280',
          filename,
          folder: dir,
        })
    })
  } finally {
    const output = await fs.promises.stat(outputFilepath)
    if (!output.isFile()) {
      await fs.promises.copyFile(FALLBACK_VIDEO_THUMBNAIL, outputFilepath)
    }
    inputStream.close()
  }
}

export async function getMediaDuration(filepath: string) {
  return new Promise<number>((resolve, reject) => {
    ffprobe(filepath, (err, { format }) => {
      if (err) return reject(err)
      resolve(format.duration ?? 0)
    })
  })
}

export async function getMediaTitle(filepath: string) {
  return new Promise<string>((resolve, reject) => {
    ffprobe(filepath, (err, { format }) => {
      if (err) return reject(err)
      resolve(String(format.tags?.title ?? ''))
    })
  })
}

export async function existsInJWLibrary(filename: string) {
  const filepath = path.join(getJWLibraryVideosDir(), filename)

  try {
    const check = await fs.promises.stat(filepath)
    return check.isFile() ? filepath : false
  } catch {
    return false
  }
}
