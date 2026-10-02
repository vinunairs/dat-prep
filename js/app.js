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
      tests: [], mistakes: [], checks: {}, theme: null
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
  function save() { state.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast("Couldn't save on this device (storage is full or blocked)."); } }

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
    { id: "learn", name: "Learn the content", desc: "Lessons for every science topic, with PAT and Quant drills a few times a week so those skills build slowly." },
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
  const noteTitle = (id) => (id === "general" ? "General notes" : L.byId[id] ? L.byId[id].title : id);
  const noteWhere = (id) => (L.byId[id] ? S.byId[L.byId[id].section].name + " · " + S.byId[L.byId[id].topic].name : "Not tied to a lesson");
  const notes = {
    get(id) { return (state.notes[id] && state.notes[id].t) || ""; },
    set(id, t) { state.notes[id] = { t, u: Date.now() }; save(); },
    append(id, line) {
      const cur = notes.get(id);
      notes.set(id, (cur && !cur.endsWith("\n") ? cur + "\n" : cur) + line + "\n");
      toast("Saved to notes");
      const ta = $("#notesTa"); if (ta && ta.dataset.id === id) ta.value = notes.get(id);
    },
    open(id, docked) {
      id = id || currentNoteId();
      closeNotes();
      const ta = el("textarea", { id: "notesTa", "data-id": id, "aria-label": "Notes for " + noteTitle(id), placeholder: "Type anything: a rule in your own words, a trick, a question to look up later.\n\nTip: the ＋ Notes buttons in a lesson add key points here for you." });
      ta.value = notes.get(id);
      const status = el("span", { class: "tiny muted", role: "status" });
      let t = null;
      ta.addEventListener("input", () => { status.textContent = "Saving…"; clearTimeout(t); t = setTimeout(() => { notes.set(id, ta.value); status.textContent = "Saved"; }, 400); });
      const panel = el("aside", { class: "notes-panel", role: "dialog", "aria-label": "Notes" },
        el("header", {}, el("div", {}, el("div", { class: "eyebrow", text: id === "general" ? "My notes" : "Notes · " + noteWhere(id) }), el("strong", { text: noteTitle(id) })),
          el("button", { type: "button", class: "btn small", onclick: () => { clearTimeout(t); notes.set(id, ta.value); if (docked) { state.notesHidden = true; save(); } closeNotes(); } }, docked ? "Hide" : "Done")),
        ta,
        el("div", { class: "row between" }, status, el("button", { type: "button", class: "btn small ghost", onclick: () => { clearTimeout(t); notes.set(id, ta.value); closeNotes(); go("learn", "notes"); } }, "All my notes")));
      if (docked) panel.classList.add("docked");
      document.body.append(panel); document.body.classList.add("notes-open");
      if (!docked) setTimeout(() => ta.focus(), 50);
    }
  };
  const wide = window.matchMedia("(min-width: 1100px)");
  wide.addEventListener("change", () => { if (!wide.matches) { const p = $(".notes-panel.docked"); if (p) { const ta = $("#notesTa"); notes.set(ta.dataset.id, ta.value); closeNotes(); } } else render(); });
  function closeNotes() { const p = $(".notes-panel"); if (p) p.remove(); document.body.classList.remove("notes-open"); }
  function currentNoteId() { return tab === "learn" && view && L.byId[view] ? view : "general"; }

  function NotesPage() {
    const ids = ["general", ...L.list.map((l) => l.id), ...Object.keys(state.notes).filter((k) => k !== "general" && !L.byId[k])];
    const q = el("input", { type: "search", placeholder: "Search my notes", "aria-label": "Search my notes", class: "search" });
    const listBox = el("div");
    function paint() {
      listBox.textContent = "";
      const term = q.value.trim().toLowerCase();
      const shown = ids.filter((id) => (id === "general" || notes.get(id)) && (!term || (noteTitle(id) + " " + noteWhere(id) + " " + notes.get(id)).toLowerCase().includes(term)));
      if (!shown.length) listBox.append(el("p", { class: "muted", text: "No notes match." }));
      for (const id of shown) {
        const n = state.notes[id];
        const les = L.byId[id];
        listBox.append(el("section", { class: "card" + (les ? " c-" + les.section : "") },
          el("div", { class: "eyebrow", style: "display:flex;gap:6px;align-items:baseline" }, les ? el("span", { class: "dot", style: "flex:none;width:8px;height:8px" }) : null, el("span", { text: noteWhere(id) })),
          el("div", { class: "row between", style: "margin-top:4px" }, el("h3", { style: "margin:0", text: noteTitle(id) }),
            el("div", { class: "row", style: "gap:4px" },
              L.byId[id] ? el("button", { type: "button", class: "btn small ghost", onclick: () => go("learn", id) }, "Open lesson") : null,
              el("button", { type: "button", class: "btn small", onclick: () => notes.open(id) }, "Edit"))),
          n && n.u ? el("div", { class: "tiny muted", text: "Updated " + new Date(n.u).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }) : null,
          el("div", { class: "note-text", text: notes.get(id) || "Nothing yet." })));
      }
    }
    q.addEventListener("input", paint);
    paint();
    return [el("button", { type: "button", class: "btn ghost small", style: "margin:-6px 0 6px -10px", onclick: () => go("learn") }, "‹ Learn"),
      el("h1", { text: "My notes" }),
      el("p", { class: "muted", text: "One page per lesson plus a general notebook. The ✎ Notes button on every screen opens the right one." }),
      el("div", { class: "row", style: "margin-bottom:14px" }, q,
        el("button", { type: "button", class: "btn small", onclick: downloadNotes }, "Download"),
        el("button", { type: "button", class: "btn small", onclick: () => window.print() }, "Print")),
      listBox];
  }
  function downloadNotes() {
    const ids = Object.keys(state.notes).filter((id) => notes.get(id).trim());
    const txt = "DAT Prep notes — " + todayISO() + "\n\n" + ids.map((id) => "## " + noteTitle(id) + "\n" + noteWhere(id) + "\n\n" + notes.get(id).trim()).join("\n\n");
    const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })), download: "dat-notes-" + todayISO() + ".txt" });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const lessonCtx = {
    get state() { return state; }, save: () => save(), el, toast, go, record, notes, today: todayISO,
    sectionName: (id) => S.byId[id].name, topicName: (id) => S.byId[id].name
  };

  /* ---------- Shell ---------- */
  const TABS = ["today", "learn", "practice", "tests", "me"];
  let tab = "today", view = null; // view: sub-page such as a section id in Learn
  function go(t, v) { tab = t; view = v || null; history.replaceState(null, "", "#" + t + (v ? "/" + v : "")); render(); window.scrollTo(0, 0); }
  function fromHash() { const [t, v] = (location.hash.slice(1) || "today").split("/"); tab = TABS.includes(t) ? t : "today"; view = v || null; }

  function render() {
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    const m = $("#main"); m.textContent = "";
    const screens = { today: Today, learn: Learn, practice: Practice, tests: Tests, me: Me };
    m.append(...[].concat(screens[tab]()));
    paintBar();
    const fab = $("#notesFab"); if (fab) fab.hidden = tab === "learn" && view === "notes";
    // On wider screens a lesson keeps its notes open beside it; anywhere else the panel opens on demand.
    const onLesson = tab === "learn" && view && L.byId[view];
    const open = $(".notes-panel"), ta = $("#notesTa");
    if (open && ta && (!onLesson || ta.dataset.id !== view)) { notes.set(ta.dataset.id, ta.value); closeNotes(); }
    if (onLesson && wide.matches && !state.notesHidden && !$(".notes-panel")) notes.open(view, true);
    if (!state.settings.setup && tab === "today") setTimeout(openSetup, 50);
  }
  function paintBar() {
    const left = daysLeft();
    $("#barCount").textContent = left == null ? "Set test date" : left > 0 ? plural(left, "day") + " to go" : left === 0 ? "Test day" : "Test done";
  }

  /* ---------- Setup ---------- */
  function openSetup() {
    if ($(".overlay")) return;
    const st = state.settings;
    const name = el("input", { type: "text", id: "suName", maxlength: "40", autocomplete: "given-name", value: st.name || "" });
    const date = el("input", { type: "date", id: "suDate", value: st.date || "", min: todayISO() });
    const target = el("input", { type: "number", id: "suTarget", min: "200", max: "600", step: "10", inputmode: "numeric", value: st.target || "", placeholder: "e.g. 450" });
    const hours = el("select", { id: "suHours" }, [8, 10, 15, 20, 25, 30].map((h) => el("option", { value: String(h), text: h + " hours a week" + (h === 15 ? " (about 2 a day)" : h === 25 ? " (full-time summer)" : "") })));
    hours.value = String(st.hours || 15);
    const unsure = el("button", { type: "button", class: "btn small ghost", onclick: () => { const d = new Date(Date.now() + 84 * DAY); date.value = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); } }, "Not sure yet? Plan for 12 weeks");
    const msg = el("p", { class: "tiny", style: "color:var(--bad)", role: "alert" });
    const form = el("form", { class: "dialog", "aria-labelledby": "suT" },
      el("header", {}, el("h2", { id: "suT", text: st.setup ? "Your test and plan" : "Welcome to DAT Prep" }),
        st.setup ? el("button", { type: "button", class: "btn small ghost", onclick: closeOverlay }, "Close") : null),
      st.setup ? null : el("p", { class: "muted small", text: "Three quick answers and your plan builds itself around your test date. You can change these any time under Me." }),
      el("label", { class: "f", for: "suName" }, "Your first name", name),
      el("label", { class: "f", for: "suDate" }, "DAT test date", date, el("span", { class: "hint" }, "Haven't booked yet? Pick a target date. ", unsure)),
      el("div", { class: "grid2" },
        el("label", { class: "f", for: "suHours" }, "Study time", hours),
        el("label", { class: "f", for: "suTarget" }, "Target score (optional)", target, el("span", { class: "hint", text: "200–600 scale. Check your schools' averages." }))),
      msg,
      el("div", { class: "row" }, el("button", { type: "submit", class: "btn primary" }, st.setup ? "Save" : "Build my plan")));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const t = target.value ? Math.round(+target.value / 10) * 10 : null;
      if (t != null && (t < 200 || t > 600)) { msg.textContent = "Target scores run from 200 to 600."; return; }
      if (date.value && date.value < todayISO()) { msg.textContent = "Pick a date from today on."; return; }
      Object.assign(state.settings, { name: name.value.trim(), date: date.value || null, target: t, hours: +hours.value, setup: true });
      if (date.value) state.checks.date = todayISO();
      save(); closeOverlay(); render(); toast(date.value ? "Plan updated" : "Saved. Add a test date when you have one.");
    });
    const ov = el("div", { class: "overlay", onclick: (e) => { if (e.target === ov && state.settings.setup) closeOverlay(); } }, form);
    document.body.append(ov); name.focus();
  }
  function closeOverlay() { const o = $(".overlay"); if (o) o.remove(); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if ($(".notes-panel")) { const ta = $("#notesTa"); if (ta) notes.set(ta.dataset.id, ta.value); closeNotes(); } else if (state.settings.setup) closeOverlay(); } });

  /* ---------- Today ---------- */
  function Today() {
    const st = state.settings, left = daysLeft(), ph = phaseDates(), now = currentPhase(ph);
    const hi = st.name ? "Hi " + st.name : "Hi there";
    const weeksLeft = left != null && left > 0 ? Math.ceil(left / 7) : null;
    const hoursTotal = weeksLeft ? weeksLeft * st.hours : null;
    const hero = el("section", { class: "card hero", "aria-label": "Countdown" },
      el("div", { class: "eyebrow", text: hi }),
      left == null ? [el("h1", { text: "Set your test date to build your plan" }), el("button", { class: "btn primary", onclick: openSetup }, "Set test date")]
        : left < 0 ? [el("h1", { text: "Your DAT date has passed" }), el("p", { class: "muted", text: "Set a new date if you're retesting (there's a 60-day wait between attempts)." }), el("button", { class: "btn primary", onclick: openSetup }, "Set new date")]
        : [el("div", { class: "row", style: "align-items:baseline;gap:8px" }, el("span", { class: "big num", text: String(left) }), el("span", { text: left === 1 ? "day to your DAT" : "days to your DAT" })),
          el("div", { class: "muted small", text: fmtD(parseD(st.date), { weekday: "long", month: "long", day: "numeric", year: "numeric" }) }),
          el("div", { class: "stats" },
            el("div", { class: "stat" }, el("span", { class: "eyebrow", text: "Phase" }), el("b", { text: now ? now.name.split(" ")[0] + (now.id === "tests" ? " tests" : now.id === "final" ? " days" : "") : "—" })),
            el("div", { class: "stat" }, el("span", { class: "eyebrow", text: "Weeks" }), el("b", { class: "num", text: String(weeksLeft) })),
            el("div", { class: "stat" }, el("span", { class: "eyebrow", text: "Hours ahead" }), el("b", { class: "num", text: "~" + hoursTotal })))]);
    const out = [hero];

    if (left != null && left >= 0 && hoursTotal != null && hoursTotal < 150 && left > 3)
      out.push(el("div", { class: "note warn" }, el("strong", { text: "Tight timeline. " }), "Most students study 200–300 hours. At " + st.hours + " hours a week you have about " + hoursTotal + ". Consider more hours a week or a later date (you can reschedule; fees depend on notice)."));

    // This week
    if (now) {
      const wp = weekPlan();
      const learn = ph.find((p) => p.id === "learn");
      const weekIdx = learn ? Math.floor((parseD(todayISO()) - learn.from) / (7 * DAY)) : 0;
      const items = [];
      if (now.id === "learn") {
        const topics = wp.weeks[Math.min(weekIdx, wp.weeks.length - 1)] || [];
        items.push(...topics.map((t) => ({ sec: t.section, text: t.name, sub: S.byId[t.section].name, lesson: (L.byTopic[t.id] || [])[0] })));
        items.push({ sec: "pat", text: "Perceptual Ability drills", sub: "15 minutes, 4 days this week" });
        items.push({ sec: "qr", text: "Quantitative Reasoning set", sub: "2 short sets this week" });
        if (weekIdx % 2 === 1) items.push({ sec: "rc", text: "One timed reading passage", sub: "20 minutes" });
      } else if (now.id === "practice") {
        const weak = weakest(3);
        items.push(...weak.map((t) => ({ sec: t.section, text: t.name, sub: "Weak spot · lesson review + practice set" })));
        items.push({ sec: "pat", text: "Timed PAT subtests", sub: "2 full subtests, 3 days this week" }, { sec: "rc", text: "Timed reading passages", sub: "2 this week" }, { sec: "qr", text: "Timed Quant set", sub: "20 questions, twice" });
      } else if (now.id === "tests") {
        items.push({ sec: null, text: "Full-length practice test", sub: "Full 4 h 15 min, same time of day as your real test" }, { sec: null, text: "Review every missed question", sub: "Takes as long as the test itself" });
        items.push(...weakest(2).map((t) => ({ sec: t.section, text: t.name, sub: "Weak spot from your tests" })));
      } else items.push({ sec: null, text: "Light review of your strategy notes", sub: "30–60 minutes a day at most" }, { sec: null, text: "Pack two IDs and confirm the test center", sub: "Arrive 30 minutes early" }, { sec: null, text: "Sleep", sub: "It's worth more points than one more set" });
      out.push(el("section", { class: "card" },
        el("div", { class: "row between" }, el("h2", { text: "This week" }), el("span", { class: "chip brand", text: now.name })),
        el("p", { class: "muted small", text: now.desc }),
        el("div", {}, items.map((it) => el("div", { class: "check" + (it.sec ? " c-" + it.sec : "") },
          el("span", { class: "dot", style: "margin-top:7px" + (it.sec ? "" : ";background:var(--ink-3)") }),
          el("div", { style: "flex:1" }, el("div", { class: "t", text: it.text }), el("div", { class: "muted small", text: it.sub })),
          it.lesson ? el("button", { type: "button", class: "btn small" + ((state.lessons[it.lesson.id] || {}).done ? "" : " primary"), onclick: () => go("learn", it.lesson.id) }, (state.lessons[it.lesson.id] || {}).done ? "Done ✓" : "Lesson") : null))),
        el("p", { class: "tiny muted", style: "margin:10px 0 0", text: "Lessons and practice sets arrive section by section. Three prototype lessons are ready in Learn." })));
    }

    // Start here
    const steps = [
      { id: "date", t: "Set your test date (or a target date)", s: "Your plan is built backward from it.", act: () => openSetup(), a: "Set date" },
      { id: "format", t: "Learn how the test works", s: "Sections, timing, scoring, and test-day rules.", act: () => go("tests"), a: "Open" },
      { id: "rate", t: "Rate how well you know each science topic", s: "New, shaky or solid. It sets the order of your lessons.", act: () => go("learn"), a: "Rate topics" },
      { id: "pat", t: "Read the official PAT instructions", s: "The ADA strongly recommends this before test day.", href: "https://www.ada.org/DAT", a: "ADA.org/DAT" },
      { id: "ada", t: "Try the free ADA sample questions", s: "A first look at the real question style.", href: "https://www.ada.org/DAT", a: "ADA.org/DAT" },
      { id: "dentpin", t: "Get a DENTPIN when you're ready to register", s: "Required before applying; your name must match your ID exactly.", href: "https://www.ada.org/DENTPIN", a: "ADA.org/DENTPIN" },
      { id: "backup", t: "Back up your progress", s: "Progress lives on this device. Save a copy weekly (Me → Back up).", act: () => go("me"), a: "Open Me" }
    ];
    const done = steps.filter((x) => state.checks[x.id]).length;
    out.push(el("section", { class: "card" },
      el("div", { class: "row between" }, el("h2", { text: "Start here" }), el("span", { class: "chip" + (done === steps.length ? " good" : ""), text: done + " of " + steps.length })),
      steps.map((x) => {
        const box = el("input", { type: "checkbox", id: "ck-" + x.id, checked: !!state.checks[x.id], onchange: () => { if (box.checked) state.checks[x.id] = todayISO(); else delete state.checks[x.id]; save(); render(); } });
        return el("div", { class: "check" + (state.checks[x.id] ? " done" : "") }, box,
          el("div", { style: "flex:1;min-width:0" },
            el("label", { for: "ck-" + x.id }, el("div", { class: "t", text: x.t }), el("div", { class: "muted small", text: x.s })),
            x.href ? el("a", { class: "btn small", style: "margin-top:8px", href: x.href, target: "_blank", rel: "noopener" }, x.a + " ↗") : el("button", { type: "button", class: "btn small", style: "margin-top:8px", onclick: x.act }, x.a)));
      })));

    // Phase timeline
    if (ph) out.push(el("section", { class: "card" }, el("h2", { text: "Your road to test day" }),
      el("div", { class: "phases" }, ph.map((p) => {
        const t = parseD(todayISO()), cls = p === now ? "now" : t >= p.to ? "past" : "";
        return el("div", { class: "phase " + cls }, el("span", { class: "pdot" }),
          el("div", {}, el("div", { class: "row between" }, el("strong", { text: p.name }), el("span", { class: "tiny muted num", text: fmtD(p.from) + " – " + fmtD(new Date(p.to.getTime() - DAY)) + " · " + plural(p.days, "day") })),
            el("div", { class: "muted small", text: p.desc })));
      }))));
    return out;
  }
  function weakest(n) {
    const all = S.SECTIONS.flatMap((s) => s.topics);
    return all.map((t) => ({ t, m: mastery(t.id).v })).sort((a, b) => a.m - b.m || b.t.w - a.t.w).slice(0, n).map((x) => x.t);
  }

  /* ---------- Learn ---------- */
  const CONF = ["New", "Shaky", "Solid"];
  function Learn() {
    if (view === "notes") return NotesPage();
    if (view && L.byId[view]) return L.render(L.byId[view], lessonCtx);
    if (view && S.byId[view] && S.byId[view].topics) return LearnSection(S.byId[view]);
    const nNotes = Object.values(state.notes).filter((n) => n && n.t && n.t.trim()).length;
    const out = [el("div", { class: "row between" }, el("h1", { style: "margin:0", text: "Learn" }),
        el("button", { type: "button", class: "btn small", onclick: () => go("learn", "notes") }, "✎ My notes" + (nNotes ? " (" + nNotes + ")" : ""))),
      el("p", { class: "muted", style: "margin-top:6px", text: "Everything on the 2026 DAT, section by section. Rate each topic so your plan starts with what you need most." })];
    if (L.list.length) out.push(el("section", { class: "card" }, el("h2", { text: "Lessons ready to try" }),
      L.list.map((l) => { const lp = state.lessons[l.id] || {}; return el("button", { type: "button", class: "sec c-" + l.section, style: "box-shadow:none", onclick: () => go("learn", l.id) },
        el("span", { class: "ico", text: l.section.toUpperCase() }),
        el("span", {}, el("div", { class: "name", text: l.title }), el("div", { class: "meta", text: S.byId[l.section].name + " · " + l.minutes + " min" + (lp.done ? " · done ✓" : lp.st ? " · step " + Math.min(4, lp.st + 1) + " of 4" : "") })), chev()); })));
    let group = "";
    for (const s of S.SECTIONS) {
      if (s.group !== group && s.group.startsWith("Survey")) { out.push(el("div", { class: "eyebrow", style: "margin:14px 0 8px", text: "Survey of the Natural Sciences · 100 questions · 90 min" })); }
      if (!s.group.startsWith("Survey") && group.startsWith("Survey")) out.push(el("div", { class: "eyebrow", style: "margin:14px 0 8px", text: "Skills sections" }));
      group = s.group;
      const rated = s.topics.filter((t) => state.conf[t.id] != null).length;
      out.push(el("button", { type: "button", class: "sec c-" + s.id, onclick: () => go("learn", s.id) },
        el("span", { class: "ico", text: s.id.toUpperCase() }),
        el("span", {}, el("div", { class: "name", text: s.name }), el("div", { class: "meta", text: s.items + " questions · " + plural(s.topics.length, "topic") + (rated ? " · " + rated + " rated" : "") })), chev()));
    }
    return out;
  }
  function LearnSection(s) {
    const isSci = ["bio", "gc", "oc"].includes(s.id);
    const out = [
      el("button", { type: "button", class: "btn ghost small", style: "margin:-6px 0 6px -10px", onclick: () => go("learn") }, "‹ All sections"),
      el("div", { class: "row c-" + s.id }, el("span", { class: "dot", style: "width:14px;height:14px" }), el("h1", { style: "margin:0", text: s.name })),
      el("p", { class: "muted", style: "margin-top:6px", text: s.blurb })
    ];
    if (s.id === "oc") out.push(el("div", { class: "note" }, "Topics follow the ADA's updated 2026 Organic Chemistry outline. The content is the same as before; the topic names and subtopic lists are clearer."));
    if (s.id === "rc") out.push(el("div", { class: "note" }, "The ADA lists Reading Comprehension as one skill. These groupings are study categories, not official subtopics."));
    out.push(el("section", { class: "card" },
      el("div", { class: "row between" }, el("h2", { style: "margin:0", text: "Topics" }), el("span", { class: "tiny muted", text: "How well do you know it?" })),
      s.topics.map((t) => {
        const c = state.conf[t.id];
        const seg = el("div", { class: "seg", role: "group", "aria-label": "Rate " + t.name },
          CONF.map((label, i) => el("button", { type: "button", "aria-pressed": String(c === i), onclick: (e) => { e.preventDefault(); state.conf[t.id] = i; if (Object.keys(state.conf).length >= 5) state.checks.rate = state.checks.rate || todayISO(); save(); render(); } }, label)));
        const ls = L.byTopic[t.id] || [];
        return el("div", { class: "topic" },
          el("div", { class: "row between" }, el("strong", { text: t.name }), ls.length ? null : el("span", { class: "chip", text: "Lesson coming" })),
          ls.map((l) => { const lp = state.lessons[l.id] || {}; return el("button", { type: "button", class: "btn small " + (lp.done ? "" : "primary"), style: "margin-top:8px", onclick: () => go("learn", l.id) }, (lp.done ? "✓ " : lp.st ? "Continue: " : "Lesson: ") + l.title); }),
          el("div", { style: "margin-top:8px" }, seg),
          el("details", {}, el("summary", { class: "tiny muted", style: "cursor:pointer;margin-top:8px" }, "What's covered (" + t.subs.length + ")"),
            el("ul", {}, t.subs.map((x) => el("li", { text: x })))));
      })));
    if (isSci) out.push(el("p", { class: "tiny muted", text: "Each lesson will teach the topic step by step and end with a short check, then feed new questions into Practice." }));
    return out;
  }

  /* ---------- Practice ---------- */
  function Practice() {
    return [el("h1", { text: "Practice" }),
      el("section", { class: "card empty" }, svg('<path d="M4.5 19.5h3.8L19.2 8.6a1.9 1.9 0 0 0 0-2.7l-1.1-1.1a1.9 1.9 0 0 0-2.7 0L4.5 15.7z"/><path d="m14 6.3 3.7 3.7"/>'),
        el("h2", { text: "Question sets are on the way" }),
        el("p", { text: "Every set will be new: questions are generated or drawn fresh each time, with a worked explanation after each one, and misses go to a Mistake notebook." })),
      el("section", { class: "card" }, el("h2", { text: "Coming in this order" }),
        [["pat", "Perceptual Ability", "All six subtests with drawn figures, untimed and timed"], ["qr", "Quantitative Reasoning", "Algebra, data, comparisons, probability and word problems"], ["bio", "Biology", "With lessons, topic by topic"], ["gc", "General Chemistry", "With lessons, including no-calculator math"], ["oc", "Organic Chemistry", "With lessons, mechanisms and synthesis"], ["rc", "Reading Comprehension", "Original science passages, timed"]].map(([id, n, d], i) =>
          el("div", { class: "check c-" + id }, el("span", { class: "dot", style: "margin-top:7px" }), el("div", { style: "flex:1" }, el("div", { class: "t", text: n }), el("div", { class: "muted small", text: d })), el("span", { class: "chip" + (i < 2 ? " brand" : ""), text: i < 2 ? "Next" : "Later" }))))];
  }

  /* ---------- Tests ---------- */
  function Tests() {
    const rows = S.SCHEDULE.map((r) => el("tr", {}, el("td", { text: r.name }), el("td", { class: "n", text: r.q ? String(r.q) : "—" }), el("td", { class: "n", text: r.min + " min" }), el("td", { class: "n", text: r.q ? Math.round((r.min * 60) / r.q) + " s" : "—" })));
    return [el("h1", { text: "Tests" }),
      el("section", { class: "card empty" }, svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4.2l2.8 1.8M9.5 2.8h5"/>'),
        el("h2", { text: "Full-length practice tests come later" }),
        el("p", { text: "Timed in the real order with the scheduled break, an on-screen calculator for Quant only, and a section-by-section review. Until then, here's how the real test works." })),
      el("section", { class: "card" }, el("h2", { text: "Test day, section by section" }),
        el("div", { class: "scroll" }, el("table", { class: "t" }, el("thead", {}, el("tr", {}, el("th", { text: "Part" }), el("th", { class: "n", text: "Questions" }), el("th", { class: "n", text: "Time" }), el("th", { class: "n", text: "Per question" }))), el("tbody", {}, rows))),
        el("p", { class: "small muted", style: "margin-top:10px", text: "Total appointment: 5 hours 15 minutes. Arrive at the Prometric center at least 30 minutes early." })),
      el("section", { class: "card" }, el("h2", { text: "How scoring works" }),
        el("ul", { class: "small" },
          el("li", {}, el("strong", { text: "Scale of 200 to 600" }), ", in steps of 10. This replaced the old 1–30 scale on March 1, 2025, so older advice quoting scores like \"20 AA\" uses the old scale."),
          el("li", {}, el("strong", { text: "No penalty for guessing. " }), "Never leave a question blank; flag it and come back if there's time."),
          el("li", {}, "Some questions are unscored experiments that look like the others, so don't let one strange question shake you."),
          el("li", {}, "There's no passing score. Each dental school decides what it looks for; compare with the ADA's published norms and your schools' averages."),
          el("li", {}, "Scores reach your chosen schools in about 3–4 weeks. Every attempt is reported, so aim to take it once, ready."))),
      el("section", { class: "card" }, el("h2", { text: "Rules worth knowing early" }),
        el("ul", { class: "small" },
          el("li", { text: "Two current IDs: one government photo ID with signature, one with name and signature. Names must match your DENTPIN record exactly." }),
          el("li", { text: "The center gives you two note boards and fine-tip markers; nothing else comes in. Practice on a whiteboard so it feels normal." }),
          el("li", { text: "The only scheduled break is 30 minutes after Perceptual Ability. During any other break you can't use your phone, eat from your locker, study, or leave the center." }),
          el("li", { text: "Quant has a basic on-screen calculator. The science section has a periodic table but no calculator." }),
          el("li", { text: "Retakes: wait 60 days between attempts, up to 4 a year. Fee is $580 per attempt (2026); a 50% fee waiver exists for financial hardship." }))),
      el("p", { class: "tiny muted" }, "Source: ADA ", el("a", { href: "https://www.ada.org/DAT", target: "_blank", rel: "noopener", text: "DAT 2026 Candidate Guide" }), " (updated Aug 4, 2026). Check ADA.org/DAT for changes before you register.")];
  }

  /* ---------- Me ---------- */
  function mastery(topicId) {
    const sk = state.skills[topicId];
    if (sk && sk.n >= 5) return { v: Math.round((sk.c / sk.n) * 100), src: "from " + sk.n + " questions" };
    const c = state.conf[topicId];
    if (c != null) return { v: [10, 45, 75][c], src: "self-rated " + CONF[c].toLowerCase() };
    return { v: 0, src: "not started" };
  }
  function Me() {
    const st = state.settings;
    const out = [el("h1", { text: st.name ? st.name : "Me" })];
    out.push(el("section", { class: "card" },
      el("div", { class: "row between" }, el("h2", { style: "margin:0", text: "Your test" }), el("button", { type: "button", class: "btn small", onclick: openSetup }, "Edit")),
      el("table", { class: "t", style: "margin-top:8px" }, el("tbody", {},
        el("tr", {}, el("td", { class: "muted", text: "Test date" }), el("td", { class: "n", text: st.date ? fmtD(parseD(st.date), { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Not set" })),
        el("tr", {}, el("td", { class: "muted", text: "Target score" }), el("td", { class: "n", text: st.target ? String(st.target) : "Not set" })),
        el("tr", {}, el("td", { class: "muted", text: "Study time" }), el("td", { class: "n", text: st.hours + " hours a week" }))))));

    // Skill matrix
    const mx = el("section", { class: "card" }, el("h2", { text: "Skill matrix" }),
      el("p", { class: "muted small", text: "Starts from your own ratings in Learn, then switches to real accuracy once a topic has 5 or more practice questions." }));
    for (const s of S.SECTIONS) {
      mx.append(el("div", { class: "mxhead c-" + s.id }, el("span", { class: "dot" }), s.name));
      mx.append(el("div", { class: "mx" }, s.topics.map((t) => {
        const m = mastery(t.id);
        return el("div", { class: "mxrow c-" + s.id, title: m.src },
          el("span", { class: "lbl", text: t.name }),
          el("div", { class: "bar", role: "img", "aria-label": t.name + ": " + m.v + "%, " + m.src }, el("i", { style: "width:" + m.v + "%" })),
          el("span", { class: "pct", text: m.v ? m.v + "%" : "—" }));
      })));
    }
    out.push(mx);

    // Backup and display
    const file = el("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: () => restore(file) });
    out.push(el("section", { class: "card" }, el("h2", { text: "Your progress" }),
      el("p", { class: "muted small", text: "Progress is saved in this browser on this device. Back it up to move it to another device or keep it safe; Restore loads a backup." }),
      el("div", { class: "row" },
        el("button", { type: "button", class: "btn primary", onclick: backup }, "Back up progress"),
        el("label", { class: "btn" }, "Restore from backup", file))));
    const themeSeg = el("div", { class: "seg", role: "group", "aria-label": "Appearance" },
      [["", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => el("button", { type: "button", "aria-pressed": String((state.theme || "") === v), onclick: () => { state.theme = v || null; save(); applyTheme(); render(); } }, l)));
    out.push(el("section", { class: "card" }, el("h2", { text: "Appearance" }), themeSeg));
    out.push(el("section", { class: "card flat" }, el("h3", { text: "Start over" }),
      el("p", { class: "muted small", text: "Erases everything on this device. Back up first if you might want it later." }),
      el("button", { type: "button", class: "btn small", style: "color:var(--bad)", onclick: () => { if (confirm("Erase all DAT Prep progress on this device?")) { localStorage.removeItem(KEY); state = blank(); render(); } } }, "Erase this device's progress")));
    return out;
  }
  function backup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "dat-prep-backup-" + todayISO() + ".json" });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    state.checks.backup = todayISO(); save(); toast("Backup downloaded");
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
  $("#notesFab").addEventListener("click", () => {
    if ($(".notes-panel")) return closeNotes();
    const onLesson = tab === "learn" && view && L.byId[view];
    if (onLesson && wide.matches) { state.notesHidden = false; save(); notes.open(view, true); } else notes.open();
  });
  window.addEventListener("hashchange", () => { fromHash(); render(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { state = load(); render(); } });
  applyTheme(); fromHash(); render();
  window.DATApp = { get state() { return state; }, blank, weekPlan, phaseDates, mastery, notes };
})();
