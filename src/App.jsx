import { useCallback, useEffect, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'
import ThirdStage from './stages/ThirdStage.jsx'

// Transition timings are shared with CSS through custom properties.
const COVER_ANIMATION_DELAY_MS = 675
const TRANSITION_ANIMATION_DURATION_MS = 3600
const THREAD_APPEAR_DELAY_MS = 350
const THREAD_APPEAR_DURATION_MS = 260
const TRANSITION_FAILSAFE_BUFFER_MS = 500

// Position offsets are in pixels: positive X = right, positive Y = down.
const PULL_THREAD = {
  length: 92,
  angle: -35,
  offsetX: -2,
  offsetY: -22,
}

const PULLER = {
  offsetX: -60,
  offsetY: 0,
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
  const [stage, setStage] = useState('welcome')
  const [reverseWelcome, setReverseWelcome] = useState(false)
  const [relationshipInitialMode, setRelationshipInitialMode] = useState('history')
  const [isThirdStageTransitioning, setIsThirdStageTransitioning] = useState(false)
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

  const returnToRelationship = useCallback(() => {
    setRelationshipInitialMode('future')
    setStage('relationship')
  }, [])

  const goPrevious = useCallback(() => {
    setReverseWelcome(true)
    setStage('welcome')
  }, [])

  return (
    <>
      {stage === 'relationship' ? (
        <RelationshipTimerStage
          onPrevious={goPrevious}
          onNextStage={goToThirdStage}
          initialMode={relationshipInitialMode}
        />
      ) : stage === 'third' ? (
        <ThirdStage onPrevious={returnToRelationship} />
      ) : (
        <WelcomeStage
          onNext={goNext}
          reverseOnMount={reverseWelcome}
          transitionRef={transitionRef}
        />
      )}

      {isThirdStageTransitioning && (
        <StageThreePullOverlay onCovered={finishThirdStageTransition} />
      )}
    </>
  )
}

export default App
