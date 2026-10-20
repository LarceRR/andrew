import { useCallback, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'
import ThirdStage from './stages/ThirdStage.jsx'

function App() {
  const [stage, setStage] = useState('welcome')
  const [reverseWelcome, setReverseWelcome] = useState(false)
  const [relationshipInitialMode, setRelationshipInitialMode] = useState('history')
  const transitionRef = useRef(null)

  const goNext = useCallback(() => {
    setReverseWelcome(false)
    setRelationshipInitialMode('history')
    setStage('relationship')
  }, [])

  const goToThirdStage = useCallback(() => {
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

  if (stage === 'relationship') {
    return (
      <RelationshipTimerStage
        onPrevious={goPrevious}
        onNextStage={goToThirdStage}
        initialMode={relationshipInitialMode}
      />
    )
  }

  if (stage === 'third') {
    return <ThirdStage onPrevious={returnToRelationship} />
  }

  return (
    <WelcomeStage
      onNext={goNext}
      reverseOnMount={reverseWelcome}
      transitionRef={transitionRef}
    />
  )
}

export default App
