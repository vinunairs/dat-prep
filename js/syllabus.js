/* DAT Prep — the test blueprint, from the ADA's 2026 DAT Candidate Guide (updated 08/04/2026).
   Sections → topics → subtopics. Organic Chemistry follows the updated outline the guide
   says takes effect from April 2026. Item counts and times are official; per-topic weights
   inside a section are not published, so `w` is a study-time weight only. */
(function (root) {
  const SECTIONS = [
    {
      id: "bio", name: "Biology", group: "Survey of the Natural Sciences", items: 40, color: "bio",
      blurb: "40 of the 100 science questions. Broad rather than deep: every body system, every kingdom, and a lot of genetics.",
      topics: [
        { id: "bio-cell", name: "Cell and Molecular Biology", w: 3, subs: ["Cell metabolism (photosynthesis, enzymes)", "Membrane transport and signal transduction", "Thermodynamics in cells", "Mitosis and meiosis", "Cell structure and function", "Experimental cell biology", "Biomolecules"] },
        { id: "bio-div", name: "Diversity of Life", w: 2, subs: ["Viruses", "Archaebacteria and Eubacteria", "Fungi and Protista", "Plantae", "Animalia"] },
        { id: "bio-sys", name: "Structure and Function of Systems", w: 3, subs: ["Integumentary, skeletal, muscular", "Circulatory, lymphatic and immune", "Digestive, respiratory, urinary", "Nervous and sensory", "Endocrine", "Reproductive"] },
        { id: "bio-gen", name: "Genetics", w: 3, subs: ["Molecular genetics and gene expression", "Classical (Mendelian) genetics", "Human and chromosomal genetics", "Genetic technology and genomics", "Developmental mechanisms", "Epigenetics"] },
        { id: "bio-evo", name: "Evolution and Ecology", w: 2, subs: ["Natural selection", "Population genetics and speciation", "Animal behavior", "Population, community and ecosystem ecology"] }
      ]
    },
    {
      id: "gc", name: "General Chemistry", group: "Survey of the Natural Sciences", items: 30, color: "gc",
      blurb: "30 science questions, many with quick calculations done by hand (no calculator in this section). A periodic table is provided.",
      topics: [
        { id: "gc-stoich", name: "Stoichiometry and General Concepts", w: 3, subs: ["Percent composition and empirical formulas", "Balancing equations", "Moles, molar mass and density", "Calculations from balanced equations"] },
        { id: "gc-gas", name: "Gases", w: 2, subs: ["Kinetic molecular theory", "Boyle's, Charles's and Dalton's laws", "Ideal gas law"] },
        { id: "gc-liq", name: "Liquids and Solids", w: 2, subs: ["Intermolecular forces", "Phase changes and vapor pressure", "Structures, polarity and properties"] },
        { id: "gc-sol", name: "Solutions", w: 2, subs: ["Polarity and solubility", "Colligative properties", "Concentration calculations"] },
        { id: "gc-ab", name: "Acids and Bases", w: 3, subs: ["pH and pOH", "Acid and base strength", "Brønsted–Lowry reactions", "Acid–base calculations"] },
        { id: "gc-eq", name: "Chemical Equilibria", w: 3, subs: ["Equilibrium constants", "Acid/base and solubility equilibria", "Le Chatelier's principle"] },
        { id: "gc-thermo", name: "Thermodynamics and Thermochemistry", w: 2, subs: ["Laws of thermodynamics", "Hess's law", "Enthalpy, entropy and spontaneity", "Heat transfer"] },
        { id: "gc-kin", name: "Chemical Kinetics", w: 2, subs: ["Rate laws", "Activation energy", "Half-life"] },
        { id: "gc-redox", name: "Oxidation–Reduction Reactions", w: 2, subs: ["Oxidation numbers", "Balancing redox equations", "Electrochemical cells and calculations"] },
        { id: "gc-atom", name: "Atomic and Molecular Structure", w: 3, subs: ["Electron configuration and orbitals", "Lewis structures", "Atomic and quantum theory", "Molecular geometry and bond types"] },
        { id: "gc-period", name: "Periodic Properties", w: 2, subs: ["Representative and transition elements", "Periodic trends", "Descriptive chemistry"] },
        { id: "gc-nuc", name: "Nuclear Reactions", w: 1, subs: ["Balancing nuclear equations", "Decay processes and particles", "Binding energy"] },
        { id: "gc-lab", name: "Laboratory", w: 1, subs: ["Techniques and equipment", "Error and data analysis", "Safety"] }
      ]
    },
    {
      id: "oc", name: "Organic Chemistry", group: "Survey of the Natural Sciences", items: 30, color: "oc",
      blurb: "30 science questions. Uses the updated 2026 outline: mechanisms with curved arrows, one-step to multi-step synthesis, acid–base, properties, and structure.",
      topics: [
        { id: "oc-mech", name: "Mechanisms", w: 3, subs: ["Curved arrows: single mechanisms (resonance, radical, proton transfer, addition, elimination, substitution, rearrangement, Diels–Alder)", "Combined mechanisms", "Reaction coordinate diagrams"] },
        { id: "oc-syn", name: "Chemical Synthesis", w: 4, subs: ["SN1, SN2, E1, E2", "Alkenes and alkynes", "Alcohols, ethers and epoxides", "Radical reactions", "Aromatic reactions", "Carboxylic acids and derivatives", "Ketones, aldehydes and alpha-carbonyl chemistry", "Two-step and multi-step synthesis"] },
        { id: "oc-ab", name: "Acid–Base Chemistry", w: 2, subs: ["Ranking acidity and basicity across functional groups", "Charge, size, electronegativity, resonance, induction, hybridization, sterics", "Predicting products and equilibria"] },
        { id: "oc-prop", name: "Chemical and Physical Properties", w: 2, subs: ["Polarity, intermolecular forces, solubility, melting and boiling points", "Chromatography, extraction, recrystallization, distillation", "¹H NMR, ¹³C NMR and IR spectroscopy"] },
        { id: "oc-struct", name: "Structural Evaluation", w: 3, subs: ["Nomenclature (IUPAC, functional groups)", "Stereochemistry: chirality, isomers, conformations", "Aromaticity, hybridization, resonance, orbitals", "Bond angles and lengths, relative stability"] }
      ]
    },
    {
      id: "pat", name: "Perceptual Ability", group: "Perceptual Ability Test", items: 90, color: "pat",
      blurb: "90 questions in 60 minutes across six 15-question subtests. Nothing in college teaches this, and almost everyone improves a lot with daily practice.",
      topics: [
        { id: "pat-ap", name: "Apertures", w: 1, subs: ["Will a 3D object pass through an opening?"] },
        { id: "pat-vr", name: "View Recognition", w: 1, subs: ["Match top, front and end views of an object"] },
        { id: "pat-ang", name: "Angle Discrimination", w: 1, subs: ["Rank four angles from smallest to largest"] },
        { id: "pat-pf", name: "Paper Folding", w: 1, subs: ["Unfold a folded, hole-punched sheet"] },
        { id: "pat-cube", name: "Cube Counting", w: 1, subs: ["Count cubes with a given number of painted sides"] },
        { id: "pat-3d", name: "3D Form Development", w: 1, subs: ["Which 3D shape does a flat pattern fold into?"] }
      ]
    },
    {
      id: "rc", name: "Reading Comprehension", group: "Reading Comprehension Test", items: 50, color: "rc",
      blurb: "Three long science passages, about 16–17 questions each, in 60 minutes. No outside science knowledge is needed; speed and finding details fast matter most.",
      topics: [
        { id: "rc-detail", name: "Finding details", w: 3, subs: ["Locate a stated fact quickly", "EXCEPT / NOT questions"] },
        { id: "rc-main", name: "Main idea and purpose", w: 1, subs: ["Main idea of the passage or a paragraph", "Why the author includes a detail"] },
        { id: "rc-inf", name: "Inference and reasoning", w: 2, subs: ["What the passage implies", "Cause and effect, comparisons"] },
        { id: "rc-strat", name: "Passage strategy and timing", w: 1, subs: ["Mapping a passage", "Pacing about 20 minutes per passage"] }
      ]
    },
    {
      id: "qr", name: "Quantitative Reasoning", group: "Quantitative Reasoning Test", items: 40, color: "qr",
      blurb: "40 questions in 45 minutes with a basic on-screen calculator. Algebra, data, comparisons, probability and statistics, and word problems.",
      topics: [
        { id: "qr-alg", name: "Algebra", w: 3, subs: ["Equations and expressions", "Inequalities and absolute value", "Exponents and scientific notation", "Ratios and proportions", "Graphs"] },
        { id: "qr-data", name: "Data analysis and sufficiency", w: 2, subs: ["Reading tables and charts", "Data sufficiency"] },
        { id: "qr-qc", name: "Quantitative comparison", w: 1, subs: ["Compare two quantities"] },
        { id: "qr-ps", name: "Probability and statistics", w: 2, subs: ["Probability", "Mean, median, mode, range", "Counting"] },
        { id: "qr-word", name: "Applied (word) problems", w: 3, subs: ["Rates and work", "Percents and mixtures", "Unit conversions", "Ages, distance, and other setups"] }
      ]
    }
  ];

  // Official administration schedule (5 h 15 min including optional tutorial, break and survey).
  const SCHEDULE = [
    { name: "Tutorial (optional)", min: 15 },
    { name: "Survey of the Natural Sciences", min: 90, q: 100, sections: ["bio", "gc", "oc"] },
    { name: "Perceptual Ability", min: 60, q: 90, sections: ["pat"] },
    { name: "Scheduled break (optional)", min: 30 },
    { name: "Reading Comprehension", min: 60, q: 50, sections: ["rc"] },
    { name: "Quantitative Reasoning", min: 45, q: 40, sections: ["qr"] },
    { name: "Post-test survey (optional)", min: 15 }
  ];

  const byId = {};
  for (const s of SECTIONS) { byId[s.id] = s; for (const t of s.topics) { t.section = s.id; byId[t.id] = t; } }

  root.DATSyllabus = { SECTIONS, SCHEDULE, byId, GUIDE_UPDATED: "2026-08-04" };
  if (typeof module !== "undefined") module.exports = root.DATSyllabus;
})(typeof window !== "undefined" ? window : globalThis);
