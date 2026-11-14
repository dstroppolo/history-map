# Family Tree 3D "Dynasty Space" — Design

Date: 2026-11-14. Scope: the `/family-tree` page only. Timeline and map pages are untouched.

## Goal

Replace the flat DOM-and-SVG family tree with an immersive, animated 3D experience that feels like a product, while keeping the live Wikidata data layer.

## Kept as is

- `src/services/wikidata.ts` — Wikidata/Wikipedia fetching.
- `src/hooks/useFamilyTree.ts` — node state and expand-on-demand (one change: nodes are cleared when the root changes).
- `src/utils/familyTreeLayout.ts` — generation rows and spouse pairing. Its 2D output is mapped into 3D.

## New

Stack: `three`, `@react-three/fiber` v8, `@react-three/drei` v9, `@react-three/postprocessing` v2.

| File | Purpose |
| --- | --- |
| `src/components/FamilyTree3D/treeGraph.ts` | Pure functions: 3D target positions (anchored on the root, curved back in depth), parent map, bloodline threads, couples, lineage sets, house colours. |
| `src/components/FamilyTree3D/textures.ts` | Canvas textures (name label, monogram, glow, plus icon) and the portrait loader. |
| `src/components/FamilyTree3D/Medallion.tsx` | One person: portrait disc, house-coloured glowing ring, halo, label, expand buttons. |
| `src/components/FamilyTree3D/Bloodlines.tsx` | Curved parent→child threads with a travelling pulse, and couple links. |
| `src/components/FamilyTree3D/CameraRig.tsx` | Drag pan with inertia, wheel/pinch zoom toward cursor, follow-a-person glide, pointer parallax, intro fly-in. |
| `src/components/FamilyTree3D/DynastyScene.tsx` | Canvas, starfield, bloom, position springs, wiring. |
| `src/components/FamilyTree3D/DynastyPanel.tsx` | Glass side panel with the person's details. Non-modal, so the scene stays explorable. |
| `src/pages/FamilyTreePage.tsx` | Rewritten: state, HUD (title, breadcrumb, search, house legend, zoom controls). |

Removed: `src/components/FamilyTree/FamilyTreeNode.tsx` (the old DOM card).

## Behaviour

- Positions are springs. New relatives start at the person who revealed them and fly to their place; threads follow every frame while anything moves.
- Hovering a person lights their ancestors and descendants and dims everyone else.
- Clicking a person selects them, glides the camera to them, and opens the panel.
- House legend chips dim everyone outside the chosen house.
- Changing the root (search or "Explore from here") clears the scene and replays the fly-in.
- Dark theme is scoped to this route by overriding the existing CSS variables.

## Risks

- Wikimedia portraits must load cross-origin as WebGL textures; a failed load falls back to a monogram.
- No test framework exists. Verification is `tsc`, `eslint`, and driving the page in a browser.
