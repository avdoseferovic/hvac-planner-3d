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

  // status bar
  "status.walls": "walls",
  "status.rooms": "rooms",
  "hint.wall":
    "Click to place wall points · Shift = free angle · Enter/double-click = finish · Esc = cancel",
  "hint.select": "Click to select · drag to move · Delete = remove",

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

  "status.walls": "zidova",
  "status.rooms": "prostorija",
  "hint.wall":
    "Klik za tačke zida · Shift = slobodan ugao · Enter/dupli klik = završi · Esc = odustani",
  "hint.select": "Klik za odabir · povuci za pomjeranje · Delete = obriši",

  "unit.cm": "cm",
  "unit.m": "m",
  "unit.m2": "m²",
  "unit.m3h": "m³/h",
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, bs };

export function translate(lang: Lang, key: TranslationKey): string {
  return dictionaries[lang][key] ?? en[key] ?? key;
}
