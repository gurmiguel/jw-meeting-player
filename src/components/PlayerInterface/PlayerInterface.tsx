import { useEffect, useState } from 'react'
import { useBridgeEventHandler } from '../../hooks/useBridgeEventHandler'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { playerActions } from '../../store/player/slice'
import { FeedbackScreen } from '../FeedbackScreen/FeedbackScreen'
import { MediaControls } from '../MediaControls/MediaControls'

export function PlayerInterface() {
  const dispatch = useAppDispatch()
  const {
    currentTime,
    duration,
    file,
    type,
    playRate,
    playState,
  } = useAppSelector(state => state.player)
  const playing = file !== null && type !== 'image'

  const [feedbackSourceId, setFeedbackSourceId] = useState<string>()

  function handleStop() {
    dispatch(playerActions.stop())
  }

  function handlePause() {
    if (!playing) return
    
    dispatch(playerActions.pause())
  }
  
  function handlePlay() {
    if (!playing) return
    
    dispatch(playerActions.play())
  }
  
  function handleSetSpeed(speed: number) {
    dispatch(playerActions.playRate(speed))
  }
  
  function handleSeek(position: number) {
    dispatch(playerActions.time({ currentTime: position }))
  }
  
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data.type) return

      switch (e.data.type) {
        case 'set-feedback-source':
          setFeedbackSourceId(e.data.sourceId)
          break
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useBridgeEventHandler('stop', ({ propagate }) => {
    if (propagate)
      dispatch(playerActions.stop())
  }, [])

  useBridgeEventHandler('time', ({ current, duration }) => {
    dispatch(playerActions.time({ currentTime: current, duration }))
  }, [])

  return (
    <>
      <MediaControls
        playing={playing}
        playStatus={playState}
        onStop={handleStop}
        onPlay={handlePlay}
        onPause={handlePause}
        speed={playRate}
        onSetSpeed={handleSetSpeed}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
      />

      <FeedbackScreen
        sourceId={feedbackSourceId ?? null}
      />
    </>
  )
}
