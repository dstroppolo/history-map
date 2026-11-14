import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FamilyTreeBreadcrumb from '@/components/FamilyTree/FamilyTreeBreadcrumb'
import PersonSearchBar from '@/components/FamilyTree/PersonSearchBar'
import DynastyScene from '@/components/FamilyTree3D/DynastyScene'
import DynastyPanel from '@/components/FamilyTree3D/DynastyPanel'
import type { RigHandle } from '@/components/FamilyTree3D/CameraRig'
import { NO_HOUSE_COLOR, housesOf } from '@/components/FamilyTree3D/treeGraph'
import useFamilyTree from '@/hooks/useFamilyTree'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import '@/components/FamilyTree3D/dynasty.css'

const DEFAULT_ROOT_QID = 'Q280856' // George VI
const VALID_QID = /^Q\d+$/
const ANIMATED_LINES_KEY = 'familyTree.animatedLines'

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

  const { nodes, loadingIds, fetchChildren, fetchParents, getPersonById } = useFamilyTree({
    rootQId,
  })

  useEffect(() => {
    setSelectedId(null)
    setHoveredId(null)
    setHighlightHouseId(null)
  }, [rootQId])

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const houses = useMemo(() => housesOf(nodes), [nodes])
  const rootNode = nodeById.get(rootQId)

  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined
  const selectedPerson = selectedId && selectedNode ? getPersonById(selectedId) : undefined
  const panelOpen = !!selectedPerson

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) rigRef.current?.focus(id, true)
  }, [])

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

  return (
    <motion.div
      className={`dynasty${panelOpen ? ' dynasty--panel-open' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {fontsReady && (
        <DynastyScene
          nodes={nodes}
          rootId={rootQId}
          houses={houses}
          loadingIds={loadingIds}
          selectedId={selectedId}
          hoveredId={hoveredId}
          highlightHouseId={highlightHouseId}
          panelOpen={panelOpen}
          animatedLines={animatedLines}
          rigRef={rigRef}
          onHover={setHoveredId}
          onSelect={handleSelect}
          onAddParent={handleAddParent}
          onAddChild={handleAddChild}
        />
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
          <div className="dynasty-eyebrow">Royal lineage</div>
          <AnimatePresence mode="wait">
            {rootNode && (
              <motion.h1
                key={rootNode.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                {rootNode.name}
              </motion.h1>
            )}
          </AnimatePresence>
          <FamilyTreeBreadcrumb
            nodes={nodes}
            selectedNodeId={selectedId}
            onSelectNode={handleSelect}
          />
        </div>

        <div className="dynasty-search">
          <PersonSearchBar />
        </div>

        {houses.length > 0 && (
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

        {!panelOpen && (
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
        {selectedPerson && (
          <DynastyPanel
            key="panel"
            person={selectedPerson}
            node={selectedNode}
            houseColor={selectedHouseColor}
            relatives={relatives}
            onClose={() => setSelectedId(null)}
            onFocusNode={handleSelect}
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
