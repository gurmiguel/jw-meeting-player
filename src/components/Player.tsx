import clsx from 'clsx'
import { SyntheticEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { type APIEvents } from '../../electron/events/api'
import { PlayerEvents } from '../../electron/events/player'
import { DEFAULT_SPEED } from '../../shared/constants'
import { useBridgeEventHandler } from '../hooks/useBridgeEventHandler'
import { useThrottleCallback } from '../hooks/useThrottleCallback'
import { initialState as initialPlayer } from '../store/player/slice'
import './bible-reader.css'
import classes from './Player.module.css'

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
  const [cleaningGroup, setCleaningGroup] = useState<{ group: number, withGeneral: boolean }>()

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
    setCleaningGroup(undefined)
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

  function forceStop() {
    throttleUpdateTime.cancel()
    player.current?.pause()
    setMedia(undefined)
    setCurrentSpeed(DEFAULT_SPEED)
  }

  useBridgeEventHandler('stop', forceStop, [])

  useBridgeEventHandler('setSpeed', ({ speed }) => {
    setCurrentSpeed(speed)
  }, [])

  useBridgeEventHandler('seek', ({ position }) => {
    if (!player.current) return

    player.current.currentTime = position
  }, [])

  useBridgeEventHandler('toggleZoomScreen', async () => {
    if (zoomSharingScreen) {
      const stream = mirrorScreen.current?.srcObject as MediaStream | undefined

      stream?.getTracks().forEach(track => track.stop())
      
      setZoomSharingScreen(undefined)
      return
    }

    setCleaningGroup(undefined)

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

  useBridgeEventHandler('verseChange', ({ verse, scroll = true }) => {
    setCleaningGroup(undefined)
    const currentVerse = textScroller.current?.querySelector(`#v${verse}`)
    if (scroll)
      currentVerse?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    textScroller.current?.querySelectorAll('.verse-active')
      .forEach(element => element.classList.remove('verse-active'))
    currentVerse?.classList.add('verse-active')
  }, [])

  useBridgeEventHandler('displayCleaningGroup', ({ group, withGeneral }) => {
    forceStop()
    setCleaningGroup({ group, withGeneral })
  }, [])

  useBridgeEventHandler('hideCleaningGroup', () => {
    setCleaningGroup(undefined)
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
            key={zoomSharingScreen || ((media?.type !== 'audio' ? media?.timestamp : null) ?? cleaningGroup?.group ?? 'year-text')}
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
                  className="block absolute w-full h-full object-fill"
                />
              ) : (
                <>
                  {[null, 'audio'].includes(media?.type ?? null) && !!yearText && !cleaningGroup && (
                    <>
                      <div className={classes.yearText} dangerouslySetInnerHTML={{ __html: yearText }} />
                      <div className={classes.yearTextLogo}>
                        <div className={classes.yearTextLogoInner}></div>
                      </div>
                    </>
                  )}

                  {cleaningGroup && (
                    <div className={classes.cleaningGroup}>
                      <div>Limpeza Grupo</div>
                      <div className="font-normal text-[8vw] font-['Century']">{cleaningGroup.group}</div>
                      <hr />
                      <ul>
                        <li>Ao final da reunião</li>
                        {cleaningGroup.withGeneral && (
                          <>
                            <li><br/></li>
                            <li>• Limpeza geral •<small>no fim de semana</small></li>
                          </>
                        )}
                      </ul>
                    </div>
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
