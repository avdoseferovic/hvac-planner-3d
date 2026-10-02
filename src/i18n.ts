/** All UI strings live here. Bosnian is the default language. */

export type Lang = "bs" | "en";

const en = {
  // tools
  "tool.select": "Select",
  "tool.wall": "Wall",
  "tool.door": "Door",
  "tool.window": "Window",
  "tool.measure": "Measure",
  "tool.acUnit": "AC indoor unit",
  "tool.supplyDiffuser": "Supply diffuser",
  "tool.returnGrille": "Return grille",
  "tool.duct": "Duct",
  "tool.hrvUnit": "HRV unit",
  "tool.extractValve": "Extract valve",
  "tool.freshAirValve": "Fresh-air valve",
  "tool.jumperDuct": "Jumper duct",
  "tool.facadePenetration": "Facade penetration",

  // view
  "view.2d": "2D plan",
  "view.3d": "3D view",
  "view.toggle": "Toggle 2D/3D",
  "view.top": "Top",
  "view.iso": "Isometric",
  "view.front": "Front",
  "view.hideRoof": "Hide roof/attic",
  "view.hideSlab": "Hide slab",
  "view.hvacLayer": "HVAC layer",
  "view.keepOut": "Keep-out zones",

  // actions
  "action.undo": "Undo",
  "action.redo": "Redo",
  "action.save": "Save",
  "action.load": "Load",
  "action.delete": "Delete",
  "action.exportCsv": "Export CSV",
  "action.newProject": "New project",

  // properties panel
  "props.title": "Properties",
  "props.noSelection": "Nothing selected",
  "props.project": "Project settings",
  "props.wall": "Wall",
  "props.thickness": "Thickness (cm)",
  "props.loadBearing": "Load-bearing",
  "props.length": "Length (cm)",
  "props.wallHeight": "Wall height (cm)",
  "props.slabThickness": "Slab thickness (cm)",
  "props.atticHeight": "Attic height (cm)",
  "props.gridSize": "Grid (cm)",
  "props.keepOutWidth": "Keep-out width (cm)",
  "props.exteriorThickness": "Exterior wall (cm)",
  "props.interiorThickness": "Interior wall (cm)",
  "props.language": "Language",

  // hvac
  "hvac.label": "Label",
  "hvac.depth": "Depth (cm)",
  "hvac.rotation": "Rotation (°)",
  "hvac.airflow": "Airflow (m³/h)",
  "hvac.nominalFlow": "Nominal flow (m³/h)",
  "hvac.connDiameter": "Connection Ø (mm)",
  "hvac.drillDiameter": "Core drill Ø (mm)",
  "hvac.insulated": "Insulated",
  "hvac.heightAboveFloor": "Height above floor (cm)",
  "hint.hvacPlace": "Click to place · Esc = cancel",
  "hint.duct": "Click points along the route · Enter/double-click = finish · Esc = cancel",
  "hint.jumper": "Click room-side hole, then hallway-side hole",
  "hint.facade": "Click on an exterior wall",

  // openings & rooms
  "props.door": "Door",
  "props.window": "Window",
  "props.width": "Width (cm)",
  "props.height": "Height (cm)",
  "props.sill": "Sill height (cm)",
  "props.room": "Room",
  "props.roomName": "Name",
  "props.area": "Area",

  // status bar
  "status.walls": "walls",
  "status.rooms": "rooms",
  "hint.wall":
    "Click to place wall points · Shift = free angle · Enter/double-click = finish · Esc = cancel",
  "hint.select": "Click to select · drag to move · Delete = remove",
  "hint.opening": "Hover a wall, click to place · Esc = cancel",
  "hint.measure": "Click two points to measure · Esc = cancel",

  // units
  "unit.cm": "cm",
  "unit.m": "m",
  "unit.m2": "m²",
  "unit.m3h": "m³/h",
};

export type TranslationKey = keyof typeof en;

const bs: Record<TranslationKey, string> = {
  "tool.select": "Odaberi",
  "tool.wall": "Zid",
  "tool.door": "Vrata",
  "tool.window": "Prozor",
  "tool.measure": "Mjerenje",
  "tool.acUnit": "Unutrašnja AC jedinica",
  "tool.supplyDiffuser": "Dovodni difuzor",
  "tool.returnGrille": "Povratna rešetka",
  "tool.duct": "Kanal",
  "tool.hrvUnit": "Rekuperator",
  "tool.extractValve": "Odsisni ventil",
  "tool.freshAirValve": "Ventil svježeg zraka",
  "tool.jumperDuct": "Prelazni kanal",
  "tool.facadePenetration": "Fasadni prodor",

  "view.2d": "2D osnova",
  "view.3d": "3D prikaz",
  "view.toggle": "Prebaci 2D/3D",
  "view.top": "Odozgo",
  "view.iso": "Izometrija",
  "view.front": "Sprijeda",
  "view.hideRoof": "Sakrij krov/tavan",
  "view.hideSlab": "Sakrij ploču",
  "view.hvacLayer": "HVAC sloj",
  "view.keepOut": "Zabranjene zone",

  "action.undo": "Poništi",
  "action.redo": "Ponovi",
  "action.save": "Sačuvaj",
  "action.load": "Učitaj",
  "action.delete": "Obriši",
  "action.exportCsv": "Izvezi CSV",
  "action.newProject": "Novi projekat",

  "props.title": "Svojstva",
  "props.noSelection": "Ništa nije odabrano",
  "props.project": "Postavke projekta",
  "props.wall": "Zid",
  "props.thickness": "Debljina (cm)",
  "props.loadBearing": "Nosivi zid",
  "props.length": "Dužina (cm)",
  "props.wallHeight": "Visina zida (cm)",
  "props.slabThickness": "Debljina ploče (cm)",
  "props.atticHeight": "Visina tavana (cm)",
  "props.gridSize": "Mreža (cm)",
  "props.keepOutWidth": "Širina zabranjene zone (cm)",
  "props.exteriorThickness": "Vanjski zid (cm)",
  "props.interiorThickness": "Unutrašnji zid (cm)",
  "props.language": "Jezik",

  "hvac.label": "Oznaka",
  "hvac.depth": "Dubina (cm)",
  "hvac.rotation": "Rotacija (°)",
  "hvac.airflow": "Protok (m³/h)",
  "hvac.nominalFlow": "Nazivni protok (m³/h)",
  "hvac.connDiameter": "Priključak Ø (mm)",
  "hvac.drillDiameter": "Bušenje Ø (mm)",
  "hvac.insulated": "Izolovan",
  "hvac.heightAboveFloor": "Visina od poda (cm)",
  "hint.hvacPlace": "Klik za postavljanje · Esc = odustani",
  "hint.duct": "Klikći tačke duž trase · Enter/dupli klik = završi · Esc = odustani",
  "hint.jumper": "Klikni rupu u sobi, zatim rupu u hodniku",
  "hint.facade": "Klikni na vanjski zid",

  "props.door": "Vrata",
  "props.window": "Prozor",
  "props.width": "Širina (cm)",
  "props.height": "Visina (cm)",
  "props.sill": "Visina parapeta (cm)",
  "props.room": "Prostorija",
  "props.roomName": "Naziv",
  "props.area": "Površina",

  "status.walls": "zidova",
  "status.rooms": "prostorija",
  "hint.wall":
    "Klik za tačke zida · Shift = slobodan ugao · Enter/dupli klik = završi · Esc = odustani",
  "hint.select": "Klik za odabir · povuci za pomjeranje · Delete = obriši",
  "hint.opening":
    "Pređi mišem preko zida, klik za postavljanje · Esc = odustani",
  "hint.measure": "Klikni dvije tačke za mjerenje · Esc = odustani",

  "unit.cm": "cm",
  "unit.m": "m",
  "unit.m2": "m²",
  "unit.m3h": "m³/h",
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, bs };

export function translate(lang: Lang, key: TranslationKey): string {
  return dictionaries[lang][key] ?? en[key] ?? key;
}
