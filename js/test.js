/* DAT Prep — Tests: a short sample test that works like the real DAT. Timed parts in the real
   order at the real pace, one question at a time, flag and jump with a navigator, no feedback until
   the end, and a part can't be reopened once it ends. Results, a full review and history follow. */
(function (root) {
  "use strict";
  const LETTERS = ["A", "B", "C", "D", "E"];
  // Sample blueprint: a slice of each real section that has content so far.
  const BLUEPRINT = [
    { name: "Survey of the Natural Sciences", short: "Natural Sciences", pace: 54, items: [["bio-resp-1", 3], ["gc-stoich-1", 3]] },
    { name: "Perceptual Ability", short: "Perceptual Ability", pace: 40, items: [["pat-angles-1", 5]] }
  ];
  let T = null; // test in progress: { parts: [{ name, qs, ans, flag, t0, limit, ended, sec }], p, i }
  let timer = null;

  function build(L) {
    const rng = root.PSCore.makeRng();
    return BLUEPRINT.map((b) => {
      const qs = [];
      b.items.forEach(([id, n]) => { const l = L.byId[id]; if (!l) return; for (let k = 0; k < n; k++) { let q = null; for (let t = 0; t < 25 && !q; t++) { try { q = l.solo(rng, Math.min(2, k)); } catch (e) { } } if (q) qs.push(Object.assign({ lesson: l.id, topic: l.topic, section: l.section }, q)); } });
      return { name: b.name, short: b.short, pace: b.pace, qs: rng.shuffle(qs), ans: [], flag: [], t0: null, limit: qs.length * b.pace, ended: false, sec: 0 };
    }).filter((p) => p.qs.length);
  }
  const mmss = (s) => Math.max(0, Math.floor(s / 60)) + ":" + String(Math.max(0, Math.floor(s % 60))).padStart(2, "0");
  const left = (part) => part.limit - (Date.now() - part.t0) / 1000;

  function Tests(c) {
    if (T && c.view === "run") return Run(c);
    if (T && T.done && c.view === "results") return Results(c);
    const { el, state, go, L } = c;
    const parts = BLUEPRINT.map((b) => { const n = b.items.reduce((a, [, k]) => a + k, 0); return { b, n, sec: n * b.pace }; });
    const how = root.DATViz.howTo(el, ["Read the rules below, then press Start. The clock starts right away.", "Answer one question at a time. Use Flag for any you want to revisit, and Questions to jump around.", "When a part's time runs out or you end it, you move on and can't go back, just like the real test.", "At the end you'll see your score, your pace and a full review."], "How the test works");
    const hist = (state.tests || []).slice().reverse();
    const resume = T && !T.done ? el("div", { class: "callout warn" }, el("div", {}, el("strong", { text: "Your sample test is still running. " }), "The clock keeps going while you're away."),
      el("button", { type: "button", class: "btn small", onclick: () => go("tests", "run") }, "Resume test")) : null;
    return [
      el("h1", { text: "Tests" }), resume,
      el("p", { class: "lede", text: "Full-length practice tests come later. Until then, this short sample test works exactly like the real one, so test day feels familiar." }),
      el("section", { class: "card" },
        el("h2", { text: "Sample test" }),
        el("ul", { class: "rows", style: "margin:8px 0 14px" }, parts.map((x, i) => el("li", { class: "row-item" },
          el("span", { class: "num strong", text: String(i + 1) }),
          el("div", { class: "grow" }, el("span", { class: "t", text: x.b.name }), el("span", { class: "s", text: x.n + " questions · " + x.b.pace + " seconds each, the real DAT pace" })),
          el("span", { class: "num strong", text: mmss(x.sec) })))),
        how.node,
        el("ul", { class: "bullets small" },
          el("li", { text: "No feedback until the end, and no penalty for guessing: answer every question." }),
          el("li", { text: "On the real DAT, the science section is 100 questions in 90 minutes and Perceptual Ability is 90 in 60. This sample keeps the same pace." })),
        el("button", { type: "button", class: "btn primary", onclick: () => { T = { parts: build(L), p: 0, i: 0 }; T.parts[0].t0 = Date.now(); go("tests", "run"); } }, "Start the sample test")),
      hist.length ? el("section", { class: "block" }, el("div", { class: "block-head" }, el("h2", { text: "Your results" })),
        el("ul", { class: "rows" }, hist.map((h) => el("li", { class: "row-item" },
          el("div", { class: "grow" }, el("span", { class: "t", text: "Sample test · " + c.fmtDay(h.date) }), el("span", { class: "s", text: h.parts.map((p) => p.short + " " + p.right + "/" + p.total).join(" · ") })),
          el("span", { class: "num strong", text: Math.round((h.right / h.total) * 100) + "%" }))))) : null
    ];
  }

  function endPart(c, why) {
    const part = T.parts[T.p];
    part.ended = true; part.sec = Math.min(part.limit, Math.round((Date.now() - part.t0) / 1000));
    if (why) c.toast(why);
    if (T.p + 1 < T.parts.length) { T.p++; T.i = 0; T.parts[T.p].t0 = Date.now(); T.between = true; c.go("tests", "run"); }
    else finish(c);
  }
  function finish(c) {
    clearInterval(timer);
    const { state, save } = c;
    let right = 0, total = 0;
    const parts = T.parts.map((p) => {
      let r = 0;
      p.qs.forEach((q, i) => {
        const ok = p.ans[i] === q.a; if (ok) r++; c.record(q.topic, ok);
        if (!ok) { state.mistakes = state.mistakes || []; state.mistakes.push({ id: Date.now() + "-t" + total + "-" + i, lesson: q.lesson, topic: q.topic, q: q.q, o: q.o, a: q.a, e: q.e, fig: q.fig || null, at: c.today(), from: "test" }); }
      });
      right += r; total += p.qs.length;
      return { short: p.short, right: r, total: p.qs.length, sec: p.sec, limit: p.limit };
    });
    state.tests = state.tests || [];
    if (state.mistakes && state.mistakes.length > 60) state.mistakes = state.mistakes.slice(-60);
    state.tests.push({ kind: "sample", date: c.today(), right, total, parts });
    save();
    T.done = true;
    c.go("tests", "results");
  }

  function Run(c) {
    const { el, go } = c;
    if (T.done) return Results(c);
    const part = T.parts[T.p];
    if (T.between) {
      // A short pause between parts, like moving to the next section on test day.
      clearInterval(timer);
      part.t0 = null;
      return [el("section", { class: "card" }, el("h1", { text: "Part " + (T.p + 1) + ": " + part.name }),
        el("p", { class: "lede", text: part.qs.length + " questions in " + mmss(part.limit) + ". The clock starts when you press Begin." }),
        el("button", { type: "button", class: "btn primary", onclick: () => { T.between = false; part.t0 = Date.now(); go("tests", "run"); } }, "Begin part " + (T.p + 1)))];
    }
    if (!part.t0) part.t0 = Date.now();
    const q = part.qs[T.i];
    const clock = el("span", { class: "num timer", role: "timer", "aria-live": "off" });
    clearInterval(timer);
    const tick = () => {
      if (!clock.isConnected) { clearInterval(timer); return; }
      const s = left(part);
      clock.textContent = mmss(s) + " left";
      clock.classList.toggle("over", s < 60);
      if (s <= 0) { clearInterval(timer); endPart(c, "Time's up for " + part.short + "."); }
    };
    timer = setInterval(tick, 500); setTimeout(tick, 0); // first tick once the clock is on the page
    const answered = part.ans.filter((x) => x != null).length;
    const nav = el("div", { class: "navgrid", hidden: true },
      el("p", { class: "small muted", text: answered + " of " + part.qs.length + " answered. Tap a number to go there." }),
      el("div", { class: "cells" }, part.qs.map((_, i) => el("button", { type: "button", class: "cell" + (part.ans[i] != null ? " ans" : "") + (part.flag[i] ? " flag" : "") + (i === T.i ? " cur" : ""), "aria-label": "Question " + (i + 1) + (part.ans[i] != null ? ", answered" : ", not answered") + (part.flag[i] ? ", flagged" : ""), onclick: () => { T.i = i; go("tests", "run"); } }, String(i + 1)))),
      el("button", { type: "button", class: "btn", onclick: () => { const un = part.qs.length - answered; if (confirm((un ? un + " question" + (un === 1 ? " is" : "s are") + " unanswered. " : "") + "End " + part.short + "? You can't come back to this part.")) endPart(c); } }, "End " + part.short));
    const opts = el("div", { class: "opts" }, q.o.map((o, i) => el("button", { type: "button", class: "opt" + (part.ans[T.i] === i ? " picked" : ""), "aria-pressed": String(part.ans[T.i] === i), onclick: () => { part.ans[T.i] = i; go("tests", "run"); } }, el("span", { class: "L", text: LETTERS[i] }), el("span", { html: o }))));
    return [
      el("div", { class: "runbar sticky" },
        el("span", { class: "small strong", text: part.short }),
        el("span", { class: "small", text: "Question " + (T.i + 1) + " of " + part.qs.length }),
        clock),
      el("section", { class: "card" }, el("div", { class: "solo" }, el("div", { class: "q", html: q.q }), q.fig ? el("div", { class: "fig", html: q.fig }) : null, opts)),
      el("div", { class: "testnav" },
        el("button", { type: "button", class: "btn", disabled: T.i === 0, onclick: () => { T.i--; go("tests", "run"); } }, "‹ Previous"),
        el("button", { type: "button", class: "btn" + (part.flag[T.i] ? " flagged" : ""), "aria-pressed": String(!!part.flag[T.i]), onclick: () => { part.flag[T.i] = !part.flag[T.i]; go("tests", "run"); } }, part.flag[T.i] ? "⚑ Flagged" : "⚐ Flag"),
        el("button", { type: "button", class: "btn", "aria-expanded": "false", onclick: (e) => { nav.hidden = !nav.hidden; e.currentTarget.setAttribute("aria-expanded", String(!nav.hidden)); } }, "Questions"),
        T.i + 1 < part.qs.length ? el("button", { type: "button", class: "btn primary", onclick: () => { T.i++; go("tests", "run"); } }, "Next ›")
          : el("button", { type: "button", class: "btn primary", onclick: () => { nav.hidden = false; nav.scrollIntoView({ block: "nearest" }); } }, "Review and end")),
      nav
    ];
  }

  function Results(c) {
    const { el, go } = c;
    const last = (c.state.tests || [])[(c.state.tests || []).length - 1];
    if (!last || !T || !T.done) { go("tests"); return []; }
    const out = [el("h1", { text: "Sample test results" }),
      el("section", { class: "card result" }, el("div", { class: "big num", text: last.right + " / " + last.total }),
        el("p", { text: "Scores aren't converted to the 200–600 scale: that needs a full-length test. What matters here is accuracy and pace." }),
        el("ul", { class: "rows", style: "text-align:left" }, last.parts.map((p) => el("li", { class: "row-item" },
          el("div", { class: "grow" }, el("span", { class: "t", text: p.short }), el("span", { class: "s", text: "Used " + mmss(p.sec) + " of " + mmss(p.limit) })),
          el("span", { class: "num strong", text: p.right + "/" + p.total }))))),
      el("div", { class: "row", style: "margin-bottom:20px" },
        el("button", { type: "button", class: "btn primary", onclick: () => { T = null; go("me"); } }, "Next: see your progress in Me"),
        el("button", { type: "button", class: "btn ghost", onclick: () => { T = null; go("tests"); } }, "Back to Tests")),
      el("h2", { text: "Review every question" })];
    T.parts.forEach((p) => {
      out.push(el("h3", { style: "margin-top:16px", text: p.name }));
      p.qs.forEach((q, i) => {
        const a = p.ans[i], ok = a === q.a;
        out.push(el("details", { class: "card review" + (ok ? " ok" : " miss") },
          el("summary", {}, el("span", { class: "mark", text: ok ? "✓" : a == null ? "–" : "✗" }), el("span", { class: "grow", text: "Question " + (i + 1) + (p.flag[i] ? " · flagged" : "") + (a == null ? " · not answered" : "") })),
          el("div", { class: "q", html: q.q }), q.fig ? el("div", { class: "fig", html: q.fig }) : null,
          el("div", { class: "opts" }, q.o.map((o, j) => el("div", { class: "opt" + (j === q.a ? " yes" : j === a ? " no" : "") }, el("span", { class: "L", text: LETTERS[j] }), el("span", { html: o })))),
          el("div", { class: "ex", style: "margin-top:10px", html: q.e })));
      });
    });
    return out;
  }

  root.DATTest = { Tests, BLUEPRINT, get active() { return T && !T.done; } };
})(window);
