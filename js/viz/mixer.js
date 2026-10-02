/* Molecule mixer for the stoichiometry lesson: pick how many molecules of each reactant go in,
   guess which runs out first (optional), then React. Molecules pair up in the ratio of the
   coefficients; whatever is left over is the excess reactant. No chemistry knowledge needed. */
(function (root) {
  const COLOR = { H: "var(--atom-h)", O: "var(--atom-o)", N: "var(--atom-n)" };
  const RXN = [
    { eq: "2 H₂ + O₂ → 2 H₂O", r: [["H₂", 2, "HH"], ["O₂", 1, "OO"]], p: ["H₂O", 2, "OHH"], max: [12, 6], start: [7, 3] },
    { eq: "N₂ + 3 H₂ → 2 NH₃", r: [["N₂", 1, "NN"], ["H₂", 3, "HH"]], p: ["NH₃", 2, "NHHH"], max: [5, 12], start: [3, 7] }
  ];
  // Atom offsets inside one molecule (radius 6–7).
  const SHAPES = { HH: [[-5, 0], [5, 0]], OO: [[-6, 0], [6, 0]], NN: [[-6, 0], [6, 0]], OHH: [[0, -2], [-8, 6], [8, 6]], NHHH: [[0, -2], [-9, 5], [9, 5], [0, 10]] };
  const R = { H: 5, O: 7, N: 7 };
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function molecule(form, x, y, cls) {
    return "<g class='mz " + (cls || "") + "' transform='translate(" + x + " " + y + ")'>" +
      SHAPES[form].map(([dx, dy], i) => "<circle cx='" + dx + "' cy='" + dy + "' r='" + R[form[i]] + "' fill='" + COLOR[form[i]] + "' stroke='var(--ink-3)' stroke-width='1'/>").join("") + "</g>";
  }

  function mixer(box, ctx) {
    const { el } = ctx;
    let rx = RXN[0];
    const how = root.DATViz.howTo(el, ["Pick a reaction.", "Use the sliders to set how many molecules of each reactant go in.", "Guess which one will run out first (optional).", "Press React and watch them pair up."]);
    const pick = el("div", { class: "seg", role: "group", "aria-label": "Reaction" }, RXN.map((r, i) => el("button", { type: "button", "aria-pressed": String(i === 0), onclick: (e) => { rx = r; pick.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); setup(); how.at(1); } }, r.eq)));
    const sA = el("input", { type: "range", min: "0", step: "1" }), sB = el("input", { type: "range", min: "0", step: "1" });
    const lA = el("span"), lB = el("span");
    const fig = el("div", { class: "fig" });
    const guess = el("div", { class: "seg", role: "group", "aria-label": "Your guess" });
    const out = el("div", { class: "readout", "aria-live": "polite" });
    const go = el("button", { type: "button", class: "btn primary" }, "React");
    let guessed = null, reacted = false;

    function setup() {
      sA.max = rx.max[0]; sB.max = rx.max[1]; sA.value = rx.start[0]; sB.value = rx.start[1];
      guess.textContent = "";
      [rx.r[0][0], rx.r[1][0], "Neither"].forEach((g) => guess.append(el("button", { type: "button", "aria-pressed": "false", onclick: (e) => { guessed = g; guess.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); how.at(3); } }, g)));
      draw();
    }
    function counts() { return [+sA.value, +sB.value]; }
    function layout(n, row0) { return Array.from({ length: n }, (_, i) => [24 + (i % 5) * 30, row0 + Math.floor(i / 5) * 30]); }
    function draw() {
      reacted = false; guessed = null; guess.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      const [a, b] = counts();
      lA.textContent = a + " " + rx.r[0][0]; lB.textContent = b + " " + rx.r[1][0];
      const A = layout(a, 40), B = layout(b, 40 + Math.ceil(Math.max(a, 1) / 5) * 30 + 8);
      let s = "<svg viewBox='0 0 344 236' class='mixer' role='img' aria-label='" + a + " " + rx.r[0][0] + " and " + b + " " + rx.r[1][0] + " molecules'>" +
        "<rect x='2' y='2' width='160' height='232' rx='14' class='pan'/><rect x='182' y='2' width='160' height='232' rx='14' class='pan'/>" +
        "<text x='82' y='22' class='lbl'>Reactants</text><text x='262' y='22' class='lbl'>Products</text><text x='172' y='122' class='lbl arrow'>→</text>";
      A.forEach(([x, y], i) => (s += molecule(rx.r[0][2], x, y, "a a" + i)));
      B.forEach(([x, y], i) => (s += molecule(rx.r[1][2], x, y, "b b" + i)));
      s += "<g class='prods'></g></svg>";
      fig.innerHTML = s;
      out.innerHTML = "<span class='muted'>The result appears here after you press <b>React</b>.</span>";
    }
    function react() {
      if (reacted) { draw(); return; }
      reacted = true; how.finish();
      const [a, b] = counts(), [ca, cb] = [rx.r[0][1], rx.r[1][1]];
      const k = Math.min(Math.floor(a / ca), Math.floor(b / cb)); // times the reaction can run
      const svg = fig.querySelector("svg"), prods = svg.querySelector(".prods");
      const made = k * rx.p[1];
      const P = layout(made, 40).map(([x, y]) => [x + 180, y]);
      const usedA = k * ca, usedB = k * cb;
      const delay = reduce() ? 0 : 260;
      for (let e = 0; e < k; e++) {
        setTimeout(() => {
          if (!svg.isConnected) return;
          for (let j = 0; j < ca; j++) svg.querySelector(".a" + (e * ca + j)).classList.add("used");
          for (let j = 0; j < cb; j++) svg.querySelector(".b" + (e * cb + j)).classList.add("used");
          for (let j = 0; j < rx.p[1]; j++) { const [x, y] = P[e * rx.p[1] + j]; prods.insertAdjacentHTML("beforeend", molecule(rx.p[2], x, y, "new")); }
        }, e * delay);
      }
      setTimeout(() => {
        if (!svg.isConnected) return;
        for (let i = usedA; i < a; i++) svg.querySelector(".a" + i).classList.add("left");
        for (let i = usedB; i < b; i++) svg.querySelector(".b" + i).classList.add("left");
        const leftA = a - usedA, leftB = b - usedB;
        const ra = a / ca, rb = b / cb;
        const lim = Math.abs(ra - rb) < 1e-9 ? "Neither" : ra < rb ? rx.r[0][0] : rx.r[1][0];
        let msg = "<b>Made " + made + " " + rx.p[0] + ".</b> ";
        if (k === 0) msg = "<b>No reaction:</b> there isn't enough of one reactant for even one round (" + rx.eq + " needs " + ca + " " + rx.r[0][0] + " with " + cb + " " + rx.r[1][0] + "). ";
        if (k === 0) { /* nothing to compare */ } else if (lim === "Neither") msg += "Both ran out together: the amounts were exactly in the " + ca + " : " + cb + " ratio. ";
        else {
          const limA = lim === rx.r[0][0];
          const exName = limA ? rx.r[1][0] : rx.r[0][0], leftEx = limA ? leftB : leftA, leftLim = limA ? leftA : leftB, cLim = limA ? ca : cb;
          msg += "<b>" + lim + " runs short first, so it's the limiting reagent.</b> " + (leftEx ? "Left over (excess): " + leftEx + " " + exName + ". " : "") +
            (leftLim ? "The " + leftLim + " " + lim + " still there can't start another round, because each round needs " + cLim + " " + lim + ". " : "");
        }
        msg += "<br><span class='muted'>The shortcut, without drawing: " + rx.r[0][0] + " " + a + " ÷ " + ca + " = " + +(a / ca).toFixed(2) + ", " + rx.r[1][0] + " " + b + " ÷ " + cb + " = " + +(b / cb).toFixed(2) + ". The smaller number is limiting. It works the same with moles.</span>";
        if (guessed) msg = (guessed === lim ? "✓ Your guess was right. " : "Your guess was " + guessed + ". ") + msg;
        out.innerHTML = msg;
        go.textContent = "Try again";
      }, k * delay + 150);
      go.textContent = "Reacting…";
    }
    sA.addEventListener("input", () => { go.textContent = "React"; draw(); how.at(2); });
    sB.addEventListener("input", () => { go.textContent = "React"; draw(); how.at(2); });
    go.addEventListener("click", () => { if (reacted) { go.textContent = "React"; draw(); how.at(1); } else react(); });
    box.append(how.node, root.DATViz.layout(el, {
      fig,
      ctrl: el("div", { class: "ctrls" },
        el("div", { class: "ctrl" }, el("span", { text: "Reaction" }), pick),
        el("label", { class: "ctrl" }, el("span", {}, "First reactant: ", lA), sA),
        el("label", { class: "ctrl" }, el("span", {}, "Second reactant: ", lB), sB),
        el("div", { class: "ctrl" }, el("span", { text: "Your guess: which runs out first?" }), guess),
        el("div", { class: "row" }, go)),
      out
    }));
    setup();
  }

  root.DATViz = Object.assign(root.DATViz || {}, { mixer });
})(window);
