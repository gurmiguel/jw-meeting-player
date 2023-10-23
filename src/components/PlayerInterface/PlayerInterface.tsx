import { useEffect, useState } from 'react'
import { FeedbackScreen } from '../FeedbackScreen/FeedbackScreen'
import { MediaControls } from '../MediaControls/MediaControls'
import { useBridgeEventHandler } from '../../hooks/useBridgeEventHandler'

export function PlayerInterface() {
  const [playing, setPlaying] = useState(false)
  const [playStatus, setPlayStatus] = useState<'play' | 'pause'>()

  const [feedbackSourceId, setFeedbackSourceId] = useState<string>()

  function handleStop() {
    if (!playing) return

    bridge.stop()
    setPlaying(false)
    setPlayStatus(undefined)
  }

  function handlePause() {
    if (!playing) return
    
    bridge.playerControl({ action: 'pause' })
    setPlayStatus('pause')
  }
  
  function handlePlay() {
    if (!playing) return
    
    bridge.playerControl({ action: 'play' })
    setPlayStatus('play')
  }
  
  function handleSetSpeed(speed: number) {
    bridge.setSpeed({ speed })
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

  useBridgeEventHandler('start', () => {
    setPlayStatus('play')
    setPlaying(true)
  }, [])

  useBridgeEventHandler('stop', () => {
    setPlayStatus('pause')
    setPlaying(false)
  }, [])

  useBridgeEventHandler('playerControl', ({ action }) => {
    setPlayStatus(action)
  }, [])

  return (
    <>
      <MediaControls
        playing={playing}
        playStatus={playStatus}
        onStop={handleStop}
        onPlay={handlePlay}
        onPause={handlePause}
        onSetSpeed={handleSetSpeed}
      />

      {feedbackSourceId && playing && (
        <FeedbackScreen
          sourceId={feedbackSourceId}
        />
      )}
    </>
  )
}
