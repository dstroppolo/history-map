import { AnimatePresence, motion } from 'framer-motion'
import { THRONES, type Throne } from '@/services/lineage'
import PersonPicker, { type PickedPerson } from './PersonPicker'

export type ExploreTool = 'relate' | 'crown' | null

interface ExploreToolsProps {
  tool: ExploreTool
  onTool: (tool: ExploreTool) => void
  from: PickedPerson | null
  to: PickedPerson | null
  onFrom: (p: PickedPerson | null) => void
  onTo: (p: PickedPerson | null) => void
  onRelate: () => void
  onCrown: (throne: Throne) => void
  timeOn: boolean
  timeAvailable: boolean
  onToggleTime: () => void
  globeOn: boolean
  onToggleGlobe: () => void
  onShare: () => void
  onPoster: () => void
  posterBusy: boolean
  /** What is being fetched right now, if anything. */
  busy: string | null
  error: string | null
}

const card = {
  initial: { opacity: 0, y: -8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.18 },
}

/** The three ways to explore beyond the tree: relate, time, crown. */
export default function ExploreTools({
  tool,
  onTool,
  from,
  to,
  onFrom,
  onTo,
  onRelate,
  onCrown,
  timeOn,
  timeAvailable,
  onToggleTime,
  globeOn,
  onToggleGlobe,
  onShare,
  onPoster,
  posterBusy,
  busy,
  error,
}: ExploreToolsProps) {
  const toggle = (t: ExploreTool) => onTool(tool === t ? null : t)

  return (
    <div className="dynasty-tools">
      <div className="dynasty-tools__bar">
        <button
          type="button"
          className="dynasty-tool"
          aria-pressed={tool === 'relate'}
          onClick={() => toggle('relate')}
        >
          <span aria-hidden>⇄</span> Relate
        </button>
        <button
          type="button"
          className="dynasty-tool"
          aria-pressed={timeOn}
          disabled={!timeAvailable}
          title={timeAvailable ? undefined : 'Leave the guided view to scrub through time'}
          onClick={onToggleTime}
        >
          <span aria-hidden>◷</span> Time
        </button>
        <button
          type="button"
          className="dynasty-tool"
          aria-pressed={tool === 'crown'}
          onClick={() => toggle('crown')}
        >
          <span aria-hidden>♛</span> Crown
        </button>
        <button
          type="button"
          className="dynasty-tool"
          aria-pressed={globeOn}
          title="See where everyone was born"
          onClick={onToggleGlobe}
        >
          <span aria-hidden>◍</span> Globe
        </button>
        <span className="dynasty-tools__divider" aria-hidden />
        <button
          type="button"
          className="dynasty-tool dynasty-tool--icon"
          aria-label="Copy a link to this view"
          title="Copy a link to this view"
          onClick={onShare}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.2 1.2" />
            <path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.2-1.2" />
          </svg>
        </button>
        <button
          type="button"
          className="dynasty-tool dynasty-tool--icon"
          aria-label="Save this view as a poster"
          title="Save this view as a poster"
          disabled={posterBusy}
          onClick={onPoster}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4v11" />
            <path d="m7 11 5 5 5-5" />
            <path d="M5 20h14" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {tool === 'relate' && (
          <motion.div key="relate" className="dynasty-card" {...card}>
            <h3>How are they related?</h3>
            <p>Pick two people and follow the bloodline that joins them.</p>
            <PersonPicker label="From" value={from} onChange={onFrom} />
            <PersonPicker label="To" value={to} onChange={onTo} placeholder="Search anyone…" />
            {error && <p className="dynasty-card__error">{error}</p>}
            <button
              type="button"
              className="dynasty-button dynasty-button--primary dynasty-card__go"
              disabled={!from || !to || !!busy}
              onClick={onRelate}
            >
              {busy ?? 'Find the connection'}
            </button>
          </motion.div>
        )}
        {tool === 'crown' && (
          <motion.div key="crown" className="dynasty-card" {...card}>
            <h3>Follow the crown</h3>
            <p>Choose a throne and watch it pass from monarch to monarch.</p>
            <div className="dynasty-chips">
              {THRONES.map((throne) => (
                <button
                  key={throne.id}
                  type="button"
                  className="dynasty-chip"
                  disabled={!!busy}
                  onClick={() => onCrown(throne)}
                >
                  {throne.label}
                </button>
              ))}
            </div>
            {busy && <p className="dynasty-card__busy">{busy}</p>}
            {error && <p className="dynasty-card__error">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
