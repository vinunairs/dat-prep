// Copied from Test Prep Hub (vinunairs/psat-sprint) so DAT Prep stands alone.
/* Test Prep Hub — shared helpers for question generators.
   Every generator returns a question object:
   { d: domain id, sk: skill label, lv: 1-3, q: prompt, p?: passage, table?: {head, rows},
     o: [4 options], a: correct index, spr?: number (numeric answer if it can be a grid-in),
     e: explanation, t?: tip, key: signature used to avoid repeats } */
(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let seedCounter = 0;
  function makeRng(seed) {
    if (seed == null) seed = (Date.now() ^ (Math.random() * 1e9)) + (seedCounter++) * 7919;
    const r = mulberry32(seed);
    const R = {
      f: r,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      nz: (a, b) => { let v; do { v = a + Math.floor(r() * (b - a + 1)); } while (v === 0); return v; },
      sign: () => (r() < 0.5 ? -1 : 1),
      shuffle: (arr) => { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
      sample: (arr, n) => R.shuffle(arr).slice(0, n)
    };
    return R;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
  const MINUS = "−";
  function fmtN(n) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    if (Number.isInteger(n)) return (n < 0 ? MINUS : "") + Math.abs(n).toLocaleString("en-US");
    const s = String(Math.round(n * 1000) / 1000);
    return s.startsWith("-") ? MINUS + s.slice(1) : s;
  }
  function frac(n, d) {
    if (d === 0) return "undefined";
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d); n /= g; d /= g;
    return d === 1 ? fmtN(n) : (n < 0 ? MINUS : "") + Math.abs(n) + "/" + d;
  }
  // polynomial from [[coef, power], ...]
  function poly(terms, v = "x") {
    let s = "";
    for (const [c, p] of terms) {
      if (c === 0) continue;
      const abs = Math.abs(c);
      const pw = p === 0 ? "" : v + (p === 1 ? "" : p === 2 ? "²" : p === 3 ? "³" : "^" + p);
      const body = p === 0 ? fmtN(abs) : (abs === 1 ? "" : fmtN(abs)) + pw;
      if (!s) s = (c < 0 ? MINUS : "") + body;
      else s += (c < 0 ? " " + MINUS + " " : " + ") + body;
    }
    return s || "0";
  }
  const lin = (a, b, v = "x") => poly([[a, 1], [b, 0]], v);
  // "3x − 2y = 7"
  function eq2(a, b, c) {
    let s = poly([[a, 1]], "x");
    if (a === 0) s = poly([[b, 1]], "y");
    else if (b !== 0) s += (b < 0 ? " " + MINUS + " " : " + ") + (Math.abs(b) === 1 ? "" : fmtN(Math.abs(b))) + "y";
    return s + " = " + fmtN(c);
  }
  const paren = (n) => (n < 0 ? "(" + fmtN(n) + ")" : fmtN(n));
  const xMinus = (h, v = "x") => (h === 0 ? v : h > 0 ? v + " " + MINUS + " " + h : v + " + " + Math.abs(h)); // (x − h)

  // Build 4 options from correct + distractors; strings compared after formatting.
  function mc(rng, correct, distractors, fmt = (x) => (typeof x === "number" ? fmtN(x) : String(x))) {
    const cs = fmt(correct);
    const seen = new Set([cs]);
    const ds = [];
    for (const d of distractors) {
      if (d == null) continue;
      if (typeof d === "number" && !isFinite(d)) continue;
      if (typeof d === "number" && typeof correct === "number" && Number.isInteger(correct) && !Number.isInteger(d)) continue;
      const s = fmt(d);
      if (!seen.has(s) && s !== "NaN") { seen.add(s); ds.push(s); }
      if (ds.length === 3) break;
    }
    let k = 1;
    while (ds.length < 3 && k < 60) {
      let alt;
      if (typeof correct === "number") {
        const step = Math.max(1, Math.round(Math.abs(correct) / 10));
        alt = fmt(correct + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step);
      } else alt = null;
      k++;
      if (alt && !seen.has(alt)) { seen.add(alt); ds.push(alt); }
    }
    if (ds.length < 3) throw { retry: true };
    const all = rng.shuffle([cs, ...ds]);
    return { o: all, a: all.indexOf(cs) };
  }

  // Parse a grid-in answer: "3/4", "-2", ".75", "−1.5"
  function parseAnswer(s) {
    if (s == null) return NaN;
    s = String(s).trim().replace(/−/g, "-").replace(/[\s%°$,]/g, ""); // ignore units, commas, and spaces the student may type
    if (!s) return NaN;
    if (/^-?\d+\/\d+$/.test(s)) { const [n, d] = s.split("/").map(Number); return d === 0 ? NaN : n / d; }
    if (/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
    return NaN;
  }
  function checkSpr(input, ans) {
    const v = parseAnswer(input);
    if (isNaN(v)) return false;
    return Math.abs(v - ans) <= 0.0011 * Math.max(1, Math.abs(ans));
  }

  root.PSCore = { makeRng, gcd, fmtN, frac, poly, lin, eq2, paren, xMinus, mc, parseAnswer, checkSpr, MINUS };
  if (typeof module !== "undefined") module.exports = root.PSCore;
})(typeof window !== "undefined" ? window : globalThis);
