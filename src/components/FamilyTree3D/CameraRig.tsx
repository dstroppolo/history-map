import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { AnimStore } from './animStore'
import { depthAt } from './treeGraph'

const FOV = 45
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
const MIN_DIST = 5
const MAX_DIST = 80
const HOME_DIST = 15
/** Look a little below the root so its children are in frame. */
const HOME_DROP = -1.7
const FOCUS_DROP = -0.5
const FOCUS_DIST = 12
const DRAG_SLOP_PX = 4

export interface RigHandle {
  /** Glide to a person and keep following them as the layout shifts. */
  focus: (id: string, zoomIn?: boolean) => void
  zoomBy: (factor: number) => void
  home: () => void
}

interface CameraRigProps {
  anim: AnimStore
  rootId: string
  /** Shift the view left so the side panel doesn't cover the subject. */
  panelOpen: boolean
}

const clampDist = (d: number) => Math.min(MAX_DIST, Math.max(MIN_DIST, d))
const dampK = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt)

const CameraRig = forwardRef<RigHandle, CameraRigProps>(function CameraRig(
  { anim, rootId, panelOpen },
  ref,
) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const sizeRef = useRef(size)
  sizeRef.current = size

  const rig = useRef({
    // Desired
    tx: 0,
    ty: HOME_DROP,
    dist: HOME_DIST,
    // Current (smoothed)
    cx: 0,
    cy: 9,
    cd: 70,
    shift: 0,
    // Follow
    follow: rootId as string | null,
    followDrop: HOME_DROP,
    // Inertia (world units per second)
    vx: 0,
    vy: 0,
    dragging: false,
    // Pointer parallax (-1..1)
    mx: 0,
    my: 0,
    px: 0,
    py: 0,
  })

  useImperativeHandle(
    ref,
    () => ({
      focus(id, zoomIn = false) {
        const r = rig.current
        r.follow = id
        r.followDrop = FOCUS_DROP
        r.vx = 0
        r.vy = 0
        if (zoomIn) r.dist = Math.min(r.dist, FOCUS_DIST)
      },
      zoomBy(factor) {
        rig.current.dist = clampDist(rig.current.dist * factor)
      },
      home() {
        const r = rig.current
        r.follow = rootId
        r.followDrop = HOME_DROP
        r.dist = HOME_DIST
        r.vx = 0
        r.vy = 0
      },
    }),
    [rootId],
  )

  // New root: replay the fly-in from deep space.
  useEffect(() => {
    const r = rig.current
    r.tx = 0
    r.ty = HOME_DROP
    r.dist = HOME_DIST
    r.cx = 0
    r.cy = 9
    r.cd = 70
    r.follow = rootId
    r.followDrop = HOME_DROP
    r.vx = 0
    r.vy = 0
  }, [rootId])

  useEffect(() => {
    const el = gl.domElement
    const r = rig.current
    const pointers = new Map<number, { x: number; y: number }>()
    let last: { x: number; y: number; t: number } | null = null
    let travelled = 0
    let pinch: { span: number; dist: number } | null = null

    const worldPerPixel = () => (2 * r.cd * TAN_HALF_FOV) / sizeRef.current.height
    const span = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        last = { x: e.clientX, y: e.clientY, t: performance.now() }
        travelled = 0
        r.dragging = true
        r.vx = 0
        r.vy = 0
      } else if (pointers.size === 2) {
        pinch = { span: span() || 1, dist: r.dist }
        last = null
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const rect = el.getBoundingClientRect()
        r.mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
        r.my = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      }
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pinch && pointers.size === 2) {
        r.dist = clampDist((pinch.dist * pinch.span) / (span() || 1))
        return
      }
      if (pointers.size !== 1 || !last) return

      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      travelled += Math.abs(dx) + Math.abs(dy)
      const now = performance.now()
      if (travelled > DRAG_SLOP_PX) {
        const k = worldPerPixel()
        r.follow = null
        r.tx -= dx * k
        r.ty += dy * k
        const dt = Math.max(1, now - last.t) / 1000
        r.vx = r.vx * 0.7 + ((-dx * k) / dt) * 0.3
        r.vy = r.vy * 0.7 + ((dy * k) / dt) * 0.3
      }
      last = { x: e.clientX, y: e.clientY, t: now }
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return
      if (pointers.size < 2) pinch = null
      if (pointers.size === 0) {
        r.dragging = false
        if (!last || performance.now() - last.t > 90) {
          r.vx = 0
          r.vy = 0
        }
        last = null
      } else if (pointers.size === 1) {
        const [p] = [...pointers.values()]
        last = { x: p.x, y: p.y, t: performance.now() }
        r.vx = 0
        r.vy = 0
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      const old = r.dist
      const next = clampDist(old * Math.exp(e.deltaY * (e.ctrlKey ? 0.006 : 0.0013)))
      // Keep the point under the cursor where it is.
      const halfH = old * TAN_HALF_FOV
      const halfW = halfH * (rect.width / rect.height)
      const keep = 1 - next / old
      r.tx += nx * halfW * keep
      r.ty += ny * halfH * keep
      r.dist = next
      r.follow = null
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame((_, rawDt) => {
    const r = rig.current
    const dt = Math.min(rawDt, 0.05)

    if (r.follow) {
      const entry = anim.entries.get(r.follow)
      if (entry) {
        r.tx = entry.target.x
        r.ty = entry.target.y + r.followDrop
      }
    } else if (!r.dragging) {
      r.tx += r.vx * dt
      r.ty += r.vy * dt
      const decay = Math.exp(-4.5 * dt)
      r.vx *= decay
      r.vy *= decay
    }

    const follow = dampK(r.dragging ? 26 : 3.4, dt)
    r.cx += (r.tx - r.cx) * follow
    r.cy += (r.ty - r.cy) * follow
    r.cd += (r.dist - r.cd) * dampK(3.4, dt)

    const halfW = r.cd * TAN_HALF_FOV * (sizeRef.current.width / sizeRef.current.height)
    const wantShift = panelOpen && sizeRef.current.width > 900 ? halfW * 0.3 : 0
    r.shift += (wantShift - r.shift) * dampK(3, dt)

    const ease = dampK(2.5, dt)
    r.px += (r.mx - r.px) * ease
    r.py += (r.my - r.py) * ease
    const sway = r.cd * 0.035

    const lookX = r.cx + r.shift
    const lookZ = depthAt(r.cx)
    camera.position.set(lookX + r.px * sway, r.cy + r.py * sway * 0.7, lookZ + r.cd)
    camera.lookAt(lookX, r.cy, lookZ)
  })

  return null
})

export default CameraRig
