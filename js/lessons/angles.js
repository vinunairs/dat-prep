/* Lesson: PAT Angle Discrimination — rank four angles from smallest to largest.
   DAT Perceptual Ability › Angle Discrimination. On the real test the four interior angles differ
   by only a few degrees and are drawn with different ray lengths and rotations. */
(function () {
  const C = window.PSCore;
  const RAD = Math.PI / 180;

  // One angle as SVG lines. rot = direction of the first ray (deg), len1/len2 = ray lengths.
  function angleSvg(deg, rot, len1, len2, label, size = 150, at) {
    const r1 = rot * RAD, r2 = (rot + deg) * RAD;
    // Put the vertex so the whole angle fits the box.
    const pts = [[0, 0], [len1 * Math.cos(r1), -len1 * Math.sin(r1)], [len2 * Math.cos(r2), -len2 * Math.sin(r2)]];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const cx = (size - (Math.max(...xs) - Math.min(...xs))) / 2 - Math.min(...xs);
    const cy = (size - 18 - (Math.max(...ys) - Math.min(...ys))) / 2 - Math.min(...ys) + 4;
    const P = pts.map((p) => (at ? [p[0] + at[0], p[1] + at[1]] : [p[0] + cx, p[1] + cy]).map((v) => v.toFixed(1)));
    return "<g><path d='M" + P[1].join(" ") + " L" + P[0].join(" ") + " L" + P[2].join(" ") + "' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/>" +
      (label ? "<text x='" + size / 2 + "' y='" + (size - 2) + "' text-anchor='middle' font-size='15' font-weight='700' fill='currentColor'>" + label + "</text>" : "") + "</g>";
  }
  function fourSvg(angles, looks) {
    const size = 150, gap = 10, W = size * 2 + gap;
    let s = "<svg viewBox='0 0 " + W + " " + W + "' width='" + W + "' style='color:var(--ink)' role='img' aria-label='Four angles labeled 1 to 4'>";
    angles.forEach((deg, i) => {
      const lk = looks[i];
      s += "<g transform='translate(" + (i % 2) * (size + gap) + " " + Math.floor(i / 2) * (size + gap) + ")'>" +
        "<rect width='" + size + "' height='" + size + "' rx='12' fill='var(--surface-2)'/>" + angleSvg(deg, lk.rot, lk.l1, lk.l2, String(i + 1), size) + "</g>";
    });
    return s + "</svg>";
  }
  const seq = (order) => order.map((k) => k + 1).join(" – ");

  // Four angles with at least `gap` degrees between neighbours in size.
  function makeSet(rng, gap) {
    const base = rng.int(28, 115);
    const offs = [0];
    for (let k = 0; k < 3; k++) offs.push(offs[k] + gap + rng.int(0, 2) + rng.f() * 0.8);
    const vals = rng.shuffle(offs.map((o) => Math.round((base + o) * 10) / 10));
    const looks = vals.map(() => ({ rot: rng.int(0, 359), l1: rng.int(48, 70), l2: rng.int(48, 70) }));
    const order = [0, 1, 2, 3].sort((a, b) => vals[a] - vals[b]);
    return { vals, looks, order };
  }
  function options(rng, order) {
    const swaps = [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3]];
    const cands = [];
    for (const [i, j] of rng.shuffle(swaps)) { const o = order.slice(); [o[i], o[j]] = [o[j], o[i]]; cands.push(o); }
    const right = seq(order);
    const ds = [...new Set(cands.map(seq))].filter((x) => x !== right).slice(0, 3);
    const all = rng.shuffle([right, ...ds]);
    return { o: all, a: all.indexOf(right) };
  }

  // Fixed walk-through set: angle 1 = 53°, 2 = 44°, 3 = 60°, 4 = 49°.
  const WALK = { vals: [53, 44, 60, 49], looks: [{ rot: 200, l1: 66, l2: 50 }, { rot: 15, l1: 52, l2: 70 }, { rot: 110, l1: 50, l2: 64 }, { rot: 300, l1: 70, l2: 55 }] };

  // Walk-through helper: rotate angle 4 onto angle 1 (shared vertex and first ray, equal ray lengths).
  function rotateTool(box, ctx) {
    const { el } = ctx;
    const A = WALK.looks[0], B = WALK.looks[3], a = WALK.vals[0], b = WALK.vals[3];
    const fig = el("div", { class: "fig" });
    const s = el("input", { type: "range", min: "0", max: "100", step: "1", value: "0", "aria-label": "Rotate both angles so one ray lies flat" });
    const msg = el("p", { class: "small muted", "aria-live": "polite" });
    const lerp = (x, y, t) => x + (y - x) * t;
    const flat = (r) => ((0 - r + 540) % 360) - 180; // shortest turn that lays the first ray flat, pointing right
    const t1 = flat(A.rot), t4 = flat(B.rot);
    function paint() {
      const t = +s.value / 100;
      const v1 = [lerp(80, 40, t), lerp(70, 172, t)], v4 = [lerp(230, 40, t), lerp(70, 172, t)];
      const L = (x) => lerp(x, 200, t);
      let out = "<svg viewBox='0 0 300 190' width='300' role='img' aria-label='Angle 1 and angle 4 being rotated so one ray lies flat'>" +
        "<rect width='300' height='190' rx='12' fill='var(--surface)'/>";
      out += "<g style='color:var(--ink)'>" + angleSvg(a, A.rot + t1 * t, L(A.l1), L(A.l2), "", 300, v1) + "</g>";
      out += "<g style='color:var(--brand)'>" + angleSvg(b, B.rot + t4 * t, L(B.l1), L(B.l2), "", 300, v4) + "</g>";
      if (t < 0.6) out += "<text x='80' y='150' font-size='13' font-weight='700' fill='var(--ink)' text-anchor='middle'>1</text><text x='230' y='150' font-size='13' font-weight='700' fill='var(--brand)' text-anchor='middle'>4</text>";
      else out += "<text x='166' y='16' font-size='13' font-weight='700' fill='var(--ink)'>1</text><text x='196' y='32' font-size='13' font-weight='700' fill='var(--brand)'>4</text>";
      fig.innerHTML = out + "</svg>";
      msg.textContent = t < 0.98 ? "Keep sliding: both angles turn until one ray lies flat, and the rays grow to the same length." : "Same vertex, flat first ray, equal ray lengths. Angle 4's teal ray sits below angle 1's: angle 4 opens less, so it's smaller.";
    }
    s.addEventListener("input", paint);
    box.append(DATViz.howTo(el, ["Drag the slider all the way to the right.", "Compare the second rays: the one closer to the flat ray is the smaller angle."], "Try it").node,
      fig, el("label", { class: "ctrl" }, "Rotate both so one ray lies flat", s), msg);
    paint();
  }

  DATLessons.add({
    id: "pat-angles-1", topic: "pat-ang", section: "pat", minutes: 10,
    title: "Angle Discrimination: rank four angles",
    covers: ["What Angle Discrimination questions look like", "Why ray length and rotation fool your eyes", "A four-step method: ignore ray length, find the ends, eliminate choices, decide the close pair", "Pacing: about 30 seconds per question"],
    outcomes: ["Rank four angles that differ by just a few degrees", "Cut the answer choices to two before doing any hard comparison", "Finish all 15 angle questions with time to spare for harder PAT subtests"],
    onTest: "One of the six Perceptual Ability subtests: 15 of the 90 PAT questions, in the 60-minute PAT section.",
    intro: "Fifteen questions on test day. The angles differ by only a few degrees, and the drawings are rotated and stretched to fool you. A few habits make this one of the fastest PAT subtests.",
    explore(box, ctx) {
      const { el } = ctx;
      const range = el("input", { type: "range", min: "50", max: "70", step: "1", value: "57", "aria-label": "Size of angle B" });
      const fig = el("div", { class: "fig" });
      const reveal = el("input", { type: "checkbox", id: "angRev" });
      const overlay = el("input", { type: "checkbox", id: "angOv" });
      const out = el("p", { class: "muted small", "aria-live": "polite" });
      function paint() {
        const b = +range.value, ov = overlay.checked;
        const size = 150;
        let s = "<svg viewBox='0 0 " + (size * 2 + 10) + " " + size + "' width='310' style='color:var(--ink)' role='img' aria-label='Angle A and angle B'>";
        s += "<rect width='150' height='150' rx='12' fill='var(--surface-2)'/>" + angleSvg(60, 20, 72, 40, "A" + (reveal.checked ? " = 60°" : ""), size);
        s += "<g transform='translate(160 0)'><rect width='150' height='150' rx='12' fill='var(--surface-2)'/>" +
          (ov ? "<g style='color:var(--ink-3)' opacity='.6'>" + angleSvg(60, 0, 100, 100, "", size, [22, 118]) + "</g>" + angleSvg(b, 0, 100, 100, "B" + (reveal.checked ? " = " + b + "°" : ""), size, [22, 118]) + "<text x='120' y='30' font-size='12' fill='var(--ink-3)'>A</text>"
            : angleSvg(b, 205, 42, 70, "B" + (reveal.checked ? " = " + b + "°" : ""), size)) + "</g></svg>";
        fig.innerHTML = s;
        out.textContent = ov ? "Both angles now share a ray along the bottom: the gap at the open end shows which is larger. " + (b === 60 ? "They're equal." : b > 60 ? "B is larger by " + (b - 60) + "°." : "A is larger by " + (60 - b) + "°.") :
          "Which is bigger, A or B? Decide, then turn on \"Line them up\" to check.";
      }
      [range, reveal, overlay].forEach((x) => x.addEventListener("input", paint));
      const how = DATViz.howTo(el, ["Move the slider to change angle B.", "Decide which looks bigger, A or B. Long rays and rotation try to fool you.", "Tick “Line them up” to check, and “Show degrees” for the exact sizes."]);
      range.addEventListener("input", () => how.at(1));
      overlay.addEventListener("input", () => how.at(2));
      box.append(how.node, DATViz.layout(el, { fig,
        ctrl: el("div", { class: "ctrls" }, el("label", { class: "ctrl" }, "Size of angle B", range),
          el("label", { class: "check-line" }, overlay, "Line them up"), el("label", { class: "check-line" }, reveal, "Show degrees")),
        out }));
      paint();
    },
    ruleTitle: "The method",
    rule: {
      html: "<p>Each question shows four angles labeled 1–4 and asks you to rank the <b>interior</b> angles from <b>smallest to largest</b>. The answers are orders like <span class='mono'>2 – 4 – 1 – 3</span>.</p>" +
        "<ol><li><b>Ignore ray length.</b> Only the opening between the rays matters. Long rays make an angle look bigger.</li>" +
        "<li><b>Mentally rotate</b> each angle so one ray lies flat, then compare the gap at the same distance from the vertex.</li>" +
        "<li><b>Find the easy ends first:</b> spot the clearly smallest and clearly largest angle, then cross out every answer choice that doesn't start and end with them.</li>" +
        "<li><b>Decide the one close pair.</b> The remaining choices usually differ by one swap. Compare just those two angles.</li>" +
        "<li><b>Keep moving.</b> PAT gives about 40 seconds per question. Make your best call in 30 and flag it if unsure; there's no penalty for guessing.</li></ol>" +
        "<p>If some angles look nearly right-angled, compare them to a corner of the box. For obtuse angles, it can help to compare the angle left over on a straight line instead.</p>",
      keys: [
        "Only the opening counts, never the ray length.",
        "Rotate mentally so one ray is flat; compare the gap at equal distance from the vertex.",
        "Smallest and largest first, then eliminate answer choices.",
        "The last decision is usually one close pair: compare only those two.",
        "About 30 seconds each; flag and guess, no penalty."
      ]
    },
    walk: {
      problem: "Rank the four interior angles from smallest to largest.<br><span class='small'>Choices: <b>A.</b> 2 – 1 – 4 – 3 &nbsp; <b>B.</b> 4 – 2 – 1 – 3 &nbsp; <b>C.</b> 2 – 4 – 1 – 3 &nbsp; <b>D.</b> 2 – 4 – 3 – 1</span>",
      fig: fourSvg(WALK.vals, WALK.looks),
      steps: [
        { p: "First, the easy end: which angle is the <b>smallest</b>? (Look past the long rays.)", o: ["Angle 1", "Angle 2", "Angle 3", "Angle 4"], a: 1, ok: "Angle 2 is the narrowest opening, even though one of its rays is long.", why: { 3: "Close: 4 is narrow too. Line them up in your head: 2's opening is tighter. Keep 4 for later.", 0: "Angle 1's long ray makes it look bigger, not smaller. Compare the gap near the vertex: 2 is tighter." } },
        { p: "Which angle is the <b>largest</b>?", o: ["Angle 1", "Angle 2", "Angle 3", "Angle 4"], a: 2, ok: "Angle 3 has the widest opening." },
        { p: "Look at the answer choices above. Which ones survive \"starts with 2, ends with 3\"?", o: ["2 – 1 – 4 – 3 and 2 – 4 – 1 – 3", "4 – 2 – 1 – 3 and 2 – 1 – 4 – 3", "2 – 4 – 3 – 1 and 2 – 4 – 1 – 3", "All four choices"], a: 0, ok: "Two choices left. They differ only in the middle pair: 1 and 4." },
        { p: "Now just compare angles 1 and 4. Try the mental move with the slider first: rotate both so one ray lies flat and they share a vertex. Which is smaller?", tool: rotateTool, o: ["Angle 1", "Angle 4", "They're equal"], a: 1, ok: "Angle 4 is slightly smaller (49° vs 53°). Angle 1's long ray makes it look bigger than it is.", why: { 0: "Rotate angle 1 so one ray is flat: its long ray exaggerates it. Angle 4's opening is a little tighter.", 2: "On the DAT the four angles are always different sizes. Look again at the gap near the vertex." } },
        { p: "So the full order, smallest to largest, is:", o: ["2 – 1 – 4 – 3", "2 – 4 – 1 – 3", "4 – 2 – 1 – 3", "2 – 4 – 3 – 1"], a: 1, ok: "2 (44°) – 4 (49°) – 1 (53°) – 3 (60°). Ends first, then one close pair: that's the whole method." }
      ],
      wrap: "<b>Walk-through done.</b> Your turn: three new sets, each a little closer than the last. The last one is test-level, with only about 2° between neighbors."
    },
    soloCount: 3,
    solo(rng, k) {
      const gap = [5, 3.5, 2][k] || 2;
      const s = makeSet(rng, gap);
      const m = options(rng, s.order);
      return {
        q: "Rank the interior angles from <b>smallest to largest</b>." + (k === 2 ? " <span class='chip warn'>Test-level</span>" : ""),
        fig: fourSvg(s.vals, s.looks), o: m.o, a: m.a,
        e: "Sizes: " + s.order.map((i) => (i + 1) + " = " + C.fmtN(s.vals[i]) + "°").join(", ") + ". Order: <b>" + seq(s.order) + "</b>. " +
          "Neighbors differ by about " + gap + "° here; on test day it's often 1–3°.",
        note: "Angles: ignore ray length; ends first, then the one close pair."
      };
    }
  });
})();
