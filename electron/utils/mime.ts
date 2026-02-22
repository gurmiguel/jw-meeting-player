export function parseExtensionFromMime(mime: string) {
  mime = mime.replace(/\+.+/, '')

  switch (mime) {
    // image
    case 'image/png':
      return 'png'
    case 'image/jpg':
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/svg':
      return 'svg'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'image/tiff':
      return 'tiff'
    // video
    case 'video/mp4':
      return 'mp4'
    case 'video/mpeg':
      return 'mpeg'
    case 'video/ogg':
      return 'ogv'
    case 'video/webm':
      return 'webm'
    // audio
    case 'audio/aac':
      return 'aac'
    case 'audio/midi':
    case 'audio/x-midi':
      return 'midi'
    case 'audio/mpeg':
      return 'mp3'
    case 'audio/ogg':
      return 'opus'
    case 'audio/wav':
      return 'wav'
    case 'audio/webm':
      return 'weba'
  }

  return ''
}
