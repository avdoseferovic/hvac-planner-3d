/** All UI strings live here. Bosnian is the default language. */

export type Lang = "bs" | "en";

const en = {
  // tools
  "tool.select": "Select",
  "tool.wall": "Wall",
  "tool.cutWall": "Cut wall",
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
  "view.zoomIn": "Zoom in",
  "view.zoomOut": "Zoom out",
  "view.zoomFit": "Fit plan",
  "view.zoomReset": "Reset zoom to 100%",
  "view.rotateLeft": "Rotate left 90° (Shift = 15°)",
  "view.rotateRight": "Rotate right 90° (Shift = 15°)",
  "view.rotateReset": "Reset rotation",

  // toolbar groups
  "toolbar.draw": "Draw",
  "toolbar.hvac": "HVAC",
  "toolbar.view": "View",

  // actions
  "action.undo": "Undo",
  "action.redo": "Redo",
  "action.save": "Save",
  "action.load": "Load",
  "action.delete": "Delete",
  "action.exportCsv": "Export CSV",
  "action.newProject": "New project",
  "action.group": "Group",
  "action.ungroup": "Ungroup",

  // properties panel
  "props.title": "Properties",
  "props.noSelection": "Nothing selected",
  "props.multiSelected": "Multiple selection",
  "props.objects": "objects",
  "hint.groupShortcut": "Ctrl+G = group · Ctrl+Shift+G = ungroup",
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
  "hint.duct":
    "Click points along the route · Enter/double-click = finish · Esc = cancel",
  "hint.jumper": "Click room-side hole, then hallway-side hole",
  "hint.facade": "Click on an exterior wall",

  // schedule
  "schedule.title": "Penetrations",
  "schedule.airflow": "Airflow balance",
  "schedule.id": "ID",
  "schedule.room": "Room",
  "schedule.purpose": "Purpose",
  "schedule.surface": "Surface",
  "schedule.slab": "Slab",
  "schedule.wall": "Wall",
  "schedule.x": "X from wall (cm)",
  "schedule.y": "Y from wall (cm)",
  "schedule.supply": "Supply",
  "schedule.extract": "Return/extract",
  "schedule.imbalance": "Imbalance",

  // openings & rooms
  "props.door": "Door",
  "props.window": "Window",
  "props.width": "Width (cm)",
  "props.height": "Height (cm)",
  "props.sill": "Sill height (cm)",
  "props.hinge": "Hinge side",
  "props.hingeLeft": "Left",
  "props.hingeRight": "Right",
  "props.swing": "Opens",
  "props.swingIn": "Inward",
  "props.swingOut": "Outward",
  "props.room": "Room",
  "props.roomName": "Name",
  "props.area": "Area",

  // status bar
  "status.walls": "walls",
  "status.rooms": "rooms",
  "hint.wall":
    "Click to place wall points · measured endpoints snap to wall starts · Shift = straight, no grid · Alt = free angle · Enter/double-click = finish · Esc = cancel",
  "hint.select":
    "Click to select · Shift+click = multi-select · drag to move · Delete = remove",
  "hint.opening": "Hover a wall, click to place · Esc = cancel",
  "hint.measure":
    "Click two points to measure · Snaps to wall edges · Alt = free · Esc = cancel",
  "hint.pan": "Space+drag = pan · Scroll = zoom · F = fit",
  "hint.cut":
    "Click the start and end of the wall span to remove · Esc = cancel",
  "hint.panShort": "pan",

  // empty state
  "empty.title": "Start your plan",
  "empty.body":
    "Press W or pick the Wall tool to draw walls. Hold Space and drag to move around, scroll to zoom.",

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
  "tool.cutWall": "Isijeci zid",
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
  "view.zoomIn": "Uvećaj",
  "view.zoomOut": "Umanji",
  "view.zoomFit": "Prikaži cijeli plan",
  "view.zoomReset": "Vrati na 100%",
  "view.rotateLeft": "Rotiraj lijevo 90° (Shift = 15°)",
  "view.rotateRight": "Rotiraj desno 90° (Shift = 15°)",
  "view.rotateReset": "Poništi rotaciju",

  "toolbar.draw": "Crtanje",
  "toolbar.hvac": "HVAC",
  "toolbar.view": "Prikaz",

  "action.undo": "Poništi",
  "action.redo": "Ponovi",
  "action.save": "Sačuvaj",
  "action.load": "Učitaj",
  "action.delete": "Obriši",
  "action.exportCsv": "Izvezi CSV",
  "action.newProject": "Novi projekat",
  "action.group": "Grupiši",
  "action.ungroup": "Razgrupiši",

  "props.title": "Svojstva",
  "props.noSelection": "Ništa nije odabrano",
  "props.multiSelected": "Višestruki odabir",
  "props.objects": "objekata",
  "hint.groupShortcut": "Ctrl+G = grupiši · Ctrl+Shift+G = razgrupiši",
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
  "hint.duct":
    "Klikći tačke duž trase · Enter/dupli klik = završi · Esc = odustani",
  "hint.jumper": "Klikni rupu u sobi, zatim rupu u hodniku",
  "hint.facade": "Klikni na vanjski zid",

  "schedule.title": "Prodori",
  "schedule.airflow": "Bilans zraka",
  "schedule.id": "ID",
  "schedule.room": "Prostorija",
  "schedule.purpose": "Namjena",
  "schedule.surface": "Površina",
  "schedule.slab": "Ploča",
  "schedule.wall": "Zid",
  "schedule.x": "X od zida (cm)",
  "schedule.y": "Y od zida (cm)",
  "schedule.supply": "Dovod",
  "schedule.extract": "Povrat/odsis",
  "schedule.imbalance": "Disbalans",

  "props.door": "Vrata",
  "props.window": "Prozor",
  "props.width": "Širina (cm)",
  "props.height": "Visina (cm)",
  "props.sill": "Visina parapeta (cm)",
  "props.hinge": "Strana šarki",
  "props.hingeLeft": "Lijevo",
  "props.hingeRight": "Desno",
  "props.swing": "Otvaranje",
  "props.swingIn": "Unutra",
  "props.swingOut": "Vani",
  "props.room": "Prostorija",
  "props.roomName": "Naziv",
  "props.area": "Površina",

  "status.walls": "zidova",
  "status.rooms": "prostorija",
  "hint.wall":
    "Klik za tačke zida · krajnje tačke mjerenja se hvataju pri početku zida · Shift = pravo, bez mreže · Alt = slobodan ugao · Enter/dupli klik = završi · Esc = odustani",
  "hint.select":
    "Klik za odabir · Shift+klik = više objekata · povuci za pomjeranje · Delete = obriši",
  "hint.opening":
    "Pređi mišem preko zida, klik za postavljanje · Esc = odustani",
  "hint.measure":
    "Klikni dvije tačke za mjerenje · Hvata ivice zida · Alt = slobodno · Esc = odustani",
  "hint.pan": "Space+povlačenje = pomjeranje · Skrol = zum · F = cijeli plan",
  "hint.cut": "Klikni početak i kraj dijela zida koji brišeš · Esc = odustani",
  "hint.panShort": "pomjeranje",

  "empty.title": "Počni svoj plan",
  "empty.body":
    "Pritisni W ili odaberi alat Zid za crtanje zidova. Drži Space i povlači za pomjeranje, skrolaj za zum.",

  "unit.cm": "cm",
  "unit.m": "m",
  "unit.m2": "m²",
  "unit.m3h": "m³/h",
};

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, bs };

export function translate(lang: Lang, key: TranslationKey): string {
  return dictionaries[lang][key] ?? en[key] ?? key;
}
