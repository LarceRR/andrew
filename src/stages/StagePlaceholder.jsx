import StageControls from '../components/StageControls.jsx'
import './StagePlaceholder.css'

export default function StagePlaceholder({ onPrevious }) {
  return (
    <main className="stage-placeholder" aria-label="Следующий этап">
      <StageControls
        onPrevious={onPrevious}
        nextDisabled
      />
    </main>
  )
}
