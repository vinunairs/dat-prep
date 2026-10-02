/* DAT Prep — app shell, plan, and screens. Progress saves on this device (localStorage);
   Back up / Restore move it between devices. Accounts and cloud sync can be added later
   without changing the saved format. */
(function () {
  "use strict";
  const S = window.DATSyllabus;
  const L = window.DATLessons || { list: [], byId: {}, byTopic: {}, render: () => [] };
  const KEY = "dat-prep-v1";
  const DAY = 864e5;

  /* ---------- State ---------- */
  function blank() {
    return {
      v: 1, updatedAt: 0,
      settings: { name: "", date: null, target: null, hours: 15, setup: false },
      conf: {},      // topicId -> 0 new, 1 shaky, 2 solid (self-rating)
      skills: {},    // topicId -> { n, c, last } from practice (filled in by later phases)
      lessons: {},   // lessonId -> { st: stages done, walk: step, best, done: date }
      notes: {},     // lessonId or "general" -> { t: text, u: ms }
      activity: {},  // date -> { q, c, min }
      tests: [], mistakes: [], practice: [], checks: {}, theme: null
    };
  }
  function merge(base, x) {
    if (!x || typeof x !== "object" || Array.isArray(x)) return base;
    for (const k of Object.keys(base)) {
      if (!(k in x)) continue;
      const b = base[k], v = x[k];
      if (b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v) && k === "settings") base[k] = Object.assign({}, b, v);
      else base[k] = v;
    }
    for (const k of Object.keys(x)) if (!(k in base)) base[k] = x[k]; // keep fields added by later versions
    return base;
  }
  function load() { try { return merge(blank(), JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) { return blank(); } }
  let state = load();
  function save() { state.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Couldn't save on this device (storage is full or blocked)."); } document.dispatchEvent(new Event("dat-saved")); }

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v; else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat(3)) if (k != null && k !== false) e.append(k instanceof Node ? k : document.createTextNode(String(k)));
    return e;
  }
  const svg = (paths, cls) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); s.innerHTML = paths; return s; };
  const chev = () => svg('<path d="m9 6 6 6-6 6"/>', "chev");
  function toast(msg) { const t = el("div", { class: "toast", role: "status", text: msg }); $("#toasts").append(t); setTimeout(() => t.remove(), 3200); }
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const parseD = (s) => (s ? new Date(s + "T00:00:00") : null);
  const fmtD = (d, o) => d.toLocaleDateString(undefined, o || { month: "short", day: "numeric" });
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  function daysLeft() { const d = parseD(state.settings.date); if (!d) return null; const t = parseD(todayISO()); return Math.round((d - t) / DAY); }

  /* ---------- Plan ---------- */
  // Rough time budget: most students put in 200–300 hours over 2–3 months.
  const PHASES = [
    { id: "learn", name: "Build the foundation", desc: "A lesson for every science topic, with short PAT and Quant drills a few times a week so those skills build steadily." },
    { id: "practice", name: "Practice and fix weak spots", desc: "Mixed question sets by section, timed sections, and the Mistake notebook. Lessons only for topics still shaky." },
    { id: "tests", name: "Full-length tests", desc: "One full-length test a week (two in the last two weeks), each followed by a full review of every miss." },
    { id: "final", name: "Final days", desc: "Light review, rest, and test-day logistics. No new content and no full-length test in the last 2 days." }
  ];
  function phaseDates() {
    const left = daysLeft();
    if (left == null || left < 0) return null;
    const start = parseD(todayISO()), test = parseD(state.settings.date);
    const final = Math.min(3, left);
    const rest = left - final;
    const testsLen = Math.min(rest, Math.max(7, Math.round(rest * 0.25)));
    const practiceLen = Math.round((rest - testsLen) * 0.4);
    const learnLen = rest - testsLen - practiceLen;
    const add = (d, n) => new Date(d.getTime() + n * DAY);
    const a = add(start, learnLen), b = add(a, practiceLen), c = add(b, testsLen);
    return [
      { ...PHASES[0], from: start, to: a, days: learnLen },
      { ...PHASES[1], from: a, to: b, days: practiceLen },
      { ...PHASES[2], from: b, to: c, days: testsLen },
      { ...PHASES[3], from: c, to: test, days: final }
    ].filter((p) => p.days > 0);
  }
  function currentPhase(ph) { if (!ph) return null; const t = parseD(todayISO()); return ph.find((p) => t >= p.from && t < p.to) || ph[ph.length - 1]; }

  // Science topics in a study order that rotates Biology → Gen Chem → Orgo, new and shaky topics first.
  function scienceOrder() {
    // Spread each section's topics evenly across the whole learning phase, so every week mixes sections.
    const slots = [];
    ["bio", "gc", "oc"].forEach((id, k) => {
      const l = S.byId[id].topics.slice().sort((x, y) => (state.conf[x.id] || 0) - (state.conf[y.id] || 0) || y.w - x.w);
      l.forEach((t, i) => slots.push({ t, pos: (i + 0.5) / l.length + k * 1e-3 }));
    });
    return slots.sort((a, b) => a.pos - b.pos).map((x) => x.t);
  }
  function weekPlan() {
    const ph = phaseDates();
    const order = scienceOrder();
    if (!ph) return { weeks: [], order };
    const learn = ph.find((p) => p.id === "learn");
    const weeks = Math.max(1, Math.min(order.length, Math.ceil((learn ? learn.days : 7) / 7)));
    const out = Array.from({ length: weeks }, () => []);
    order.forEach((t, i) => out[Math.floor((i * weeks) / order.length)].push(t));
    return { weeks: out, order };
  }


  /* ---------- Practice results ---------- */
  function record(topicId, ok) {
    const sk = (state.skills[topicId] = state.skills[topicId] || { n: 0, c: 0, last: null });
    sk.n++; if (ok) sk.c++; sk.last = todayISO();
    const a = (state.activity[todayISO()] = state.activity[todayISO()] || { q: 0, c: 0 });
    a.q++; if (ok) a.c++;
    save();
  }

  /* ---------- Notes ---------- */
  // One note per lesson plus a general notebook. Autosaves while typing.
  const noteTitle = (id) => (id === "general" ? "General notebook" : L.byId[id] ? L.byId[id].title : id);
  const noteWhere = (id) => (L.byId[id] ? S.byId[L.byId[id].section].name + " › " + S.byId[L.byId[id].topic].name : "Anything that isn't tied to one lesson");
  const notes = {
    get(id) { return (state.notes[id] && state.notes[id].t) || ""; },
    set(id, t) { state.notes[id] = { t, u: Date.now() }; save(); },
    append(id, line) {
      const cur = notes.get(id);
      notes.set(id, (cur && !cur.endsWith("\n") ? cur + "\n" : cur) + line + "\n");
      toast("Added to your notes");
      const ta = $("#notesTa"); if (ta && ta.dataset.id === id) ta.value = notes.get(id);
    },
    open(id, docked) {
      id = id || currentNoteId();
      closeNotes();
      const ta = el("textarea", { id: "notesTa", "data-id": id, "aria-label": "Notes for " + noteTitle(id), placeholder: "Write a rule in your own words, a trick, or a question to look up later.\n\nThe “Add to notes” buttons in a lesson put key points here for you." });
      ta.value = notes.get(id);
      const status = el("span", { class: "tiny muted", role: "status" });
      let t = null;
      const flush = () => { clearTimeout(t); notes.set(id, ta.value); };
      ta.addEventListener("input", () => { status.textContent = "Saving…"; clearTimeout(t); t = setTimeout(() => { notes.set(id, ta.value); status.textContent = "Saved"; }, 400); });
      const panel = el("aside", { class: "notes-panel" + (docked ? " docked" : ""), role: docked ? "complementary" : "dialog", "aria-label": "Notes" },
        el("header", {}, el("div", {}, el("div", { class: "tiny muted", text: noteWhere(id) }), el("strong", { text: noteTitle(id) })),
          el("button", { type: "button", class: "btn small", onclick: () => { flush(); if (docked) { state.notesHidden = true; save(); } closeNotes(); } }, docked ? "Hide" : "Done")),
        ta,
        el("div", { class: "row between" }, status, el("button", { type: "button", class: "btn small ghost", onclick: () => { flush(); closeNotes(); go("notes"); } }, "All notes")));
      document.body.append(panel); document.body.classList.add("notes-open");
      $("#notesBtn").setAttribute("aria-expanded", "true");
      if (!docked) setTimeout(() => ta.focus(), 50);
    }
  };
  const wide = window.matchMedia("(min-width: 1100px)");
  wide.addEventListener("change", () => { if (!wide.matches) { const p = $(".notes-panel.docked"); if (p) { const ta = $("#notesTa"); notes.set(ta.dataset.id, ta.value); closeNotes(); } } else render(); });
  function closeNotes() { const p = $(".notes-panel"); if (p) p.remove(); document.body.classList.remove("notes-open"); const b = $("#notesBtn"); if (b) b.setAttribute("aria-expanded", "false"); }
  function currentNoteId() { return tab === "learn" && view && L.byId[view] ? view : "general"; }

  function NotesPage() {
    const ids = ["general", ...L.list.map((l) => l.id), ...Object.keys(state.notes).filter((k) => k !== "general" && !L.byId[k])];
    const q = el("input", { type: "search", placeholder: "Search notes", "aria-label": "Search notes", class: "search" });
    const listBox = el("div", { class: "list" });
    function paint() {
      listBox.textContent = "";
      const term = q.value.trim().toLowerCase();
      const shown = ids.filter((id) => (id === "general" || notes.get(id)) && (!term || (noteTitle(id) + " " + noteWhere(id) + " " + notes.get(id)).toLowerCase().includes(term)));
      if (!shown.length) listBox.append(el("p", { class: "muted", text: "No notes match “" + q.value.trim() + "”." }));
      for (const id of shown) {
        const n = state.notes[id], les = L.byId[id];
        listBox.append(el("article", { class: "note-item" + (les ? " c-" + les.section : "") },
          el("div", { class: "row between", style: "align-items:flex-start" },
            el("div", {}, el("div", { class: "crumb" }, les ? el("span", { class: "dot" }) : null, noteWhere(id)), el("h3", { style: "margin:2px 0 0", text: noteTitle(id) })),
            el("div", { class: "row", style: "gap:4px;flex:none" },
              les ? el("button", { type: "button", class: "btn small ghost", onclick: () => go("learn", id) }, "Open lesson") : null,
              el("button", { type: "button", class: "btn small", onclick: () => notes.open(id) }, "Edit"))),
          el("div", { class: "note-text", text: notes.get(id) || "Empty. Tap Edit to start." }),
          n && n.u ? el("div", { class: "tiny muted", text: "Edited " + new Date(n.u).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }) : null));
      }
    }
    q.addEventListener("input", paint);
    paint();
    return [el("h1", { text: state.settings.name || "Me" }), ME_NAV(),
      el("p", { class: "lede", text: "One page for each lesson, plus a general notebook. The Notes button at the top opens the page for wherever you are." }),
      el("div", { class: "row", style: "margin-bottom:16px" }, q,
        el("button", { type: "button", class: "btn small", onclick: downloadNotes }, "Download"),
        el("button", { type: "button", class: "btn small", onclick: () => window.print() }, "Print")),
      listBox];
  }
  function downloadNotes() {
    const ids = Object.keys(state.notes).filter((id) => notes.get(id).trim());
    const txt = "DAT Prep notes, " + todayISO() + "\n\n" + ids.map((id) => "## " + noteTitle(id) + "\n" + noteWhere(id) + "\n\n" + notes.get(id).trim()).join("\n\n");
    const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })), download: "dat-notes-" + todayISO() + ".txt" });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Lessons: what's next ---------- */
  // Lessons in the order the plan teaches their topics; the first one not finished is "up next".
  function lessonOrder() {
    const pos = {}; scienceOrder().forEach((t, i) => (pos[t.id] = i));
    return L.list.slice().sort((a, b) => (pos[a.topic] ?? 99) - (pos[b.topic] ?? 99));
  }
  function nextLesson(afterId) {
    const order = lessonOrder().filter((l) => l.id !== afterId);
    return order.find((l) => !(state.lessons[l.id] || {}).done && (state.lessons[l.id] || {}).st) || order.find((l) => !(state.lessons[l.id] || {}).done) || null;
  }
  const lessonState = (l) => { const p = state.lessons[l.id] || {}; return p.done ? "done" : p.st ? "started" : "new"; };
  const lessonVerb = (l) => ({ done: "Review lesson", started: "Continue lesson", new: "Start lesson" })[lessonState(l)];

  // Context for the Practice and Tests modules.
  let practicePreset = null;
  const fmtDay = (iso) => fmtD(parseD(iso));
  function modCtx() {
    const c = { el, get state() { return state; }, save: () => save(), go, L, S, record, toast, today: todayISO, fmtDay, back, chev, subnav, view, preset: practicePreset };
    practicePreset = null;
    return c;
  }
  const lessonCtx = {
    get state() { return state; }, save: () => save(), el, toast, go, record, notes, today: todayISO,
    sectionName: (id) => S.byId[id].name, topicName: (id) => S.byId[id].name,
    nextLesson, mastery: (id) => mastery(id), openNotes: (id) => toggleNotes(id),
    practice: (lessonId) => { practicePreset = lessonId; go("practice"); }
  };

  /* ---------- Shell ---------- */
  const TABS = ["today", "learn", "practice", "tests", "me", "notes"]; // notes is a page without its own tab
  let tab = "today", view = null; // view: a sub-page such as a section or lesson in Learn
  function go(t, v) { tab = t; view = v || null; history.replaceState(null, "", "#" + t + (v ? "/" + v : "")); render(); window.scrollTo(0, 0); }
  function fromHash() {
    let [t, v] = (location.hash.slice(1) || "today").split("/");
    tab = TABS.includes(t) ? t : "today"; view = v || null;
  }
  const back = (label, fn) => el("button", { type: "button", class: "back", onclick: fn }, "‹ " + label);
  // Segmented sub-navigation for related views under one tab (like Test Prep Hub).
  const subnav = (items, cur) => el("nav", { class: "subnav", "aria-label": "Views" },
    items.map(([t, v, label]) => el("button", { type: "button", "aria-current": cur === (t + "/" + (v || "")) ? "page" : null, onclick: () => go(t, v) }, label)));
  const ME_NAV = () => subnav([["me", null, "Progress"], ["notes", null, "Notes"], ["me", "settings", "Settings"]], tab + "/" + (view || ""));

  function render() {
    const navTab = tab === "notes" ? "me" : tab;
    document.querySelectorAll(".tabs button").forEach((b) => { if (b.dataset.tab === navTab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.body.dataset.tab = tab;
    const m = $("#main"); m.textContent = "";
    const screens = { today: Today, learn: Learn, practice: () => window.DATPractice.Practice(modCtx()), tests: () => window.DATTest.Tests(modCtx()), me: Me, notes: NotesPage };
    m.append(...[].concat(screens[tab]()).filter((n) => n != null && n !== false));
    paintBar();
    // On wide screens a lesson keeps its notes open beside it; elsewhere notes open on demand.
    const onLesson = tab === "learn" && view && L.byId[view];
    const open = $(".notes-panel"), ta = $("#notesTa");
    if (open && ta && (!onLesson || ta.dataset.id !== view)) { notes.set(ta.dataset.id, ta.value); closeNotes(); }
    if (onLesson && wide.matches && !state.notesHidden && !$(".notes-panel")) notes.open(view, true);
    document.title = (tab === "today" ? "" : (onLesson ? L.byId[view].title : ({ notes: "Notes", me: "Me", learn: "Learn", practice: "Practice", tests: "Tests" })[tab]) + " · ") + "DAT Prep";
    if (!state.settings.setup && tab === "today") setTimeout(() => { if (!state.settings.setup) openSetup(); }, 50);
  }
  function paintBar() {
    const left = daysLeft();
    $("#barCount").textContent = left == null ? "Set test date" : left > 0 ? plural(left, "day") + " left" : left === 0 ? "Test day" : "Test done";
  }
  function toggleNotes(id) {
    if ($(".notes-panel")) { const ta = $("#notesTa"); if (ta) notes.set(ta.dataset.id, ta.value); closeNotes(); if (wide.matches && tab === "learn" && L.byId[view]) { state.notesHidden = true; save(); } return; }
    const onLesson = tab === "learn" && view && L.byId[view];
    if (onLesson && wide.matches) { state.notesHidden = false; save(); notes.open(id || view, true); } else notes.open(id);
  }

  /* ---------- Setup ---------- */
  function openSetup() {
    if ($(".overlay")) return;
    const st = state.settings;
    const name = el("input", { type: "text", id: "suName", maxlength: "40", autocomplete: "given-name", value: st.name || "" });
    const date = el("input", { type: "date", id: "suDate", value: st.date || "", min: todayISO(), "aria-describedby": "suDateHint" });
    const target = el("input", { type: "number", id: "suTarget", min: "200", max: "600", step: "10", inputmode: "numeric", value: st.target || "", placeholder: "For example, 450", "aria-describedby": "suTargetHint" });
    const hours = el("select", { id: "suHours" }, [8, 10, 15, 20, 25, 30].map((h) => el("option", { value: String(h), text: h + " hours a week" + (h === 15 ? " (about 2 a day)" : h === 25 ? " (full-time summer)" : "") })));
    hours.value = String(st.hours || 15);
    const unsure = el("button", { type: "button", class: "linkbtn", onclick: () => { const d = new Date(Date.now() + 84 * DAY); date.value = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); } }, "plan for 12 weeks from today");
    const msg = el("p", { class: "err", role: "alert" });
    const form = el("form", { class: "dialog", "aria-labelledby": "suT", role: "dialog", "aria-modal": "true" },
      el("header", {}, el("h2", { id: "suT", text: st.setup ? "Your test and plan" : "Welcome to DAT Prep" }),
        st.setup ? el("button", { type: "button", class: "btn small ghost", onclick: closeOverlay }, "Close") : null),
      st.setup ? null : el("p", { class: "muted small", text: "Three quick answers and your study plan builds itself around your test date. You can change them any time under Me." }),
      st.setup || !window.DATSync || window.DATSync.code ? null : (() => {
        // Started on another device? Load that progress with the personal code instead.
        const box = el("div", { class: "codeentry", hidden: true });
        const inp = el("input", { type: "text", id: "suCode", placeholder: "For example, NIRA-XXXX-XXXX", autocomplete: "off", "aria-label": "Personal code", style: "text-transform:uppercase" });
        const m = el("p", { class: "err", role: "alert" });
        box.append(el("div", { class: "row" }, inp, el("button", { type: "button", class: "btn", onclick: async () => { m.textContent = "Checking…"; const ok = await window.DATSync.useCode(inp.value); if (ok) { m.textContent = ""; closeOverlay(); render(); } else m.textContent = "That code didn't work. Check it and try again."; } }, "Load my progress")), m);
        return el("div", { class: "have-code" }, el("button", { type: "button", class: "linkbtn", onclick: (e) => { box.hidden = false; e.currentTarget.hidden = true; inp.focus(); } }, "Already started on another device? Enter your personal code"), box);
      })(),
      el("label", { class: "f", for: "suName" }, "First name", name),
      el("div", { class: "f" }, el("label", { for: "suDate" }, "DAT test date"),
        el("span", { class: "hint", id: "suDateHint" }, "Not booked yet? Pick a target date, or ", unsure, "."), date),
      el("div", { class: "grid2" },
        el("label", { class: "f", for: "suHours" }, "Study time", hours),
        el("div", { class: "f" }, el("label", { for: "suTarget" }, "Target score (optional)"), el("span", { class: "hint", id: "suTargetHint", text: "On the 200–600 scale. Your schools' averages are a good target." }), target)),
      msg,
      el("div", { class: "row" }, el("button", { type: "submit", class: "btn primary" }, st.setup ? "Save" : "Build my plan")));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = target.value ? Math.round(+target.value / 10) * 10 : null;
      if (t != null && (t < 200 || t > 600)) { msg.textContent = "Target scores run from 200 to 600."; target.focus(); return; }
      if (date.value && date.value < todayISO()) { msg.textContent = "Pick a date from today on."; date.focus(); return; }
      Object.assign(state.settings, { name: name.value.trim(), date: date.value || null, target: t, hours: +hours.value, setup: true });
      save(); closeOverlay(); render(); toast(date.value ? "Your plan is ready" : "Saved. Add a test date when you have one.");
    });
    const ov = el("div", { class: "overlay", onclick: (e) => { if (e.target === ov && state.settings.setup) closeOverlay(); } }, form);
    document.body.append(ov); name.focus();
  }
  function closeOverlay() { const o = $(".overlay"); if (o) o.remove(); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if ($(".overlay") && state.settings.setup) closeOverlay(); else if ($(".notes-panel:not(.docked)")) { const ta = $("#notesTa"); if (ta) notes.set(ta.dataset.id, ta.value); closeNotes(); } } });

  /* ---------- Today ---------- */
  const SETUP_STEPS = [
    { id: "format", t: "Learn how the test works", s: "Sections, timing, scoring and test-day rules, in five minutes.", act: () => go("learn", "dat"), a: "Read it" },
    { id: "lesson", auto: () => Object.values(state.lessons).some((p) => p.done), t: "Finish your first lesson", s: "Explore, learn the rule, walk through one, then try it yourself.", act: () => { const n = nextLesson(); go("learn", n ? n.id : undefined); }, a: "Start" },
    { id: "practiced", auto: () => (state.practice || []).length > 0, t: "Do a practice set", s: "Five fresh questions with explanations.", act: () => go("practice"), a: "Practice" },
    { id: "tested", auto: () => (state.tests || []).length > 0, t: "Take the sample test", s: "Timed like the real DAT, about 9 minutes.", act: () => go("tests"), a: "Open" },
    { id: "rate", t: "Rate the science topics you already know", s: "New, shaky or solid. It decides which lessons come first.", act: () => go("learn"), a: "Rate topics" },
    { id: "pat", t: "Read the official PAT instructions", s: "The ADA strongly recommends it before test day.", href: "https://www.ada.org/DAT", a: "Open ADA.org" },
    { id: "ada", t: "Try the free ADA sample questions", s: "A first look at the real question style.", href: "https://www.ada.org/DAT", a: "Open ADA.org" },
    { id: "dentpin", t: "Get a DENTPIN when you're ready to register", s: "You need it to apply. Your name must match your ID exactly.", href: "https://www.ada.org/DENTPIN", a: "Open ADA.org" }
  ];
  function Today() {
    const st = state.settings, left = daysLeft(), ph = phaseDates(), now = currentPhase(ph);
    const weeksLeft = left != null && left > 0 ? Math.ceil(left / 7) : null;
    const hoursTotal = weeksLeft ? weeksLeft * st.hours : null;
    const hr = new Date().getHours();
    const hello = (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + (st.name ? ", " + st.name : "");

    // Gradient band: greeting, test date, countdown.
    const band = el("section", { class: "band", "aria-label": "Countdown" },
      el("div", {}, el("h1", { class: "hello", text: hello }),
        el("span", { class: "eyebrow", text: st.date ? "DAT · " + fmtD(parseD(st.date), { weekday: "long", month: "short", day: "numeric" }) : "DAT · no date yet" })),
      left == null ? el("button", { type: "button", class: "btn small set", onclick: openSetup }, "Set test date")
        : left < 0 ? el("button", { type: "button", class: "btn small set", onclick: openSetup }, "Set new date")
        : el("div", { class: "count" }, el("b", { class: "num", text: String(left) }), el("span", {}, left === 1 ? "day" : "days", el("em", { text: "to test day" }))));
    const out = [band];

    if (left != null && left > 3 && hoursTotal < 150)
      out.push(el("div", { class: "callout warn" }, el("div", {}, el("strong", { text: "Tight timeline. " }), "Most students study 200–300 hours. You have about " + hoursTotal + ". Add hours each week, or consider a later date (rescheduling fees depend on notice).")));
    const hasProgress = Object.keys(state.lessons).length || Object.keys(state.conf).length || Object.values(state.notes).some((n) => n && n.t);
    const lastBk = state.checks.backup ? parseD(state.checks.backup) : null;
    const online = !!(window.DATSync && window.DATSync.code);
    if (hasProgress && !online && (!lastBk || (parseD(todayISO()) - lastBk) / DAY >= 7))
      out.push(el("div", { class: "callout" }, el("div", {}, el("strong", { text: lastBk ? "Time for a backup. " : "Back up your progress. " }), "It's saved only in this browser. A backup file keeps it safe and moves it to another device."),
        el("button", { type: "button", class: "btn small", onclick: backup }, "Back up now")));

    // This week's items.
    const items = [];
    if (now) {
      const wp = weekPlan();
      const learn = ph.find((p) => p.id === "learn");
      const weekIdx = learn ? Math.floor((parseD(todayISO()) - learn.from) / (7 * DAY)) : 0;
      if (now.id === "learn") {
        const topics = wp.weeks[Math.min(weekIdx, wp.weeks.length - 1)] || [];
        items.push(...topics.map((t) => ({ sec: t.section, text: t.name, sub: S.byId[t.section].name, lesson: (L.byTopic[t.id] || [])[0] })));
        items.push({ sec: "pat", text: "Perceptual Ability drills", sub: "15 minutes, 4 days this week", soon: true });
        items.push({ sec: "qr", text: "Quantitative Reasoning set", sub: "2 short sets this week", soon: true });
        if (weekIdx % 2 === 1) items.push({ sec: "rc", text: "One timed reading passage", sub: "20 minutes", soon: true });
      } else if (now.id === "practice") {
        items.push(...weakest(3).map((t) => ({ sec: t.section, text: t.name, sub: "Weak spot: review the lesson, then practice", lesson: (L.byTopic[t.id] || [])[0] })));
        items.push({ sec: "pat", text: "Timed PAT subtests", sub: "2 full subtests, 3 days this week", soon: true }, { sec: "rc", text: "Timed reading passages", sub: "2 this week", soon: true }, { sec: "qr", text: "Timed Quant set", sub: "20 questions, twice", soon: true });
      } else if (now.id === "tests") {
        items.push({ sec: null, text: "Full-length practice test", sub: "4 h 15 min, same time of day as your real test", soon: true }, { sec: null, text: "Review every missed question", sub: "It takes as long as the test itself" });
        items.push(...weakest(2).map((t) => ({ sec: t.section, text: t.name, sub: "Weak spot from your tests", lesson: (L.byTopic[t.id] || [])[0] })));
      } else items.push({ sec: null, text: "Light review of your notes", sub: "30–60 minutes a day at most" }, { sec: null, text: "Pack two IDs and confirm the test center", sub: "Arrive 30 minutes early" }, { sec: null, text: "Sleep", sub: "It's worth more points than one more set" });
    }
    const withLesson = items.filter((it) => it.lesson);
    const doneN = withLesson.filter((it) => lessonState(it.lesson) === "done").length;

    // Main card: this week, with the one thing to do next.
    const nx = nextLesson();
    const card = el("section", { class: "card mission today-card", "aria-label": "This week" },
      el("span", { class: "eyebrow", text: "This week" + (now ? " · " + now.name : "") }),
      el("h2", { text: nx ? (lessonState(nx) === "started" ? "Pick up where you left off" : "Your next step") : L.list.length ? "You're caught up on lessons" : "Your plan" }),
      withLesson.length ? el("div", { class: "today-meta" }, el("span", { text: doneN + " of " + plural(withLesson.length, "lesson") + " done" }), el("span", { text: "about " + st.hours + " hours this week" })) : null,
      withLesson.length ? el("div", { class: "tmeter", "aria-hidden": "true" }, el("i", { style: "width:" + Math.round((doneN / withLesson.length) * 100) + "%" })) : null,
      nx ? el("div", { class: "upnext c-" + nx.section },
        el("span", { class: "eyebrow", text: "Up next · " + S.byId[nx.section].name + " · about " + nx.minutes + " min" }),
        el("p", { class: "upnext-t", text: nx.title }),
        el("p", { text: nx.intro }),
        el("button", { type: "button", class: "btn primary", onclick: () => go("learn", nx.id) }, lessonVerb(nx)))
        : L.list.length ? el("div", { class: "upnext" }, el("span", { class: "eyebrow", text: "Keep it fresh" }), el("p", { class: "upnext-t", text: "Practice what you've learned" }), el("p", { text: "Fresh questions every time, from every lesson you've finished." }), el("button", { type: "button", class: "btn primary", onclick: () => go("practice") }, "Practice")) : null,
      items.length ? el("span", { class: "eyebrow then", text: "Then" }) : null,
      items.length ? el("ul", { class: "tasks" }, items.map((it) => {
        const ls = it.lesson ? lessonState(it.lesson) : null;
        const label = it.lesson ? el("button", { type: "button", class: "tlink", onclick: () => go("learn", it.lesson.id) }, it.text, el("span", { class: "arr", "aria-hidden": "true", text: " →" }))
          : el("span", { class: "t", text: it.text });
        return el("li", { class: "task" + (ls === "done" ? " done" : "") + (it.sec ? " c-" + it.sec : "") },
          el("span", { class: "bubble" + (ls === "done" ? " on" : "") + (it.soon ? " soon" : ""), "aria-hidden": "true", text: ls === "done" ? "✓" : "" }),
          el("div", { class: "grow" }, label,
            el("span", { class: "s" }, it.sec ? el("span", { class: "sdot" }) : null, it.sub, it.lesson ? el("span", { class: "tmin", text: it.lesson.minutes + " min" }) : it.soon ? el("span", { class: "tmin soon", text: "Coming soon" }) : null)));
      })) : null,
      items.some((it) => it.lesson) ? el("p", { class: "tiny muted", style: "margin:4px 0 0", text: "Lessons tick themselves when you finish them." }) : null);

    // Side: getting started and the road to test day.
    const isDone = (x) => (x.auto ? x.auto() : !!state.checks[x.id]);
    const done = SETUP_STEPS.filter(isDone).length;
    const side = el("div", { class: "today-side" });
    if (done < SETUP_STEPS.length) side.append(el("section", { class: "card", "aria-label": "Start here" },
      el("span", { class: "eyebrow", text: "Getting started · " + done + " of " + SETUP_STEPS.length }),
      el("h2", { style: "margin:4px 0 6px", text: "Start here" }),
      el("ul", { class: "tasks" }, SETUP_STEPS.map((x) => {
        const d = isDone(x);
        const bub = el("button", { type: "button", class: "bubble", "aria-pressed": String(d), disabled: !!x.auto, "aria-label": (d ? "Done: " : "Mark done: ") + x.t, title: x.auto ? "Ticks itself when you do it" : null,
          onclick: () => { if (x.auto) return; if (state.checks[x.id]) delete state.checks[x.id]; else state.checks[x.id] = todayISO(); save(); render(); } }, d ? "✓" : "");
        const go_ = x.href ? el("a", { class: "tlink", href: x.href, target: "_blank", rel: "noopener" }, x.t, el("span", { class: "arr", "aria-hidden": "true", text: " ↗" }), el("span", { class: "sr", text: " (opens in a new tab)" }))
          : el("button", { type: "button", class: "tlink", onclick: x.act }, x.t, el("span", { class: "arr", "aria-hidden": "true", text: " →" }));
        return el("li", { class: "task" + (d ? " done" : "") }, bub, el("div", { class: "grow" }, go_, el("span", { class: "s", text: x.s })));
      }))));
    if (ph) side.append(el("details", { class: "card fold", open: wide.matches },
      el("summary", {}, "Your road to test day"),
      el("ol", { class: "road" }, ph.map((p) => {
        const t = parseD(todayISO()), cls = p === now ? "now" : t >= p.to ? "past" : "";
        return el("li", { class: cls, "aria-current": p === now ? "step" : null },
          el("div", { class: "row between" }, el("strong", { text: p.name }), el("span", { class: "tiny muted num", text: fmtD(p.from) + "–" + fmtD(new Date(p.to.getTime() - DAY)) })),
          el("div", { class: "muted small", text: p.desc }));
      }))));
    out.push(el("div", { class: "today-grid" }, card, side));
    return out;
  }
  function weakest(n) {
    const all = S.SECTIONS.flatMap((s) => s.topics);
    return all.map((t) => ({ t, m: mastery(t.id).v })).sort((a, b) => a.m - b.m || b.t.w - a.t.w).slice(0, n).map((x) => x.t);
  }

  /* ---------- Learn ---------- */
  const CONF = ["New", "Shaky", "Solid"];
  function sectionProgress(s) {
    const rated = s.topics.filter((t) => state.conf[t.id] != null).length;
    const ls = s.topics.flatMap((t) => L.byTopic[t.id] || []);
    return { rated, lessons: ls.length, done: ls.filter((l) => lessonState(l) === "done").length };
  }
  function Learn() {
    if (view === "notes") { go("notes"); return []; }
    if (view === "dat") return HowItWorks();
    if (view && L.byId[view]) return L.render(L.byId[view], lessonCtx);
    if (view && S.byId[view] && S.byId[view].topics) return LearnSection(S.byId[view]);
    const out = [el("h1", { text: "Learn" }), el("p", { class: "lede", text: "Everything on the 2026 DAT, section by section. Lessons teach each topic step by step; rating topics tells your plan where to start." })];
    const nx = nextLesson();
    if (nx) out.push(el("button", { type: "button", class: "continue c-" + nx.section, onclick: () => go("learn", nx.id) },
      el("span", { class: "grow" }, el("span", { class: "s", text: (lessonState(nx) === "started" ? "Continue" : "Up next") + " · " + S.byId[nx.section].name }), el("span", { class: "t", text: nx.title })), chev()));
    out.push(el("button", { type: "button", class: "navrow", onclick: () => go("learn", "dat") },
      el("span", { class: "ico info", "aria-hidden": "true", text: "i" }),
      el("span", { class: "grow" }, el("span", { class: "t", text: "How the DAT works" }), el("span", { class: "s", text: "Sections, timing, scoring and test-day rules" })), chev()));
    const groups = [["Survey of the Natural Sciences", "100 questions in 90 minutes", ["bio", "gc", "oc"]], ["Skills sections", "Each timed on its own", ["pat", "rc", "qr"]]];
    for (const [g, sub, ids] of groups) {
      out.push(el("div", { class: "group-head" }, el("h2", { text: g }), el("span", { class: "muted small", text: sub })));
      out.push(el("div", { class: "list" }, ids.map((id) => {
        const s = S.byId[id], pr = sectionProgress(s);
        const parts = [s.items + " questions", pr.rated + " of " + s.topics.length + " topics rated"];
        if (pr.lessons) parts.push(pr.done + " of " + plural(pr.lessons, "lesson") + " done");
        return el("button", { type: "button", class: "navrow c-" + s.id, onclick: () => go("learn", s.id) },
          el("span", { class: "ico", "aria-hidden": "true", text: s.id.toUpperCase() }),
          el("span", { class: "grow" }, el("span", { class: "t", text: s.name }), el("span", { class: "s", text: parts.join(" · ") }),
            el("span", { class: "bar thin", "aria-hidden": "true" }, el("i", { style: "width:" + Math.round((pr.rated / s.topics.length) * 100) + "%" }))), chev());
      })));
    }
    return out;
  }
  function LearnSection(s) {
    const pr = sectionProgress(s);
    const out = [
      back("Learn", () => go("learn")),
      el("div", { class: "title-row c-" + s.id }, el("span", { class: "ico", "aria-hidden": "true", text: s.id.toUpperCase() }), el("h1", { text: s.name })),
      el("p", { class: "lede", text: s.blurb }),
      el("div", { class: "secprog c-" + s.id }, el("span", { class: "small", text: pr.rated + " of " + s.topics.length + " topics rated" + (pr.lessons ? " · " + pr.done + " of " + plural(pr.lessons, "lesson") + " done" : "") }),
        el("span", { class: "bar", "aria-hidden": "true" }, el("i", { style: "width:" + Math.round((pr.rated / s.topics.length) * 100) + "%" })))
    ];
    if (s.id === "oc") out.push(el("div", { class: "callout" }, "Topics follow the ADA's updated 2026 Organic Chemistry outline. The content hasn't changed; the topic names and lists are clearer."));
    if (s.id === "rc") out.push(el("div", { class: "callout" }, "The ADA lists Reading Comprehension as one skill. These groupings are study categories, not official subtopics."));
    out.push(el("ul", { class: "topics" }, s.topics.map((t) => {
      const c = state.conf[t.id];
      const seg = el("div", { class: "seg", role: "group", "aria-label": "How well do you know " + t.name + "?" },
        CONF.map((label, i) => el("button", { type: "button", "aria-pressed": String(c === i), onclick: () => { state.conf[t.id] = i; if (Object.keys(state.conf).length >= 5) state.checks.rate = state.checks.rate || todayISO(); save(); render(); } }, label)));
      const ls = L.byTopic[t.id] || [];
      return el("li", { class: "topic" },
        el("h3", { text: t.name }),
        ls.length ? ls.map((l) => el("button", { type: "button", class: "lessonlink " + lessonState(l), onclick: () => go("learn", l.id) },
          el("span", { class: "grow" }, el("span", { class: "t", text: l.title }), el("span", { class: "s", text: l.minutes + " min · " + ({ done: "Done ✓", started: "In progress", new: "Not started" })[lessonState(l)] })),
          el("span", { class: "go", text: lessonVerb(l) }))) : el("p", { class: "muted small", style: "margin:0", text: "Lesson coming soon" }),
        el("div", { class: "rate" }, el("span", { class: "small", text: c == null ? "How well do you know it?" : "You rated it" }), seg),
        el("details", {}, el("summary", {}, "What's covered (" + t.subs.length + ")"), el("ul", {}, t.subs.map((x) => el("li", { text: x })))));
    })));
    return out;
  }

  /* ---------- How the DAT works (reference) ---------- */
  function HowItWorks() {
    if (!state.checks.format) { state.checks.format = todayISO(); save(); }
    return [back("Learn", () => go("learn")),
      el("h1", { text: "How the DAT works" }),
      el("p", { class: "lede", text: "The whole test in one page, from the ADA's 2026 Candidate Guide. Read it once now and again the week before your test." }),
      el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Test day, in order" }), el("span", { class: "muted small", text: "5 h 15 min in total" })),
        el("ol", { class: "rows sched" }, S.SCHEDULE.map((r) => el("li", { class: "row-item" + (r.q ? "" : " optional") },
          el("div", { class: "grow" }, el("span", { class: "t", text: r.name }), el("span", { class: "s", text: r.q ? r.q + " questions · about " + Math.round((r.min * 60) / r.q) + " seconds each" : "Not scored" })),
          el("span", { class: "num strong", text: r.min + " min" })))),
        el("p", { class: "small muted", text: "Arrive at the Prometric test center at least 30 minutes early." })),
      el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "How scoring works" })),
        el("ul", { class: "bullets" },
          el("li", {}, el("strong", { text: "Scores run from 200 to 600" }), " in steps of 10. This scale replaced the old 1–30 scale on March 1, 2025, so older advice quoting scores like “20 AA” uses the old scale."),
          el("li", {}, el("strong", { text: "There's no penalty for guessing." }), " Never leave a question blank; flag it and come back if there's time."),
          el("li", {}, "Some questions are unscored experiments that look like the others. Don't let one strange question shake you."),
          el("li", {}, "There's no passing score. Each dental school decides what it looks for; compare with the ADA's published norms and your schools' averages."),
          el("li", {}, "Scores reach your schools in about 3–4 weeks, and every attempt is reported. Aim to take it once, ready."))),
      el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Rules worth knowing early" })),
        el("ul", { class: "bullets" },
          el("li", { text: "Bring two current IDs: a government photo ID with your signature, and a second with your name and signature. Names must match your DENTPIN record exactly." }),
          el("li", { text: "The center gives you two note boards and fine-tip markers; nothing else comes in. Practice on a whiteboard so it feels normal." }),
          el("li", { text: "The only scheduled break is 30 minutes, after Perceptual Ability. During any other break you can't use your phone, eat from your locker, study, or leave the center." }),
          el("li", { text: "Quantitative Reasoning has a basic on-screen calculator. The science section has a periodic table but no calculator." }),
          el("li", { text: "Retakes need 60 days between attempts, with up to 4 a year. The fee is $580 per attempt in 2026; a 50% fee waiver exists for financial hardship." }))),
      el("p", { class: "tiny muted" }, "Source: the ADA's ", el("a", { href: "https://www.ada.org/DAT", target: "_blank", rel: "noopener", text: "DAT 2026 Candidate Guide" }), " (updated Aug 4, 2026). Check ADA.org/DAT for changes before you register.")];
  }

  /* ---------- Me ---------- */
  function mastery(topicId) {
    const sk = state.skills[topicId];
    if (sk && sk.n >= 5) return { v: Math.round((sk.c / sk.n) * 100), src: "from " + sk.n + " questions", real: true };
    const c = state.conf[topicId];
    if (c != null) return { v: [10, 45, 75][c], src: "your rating: " + CONF[c].toLowerCase() };
    return { v: 0, src: "not started" };
  }
  function Me() {
    const st = state.settings;
    const out = [el("h1", { text: st.name || "Me" }), ME_NAV()];
    if (view === "settings") return out.concat(Settings());
    out.push(el("p", { class: "lede", text: "Your progress across lessons, practice and tests, and how strong each topic is." }));
    return out.concat(Progress());
  }
  function Settings() {
    const st = state.settings, out = [];
    out.push(el("section", { class: "block" },
      el("div", { class: "block-head" }, el("h2", { text: "Your test" }), el("button", { type: "button", class: "btn small", onclick: openSetup }, "Edit")),
      el("dl", { class: "facts" },
        el("dt", { text: "Test date" }), el("dd", { text: st.date ? fmtD(parseD(st.date), { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Not set" }),
        el("dt", { text: "Target score" }), el("dd", { text: st.target ? String(st.target) : "Not set" }),
        el("dt", { text: "Study time" }), el("dd", { text: st.hours + " hours a week" }))));
    return out.concat(SettingsRest());
  }
  function Progress() {
    const out = [];
    // Activity: practice, tests and mistakes in one place.
    const pr = state.practice || [], ts = state.tests || [], qN = pr.reduce((a, p) => a + p.n, 0), qR = pr.reduce((a, p) => a + p.right, 0);
    const lastT = ts[ts.length - 1];
    out.push(el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Your activity" })),
      el("div", { class: "stats3" },
        el("button", { type: "button", class: "stat", onclick: () => go("learn") }, el("b", { class: "num", text: String(Object.values(state.lessons).filter((p) => p.done).length) + " / " + L.list.length }), el("span", { text: "lessons done" })),
        el("button", { type: "button", class: "stat", onclick: () => go("practice") }, el("b", { class: "num", text: qN ? Math.round((qR / qN) * 100) + "%" : "—" }), el("span", { text: qN ? "right in practice (" + qN + " questions)" : "practice accuracy" })),
        el("button", { type: "button", class: "stat", onclick: () => go("tests") }, el("b", { class: "num", text: lastT ? lastT.right + "/" + lastT.total : "—" }), el("span", { text: lastT ? "last sample test" : "no tests yet" }))),
      (state.mistakes || []).length ? el("button", { type: "button", class: "navrow", style: "margin-top:8px", onclick: () => go("practice", "mistakes") },
        el("span", { class: "ico info", "aria-hidden": "true", text: "!" }), el("span", { class: "grow" }, el("span", { class: "t", text: "Mistake notebook" }), el("span", { class: "s", text: state.mistakes.length + " to retry" })), chev()) : null));

    // Skills: one summary row per section that opens to its topics.
    out.push(el("section", { class: "block" },
      el("div", { class: "block-head" }, el("h2", { text: "Your skills" })),
      el("p", { class: "muted small", text: "Starts from your own ratings, then switches to your real accuracy once a topic has 5 or more answered questions." }),
      el("div", { class: "skills" }, S.SECTIONS.map((s) => {
        const ms = s.topics.map((t) => mastery(t.id));
        const avg = Math.round(ms.reduce((a, m) => a + m.v, 0) / ms.length);
        const started = ms.filter((m) => m.v > 0).length;
        return el("details", { class: "skill c-" + s.id },
          el("summary", {}, el("span", { class: "dot" }), el("span", { class: "grow" }, el("span", { class: "t", text: s.name }), el("span", { class: "s", text: started + " of " + s.topics.length + " topics started" })),
            el("span", { class: "bar", "aria-hidden": "true" }, el("i", { style: "width:" + avg + "%" })), started ? el("span", { class: "pct num", text: avg + "%" }) : el("span", { class: "nodata", text: "No data" })),
          el("ul", {}, s.topics.map((t, i) => el("li", {},
            el("span", { class: "grow" }, el("span", { class: "t", text: t.name }), el("span", { class: "s", text: ms[i].src })),
            el("span", { class: "bar", "aria-hidden": "true" }, el("i", { style: "width:" + ms[i].v + "%" })), el("span", { class: "pct num", text: ms[i].v ? ms[i].v + "%" : "—" })))));
      }))));

    return out;
  }
  function SettingsRest() {
    const out = [];
    const sy = window.DATSync;
    if (sy) {
      const code = sy.code;
      if (code) {
        const link = location.origin + location.pathname + "?code=" + code;
        out.push(el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Online saving" }),
            el("span", { class: "chip" + (sy.status === "synced" ? " good" : ""), text: sy.status === "synced" ? "On · saved " + (sy.lastSynced ? sy.lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "") : sy.status === "syncing" ? "Saving…" : sy.status === "offline" ? "Offline: saved on this device" : "Couldn't reach the server" })),
          el("p", { class: "muted small", text: "Every change saves online. To use DAT Prep on another phone or computer, open your personal link there. Keep it private: anyone with it can see and change your progress." }),
          el("div", { class: "codebox" }, el("span", { class: "small muted", text: "Your personal code" }), el("strong", { class: "num", text: code })),
          el("div", { class: "row" },
            el("button", { type: "button", class: "btn primary", onclick: async () => { try { await navigator.clipboard.writeText(link); toast("Personal link copied"); } catch (e) { prompt("Copy your personal link:", link); } } }, "Copy my personal link"),
            el("button", { type: "button", class: "btn", onclick: () => sy.push().then(() => toast(sy.status === "synced" ? "Saved online" : "Couldn't save online right now")) }, "Save now"),
            el("button", { type: "button", class: "btn ghost", onclick: () => { if (confirm("Stop saving online on this device? Your progress stays here and online; open your personal link again to reconnect.")) { sy.forget(); render(); } } }, "Disconnect this device"))));
      } else {
        const inp = el("input", { type: "text", id: "codeIn", placeholder: "For example, NIRA-XXXX-XXXX", autocomplete: "off", "aria-label": "Personal code", style: "text-transform:uppercase" });
        const msg = el("p", { class: "err", role: "alert" });
        out.push(el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Online saving" }), el("span", { class: "chip", text: "Off" })),
          el("p", { class: "muted small", text: "Right now your progress is saved only in this browser. If you have a personal link or code, enter the code to save online and use any device." }),
          el("div", { class: "row" }, inp, el("button", { type: "button", class: "btn primary", onclick: async () => { msg.textContent = ""; const ok = await sy.useCode(inp.value); if (ok) render(); else msg.textContent = "That code didn't work. Check it and try again."; } }, "Save online")), msg));
      }
    }
    const file = el("input", { type: "file", accept: "application/json,.json", class: "sr", id: "restoreFile", onchange: () => restore(file) });
    out.push(el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Backup" }), el("span", { class: "muted small", text: state.checks.backup ? "Last backup " + fmtD(parseD(state.checks.backup)) : "Never backed up" })),
      el("p", { class: "muted small", text: window.DATSync && window.DATSync.code ? "Online saving already keeps your progress safe. A backup file is an extra copy you keep yourself." : "Your progress is saved only in this browser. A backup file keeps it safe and moves it to another device." }),
      el("div", { class: "row" }, el("button", { type: "button", class: "btn primary", onclick: backup }, "Back up progress"),
        el("label", { class: "btn", for: "restoreFile" }, "Restore a backup"), file)));

    out.push(el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Appearance" })),
      el("div", { class: "seg", role: "group", "aria-label": "Appearance" },
        [["", "Match device"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => el("button", { type: "button", "aria-pressed": String((state.theme || "") === v), onclick: () => { state.theme = v || null; save(); applyTheme(); render(); } }, l)))));

    out.push(el("section", { class: "block about" }, el("div", { class: "block-head" }, el("h2", { text: "About" })),
      el("p", { class: "small muted", text: "DAT Prep teaches with original lessons and questions written in the style of the test. The test outline comes from the ADA's 2026 DAT Candidate Guide. DAT® is a registered trademark of the American Dental Association, which is not affiliated with this site." }),
      el("details", { class: "danger" }, el("summary", {}, "Erase everything on this device"),
        el("p", { class: "small muted", text: "This removes your plan, ratings, lesson progress and notes from this browser. Back up first if you might want them." }),
        el("button", { type: "button", class: "btn small danger", onclick: () => { if (confirm("Erase all DAT Prep progress on this device? This can't be undone.")) { localStorage.removeItem(KEY); state = blank(); go("today"); } } }, "Erase everything"))));
    return out;
  }
  function backup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "dat-prep-backup-" + todayISO() + ".json" });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    state.checks.backup = todayISO(); save(); toast("Backup downloaded"); render();
  }
  function restore(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const x = JSON.parse(r.result);
        if (!x || x.v !== 1 || !x.settings) throw new Error("not a DAT Prep backup");
        if (!confirm("Replace the progress on this device with this backup?")) return;
        state = merge(blank(), x); save(); render(); toast("Backup restored");
      } catch (e) { toast("That file isn't a DAT Prep backup."); }
      input.value = "";
    };
    r.readAsText(f);
  }

  function applyTheme() { if (state.theme) document.documentElement.setAttribute("data-theme", state.theme); else document.documentElement.removeAttribute("data-theme"); }

  /* ---------- Boot ---------- */
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));
  $("#barCount").addEventListener("click", openSetup);
  $("#notesBtn").addEventListener("click", () => toggleNotes());
  window.addEventListener("hashchange", () => { fromHash(); render(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { state = load(); render(); } });
  applyTheme(); fromHash(); render();
  window.DATApp = {
    get state() { return state; }, blank, weekPlan, phaseDates, mastery, notes, nextLesson, go, toast,
    busy: () => !!(window.DATTest && window.DATTest.active),
    // Swap in progress loaded from online (keeps its own timestamp so it isn't re-uploaded as new).
    replace(x) { state = merge(blank(), x); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } applyTheme(); if (state.settings.setup) closeOverlay(); render(); },
    applyName(n) { if (!state.settings.name) { state.settings.name = n; save(); const f = $("#suName"); if (f && !f.value) f.value = n; render(); } }
  };
  document.addEventListener("dat-sync-status", () => { if (tab === "me" && view === "settings" && !$(".overlay") && !(document.activeElement && document.activeElement.id === "codeIn")) render(); });
})();
