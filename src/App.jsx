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
  useEffect(() => {
    // Warm all later-stage image assets invisibly while the first stages play.
    void preloadAllAssets()
  }, [])

  const [stage, setStage] = useState('welcome')
  const [stageRunId, setStageRunId] = useState(0)
  const [debugStageSelection, setDebugStageSelection] = useState('')
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
    setStage('four')
    setIsFourthStageTransitioning(false)
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

  // TEMP: quick stage navigation for testing; selecting the active stage remounts it.
  const handleDebugStageChange = useCallback((event) => {
    const nextStage = event.target.value
    if (!nextStage) return

    setDebugStageSelection('')
    setStageRunId((current) => current + 1)
    setReverseWelcome(false)
    setRelationshipInitialMode('history')
    setIsThirdStageTransitioning(false)
    setIsFourthStageTransitioning(false)
    transitionRef.current = null
    setStage(nextStage)
  }, [])

  return (
    <>
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

      {stage === 'four' && <FourthStage key={stageRunId} onPrevious={returnToThirdStage} />}

      {isThirdStageTransitioning && (
        <StageThreePullOverlay onCovered={finishThirdStageTransition} />
      )}
      {isFourthStageTransitioning && (
        <GlitchTransitionOverlay onComplete={finishFourthStageTransition} />
      )}

      <nav className="stage-debug-nav" aria-label="Временная навигация по этапам">
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
      </nav>
    </>
  )
}

export default App
