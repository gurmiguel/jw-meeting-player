import * as childProcess from 'child_process'
import * as extractZip from 'extract-zip'
import * as fse from 'fs-extra'
import * as lod from 'lodash'
import * as os from 'os'
import * as path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { fetch } from 'undici'

var API_URL = 'https://ffbinaries.com/api/v1'

var LOCAL_CACHE_DIR = path.join(os.homedir() + '/.ffbinaries-cache')
var RUNTIME_CACHE: Record<string, unknown> = {}
var errorMsgs = {
  connectionIssues: 'Couldn\'t connect to ffbinaries.com API. Check your Internet connection.',
  parsingVersionData: 'Couldn\'t parse retrieved version data. Try "ffbinaries clearcache".',
  parsingVersionList: 'Couldn\'t parse the list of available versions. Try "ffbinaries clearcache".',
  notFound: 'Requested data not found.',
  incorrectVersionParam: '"version" parameter must be a string.',
}

function ensureDirSync(dir: string) {
  try {
    fse.accessSync(dir)
  } catch {
    fse.mkdirSync(dir)
  }
}

ensureDirSync(LOCAL_CACHE_DIR)

/**
 * Resolves the platform key based on input string
 */
function resolvePlatform(input: string) {
  var rtn = null

  switch (input) {
    case 'mac':
    case 'osx':
    case 'mac-64':
    case 'osx-64':
      rtn = 'osx-64'
      break

    case 'linux':
    case 'linux-32':
      rtn = 'linux-32'
      break

    case 'linux-64':
      rtn = 'linux-64'
      break

    case 'linux-arm':
    case 'linux-armel':
      rtn = 'linux-armel'
      break

    case 'linux-armhf':
      rtn = 'linux-armhf'
      break

    case 'linux-arm64':
      rtn = 'linux-arm64'
      break

    case 'win':
    case 'win-32':
    case 'windows':
    case 'windows-32':
      rtn = 'windows-32'
      break

    case 'win-64':
    case 'windows-64':
      rtn = 'windows-64'
      break

    default:
      rtn = null
  }

  return rtn
}
/**
 * Detects the platform of the machine the script is executed on.
 * Object can be provided to detect platform from info derived elsewhere.
 *
 * @param {object} osinfo Contains "type" and "arch" properties
 */
function detectPlatform(osinfo?: { type: string; arch: string }) {
  var inputIsValid = typeof osinfo === 'object' && typeof osinfo?.type === 'string' && typeof osinfo?.arch === 'string'
  var type = ((inputIsValid ? osinfo?.type : null) ?? os.type()).toLowerCase()
  var arch = ((inputIsValid ? osinfo?.arch : null) ?? os.arch()).toLowerCase()

  if (type === 'darwin') {
    return 'osx-64'
  }

  if (type === 'windows_nt') {
    return arch === 'x64' ? 'windows-64' : 'windows-32'
  }

  if (type === 'linux') {
    if (arch === 'arm') return 'linux-armel'
    if (arch === 'arm64') return 'linux-arm64'
    return arch === 'x64' ? 'linux-64' : 'linux-32'
  }

  return null
}
/**
 * Gets the binary filename (appends exe in Windows)
 *
 * @param {string} component "ffmpeg", "ffplay", "ffprobe" or "ffserver"
 * @param {platform} platform "ffmpeg", "ffplay", "ffprobe" or "ffserver"
 */
function getBinaryFilename(component: string, platform: string) {
  var platformCode = resolvePlatform(platform)
  if (platformCode === 'windows-32' || platformCode === 'windows-64') {
    return component + '.exe'
  }
  return component
}

function listPlatforms() {
  return ['osx-64', 'linux-32', 'linux-64', 'linux-armel', 'linux-armhf', 'linux-arm64', 'windows-32', 'windows-64']
}

interface ErrCallback<T> {
  (err: null, result: T): void
  (err: string, result?: never): void
}

function listVersions(callback: ErrCallback<string[]>) {
  if (RUNTIME_CACHE.versionsAll) {
    return callback(null, RUNTIME_CACHE.versionsAll as string[])
  }
  fetch(API_URL)
    .then<any>(response => response.json()
      .catch(() => {
        callback(errorMsgs.parsingVersionData)
        return null
      }))
    .then(body => {
      var versionsAll = Object.keys(body.versions)
      RUNTIME_CACHE.versionsAll = versionsAll
      return callback(null, versionsAll)
    })
    .catch(() => callback(errorMsgs.connectionIssues))
}
/**
 * Gets full data set from ffbinaries.com
 */
function getVersionData(version: string, callback: ErrCallback<any>) {
  if (RUNTIME_CACHE[version]) {
    return callback(null, RUNTIME_CACHE[version])
  }

  if (version && typeof version !== 'string') {
    return callback(errorMsgs.incorrectVersionParam)
  }

  var url = version ? '/version/' + version : '/latest'

  fetch(API_URL + url)
    .then(response => {
      if (!response.ok) {
        if (response.status === 404)
          callback(errorMsgs.notFound)
        else
          callback(errorMsgs.connectionIssues)
        return null
      }
      return response.json()
        .catch(() => {
          callback(errorMsgs.parsingVersionData)
          return null
        })
    })
    .then(body => {
      if (!body) return

      RUNTIME_CACHE[version] = body
      return callback(null, body)
    })
    .catch(() => callback(errorMsgs.connectionIssues))
}

/**
 * Download file(s) and save them in the specified directory
 */
function downloadUrls(components: string[], urls: Record<string, string>, opts: Record<string, unknown>, callback: ErrCallback<unknown>) {
  var destinationDir = opts.destination as string
  var results: object[] = []
  var remappedUrls

  if (components && !Array.isArray(components)) {
    components = [components]
  }

  // returns an array of objects like this: {component: 'ffmpeg', url: 'https://...'}
  if (typeof urls === 'object') {
    remappedUrls = lod.map(urls, function (v: string, k: string) {
      return (!components || components && !Array.isArray(components) || components && Array.isArray(components) && components.indexOf(k) !== -1) ? { component: k, url: v } : null
    })
    remappedUrls = lod.compact(remappedUrls)
  }


  function extractZipToDestination(zipFilename: string, cb: ErrCallback<void>) {
    var oldpath = path.join(LOCAL_CACHE_DIR, zipFilename)
    extractZip(oldpath, { dir: destinationDir, defaultFileMode: parseInt('744', 8) })
      .then(res => cb(null, res))
      .catch(err => cb(err))
  }


  Promise.all((remappedUrls ?? []).map(async urlObject => {
    if (!urlObject?.url || !urlObject.component) return

    var url = urlObject.url

    var zipFilename = url.split('/').pop()!
    var binFilenameBase = urlObject.component
    var binFilename = getBinaryFilename(binFilenameBase, opts.platform as string || detectPlatform()!)
    var runningTotal = 0
    var totalFilesize: number
    var interval: NodeJS.Timeout | null = null

    if (typeof opts.tickerFn === 'function') {
      opts.tickerInterval = parseInt(opts.tickerInterval as string, 10)
      var tickerInterval = (!Number.isNaN(opts.tickerInterval)) ? opts.tickerInterval as number : 1000
      var tickData = { filename: zipFilename, progress: 0 }

      // Schedule next ticks
      interval = setInterval(function () {
        if (totalFilesize && runningTotal == totalFilesize) {
          return interval && clearInterval(interval)
        }
        tickData.progress = totalFilesize > -1 ? runningTotal / totalFilesize : 0

        ;(opts.tickerFn as Function)(tickData)
      }, tickerInterval)
    }

    try {
      if (opts.force) {
        throw new Error('Force mode specified - will overwrite existing binaries in target location')
      }

      // Check if file already exists in target directory
      var binPath = path.join(destinationDir, binFilename)
      fse.accessSync(binPath)
      // if the accessSync method doesn't throw we know the binary already exists
      results.push({
        filename: binFilename,
        path: destinationDir,
        status: 'File exists',
        code: 'FILE_EXISTS',
      })
      if (interval) clearInterval(interval)
    } catch {
      var zipPath = path.join(LOCAL_CACHE_DIR, zipFilename)

      // If there's no binary then check if the zip file is already in cache
      try {
        fse.accessSync(zipPath)
        results.push({
          filename: binFilename,
          path: destinationDir,
          status: 'File extracted to destination (archive found in cache)',
          code: 'DONE_FROM_CACHE',
        })
        if (interval) clearInterval(interval)
        return new Promise<void>((resolve, reject) => extractZipToDestination(zipFilename, (err) => err ? reject(err) : resolve()))
      } catch {
        // If zip is not cached then download it and store in cache
        if (opts.quiet && interval) clearInterval(interval)

        var cacheFileTempName = zipPath + '.part'
        var cacheFileFinalName = zipPath

        fetch(url).then((response) => {
          if (!response.ok) throw new Error(`Unexpected response: ${response.statusText}`)
          
          totalFilesize = Number(response.headers.get('content-length'))

          const nodeReadable = Readable.fromWeb(response.body!)
          const writeStream = fse.createWriteStream(cacheFileTempName)

          nodeReadable.on('data', data => {
            runningTotal += data.length
          })

          return pipeline(nodeReadable, writeStream)
        }).then(() => {
          results.push({
            filename: binFilename,
            path: destinationDir,
            size: Math.floor(totalFilesize / 1024 / 1024 * 1000) / 1000 + 'MB',
            status: 'File extracted to destination (downloaded from "' + url + '")',
            code: 'DONE_CLEAN',
          })

          fse.renameSync(cacheFileTempName, cacheFileFinalName)
          return new Promise<void>((resolve, reject) => extractZipToDestination(zipFilename, (err) => err ? reject(err) : resolve()))
        }).catch()
      }
    }
  })).then(() => {
    return callback(null, results)
  })
}

/**
 * Gets binaries for the platform
 * It will get the data from ffbinaries, pick the correct files
 * and save it to the specified directory
 *
 * @param {string|array} components
 * @param {object}   opts
 * @param {function} callback
 */
function downloadBinaries(components: string | string[], opts: Record<string, unknown>, callback: ErrCallback<any>) {
  // only callback provided: assign blank components and opts
  if (!callback && !opts && typeof components === 'function') {
    callback = components
    components = []
    opts = {}
  }

  if (!callback && typeof opts === 'function') {
    callback = opts

    if (typeof components === 'object' && !Array.isArray(components)) {
      // first argument is an object: use as opts and assign blank components
      opts = components
      components = []
    } else {
      // leave first argument intact, assign blank opts
      opts = {}
    }
  }

  var platform = resolvePlatform(opts.platform as string) || detectPlatform()

  opts.destination = path.resolve(opts.destination as string || '.')
  ensureDirSync(opts.destination as string)

  getVersionData(opts.version as string, function (err, data) {
    var urls = lod.get(data, 'bin.' + platform)
    if (err || !urls) {
      return callback(err || 'No URLs!')
    }

    downloadUrls(Array.isArray(components) ? components : [components], urls, opts, callback)
  })
}

/**
 * Checks the specified directory for existing copies of requested binaries.
 * Also checks in PATH in case the binaries are already available on the machine.
 *
 * Returns the first match - provided paths will take precedence over env paths.
 * Setting ensureExecutable option to true will run "chmod +x" on the file if needed.
 *
 * @param {array} components Components to look for (ffmpeg/ffplay/ffprobe/ffserver)
 * @param {object} opts { paths: [], ensureExecutable: bool }
 */
function locateBinariesSync(components: string[], opts: any) {
  if (typeof components === 'string') {
    components = [components]
  }

  opts = opts || {}

  if (typeof opts.paths === 'string') {
    opts.paths = [opts.paths]
  }

  if (!Array.isArray(opts.paths)) {
    opts.paths = []
  }

  var rtn = {} as Record<string, any>
  var suggestedPaths = opts.paths as string[]
  var systemPaths = process.env.PATH!.split(path.delimiter)
  var allPaths = lod.concat(suggestedPaths, systemPaths)

  lod.each(components, function (comp) {
    var binaryFilename = getBinaryFilename(comp, detectPlatform()!)
    // look for component's filename in each path

    var result = {
      found: false,
      isExecutable: false,
      isSystem: false,
      path: null as string | null,
      version: null as string | null,
    }

    // scan paths to find the currently checked component
    lod.each(allPaths, function (currentPath) {
      if (!result.found) {
        var pathToTest = path.join(currentPath, binaryFilename)

        if (fse.existsSync(pathToTest)) {
          result.found = true
          result.path = pathToTest

          var isOneOfSuggested = suggestedPaths.some(p => p === currentPath)

          if (!isOneOfSuggested) {
            result.isSystem = true
          }

          // check if file is executable
          try {
            fse.accessSync(pathToTest, fse.constants.X_OK)
            result.isExecutable = true
          } catch {
            result.isExecutable = false
            result.version = 'error'
          }
        }
      }
    })

    // isExecutable will always be true on Windows
    if (result.found && !result.isExecutable && opts.ensureExecutable) {
      try {
        childProcess.execSync('chmod +x ' + result.path)
        result.isExecutable = true
      } catch {}
    }

    // check version
    if (result.found && result.isExecutable) {
      var stdout = childProcess.spawnSync(result.path!, ['-version']).stdout
      // if stdout.length === 0, then we must have stderr instead
      if (stdout && stdout.length) {
        result.version = stdout.toString().split(' ')[2]
      }
    }

    rtn[comp] = result
  })

  return rtn
}

function clearCache() {
  fse.emptyDirSync(LOCAL_CACHE_DIR)
}

export {
  clearCache, detectPlatform, downloadBinaries,
  downloadBinaries as downloadFiles, getBinaryFilename, getVersionData, listPlatforms, listVersions, locateBinariesSync, resolvePlatform,
}

