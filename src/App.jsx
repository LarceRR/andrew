import { useCallback, useEffect, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'
import ThirdStage from './stages/ThirdStage.jsx'

// Edit these two values together to tune the thread geometry.
const PULL_THREAD = { length: 92, angle: -35 }

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
    const timeout = window.setTimeout(finishTransition, prefersReducedMotion ? 0 : 4100)
    return () => window.clearTimeout(timeout)
  }, [finishTransition, pullerReady])

  return (
    <div
      className={'stage-three-transition' + (pullerReady ? ' stage-three-transition--started' : '')}
      aria-hidden="true"
    >
      <div
        className="stage-three-transition__cover"
        onAnimationEnd={finishTransition}
      />
      <div className="stage-three-transition__rig">
        <div
          className="stage-three-transition__thread"
          style={{
            '--pull-thread-length': PULL_THREAD.length + 'px',
            '--pull-thread-angle': PULL_THREAD.angle + 'deg',
          }}
        />
        <img
          className="stage-three-transition__puller"
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
