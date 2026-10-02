# HVAC Planner 3D

A SketchUp-style web tool for planning residential heat pumps, ducted AC, and
heat-recovery ventilation (HRV/rekuperator). Draw each floor in 2D, inspect the
multi-story house in 3D, estimate room-by-room heating/cooling loads, plan the
HVAC layer, and export a penetration schedule for the core-drilling crew.

Everything runs locally in the browser — no backend, no account. Projects are
saved to a JSON file you download and load back.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npx vitest run     # unit tests
```

## Concepts

- **One model, two views.** All drawing/editing happens in the **2D plan**; the
  **3D view** (walls, openings, floor slabs, pitched roof, HVAC) is a
  synchronized, read-mostly visualization.
- **Units.** The internal model is centimeters; the UI shows cm and m.
  Diameters (connection Ø / drill Ø) are millimeters, as printed on the plan
  (e.g. `Ø270`).
- **Rooms** are auto-detected from closed wall loops; name them in the
  properties panel. Areas are net (walls subtracted).
- **Stories** are real model levels. The `+` button duplicates the active floor
  outline into a new upper floor; choose a floor to edit it and use its eye
  button to independently show/hide it in 3D.
- **Heat-pump / AC sizing** uses the drawn envelope instead of an area
  rule-of-thumb: exterior wall area, per-window geometry/glazing, roof/floor
  exposure, air leakage, design temperatures, occupants, and solar gain.
- **HVAC layer** is toggleable and visible in both views. Every ceiling
  penetration shows its core-drill diameter; drill Ø defaults to
  connection Ø + 20 mm and can be overridden.
- **Connection-aware editing.** Wall joints stay together while a joined wall
  or corner is moved. Duct endpoints bind to named equipment/vent ports and
  keep following those ports after moving or rotating the connected element.

## Tools & shortcuts

| Key | Tool |
|-----|------|
| Esc | Select (also: cancel drawing / clear selection) |
| W | Wall — click to chain segments; landing on an existing endpoint/centerline joins and finishes automatically, Shift = fine straight placement, Alt = fully free, Enter/double-click = finish |
| D | Door (click on a wall) |
| N | Window (click on a wall) |
| M | Measure (click two points; the finished measurement remains as a temporary snap guide when you switch to Wall) |
| U | Ducted AC indoor unit (attic) |
| S | Supply diffuser + ceiling penetration |
| R | Return grille + penetration |
| T | Duct — Smart 90° routing is the default; click anywhere on a unit to choose its nearest port, Shift adds one direct/free segment, or switch the route mode to Direct; Enter/double-click = finish |
| J | Jumper duct — click room-side hole, then hallway-side hole |
| — | HRV unit, extract valve, fresh-air valve, facade penetration (toolbar buttons) |
| V | Toggle 2D / 3D |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo (every mutating action) |
| Delete | Remove selection |
| Arrow / Shift+Arrow / Alt+Arrow | Nudge the selected wall or HVAC item by 1 / 10 / 0.1 cm while preserving connections |

Mouse (2D): wheel = zoom, right/middle/Space drag = pan, wall/equipment drag =
1 cm movement, Shift+drag = fine movement, Alt+wall-handle drag = fully free.
Joined wall handles reshape the full corner without opening a gap. The plan
health cards and endpoint markers call out open wall or duct ends. Selected
ducts expose their elbow points, while bound ends continue following moved or
rotated equipment. Mouse (3D):
left-drag orbit, right-drag pan, wheel zoom, preset cameras Top / Isometric /
Front, plus positive buttons for the pitched roof and floor slabs. Story eye
buttons isolate individual levels without deleting them.

Toolbar toggles at the bottom: HVAC layer, keep-out zones, penetration schedule.

## Engineering helpers

- **Penetration schedule** (table icon in the toolbar): every slab and facade
  penetration with ID, room, purpose, connection Ø, drill Ø and X/Y offsets
  from the two nearest walls of its room. Export as CSV.
- **Airflow balance** tab: supply vs return/extract per room, warning at >15 %
  imbalance.
- **Keep-out zones**: red hatched band (default 60 cm, configurable in project
  settings) along load-bearing walls; walls have a "load-bearing" checkbox.
- **Proximity warning**: red marker when two penetrations are closer than 3× the
  larger drill diameter.

## Project settings

Grid size (default 5 cm), wall height (280 cm), slab thickness (20 cm), attic
height (250 cm), default exterior/interior wall thickness (25/14 cm), keep-out
width and UI language (Bosnian default, English available) — all in the right
panel.

## Heat-pump / AC sizing

Open **Size heat pump** in the top bar. The simple path is:

1. Choose Basic, Standard, or High-performance insulation.
2. Choose the default window glazing.
3. Read the heating design load, cooling design load, standard equipment step,
   and room-by-room breakdown.

Window selections can be overridden individually from a selected window's
properties. Design indoor/outdoor temperatures, plan north (for directional
solar gain), occupancy, U-values, and air changes per hour are available in
collapsed fine-tuning sections.

The calculator is a transparent early-design estimate, not a permit/stamped
load calculation. Confirm local design weather, humidity/latent load,
ventilation and duct assumptions, equipment derating, and final selection with
a qualified HVAC designer.

## Tech

Vite + React + TypeScript, Zustand for state (with snapshot-based undo/redo),
SVG for the 2D editor (crisp at any zoom), three.js via @react-three/fiber +
drei for the 3D view. UI strings live in `src/i18n.ts` (en + bs).
