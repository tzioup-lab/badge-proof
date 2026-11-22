// A small work-along guide: users keep their own sheet and files throughout.
const content = {
  fr: {
    start: "Visite guidée", close: "Fermer la visite", back: "Précédent", next: "Suivant", done: "Terminer",
    progress: "Étape {step} sur {total}", show: "Montrer les commandes", reference: "Repères et questions fréquentes",
    intro: "Ouvrez la rubrique qui vous intéresse. La visite guidée reste disponible séparément dans l’en-tête.",
    steps: [
      ["Choisir le format", "Choisissez la taille du badge fini : 25, 32 ou 58 mm. Pour le format actuel, la découpe mesure {cut} mm et le cercle intérieur de sécurité {safe} mm. La planche A4 s’adapte au format."],
      ["Ajouter vos visuels", "Déposez des PNG, JPEG, WebP ou PDF dans la bibliothèque, ou cliquez sur Ajouter des visuels. Pour un lien bloqué par son site, téléchargez le fichier puis ajoutez-le ici."],
      ["Composer les exemplaires", "Cliquez sur un cercle puis sur un visuel, ou glissez la vignette dans le cercle. Pour un lot, indiquez une quantité sous chaque visuel puis choisissez Composer ces quantités. Ce bouton remplace la planche du format actif et ajoute les pages nécessaires."],
      ["Vérifier et enregistrer le cadrage", "Sélectionnez un cercle rempli, puis Cadrer et vérifier. Gardez le texte et les détails essentiels dans le cercle intérieur. Enregistrer le cadrage prépare les futurs exemplaires à cette taille ; Appliquer aux exemplaires met aussi à jour les copies déjà placées."],
      ["Imprimer à la taille exacte", "Enregistrez le PDF ou choisissez Imprimer. Dans la fenêtre d’impression : A4 portrait, marges Aucune, échelle personnalisée 100 %, une page par feuille, en-têtes désactivés. Mesurez la barre de 50 mm avant de découper."],
      ["Conserver votre bibliothèque", "Dans Aide, sauvegardez la bibliothèque pour garder les originaux, les cadrages et les planches. Chaque navigateur ou application peut avoir sa propre bibliothèque ; elle ne se synchronise pas entre appareils. Importer une sauvegarde remplace les réglages des planches après confirmation."],
    ],
    faqs: [
      ["start", "Comment commencer ?", "Choisissez un format, ajoutez un fichier, puis glissez sa vignette vers un cercle. Vous pouvez aussi sélectionner le cercle puis cliquer sur la vignette. Visite guidée, dans l’en-tête, explique les étapes une par une."],
      ["zones", "Quels éléments doivent rester dans les cercles ?", "Le cercle extérieur est la découpe ; le fond doit le couvrir. Le cercle de la face indique le badge fini. Gardez le texte, les visages et les détails essentiels dans le cercle intérieur de sécurité : 19 mm pour un badge de 25 mm, 26 mm pour 32 mm, 50 mm pour 58 mm. Vérifiez visuellement : l’outil ne reconnaît pas les textes ou les détails importants."],
      ["copies", "Comment préparer plusieurs exemplaires ou plusieurs pages ?", "Indiquez les quantités sous les vignettes, puis Composer ces quantités : par exemple 5 d’un visuel, 10 d’un autre. La composition du format actif est remplacée et les pages sont ajoutées automatiquement. Les flèches au-dessus de la feuille permettent de changer de page. Pour les petites modifications, glissez ou sélectionnez un cercle."],
      ["framing", "Pourquoi enregistrer le cadrage et appliquer aux exemplaires ?", "Enregistrer le cadrage mémorise le zoom et la position dans la bibliothèque, séparément pour chaque taille de badge. Les nouveaux exemplaires et lots le réutilisent. Appliquer aux exemplaires de ce visuel met à jour ceux déjà placés. Sans enregistrement, votre ajustement reste propre à l’exemplaire modifié."],
      ["quality", "Mon visuel sera-t-il net à l’impression ?", "La cible est 300 ppp effectifs à la taille imprimée, en tenant compte du zoom. Une source plus grande ou un cadrage moins agrandi peut aider ; réduire ne doit pas laisser le fond perdu découvert. Les éléments vectoriels peuvent s’agrandir sans pixellisation. Certains éléments PDF restent à vérifier. Contrôlez aussi le contraste et les petits caractères."],
      ["printing", "Quels réglages utiliser pour imprimer ?", "A4 portrait (210 × 297 mm), marges Aucune, échelle personnalisée 100 % plutôt que Par défaut, une page par feuille, en-têtes et pieds de page désactivés. Letter est plus court qu’A4 et peut réduire les badges ou reporter la barre sur une autre page. Mesurez la barre de 50 mm. L’application ne peut pas imposer les réglages de l’imprimante. Le PDF propre évite les guides internes ; l’épreuve les conserve pour vérification."],
      ["library", "Où sont mes visuels ? Comment les transférer ?", "Sur le site, ils restent dans le stockage de ce navigateur sur cet appareil ; ils ne sont pas envoyés au site. Un autre profil, navigateur ou une application Safari du Dock peut avoir une bibliothèque séparée. Effacer les données du site peut l’effacer. Sauvegarder la bibliothèque conserve les originaux, cadrages, tailles, planches, quantités et langue. À l’import, les visuels correspondants sont mis à jour, les autres conservés, et les réglages des planches remplacés. Il n’y a pas de synchronisation automatique. Le lanceur local conserve ses fichiers dans sa propre bibliothèque sur disque."],
      ["links", "Pourquoi l’import depuis un lien échoue-t-il ?", "Le lien doit mener directement à un PNG, JPEG, WebP ou PDF. Certains sites interdisent la lecture depuis une autre page. Ouvrez alors le lien, téléchargez le fichier et ajoutez-le depuis votre appareil. Le site ne fait pas transiter vos fichiers par un proxy public."],
      ["install", "Comment installer l’application, l’utiliser hors ligne et la mettre à jour ?", "Chrome ou Edge : Installer dans le menu du navigateur, ou le bouton Installer lorsqu’il apparaît. Safari sur Mac (Sonoma 14 ou plus récent) : Fichier → Ajouter au Dock. Installez avant d’importer vos visuels. Le premier chargement complet prépare l’utilisation hors ligne ; son état figure ci-dessous. Les mises à jour sont vérifiées à l’ouverture et chaque heure. Une nouvelle version complète attend votre choix de recharger ; vous pouvez choisir Plus tard. Les liens distants et les mises à jour nécessitent Internet."],
    ],
  },
  en: {
    start: "Guided walkthrough", close: "Close walkthrough", back: "Back", next: "Next", done: "Finish",
    progress: "Step {step} of {total}", show: "Show the controls", reference: "Guidance and FAQs",
    intro: "Open the topic you need. The guided walkthrough is available separately in the header.",
    steps: [
      ["Choose your badge size", "Choose the finished badge size: 25, 32 or 58 mm. For the current size, the cut circle measures {cut} mm and the inner safe circle {safe} mm. The A4 layout adapts to your choice."],
      ["Add your designs", "Drop PNG, JPEG, WebP or PDF files into the library, or click Add designs. If a website blocks importing its link, download the file and add it here."],
      ["Arrange your copies", "Click a circle, then a design, or drag a thumbnail into the circle. For a batch, enter a quantity beneath each design and choose Compose these quantities. This replaces the current size’s sheet and adds the pages needed."],
      ["Check and save framing", "Select a filled circle, then Crop and check. Keep lettering and essential details inside the inner circle. Save framing prepares future copies at this badge size; Apply to copies also updates copies already placed."],
      ["Print at the correct size", "Save the PDF or choose Print. In the print dialog: A4 portrait, margins None, Custom scale 100%, one page per sheet, headers off. Measure the 50 mm bar before cutting."],
      ["Keep your library safe", "In Help, back up your library to keep originals, framing and sheets. Each browser or app can have its own library; it does not sync between devices. Importing a backup replaces sheet settings after confirmation."],
    ],
    faqs: [
      ["start", "How do I get started?", "Choose a size, add a file, then drag its thumbnail onto a circle. You can also select the circle and click the thumbnail. Guided walkthrough in the header explains each step."],
      ["zones", "What belongs inside each circle?", "The outer circle is the cut line; the background should cover it. The face circle shows the finished badge. Keep text, faces and essential details inside the inner safe circle: 19 mm for a 25 mm badge, 26 mm for 32 mm, 50 mm for 58 mm. Inspect this visually: the app cannot identify lettering or important detail."],
      ["copies", "How do I make several copies or pages?", "Set quantities beneath thumbnails and choose Compose these quantities: for example, 5 of one design and 10 of another. It replaces the current size’s composition and creates extra pages automatically. Use the arrows above the sheet to change pages. For smaller changes, drag designs or select individual circles."],
      ["framing", "Why save framing and apply to copies separately?", "Save framing stores zoom and position in the library, separately for each badge size. New copies and quantity batches reuse it. Apply to copies of this design updates copies already placed. Without saving, your adjustment affects only the copy you edited."],
      ["quality", "Will my design print sharply?", "The target is 300 effective PPI at the printed size, including crop zoom. A larger source or less magnification can help; reducing must not leave uncovered bleed. Vector elements can scale without pixelation. Some PDF elements still need checking. Inspect contrast and small lettering too."],
      ["printing", "Which print settings should I use?", "A4 portrait (210 × 297 mm), margins None, Custom scale 100% rather than Default, one page per sheet, headers and footers off. Letter is shorter than A4 and can shrink badges or push the bar onto another page. Measure the 50 mm bar. The app cannot enforce printer settings. The clean PDF omits internal guides; the proof retains them for checking."],
      ["library", "Where are my designs? How do I move them?", "On the website, designs stay in this browser’s storage on this device; they are not uploaded to the site. Another profile, browser or Safari Dock app can have a separate library. Clearing site data can delete it. Back up library includes originals, framing, size tags, sheets, quantities and language. Import updates matching designs, retains unrelated ones and replaces sheet settings. There is no automatic sync. The optional local launcher keeps its own disk library."],
      ["links", "Why does importing a URL fail?", "Use a direct PNG, JPEG, WebP or PDF link. Some sites block access from another page. Open the link, download the file, then add it from your device. The site does not route your files through a public proxy."],
      ["install", "How do I install it, work offline and update?", "Chrome or Edge: Install in the browser menu, or the Install button when offered. Safari on Mac (Sonoma 14 or newer): File → Add to Dock. Install before importing designs. A complete first load prepares offline use; its status appears below. Updates are checked on opening and hourly. A complete new version waits for your reload choice; you can choose Later. Remote links and updates need Internet."],
    ],
  },
};

const targets = [".format-control", "#drop-zone", ".batch-controls", ".inspector", ".export-actions", "#help"];

export function startGuidance({getLanguage, getPreset}) {
  const $ = selector => document.querySelector(selector);
  const dialog = $("#walkthrough");
  let step = 0;
  let rendered = "";
  let highlighted;
  let addedTabindex = false;
  const text = () => content[getLanguage()];
  function clearTarget() {
    highlighted?.classList.remove("tour-target");
    if (addedTabindex) highlighted?.removeAttribute("tabindex");
    highlighted = null;
    addedTabindex = false;
  }
  function render() {
    const words = text();
    const key = getLanguage() + ":" + getPreset().face;
    if (rendered !== key) {
      const openTopics = new Set([...$("#faq-topics").querySelectorAll("details[open]")].map(node => node.dataset.topic));
      $("#faq-topics").replaceChildren(...words.faqs.map(([id, question, answer]) => {
        const topic = document.createElement("details");
        topic.dataset.topic = id;
        const summary = document.createElement("summary"); summary.textContent = question;
        const body = document.createElement("p"); body.textContent = answer;
        topic.append(summary, body); topic.open = openTopics.has(id);
        return topic;
      }));
      rendered = key;
    }
    $("#start-walkthrough").textContent = words.start;
    $("#faq-heading").textContent = words.reference;
    $("#faq-intro").textContent = words.intro;
    $("#tour-progress").textContent = words.progress.replace("{step}", step + 1).replace("{total}", words.steps.length);
    $("#tour-meter").value = step + 1;
    $("#tour-title").textContent = words.steps[step][0];
    $("#tour-body").textContent = words.steps[step][1].replace("{cut}", getPreset().cut).replace("{safe}", getPreset().safe);
    $("#tour-close").textContent = words.close;
    $("#tour-back").textContent = words.back;
    $("#tour-back").disabled = step === 0;
    $("#tour-next").textContent = step === words.steps.length - 1 ? words.done : words.next;
    $("#tour-show").textContent = words.show;
  }
  function changeStep(next) {
    clearTarget(); step = next; render();
  }
  $("#start-walkthrough").onclick = () => {
    changeStep(0); dialog.classList.remove("tour-left");
    if (!dialog.open) dialog.show();
    $("#tour-next").focus();
  };
  $("#tour-back").onclick = () => changeStep(Math.max(0, step - 1));
  $("#tour-next").onclick = () => {
    if (step === text().steps.length - 1) dialog.close(); else changeStep(step + 1);
  };
  $("#tour-close").onclick = () => dialog.close();
  $("#tour-show").onclick = () => {
    clearTarget();
    if (step === 1 || step === 2) $("#library-disclosure").open = true;
    highlighted = $(targets[step]);
    highlighted.classList.add("tour-target");
    addedTabindex = !highlighted.hasAttribute("tabindex");
    if (addedTabindex) highlighted.tabIndex = -1;
    highlighted.scrollIntoView({block: "start", behavior: "instant"});
    highlighted.focus({preventScroll: true});
    const bounds = highlighted.getBoundingClientRect();
    dialog.classList.toggle("tour-left", innerWidth > 900 && bounds.left + bounds.width / 2 > innerWidth / 2);
  };
  dialog.addEventListener("close", () => {
    clearTarget(); $("#start-walkthrough").focus();
  });
  // Nonmodal dialogs allow working with the sheet and need explicit Escape handling.
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && dialog.open && !document.querySelector("dialog:modal")) {
      event.preventDefault(); dialog.close();
    }
  });
  // Opening the reference help ends the tour rather than covering it with two panels.
  $("#help").addEventListener("click", () => {if (dialog.open) dialog.close();});
  return {render};
}
