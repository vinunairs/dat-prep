/* Shared pieces for every interactive:
   - howTo(steps): a short numbered "How to use this" list; .at(i) highlights the step she's on.
   - layout({ fig, ctrl, out }): the picture, its controls and the result. Phones stack them
     (picture, controls right under it, result); wider screens put the controls beside the picture. */
(function (root) {
  function howTo(el, steps, title) {
    const items = steps.map((s, i) => el("li", { class: i === 0 ? "now" : "" }, s));
    const node = el("div", { class: "howto" }, el("div", { class: "howto-t", text: title || "How to use this" }), el("ol", {}, items));
    return {
      node,
      at(i) { items.forEach((li, j) => { li.classList.toggle("done", j < i); li.classList.toggle("now", j === i); }); },
      finish() { items.forEach((li) => { li.classList.add("done"); li.classList.remove("now"); }); }
    };
  }
  function layout(el, parts) {
    return el("div", { class: "viz" + (parts.wideFig ? " wide-fig" : "") },
      parts.fig ? el("div", { class: "viz-fig" }, parts.fig) : null,
      parts.ctrl ? el("div", { class: "viz-ctrl" }, parts.ctrl) : null,
      parts.out ? el("div", { class: "viz-out" }, parts.out) : null);
  }
  root.DATViz = Object.assign(root.DATViz || {}, { howTo, layout });
})(window);
