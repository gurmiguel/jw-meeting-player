import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
    file: file,
    type,
    playRate,
    playState,
    content,
  } = useAppSelector(state => state.player)
  const playing = file !== null

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
    common.requestPlayerWindow()

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

  useBridgeEventHandler('zoomScreenNotFound', () => {
    toast.error('A janela do Zoom não foi encontrada.', {
      duration: 5_000,
      dismissible: true,
    })
  }, [])

  return (
    <>
      <MediaControls
        playing={playing}
        type={type}
        playStatus={playState}
        onStop={handleStop}
        onPlay={handlePlay}
        onPause={handlePause}
        speed={playRate}
        onSetSpeed={handleSetSpeed}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        disableSeek={content !== undefined}
      />

      <FeedbackScreen
        sourceId={feedbackSourceId ?? null}
        handleClose={handleStop}
      />
    </>
  )
}
