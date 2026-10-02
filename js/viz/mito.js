/* Interactive mitochondrion for the cellular respiration lesson.
   Part 1: step a glucose through the four stages; each lights up where it happens and the
           per-glucose tally (ATP, NADH, FADH₂, CO₂) adds up.
   Part 2: the electron transport chain, animated. Electrons flow down complexes I–IV, protons are
           pumped into the intermembrane space and flow back through ATP synthase. She picks a blocker,
           predicts what happens to O₂ use and ATP, then watches. The model is qualitative: one dot
           stands for several protons, and rates are shown relative to normal. */
(function (root) {
  const NS = "http://www.w3.org/2000/svg";
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };

  const STAGES = [
    { name: "Glycolysis", where: "Cytosol", add: { atp: 2, nadh: 2, fadh2: 0, co2: 0 }, say: "Glucose (6 carbons) is split into 2 pyruvate (3 carbons each) in the cytosol. Net 2 ATP and 2 NADH. No oxygen needed." },
    { name: "Pyruvate oxidation", where: "Matrix", add: { atp: 0, nadh: 2, fadh2: 0, co2: 2 }, say: "Each pyruvate enters the matrix and loses a carbon as CO₂, becoming acetyl-CoA. 2 NADH and 2 CO₂ per glucose." },
    { name: "Citric acid cycle", where: "Matrix", add: { atp: 2, nadh: 6, fadh2: 2, co2: 4 }, say: "Two turns of the cycle (one per acetyl-CoA) release 4 more CO₂, so by now all 6 of glucose's carbons have left as CO₂. Most of the energy is now held in NADH and FADH₂." },
    { name: "Electron transport chain", where: "Inner membrane", add: { atp: 27, nadh: -10, fadh2: -2, co2: 0 }, say: "NADH and FADH₂ hand their electrons to the chain. The energy pumps protons, and ATP synthase uses the proton flow to make about 26–28 ATP. O₂ takes the electrons at the end, forming water." }
  ];

  function overviewSvg() {
    return "<svg viewBox='0 0 360 236' class='mito' role='img' aria-label='A cell with a mitochondrion. Glycolysis happens in the cytosol; pyruvate oxidation and the citric acid cycle in the matrix; the electron transport chain on the inner membrane.'>" +
      "<rect x='2' y='2' width='356' height='232' rx='18' class='cyto'/>" +
      "<text x='16' y='24' class='lbl'>Cytosol</text>" +
      "<rect x='10' y='34' width='108' height='190' rx='14' class='zone' data-z='0'/>" +
      // glucose → 2 pyruvate
      "<g class='mol' data-m='glu'><polygon points='64,60 80,69 80,87 64,96 48,87 48,69' class='hex'/><text x='64' y='82' class='t'>glucose</text></g>" +
      "<path d='M58 102 L42 140 M70 102 L86 140' class='arr'/>" +
      "<g class='mol' data-m='pyr'><polygon points='42,148 54,170 30,170' class='tri'/><polygon points='86,148 98,170 74,170' class='tri'/><text x='64' y='190' class='t'>2 pyruvate</text></g>" +
      // mitochondrion
      "<ellipse cx='240' cy='124' rx='112' ry='92' class='outer'/>" +
      "<path d='M150 124 C150 70 190 46 240 46 C290 46 330 70 330 124 C330 178 290 202 240 202 C190 202 150 178 150 124 Z' class='inner' data-z='3'/>" +
      "<path d='M200 50 C206 80 214 84 220 52 M262 52 C268 84 276 80 282 58 M196 198 C204 168 212 166 218 200 M258 200 C266 170 276 172 284 192' class='crista'/>" +
      "<text x='240' y='40' class='lbl s'>intermembrane space</text>" +
      "<text x='240' y='230' class='lbl s'>mitochondrion</text>" +
      "<ellipse cx='240' cy='124' rx='74' ry='60' class='zone' data-z='1 2'/>" +
      "<text x='240' y='98' class='lbl'>Matrix</text>" +
      // pyruvate → acetyl-CoA
      "<path d='M100 160 C130 160 150 140 172 132' class='arr' data-a='1'/>" +
      "<g class='mol' data-m='acoa'><text x='184' y='150' class='t'>acetyl-CoA</text></g>" +
      // Krebs cycle
      "<g class='mol' data-m='krebs'><circle cx='254' cy='132' r='24' class='cycle'/><path d='M254 108 l8 -5 l0 10 z' class='head'/><text x='254' y='136' class='t'>Krebs</text></g>" +
      "<g class='bubbles' data-b='1'><circle cx='176' cy='108' r='8' class='co2'/><text x='176' y='111' class='t xs'>CO₂</text></g>" +
      "<g class='bubbles' data-b='2'><circle cx='292' cy='104' r='8' class='co2'/><text x='292' y='107' class='t xs'>CO₂</text><circle cx='296' cy='156' r='8' class='co2'/><text x='296' y='159' class='t xs'>CO₂</text></g>" +
      "</svg>";
  }

  function etcSvg() {
    const cx = { I: 46, II: 102, III: 170, IV: 240, S: 318 };
    let s = "<svg viewBox='0 0 360 262' class='mito etc' role='img' aria-label='The electron transport chain in the inner mitochondrial membrane, with ATP synthase'>" +
      "<rect x='0' y='0' width='360' height='92' class='ims'/><text x='10' y='16' class='lbl s' text-anchor='start'>Intermembrane space</text>" +
      "<rect x='0' y='92' width='360' height='48' class='memb'/><text x='352' y='104' class='lbl xs' text-anchor='end'>inner membrane</text>" +
      "<rect x='0' y='140' width='360' height='122' class='matrix'/><text x='10' y='256' class='lbl s' text-anchor='start'>Matrix</text>";
    s += "<rect x='" + (cx.I - 20) + "' y='84' width='40' height='64' rx='10' class='cx' data-c='I'/><text x='" + cx.I + "' y='120' class='t'>I</text>";
    s += "<rect x='" + (cx.II - 15) + "' y='118' width='30' height='32' rx='8' class='cx' data-c='II'/><text x='" + cx.II + "' y='138' class='t'>II</text>";
    s += "<rect x='" + (cx.III - 20) + "' y='84' width='40' height='64' rx='10' class='cx' data-c='III'/><text x='" + cx.III + "' y='120' class='t'>III</text>";
    s += "<rect x='" + (cx.IV - 20) + "' y='84' width='40' height='64' rx='10' class='cx' data-c='IV'/><text x='" + cx.IV + "' y='120' class='t'>IV</text>";
    s += "<circle cx='136' cy='116' r='7' class='carrier'/><text x='136' y='119' class='t xs'>Q</text>";
    s += "<circle cx='205' cy='80' r='7' class='carrier'/><text x='205' y='83' class='t xs'>c</text>";
    // ATP synthase: channel in membrane + head in matrix
    s += "<rect x='" + (cx.S - 12) + "' y='84' width='24' height='64' rx='8' class='syn' data-c='S'/><rect x='" + (cx.S - 4) + "' y='148' width='8' height='16' class='syn'/><circle cx='" + cx.S + "' cy='180' r='18' class='syn' data-c='S'/><text x='" + cx.S + "' y='184' class='t xs'>ATP syn.</text>";
    s += "<text x='46' y='188' class='t'>NADH</text><text x='102' y='174' class='t xs'>FADH₂</text>";
    s += "<text x='240' y='192' class='t xs'>O₂ → H₂O</text>";
    s += "<g class='block' data-x='IV'><path d='M222 92 l36 48 M258 92 l-36 48'/></g>";
    s += "<g class='block' data-x='S'><path d='M300 92 l36 48 M336 92 l-36 48'/></g>";
    s += "<g class='hims'></g><g class='parts'></g></svg>";
    return { svg: s, cx };
  }

  // part: "tour" (Explore: teaches as she taps, no questions) or "lab" (after the rule: predict, then watch).
  function mito(box, ctx, part) {
    const { el } = ctx;
    const lab = part === "lab";
    const views = el("div");
    let stopSim = () => {};
    let viewBtns = [];
    if (lab) box.append(views);
    else {
      const seg = el("div", { class: "seg", role: "group", "aria-label": "View" });
      viewBtns = [["Follow a glucose", showOverview], ["Watch the chain", showEtc]].map(([t, fn], i) =>
        el("button", { type: "button", "aria-pressed": String(i === 0), onclick: () => { viewBtns.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); fn(); } }, t));
      seg.append(...viewBtns);
      box.append(seg, views);
    }

    /* ---------- Part 1: follow a glucose ---------- */
    function showOverview() {
      stopSim(); views.textContent = "";
      let at = -1;
      const pic = el("div", { class: "fig", html: overviewSvg() });
      const svg = pic.querySelector("svg");
      const tally = el("div", { class: "tally" });
      const say = el("p", { class: "readout", "aria-live": "polite" });
      const steps = el("div", { class: "stepper" }, STAGES.map((s, i) => el("button", { type: "button", onclick: () => go(i) }, el("b", { text: String(i + 1) }), s.name)));
      const next = el("button", { type: "button", class: "btn primary" }, "Start: glycolysis");
      next.addEventListener("click", () => go(at + 1 > 3 ? 0 : at + 1));
      function totals(n) { const t = { atp: 0, nadh: 0, fadh2: 0, co2: 0 }; for (let i = 0; i <= n; i++) for (const k in t) t[k] += STAGES[i].add[k]; return t; }
      function go(i) {
        at = i;
        const t = totals(i);
        svg.querySelectorAll("[data-z]").forEach((z) => z.classList.toggle("on", z.getAttribute("data-z").split(" ").includes(String(i))));
        const show = { glu: i >= 0, pyr: i >= 0, acoa: i >= 1, krebs: i >= 2 };
        svg.querySelectorAll("[data-m]").forEach((m) => m.classList.toggle("dim", !show[m.getAttribute("data-m")]));
        svg.querySelector("[data-a='1']").classList.toggle("dim", i < 1);
        svg.querySelectorAll("[data-b]").forEach((b) => b.classList.toggle("show", +b.getAttribute("data-b") <= i && i < 3));
        svg.querySelector("[data-m='krebs']").classList.toggle("spin", i === 2 && !reduce());
        steps.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
        const s = STAGES[i];
        say.innerHTML = "<b>" + (i + 1) + ". " + s.name + "</b> · " + s.where + "<br>" + s.say;
        const nadhLeft = Math.max(0, t.nadh), fLeft = Math.max(0, t.fadh2);
        tally.innerHTML = "<div class='eyebrow'>Running total per glucose</div><div class='tl'>" +
          [["ATP", i === 3 ? "30–32" : t.atp, "atp"], ["NADH", i === 3 ? "used" : nadhLeft, "nadh"], ["FADH₂", i === 3 ? "used" : fLeft, "fadh"], ["CO₂", t.co2, "co2"]]
            .map(([k, v, c]) => "<div class='tk " + c + "'><b>" + v + "</b><span>" + k + "</span></div>").join("") + "</div>";
        next.textContent = i < 3 ? "Next: " + STAGES[i + 1].name.toLowerCase() : "Start over";
        if (i === 3) say.innerHTML += "<br><button type='button' class='btn small' style='margin-top:8px' data-go-etc>See the chain in action →</button>";
        const b = say.querySelector("[data-go-etc]"); if (b) b.addEventListener("click", () => viewBtns[1].click());
      }
      views.append(pic, steps, tally, say, el("div", { class: "row" }, next));
      say.innerHTML = "Tap <b>Start</b> to follow one glucose molecule. Watch where each stage happens and what piles up.";
      tally.innerHTML = "<div class='eyebrow'>Running total per glucose</div><div class='tl'><div class='tk'><b>0</b><span>ATP</span></div><div class='tk'><b>0</b><span>NADH</span></div><div class='tk'><b>0</b><span>FADH₂</span></div><div class='tk'><b>0</b><span>CO₂</span></div></div>";
      svg.querySelectorAll("[data-m='acoa'],[data-m='krebs'],[data-a='1']").forEach((m) => m.classList.add("dim"));
    }

    /* ---------- Part 2: the chain, animated ---------- */
    const TRUTH = {
      none: { o2: "same", atp: "same", grad: "steady", text: "Normal: electrons flow to O₂, protons are pumped out, and they flow back through ATP synthase to make ATP." },
      cyanide: { o2: "down", atp: "down", grad: "fades", text: "Cyanide blocks complex IV, so electrons can't reach O₂. The chain jams: no pumping, the gradient fades, and ATP synthesis stops. O₂ isn't used at all." },
      oligo: { o2: "down", atp: "down", grad: "builds up", text: "Oligomycin blocks ATP synthase, so protons can't flow back and no ATP is made. The gradient builds until it's too steep to pump against, so the chain slows and O₂ use falls." },
      dnp: { o2: "up", atp: "down", grad: "stays low", text: "DNP lets protons leak back across the membrane without passing through ATP synthase. ATP falls, but the chain speeds up trying to rebuild the gradient, so O₂ use rises. The lost energy becomes heat." }
    };
    const NAMES = { none: "No blocker", cyanide: "Cyanide", oligo: "Oligomycin", dnp: "DNP (uncoupler)" };

    function showEtc() {
      stopSim(); views.textContent = "";
      const { svg: html, cx } = etcSvg();
      const pic = el("div", { class: "fig", html });
      const svg = pic.querySelector("svg");
      const parts = svg.querySelector(".parts"), hg = svg.querySelector(".hims");
      const gauges = el("div", { class: "gauges" });
      const verdict = el("div", { class: "readout", "aria-live": "polite" });
      const blockBtns = el("div", { class: "seg", role: "group", "aria-label": "Add a blocker" });
      let mode = "none", hIMS = 16, tick = 0, since = 0, hist = [], heat = 0, pred = null, running = true, timer = null, raf = null;
      const flights = [];

      // H⁺ dots in the intermembrane space: one dot per unit of gradient.
      const spots = Array.from({ length: 44 }, (_, i) => [14 + ((i * 53) % 332), 26 + ((i * 29) % 56)]);
      function paintH() {
        hg.textContent = "";
        for (let i = 0; i < Math.min(hIMS, spots.length); i++) { const g = mk("g", {}, hg); mk("circle", { cx: spots[i][0], cy: spots[i][1], r: 5, class: "hp" }, g); mk("text", { x: spots[i][0], y: spots[i][1] + 3, class: "t xxs" }, g).textContent = "+"; }
      }
      function fly(cls, pts, dur, done, label) {
        if (reduce()) { if (done) done(); return; }
        const g = mk("g", { class: cls }, parts);
        mk("circle", { r: cls === "e" ? 4.5 : 5 }, g);
        if (label) { const t = mk("text", { y: 3, class: "t xxs" }, g); t.textContent = label; }
        flights.push({ g, pts, dur, t0: performance.now(), done });
        if (!raf) raf = requestAnimationFrame(frame);
      }
      function frame(now) {
        raf = null;
        if (!svg.isConnected) return;
        for (let i = flights.length - 1; i >= 0; i--) {
          const f = flights[i], u = Math.max(0, Math.min(1, (now - f.t0) / f.dur));
          const segs = f.pts.length - 1, k = Math.min(segs - 1, Math.floor(u * segs)), lu = u * segs - k;
          const [x1, y1] = f.pts[k], [x2, y2] = f.pts[k + 1];
          f.g.setAttribute("transform", "translate(" + (x1 + (x2 - x1) * lu).toFixed(1) + " " + (y1 + (y2 - y1) * lu).toFixed(1) + ")");
          if (u >= 1) { f.g.remove(); flights.splice(i, 1); if (f.done) f.done(); }
        }
        if (flights.length) raf = requestAnimationFrame(frame);
      }
      function pop(x, y, text, cls) {
        if (reduce()) return;
        const t = mk("text", { x, y, class: "pop " + cls }, parts); t.textContent = text;
        setTimeout(() => t.remove(), 900);
      }
      function pump(x, delay) {
        setTimeout(() => { if (!svg.isConnected) return; fly("h", [[x, 168], [x, 120], [x, 60]], 650, () => { hIMS++; paintH(); }, "+"); if (reduce()) paintH(); }, delay);
      }

      function step() {
        if (!svg.isConnected) { clearInterval(timer); return; }
        tick++; since++;
        let o2 = 0, atp = 0;
        // A steep gradient pushes back on the pumps, so the chain slows (respiratory control).
        const canFlow = mode !== "cyanide" && (hIMS < 22 || (hIMS < 30 && tick % 2 === 0));
        const events = !canFlow ? 0 : mode === "dnp" ? 2 : 1;
        for (let k = 0; k < events; k++) {
          const fad = tick % 4 === 0 && k === 0;
          const path = fad ? [[102, 160], [102, 132], [136, 116], [170, 116], [205, 80], [240, 116], [240, 172]]
            : [[46, 176], [46, 116], [136, 116], [170, 116], [205, 80], [240, 116], [240, 172]];
          fly("e", path, 1500, () => pop(258, 214, "H₂O", "w"), "");
          if (!fad) pump(cx.I, 150 + k * 200);
          pump(cx.III, 600 + k * 200); pump(cx.IV, 1000 + k * 200);
          o2++;
        }
        if (mode === "dnp" && hIMS > 0) {
          const leak = Math.ceil(hIMS * 0.75); hIMS -= leak; heat += leak;
          for (let j = 0; j < Math.min(leak, 6); j++) { const x = 20 + ((tick * 37 + j * 71) % 280); fly("h leak", [[x, 60], [x, 116], [x, 168]], 700, null, "+"); }
          pop(30 + (tick * 53) % 260, 230, "♨", "heat");
        }
        // ATP synthase only turns when the gradient is strong enough to drive it.
        if (mode !== "oligo" && hIMS >= 8) {
          hIMS -= 3; atp++;
          fly("h", [[cx.S, 50], [cx.S, 116], [cx.S, 170]], 700, () => pop(cx.S + 26, 214, "ATP", "atp"), "+");
        }
        paintH();
        hist.push({ o2, atp }); if (hist.length > 4) hist.shift();
        paintGauges();
        if (pred && pred.applied && since === 10) showVerdict();
      }
      function rate(k) { return hist.length ? hist.reduce((a, h) => a + h[k], 0) / hist.length : 0; }
      function paintGauges() {
        const g = [["Proton gradient", hIMS / 32, hIMS >= 26 ? "very steep" : hIMS < 8 ? "low" : "normal", "grad"], ["O₂ use", rate("o2") / 2, rate("o2") > 1.2 ? "above normal" : rate("o2") < 0.8 ? "low" : "normal", "o2"], ["ATP made", rate("atp") / 2, rate("atp") > 0.6 ? "normal" : rate("atp") > 0.2 ? "low" : "almost none", "atp"]];
        gauges.innerHTML = g.map(([n, v, w, c]) => "<div class='gauge " + c + "'><div class='gl'><span>" + n + "</span><span class='muted'>" + w + "</span></div><div class='bar'><i style='width:" + Math.round(Math.min(1, v) * 100) + "%'></i></div></div>").join("");
      }
      function choose(m) {
        if (m === "none") { apply("none"); return; }
        // Predict first, then watch.
        verdict.innerHTML = "";
        const q = (label, key) => el("div", { class: "predq" }, el("span", { text: label }),
          el("div", { class: "seg", role: "group", "aria-label": label }, [["up", "↑ Rises"], ["down", "↓ Falls"], ["same", "No change"]].map(([v, t]) =>
            el("button", { type: "button", "aria-pressed": "false", onclick: (e) => { pred[key] = v; e.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === e.currentTarget))); go.disabled = !(pred.o2 && pred.atp); } }, t))));
        pred = { m };
        const go = el("button", { type: "button", class: "btn primary", disabled: true, onclick: () => apply(m) }, "Add " + NAMES[m] + " and watch");
        verdict.append(el("p", {}, el("b", { text: "Predict first: " }), "what will " + NAMES[m] + " do?"), q("O₂ use", "o2"), q("ATP made", "atp"), go);
      }
      function apply(m) {
        mode = m; since = 0;
        if (pred && pred.m === m) pred.applied = true;
        svg.querySelector("[data-x='IV']").classList.toggle("show", m === "cyanide");
        svg.querySelector("[data-x='S']").classList.toggle("show", m === "oligo");
        svg.classList.toggle("leaky", m === "dnp");
        blockBtns.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
        if (m === "none") { pred = null; verdict.innerHTML = TRUTH.none.text; }
        else verdict.innerHTML = "<b>" + NAMES[m] + " added.</b> Watching… (about 10 seconds; keep an eye on the gauges)";
      }
      function showVerdict() {
        const T = TRUTH[pred.m], word = { up: "rises", down: "falls", same: "doesn't change" };
        const ok1 = pred.o2 === T.o2, ok2 = pred.atp === T.atp;
        verdict.innerHTML = "<p style='margin:0 0 6px'><b>" + (ok1 && ok2 ? "✓ Both predictions right." : ok1 || ok2 ? "One of two right." : "Not this time. Here's why:") + "</b></p>" +
          "<p style='margin:0 0 6px'>O₂ use " + word[T.o2] + (ok1 ? " ✓" : " (you said it " + word[pred.o2] + ")") + " · ATP " + word[T.atp] + (ok2 ? " ✓" : " (you said it " + word[pred.atp] + ")") + " · gradient " + T.grad + ".</p>" + T.text;
        pred = null;
      }
      Object.keys(NAMES).forEach((m) => blockBtns.append(el("button", { type: "button", "data-m": m, "aria-pressed": String(m === "none"), onclick: () => choose(m) }, NAMES[m])));
      views.append(el("p", { class: "small muted", text: "Yellow dots are electrons; ⊕ are protons (each dot stands for several). Watch them pumped up at complexes I, III and IV, then flowing back down through ATP synthase, which makes ATP. O₂ catches the electrons at the end." }),
        pic, gauges);
      if (lab) views.append(el("div", { class: "eyebrow", style: "margin-top:10px", text: "Add a blocker" }), blockBtns, verdict);
      else views.append(el("p", { class: "readout", html: "<b>What you're seeing:</b> NADH and FADH₂ drop off electrons. As the electrons pass down the chain, their energy pumps protons into the intermembrane space, building a gradient. Protons rush back through ATP synthase, and that flow makes ATP. Without O₂ at the end, everything would back up. After the rule, you'll test this by jamming the chain." }));
      paintH(); paintGauges();
      verdict.innerHTML = TRUTH.none.text + " <b>Pick a blocker. You'll predict first, then watch.</b>";
      timer = setInterval(step, reduce() ? 1200 : 900);
      stopSim = () => { clearInterval(timer); flights.length = 0; };
    }
    if (lab) showEtc(); else showOverview();
  }

  root.DATViz = Object.assign(root.DATViz || {}, { mito });
})(window);
