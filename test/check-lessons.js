// Run: node dat/test/check-lessons.js — generates many questions per lesson and checks answers.
global.window = globalThis;
require("../js/core.js");
const L = [];
global.DATLessons = { add: (l) => L.push(l) };
for (const f of ["stoich", "respiration", "angles"]) require("../js/lessons/" + f + ".js");
let bad = 0;
const fail = (m, q) => { bad++; if (bad < 10) console.log("FAIL", m, JSON.stringify(q).slice(0, 300)); };
for (const l of L) {
  // walk steps well-formed
  for (const s of l.walk.steps) if (!(s.a >= 0 && s.a < s.o.length) || new Set(s.o).size !== s.o.length) fail(l.id + " walk", s);
  for (let i = 0; i < 3000; i++) {
    const rng = PSCore.makeRng(i * 7 + 1);
    let q; try { q = l.solo(rng, i % 3); } catch (e) { if (e && e.retry) continue; fail(l.id + " threw " + e, {}); continue; }
    if (!q || q.o.length < 3 || !(q.a >= 0 && q.a < q.o.length)) fail(l.id + " shape", q);
    if (new Set(q.o).size !== q.o.length) fail(l.id + " dup options", q);
    if (l.id === "gc-stoich-1") {
      // recompute from the explanation chain: last bold/box value must equal the marked option
      const m = q.e.match(/<b>([\d.,]+) g<\/b>/) || q.e.match(/<span class='box'>([\d.,]+) g<\/span><\/div>/);
      if (!m || q.o[q.a] !== m[1] + " g") fail("stoich answer mismatch " + (m && m[1]), q);
    }
    if (l.id === "pat-angles-1") {
      const sizes = [...q.e.matchAll(/(\d) = ([\d.]+)°/g)].map((x) => [+x[1], +x[2]]);
      const order = sizes.slice().sort((a, b) => a[1] - b[1]).map((x) => x[0]).join(" – ");
      if (q.o[q.a] !== order) fail("angle order", q);
      const v = sizes.map((x) => x[1]).sort((a, b) => a - b);
      for (let k = 1; k < 4; k++) if (v[k] - v[k - 1] < 1.9) fail("angles too close", v);
    }
  }
}
console.log(bad ? bad + " problems" : "all lesson checks passed (" + L.length + " lessons)");
process.exit(bad ? 1 : 0);
