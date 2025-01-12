import clsx from 'clsx'
import { SyntheticEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { APIEvents } from '../../electron/events/api'
import { PlayerEvents } from '../../electron/events/player'
import { DEFAULT_SPEED } from '../../shared/constants'
import { useBridgeEventHandler } from '../hooks/useBridgeEventHandler'
import { useThrottleCallback } from '../hooks/useThrottleCallback'
import { initialState as initialPlayer } from '../store/player/slice'
import classes from './Player.module.css'
import './bible-reader.css'

type MediaItem = Pick<PlayerEvents.Start, 'type' | 'file' | 'content'> & {
  timestamp: number
}

function Player() {
  const player = useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const textScroller = useRef<HTMLDivElement>(null)
  const mirrorScreen = useRef<HTMLVideoElement>(null)

  const [media, setMedia] = useState<MediaItem>()
  const [yearText, setYearText] = useState<string>()
  const [zoomSharingScreen, setZoomSharingScreen] = useState<string>()

  const [currentSpeed, setCurrentSpeed] = useState(initialPlayer.playRate)

  const [{ zoomLevel, position }, setZoomNPos] = useState({
    zoomLevel: initialPlayer.zoomLevel,
    position: initialPlayer.position,
  })

  const throttleUpdateTime = useThrottleCallback(useCallback((currentTime: number, duration: number) => {
    bridge.time({
      current: currentTime,
      duration: duration,
    })
  }, []), 500 * currentSpeed)

  useBridgeEventHandler('start', ({ type, file: file, content, playRate }) => {
    setCurrentSpeed(playRate)
    setMedia({ type, file, content, timestamp: Date.now() })

    common.windowShow()
  }, [])

  useBridgeEventHandler('playerControl', ({ action }) => {
    switch (action) {
      case 'play':
        return player.current?.play()
      case 'pause':
        return player.current?.pause()
    }
  }, [])

  useBridgeEventHandler('stop', () => {
    throttleUpdateTime.cancel()
    player.current?.pause()
    setMedia(undefined)
    setCurrentSpeed(DEFAULT_SPEED)
  }, [])

  useBridgeEventHandler('setSpeed', ({ speed }) => {
    setCurrentSpeed(speed)
  }, [])

  useBridgeEventHandler('seek', ({ position }) => {
    if (!player.current) return

    player.current.currentTime = position
  }, [])

  useBridgeEventHandler('toggleZoomScreen', async () => {
    if (zoomSharingScreen) {
      setZoomSharingScreen(undefined)
      return
    }

    try {
      const response = await api.fetch<APIEvents.GetZoomScreenIdResponse>('get-zoom-screen', null)

      setZoomSharingScreen(response.windowId)
    } catch {
      setZoomSharingScreen(undefined)
      bridge.zoomScreenNotFound()
    }
  }, [zoomSharingScreen])

  useBridgeEventHandler('zoom', ({ zoomLevel, top, left }) => {
    setZoomNPos({ zoomLevel, position: { top, left } })
  }, [])

  useBridgeEventHandler('verseChange', ({ verse }) => {
    const currentVerse = textScroller.current?.querySelector(`#v${verse}`)
    currentVerse?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    textScroller.current?.querySelectorAll('.verse-active')
      .forEach(element => element.classList.remove('verse-active'))
    currentVerse?.classList.add('verse-active')
  }, [])

  useLayoutEffect(() => {
    if (!player.current) return

    player.current.playbackRate = currentSpeed
  }, [currentSpeed])

  useEffect(() => {
    api.fetch<string>('get-year-text', { year: new Date().getFullYear() })
      .then((yearText) => setYearText(yearText))
  }, [])

  function handleTimeUpdate(e: SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget

    if (!video.paused)
      throttleUpdateTime(video.currentTime, video.duration)
  }
  function handleLoadedMetadata(e: SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget

    bridge.time({
      current: video.currentTime,
      duration: video.duration,
    })
  }

  function handlePause() {
    throttleUpdateTime.flush()
    textScroller.current?.querySelector('#bible-reader')?.classList.remove('playing')
  }

  function handlePlay() {
    console.log('play', textScroller.current?.querySelector('#bible-reader'))
    textScroller.current?.querySelector('#bible-reader')?.classList.add('playing')

    if (!player.current) return

    player.current.playbackRate = currentSpeed
  }

  function handleMediaEnded() {
    throttleUpdateTime.cancel()
    bridge.stop({ propagate: true })
  }

  function startShareZoomWindow() {
    if (!mirrorScreen.current || !zoomSharingScreen) return
  
    const mirror = mirrorScreen.current

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: zoomSharingScreen,
          frameRate: { max: 10 },
        },
      },
    }).then(stream => {
      mirror.srcObject = stream
      mirror.classList.add('animate-[fade-in_500ms_ease_both]')
    }).catch(err => {
      console.log('Could not get media from screen')
      console.error(err)
    })
  }

  return (
    <div className={clsx('fixed w-full h-full', media?.type !== 'text' && 'cursor-none')}>
      <div className="relative bg-black flex-1 w-full h-full pointer-events-none select-none overflow-hidden">
        <SwitchTransition>
          <CSSTransition
            key={zoomSharingScreen || ((media?.type !== 'audio' ? media?.timestamp : null) ?? 'year-text')}
            classNames={{
              enter: 'animate-[fade-in_500ms_ease_both]',
              exit: 'animate-[fade-out_500ms_ease_both]',
            }}
            onEnter={() => {
              if (zoomSharingScreen)
                startShareZoomWindow()
            }}
            timeout={500}
            unmountOnExit
          >
            <div
              className={clsx(
                media?.type === 'text' ? 'bg-white text-black' : 'bg-inherit',
                'absolute-fill',
              )}
            >
              {zoomSharingScreen ? (
                <video
                  ref={mirrorScreen}
                  onLoadedMetadata={() => mirrorScreen.current?.play()}
                  className="block w-full object-fill"
                  style={{ height: 'calc(100% + 60px)' }} // account for title bar
                />
              ) : (
                <>
                  {[null, 'audio'].includes(media?.type ?? null) && !!yearText && (
                    <>
                      <div className={classes.yearText} dangerouslySetInnerHTML={{ __html: yearText }} />
                      <div className={classes.yearTextLogo}>
                        <div className={classes.yearTextLogoInner}></div>
                      </div>
                    </>
                  )}

                  {media?.file && media.type === 'video' && (
                    <video
                      key={media.timestamp}
                      ref={player}
                      src={media.file}
                      className="block w-full h-full object-contain"
                      controls={false}
                      onTimeUpdate={handleTimeUpdate}
                      onPause={handlePause}
                      onPlay={handlePlay}
                      onEnded={handleMediaEnded}
                      autoPlay
                    />
                  )}
                  {media?.file && media.type === 'audio' && (
                    <audio
                      key={media.timestamp}
                      ref={player}
                      src={media.file}
                      className="block w-full h-full object-contain"
                      controls={false}
                      onTimeUpdate={handleTimeUpdate}
                      onPlay={handlePlay}
                      onPause={handlePause}
                      onEnded={handleMediaEnded}
                      autoPlay
                    />
                  )}
                  {media?.file && media.type === 'image' && (
                    <div
                      className="absolute block w-full h-full" 
                      style={{
                        transformOrigin: '0 0',
                        transform: `scale(${zoomLevel}) translate(-${position.left}%, -${position.top}%)`,
                      }}
                    >
                      <img
                        key={media.timestamp}
                        src={media.file}
                        className="block w-full h-full aspect-auto max-w-none object-contain animate-[fade-in_1s_ease]"
                        alt=""
                      />
                    </div>
                  )}
                  {media?.content && media.type === 'text' && (
                    <div ref={textScroller} className={classes.bibleTextWrapper}>
                      {media.file && (
                        <audio
                          key={media.timestamp}
                          ref={player}
                          src={media.file}
                          className="block w-full h-full object-contain"
                          controls={false}
                          onTimeUpdate={handleTimeUpdate}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          onEnded={handleMediaEnded}
                          onLoadedMetadata={handleLoadedMetadata}
                          preload="metadata"
                        />
                      )}
                      <div id="bible-reader" className={classes.bibleText} dangerouslySetInnerHTML={{ __html: media.content }} />
                    </div>
                  )}
                </>
              )}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </div>
    </div>
  )
}

export default Player
