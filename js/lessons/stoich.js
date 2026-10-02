/* Lesson: Stoichiometry — grams to grams, and the limiting reagent.
   DAT General Chemistry › Stoichiometry and General Concepts. No calculator on the real test,
   so every number is chosen to work out cleanly by hand. */
(function () {
  const C = window.PSCore;
  const MASS = { H: 1, C: 12, N: 14, O: 16, Mg: 24, Ca: 40, Fe: 56 };
  // [formula, molar mass, coefficient, reactant/product, elements used]
  const RX = [
    { eq: "2 H₂ + O₂ → 2 H₂O", sp: [["H₂", 2, 2, "r"], ["O₂", 32, 1, "r"], ["H₂O", 18, 2, "p"]], el: "HO" },
    { eq: "N₂ + 3 H₂ → 2 NH₃", sp: [["N₂", 28, 1, "r"], ["H₂", 2, 3, "r"], ["NH₃", 17, 2, "p"]], el: "HN" },
    { eq: "CH₄ + 2 O₂ → CO₂ + 2 H₂O", sp: [["CH₄", 16, 1, "r"], ["O₂", 32, 2, "r"], ["CO₂", 44, 1, "p"], ["H₂O", 18, 2, "p"]], el: "HCO" },
    { eq: "2 Mg + O₂ → 2 MgO", sp: [["Mg", 24, 2, "r"], ["O₂", 32, 1, "r"], ["MgO", 40, 2, "p"]], el: "OMg" },
    { eq: "C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O", sp: [["C₃H₈", 44, 1, "r"], ["O₂", 32, 5, "r"], ["CO₂", 44, 3, "p"], ["H₂O", 18, 4, "p"]], el: "HCO" },
    { eq: "CaCO₃ → CaO + CO₂", sp: [["CaCO₃", 100, 1, "r"], ["CaO", 56, 1, "p"], ["CO₂", 44, 1, "p"]], el: "CCaO" },
    { eq: "Fe₂O₃ + 3 CO → 2 Fe + 3 CO₂", sp: [["Fe₂O₃", 160, 1, "r"], ["CO", 28, 3, "r"], ["Fe", 56, 2, "p"], ["CO₂", 44, 3, "p"]], el: "CFeO" }
  ];
  const masses = (r) => "(" + Object.keys(MASS).filter((e) => (e.length === 2 ? r.el.includes(e) : r.el.replace(/Mg|Ca|Fe/g, "").includes(e))).map((e) => e + " = " + MASS[e]).join(", ") + ")";
  const N = (x) => C.fmtN(Math.round(x * 1000) / 1000);
  const g = (x) => N(x) + " g";
  const nice = (x) => Math.abs(x * 4 - Math.round(x * 4)) < 1e-9; // multiple of 0.25
  const near = (ans, ds) => ds.filter((d) => d > ans / 8 && d < ans * 8); // keep wrong answers believable

  function gramsToGrams(rng) {
    const r = rng.pick(RX);
    const reac = r.sp.filter((s) => s[3] === "r");
    const G = rng.pick(reac);
    const T = rng.pick(r.sp.filter((s) => s !== G));
    const opts = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5].filter((n) => nice((n * T[2]) / G[2]) && n * G[1] <= 500);
    const nG = rng.pick(opts), nT = (nG * T[2]) / G[2];
    const gG = nG * G[1], ans = nT * T[1];
    const m = C.mc(rng, ans, near(ans, [nG * T[1], ((nG * G[2]) / T[2]) * T[1], (gG * T[2]) / G[2], ans / 2, ans * 2]), (x) => g(x));
    return {
      q: "For the reaction <b>" + r.eq + "</b>, how many grams of " + T[0] + " are " + (T[3] === "p" ? "produced from" : "needed to react completely with") + " " + g(gG) + " of " + G[0] + (T[3] === "p" && reac.length > 1 ? " (other reactants in excess)" : "") + "? " + masses(r),
      o: m.o, a: m.a,
      e: "<div class='chain'><span class='box'>" + g(gG) + " " + G[0] + "</span><span class='arr'>÷ " + G[1] + "</span><span class='box'>" + N(nG) + " mol</span><span class='arr'>× " + T[2] + "/" + G[2] + "</span><span class='box'>" + N(nT) + " mol " + T[0] + "</span><span class='arr'>× " + T[1] + "</span><span class='box'>" + g(ans) + "</span></div>" +
        "Grams of " + G[0] + " ÷ molar mass gives moles; the coefficients " + T[2] + " " + T[0] + " : " + G[2] + " " + G[0] + " convert moles; × molar mass of " + T[0] + " gives grams. " +
        (Math.abs(nG * T[1] - ans) > 1e-9 ? "Skipping the mole ratio gives " + g(nG * T[1]) + "." : ""),
      note: "grams → moles (÷ M) → mole ratio (coefficients) → moles → grams (× M)"
    };
  }

  function limiting(rng) {
    const r = rng.pick(RX.filter((x) => x.sp.filter((s) => s[3] === "r").length === 2));
    const [A, B] = r.sp.filter((s) => s[3] === "r");
    const P = rng.pick(r.sp.filter((s) => s[3] === "p"));
    let nA, nB, tries = 0;
    do {
      nA = rng.pick([0.5, 1, 1.5, 2, 3, 4]); nB = rng.pick([0.5, 1, 1.5, 2, 3, 4, 5, 6]);
      tries++;
    } while ((Math.abs(nA / A[2] - nB / B[2]) < 1e-9 || nA * A[1] > 400 || nB * B[1] > 400 ||
      !nice(Math.min(nA / A[2], nB / B[2]) * P[2]) || !nice(Math.max(nA / A[2], nB / B[2]) * P[2])) && tries < 300);
    if (tries >= 300) throw { retry: true };
    const lim = nA / A[2] < nB / B[2] ? A : B, nLim = lim === A ? nA : nB;
    const ex = lim === A ? B : A, nEx = lim === A ? nB : nA;
    const nP = (nLim * P[2]) / lim[2], ans = nP * P[1];
    const wrong = (nEx * P[2]) / ex[2] * P[1];
    const m = C.mc(rng, ans, near(ans, [wrong, nLim * P[1], ans / 2, ans * 2, (nA * P[2] / A[2] + nB * P[2] / B[2]) * P[1]]), (x) => g(x));
    return {
      q: "A flask holds " + g(nA * A[1]) + " of " + A[0] + " and " + g(nB * B[1]) + " of " + B[0] + ". They react: <b>" + r.eq + "</b>. What is the maximum mass of " + P[0] + " that can form? " + masses(r),
      o: m.o, a: m.a,
      e: "Moles: " + A[0] + " = " + N(nA) + ", " + B[0] + " = " + N(nB) + ". Divide each by its coefficient: " + A[0] + " " + N(nA) + "/" + A[2] + " = " + N(nA / A[2]) + "; " + B[0] + " " + N(nB) + "/" + B[2] + " = " + N(nB / B[2]) + ". " +
        "<b>" + lim[0] + " is smaller, so it's limiting.</b> " + N(nLim) + " mol " + lim[0] + " × " + P[2] + "/" + lim[2] + " = " + N(nP) + " mol " + P[0] + " × " + P[1] + " = <b>" + g(ans) + "</b>. Starting from " + ex[0] + " (the reactant in excess) would wrongly give " + g(wrong) + ".",
      note: "Limiting reagent: divide each reactant's moles by its coefficient; the smallest runs out first and sets the yield."
    };
  }

  DATLessons.add({
    id: "gc-stoich-1", topic: "gc-stoich", section: "gc", minutes: 15,
    title: "Grams to grams: the mole map",
    covers: ["Molar mass from a formula", "Converting grams ↔ moles", "Using the coefficients of a balanced equation as a mole ratio", "Finding the limiting reagent when two reactants are given", "Percent yield", "Doing it all by hand (no calculator)"],
    outcomes: ["Convert grams of any reactant into grams of any product in three steps", "Spot the limiting reagent in seconds and use it to find the maximum yield", "Avoid the two classic traps: putting grams through the mole ratio, and starting from the reactant in excess"],
    onTest: "Stoichiometry shows up throughout General Chemistry, and the same mole-map thinking powers gas, solution and equilibrium questions.",
    intro: "Nearly every stoichiometry question on the DAT is the same three-step trip through moles. Learn the map once and you can do them by hand, fast.",
    explore(box, ctx) {
      const { el } = ctx;
      const holder = el("div");
      const views = [["1 · Molecules", (h) => DATViz.mixer(h, ctx)], ["2 · The mole map", (h) => this.moleMap(h, ctx)]];
      const seg = el("div", { class: "seg", role: "group", "aria-label": "View", style: "margin-bottom:10px" }, views.map(([t, fn], i) =>
        el("button", { type: "button", "aria-pressed": String(i === 0), onclick: (e) => { seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); holder.textContent = ""; fn(holder); } }, t)));
      box.append(el("p", { text: "Start with molecules you can see: mix two reactants and watch them pair up. Then switch to the mole map to see the same idea in grams and moles." }), seg, holder);
      views[0][1](holder);
    },
    moleMap(box, ctx) {
      const { el } = ctx;
      const sel = el("select", { "aria-label": "Reaction" }, RX.map((r, i) => el("option", { value: String(i), text: r.eq })));
      const giv = el("select", { "aria-label": "Starting substance" });
      const tgt = el("select", { "aria-label": "Substance to find" });
      const range = el("input", { type: "range", min: "1", max: "12", step: "1", value: "4", "aria-label": "Amount" });
      const out = el("div", { class: "readout" });
      function fill() {
        const r = RX[+sel.value];
        giv.textContent = ""; tgt.textContent = "";
        r.sp.forEach((s, i) => { giv.append(el("option", { value: String(i), text: s[0] })); tgt.append(el("option", { value: String(i), text: s[0] })); });
        tgt.value = String(r.sp.length - 1);
        paint();
      }
      function paint() {
        const r = RX[+sel.value], G = r.sp[+giv.value], T = r.sp[+tgt.value];
        const nG = +range.value * 0.5, nT = (nG * T[2]) / G[2];
        out.innerHTML = "<div class='chain'><span class='box'>" + g(nG * G[1]) + "<small>" + G[0] + "</small></span><span class='arr'>÷ " + G[1] + " g/mol</span><span class='box'>" + N(nG) + " mol<small>" + G[0] + "</small></span><span class='arr'>× " + T[2] + "/" + G[2] + "</span><span class='box'>" + N(nT) + " mol<small>" + T[0] + "</small></span><span class='arr'>× " + T[1] + " g/mol</span><span class='box'>" + g(nT * T[1]) + "<small>" + T[0] + "</small></span></div>" +
          "<span class='muted'>Notice: the grams don't scale by the coefficients. Only moles do. Try " + G[0] + " → " + G[0] + " to see the ratio become 1.</span>";
      }
      sel.addEventListener("change", fill); giv.addEventListener("change", paint); tgt.addEventListener("change", paint); range.addEventListener("input", paint);
      box.append(el("p", { text: "Pick a reaction, what you start with and what you want. Slide the amount and watch each step of the trip." }),
        el("label", { class: "ctrl" }, "Reaction", sel),
        el("div", { class: "grid2" }, el("label", { class: "ctrl" }, "Start with", giv), el("label", { class: "ctrl" }, "Find", tgt)),
        el("label", { class: "ctrl" }, "Amount you start with", range), out);
      fill();
    },
    rule: {
      html: "<p>Every grams-to-grams problem is the same trip. Moles are the only currency the balanced equation accepts.</p>" +
        "<div class='chain'><span class='box'>grams A</span><span class='arr'>÷ molar mass A</span><span class='box'>moles A</span><span class='arr'>× (coef B / coef A)</span><span class='box'>moles B</span><span class='arr'>× molar mass B</span><span class='box'>grams B</span></div>" +
        "<ol><li><b>Molar mass</b> from the periodic table: add up the atoms. Fe₂O₃ = 2(56) + 3(16) = 160 g/mol.</li>" +
        "<li><b>Mole ratio</b> comes from the coefficients of the balanced equation, never from the grams.</li>" +
        "<li><b>Two reactants given?</b> Find the limiting reagent first: divide each reactant's moles by its own coefficient. The smaller number runs out first and decides how much product forms.</li>" +
        "<li><b>Percent yield</b> = actual ÷ theoretical × 100.</li></ol>" +
        "<p><b>No calculator on the science section.</b> Write the whole trip as one fraction, cancel, then multiply. The answer choices are usually far enough apart that rounding molar masses is fine.</p>",
      keys: [
        "Grams → moles: divide by molar mass.",
        "Moles A → moles B: multiply by coef B / coef A. Only moles go through the ratio.",
        "Moles → grams: multiply by molar mass.",
        "Limiting reagent: moles ÷ coefficient for each reactant; the smallest is limiting.",
        "Percent yield = actual ÷ theoretical × 100.",
        "No calculator: set up one fraction and cancel before multiplying."
      ]
    },
    walk: {
      problem: "Iron is made from iron(III) oxide: <b>Fe₂O₃ + 3 CO → 2 Fe + 3 CO₂</b>.<br>How many grams of Fe form from <b>80 g of Fe₂O₃</b> with excess CO? Then we'll limit the CO. (Fe = 56, O = 16, C = 12)",
      steps: [
        { p: "What is the molar mass of Fe₂O₃?", o: ["72 g/mol", "104 g/mol", "160 g/mol", "176 g/mol"], a: 2, ok: "2(56) + 3(16) = 112 + 48 = 160 g/mol.", why: { 0: "72 is FeO (56 + 16). The formula has two Fe and three O.", 1: "That counts only one Fe: 56 + 48. Fe₂ means two.", 3: "Count the oxygens again: O₃ is three, 48 g." } },
        { p: "How many moles of Fe₂O₃ are in 80 g?", o: ["0.25 mol", "0.5 mol", "1.5 mol", "2 mol"], a: 1, ok: "80 ÷ 160 = 0.5 mol.", why: { 3: "That's 160 ÷ 80. Grams ÷ molar mass: 80 ÷ 160." } },
        { p: "From the balanced equation, what is the mole ratio of Fe to Fe₂O₃?", o: ["1 Fe : 1 Fe₂O₃", "2 Fe : 1 Fe₂O₃", "1 Fe : 2 Fe₂O₃", "3 Fe : 1 Fe₂O₃"], a: 1, ok: "The coefficients: 2 Fe for every 1 Fe₂O₃.", why: { 3: "3 is the coefficient of CO and CO₂, not Fe." } },
        { p: "So how many moles of Fe form?", o: ["0.25 mol", "0.5 mol", "1.0 mol", "1.5 mol"], a: 2, ok: "0.5 mol × 2/1 = 1.0 mol Fe." },
        { p: "How many grams of Fe is that?", o: ["28 g", "56 g", "80 g", "112 g"], a: 1, ok: "1.0 mol × 56 g/mol = 56 g. Quick check: Fe₂O₃ is 112/160 = 70% iron by mass, and 70% of 80 g is 56 g ✓", why: { 2: "Mass of product isn't the mass of reactant: the oxygen leaves as CO₂.", 3: "That's 2 mol of Fe. You made 1.0 mol." } },
        { p: "Now only <b>21 g of CO</b> is available, with the same 80 g of Fe₂O₃. How many moles of CO is that? (CO = 28 g/mol)", o: ["0.5 mol", "0.75 mol", "1.33 mol", "1.5 mol"], a: 1, ok: "21 ÷ 28 = 0.75 mol." },
        { p: "Divide each reactant's moles by its coefficient: Fe₂O₃ 0.5 ÷ 1 = 0.5, CO 0.75 ÷ 3 = 0.25. Which reactant is limiting?", o: ["Fe₂O₃", "CO", "Neither; they run out together", "Can't tell without the products"], a: 1, ok: "CO gives the smaller number (0.25 < 0.5), so CO runs out first.", why: { 0: "Compare moles ÷ coefficient, not raw moles. CO's 0.75 ÷ 3 = 0.25 is smaller." } },
        { p: "How many grams of Fe can form now?", o: ["14 g", "28 g", "42 g", "56 g"], a: 1, ok: "Start from the limiting reagent: 0.75 mol CO × (2 Fe / 3 CO) = 0.5 mol Fe × 56 = 28 g. Some Fe₂O₃ is left over.", why: { 3: "56 g is what the Fe₂O₃ could make. The CO runs out first, so it decides." } }
      ],
      wrap: "<b>Walk-through done.</b> The whole trip was: grams → moles → ratio → moles → grams, with one extra check when two reactants are given. Your turn: new reactions, new numbers."
    },
    soloCount: 3,
    solo(rng, k) { return k < 2 ? gramsToGrams(rng) : limiting(rng); }
  });
})();
