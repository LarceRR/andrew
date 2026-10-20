import './StageControls.css'

export default function StageControls({
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
}) {
  return (
    <nav className="stage-controls" aria-label="Навигация по этапам">
      <button
        className="stage-controls__zone stage-controls__zone--previous"
        type="button"
        aria-label="Проиграть этап назад"
        disabled={previousDisabled}
        onClick={onPrevious}
      />
      <button
        className="stage-controls__zone stage-controls__zone--next"
        type="button"
        aria-label={nextDisabled ? 'Следующий этап пока недоступен' : 'Перейти к следующему этапу'}
        disabled={nextDisabled}
        onClick={onNext}
      />
    </nav>
  )
}
