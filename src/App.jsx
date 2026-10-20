import { useCallback, useRef, useState } from 'react'
import WelcomeStage from './stages/WelcomeStage.jsx'
import RelationshipTimerStage from './stages/RelationshipTimerStage.jsx'

function App() {
  const [stage, setStage] = useState('welcome')
  const [reverseWelcome, setReverseWelcome] = useState(false)
  const transitionRef = useRef(null)

  const goNext = useCallback(() => {
    setReverseWelcome(false)
    setStage('relationship')
  }, [])

  const goPrevious = useCallback(() => {
    setReverseWelcome(true)
    setStage('welcome')
  }, [])

  if (stage === 'relationship') {
    return <RelationshipTimerStage onPrevious={goPrevious} />
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
