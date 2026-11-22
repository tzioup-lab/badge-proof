import * as pdfjs from "./vendor/pdf.mjs";
import {PRESETS} from "./presets.js";
import {inspectPDFPage, qualityAtSize} from "./quality.js";
import {openLibrary, importURL, base64Bytes} from "./library-store.js";
import {makeBackup, readBackup} from "./backup.js";
import {startShell} from "./app-shell.js";
import {startGuidance} from "./guidance.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;
const {
  PDFDocument, PDFName, rgb, pushGraphicsState, popGraphicsState, moveTo,
  appendBezierCurve, closePath, clip, endPath,
} = PDFLib;
const MM = 72 / 25.4;
const $ = selector => document.querySelector(selector);
const assets = [];
let library;
let storageFailed = false;
let printing = false;
let shell;
let stagedBackup;
let guidance;
const translations = {
  title: ["Composer une planche", "Compose a print sheet"],
  language: ["Langue", "Language"],
  library: ["Bibliothèque", "Library"],
  librarySaved: ["Vos visuels sont enregistrés sur cet ordinateur.", "Your designs are saved on this computer."],
  browserLibrary: ["Enregistrés dans ce navigateur, sur cet appareil. Aucun visuel n’est envoyé au site.", "Saved in this browser on this device. Artwork is not uploaded to the site."],
  help: ["Aide", "Help"],
  helpTitle: ["Aide et questions fréquentes", "Help and FAQs"],
  appStatusTitle: ["Application et mises à jour", "App and updates"],
  installApp: ["Installer l’application", "Install app"],
  storageUnavailable: ["Le stockage du navigateur est indisponible. Utilisez une fenêtre normale avec le stockage des sites autorisé.", "Browser storage is unavailable. Use a normal window with site storage allowed."],
  storageFull: ["Le navigateur n’a plus assez de place. Sauvegardez la bibliothèque puis libérez de l’espace sur l’appareil.", "The browser has insufficient storage. Back up the library, then free some space on the device."],
  fileTooLarge: ["Choisissez un fichier de 64 Mo maximum.", "Choose a file up to 64 MB."],
  invalidBackup: ["Sauvegarde invalide ou endommagée. La bibliothèque n’a pas été modifiée.", "Invalid or damaged backup. The library was not changed."],
  backupTooLarge: ["La sauvegarde dépasse les limites du format (4 Go ou 10 000 visuels). Aucun fichier incomplet n’a été téléchargé. Conservez les données de ce navigateur.", "The backup exceeds the format limits (4 GB or 10,000 designs). No incomplete file was downloaded. Keep this browser’s data."],
  urlUnsupported: ["Utilisez un lien HTTP ou HTTPS direct vers une image ou un PDF.", "Use a direct HTTP or HTTPS image or PDF link."],
  urlBlocked: ["Ce site bloque la lecture depuis le navigateur, ou le fichier est inaccessible. Ouvrez le lien, téléchargez le fichier, puis ajoutez-le ici.", "This site blocks browser access, or the file is unavailable. Open the link, download the file, then add it here."],
  backupTitle: ["Votre bibliothèque reste sur cet appareil", "Your library stays on this device"],
  backupHelp: ["Le navigateur peut effacer les données d’un site, notamment si vous les supprimez dans ses réglages. Enregistrez une sauvegarde pour conserver vos originaux, cadrages et planches ou les transférer sur un autre appareil.", "The browser can clear site data, including when you clear it in settings. Save a backup to keep your originals, framing and sheets, or move them to another device."],
  exportBackup: ["Sauvegarder la bibliothèque", "Back up library"],
  importBackup: ["Importer une sauvegarde", "Import backup"],
  backingUp: ["Préparation de la sauvegarde…", "Preparing backup…"],
  backupSaved: ["Sauvegarde téléchargée. Gardez ce fichier en lieu sûr.", "Backup downloaded. Keep this file somewhere safe."],
  readingBackup: ["Vérification de la sauvegarde…", "Checking backup…"],
  backupReview: ["Importer cette sauvegarde ?", "Import this backup?"],
  backupReviewHelp: ["{count} visuel(s). Les visuels portant le même identifiant seront mis à jour ; les autres seront conservés. Les planches, quantités et la langue de la sauvegarde remplaceront les réglages actuels.", "{count} design(s). Matching designs will be updated; other designs are kept. The backup’s sheets, quantities and language will replace the current settings."],
  restoreBackup: ["Importer", "Import"],
  restored: ["Sauvegarde importée.", "Backup imported."],
  protectStorage: ["Demander la conservation des données", "Request persistent storage"],
  storageProtected: ["Le navigateur a accordé la conservation des données. Gardez aussi une sauvegarde.", "The browser granted persistent storage. Keep a backup too."],
  storageNotProtected: ["La conservation n’a pas été accordée. Sauvegardez régulièrement la bibliothèque.", "Persistent storage was not granted. Back up the library regularly."],
  migrationHelp: ["Pour passer de l’ancienne application locale au site : téléchargez sa sauvegarde ici, puis importez ce fichier sur le site. Vos fichiers locaux restent conservés.", "To move from the old local app to the website: download its backup here, then import that file on the website. Your local files are kept."],
  checkUpdates: ["Vérifier les mises à jour", "Check for updates"],
  updateReady: ["Une nouvelle version est prête. Vos visuels et planches seront conservés.", "A new version is ready. Your designs and sheets will be kept."],
  applyUpdate: ["Recharger avec la nouvelle version", "Reload with the new version"],
  later: ["Plus tard", "Later"],
  offlineReady: ["Prête pour une utilisation hors ligne.", "Ready for offline use."],
  checkingUpdates: ["Recherche d’une mise à jour…", "Checking for updates…"],
  upToDate: ["Version à jour.", "Up to date."],
  offlineUpdate: ["Mise à jour indisponible. La version installée reste utilisable.", "Update unavailable. The installed version remains usable."],
  finishWork: ["Terminez l’opération en cours et fermez les fenêtres de réglages avant de mettre à jour.", "Finish the current operation and close settings dialogs before updating."],
  localUpdates: ["Cette copie utilise le lanceur local. Les mises à jour automatiques concernent la version du site.", "This copy uses the local launcher. Automatic updates are available in the website version."],
  choose: ["Ajouter des visuels", "Add designs"],
  dropHint: ["ou déposer des fichiers ici", "or drop files here"],
  libraryHelp: ["Glissez un visuel vers un cercle, ou sélectionnez un cercle puis cliquez sur un visuel.", "Drag a design onto a circle, or select a circle and click a design."],
  emptyLibrary: ["Ajoutez vos premiers visuels. Vous les retrouverez ici lors de votre prochaine visite.", "Add your first designs. They will be here when you return."],
  search: ["Rechercher un visuel", "Search designs"],
  badgeSize: ["Taille du badge", "Badge size"],
  savePdf: ["Enregistrer le PDF", "Save PDF"],
  print: ["Imprimer", "Print"],
  showZones: ["Afficher les zones", "Show guides"],
  clear: ["Vider cette planche", "Clear this sheet"],
  selectHint: ["Choisissez un visuel dans la bibliothèque pour ce cercle.", "Choose a design from the library for this circle."],
  selectedFile: ["Visuel", "Design"],
  zoom: ["Taille", "Size"],
  horizontal: ["Horizontal", "Horizontal"],
  vertical: ["Vertical", "Vertical"],
  center: ["Recentrer", "Reset placement"],
  fitSafe: ["Tout dans la zone sûre", "Fit inside safe circle"],
  repeat: ["Remplir les cercles vides", "Fill empty circles"],
  removeSlot: ["Retirer de la planche", "Remove from sheet"],
  printSettings: ["Avant d’imprimer", "Before printing"],
  printHelp: ["A4 portrait (pas Letter) · Marges : Aucune · Échelle personnalisée : 100 %. Désactivez les en-têtes/pieds de page. Vérifiez la barre de 50 mm.", "A4 portrait (not Letter) · Margins: None · Custom scale: 100%. Disable headers/footers. Check the 50 mm scale bar."],
  printSetupTitle: ["Imprimer à la taille exacte", "Print at the correct size"],
  printSetupIntro: ["Dans « Plus de paramètres », vérifiez ces valeurs dans la fenêtre suivante.", "Under ‘More settings’, check these values in the next dialog."],
  printPaper: ["Papier", "Paper"],
  printPaperValue: ["A4 · 210 × 297 mm · Portrait (pas Letter)", "A4 · 210 × 297 mm · Portrait (not Letter)"],
  printMargins: ["Marges", "Margins"],
  printMarginsValue: ["Aucune / None", "None"],
  printScale: ["Échelle", "Scale"],
  printScaleValue: ["Personnalisée : 100 % (pas « Par défaut »)", "Custom: 100% (rather than ‘Default’)"],
  printPerSheet: ["Pages par feuille", "Pages per sheet"],
  printHeaders: ["En-têtes / pieds de page", "Headers / footers"],
  printOff: ["Désactivés", "Off"],
  printExpected: ["Aperçu attendu : {count} × A4.", "Expected preview: {count} × A4."],
  printCheckBar: ["La barre de 50 mm doit rester sur la même page que les badges et mesurer 50 mm après impression. Si elle passe sur une autre page, vérifiez d’abord le format A4.", "The 50 mm bar should stay on the same page as the badges and measure 50 mm when printed. If it moves to another page, check the A4 paper setting first."],
  cancelPrint: ["Annuler", "Cancel"],
  continuePrint: ["Ouvrir la fenêtre d’impression", "Open print dialog"],
  saveFraming: ["Enregistrer le cadrage", "Save framing"],
  savingFraming: ["Enregistrement du cadrage…", "Saving framing…"],
  framingHelp: ["Ce cadrage modifie cet exemplaire. Enregistrez-le pour le réutiliser depuis la bibliothèque au format {size} mm.", "This crop changes this copy. Save it to reuse it from the library at {size} mm."],
  framingSaved: ["Cadrage enregistré pour {size} mm. Les nouveaux exemplaires et les lots l’utiliseront.", "Framing saved for {size} mm. New copies and batches will use it."],
  savedFraming: ["Cadrage enregistré", "Saved framing"],
  cutGuides: ["Repères de découpe", "Cut guides"],
  proof: ["Télécharger une épreuve avec les zones", "Download proof with guides"],
  slot: ["Emplacement", "Slot"],
  empty: ["Vide", "Empty"],
  loading: ["Ouverture de la bibliothèque…", "Opening library…"],
  adding: ["Enregistrement des visuels…", "Saving designs…"],
  preparing: ["Préparation du PDF…", "Preparing PDF…"],
  preparingPrint: ["Préparation de l’impression…", "Preparing print…"],
  readyPrint: ["Impression : A4 portrait · Marges : Aucune · Échelle personnalisée : 100 %.", "Print settings: A4 portrait · Margins: None · Custom scale: 100%."],
  saved: ["PDF enregistré.", "PDF saved."],
  added: ["visuel(s) enregistré(s) dans la bibliothèque.", "design(s) saved to the library."],
  removed: ["Visuel supprimé de la bibliothèque et des planches.", "Design removed from the library and sheets."],
  deleteLabel: ["Supprimer de la bibliothèque", "Delete from library"],
  deleteQuestion: ["Supprimer ce visuel et ses emplacements ?", "Delete this design and its placements?"],
  cancel: ["Annuler", "Cancel"],
  delete: ["Supprimer", "Delete"],
  unsupported: ["Choisissez un fichier PNG, JPEG, WebP ou PDF.", "Choose a PNG, JPEG, WebP or PDF file."],
  low: ["Résolution inférieure à 300 ppp à cette taille.", "Resolution below 300 PPI at this size."],
  pdfSource: ["PDF original conservé dans le fichier exporté.", "Original PDF preserved in exported file."],
  failure: ["L’opération a échoué.", "The operation failed."],
  offlineLibrary: ["La bibliothèque est indisponible. Relancez le composeur avec son lanceur.", "Library unavailable. Restart the composer using its launcher."],
  noMatches: ["Aucun visuel correspondant.", "No matching designs."],
  layoutError: ["Le navigateur n’a pas pu mémoriser la disposition de la planche.", "The browser could not remember the sheet layout."],
  fromUrl: ["Ajouter depuis un lien", "Add from a URL"],
  urlLabel: ["Lien direct vers une image ou un PDF", "Direct image or PDF URL"],
  importUrl: ["Importer", "Import"],
  urlHelp: ["Utilisez un lien direct vers une image ou un PDF. Si le site bloque la lecture, téléchargez le fichier puis ajoutez-le ici.", "Use a direct image or PDF link. If the site blocks access, download the file and add it here."],
  urlFailed: ["Impossible de lire ce lien. Utilisez une image ou un PDF accessible directement.", "Could not read this link. Use a directly accessible image or PDF URL."],
  filterSize: ["Filtrer par taille", "Filter by size"],
  allDesigns: ["Tous les visuels", "All designs"],
  currentSize: ["Résolution suffisante pour ce format", "Enough resolution for this size"],
  designedFor: ["Conçu pour", "Designed for"],
  copies: ["Exemplaires", "Copies"],
  buildBatch: ["Composer ces quantités", "Compose these quantities"],
  batchHelp: ["Remplace la planche de ce format. Des pages sont ajoutées si nécessaire.", "Replaces this size’s sheet. Extra pages are added as needed."],
  addPage: ["Ajouter une page", "Add page"],
  cropEditor: ["Cadrer et vérifier", "Crop and check"],
  close: ["Fermer", "Close"],
  dragCrop: ["Glissez l’image pour déplacer le cadrage. Vérifiez le texte dans le cercle intérieur.", "Drag the image to adjust the crop. Check the lettering inside the inner circle."],
  qualityFit: ["Réduire pour atteindre 300 ppp", "Reduce size to reach 300 PPI"],
  applyCopies: ["Appliquer aux exemplaires de ce visuel", "Apply to copies of this design"],
  visualCheck: ["Contrôlez aussi le texte, le contraste et les détails importants dans la zone sûre.", "Also check lettering, contrast and essential details inside the safe circle."],
  vectorQuality: ["Éléments vectoriels : pas de limite de résolution raster détectée.", "Vector content: no raster-resolution limit detected."],
  unknownQuality: ["La résolution de certains éléments PDF reste à vérifier.", "Resolution of some PDF elements still needs checking."],
  goodQuality: ["Résolution adaptée à cette taille.", "Resolution suitable at this size."],
  lowQuality: ["Risque de pixels visibles. Réduisez le visuel ou utilisez une source plus grande.", "Visible pixels are likely. Reduce the design size or use a larger source."],
  softQuality: ["Sous la cible de 300 ppp. Une source plus grande ou un cadrage moins agrandi améliorera l’impression.", "Below the 300 PPI target. A larger source or less magnification will improve print quality."],
  noBleed: ["Le fond ne couvre pas tout le cercle de découpe. Des bords blancs peuvent apparaître.", "The background does not cover the whole cut circle. White edges may appear."],
  sizeMismatch: ["Ce visuel est étiqueté pour une autre taille. Vérifiez le cadrage et les détails.", "This design is tagged for another size. Check its crop and details."],
  page: ["Page", "Page"],
};

function readPreference(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

let language = "fr";
try {language = localStorage.getItem("badge-composer-language") === "en" ? "en" : "fr";} catch {}
let presetId = readPreference("badge-composer-size", "58");
if (!PRESETS[presetId]) presetId = "58";
let layouts = readPreference("badge-composer-layouts", {});
if (!layouts || typeof layouts !== "object" || Array.isArray(layouts)) layouts = {};
let selected = 0;
let pendingRemoval = null;
let busy = false;
let pageIndex = 0;
let quantities = readPreference("badge-composer-quantities", {});
if (!quantities || typeof quantities !== "object" || Array.isArray(quantities)) quantities = {};
const t = key => translations[key][language === "fr" ? 0 : 1];
const preset = () => PRESETS[presetId];
const assetFor = placement => assets.find(asset => asset.id === placement?.assetId);
const originalState = id => ({assetId: id, zoom: 1, x: 0, y: 0});
const stateFor = id => ({...originalState(id), ...assets.find(asset => asset.id === id)?.framings?.[presetId]});

function slots() {
  if (!Array.isArray(layouts[presetId])) layouts[presetId] = [];
  const current = layouts[presetId];
  const capacity = preset().centers.length;
  current.length = Math.max(capacity, Math.ceil(current.length / capacity) * capacity);
  for (let index = 0; index < current.length; index++) {
    if (!current[index]) current[index] = null;
  }
  return current;
}

function status(message, error = false) {
  $("#status").textContent = message;
  $("#status").classList.toggle("error", error);
}

function saveLayout() {
  $("#print-output").replaceChildren();
  try {
    localStorage.setItem("badge-composer-size", JSON.stringify(presetId));
    localStorage.setItem("badge-composer-layouts", JSON.stringify(layouts));
    localStorage.setItem("badge-composer-quantities", JSON.stringify(quantities));
  } catch {
    status(t("layoutError"), true);
  }
}

function quantityFor(id) {
  return quantities[presetId]?.[id] || 0;
}

function pageCount() {
  return slots().length / preset().centers.length;
}

function placementQuality(asset, placement, format = preset()) {
  const size = dimensions(asset, placement, format);
  return qualityAtSize(asset, size.width, size.height);
}

function qualityDescription(asset, placement) {
  const quality = placementQuality(asset, placement);
  const notes = [];
  let label = quality.vector ? t("vectorQuality") : t("unknownQuality");
  if (quality.ppi !== null) {
    label = Math.floor(quality.ppi) + (language === "fr" ? " ppp effectifs." : " effective PPI.");
    notes.push(t(quality.ppi >= 300 ? "goodQuality" : quality.ppi < 150 ? "lowQuality" : "softQuality"));
    if (quality.uncertain) notes.push(t("unknownQuality"));
  }
  const size = dimensions(asset, placement);
  if (size.width / 2 - Math.abs(placement.x) < preset().cut / 2 - .01 ||
      size.height / 2 - Math.abs(placement.y) < preset().cut / 2 - .01) notes.push(t("noBleed"));
  if (asset.sizes?.length && !asset.sizes.includes(presetId)) notes.push(t("sizeMismatch"));
  return {quality, label, notes};
}

function renderBatchSummary() {
  const count = assets.reduce((total, asset) => total + quantityFor(asset.id), 0);
  const pages = Math.ceil(count / preset().centers.length);
  $("#batch-total").textContent = count + (language === "fr" ? " exemplaires · " : " copies · ") + pages + (pages === 1 ? " page" : " pages");
  $("#build-batch").disabled = !count || busy;
}

function dimensions(asset, placement, format = preset()) {
  const ratio = asset.width / asset.height;
  return {
    width: format.cut * Math.max(1, ratio) * placement.zoom,
    height: format.cut * Math.max(1, 1 / ratio) * placement.zoom,
  };
}

async function request(path, options = {}) {
  try {
    const response = await library.call(path, options);
    if (!response.ok) throw new Error(t("offlineLibrary"));
    return response;
  } catch (error) {throw new Error(error.code && translations[error.code] ? t(error.code) : error.message);}
}

async function work(message, task) {
  if (busy) return;
  busy = true;
  status(message);
  render();
  try {
    await task();
  } catch (error) {
    status(t("failure") + " " + (error.code && translations[error.code] ? t(error.code) : error.message), true);
  } finally {
    busy = false;
    render();
  }
}

function placeAsset(id, index = selected) {
  if (!assets.some(asset => asset.id === id)) return;
  slots()[index] = stateFor(id);
  selected = index;
  saveLayout();
  render();
}

function renderLibrary() {
  const filter = $("#search").value.trim().toLocaleLowerCase();
  const sizeFilter = $("#size-filter").value;
  const matches = assets.filter(asset => {
    if (!asset.name.toLocaleLowerCase().includes(filter)) return false;
    if (sizeFilter === "current") {
      const quality = placementQuality(asset, stateFor(asset.id));
      return !quality.uncertain && (quality.vector || quality.ppi !== null && quality.ppi >= 300);
    }
    return !["25", "32", "58"].includes(sizeFilter) || asset.sizes?.includes(sizeFilter);
  });
  $("#asset-count").textContent = assets.length;
  $("#assets").replaceChildren(...matches.map(asset => {
    const card = document.createElement("article");
    card.className = "asset-card";
    const button = document.createElement("button");
    button.className = "asset";
    button.type = "button";
    button.draggable = true;
    button.title = asset.name;
    button.setAttribute("aria-pressed", String(slots()[selected]?.assetId === asset.id));
    const image = document.createElement("img");
    image.src = asset.preview;
    image.alt = "";
    image.loading = "lazy";
    image.draggable = false;
    const label = document.createElement("span");
    label.textContent = asset.name.replace(/\.(pdf|png|jpe?g|webp)$/i, "");
    if (asset.framings?.[presetId]) {
      const preview = document.createElement("div");
      preview.className = "saved-framing-preview";
      const placement = stateFor(asset.id);
      const size = dimensions(asset, placement);
      image.style.width = size.width / preset().cut * 100 + "%";
      image.style.height = size.height / preset().cut * 100 + "%";
      image.style.left = 50 + placement.x / preset().cut * 100 + "%";
      image.style.top = 50 + placement.y / preset().cut * 100 + "%";
      preview.append(image);
      button.append(preview, label);
    } else button.append(image, label);
    button.onclick = () => placeAsset(asset.id);
    button.ondragstart = event => {
      event.dataTransfer.setData("application/x-badge-asset", asset.id);
      event.dataTransfer.setData("text/plain", asset.name);
      event.dataTransfer.effectAllowed = "copy";
    };
    const remove = document.createElement("button");
    remove.className = "delete-asset";
    remove.textContent = "×";
    remove.title = t("deleteLabel");
    remove.setAttribute("aria-label", t("deleteLabel") + " · " + asset.name);
    remove.onclick = () => {
      pendingRemoval = asset.id;
      renderLibrary();
    };
    const quality = placementQuality(asset, stateFor(asset.id));
    const qualityLabel = document.createElement("div");
    qualityLabel.className = "asset-quality" + (quality.ppi !== null && quality.ppi < 300 ? " warning" : "");
    qualityLabel.textContent = preset().face + " mm · " + (quality.vector ? "vector" :
      quality.ppi === null ? "PDF ?" : Math.floor(quality.ppi) + (language === "fr" ? " ppp" : " PPI"));
    const quantity = document.createElement("label");
    quantity.className = "quantity-row";
    const quantityLabel = document.createElement("span");
    quantityLabel.textContent = t("copies");
    const number = document.createElement("input");
    number.type = "number";
    number.min = "0";
    number.max = "999";
    number.step = "1";
    number.value = quantityFor(asset.id);
    number.dataset.quantity = asset.id;
    number.setAttribute("aria-label", t("copies") + " · " + asset.name);
    number.oninput = () => {
      const value = Math.max(0, Math.min(999, Math.floor(Number(number.value) || 0)));
      quantities[presetId] ??= {};
      quantities[presetId][asset.id] = value;
      saveLayout();
      renderBatchSummary();
    };
    quantity.append(quantityLabel, number);
    card.append(button, remove, qualityLabel);
    if (asset.framings?.[presetId]) {
      const saved = document.createElement("p");
      saved.className = "asset-framing";
      saved.textContent = t("savedFraming");
      card.append(saved);
    }
    card.append(quantity);
    if (pendingRemoval === asset.id) {
      const confirmation = document.createElement("div");
      confirmation.className = "delete-confirm";
      const text = document.createElement("span");
      text.textContent = t("deleteQuestion");
      const cancel = document.createElement("button");
      cancel.textContent = t("cancel");
      cancel.onclick = () => {
        pendingRemoval = null;
        renderLibrary();
      };
      const confirm = document.createElement("button");
      confirm.className = "danger";
      confirm.textContent = t("delete");
      confirm.onclick = () => removeDesign(asset.id);
      confirmation.append(text, cancel, confirm);
      card.append(confirmation);
    }
    return card;
  }));
  $("#library-empty").hidden = matches.length > 0;
  $("#library-empty").textContent = t(assets.length ? "noMatches" : "emptyLibrary");
}

function renderSheet() {
  const format = preset();
  $("#sheet").querySelectorAll(".slot").forEach(node => node.remove());
  const capacity = format.centers.length;
  const offset = pageIndex * capacity;
  slots().slice(offset, offset + capacity).forEach((placement, localIndex) => {
    const index = localIndex + offset;
    const [cx, cy] = format.centers[localIndex];
    const node = document.createElement("div");
    node.className = "slot" + (selected === index ? " selected" : "") + (placement ? "" : " empty");
    node.style.left = (cx - format.cut / 2) / 210 * 100 + "%";
    node.style.top = (cy - format.cut / 2) / 297 * 100 + "%";
    node.style.width = format.cut / 210 * 100 + "%";
    node.style.height = format.cut / 297 * 100 + "%";
    node.dataset.label = String(localIndex + 1);
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", t("slot") + " " + (index + 1));
    node.tabIndex = 0;
    node.draggable = !!placement;
    node.onclick = () => {
      selected = index;
      render();
    };
    node.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selected = index;
        render();
      }
    };
    node.ondragstart = event => {
      event.dataTransfer.setData("application/x-badge-slot", String(index));
      event.dataTransfer.effectAllowed = "move";
    };
    node.ondragover = event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes("application/x-badge-slot") ? "move" : "copy";
      node.classList.add("over");
    };
    node.ondragleave = () => node.classList.remove("over");
    node.ondrop = async event => {
      event.preventDefault();
      event.stopPropagation();
      node.classList.remove("over");
      if (busy) return;
      selected = index;
      if (event.dataTransfer.files.length) {
        await importFiles(event.dataTransfer.files, index);
        return;
      }
      const from = event.dataTransfer.getData("application/x-badge-slot");
      if (from !== "" && Number.isInteger(Number(from)) && Number(from) < slots().length && Number(from) >= 0) {
        [slots()[Number(from)], slots()[index]] = [slots()[index], slots()[Number(from)]];
        saveLayout();
        render();
      } else {
        placeAsset(event.dataTransfer.getData("application/x-badge-asset"), index);
      }
    };
    if (placement) {
      const asset = assetFor(placement);
      if (asset) {
        const size = dimensions(asset, placement);
        const image = document.createElement("img");
        image.src = asset.preview;
        image.alt = asset.name;
        image.draggable = false;
        image.style.width = size.width / format.cut * 100 + "%";
        image.style.height = size.height / format.cut * 100 + "%";
        image.style.left = 50 + placement.x / format.cut * 100 + "%";
        image.style.top = 50 + placement.y / format.cut * 100 + "%";
        image.style.transform = "translate(-50%, -50%)";
        node.append(image);
      }
    }
    if ($("#zones").checked) {
      for (const name of ["safe", "face"]) {
        const guide = document.createElement("span");
        guide.className = "guide " + name;
        guide.style.width = guide.style.height = format[name] / format.cut * 100 + "%";
        node.append(guide);
      }
    }
    $("#sheet").append(node);
  });
  const [left, right, bottom] = format.scaleBar;
  const scale = $("#sheet .scale");
  scale.style.left = left / 210 * 100 + "%";
  scale.style.top = (297 - bottom) / 297 * 100 + "%";
  scale.style.width = (right - left) / 210 * 100 + "%";
}

function render() {
  $("main").inert = busy || storageFailed;
  $("#language").disabled = busy;
  document.documentElement.lang = language;
  document.title = t("title");
  $("#language").value = language;
  $("#preset").value = presetId;
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t(node.dataset.t);
  $("#library-location").textContent = t(library?.local ? "librarySaved" : "browserLibrary");
  $("#migration-help").hidden = !library?.local;
  $("#import-backup-label").hidden = !!library?.local;
  $("#protect-storage").hidden = !!library?.local;
  $("#storage-error").hidden = !storageFailed;
  $("#storage-error").textContent = t("storageUnavailable");
  $("#export-backup").disabled = busy || !library;
  $("#import-backup").disabled = busy || !library;
  shell?.render();
  guidance?.render();
  $("#search").placeholder = t("search");
  const previousFilter = $("#size-filter").value;
  $("#size-filter").replaceChildren(new Option(t("allDesigns"), "all"), new Option(t("currentSize"), "current"),
    ...["25", "32", "58"].map(size => new Option(t("designedFor") + " " + size + " mm", size)));
  $("#size-filter").value = previousFilter || "all";
  const format = preset();
  const current = slots()[selected];
  const asset = assetFor(current);
  const occupied = slots().filter(Boolean).length;
  const lowResolution = slots().filter(item => {
    const source = assetFor(item);
    if (!source) return false;
    const quality = placementQuality(source, item);
    return quality.ppi !== null && quality.ppi < 300;
  }).length;
  $("#sheet-quality").textContent = lowResolution
    ? lowResolution + (language === "fr" ? " exemplaire(s) sous 300 ppp. Sélectionnez-les pour ajuster la taille ou choisir une meilleure source." : " copy/copies below 300 PPI. Select them to reduce size or choose a better source.")
    : t("visualCheck");
  $("#sheet-quality").classList.toggle("warning", lowResolution > 0);
  $("#sheet-quality").hidden = lowResolution === 0;
  $("#preset-detail").textContent = language === "fr"
    ? "Découpe " + format.cut + " mm · Zone sûre " + format.safe + " mm"
    : format.cut + " mm cut · " + format.safe + " mm safe circle";
  $("#sheet-count").textContent = occupied + (language === "fr" ? " exemplaires · " : " copies · ") +
    pageCount() + (pageCount() === 1 ? " page A4" : " pages A4");
  $("#page-count").textContent = t("page") + " " + (pageIndex + 1) + " / " + pageCount();
  $("#previous-page").disabled = pageIndex === 0;
  $("#next-page").disabled = pageIndex + 1 >= pageCount();
  $("#previous-page").setAttribute("aria-label", language === "fr" ? "Page précédente" : "Previous page");
  $("#next-page").setAttribute("aria-label", language === "fr" ? "Page suivante" : "Next page");
  $("#legend").textContent = language === "fr"
    ? "Zone sûre " + format.safe + " mm · Face " + format.face + " mm · Découpe " + format.cut + " mm"
    : "Safe " + format.safe + " mm · Face " + format.face + " mm · Cut " + format.cut + " mm";
  $("#selected-title").textContent = t("slot") + " " + (selected % format.centers.length + 1);
  $("#placement-controls").hidden = !asset;
  $("#inspector-empty").hidden = !!asset;
  const assignment = $("#assignment");
  assignment.replaceChildren(new Option(t("empty"), ""), ...assets.map(item => new Option(item.name, item.id)));
  assignment.value = current?.assetId || "";
  for (const key of ["zoom", "x", "y"]) {
    const value = current ? (key === "zoom" ? Number((current.zoom * 100).toFixed(6)) : current[key]) : (key === "zoom" ? 100 : 0);
    $("#" + key + "-number").value = value;
    if (key === "zoom") $("#zoom").value = value;
  }
  $("#zoom-number").setAttribute("aria-label", t("zoom") + " %");
  $("#x-number").setAttribute("aria-label", t("horizontal") + " mm");
  $("#y-number").setAttribute("aria-label", t("vertical") + " mm");
  $("#resolution").classList.remove("warning");
  $("#resolution").textContent = "";
  $("#quality-advice").textContent = "";
  $("#quality-fit").hidden = true;
  if (asset) {
    const description = qualityDescription(asset, current);
    $("#resolution").textContent = description.label;
    $("#quality-advice").textContent = description.notes.join("\n");
    $("#quality-fit").hidden = description.quality.ppi === null || description.quality.ppi >= 300;
    $("#resolution").classList.toggle("warning", description.quality.ppi !== null && description.quality.ppi < 300);
    for (const input of document.querySelectorAll("[data-size-tag]")) input.checked = !!asset.sizes?.includes(input.value);
  }
  for (const key of ["export", "proof", "print"]) $("#" + key).disabled = busy || !occupied;
  $("#clear").disabled = !occupied;
  renderLibrary();
  renderBatchSummary();
  renderSheet();
  if ($("#design-editor").open) renderEditor();
}

async function readDesigns(file) {
  if (file.size > 64 * 1024 * 1024) throw Object.assign(new Error("fileTooLarge"), {code: "fileTooLarge"});
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = file.name.split(".").at(-1).toLowerCase();
  const mime = file.type || ({pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp"}[extension]);
  if (mime === "application/pdf") {
    const pdfDocument = await pdfjs.getDocument({data: bytes.slice(), isEvalSupported: false}).promise;
    const originals = pdfDocument.numPages > 1 ? await PDFDocument.load(bytes) : null;
    const designs = [];
    try {
      for (let index = 0; index < pdfDocument.numPages; index++) {
        const page = await pdfDocument.getPage(index + 1);
        const unit = page.getViewport({scale: 1});
        const pdfQuality = await inspectPDFPage(page, pdfjs.OPS);
        const viewport = page.getViewport({scale: Math.min(2, 1800 / Math.max(unit.width, unit.height))});
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
        let pageBytes = bytes;
        let name = file.name;
        if (originals) {
          const single = await PDFDocument.create();
          const [copied] = await single.copyPages(originals, [index]);
          single.addPage(copied);
          pageBytes = await single.save();
          name = file.name.replace(/\.pdf$/i, "") + " - " + (index + 1) + ".pdf";
        }
        const suggestedSizes = Object.entries(PRESETS).filter(([, format]) =>
          Math.abs(unit.width / MM - format.cut) < .2 && Math.abs(unit.height / MM - format.cut) < .2).map(([id]) => id);
        designs.push({name, kind: "pdf", mime, bytes: pageBytes, page: 0, width: unit.width, height: unit.height,
          pdfQuality, suggestedSizes, preview: canvas.toDataURL("image/png")});
        page.cleanup();
      }
    } finally {
      await pdfDocument.destroy();
    }
    return designs;
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) throw new Error(t("unsupported"));
  const preview = URL.createObjectURL(file);
  const image = new Image();
  image.src = preview;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(preview);
    throw error;
  }
  return [{name: file.name, kind: mime, mime, bytes, image, width: image.naturalWidth, height: image.naturalHeight, preview}];
}

async function ensureAssetData(asset) {
  if (!asset.bytes) {
    const response = await request("/api/library/" + asset.id + "/source");
    asset.bytes = new Uint8Array(await response.arrayBuffer());
  }
  if (asset.kind !== "pdf" && !asset.image) {
    asset.sourcePreview = URL.createObjectURL(new Blob([asset.bytes], {type: asset.mime}));
    const image = new Image();
    image.src = asset.sourcePreview;
    await image.decode();
    asset.image = image;
  }
  return asset;
}

async function cacheAsset(asset) {
  const info = cacheInfo(asset);
  const preview = thumbnail(asset);
  const response = await request("/api/library/" + asset.id, {
    method: "PATCH", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({info, preview: preview.split(",")[1], sizes: asset.sizes || []}),
  });
  await response.json();
}

function cacheInfo(asset) {
  return Object.fromEntries(["kind", "mime", "width", "height", "pdfQuality", "suggestedSizes"]
    .filter(key => asset[key] !== undefined).map(key => [key, asset[key]]));
}

function thumbnail(asset) {
  let preview = asset.preview;
  if (asset.image) {
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 300 / Math.max(asset.width, asset.height));
    canvas.width = Math.max(1, Math.round(asset.width * ratio));
    canvas.height = Math.max(1, Math.round(asset.height * ratio));
    canvas.getContext("2d").drawImage(asset.image, 0, 0, canvas.width, canvas.height);
    preview = canvas.toDataURL("image/png");
  }
  return preview;
}

async function importFiles(files, target = null) {
  await work(t("adding"), async () => {
    let added = 0;
    let next = target;
    const failures = [];
    for (const file of files) {
      try {
        const designs = await readDesigns(file);
        for (const design of designs) {
          const response = await request("/api/library", {
            method: "POST",
            headers: {"Content-Type": design.mime, "X-File-Name": encodeURIComponent(design.name)},
            body: design.bytes,
            ...(!library.local ? {initial: {info: cacheInfo(design), sizes: design.suggestedSizes?.length ? design.suggestedSizes : [presetId],
              preview: new Blob([base64Bytes(thumbnail(design).split(",")[1])], {type: "image/png"})}} : {}),
          });
          const record = await response.json();
          let asset = assets.find(item => item.id === record.id);
          if (!asset) {
            asset = {...design, id: record.id, name: record.name, framings: record.framings || {}, sizes: record.sizes ?? (design.suggestedSizes?.length ? design.suggestedSizes : [presetId])};
            assets.push(asset);
            if (library.local) await cacheAsset(asset);
          } else if (design.image) URL.revokeObjectURL(design.preview);
          const empty = next === null ? slots().indexOf(null) : next;
          if (empty >= 0 && empty < slots().length) {
            slots()[empty] = stateFor(asset.id);
            next = null;
            selected = empty;
            pageIndex = Math.floor(empty / preset().centers.length);
          }
          added++;
        }
      } catch (error) {
        failures.push(file.name + " · " + error.message);
      }
    }
    saveLayout();
    status(added + " " + t("added") + (failures.length ? " " + failures.join(" · ") : ""), failures.length > 0);
    $("#files").value = "";
  });
}

async function removeDesign(id) {
  await work(t("deleteLabel"), async () => {
    await request("/api/library/" + id, {method: "DELETE"});
    const index = assets.findIndex(asset => asset.id === id);
    if (index >= 0) {
      const [removed] = assets.splice(index, 1);
      if (removed.image) URL.revokeObjectURL(removed.preview);
    }
    for (const key of Object.keys(PRESETS)) {
      if (Array.isArray(layouts[key])) layouts[key] = layouts[key].map(item => item?.assetId === id ? null : item);
      if (quantities[key]) delete quantities[key][id];
    }
    pendingRemoval = null;
    saveLayout();
    status(t("removed"));
  });
}

function circularClip(page, cx, cy, radius) {
  const k = .5522847498307936 * radius;
  page.pushOperators(
    pushGraphicsState(), moveTo(cx + radius, cy),
    appendBezierCurve(cx + radius, cy + k, cx + k, cy + radius, cx, cy + radius),
    appendBezierCurve(cx - k, cy + radius, cx - radius, cy + k, cx - radius, cy),
    appendBezierCurve(cx - radius, cy - k, cx - k, cy - radius, cx, cy - radius),
    appendBezierCurve(cx + k, cy - radius, cx + radius, cy - k, cx + radius, cy),
    closePath(), clip(), endPath(),
  );
}

async function buildPDF(proof) {
  const format = preset();
  const placements = slots().map(item => item && {...item});
  const pdf = await PDFDocument.create();
  pdf.catalog.set(PDFName.of("ViewerPreferences"), pdf.context.obj({PrintScaling: PDFName.of("None")}));
  pdf.setTitle(format.face + " mm - A4 badge sheet");
  const embedded = new Map();
  const capacity = format.centers.length;
  for (let offset = 0; offset < placements.length; offset += capacity) {
    const page = pdf.addPage([210 * MM, 297 * MM]);
    for (let index = offset; index < Math.min(placements.length, offset + capacity); index++) {
      const placement = placements[index];
      if (!placement) continue;
      const asset = assetFor(placement);
      if (!asset) continue;
      if (!embedded.has(asset.id)) {
        await ensureAssetData(asset);
        let image;
        if (asset.kind === "pdf") [image] = await pdf.embedPdf(asset.bytes, [asset.page]);
        else if (asset.kind === "image/png") image = await pdf.embedPng(asset.bytes);
        else if (asset.kind === "image/jpeg") image = await pdf.embedJpg(asset.bytes);
        else {
          const canvas = document.createElement("canvas");
          canvas.width = asset.width;
          canvas.height = asset.height;
          canvas.getContext("2d").drawImage(asset.image, 0, 0);
          const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
          image = await pdf.embedPng(await png.arrayBuffer());
        }
        embedded.set(asset.id, image);
      }
      const [x, y] = format.centers[index % capacity];
      const cx = x * MM, cy = (297 - y) * MM;
      const size = dimensions(asset, placement, format);
      circularClip(page, cx, cy, format.cut * MM / 2);
      const options = {
        x: cx - size.width * MM / 2 + placement.x * MM,
        y: cy - size.height * MM / 2 - placement.y * MM,
        width: size.width * MM, height: size.height * MM,
      };
      if (asset.kind === "pdf") page.drawPage(embedded.get(asset.id), options);
      else page.drawImage(embedded.get(asset.id), options);
      page.pushOperators(popGraphicsState());
      if (proof) {
        for (const [diameter, color] of [[format.face, rgb(.16, .61, .57)], [format.safe, rgb(.79, .55, .13)]]) {
          page.drawCircle({x: cx, y: cy, size: diameter * MM / 2, borderColor: color, borderWidth: .5, borderDashArray: [2, 3]});
        }
      }
      if ($("#cut").checked || proof) {
        page.drawCircle({x: cx, y: cy, size: format.cut * MM / 2, borderColor: rgb(.6, .6, .6), borderWidth: .25, borderDashArray: [2 * MM, 2 * MM]});
        if (format.ticks) {
          page.drawLine({start: {x: cx, y: cy + (format.cut / 2 + 1) * MM}, end: {x: cx, y: cy + (format.cut / 2 + 4) * MM}, thickness: .4, color: rgb(.4, .4, .4)});
        }
      }
    }
    const [left, right, bottom] = format.scaleBar;
    page.drawLine({start: {x: left * MM, y: bottom * MM}, end: {x: right * MM, y: bottom * MM}, thickness: .5});
    for (const x of [left, right]) {
      page.drawLine({start: {x: x * MM, y: (bottom - 1.2) * MM}, end: {x: x * MM, y: (bottom + 1.2) * MM}, thickness: .5});
    }
    page.drawText("50 mm", {x: ((left + right) / 2 - 4) * MM, y: (bottom + 3) * MM, size: 8});
  }
  return pdf.save();
}

async function savePDF(proof) {
  if (!slots().some(Boolean)) return;
  await work(t("preparing"), async () => {
    const bytes = await buildPDF(proof);
    const url = URL.createObjectURL(new Blob([bytes], {type: "application/pdf"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = (proof ? "epreuve" : "planche") + "-badges-" + preset().face + "mm.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status(t("saved"));
  });
}

async function printSheet() {
  if (!slots().some(Boolean)) return;
  await work(t("preparingPrint"), async () => {
    const bytes = await buildPDF(false);
    const documentPDF = await pdfjs.getDocument({data: bytes, isEvalSupported: false}).promise;
    try {
      const pages = [];
      for (let index = 1; index <= documentPDF.numPages; index++) {
        const page = await documentPDF.getPage(index);
        const viewport = page.getViewport({scale: 300 / 72});
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
        const image = new Image();
        image.src = canvas.toDataURL("image/png");
        await image.decode();
        const printedPage = document.createElement("div");
        printedPage.className = "print-page";
        printedPage.append(image);
        pages.push(printedPage);
        page.cleanup();
      }
      $("#print-output").replaceChildren(...pages);
      status(t("readyPrint"));
      window.print();
    } finally {
      await documentPDF.destroy();
    }
  });
}


function buildBatch() {
  const existing = slots().filter(Boolean);
  const result = [];
  for (const asset of assets) {
    const placement = asset.framings?.[presetId] ? stateFor(asset.id) : existing.find(item => item.assetId === asset.id) || stateFor(asset.id);
    for (let index = 0; index < quantityFor(asset.id); index++) result.push({...placement});
  }
  if (!result.length) return;
  layouts[presetId] = result;
  selected = pageIndex = 0;
  slots();
  saveLayout();
  status("");
  render();
}

function changePage(index) {
  pageIndex = Math.max(0, Math.min(pageCount() - 1, index));
  selected = pageIndex * preset().centers.length;
  render();
}

function reduceTo300() {
  const placement = slots()[selected];
  const asset = assetFor(placement);
  if (!asset) return;
  const {ppi} = placementQuality(asset, placement);
  if (ppi !== null && ppi < 300) placement.zoom = Math.max(.00000001, placement.zoom * ppi / 301);
  saveLayout();
  render();
}

function renderEditor() {
  const placement = slots()[selected];
  const asset = assetFor(placement);
  if (!asset) {
    $("#design-editor").close();
    return;
  }
  const canvas = $("#editor-canvas");
  const size = dimensions(asset, placement);
  const image = document.createElement("img");
  image.src = asset.editorPreview || asset.image?.src || asset.preview;
  image.alt = asset.name;
  image.draggable = false;
  image.style.width = size.width / preset().cut * 100 + "%";
  image.style.height = size.height / preset().cut * 100 + "%";
  image.style.left = 50 + placement.x / preset().cut * 100 + "%";
  image.style.top = 50 + placement.y / preset().cut * 100 + "%";
  image.style.transform = "translate(-50%, -50%)";
  canvas.replaceChildren(image);
  for (const name of ["face", "safe"]) {
    const guide = document.createElement("span");
    guide.className = "guide " + name;
    guide.style.width = guide.style.height = preset()[name] / preset().cut * 100 + "%";
    canvas.append(guide);
  }
  $("#editor-zoom").value = Number((placement.zoom * 100).toFixed(6));
  $("#editor-zoom-value").textContent = Number((placement.zoom * 100).toFixed(6)) + "%";
  const description = qualityDescription(asset, placement);
  $("#editor-quality").textContent = [description.label, ...description.notes].join(" ");
  $("#editor-quality").classList.toggle("warning", description.quality.ppi !== null && description.quality.ppi < 300);
  $("#editor-fit").disabled = description.quality.ppi === null || description.quality.ppi >= 300;
  const saved = asset.framings?.[presetId];
  const matchesSaved = saved && ["zoom", "x", "y"].every(key => Math.abs(saved[key] - placement[key]) < .000001);
  $("#editor-framing-help").textContent = t(matchesSaved ? "framingSaved" : "framingHelp").replace("{size}", preset().face);
  $("#editor-save-framing").disabled = busy || !!matchesSaved;
  $("#editor-apply-all").disabled = busy;
}

async function openEditor() {
  const asset = assetFor(slots()[selected]);
  if (!asset) return;
  await work(t("preparing"), async () => {
    await ensureAssetData(asset);
    if (asset.kind === "pdf" && !asset.editorPreview) {
      const source = await pdfjs.getDocument({data: asset.bytes.slice(), isEvalSupported: false}).promise;
      try {
        const page = await source.getPage(1);
        const unit = page.getViewport({scale: 1});
        const viewport = page.getViewport({scale: Math.min(6, 1500 / Math.max(unit.width, unit.height))});
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
        asset.editorPreview = canvas.toDataURL("image/png");
      } finally {
        await source.destroy();
      }
    }
    $("#design-editor").showModal();
    renderEditor();
    status("");
  });
}

$("#build-batch").onclick = buildBatch;
$("#previous-page").onclick = () => changePage(pageIndex - 1);
$("#next-page").onclick = () => changePage(pageIndex + 1);
$("#add-page").onclick = () => {
  layouts[presetId].push(...Array.from({length: preset().centers.length}, () => null));
  saveLayout();
  changePage(pageCount() - 1);
};
$("#quality-fit").onclick = reduceTo300;
$("#edit-design").onclick = openEditor;
$("#close-editor").onclick = () => $("#design-editor").close();
$("#editor-fit").onclick = reduceTo300;
$("#editor-center").onclick = () => {
  const placement = slots()[selected];
  if (placement) placement.x = placement.y = 0;
  saveLayout();
  render();
};
$("#editor-zoom").oninput = event => {
  const placement = slots()[selected];
  if (!placement) return;
  placement.zoom = Number(event.target.value) / 100;
  saveLayout();
  renderEditor();
};
$("#design-editor").addEventListener("close", () => render());
$("#editor-save-framing").onclick = async () => {
  const placement = slots()[selected];
  const asset = assetFor(placement);
  if (!asset) return;
  const size = presetId;
  const framing = {size, ...Object.fromEntries(["zoom", "x", "y"].map(key => [key, placement[key]]))};
  await work(t("savingFraming"), async () => {
    const response = await request("/api/library/" + asset.id, {
      method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({framing}),
    });
    const record = await response.json();
    asset.framings = record.framings;
    status(t("framingSaved").replace("{size}", PRESETS[size].face));
  });
};
$("#editor-apply-all").onclick = () => {
  const selectedPlacement = slots()[selected];
  if (!selectedPlacement) return;
  for (const placement of slots()) {
    if (placement?.assetId === selectedPlacement.assetId) Object.assign(placement, selectedPlacement);
  }
  saveLayout();
  render();
};
let cropDrag = null;
$("#editor-canvas").onpointerdown = event => {
  if (event.button !== 0) return;
  const placement = slots()[selected];
  if (!placement) return;
  cropDrag = {x: event.clientX, y: event.clientY, initialX: placement.x, initialY: placement.y};
  event.currentTarget.setPointerCapture(event.pointerId);
};
$("#editor-canvas").onpointermove = event => {
  if (!cropDrag) return;
  const ratio = preset().cut / event.currentTarget.getBoundingClientRect().width;
  const placement = slots()[selected];
  placement.x = Math.max(-70, Math.min(70, cropDrag.initialX + (event.clientX - cropDrag.x) * ratio));
  placement.y = Math.max(-70, Math.min(70, cropDrag.initialY + (event.clientY - cropDrag.y) * ratio));
  renderEditor();
};
$("#editor-canvas").onpointerup = $("#editor-canvas").onpointercancel = () => {
  if (!cropDrag) return;
  cropDrag = null;
  saveLayout();
  render();
};
for (const checkbox of document.querySelectorAll("[data-size-tag]")) {
  checkbox.onchange = async () => {
    const asset = assetFor(slots()[selected]);
    if (!asset) return;
    const sizes = [...document.querySelectorAll("[data-size-tag]:checked")].map(input => input.value);
    const previous = asset.sizes;
    asset.sizes = sizes;
    await work(t("adding"), async () => {
      try {
        await request("/api/library/" + asset.id, {
          method: "PATCH", headers: {"Content-Type": "application/json"}, body: JSON.stringify({sizes}),
        });
      } catch (error) {
        asset.sizes = previous;
        throw error;
      }
      status("");
    });
  };
}
$("#url-form").onsubmit = async event => {
  event.preventDefault();
  let file;
  await work(t("adding"), async () => {
    const response = await importURL($("#design-url").value.trim(), library.local);
    if (!response.ok) throw new Error(t("urlFailed"));
    const name = decodeURIComponent(response.headers.get("X-File-Name") || "design");
    file = new File([await response.arrayBuffer()], name, {type: response.headers.get("Content-Type")});
  });
  if (file) await importFiles([file]);
};

$("#language").onchange = event => {
  language = event.target.value;
  try {localStorage.setItem("badge-composer-language", language);} catch {status(t("layoutError"), true);}
  status("");
  render();
};
$("#preset").onchange = event => {
  presetId = event.target.value;
  selected = 0;
  pageIndex = 0;
  saveLayout();
  render();
};
$("#files").onchange = event => importFiles(event.target.files);
$("#search").oninput = renderLibrary;
$("#size-filter").onchange = renderLibrary;
$("#drop-zone").ondragover = event => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  $("#drop-zone").classList.add("over");
};
$("#drop-zone").ondragleave = () => $("#drop-zone").classList.remove("over");
$("#drop-zone").ondrop = event => {
  event.preventDefault();
  $("#drop-zone").classList.remove("over");
  importFiles(event.dataTransfer.files);
};
document.addEventListener("dragover", event => event.preventDefault());
document.addEventListener("drop", event => event.preventDefault());
$("#assignment").onchange = event => {
  slots()[selected] = event.target.value ? stateFor(event.target.value) : null;
  saveLayout();
  render();
};
for (const id of ["zoom", "zoom-number", "x-number", "y-number"]) {
  $("#" + id).oninput = event => {
    const placement = slots()[selected];
    if (!placement) return;
    const number = Number(event.target.value);
    if (!Number.isFinite(number)) return;
    const value = Math.min(Number(event.target.max), Math.max(Number(event.target.min), number));
    const key = id.split("-")[0];
    placement[key] = key === "zoom" ? value / 100 : value;
    saveLayout();
    render();
  };
}
$("#reset").onclick = () => {
  if (slots()[selected]) slots()[selected] = originalState(slots()[selected].assetId);
  saveLayout();
  render();
};
$("#fit-safe").onclick = () => {
  const placement = slots()[selected];
  const asset = assetFor(placement);
  if (!asset) return;
  const size = dimensions(asset, {zoom: 1});
  placement.zoom = preset().safe / Math.hypot(size.width, size.height);
  placement.x = placement.y = 0;
  saveLayout();
  render();
};
$("#remove").onclick = () => {
  slots()[selected] = null;
  saveLayout();
  render();
};
$("#repeat").onclick = () => {
  const current = slots()[selected];
  if (!current) return;
  slots().forEach((placement, index) => {
    if (!placement) slots()[index] = {...current};
  });
  saveLayout();
  render();
};
$("#clear").onclick = () => {
  layouts[presetId] = Array.from({length: preset().centers.length}, () => null);
  pageIndex = selected = 0;
  saveLayout();
  render();
};
$("#zones").onchange = renderSheet;
$("#export").onclick = () => savePDF(false);
$("#proof").onclick = () => savePDF(true);
$("#print").onclick = () => {
  $("#print-page-total").textContent = t("printExpected").replace("{count}", pageCount());
  $("#print-setup").showModal();
};
$("#cancel-print").onclick = () => $("#print-setup").close();
$("#continue-print").onclick = () => {
  $("#print-setup").close();
  printSheet();
};

async function loadLibrary() {
  for (const asset of assets) {
    for (const value of [asset.preview, asset.sourcePreview]) if (value?.startsWith("blob:")) URL.revokeObjectURL(value);
  }
  assets.length = 0;
  const response = await request("/api/library");
  const records = await response.json();
  const failed = [];
  for (const record of records) {
    try {
      if (record.info) {
        assets.push({...record.info, id: record.id, name: record.name, page: 0,
          sizes: record.sizes || [], framings: record.framings || {},
          preview: await library.previewURL(record)});
      } else {
        const source = await request("/api/library/" + record.id + "/source");
        const designs = await readDesigns(new File([await source.arrayBuffer()], record.name, {type: record.type}));
        const asset = {...designs[0], id: record.id, name: record.name, framings: record.framings || {},
          sizes: record.sizes ?? designs[0].suggestedSizes ?? []};
        assets.push(asset);
        await cacheAsset(asset);
      }
    } catch {
      failed.push(record.name);
    }
  }
  for (const key of Object.keys(PRESETS)) {
    if (Array.isArray(layouts[key])) {
      layouts[key] = layouts[key].map(item => {
        if (!assetFor(item) || !Number.isFinite(item.zoom) || item.zoom <= 0 || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return null;
        return {...item, zoom: Math.min(2, item.zoom)};
      });
    }
  }
  status(failed.length ? t("failure") + " " + failed.join(" · ") : "", failed.length > 0);
  $("#library-disclosure").open = window.innerWidth > 900 || assets.length === 0;
}

guidance = startGuidance({getLanguage: () => language, getPreset: preset});
$("#drop-zone").addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {event.preventDefault(); $("#files").click();}
});
$("#help").onclick = () => $("#app-help").showModal();
$("#close-help").onclick = () => $("#app-help").close();
$("#export-backup").onclick = async () => {
  await work(t("backingUp"), async () => {
    const backup = await makeBackup(library, {size: presetId, language, layouts, quantities});
    const url = URL.createObjectURL(backup);
    const link = document.createElement("a");
    link.href = url;
    link.download = "badge-proof-" + new Date().toISOString().slice(0, 10) + ".badgeproof";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status(t("backupSaved"));
    $("#backup-status").textContent = t("backupSaved");
  });
};
$("#import-backup").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  $("#app-help").close();
  stagedBackup = null;
  await work(t("readingBackup"), async () => {
    stagedBackup = await readBackup(file, async original => {
      const designs = await readDesigns(original);
      if (designs.length !== 1) throw Object.assign(new Error("invalidBackup"), {code: "invalidBackup"});
      const asset = designs[0];
      const preview = new Blob([base64Bytes(thumbnail(asset).split(",")[1])], {type: "image/png"});
      const info = cacheInfo(asset);
      if (asset.preview.startsWith("blob:")) URL.revokeObjectURL(asset.preview);
      return {info, preview};
    });
    $("#backup-review-text").textContent = t("backupReviewHelp").replace("{count}", stagedBackup.records.length);
    $("#backup-review").showModal();
  });
  event.target.value = "";
};
$("#cancel-restore").onclick = () => {stagedBackup = null; $("#backup-review").close();};
$("#backup-review").addEventListener("close", () => {stagedBackup = null;});
$("#confirm-restore").onclick = async () => {
  const backup = stagedBackup;
  stagedBackup = null;
  $("#backup-review").close();
  if (!backup || library.local) return;
  await work(t("readingBackup"), async () => {
    await library.restore(backup.records);
    ({layouts, quantities, language} = backup.preferences);
    presetId = backup.preferences.size;
    selected = pageIndex = 0;
    saveLayout();
    try {localStorage.setItem("badge-composer-language", language);} catch {}
    await loadLibrary();
    status(t("restored"));
  });
};
$("#protect-storage").onclick = async () => {
  const granted = navigator.storage?.persist ? await navigator.storage.persist().catch(() => false) : false;
  $("#backup-status").textContent = t(granted ? "storageProtected" : "storageNotProtected");
};
window.addEventListener("beforeprint", () => {printing = true;});
window.addEventListener("afterprint", () => {printing = false;});
await work(t("loading"), async () => {
  try {library = await openLibrary();} catch (error) {storageFailed = true; throw error;}
  await loadLibrary();
  shell = await startShell({local: library.local, t, canReload: () => !busy && !printing && !document.querySelector("dialog[open]")});
});
