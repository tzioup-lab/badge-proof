BADGE PROOF — VERSION NAVIGATEUR / BROWSER VERSION

https://tzioup-lab.github.io/badge-proof/

Ouvrez ce lien : aucun compte, terminal ni Python n'est nécessaire.
Vous pouvez installer une icône via Chrome/Edge, ou dans Safari sur Mac
(Sonoma 14 ou plus récent) : Fichier → Ajouter au Dock.
Installez avant d'ajouter vos visuels. Un autre navigateur ou une application
Safari peut avoir sa propre bibliothèque ; importez votre sauvegarde si
elle est vide.

Les visuels restent dans le navigateur sur cet appareil. Ils ne sont pas
envoyés au site. Aide et sauvegardes permet de télécharger une sauvegarde
complète et de l'importer ailleurs. Effacer les données du site peut effacer
la bibliothèque : conservez une sauvegarde hors du navigateur.
Chaque appareil a sa propre bibliothèque ; aucune synchronisation automatique
n'est effectuée. L'import conserve les autres visuels, met à jour ceux qui
correspondent et remplace les planches, quantités et langue par la sauvegarde.

Après le premier chargement complet, l'application peut fonctionner hors
ligne. Consultez Aide et sauvegardes pour vérifier qu'elle est prête.
Une mise à jour complète attend votre accord pour recharger l'application ;
votre travail et vos visuels sont conservés. Vous pouvez choisir Plus tard.

Certains sites bloquent l'import depuis un lien : téléchargez le fichier
puis ajoutez-le à la bibliothèque. Aucun proxy public n'est utilisé.

ENGLISH
Open the link above. No account, terminal or Python installation is needed.
Install an icon through Chrome/Edge, or Safari on Mac (Sonoma 14+):
File → Add to Dock. Install before adding designs. Different browsers and
Safari apps can use separate libraries; import a backup if one looks empty.
Artwork stays in browser storage on this device. Clearing site data may
remove it. Help and backups saves originals, framing and sheet settings to
a portable backup file. Keep a copy outside browser storage.
Each device has its own library; there is no automatic cross-device sync.
Import retains unrelated designs, updates matching ones and replaces sheet
layouts, quantities and language with those from the backup.
After a complete initial load, file import, PDF export and printing work
offline. Completed updates wait for Reload with the new version / Later.
URL imports depend on the source site's browser-access rules. If blocked,
download the file and add it instead.

LOCAL LAUNCHER / LANCEUR LOCAL (OPTIONAL)
The following instructions apply only to the original disk-backed copy.
Les instructions suivantes concernent uniquement la copie locale originale.

COMPOSEUR DE BADGES / BADGE SHEET COMPOSER

Ouvrir / Open
http://127.0.0.1:8770/

Mac : double-cliquer sur Ouvrir-le-composeur.command.
Windows : double-cliquer sur Ouvrir-le-composeur-Windows.bat.
Le lanceur vérifie Python 3.10+ et les bibliothèques incluses. S'ils manquent,
il les prépare automatiquement avec connexion Internet. Sur Mac, terminez
l'installation officielle dans Installer si elle est demandée. Sur Windows,
le runtime manquant reste local dans .runtime. Aucune bibliothèque Python
supplémentaire n'est nécessaire. Le navigateur doit accepter les fonctionnalités
JavaScript modernes (Chrome, Edge, Firefox ou Safari récents).

FRANÇAIS
1. Choisissez 25, 32 ou 58 mm dans Taille du badge.
2. Ajoutez PNG, JPEG, WebP ou PDF depuis des fichiers ou un lien direct.
   Les visuels sont enregistrés sur cet ordinateur. Chaque page PDF
   devient un visuel distinct.
3. La bibliothèque défile dans sa propre zone. Recherchez par nom ou
   filtrez par taille prévue / résolution suffisante pour le format actif.
   Les vignettes sont mises en cache : les fichiers complets sont chargés
   seulement pour les nouveaux imports, le cadrage ou l'export.
4. Pour composer un lot, réglez le nombre d'exemplaires sous chaque
   visuel (par exemple 5, 10, 20), puis Composer ces quantités.
   Ce bouton remplace la composition du format actif. Des pages A4
   supplémentaires sont créées automatiquement. Naviguez avec les flèches.
5. Vous pouvez toujours glisser un visuel vers un cercle, ou sélectionner
   le cercle puis cliquer sur une vignette. Glissez un cercle rempli sur
   un autre pour les échanger.
6. Cadrer et vérifier ouvre un grand aperçu. Glissez l'image pour la
   déplacer, ajustez le zoom, puis appliquez aux exemplaires si nécessaire.
   Enregistrer le cadrage mémorise le zoom et la position dans la
   bibliothèque, séparément pour chaque format (25, 32, 58 mm).
   Les nouveaux exemplaires et les lots réutilisent ce cadrage ; la
   vignette montre le cadrage enregistré. Les exemplaires déjà placés
   conservent leur position jusqu'à Appliquer aux exemplaires de ce visuel.
   Sans enregistrement, le cadrage reste propre à l'exemplaire modifié.
7. Conçu pour permet d'étiqueter les tailles prévues pour un visuel.
   Ces étiquettes sont distinctes du contrôle de résolution.
8. La croix d'une vignette supprime le visuel de la bibliothèque et de
   toutes ses compositions après confirmation.
9. Les dispositions et quantités sont mémorisées par format dans ce navigateur.

QUALITÉ
L'outil calcule les ppp effectifs à la taille réellement imprimée et
selon le zoom. La cible est 300 ppp. Les images intégrées aux PDF sont
également contrôlées lorsque leurs opérations sont reconnues. Les
éléments PDF non analysables sont signalés comme restant à vérifier.
Une source conçue pour 25 mm peut servir en 58 mm si elle contient assez
de pixels. Les éléments vectoriels peuvent s'agrandir sans pixellisation.
L'outil propose de réduire un visuel trop agrandi pour atteindre 300 ppp.
Il prévient si ce changement laisse des bords blancs dans le fond perdu.
Il ne crée pas de nouveaux détails par agrandissement artificiel.
Le texte, le contraste, les petits détails et leur position dans la zone
sûre doivent toujours être vérifiés visuellement.

IMPRESSION
A4 portrait (pas Letter), Marges : Aucune / None, Échelle personnalisée :
100 % (pas Par défaut). Une page par feuille ; désactiver les en-têtes et
pieds de page. Vérifier la barre de 50 mm avant de découper.
Le bouton Imprimer rappelle ces réglages et le nombre de feuilles attendu
avant d'ouvrir la fenêtre du navigateur. Les réglages mémorisés par le
navigateur ou l'imprimante doivent être vérifiés dans cette fenêtre.
Letter est plus court qu'A4 : il peut réduire les badges ou reporter la
barre de 50 mm sur une autre feuille. Ne pas déplacer la barre pour
compenser ; choisir A4 et vérifier la mesure après impression.
La feuille est préparée à ses dimensions physiques exactes, avec les
visuels limités aux cercles de découpe. Les paramètres du pilote
d'imprimante restent à vérifier dans sa boîte de dialogue.
L'impression directe utilise un rendu de la feuille à 300 ppp.
L'export PDF conserve les pages PDF et les pixels natifs des PNG/JPEG.
Les guides internes sont réservés à l'épreuve et à l'aperçu.

ENGLISH
The launcher checks Python 3.10+ and included browser dependencies, then
downloads and verifies missing components. Internet access is needed only
for repairs or initial setup. On Mac, the official installer may require
your approval. Windows prepares a missing runtime locally in .runtime.
Add PNG/JPEG/WebP/PDF files or direct image/PDF URLs. The library is saved
on disk, with cached thumbnails and lazy original-file loading.
Set quantities under thumbnails, then Compose these quantities. The
current size's composition is replaced and extra A4 pages are created.
The library scrolls inside its panel and offers search, intended-size
tags, and a sufficient-resolution filter.
Drag thumbnails onto circles or click to assign. Crop and check opens a
large draggable preview with zoom, safe/face guides, effective-resolution
feedback, and an option to apply placement to all copies of that design.
Save framing stores its zoom and position with the library design,
separately for each badge size. New placements and quantity batches use
this saved framing, and the thumbnail shows it. Existing copies retain
their placement until Apply to copies is used. Unsaved edits affect only
the edited copy. Original image/PDF bytes are preserved.
Resolution depends on pixels and actual print size, including crop zoom.
The tool also checks supported image operations inside PDFs and identifies
vector-only content. Unanalysed PDF image operations are flagged.
The target is 300 PPI. Reduction can improve effective PPI, while a larger
original may be needed to cover the bleed. Inspect text, contrast and
important detail placement visually. No artificial sharpening/upscaling
is used to claim print readiness.
Size tags, designs and thumbnails are saved in the local library.
Each size remembers its multipage layout and quantities in this browser.
Print first shows the settings and expected sheet count, then opens the
browser dialog. Select A4 portrait (not Letter), Margins: None, Custom
scale: 100% (rather than Default), one page per sheet, headers/footers off.
The browser may retain previous printer settings; check them in its dialog.
Letter is shorter than A4 and can shrink the artwork or move the 50 mm bar
to another sheet. Choose A4 and measure the bar before cutting.
Direct print renders at 300 PPI. PDF export preserves native content.

TEMPLATES / GABARITS
25 mm : découpe / cut 35 mm, face 25 mm, zone sûre / safe 19 mm.
        28 positions, staggered rows, matching the 8 mm-gap v2 template.
32 mm : découpe / cut 44 mm, face 32 mm, zone sûre / safe 26 mm.
        12 positions, 3 columns and 4 rows.
58 mm : découpe / cut 70 mm, face 58 mm, zone sûre / safe 50 mm.
        6 positions, 2 columns and 3 rows.
Exact circle coordinates are in presets.js, extracted from the PDFs.

SAVED DATA / DONNÉES ENREGISTRÉES
The .library folder beside serve.py holds saved designs and their names.
Include this hidden folder when moving the installation or making a backup.
La bibliothèque est dans le dossier caché .library à côté de serve.py.
Conservez ce dossier pour transférer ou sauvegarder vos visuels.
Layout and language preferences are stored in the browser.
Disposition et langue sont mémorisées dans le navigateur.

Run manually / lancement manuel
python3 bootstrap.py --port 8770 --open
On Windows, use py -3 instead of python3.

The server listens only on this computer. Files stay in this installation.
All browser dependencies and their licenses are included in vendor.
No external service or CDN is needed.
The application does not identify lettering or essential details in an
image. Inspect the safe-circle overlay before printing.
Windows and physical printer output have not been exercised in this build.

STARTUP CHECKS
Python installers and portable runtimes come from python.org.
Vendor repair uses pinned official npm packages. Downloads and installed
browser libraries are checked against the SHA-256 manifest.
Offline startup works when Python and bundled vendor files are present.
Mac installation was simulated, not performed, during verification.
Windows startup still requires a Windows hardware verification run.
