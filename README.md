# HVAC Planner 3D

A SketchUp-style web tool for planning ducted AC and heat-recovery ventilation
(HRV/rekuperator) in a residential attic. Draw the floor plan in 2D, inspect the
same model in 3D, plan the HVAC layer, and export a penetration schedule for the
core-drilling crew.

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
  **3D view** (walls, slab, semi-transparent attic, HVAC) is a synchronized,
  read-mostly visualization.
- **Units.** The internal model is centimeters; the UI shows cm and m.
  Diameters (connection Ø / drill Ø) are millimeters, as printed on the plan
  (e.g. `Ø270`).
- **Rooms** are auto-detected from closed wall loops; name them in the
  properties panel. Areas are net (walls subtracted).
- **HVAC layer** is toggleable and visible in both views. Every ceiling
  penetration shows its core-drill diameter; drill Ø defaults to
  connection Ø + 20 mm and can be overridden.

## Tools & shortcuts

| Key | Tool |
|-----|------|
| Esc | Select (also: cancel drawing / clear selection) |
| W | Wall — click to chain segments, Shift = free angle, Enter/double-click = finish |
| D | Door (click on a wall) |
| N | Window (click on a wall) |
| M | Measure (click two points) |
| U | Ducted AC indoor unit (attic) |
| S | Supply diffuser + ceiling penetration |
| R | Return grille + penetration |
| T | Duct — click route points, Enter/double-click = finish; endpoints snap to units and penetrations |
| J | Jumper duct — click room-side hole, then hallway-side hole |
| — | HRV unit, extract valve, fresh-air valve, facade penetration (toolbar buttons) |
| V | Toggle 2D / 3D |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo (every mutating action) |
| Delete | Remove selection |

Mouse (2D): wheel = zoom, right/middle drag = pan, drag = move, endpoint
handles reshape walls. Mouse (3D): left-drag orbit, right-drag pan, wheel zoom,
preset cameras Top / Isometric / Front, toggles to hide the attic volume and slab.

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

## Tech

Vite + React + TypeScript, Zustand for state (with snapshot-based undo/redo),
SVG for the 2D editor (crisp at any zoom), three.js via @react-three/fiber +
drei for the 3D view. UI strings live in `src/i18n.ts` (en + bs).
