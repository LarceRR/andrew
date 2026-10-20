import { useCallback, useEffect, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'
import ThirdStage from './stages/ThirdStage.jsx'

function StageThreePullOverlay({ onCovered }) {
  const finishedRef = useRef(false)

  const finishTransition = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onCovered()
  }, [onCovered])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // The animation event is the primary signal; this timer is a fallback in case
    // the browser cancels CSS animation delivery. Reduced-motion covers immediately.
    const timeout = window.setTimeout(finishTransition, prefersReducedMotion ? 0 : 2500)
    return () => window.clearTimeout(timeout)
  }, [finishTransition])

  return (
    <div className="stage-three-transition" aria-hidden="true">
      <div
        className="stage-three-transition__cover"
        onAnimationEnd={finishTransition}
      />
      <div className="stage-three-transition__rig">
        <div className="stage-three-transition__thread" />
        <img
          className="stage-three-transition__puller"
          src="/step-three-assets/pixel-self-pulling.png"
          alt=""
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden'
          }}
        />
        <div className="stage-three-transition__edge" />
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
