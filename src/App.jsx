import { useCallback, useEffect, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'
import ThirdStage from './stages/ThirdStage.jsx'
import FourthStage from './stages/FourthStage.jsx'
import GlitchTransitionOverlay from './stages/GlitchTransitionOverlay.jsx'
import { preloadAllAssets } from './preloadAssets.js'
import './App.css'

// Transition timings are shared with CSS through custom properties.
const COVER_ANIMATION_DELAY_MS = 675
const TRANSITION_ANIMATION_DURATION_MS = 3600
const THREAD_APPEAR_DELAY_MS = 350
const THREAD_APPEAR_DURATION_MS = 260
const TRANSITION_FAILSAFE_BUFFER_MS = 500

// Position offsets are in pixels: positive X = right, positive Y = down.
const PULL_THREAD = {
  length: 140,
  angle: -18,
  offsetX: -2,
  offsetY: 30,
}

const PULLER = {
  offsetX: -60,
  offsetY: -14,
}

function StageThreePullOverlay({ onCovered }) {
  const finishedRef = useRef(false)
  const [pullerReady, setPullerReady] = useState(false)

  const finishTransition = useCallback(() => {
    if (!pullerReady || finishedRef.current) return
    finishedRef.current = true
    onCovered()
  }, [onCovered, pullerReady])

  useEffect(() => {
    if (!pullerReady) return undefined
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timeout = window.setTimeout(
      finishTransition,
      prefersReducedMotion
        ? 0
        : COVER_ANIMATION_DELAY_MS + TRANSITION_ANIMATION_DURATION_MS + TRANSITION_FAILSAFE_BUFFER_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [finishTransition, pullerReady])

  return (
    <div
      className={'stage-three-transition' + (pullerReady ? ' stage-three-transition--started' : '')}
      aria-hidden="true"
      style={{
        '--transition-cover-delay': COVER_ANIMATION_DELAY_MS + 'ms',
        '--transition-cover-duration': TRANSITION_ANIMATION_DURATION_MS + 'ms',
        '--transition-puller-duration': TRANSITION_ANIMATION_DURATION_MS + 'ms',
        '--transition-thread-delay': THREAD_APPEAR_DELAY_MS + 'ms',
        '--transition-thread-duration': THREAD_APPEAR_DURATION_MS + 'ms',
      }}
    >
      <div
        className="stage-three-transition__cover"
        onAnimationEnd={(event) => {
          // Ignore bubbled animationend from the character; wait for the cover itself.
          if (event.target === event.currentTarget) finishTransition()
        }}
      >
        <div className="stage-three-transition__rig">
          <div
            className="stage-three-transition__thread"
            style={{
              '--pull-thread-length': PULL_THREAD.length + 'px',
              '--pull-thread-angle': PULL_THREAD.angle + 'deg',
              '--pull-thread-offset-x': PULL_THREAD.offsetX + 'px',
              '--pull-thread-offset-y': PULL_THREAD.offsetY + 'px',
            }}
          />
          <img
            className="stage-three-transition__puller"
            style={{
              '--puller-offset-x': PULLER.offsetX + 'px',
              '--puller-offset-y': PULLER.offsetY + 'px',
            }}
            src="/step-three-assets/pixel-self-pulling.png"
            alt=""
            onLoad={() => setPullerReady(true)}
            onError={() => {
              // Don't cover the page if the character asset is missing.
              setPullerReady(false)
            }}
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  const audioRef = useRef(null)
  const cosmicAudioRef = useRef(null)
  const activeTrackRef = useRef('background')
  const musicStartedRef = useRef(false)
  const musicPlayingRef = useRef(false)
  const musicActionRef = useRef(0)
  const endingFadeIntervalRef = useRef(null)

  useEffect(() => {
    // Warm all later-stage image assets invisibly while the first stages play.
    void preloadAllAssets()
  }, [])

  const [isMusicPlaying, setIsMusicPlaying] = useState(false)

  useEffect(() => {
    const startAudio = () => {
      if (musicStartedRef.current) return
      musicStartedRef.current = true
      window.removeEventListener('pointerdown', startAudio)

      const audio = activeTrackRef.current === 'cosmic'
        ? cosmicAudioRef.current
        : audioRef.current
      if (!audio) return

      const action = ++musicActionRef.current
      musicPlayingRef.current = true
      setIsMusicPlaying(true)
      audio.play()
        .catch((error) => {
          if (action !== musicActionRef.current) return
          musicPlayingRef.current = false
          setIsMusicPlaying(false)
          console.error('Не удалось запустить фоновую музыку:', error)
        })
    }

    window.addEventListener('pointerdown', startAudio)
    return () => {
      window.removeEventListener('pointerdown', startAudio)
    }
  }, [])

  const [stage, setStage] = useState('welcome')
  const [stageRunId, setStageRunId] = useState(0)
  const [reverseWelcome, setReverseWelcome] = useState(false)
  const [relationshipInitialMode, setRelationshipInitialMode] = useState('history')
  const [isThirdStageTransitioning, setIsThirdStageTransitioning] = useState(false)
  const [isFourthStageTransitioning, setIsFourthStageTransitioning] = useState(false)
  const transitionRef = useRef(null)

  const goNext = useCallback(() => {
    setReverseWelcome(false)
    setRelationshipInitialMode('history')
    setStage('relationship')
  }, [])

  const goToThirdStage = useCallback(() => {
    setIsThirdStageTransitioning(true)
  }, [])

  const finishThirdStageTransition = useCallback(() => {
    setStage('third')
    setIsThirdStageTransitioning(false)
  }, [])

  const beginFourthStageTransition = useCallback(() => {
    setIsFourthStageTransitioning(true)
  }, [])

  const finishFourthStageTransition = useCallback(() => {
    const backgroundAudio = audioRef.current
    const cosmicAudio = cosmicAudioRef.current

    if (activeTrackRef.current !== 'cosmic' && backgroundAudio && cosmicAudio) {
      backgroundAudio.pause()
      backgroundAudio.currentTime = 0
      activeTrackRef.current = 'cosmic'

      if (musicPlayingRef.current) {
        const action = ++musicActionRef.current
        cosmicAudio.play().catch((error) => {
          if (action !== musicActionRef.current) return
          musicPlayingRef.current = false
          setIsMusicPlaying(false)
          console.error('Не удалось запустить cosmic.mp3:', error)
        })
      }
    }

    setStage('four')
    setIsFourthStageTransitioning(false)
  }, [])

  const fadeEndingMusic = useCallback(() => {
    const audio = cosmicAudioRef.current
    if (!audio) return

    if (endingFadeIntervalRef.current !== null) {
      window.clearInterval(endingFadeIntervalRef.current)
    }

    const startedAt = performance.now()
    const startVolume = audio.volume
    const fadeDurationMs = 3000

    endingFadeIntervalRef.current = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / fadeDurationMs, 1)
      audio.volume = startVolume * (1 - progress)

      if (progress < 1) return
      window.clearInterval(endingFadeIntervalRef.current)
      endingFadeIntervalRef.current = null
    }, 50)
  }, [])

  const restartFromBeginning = useCallback(() => {
    if (endingFadeIntervalRef.current !== null) {
      window.clearInterval(endingFadeIntervalRef.current)
      endingFadeIntervalRef.current = null
    }

    const backgroundAudio = audioRef.current
    const cosmicAudio = cosmicAudioRef.current
    cosmicAudio?.pause()
    if (cosmicAudio) {
      cosmicAudio.currentTime = 0
      cosmicAudio.volume = 1
    }
    backgroundAudio?.pause()
    if (backgroundAudio) {
      backgroundAudio.currentTime = 0
      backgroundAudio.volume = 1
    }
    activeTrackRef.current = 'background'

    const action = ++musicActionRef.current
    if (musicPlayingRef.current && backgroundAudio) {
      backgroundAudio.play().catch((error) => {
        if (action !== musicActionRef.current) return
        musicPlayingRef.current = false
        setIsMusicPlaying(false)
        console.error('Не удалось перезапустить фоновую музыку:', error)
      })
    }

    setStageRunId((current) => current + 1)
    setReverseWelcome(true)
    setRelationshipInitialMode('history')
    setIsThirdStageTransitioning(false)
    setIsFourthStageTransitioning(false)
    transitionRef.current = null
    setStage('welcome')
  }, [])

  const returnToThirdStage = useCallback(() => {
    setStage('third')
  }, [])

  const returnToRelationship = useCallback(() => {
    setRelationshipInitialMode('future')
    setStage('relationship')
  }, [])

  const goPrevious = useCallback(() => {
    setReverseWelcome(true)
    setStage('welcome')
  }, [])

  const toggleMusicPlayback = () => {
    if (musicPlayingRef.current) {
      audioRef.current?.pause()
      cosmicAudioRef.current?.pause()
      musicActionRef.current += 1
      musicPlayingRef.current = false
      setIsMusicPlaying(false)
      return
    }

    const audio = activeTrackRef.current === 'cosmic'
      ? cosmicAudioRef.current
      : audioRef.current
    if (!audio) return

    const action = ++musicActionRef.current
    musicPlayingRef.current = true
    setIsMusicPlaying(true)
    audio.play()
      .catch((error) => {
        if (action !== musicActionRef.current) return
        musicPlayingRef.current = false
        setIsMusicPlaying(false)
        console.error('Не удалось возобновить музыку:', error)
      })
  }

  return (
    <>
      <audio ref={audioRef} src="/background_music.mp3" loop />
      <audio ref={cosmicAudioRef} src="/cosmic.mp3" loop preload="auto" />

      {stage === 'relationship' ? (
        <RelationshipTimerStage
          key={stageRunId}
          onPrevious={goPrevious}
          onNextStage={goToThirdStage}
          initialMode={relationshipInitialMode}
        />
      ) : stage === 'welcome' ? (
        <WelcomeStage
          key={stageRunId}
          onNext={goNext}
          reverseOnMount={reverseWelcome}
          transitionRef={transitionRef}
        />
      ) : (
        <ThirdStage
          key={stageRunId}
          onPrevious={stage === 'four' ? undefined : returnToRelationship}
          onFinish={beginFourthStageTransition}
          isHidden={stage === 'four'}
        />
      )}

      {stage === 'four' && (
        <FourthStage
          key={stageRunId}
          onPrevious={returnToThirdStage}
          onRestart={restartFromBeginning}
          onEndMusicFade={fadeEndingMusic}
        />
      )}

      {isThirdStageTransitioning && (
        <StageThreePullOverlay onCovered={finishThirdStageTransition} />
      )}
      {isFourthStageTransitioning && (
        <GlitchTransitionOverlay onComplete={finishFourthStageTransition} />
      )}

      <button
        className="music-toggle"
        type="button"
        aria-label={isMusicPlaying ? 'Поставить музыку на паузу' : 'Продолжить музыку'}
        aria-pressed={!isMusicPlaying}
        onClick={toggleMusicPlayback}
      >
        {isMusicPlaying ? 'Ⅱ' : '▶'}
      </button>

      {/* <nav className="stage-debug-nav" aria-label="Временная навигация по этапам">
        <label className="stage-debug-nav__label" htmlFor="stage-debug-nav__select">
          БЫСТРЫЙ ПЕРЕХОД
        </label>
        <select
          id="stage-debug-nav__select"
          className="stage-debug-nav__select"
          value={debugStageSelection}
          onChange={handleDebugStageChange}
        >
          <option value="">Перейти к этапу…</option>
          <option value="welcome">Этап 1</option>
          <option value="relationship">Этап 2</option>
          <option value="third">Этап 3</option>
          <option value="four">Этап 4</option>
        </select>
      </nav> */}
    </>
  )
}

export default App
