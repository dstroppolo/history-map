import { motion } from 'framer-motion'
import type { Journey } from '@/services/lineage'

const dock = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 24 },
  transition: { type: 'spring', damping: 26, stiffness: 240 },
} as const

interface JourneyDockProps {
  journey: Journey
  step: number
  playing: boolean
  onStep: (step: number) => void
  onTogglePlay: () => void
  onOverview: () => void
  onExit: () => void
}

/** Caption and transport controls for a guided journey. */
export function JourneyDock({
  journey,
  step,
  playing,
  onStep,
  onTogglePlay,
  onOverview,
  onExit,
}: JourneyDockProps) {
  const last = journey.steps.length - 1
  const current = journey.steps[step]
  return (
    <motion.div className="dynasty-dock" {...dock}>
      <button type="button" className="dynasty-dock__close" aria-label="Back to the tree" onClick={onExit}>
        ×
      </button>
      <div className="dynasty-eyebrow">
        {journey.kind === 'crown' ? 'Succession' : 'Bloodline'}
      </div>
      <div className="dynasty-dock__title">{journey.title}</div>
      {journey.subtitle && <div className="dynasty-dock__subtitle">{journey.subtitle}</div>}

      <div className="dynasty-dock__step" key={step}>
        <strong>{current?.label}</strong>
        {current?.detail && <span>{current.detail}</span>}
      </div>

      <div className="dynasty-dock__transport">
        <button
          type="button"
          className="dynasty-icon-button"
          aria-label="Previous"
          disabled={step === 0}
          onClick={() => onStep(step - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="dynasty-icon-button dynasty-icon-button--play"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
        >
          {playing ? '❚❚' : step === last ? '↻' : '▶'}
        </button>
        <button
          type="button"
          className="dynasty-icon-button"
          aria-label="Next"
          disabled={step === last}
          onClick={() => onStep(step + 1)}
        >
          ›
        </button>
        <input
          type="range"
          className="dynasty-range"
          min={0}
          max={last}
          value={step}
          aria-label="Position in the journey"
          onChange={(e) => onStep(Number(e.target.value))}
        />
        <span className="dynasty-dock__count">
          {step + 1} / {journey.steps.length}
        </span>
        <button type="button" className="dynasty-button" onClick={onOverview}>
          See all
        </button>
      </div>
    </motion.div>
  )
}

interface TimeDockProps {
  year: number
  min: number
  max: number
  alive: number
  playing: boolean
  onYear: (year: number) => void
  onTogglePlay: () => void
  onClose: () => void
}

/** Year slider: people appear at birth, glow while alive and fade at death. */
export function TimeDock({
  year,
  min,
  max,
  alive,
  playing,
  onYear,
  onTogglePlay,
  onClose,
}: TimeDockProps) {
  return (
    <motion.div className="dynasty-dock dynasty-dock--time" {...dock}>
      <button type="button" className="dynasty-dock__close" aria-label="Close the timeline" onClick={onClose}>
        ×
      </button>
      <div className="dynasty-dock__year">
        <span>{year < 0 ? `${-year} BC` : year}</span>
        <small>
          {alive === 0 ? 'no one here is alive' : `${alive} alive`}
        </small>
      </div>
      <div className="dynasty-dock__transport">
        <button
          type="button"
          className="dynasty-icon-button dynasty-icon-button--play"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
        >
          {playing ? '❚❚' : year >= max ? '↻' : '▶'}
        </button>
        <span className="dynasty-dock__count">{min}</span>
        <input
          type="range"
          className="dynasty-range"
          min={min}
          max={max}
          value={year}
          aria-label="Year"
          onChange={(e) => onYear(Number(e.target.value))}
        />
        <span className="dynasty-dock__count">{max}</span>
      </div>
    </motion.div>
  )
}
