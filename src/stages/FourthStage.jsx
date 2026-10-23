import StageControls from '../components/StageControls.jsx'
import './FourthStage.css'

export default function FourthStage({ onPrevious }) {
  return (
    <main className="stage-four" aria-label="Четвёртый этап">
      <StageControls
        onPrevious={onPrevious}
        previousDisabled={!onPrevious}
        nextDisabled
      />
    </main>
  )
}
