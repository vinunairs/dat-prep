/* DAT Prep — Practice: fresh question sets from the lessons' generators, with an explanation after
   each answer, an optional DAT-pace timer, and a Mistake notebook for retrying misses. */
(function (root) {
  "use strict";
  const LETTERS = ["A", "B", "C", "D", "E"];
  // Seconds per question on the real test, by section.
  const PACE = { bio: 54, gc: 54, oc: 54, pat: 40, rc: 72, qr: 68 };
  let cfg = { lesson: "mixed", count: 5, timed: false };
  let run = null; // the set in progress (kept while she switches tabs)

  function make(lesson, rng, k) {
    for (let t = 0; t < 25; t++) { try { const q = lesson.solo(rng, k); if (q) return q; } catch (e) { } }
    return null;
  }
  function buildSet(L, lessonId, count) {
    const rng = root.PSCore.makeRng();
    const pool = lessonId === "mixed" ? L.list : [L.byId[lessonId]];
    const qs = [];
    for (let i = 0; i < count; i++) {
      const lesson = pool[i % pool.length];
      const q = make(lesson, rng, i % 3);
      if (q) qs.push(Object.assign({ lesson: lesson.id, topic: lesson.topic, section: lesson.section }, q));
    }
    return rng.shuffle(qs);
  }
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  // One multiple-choice question; onAnswer(index, correct) fires once.
  function questionView(c, q, onAnswer, opts = {}) {
    const { el } = c;
    const fb = el("div", { class: "fbx", role: "status" });
    const list = el("div", { class: "opts" });
    let done = false;
    q.o.forEach((o, i) => list.append(el("button", { type: "button", class: "opt", onclick: (e) => {
      if (done) return; done = true;
      const ok = i === q.a;
      list.querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add("yes"); });
      if (!ok) e.currentTarget.classList.add("no");
      fb.append(el("p", { class: ok ? "good" : "bad", html: ok ? "<b>Correct.</b>" : "<b>Not this time.</b> The answer is " + LETTERS[q.a] + "." }), el("div", { class: "ex", html: q.e }));
      onAnswer(i, ok, fb);
    } }, el("span", { class: "L", text: LETTERS[i] }), el("span", { html: o }))));
    return el("div", { class: "solo" }, opts.head || null, el("div", { class: "q", html: q.q }), q.fig ? el("div", { class: "fig", html: q.fig }) : null, list, fb);
  }

  function Practice(c) {
    const { el, state, L, S, go } = c;
    if (c.view === "mistakes") return Mistakes(c);
    if (run && c.view === "run") return Run(c);
    if (c.preset) { cfg.lesson = c.preset; c.preset = null; }
    const inProgress = run && run.i < run.qs.length;
    const how = root.DATViz.howTo(el, ["Pick what to practice: one topic, or a mix.", "Choose how many questions, and whether to show the DAT pace.", "Answer each question, then read the explanation. Misses go to your Mistake notebook."]);
    const chips = (label, items, key) => el("div", { class: "ctrl" }, el("span", { text: label }), el("div", { class: "seg", role: "group", "aria-label": label },
      items.map(([v, t]) => el("button", { type: "button", "aria-pressed": String(cfg[key] === v), onclick: (e) => { cfg[key] = v; e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); how.at(key === "lesson" ? 1 : 2); } }, t))));
    const topics = [["mixed", "Mixed: all topics"], ...L.list.map((l) => [l.id, S.byId[l.topic].name.replace(" and General Concepts", "")])];
    const timed = el("input", { type: "checkbox", checked: cfg.timed, onchange: () => { cfg.timed = timed.checked; how.at(2); } });
    const nMiss = (state.mistakes || []).length;
    const hist = (state.practice || []).slice(-5).reverse();
    const nav = c.subnav([["practice", null, "Build a set"], ["practice", "mistakes", "Mistake notebook" + (nMiss ? " (" + nMiss + ")" : "")]], "practice/");
    return [
      el("h1", { text: "Practice" }), nav,
      inProgress ? el("div", { class: "callout" }, el("div", {}, el("strong", { text: "You have a set in progress. " }), "Question " + (run.i + 1) + " of " + run.qs.length + "."),
        el("button", { type: "button", class: "btn small", onclick: () => go("practice", "run") }, "Resume set")) : null,
      el("p", { class: "lede", text: "Fresh questions every time, with a worked explanation after each one. These sample sets use the topics that have lessons so far; more arrive with each new lesson." }),
      el("div", { class: "practice-top" }, el("section", { class: "card" }, el("span", { class: "eyebrow", text: "Build a set" }), el("h2", { style: "margin:4px 0 12px", text: "Fresh questions, your choice" }), how.node,
        el("div", { class: "ctrls" },
          chips("What to practice", topics, "lesson"),
          chips("How many questions", [[5, "5"], [10, "10"]], "count"),
          el("label", { class: "check-line" }, timed, "Show the DAT pace (a timer per question)"),
          el("div", { class: "row" }, el("button", { type: "button", class: "btn primary", onclick: () => {
            const qs = buildSet(L, cfg.lesson, cfg.count);
            run = { qs, i: 0, right: 0, times: [], t0: Date.now(), cfg: Object.assign({}, cfg), answered: false };
            go("practice", "run");
          } }, "Start practice")))),
        el("section", { class: "card" }, el("span", { class: "eyebrow", text: "Your misses" }), el("h2", { style: "margin:4px 0 8px", text: "Mistake notebook" }),
          el("p", { class: "muted", text: nMiss ? nMiss + " question" + (nMiss === 1 ? " is" : "s are") + " waiting. Answer one correctly and it leaves the notebook." : "Empty. Every question you miss in practice or a test waits here until you get it right." }),
          el("button", { type: "button", class: "btn primary", disabled: !nMiss, onclick: () => go("practice", "mistakes") }, nMiss ? "Retry mistakes" : "Nothing to retry"))),
      hist.length ? el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Recent sets" })),
        el("ul", { class: "rows" }, hist.map((h) => el("li", { class: "row-item" },
          el("div", { class: "grow" }, el("span", { class: "t", text: h.label }), el("span", { class: "s", text: c.fmtDay(h.date) + " · " + h.n + " questions" + (h.avg ? " · " + h.avg + " s each" : "") })),
          el("span", { class: "num strong", text: h.right + "/" + h.n }))))) : null
    ];
  }

  function Run(c) {
    const { el, state, save, go } = c;
    const r = run;
    if (r.i >= r.qs.length) return Summary(c);
    const q = r.qs[r.i];
    const pace = PACE[q.section] || 60;
    const timerEl = el("span", { class: "num timer" });
    let started = Date.now();
    const tick = () => { if (!timerEl.isConnected) return clearInterval(iv); const s = (Date.now() - started) / 1000; timerEl.textContent = mmss(s) + " · DAT pace " + mmss(pace); timerEl.classList.toggle("over", s > pace); };
    const iv = r.cfg.timed ? setInterval(tick, 500) : null;
    if (iv) setTimeout(tick, 0); // first tick once the timer is on the page
    const next = el("button", { type: "button", class: "btn primary", style: "margin-top:12px" }, r.i + 1 < r.qs.length ? "Next question" : "See my results");
    next.addEventListener("click", () => { if (next.disabled) return; next.disabled = true; r.i++; go("practice", "run"); });
    if (q.picked != null) {
      // Already answered (she left and came back): show it as answered, without counting it again.
      if (iv) clearInterval(iv);
      const v = questionView(c, q, () => {});
      const btn = v.querySelectorAll(".opt")[q.picked];
      if (btn) btn.click();
      v.querySelector(".fbx").append(next);
      return [el("div", { class: "runbar" }, el("span"), el("span", { class: "small", text: "Question " + (r.i + 1) + " of " + r.qs.length }), el("span")),
        el("section", { class: "card c-" + q.section }, el("div", { class: "crumb" }, el("span", { class: "dot" }), c.S.byId[q.topic].name), v)];
    }
    const view = questionView(c, q, (i, ok, fb) => {
      q.picked = i;
      if (iv) clearInterval(iv);
      r.times.push((Date.now() - started) / 1000);
      if (ok) r.right++;
      c.record(q.topic, ok);
      if (!ok) {
        state.mistakes = state.mistakes || [];
        state.mistakes.push({ id: Date.now() + "-" + r.i, lesson: q.lesson, topic: q.topic, q: q.q, o: q.o, a: q.a, e: q.e, fig: q.fig || null, at: c.today() });
        if (state.mistakes.length > 60) state.mistakes.shift();
        save();
        fb.append(el("p", { class: "small muted", style: "margin:8px 0 0", text: "Added to your Mistake notebook to retry later." }));
      }
      fb.append(next);
    });
    const name = c.S.byId[q.topic].name;
    return [
      el("div", { class: "runbar" },
        el("button", { type: "button", class: "back", onclick: () => { if (confirm("End this practice set? Answers so far still count.")) { r.i = r.qs.length; go("practice", "run"); } } }, "End set"),
        el("span", { class: "small", text: "Question " + (r.i + 1) + " of " + r.qs.length }),
        r.cfg.timed ? timerEl : el("span")),
      el("div", { class: "bar", "aria-hidden": "true", style: "margin-bottom:16px" }, el("i", { style: "width:" + Math.round((r.i / r.qs.length) * 100) + "%" })),
      el("section", { class: "card c-" + q.section }, el("div", { class: "crumb" }, el("span", { class: "dot" }), name), view)
    ];
  }

  function Summary(c) {
    const { el, state, save, go, L, S } = c;
    const r = run;
    const n = r.times.length;
    const avg = n ? Math.round(r.times.reduce((a, b) => a + b, 0) / n) : 0;
    if (!r.saved && n) {
      const label = r.cfg.lesson === "mixed" ? "Mixed practice" : S.byId[L.byId[r.cfg.lesson].topic].name;
      state.practice = state.practice || [];
      state.practice.push({ date: c.today(), label, n, right: r.right, avg });
      r.saved = true; save();
    }
    const nMiss = (state.mistakes || []).length;
    const out = [el("h1", { text: n ? "Set complete" : "Set ended" }),
      el("section", { class: "card result" + (n && r.right === n ? " star" : "") },
        el("div", { class: "big num", text: r.right + " / " + n }),
        el("p", { text: !n ? "No questions answered." : r.right === n ? "Every one right." : r.right / n >= 0.7 ? "Solid. Retry the misses while they're fresh." : "Worth reviewing: reread the lesson's rule, then retry your misses." }),
        n && r.cfg.timed ? el("p", { class: "small muted", text: "Average " + avg + " seconds per question." }) : null),
      el("div", { class: "row" },
        el("button", { type: "button", class: "btn primary", onclick: () => { run = null; go("tests"); } }, "Next: try the sample test"),
        nMiss ? el("button", { type: "button", class: "btn", onclick: () => { run = null; go("practice", "mistakes"); } }, "Retry mistakes (" + nMiss + ")") : null,
        el("button", { type: "button", class: "btn ghost", onclick: () => { run = null; go("practice"); } }, "Practice again"))];
    return out;
  }

  function Mistakes(c) {
    const { el, state, save, go } = c;
    const list = state.mistakes || [];
    const out = [el("h1", { text: "Practice" }), c.subnav([["practice", null, "Build a set"], ["practice", "mistakes", "Mistake notebook" + (list.length ? " (" + list.length + ")" : "")]], "practice/mistakes"),
      el("p", { class: "lede", text: "Questions you missed in practice and tests. Answer one correctly and it leaves the notebook." })];
    if (!list.length) { out.push(el("div", { class: "callout" }, "Nothing to retry. Misses from practice sets show up here.")); return out; }
    list.slice().reverse().forEach((m) => {
      const holder = el("div");
      const tmp = document.createElement("div"); tmp.innerHTML = m.q;
      const preview = el("p", { class: "mq", text: tmp.textContent });
      const card = el("section", { class: "card c-" + (c.L.byId[m.lesson] ? c.L.byId[m.lesson].section : "") },
        el("div", { class: "row between" }, el("div", { class: "crumb" }, el("span", { class: "dot" }), c.S.byId[m.topic].name + " · missed " + c.fmtDay(m.at)),
          el("button", { type: "button", class: "btn small", onclick: (e) => { e.currentTarget.remove(); preview.remove(); holder.append(questionView(c, m, (i, ok, fb) => {
            c.record(m.topic, ok);
            if (ok) { state.mistakes = (state.mistakes || []).filter((x) => x.id !== m.id); save(); fb.append(el("p", { class: "small", text: "Cleared from your notebook." })); }
          })); } }, "Retry")),
        preview, holder);
      out.push(card);
    });
    return out;
  }

  root.DATPractice = { Practice, questionView, buildSet, PACE, mmss, get run() { return run; } };
})(window);
