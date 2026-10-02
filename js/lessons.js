/* DAT Prep — lesson engine, modeled on the Geometry Lab.
   Each lesson has four stages that unlock in order:
     1. Explore  — an interactive figure to build intuition (can be skipped)
     2. The rule — the few facts or steps to remember, each savable to notes
     3. Walk through it — one exam-style problem, one small decision at a time
     4. Your turn — fresh questions every time, no steps; feeds the skill matrix
   Lessons register with DATLessons.add({...}) from files in js/lessons/. */
(function (root) {
  "use strict";
  const list = [];
  const byId = {};
  const byTopic = {};
  function add(l) { list.push(l); byId[l.id] = l; (byTopic[l.topic] = byTopic[l.topic] || []).push(l); }

  const LETTERS = ["A", "B", "C", "D", "E"];

  // ctx: { state, save, el, toast, go, record(topicId, correct) }
  function render(lesson, ctx) {
    const { el, state, save } = ctx;
    const p = (state.lessons[lesson.id] = Object.assign({ st: 0, walk: 0, solo: null, best: 0, done: null }, state.lessons[lesson.id] || {}));
    const host = el("div", { class: "lesson c-" + lesson.section });

    const stages = [
      { n: 1, key: "explore", title: "Explore" },
      { n: 2, key: "rule", title: lesson.ruleTitle || "The rule" },
      { n: 3, key: "walk", title: "Walk through it" },
      { n: 4, key: "solo", title: "Your turn" }
    ];

    function unlock(to) { if (p.st < to) { p.st = to; save(); draw(); const nx = host.querySelector('[data-stage="' + (to + 1) + '"]'); if (nx) setTimeout(() => nx.scrollIntoView({ behavior: "smooth", block: "start" }), 60); } }

    function stageCard(s, body) {
      const locked = s.n - 1 > p.st;
      const done = s.n <= p.st;
      return el("section", { class: "card stage" + (locked ? " locked" : "") + (done ? " done" : ""), "data-stage": s.n },
        el("div", { class: "sh" }, el("span", { class: "sn", text: done ? "✓" : String(s.n) }), el("h2", { text: s.title })),
        locked ? el("p", { class: "muted small", text: "Finish step " + (s.n - 1) + " to unlock." }) : body());
    }

    function draw() {
      host.textContent = "";
      host.append(
        el("nav", { class: "crumbs", "aria-label": "Breadcrumb" },
          el("button", { type: "button", class: "back", onclick: () => ctx.go("learn") }, "Learn"), el("span", { "aria-hidden": "true", text: "›" }),
          el("button", { type: "button", class: "back", onclick: () => ctx.go("learn", lesson.section) }, ctx.sectionName(lesson.section)), el("span", { "aria-hidden": "true", text: "›" }),
          el("span", { class: "here", text: ctx.topicName(lesson.topic) })),
        el("h1", { class: "lesson-title", text: lesson.title }),
        el("p", { class: "lede", text: lesson.intro }),
        el("div", { class: "lprog" },
          el("span", { class: "small", text: p.done ? "Lesson complete · about " + lesson.minutes + " min" : "Step " + Math.min(4, p.st + 1) + " of 4: " + stages[Math.min(3, p.st)].title + " · about " + lesson.minutes + " min" }),
          el("div", { class: "progress-dots", "aria-hidden": "true" }, stages.map((s) => el("span", { class: s.n <= p.st ? "on" : "" })))));

      // Before you start: what the lesson covers and what she'll be able to do after it.
      if (lesson.covers || lesson.outcomes) host.append(el("details", { class: "card overview", open: !p.st },
        el("summary", {}, el("h2", { style: "margin:0", text: "Before you start" }), el("span", { class: "small muted", text: p.st ? "Show" : "Hide" })),
        el("div", { class: "grid2", style: "margin-top:10px" },
          lesson.covers ? el("div", {}, el("h3", { text: "What this lesson covers" }), el("ul", {}, lesson.covers.map((x) => el("li", { text: x })))) : null,
          lesson.outcomes ? el("div", {}, el("h3", { text: "By the end, you'll be able to" }), el("ul", { class: "outcomes" }, lesson.outcomes.map((x) => el("li", { text: x })))) : null),
        lesson.onTest ? el("p", { class: "small muted", style: "margin:8px 0 0" }, el("strong", { text: "On the DAT: " }), lesson.onTest) : null,
        el("p", { class: "tiny muted", style: "margin:8px 0 0", text: "Four steps, about " + lesson.minutes + " minutes: Explore → " + (lesson.ruleTitle || "The rule") + " → Walk through it → Your turn." })));

      // 1. Explore
      host.append(stageCard(stages[0], () => {
        const box = el("div", { class: "explore" });
        lesson.explore(box, ctx);
        return el("div", {}, box, el("div", { class: "row", style: "margin-top:12px" },
          p.st >= 1 ? null : el("button", { type: "button", class: "btn next", onclick: () => unlock(1) }, "I've got the idea"),
          p.st >= 1 ? null : el("button", { type: "button", class: "btn ghost small", onclick: () => unlock(1) }, "Skip this step")));
      }));

      // 2. Rule
      host.append(stageCard(stages[1], () => {
        const body = el("div", { class: "rule" });
        body.innerHTML = lesson.rule.html;
        const keys = el("div", { class: "keys" }, el("h3", { text: "Key points" }),
          lesson.rule.keys.map((k) => el("div", { class: "keypt" }, el("span", { text: k }),
            el("button", { type: "button", class: "btn small ghost", "aria-label": "Add to notes: " + k, onclick: (e) => { ctx.notes.append(lesson.id, "• " + k); e.currentTarget.textContent = "Added ✓"; e.currentTarget.disabled = true; } }, "Add to notes"))));
        // Optional hands-on check that uses what the rule just taught: predict, then watch.
        let lab = null;
        if (lesson.lab) { const lb = el("div"); lesson.lab(lb, ctx); lab = el("div", { class: "lab" }, el("h3", { text: "Try it: predict, then watch" }), el("p", { class: "small muted", text: lesson.labIntro || "Use what you just learned. Make your prediction, then see what happens." }), lb); }
        return el("div", {}, body, keys, lab, p.st >= 2 ? null : el("button", { type: "button", class: "btn " + (lesson.lab ? "next" : "primary"), style: "margin-top:12px", onclick: () => unlock(2) }, "Got it, walk me through one"));
      }));

      // 3. Walk through it
      host.append(stageCard(stages[2], () => walk()));

      // 4. Your turn
      host.append(stageCard(stages[3], () => solo()));

      if (p.done) {
        // Finishing leads somewhere: what changed, and the next lesson in her plan.
        const m = ctx.mastery(lesson.topic), nx = ctx.nextLesson(lesson.id);
        host.append(el("section", { class: "card done-card" },
          el("h2", { text: "Lesson complete" }),
          el("p", {}, m.real ? [el("strong", { text: ctx.topicName(lesson.topic) + ": " + m.v + "%" }), " (" + m.src + "). "]
            : "You've answered " + ((ctx.state.skills[lesson.topic] || {}).n || 0) + " questions on " + ctx.topicName(lesson.topic) + "; your skill score appears after 5. ",
            "Best round: " + p.best + " of " + (lesson.soloCount || 3) + ". Another round any time gives you new questions."),
          el("div", { class: "row" },
            nx ? el("button", { type: "button", class: "btn primary", onclick: () => ctx.go("learn", nx.id) }, "Next up: " + nx.title) : el("button", { type: "button", class: "btn primary", onclick: () => ctx.go("learn", lesson.section) }, "Back to " + ctx.sectionName(lesson.section)),
            el("button", { type: "button", class: "btn", onclick: () => ctx.practice(lesson.id) }, "Practice this topic"),
            el("button", { type: "button", class: "btn ghost", onclick: () => ctx.openNotes(lesson.id) }, "Review my notes"))));
      }
    }

    function walk() {
      const W = lesson.walk, box = el("div", { class: "walk" });
      box.append(el("div", { class: "problem", html: W.problem }));
      if (W.fig) box.append(el("div", { class: "fig", html: W.fig }));
      const steps = el("div", { class: "wsteps" });
      box.append(steps);
      let miss = 0;
      function paint() {
        steps.textContent = "";
        W.steps.forEach((x, k) => {
          if (k < p.walk) steps.append(el("div", { class: "wstep done" }, el("p", { class: "p", html: x.p }), el("p", { class: "ans", html: "✓ " + x.o[x.a] }), x.ok ? el("p", { class: "ex", html: x.ok }) : null));
          else if (k === p.walk) {
            const fb = el("p", { class: "fb", role: "status" });
            steps.append(el("div", { class: "wstep cur" },
              el("p", { class: "p", html: "<b>Step " + (k + 1) + " of " + W.steps.length + ".</b> " + x.p }),
              x.tool ? (() => { const tb = el("div", { class: "tool" }); x.tool(tb, ctx); return tb; })() : null,
              el("div", { class: "opts" }, x.o.map((o, i) => el("button", { type: "button", class: "opt", html: o, onclick: (e) => {
                if (i === x.a) { p.walk++; miss = 0; if (p.walk >= W.steps.length) { save(); unlock(3); } else { save(); paint(); } }
                else { miss++; e.currentTarget.classList.add("no"); e.currentTarget.disabled = true; fb.innerHTML = (x.why && x.why[i]) || x.hint || "Not quite. Look at what the step asks for and try again."; }
              } }))), fb));
          }
        });
        if (p.walk >= W.steps.length) steps.append(el("div", { class: "note", html: W.wrap || "<b>Walk-through done.</b> Your turn is open: same idea, new numbers, no steps." }));
      }
      paint();
      return box;
    }

    function solo() {
      const n = lesson.soloCount || 3;
      const rng = root.PSCore.makeRng();
      let round = { qs: [], i: 0, right: 0 };
      for (let k = 0; k < n; k++) { let q, tries = 0; do { try { q = lesson.solo(rng, k); } catch (e) { q = null; } } while (!q && ++tries < 20); round.qs.push(q); }
      const box = el("div", { class: "solo" });
      function show() {
        box.textContent = "";
        if (round.i >= n) {
          const star = round.right === n;
          p.best = Math.max(p.best, round.right);
          if (!p.done && round.right >= Math.ceil(n * 2 / 3)) p.done = ctx.today();
          save();
          box.append(el("div", { class: "result" + (star ? " star" : "") },
            el("div", { class: "big num", text: round.right + " / " + n }),
            el("p", { text: star ? "⭐ All first try. That's exam-ready for this lesson." : round.right >= Math.ceil(n * 2 / 3) ? "Good. Try another round to lock it in." : "Worth another round. Reread the rule, then try fresh questions." })),
            el("div", { class: "row" }, el("button", { type: "button", class: "btn primary", onclick: () => { box.replaceWith(solo()); } }, "New questions"),
              p.done && !host.querySelector(".done-card") ? el("button", { type: "button", class: "btn", onclick: draw }, "Finish lesson") : null));
          return;
        }
        const q = round.qs[round.i];
        const fb = el("div", { class: "fbx", role: "status" });
        const opts = el("div", { class: "opts" + (q.optCls ? " " + q.optCls : "") });
        let answered = false;
        q.o.forEach((o, i) => opts.append(el("button", { type: "button", class: "opt", onclick: (e) => {
          if (answered) return; answered = true;
          const ok = i === q.a;
          if (ok) round.right++;
          ctx.record(lesson.topic, ok, lesson.section);
          opts.querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (j === q.a) b.classList.add("yes"); });
          if (!ok) e.currentTarget.classList.add("no");
          fb.append(el("p", { class: ok ? "good" : "bad", html: ok ? "<b>Correct.</b>" : "<b>Not this time.</b> The answer is " + LETTERS[q.a] + "." }), el("div", { class: "ex", html: q.e }),
            el("button", { type: "button", class: "btn primary", style: "margin-top:10px", onclick: () => { round.i++; show(); } }, round.i + 1 < n ? "Next question" : "See my result"));
          if (!ok && q.note) fb.append(el("button", { type: "button", class: "btn small ghost", onclick: (ev) => { ctx.notes.append(lesson.id, "• Missed: " + q.note); ev.currentTarget.textContent = "Added ✓"; ev.currentTarget.disabled = true; } }, "Add this to notes"));
        } }, el("span", { class: "L", text: LETTERS[i] }), el("span", { html: o }))));
        box.append(el("div", { class: "tiny muted", text: "Question " + (round.i + 1) + " of " + n }),
          el("div", { class: "q", html: q.q }), q.fig ? el("div", { class: "fig", html: q.fig }) : null, opts, fb);
      }
      show();
      return box;
    }

    draw();
    return host;
  }

  root.DATLessons = { add, list, byId, byTopic, render };
})(window);
