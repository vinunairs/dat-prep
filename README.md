# DAT Prep

Dental Admission Test prep, live at https://vinunairs.github.io/dat-prep/ (GitHub Pages from `main`). A plain static site: no build step, no server.

- **Navigation:** three tabs: Today (Up next, this week, start-here checklist, road to test day), Learn (sections, topics, lessons, How the DAT works), Me (test details, skills, notes, backup, settings). Practice and Tests come back as tabs when their content exists. Notes open from the top bar; on wide screens a lesson's notes stay docked beside it.
- **Design:** tokens at the top of `css/dat.css` (light and dark). One bold surface (Up next); section colors are accents only; Manrope for the interface, Source Serif 4 for lesson reading text. Checked with axe-core against WCAG 2.2 AA.
- **Blueprint:** `js/syllabus.js`, from the ADA 2026 DAT Candidate Guide (updated 08/04/2026), including the updated Organic Chemistry outline.
- **Plan:** built backward from the test date: Learn → Practice → Full-length tests → Final days. Science topics are spread evenly across the learning weeks, new and shaky topics first.
- **Progress:** saved in the browser (localStorage key `dat-prep-v1`), with Back up / Restore under Me. Keep the key and only add fields (with defaults in `blank()`), so saved progress always loads.
- **Lessons:** `js/lessons.js` is the engine (Explore → Rule → Walk through it → Your turn, like the Geometry Lab); each lesson is a file in `js/lessons/` registered with `DATLessons.add`. Prototype lessons: stoichiometry, cellular respiration, PAT angle discrimination. Your turn questions are generated fresh and feed the skill matrix. Check generators with `node test/check-lessons.js`.
- **Interactives** (`js/viz/`): `mito.js` (follow a glucose; animated electron transport chain; blocker lab), `mixer.js` (molecule mixer for limiting reagent). Rule for every lesson: teach first, then test. Explore teaches with no questions; predict-then-watch labs (`lesson.lab`) sit after the rule; walk steps can carry a `tool` (e.g. the angle rotation slider).
- **Notes:** a Notes button on every screen opens the note for the current lesson (or a general notebook); key points can be added with one tap; Learn → My notes lists, searches, downloads and prints them.
- **Next:** Perceptual Ability and Quantitative Reasoning practice, then science lessons with practice, then Reading and full-length tests. Accounts can be added later (separate `dat_*` tables in Supabase).
- **Shared code:** `js/core.js` (random numbers, answer choices, number formatting) is copied from Test Prep Hub (vinunairs/psat-sprint).
- **Releases:** bump the `?v=` query on every script and stylesheet in `index.html` so browsers load the new files.

Questions and lessons are original. DAT is a registered trademark of the ADA, which is not affiliated with this site.
