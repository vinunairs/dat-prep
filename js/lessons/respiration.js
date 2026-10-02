/* Lesson: Cellular respiration — where the ATP comes from.
   DAT Biology › Cell and Molecular Biology (cell metabolism). Numbers are per glucose,
   eukaryotic cell, using current textbook values (about 30–32 ATP total). */
(function () {
  const BANK = [
    { q: "Where in a eukaryotic cell does glycolysis take place?", o: ["Cytosol", "Mitochondrial matrix", "Inner mitochondrial membrane", "Intermembrane space"], e: "Glycolysis happens in the cytosol, outside the mitochondria. That's why it works in every cell, including bacteria and red blood cells (which have no mitochondria)." },
    { q: "Where does the citric acid (Krebs) cycle take place in a eukaryotic cell?", o: ["Mitochondrial matrix", "Cytosol", "Inner mitochondrial membrane", "Outer mitochondrial membrane"], e: "The cycle's enzymes are in the matrix. The membrane is home to the electron transport chain and ATP synthase." },
    { q: "What is the final electron acceptor in aerobic respiration?", o: ["O₂", "NAD⁺", "Pyruvate", "CO₂"], e: "Complex IV hands electrons to O₂, which picks up H⁺ to form water. NAD⁺ is an electron carrier earlier in the pathway, not the final acceptor." },
    { q: "In which stages is CO₂ released?", o: ["Pyruvate oxidation and the citric acid cycle", "Glycolysis only", "The electron transport chain", "Glycolysis and the electron transport chain"], e: "2 CO₂ leave in pyruvate oxidation and 4 in the citric acid cycle, per glucose. Glycolysis splits glucose without releasing any carbon." },
    { q: "What is the net ATP yield of glycolysis per glucose?", o: ["2 ATP", "4 ATP", "0 ATP", "About 30 ATP"], e: "Glycolysis invests 2 ATP and makes 4, for a net gain of 2. \"4 ATP\" is the gross number, a common trap." },
    { q: "What is the main purpose of fermentation?", o: ["To regenerate NAD⁺ so glycolysis can keep running", "To make extra ATP from pyruvate", "To produce oxygen for the electron transport chain", "To feed acetyl-CoA into the citric acid cycle"], e: "Without O₂, NADH can't unload at the electron transport chain. Fermentation passes NADH's electrons to pyruvate (or acetaldehyde), regenerating NAD⁺. It makes no extra ATP; the cell lives on glycolysis's net 2." },
    { q: "During electron transport, protons are pumped:", o: ["From the matrix into the intermembrane space", "From the intermembrane space into the matrix", "From the cytosol into the matrix", "From the matrix into the cytosol"], e: "Complexes I, III and IV pump H⁺ out of the matrix into the intermembrane space. H⁺ then flows back into the matrix through ATP synthase, driving ATP synthesis." },
    { q: "Oligomycin blocks ATP synthase. What happens in the mitochondria right after it is added?", o: ["The proton gradient stays high and ATP synthesis by oxidative phosphorylation stops", "The proton gradient collapses and energy is released as heat", "Glycolysis stops immediately", "Oxygen consumption increases sharply"], e: "With ATP synthase blocked, H⁺ can't flow back, so the gradient builds and ATP synthesis stops. A steep gradient then slows the chain, so O₂ use falls. Collapsing the gradient as heat is what an uncoupler does." },
    { q: "An uncoupler such as DNP makes the inner mitochondrial membrane leaky to protons. What happens?", o: ["O₂ consumption rises while ATP synthesis falls", "O₂ consumption and ATP synthesis both rise", "O₂ consumption and ATP synthesis both fall", "O₂ consumption stops completely"], e: "Protons leak back without passing through ATP synthase, so ATP output falls. The chain runs faster to try to rebuild the gradient, burning more O₂, and the energy is lost as heat." },
    { q: "Why does each FADH₂ yield less ATP than each NADH?", o: ["Its electrons enter at complex II, skipping the protons pumped at complex I", "FADH₂ carries fewer electrons than NADH", "FADH₂ is made in the cytosol and must be transported in", "FADH₂ gives its electrons straight to O₂"], e: "Both carry two electrons. FADH₂ hands them to complex II, which pumps no protons, so fewer H⁺ are pumped per FADH₂ (about 1.5 ATP vs. about 2.5 for NADH)." },
    { q: "About how many ATP does aerobic respiration yield per glucose, using current textbook estimates?", o: ["About 30–32", "About 2", "About 12", "About 60"], e: "Current estimates are about 30–32 ATP per glucose. Older books say 36–38; the DAT usually asks in ways where either fits, like \"far more than glycolysis alone.\"" },
    { q: "Which products are made by fermentation in yeast?", o: ["Ethanol and CO₂", "Lactate only", "Acetyl-CoA and NADH", "O₂ and glucose"], e: "Yeast (alcoholic) fermentation turns pyruvate into ethanol and CO₂. Lactic acid fermentation, in muscle cells and some bacteria, makes lactate and no CO₂." },
    { q: "In a prokaryote, where is the electron transport chain located?", o: ["Plasma membrane", "Inner mitochondrial membrane", "Cytosol", "Nucleoid"], e: "Prokaryotes have no mitochondria. Their electron transport chain sits in the plasma membrane, and protons are pumped out of the cell." },
    { q: "Which molecule enters the citric acid cycle by combining with oxaloacetate?", o: ["Acetyl-CoA", "Pyruvate", "Glucose", "Lactate"], e: "Acetyl-CoA (2 carbons) joins oxaloacetate (4 carbons) to form citrate (6 carbons), the first step of each turn." },
    { q: "Substrate-level phosphorylation makes ATP during:", o: ["Glycolysis and the citric acid cycle", "The electron transport chain only", "Pyruvate oxidation only", "ATP synthase activity"], e: "An enzyme moves a phosphate directly onto ADP in glycolysis and in one step of the citric acid cycle. ATP synthase makes ATP by oxidative phosphorylation instead." },
    { q: "Cyanide blocks complex IV. Which effect is expected in a cell?", o: ["NADH builds up and the citric acid cycle slows", "NAD⁺ builds up and glycolysis speeds up only in mitochondria", "The proton gradient becomes steeper", "O₂ consumption increases"], e: "Electrons can't reach O₂, so the chain backs up: NADH can't be oxidized, NAD⁺ runs short, and the NAD⁺-dependent citric acid cycle slows. The gradient fades and O₂ use drops." }
  ];

  DATLessons.add({
    id: "bio-resp-1", topic: "bio-cell", section: "bio", minutes: 15,
    title: "Cellular respiration: where the ATP comes from",
    covers: ["The four stages: glycolysis, pyruvate oxidation, the citric acid cycle, and the electron transport chain", "Where each stage happens in the cell", "What goes in and comes out of each stage (ATP, NADH, FADH₂, CO₂)", "The role of oxygen, and fermentation when it's missing", "What happens when cyanide, oligomycin or an uncoupler blocks the pathway"],
    outcomes: ["Fill in the per-glucose table from memory", "Say where CO₂ is released, where O₂ is used, and where most ATP is made", "Predict the effect of any blocker by tracing what backs up before it and what runs out after it"],
    onTest: "Cell metabolism is part of Cell and Molecular Biology, one of the five Biology areas on the DAT. Respiration also connects to photosynthesis and enzyme questions.",
    intro: "One of the most tested pathways on the DAT. Know where each stage happens, what goes in and out, and what breaks when something is blocked.",
    explore(box, ctx) {
      box.append(ctx.el("p", { text: "First, follow one glucose molecule through the cell. Tap through the stages; each one explains itself. Then watch the electron transport chain at work. No questions yet." }));
      DATViz.mito(box, ctx, "tour");
    },
    lab(box, ctx) { DATViz.mito(box, ctx, "lab"); },
    labIntro: "Jam the chain. Pick a blocker, predict what happens to O₂ use and ATP, then watch the animation play it out.",
    ruleTitle: "The big table",
    rule: {
      html: "<p>Per glucose, in a eukaryotic cell:</p><div class='tbl' tabindex='0' role='region' aria-label='Per-glucose totals table'><table><thead><tr><th>Stage</th><th>Where</th><th>ATP</th><th>NADH</th><th>FADH₂</th><th>CO₂</th></tr></thead><tbody>" +
        "<tr><td>Glycolysis</td><td>Cytosol</td><td>2 net</td><td>2</td><td>0</td><td>0</td></tr>" +
        "<tr><td>Pyruvate oxidation</td><td>Matrix</td><td>0</td><td>2</td><td>0</td><td>2</td></tr>" +
        "<tr><td>Citric acid cycle</td><td>Matrix</td><td>2</td><td>6</td><td>2</td><td>4</td></tr>" +
        "<tr><td>ETC + ATP synthase</td><td>Inner membrane</td><td>~26–28</td><td colspan='2'>used up</td><td>0</td></tr></tbody></table></div>" +
        "<ul><li><b>O₂ is only used at the very end</b>, as the final electron acceptor (forms H₂O). Without O₂ the chain stops, so NAD⁺ and FAD aren't regenerated and stages 2–3 stop too.</li>" +
        "<li><b>No O₂?</b> Fermentation regenerates NAD⁺ so glycolysis continues: lactate in muscle, ethanol + CO₂ in yeast. Still only 2 ATP.</li>" +
        "<li><b>Protons are pumped out of the matrix</b> into the intermembrane space, then flow back through ATP synthase.</li>" +
        "<li><b>Blockers:</b> cyanide (complex IV) stops the chain; oligomycin blocks ATP synthase; uncouplers like DNP let H⁺ leak, so O₂ use rises but ATP falls and heat is released.</li></ul>",
      keys: [
        "Glycolysis: cytosol, no O₂ needed, net 2 ATP + 2 NADH.",
        "Pyruvate oxidation + Krebs: matrix; all 6 CO₂ are released here.",
        "ETC: inner membrane; O₂ is the final electron acceptor → H₂O.",
        "H⁺ is pumped matrix → intermembrane space; ATP synthase lets it back.",
        "Fermentation only regenerates NAD⁺; no extra ATP.",
        "FADH₂ enters at complex II → less ATP than NADH.",
        "Cyanide blocks complex IV; oligomycin blocks ATP synthase; DNP uncouples (more O₂ use, less ATP, heat)."
      ]
    },
    walk: {
      problem: "<b>A classic DAT setup:</b> cyanide binds complex IV (cytochrome c oxidase) of the electron transport chain. Predict what happens, one link at a time.",
      steps: [
        { p: "What does complex IV normally do?", o: ["Hands electrons to O₂, forming water", "Makes ATP from ADP", "Splits glucose into pyruvate", "Releases CO₂ from acetyl-CoA"], a: 0, ok: "Complex IV is the last stop: it passes electrons to O₂, and O₂ picks up H⁺ to form H₂O.", why: { 1: "That's ATP synthase, a separate enzyme." } },
        { p: "With complex IV blocked, electrons can't leave the chain. What happens to proton pumping?", o: ["It speeds up", "It stops, because electrons can't move down the chain", "It reverses direction", "Nothing changes"], a: 1, ok: "The chain backs up like a jammed conveyor belt. No electron flow means no proton pumping." },
        { p: "So what happens to the proton gradient and ATP made by ATP synthase?", o: ["Gradient grows; ATP rises", "Gradient fades; ATP synthesis by oxidative phosphorylation falls sharply", "Gradient fades; ATP rises", "No effect on ATP"], a: 1, ok: "Without pumping, the gradient runs down and ATP synthase has nothing to drive it." },
        { p: "NADH can't hand its electrons to the jammed chain. What happens to NADH and NAD⁺?", o: ["NADH builds up and NAD⁺ runs short", "NAD⁺ builds up", "Both disappear", "Both stay the same"], a: 0, ok: "NADH can't be oxidized back to NAD⁺. The citric acid cycle needs NAD⁺, so it slows too." },
        { p: "Which stage can still make a little ATP in the short term?", o: ["The citric acid cycle", "Glycolysis, with fermentation regenerating NAD⁺", "Pyruvate oxidation", "None at all"], a: 1, ok: "Glycolysis can keep going if lactic acid fermentation regenerates NAD⁺. That's only 2 ATP per glucose, far too little for most cells, which is why cyanide is so dangerous." },
        { p: "Compare: an <b>uncoupler</b> (DNP) makes the membrane leaky to H⁺ instead. What happens to O₂ consumption?", o: ["It rises, while ATP synthesis falls", "It falls, like with cyanide", "It stops", "It's unchanged"], a: 0, ok: "With DNP the chain still runs, faster even, trying to rebuild the leaking gradient, so it burns more O₂. But H⁺ bypasses ATP synthase, so ATP falls and the energy is released as heat.", why: { 1: "That's cyanide's pattern. With an uncoupler, electrons still flow to O₂; only the link to ATP synthesis is broken." } }
      ],
      wrap: "<b>Walk-through done.</b> The pattern for any blocker question: find where the block is, then trace what backs up behind it and what runs out after it."
    },
    soloCount: 3,
    solo(rng) {
      const used = (this._used = this._used || new Set());
      if (used.size >= BANK.length - 2) used.clear();
      let i; do { i = Math.floor(rng.f() * BANK.length); } while (used.has(i));
      used.add(i);
      const b = BANK[i], order = rng.shuffle([0, 1, 2, 3]);
      return { q: b.q, o: order.map((k) => b.o[k]), a: order.indexOf(0), e: b.e, note: b.e.split(". ")[0] + "." };
    }
  });
})();
