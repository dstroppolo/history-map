import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FamilyTreeBreadcrumb from '@/components/FamilyTree/FamilyTreeBreadcrumb'
import PersonSearchBar from '@/components/FamilyTree/PersonSearchBar'
import DynastyScene from '@/components/FamilyTree3D/DynastyScene'
import DynastyPanel from '@/components/FamilyTree3D/DynastyPanel'
import ExploreTools, { type ExploreTool } from '@/components/FamilyTree3D/ExploreTools'
import { JourneyDock, TimeDock } from '@/components/FamilyTree3D/Docks'
import type { PickedPerson } from '@/components/FamilyTree3D/PersonPicker'
import type { RigHandle } from '@/components/FamilyTree3D/CameraRig'
import { NO_HOUSE_COLOR, housesOf } from '@/components/FamilyTree3D/treeGraph'
import useFamilyTree from '@/hooks/useFamilyTree'
import {
  composePoster,
  downloadBlob,
  posterDpr,
  type CaptureHandle,
} from '@/components/FamilyTree3D/capture'
import {
  THRONES,
  fetchBirthplaces,
  findRelation,
  followCrown,
  type Birthplace,
  type Journey,
  type Throne,
} from '@/services/lineage'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import '@/components/FamilyTree3D/dynasty.css'

// The globe brings its own map data; load it only when first opened.
const GlobeView = lazy(() => import('@/components/FamilyTree3D/GlobeView'))
const NO_PLACES = new Map<string, Birthplace>()

const DEFAULT_ROOT_QID ='Q280856' // George VI
const VALID_QID = /^Q\d+$/
const ANIMATED_LINES_KEY = 'familyTree.animatedLines'
const THIS_YEAR = new Date().getFullYear()
/** Seconds the time scrubber takes to play through the whole tree. */
const TIME_PLAY_SECONDS = 24

function readAnimatedLines(): boolean {
  try {
    return localStorage.getItem(ANIMATED_LINES_KEY) !== 'off'
  } catch {
    return true
  }
}

function useRootFromUrl(): string {
  const [searchParams] = useSearchParams()
  const rootParam = searchParams.get('root')
  if (rootParam && VALID_QID.test(rootParam)) return rootParam
  return DEFAULT_ROOT_QID
}

/** Canvas labels are drawn once, so wait for the display font (briefly). */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        setReady(true)
      }
    }
    const timer = setTimeout(finish, 1500)
    Promise.all([
      document.fonts.load('600 50px "Cormorant Garamond"'),
      document.fonts.load('500 25px Inter'),
    ]).then(finish, finish)
    return () => {
      done = true
      clearTimeout(timer)
    }
  }, [])
  return ready
}

export default function FamilyTreePage() {
  const rootQId = useRootFromUrl()
  const fontsReady = useFontsReady()
  const rigRef = useRef<RigHandle>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [highlightHouseId, setHighlightHouseId] = useState<string | null>(null)
  const [animatedLines, setAnimatedLines] = useState(readAnimatedLines)

  const toggleAnimatedLines = useCallback(() => {
    setAnimatedLines((on) => {
      try {
        localStorage.setItem(ANIMATED_LINES_KEY, on ? 'off' : 'on')
      } catch {
        // The preference just won't persist.
      }
      return !on
    })
  }, [])

  const {
    nodes: treeNodes,
    loadingIds,
    fetchChildren,
    fetchParents,
    getPersonById,
  } = useFamilyTree({ rootQId })

  // Guided journeys (a bloodline or a succession) swap in their own tree.
  const [journey, setJourney] = useState<Journey | null>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tool, setTool] = useState<ExploreTool>(null)
  const [relateFrom, setRelateFrom] = useState<PickedPerson | null>(null)
  const [relateTo, setRelateTo] = useState<PickedPerson | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toolError, setToolError] = useState<string | null>(null)

  // Time scrubber.
  const [year, setYear] = useState<number | null>(null)
  const [timePlaying, setTimePlaying] = useState(false)
  const yearRef = useRef<number | null>(null)
  yearRef.current = year

  const nodes = journey?.nodes ?? treeNodes
  const sceneRootId = journey?.rootId ?? rootQId

  useEffect(() => {
    setSelectedId(null)
    setHoveredId(null)
    setHighlightHouseId(null)
    setJourney(null)
    setPlaying(false)
    setYear(null)
    setTimePlaying(false)
    setTool(null)
    setRelateFrom(null)
  }, [rootQId])

  // Lock page scrolling and darken the document behind the scene (see dynasty.css).
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dynasty-page')
    return () => root.classList.remove('dynasty-page')
  }, [])

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const houses = useMemo(() => housesOf(nodes), [nodes])
  const rootNode = nodeById.get(rootQId)

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined
  const selectedPerson =
    selectedId && selectedNode
      ? journey?.people.get(selectedId) ?? getPersonById(selectedId)
      : undefined
  const panelOpen = !!selectedPerson

  const handleSelect = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (!id) return
      setPlaying(false)
      // In a journey, clicking someone on the route moves the marker to them.
      const at = journey ? journey.steps.findIndex((s) => s.id === id) : -1
      if (at >= 0) setStep(at)
      rigRef.current?.focus(id, true)
    },
    [journey],
  )

  // ── Globe ────────────────────────────────────────────────────────────────
  const [globeOn, setGlobeOn] = useState(false)
  const [places, setPlaces] = useState(NO_PLACES)
  const [placesLoading, setPlacesLoading] = useState(false)

  useEffect(() => {
    if (!globeOn || nodes.length === 0) return
    let cancelled = false
    setPlacesLoading(true)
    fetchBirthplaces(nodes.map((n) => n.id))
      .then((found) => !cancelled && setPlaces(found))
      .catch(() => undefined)
      .finally(() => !cancelled && setPlacesLoading(false))
    return () => {
      cancelled = true
    }
  }, [globeOn, nodes])

  const handleAddParent = useCallback(
    (id: string) => {
      rigRef.current?.focus(id)
      fetchParents(id)
    },
    [fetchParents],
  )

  const handleAddChild = useCallback(
    (id: string) => {
      rigRef.current?.focus(id)
      fetchChildren(id)
    },
    [fetchChildren],
  )

  // ── Guided journeys ──────────────────────────────────────────────────────
  // Closing the tour bar keeps the journey's tree on screen, fully lit, to explore.
  const [tourHidden, setTourHidden] = useState(false)
  const touring = !!journey && !tourHidden
  const lastStep = journey ? journey.steps.length - 1 : 0
  const markerId =
    touring && journey ? journey.steps[Math.min(step, lastStep)]?.id ?? null : null
  const litIds = useMemo(() => {
    if (!journey || tourHidden) return null
    const lit = new Set<string>()
    for (const [id, at] of journey.revealAt) if (at <= step) lit.add(id)
    return lit
  }, [journey, step, tourHidden])

  const hideTour = useCallback(() => {
    setTourHidden(true)
    setPlaying(false)
  }, [])

  const showTour = useCallback(() => {
    setTourHidden(false)
    setYear(null)
    setTimePlaying(false)
  }, [])

  const startJourney = useCallback((next: Journey, at = 0, autoplay = true) => {
    setJourney(next)
    setTourHidden(false)
    setStep(Math.max(0, Math.min(next.steps.length - 1, at)))
    setPlaying(autoplay)
    setTool(null)
    setSelectedId(null)
    setHoveredId(null)
    setHighlightHouseId(null)
    setYear(null)
    setTimePlaying(false)
  }, [])

  const exitJourney = useCallback(() => {
    setJourney(null)
    setTourHidden(false)
    setYear(null)
    setTimePlaying(false)
    setPlaying(false)
    setSelectedId(null)
  }, [])

  useEffect(() => {
    if (!journey || !playing) return
    if (step >= lastStep) {
      // Hold on the last person, then pull back to show the whole picture.
      const done = setTimeout(() => {
        setPlaying(false)
        if (journey.kind === 'relation') rigRef.current?.frameAll()
      }, 1800)
      return () => clearTimeout(done)
    }
    const wait = step === 0 ? 3200 : journey.kind === 'crown' ? 2200 : 1900
    const next = setTimeout(() => setStep((s) => s + 1), wait)
    return () => clearTimeout(next)
  }, [journey, playing, step, lastStep])

  const goToStep = useCallback(
    (target: number) => {
      setPlaying(false)
      setStep(Math.max(0, Math.min(lastStep, target)))
    },
    [lastStep],
  )

  const toggleJourneyPlay = useCallback(() => {
    if (!playing && step >= lastStep) setStep(0)
    setPlaying((p) => !p)
  }, [playing, step, lastStep])

  // Arrow keys step through a journey; space plays and pauses.
  useEffect(() => {
    if (!touring) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON')) return
      if (e.key === 'ArrowRight') goToStep(step + 1)
      else if (e.key === 'ArrowLeft') goToStep(step - 1)
      else if (e.key === ' ') toggleJourneyPlay()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [touring, step, goToStep, toggleJourneyPlay])

  const openTool = useCallback(
    (next: ExploreTool) => {
      setToolError(null)
      setTool(next)
      if (next === 'relate' && !relateFrom) {
        const start = (selectedId && nodeById.get(selectedId)) || nodeById.get(sceneRootId)
        if (start) setRelateFrom({ id: start.id, label: start.name })
      }
    },
    [relateFrom, selectedId, nodeById, sceneRootId],
  )

  const handleRelate = useCallback(async () => {
    if (!relateFrom || !relateTo) return
    setToolError(null)
    setBusy('Tracing both bloodlines…')
    try {
      const found = await findRelation(relateFrom.id, relateTo.id)
      if (found) startJourney(found)
      else setToolError('No shared ancestor turned up in the recorded family lines of these two.')
    } catch {
      setToolError('Wikidata could not be reached. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }, [relateFrom, relateTo, startJourney])

  const handleCrown = useCallback(
    async (throne: Throne) => {
      setToolError(null)
      setBusy('Summoning the monarchs of ' + throne.label + '…')
      try {
        const found = await followCrown(throne)
        if (found) startJourney(found)
        else setToolError('No dated reigns are recorded for this throne.')
      } catch {
        setToolError('Wikidata could not be reached. Try again in a moment.')
      } finally {
        setBusy(null)
      }
    },
    [startJourney],
  )

  const relateFromPerson = useCallback((id: string, name: string) => {
    setRelateFrom({ id, label: name })
    setRelateTo(null)
    setToolError(null)
    setTool('relate')
    setSelectedId(null)
  }, [])

  // ── Time scrubber ────────────────────────────────────────────────────────
  const timeRange = useMemo(() => {
    const dated = nodes.filter((n) => n.birthYear !== undefined)
    if (dated.length === 0) return null
    const min = Math.min(...dated.map((n) => n.birthYear!)) - 2
    const max = Math.min(
      THIS_YEAR,
      Math.max(...dated.map((n) => n.deathYear ?? n.birthYear! + 90)) + 2,
    )
    return { min, max: Math.max(max, min + 1) }
  }, [nodes])

  const aliveCount = useMemo(() => {
    if (year === null) return 0
    return nodes.filter((n) => {
      if (n.birthYear === undefined || year < n.birthYear) return false
      return year <= (n.deathYear ?? Math.min(n.birthYear + 100, THIS_YEAR))
    }).length
  }, [nodes, year])

  const toggleTime = useCallback(() => {
    if (year !== null) {
      setYear(null)
      setTimePlaying(false)
      return
    }
    if (!timeRange) return
    setTool(null)
    setSelectedId(null)
    setYear(timeRange.min)
    setTimePlaying(true)
  }, [year, timeRange])

  useEffect(() => {
    if (!timePlaying || !timeRange) return
    const { min, max } = timeRange
    const speed = Math.max(3, (max - min) / TIME_PLAY_SECONDS)
    let acc = yearRef.current ?? min
    let last = performance.now()
    let raf = requestAnimationFrame(function tick(now: number) {
      acc += ((now - last) / 1000) * speed
      last = now
      const y = Math.min(max, Math.floor(acc))
      setYear(y)
      if (y >= max) setTimePlaying(false)
      else raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [timePlaying, timeRange])

  const toggleTimePlay = useCallback(() => {
    if (!timeRange) return
    if (!timePlaying && (yearRef.current ?? 0) >= timeRange.max) setYear(timeRange.min)
    setTimePlaying((p) => !p)
  }, [timePlaying, timeRange])

  const dockOpen = touring || year !== null

  // ── Shared links ─────────────────────────────────────────────────────────
  // Runs once, after the reset above: rebuild the view a shared link describes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sel = params.get('sel')
    const stepAt = parseInt(params.get('step') ?? '0', 10) || 0
    const yearAt = parseInt(params.get('year') ?? '', 10)
    if (params.get('globe') === '1') setGlobeOn(true)

    const pair = params.get('relate')?.split(',') ?? []
    const throne = THRONES.find((t) => t.id === params.get('crown'))
    const load =
      pair.length === 2 && pair.every((id) => VALID_QID.test(id))
        ? () => findRelation(pair[0], pair[1])
        : throne
          ? () => followCrown(throne)
          : null

    if (!load) {
      if (!Number.isNaN(yearAt)) setYear(yearAt)
      if (sel && VALID_QID.test(sel)) setSelectedId(sel)
      return
    }
    let cancelled = false
    setBusy('Restoring the shared view…')
    load()
      .then((found) => {
        if (cancelled || !found) return
        startJourney(found, stepAt, false)
        if (sel && VALID_QID.test(sel)) setSelectedId(sel)
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setBusy(null))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const handleShare = useCallback(async () => {
    const params = new URLSearchParams({ root: rootQId })
    if (journey) {
      for (const [key, value] of Object.entries(journey.link)) params.set(key, value)
      params.set('step', String(step))
    } else if (year !== null) {
      params.set('year', String(year))
    }
    if (selectedId) params.set('sel', selectedId)
    if (globeOn) params.set('globe', '1')
    // Commas read better unescaped, and are safe in a query string.
    const url = `${window.location.origin}${window.location.pathname}?${params
      .toString()
      .replace(/%2C/g, ',')}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied — it reopens this exact view')
    } catch {
      window.prompt('Copy this link', url)
    }
  }, [rootQId, journey, step, year, selectedId, globeOn])

  const treeCapture = useRef<CaptureHandle>(null)
  const globeCapture = useRef<CaptureHandle>(null)
  const [posterBusy, setPosterBusy] = useState(false)
  const [captureDpr, setCaptureDpr] = useState<number | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const handlePoster = useCallback(async () => {
    const source = (globeOn ? globeCapture : treeCapture).current
    if (!source) return
    setPosterBusy(true)
    try {
      // Re-render the view at poster resolution, grab it, then drop back.
      const frame = pageRef.current
      setCaptureDpr(posterDpr(frame?.clientWidth ?? 1, frame?.clientHeight ?? 1))
      for (let i = 0; i < 12; i++) await new Promise((r) => requestAnimationFrame(r))
      const image = source.capture()
      setCaptureDpr(null)
      const title = journey ? journey.heading : nodeById.get(rootQId)?.name ?? 'Family tree'
      const current = journey?.steps[Math.min(step, journey.steps.length - 1)]
      const blob = await composePoster(image, {
        eyebrow: journey
          ? journey.kind === 'crown'
            ? 'Succession'
            : 'Bloodline'
          : globeOn
            ? 'Birthplaces'
            : 'Royal lineage',
        heading: title,
        line: journey
          ? journey.kind === 'crown' && current
            ? `${current.label} · ${current.detail ?? ''}`
            : journey.title
          : year !== null
            ? `The family in ${year}`
            : undefined,
        sub: journey?.subtitle,
        footer: 'History Map · data from Wikidata',
      })
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      downloadBlob(blob, `${slug || 'lineage'}-poster.png`)
      setToast('Poster saved to your downloads')
    } catch {
      setToast('The poster could not be created')
    } finally {
      setCaptureDpr(null)
      setPosterBusy(false)
    }
  }, [globeOn, journey, step, year, nodeById, rootQId])

  const relatives = useMemo(() => {
    if (!selectedNode) return []
    const present = (ids: (string | undefined)[]) =>
      ids
        .map((id) => (id ? nodeById.get(id) : undefined))
        .filter((n): n is FamilyTreeNodeData => !!n)
    const parentIds = new Set<string>()
    if (selectedNode.fatherId) parentIds.add(selectedNode.fatherId)
    if (selectedNode.motherId) parentIds.add(selectedNode.motherId)
    for (const n of nodes) {
      if (n.parentOf?.includes(selectedNode.id)) parentIds.add(n.id)
    }
    return [
      { label: 'Parents', people: present([...parentIds]) },
      { label: 'Children', people: present(selectedNode.parentOf ?? []) },
    ]
  }, [selectedNode, nodeById, nodes])

  const selectedHouseColor =
    houses.find((h) => h.id === selectedNode?.houseId)?.color ?? NO_HOUSE_COLOR

  const classes = ['dynasty']
  if (panelOpen) classes.push('dynasty--panel-open')
  if (dockOpen) classes.push('dynasty--dock-open')
  if (globeOn) classes.push('dynasty--globe-open')

  const eyebrow = journey
    ? journey.kind === 'crown'
      ? 'Succession'
      : 'Bloodline'
    : 'Royal lineage'
  const heading = journey ? journey.heading : rootNode?.name

  return (
    <motion.div
      ref={pageRef}
      className={classes.join(' ')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {fontsReady && (
        <DynastyScene
          nodes={nodes}
          rootId={sceneRootId}
          houses={houses}
          loadingIds={loadingIds}
          selectedId={selectedId}
          hoveredId={hoveredId}
          highlightHouseId={highlightHouseId}
          panelOpen={panelOpen}
          animatedLines={animatedLines}
          litIds={litIds}
          markerId={markerId}
          markerCrown={journey?.kind === 'crown'}
          journeyPaused={touring && !playing}
          suspended={globeOn}
          year={touring ? null : year}
          rigRef={rigRef}
          captureRef={treeCapture}
          dpr={globeOn ? null : captureDpr}
          onHover={setHoveredId}
          onSelect={handleSelect}
          onAddParent={handleAddParent}
          onAddChild={handleAddChild}
        />
      )}

      {globeOn && (
        <Suspense fallback={<div className="dynasty-globe" />}>
          <GlobeView
            nodes={nodes}
            places={places}
            houses={houses}
            loading={placesLoading && places.size === 0}
            focusId={markerId ?? selectedId ?? sceneRootId}
            litIds={litIds}
            year={touring ? null : year}
            highlightHouseId={highlightHouseId}
            captureRef={globeCapture}
            dpr={captureDpr}
            onSelect={handleSelect}
          />
        </Suspense>
      )}

      <AnimatePresence>
        {nodes.length === 0 && (
          <motion.div
            className="dynasty-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="dynasty-loading__ring" />
            Tracing the bloodline…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dynasty-hud">
        <div className="dynasty-heading">
          <div className="dynasty-eyebrow">{eyebrow}</div>
          <AnimatePresence mode="wait">
            {heading && (
              <motion.h1
                key={heading}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                {heading}
              </motion.h1>
            )}
          </AnimatePresence>
          {journey && (
            <div className="dynasty-heading__actions">
              {tourHidden && (
                <button type="button" className="dynasty-chip" onClick={showTour}>
                  ▶ Resume the tour
                </button>
              )}
              <button
                type="button"
                className="dynasty-chip"
                title="Leave this tree and go back to the one you started from"
                onClick={exitJourney}
              >
                ↺ Reset to {treeNodes.find((n) => n.id === rootQId)?.name ?? 'the starting tree'}
              </button>
            </div>
          )}
          {!journey && (
            <FamilyTreeBreadcrumb
              nodes={nodes}
              selectedNodeId={selectedId}
              onSelectNode={handleSelect}
            />
          )}
        </div>

        <div className="dynasty-search">
          <PersonSearchBar />
          <ExploreTools
            tool={tool}
            onTool={openTool}
            from={relateFrom}
            to={relateTo}
            onFrom={setRelateFrom}
            onTo={setRelateTo}
            onRelate={handleRelate}
            onCrown={handleCrown}
            timeOn={year !== null}
            timeAvailable={!touring && !!timeRange}
            onToggleTime={toggleTime}
            globeOn={globeOn}
            onToggleGlobe={() => setGlobeOn((on) => !on)}
            onShare={handleShare}
            onPoster={handlePoster}
            posterBusy={posterBusy}
            busy={busy}
            error={toolError}
          />
        </div>

        {houses.length > 0 && !dockOpen && (
          <div className="dynasty-legend">
            <div className="dynasty-legend__title">Houses</div>
            <div className="dynasty-chips">
              {houses.map((house) => (
                <button
                  key={house.id}
                  type="button"
                  className="dynasty-chip"
                  aria-pressed={highlightHouseId === house.id}
                  style={{ ['--chip' as string]: house.color }}
                  onClick={() =>
                    setHighlightHouseId((cur) => (cur === house.id ? null : house.id))
                  }
                >
                  <span className="dynasty-chip__dot" />
                  {house.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!panelOpen && !dockOpen && (
          <div className="dynasty-hint">
            Drag to travel · Scroll to zoom · Click a portrait · ＋ reveals parents above, children
            below
          </div>
        )}

        <div className="dynasty-controls">
          <button
            type="button"
            className="dynasty-icon-button"
            aria-label="Animated lines"
            aria-pressed={animatedLines}
            title={animatedLines ? 'Animated lines: on' : 'Animated lines: off'}
            onClick={toggleAnimatedLines}
          >
            ≋
          </button>
          <button
            type="button"
            className="dynasty-icon-button"
            aria-label="Zoom in"
            onClick={() => rigRef.current?.zoomBy(0.75)}
          >
            +
          </button>
          <button
            type="button"
            className="dynasty-icon-button"
            aria-label="Zoom out"
            onClick={() => rigRef.current?.zoomBy(1.35)}
          >
            −
          </button>
          <button
            type="button"
            className="dynasty-icon-button"
            aria-label="Return to root"
            title="Return to root"
            onClick={() => rigRef.current?.home()}
          >
            ⌂
          </button>
        </div>
      </div>

      <AnimatePresence>
        {touring && journey ? (
          <JourneyDock
            key={'journey-' + journey.heading}
            journey={journey}
            step={Math.min(step, lastStep)}
            playing={playing}
            onStep={goToStep}
            onTogglePlay={toggleJourneyPlay}
            onOverview={() => {
              setPlaying(false)
              rigRef.current?.frameAll()
            }}
            onExit={hideTour}
          />
        ) : (
          year !== null &&
          timeRange && (
            <TimeDock
              key="time"
              year={year}
              min={timeRange.min}
              max={timeRange.max}
              alive={aliveCount}
              playing={timePlaying}
              onYear={(y) => {
                setTimePlaying(false)
                setYear(y)
              }}
              onTogglePlay={toggleTimePlay}
              onClose={toggleTime}
            />
          )
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="dynasty-toast"
            role="status"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPerson && (
          <DynastyPanel
            key="panel"
            person={selectedPerson}
            node={selectedNode}
            houseColor={selectedHouseColor}
            relatives={relatives}
            onClose={() => setSelectedId(null)}
            onFocusNode={handleSelect}
            onRelate={() => relateFromPerson(selectedPerson.id, selectedPerson.name)}
            onRevealParents={
              selectedNode && !selectedNode.parentsFetched
                ? () => handleAddParent(selectedNode.id)
                : undefined
            }
            onRevealChildren={
              selectedNode && !selectedNode.childrenFetched
                ? () => handleAddChild(selectedNode.id)
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
