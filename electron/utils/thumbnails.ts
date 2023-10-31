import { downloadBinaries } from 'ffbinaries'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

const binariesPromise = new Promise<void>(resolve => {
  downloadBinaries(['ffmpeg', 'ffprobe'], { destination: __dirname }, (err, results) => {
    if (!err) {
      const ffmpegPath = results.find(x => x.filename.includes('ffmpeg'))
      const ffprobePath = results.find(x => x.filename.includes('ffprobe'))
      if (ffmpegPath) ffmpeg.setFfmpegPath(path.join(ffmpegPath.path, ffmpegPath.filename))
      if (ffprobePath) ffmpeg.setFfprobePath(path.join(ffprobePath.path, ffprobePath.filename))
    }
    resolve()
  })
})

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
