const DEFAULT_INPUT_VARIABLES = ["X"];
const DEFAULT_OUTPUT_VARIABLES = ["Z"];
const DEFAULT_X_SEQUENCE = "0101";
const EXAMPLE_TRANSITIONS = [
  { present: "A", next: { 0: "A", 1: "B" }, out: { 0: "0", 1: "0" } },
  { present: "B", next: { 0: "C", 1: "B" }, out: { 0: "0", 1: "0" } },
  { present: "C", next: { 0: "A", 1: "D" }, out: { 0: "0", 1: "0" } },
  { present: "D", next: { 0: "C", 1: "B" }, out: { 0: "1", 1: "0" } },
];

const els = {
  inputVariablesInput: document.querySelector("#inputVariablesInput"),
  outputVariablesInput: document.querySelector("#outputVariablesInput"),
  stateTableHead: document.querySelector("#stateTableHead"),
  tableBody: document.querySelector("#stateTableBody"),
  addRowButton: document.querySelector("#addRowButton"),
  removeRowButton: document.querySelector("#removeRowButton"),
  clearButton: document.querySelector("#clearTableButton"),
  loadButton: document.querySelector("#loadExampleButton"),
  descriptionInput: document.querySelector("#descriptionInput"),
  parseDescriptionButton: document.querySelector("#parseDescriptionButton"),
  generateButton: document.querySelector("#generateButton"),
  initialStateSelect: document.querySelector("#initialStateSelect"),
  xSequenceInput: document.querySelector("#xSequenceInput"),
  statusText: document.querySelector("#statusText"),
  equationList: document.querySelector("#equationList"),
  equationSelect: document.querySelector("#equationSelect"),
  kmapPanel: document.querySelector("#kmapPanel"),
  diagramCanvas: document.querySelector("#diagramCanvas"),
  diagramEmpty: document.querySelector("#diagramEmpty"),
  circuitSvg: document.querySelector("#circuitSvg"),
  stateDiagramEmpty: document.querySelector("#stateDiagramEmpty"),
  stateDiagramSvg: document.querySelector("#stateDiagramSvg"),
  timingTraceHead: document.querySelector("#timingTraceHead"),
  timingTraceBody: document.querySelector("#timingTraceBody"),
  timingDiagramEmpty: document.querySelector("#timingDiagramEmpty"),
  timingDiagramSvg: document.querySelector("#timingDiagramSvg"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  resetViewButton: document.querySelector("#resetViewButton"),
};

let inputVariables = [...DEFAULT_INPUT_VARIABLES];
let outputVariables = [...DEFAULT_OUTPUT_VARIABLES];
let inputCombos = buildInputCombinations(inputVariables.length);
let tableRows = createEmptyRows(4);
let lastAnalysis = null;
let diagramView = { x: 0, y: 0, scale: 1 };
let dragStart = null;

function renderTable() {
  renderStateTableHeader();
  els.tableBody.innerHTML = "";

  tableRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    tr.append(makeTableInputCell(row.present, rowIndex, "present", "", "A"));

    if (getSelectedRadio("modelType") === "moore") {
      tr.append(makeTableInputCell(row.out.moore || "", rowIndex, "out", "moore", outputPlaceholder()));
      inputCombos.forEach((combo) => {
        tr.append(makeTableInputCell(row.next[combo] || "", rowIndex, "next", combo, "A"));
      });
    } else {
      inputCombos.forEach((combo) => {
        tr.append(makeTableInputCell(row.next[combo] || "", rowIndex, "next", combo, "A"));
      });
      inputCombos.forEach((combo) => {
        tr.append(makeTableInputCell(row.out[combo] || "", rowIndex, "out", combo, outputPlaceholder()));
      });
    }
    els.tableBody.append(tr);
  });
}

function renderStateTableHeader() {
  const inputLabel = inputVariables.join("");
  const outputLabel = outputVariables.join("");
  const isMoore = getSelectedRadio("modelType") === "moore";
  const columnCount = isMoore ? inputCombos.length + 2 : inputCombos.length * 2 + 1;
  els.stateTableHead.closest("table").style.minWidth = `${Math.max(390, columnCount * 118)}px`;

  if (isMoore) {
    els.stateTableHead.innerHTML = `
      <tr>
        <th rowspan="2">Present State</th>
        <th rowspan="2">Output ${outputLabel}</th>
        <th colspan="${inputCombos.length}">Next State</th>
      </tr>
      <tr>
        ${inputCombos.map((combo) => `<th>${inputLabel}=${combo}</th>`).join("")}
      </tr>
    `;
    return;
  }

  els.stateTableHead.innerHTML = `
    <tr>
      <th rowspan="2">Present State</th>
      <th colspan="${inputCombos.length}">Next State</th>
      <th colspan="${inputCombos.length}">Output ${outputLabel}</th>
    </tr>
    <tr>
      ${inputCombos.map((combo) => `<th>${inputLabel}=${combo}</th>`).join("")}
      ${inputCombos.map((combo) => `<th>${inputLabel}=${combo}</th>`).join("")}
    </tr>
  `;
}

function makeTableInputCell(value, rowIndex, field, combo, placeholder) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.value = value;
  input.dataset.row = String(rowIndex);
  input.dataset.field = field;
  input.dataset.combo = combo;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  td.append(input);
  return td;
}

function collectTableInput() {
  els.tableBody.querySelectorAll("input").forEach((input) => {
    const rowIndex = Number(input.dataset.row);
    const field = input.dataset.field;
    const combo = input.dataset.combo;
    if (field === "present") {
      tableRows[rowIndex].present = input.value.trim().toUpperCase();
    } else if (field === "next") {
      tableRows[rowIndex].next[combo] = input.value.trim().toUpperCase();
    } else if (field === "out") {
      tableRows[rowIndex].out[combo] = input.value.trim();
    }
  });
}

function createEmptyRows(count) {
  return Array.from({ length: count }, () => createEmptyRow());
}

function createEmptyRow() {
  return {
    present: "",
    next: Object.fromEntries(inputCombos.map((combo) => [combo, ""])),
    out: { ...Object.fromEntries(inputCombos.map((combo) => [combo, ""])), moore: "" },
  };
}

function ensureRowShape(row) {
  const next = {};
  const out = {};
  inputCombos.forEach((combo) => {
    next[combo] = row.next?.[combo] || "";
    out[combo] = row.out?.[combo] || "";
  });
  out.moore = row.out?.moore || out[inputCombos[0]] || "";
  return { present: row.present || "", next, out };
}

function buildInputCombinations(count) {
  return Array.from({ length: 2 ** count }, (_, index) => index.toString(2).padStart(count, "0"));
}

function outputPlaceholder() {
  return outputVariables.length === 1 ? "0/1" : "0".repeat(outputVariables.length);
}

function refreshInitialStateOptions() {
  if (!els.initialStateSelect) return;
  const currentValue = els.initialStateSelect.value;
  const states = unique(
    tableRows
      .map((row) => row.present.trim().toUpperCase())
      .filter(Boolean),
  );

  els.initialStateSelect.innerHTML = "";
  if (!states.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Enter states first";
    els.initialStateSelect.append(option);
    return;
  }

  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    els.initialStateSelect.append(option);
  });

  els.initialStateSelect.value = states.includes(currentValue) ? currentValue : states[0];
}

function parseVariableList(raw, label) {
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!values.length) return { error: `${label} variables cannot be blank.` };
  const invalid = values.find((value) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value));
  if (invalid) return { error: `${label} variable "${invalid}" must use letters, numbers, or underscore and cannot start with a number.` };
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) return { error: `${label} variable "${duplicate}" is duplicated.` };
  return { values };
}

function readVariableSettings() {
  const parsedInputs = parseVariableList(els.inputVariablesInput.value, "Input");
  if (parsedInputs.error) return { error: parsedInputs.error };
  const parsedOutputs = parseVariableList(els.outputVariablesInput.value, "Output");
  if (parsedOutputs.error) return { error: parsedOutputs.error };
  const overlap = parsedInputs.values.find((name) => parsedOutputs.values.includes(name));
  if (overlap) return { error: `Input and Output variable "${overlap}" cannot conflict.` };
  return { inputVariables: parsedInputs.values, outputVariables: parsedOutputs.values };
}

function applyInitialQuerySettings() {
  const params = new URLSearchParams(window.location.search);
  const inputs = params.get("inputs");
  const outputs = params.get("outputs");
  const description = params.get("description");
  if (inputs) els.inputVariablesInput.value = inputs;
  if (outputs) els.outputVariablesInput.value = outputs;
  if (description) els.descriptionInput.value = description;
}

function applyVariableSettings({ preserveValues = true } = {}) {
  const settings = readVariableSettings();
  if (settings.error) {
    setStatus(settings.error, "error");
    return false;
  }

  inputVariables = settings.inputVariables;
  outputVariables = settings.outputVariables;
  const previousRows = preserveValues ? tableRows : [];
  inputCombos = buildInputCombinations(inputVariables.length);
  tableRows = previousRows.length ? previousRows.map(ensureRowShape) : createEmptyRows(4);
  renderTable();
  refreshInitialStateOptions();
  resetOutput();
  return true;
}

function getSelectedRadio(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function setStatus(message, mode = "") {
  els.statusText.textContent = message;
  els.statusText.className = `status-text ${mode}`.trim();
}

function loadExample() {
  if (!applyVariableSettings({ preserveValues: false })) return;
  tableRows = buildExampleRows();
  renderTable();
  refreshInitialStateOptions();
  resetOutput();
  setStatus("Example loaded. Click Generate to analyze it.", "ready");
}

function addStateTableRow() {
  collectTableInput();
  tableRows.push(createEmptyRow());
  renderTable();
  refreshInitialStateOptions();
  resetOutput();

  const firstInput = els.tableBody.querySelector(`input[data-row="${tableRows.length - 1}"][data-field="present"]`);
  firstInput?.focus();
  setStatus("Added a blank state-table row.", "ready");
}

function removeStateTableRow() {
  collectTableInput();
  if (tableRows.length <= 1) {
    setStatus("At least one state-table row is required.", "error");
    return;
  }

  tableRows.pop();
  renderTable();
  refreshInitialStateOptions();
  resetOutput();
  setStatus("Removed the last state-table row.", "ready");
}

function clearTable() {
  if (!applyVariableSettings({ preserveValues: false })) return;
  tableRows = createEmptyRows(4);
  renderTable();
  refreshInitialStateOptions();
  resetOutput();
  setStatus("Table cleared.", "");
}

function buildExampleRows() {
  return EXAMPLE_TRANSITIONS.map((source) => {
    const row = createEmptyRow();
    row.present = source.present;
    inputCombos.forEach((combo) => {
      const sourceKey = combo.at(-1);
      row.next[combo] = source.next[sourceKey];
      row.out[combo] = source.out[sourceKey].repeat(outputVariables.length);
    });
    row.out.moore = row.out[inputCombos[0]];
    return row;
  });
}

function parseDescriptionToStateTable() {
  if (!applyVariableSettings({ preserveValues: false })) return;
  const text = els.descriptionInput.value.trim().toLowerCase();
  if (!text) {
    setStatus("Enter a text description before parsing.", "error");
    return;
  }

  const mentionsConsecutiveOnes = text.includes("three") && text.includes("consecutive") && text.includes("1");
  if (!mentionsConsecutiveOnes) {
    setStatus("Parser currently recognizes consecutive-three-or-more-ones Mealy descriptions.", "error");
    return;
  }

  document.querySelector('input[name="modelType"][value="mealy"]').checked = true;
  tableRows = buildConsecutiveOnesRows();
  renderTable();
  refreshInitialStateOptions();
  resetOutput();
  setStatus(`Parsed description using input ${inputBusLabel()} and output ${outputBusLabel()}.`, "ready");
}

function buildConsecutiveOnesRows() {
  const transitions = [
    { present: "A", zero: "A", one: "B", zeroOut: "0", oneOut: "0" },
    { present: "B", zero: "A", one: "C", zeroOut: "0", oneOut: "0" },
    { present: "C", zero: "A", one: "D", zeroOut: "0", oneOut: "1" },
    { present: "D", zero: "A", one: "D", zeroOut: "0", oneOut: "1" },
  ];
  return transitions.map((source) => {
    const row = createEmptyRow();
    row.present = source.present;
    inputCombos.forEach((combo) => {
      const bit = combo.at(-1);
      row.next[combo] = bit === "1" ? source.one : source.zero;
      const outputBit = bit === "1" ? source.oneOut : source.zeroOut;
      row.out[combo] = outputBit.repeat(outputVariables.length);
    });
    row.out.moore = row.out[inputCombos[0]];
    return row;
  });
}

function resetOutput() {
  lastAnalysis = null;
  els.equationSelect.disabled = true;
  els.equationSelect.innerHTML = "<option>Generate first</option>";
  els.equationList.innerHTML = `
    <div class="empty-state">
      <strong>No equations yet</strong>
      <span>Click Generate after completing the configuration.</span>
    </div>
  `;
  els.kmapPanel.innerHTML = `
    <div class="empty-state">
      <strong>K-map preview</strong>
      <span>The selected flip-flop input will appear here.</span>
    </div>
  `;
  els.diagramEmpty.hidden = false;
  els.circuitSvg.innerHTML = "";
  els.stateDiagramEmpty.hidden = false;
  els.stateDiagramSvg.innerHTML = "";
  els.timingTraceHead.innerHTML = "";
  els.timingTraceBody.innerHTML = `
    <tr>
      <td class="trace-empty" colspan="9">Generate to simulate the selected input sequence.</td>
    </tr>
  `;
  els.timingDiagramEmpty.hidden = false;
  els.timingDiagramSvg.innerHTML = "";
}

function normalizeRows(rows) {
  return rows
    .map((row) => ({
      present: row.present.trim().toUpperCase(),
      next: Object.fromEntries(inputCombos.map((combo) => [combo, (row.next[combo] || "").trim().toUpperCase()])),
      out: {
        ...Object.fromEntries(inputCombos.map((combo) => [combo, (row.out[combo] || "").trim()])),
        moore: (row.out.moore || "").trim(),
      },
    }))
    .filter((row) => row.present || inputCombos.some((combo) => row.next[combo] || row.out[combo]) || row.out.moore);
}

function validateRows(rows) {
  if (rows.length === 0) {
    return "Enter at least one state-table row.";
  }

  const statePattern = /^[A-Z][A-Z0-9_]*$/;
  for (const [index, row] of rows.entries()) {
    const label = `Row ${index + 1}`;
    if (!row.present || inputCombos.some((combo) => !row.next[combo])) {
      return `${label}: present state and every next state are required.`;
    }
    if (!statePattern.test(row.present) || inputCombos.some((combo) => !statePattern.test(row.next[combo]))) {
      return `${label}: state names must start with a letter and use letters, numbers, or underscores.`;
    }
    const outputValues = getSelectedRadio("modelType") === "moore" ? [row.out.moore] : inputCombos.map((combo) => row.out[combo]);
    const invalidOutput = outputValues.find((value) => !isValidOutputValue(value));
    if (invalidOutput !== undefined) {
      return `${label}: outputs must be ${outputVariables.length}-bit binary values.`;
    }
  }

  const presentStates = rows.map((row) => row.present);
  const duplicate = presentStates.find((state, index) => presentStates.indexOf(state) !== index);
  if (duplicate) {
    return `Present state ${duplicate} is duplicated.`;
  }

  return "";
}

function isValidOutputValue(value) {
  return new RegExp(`^[01]{${outputVariables.length}}$`).test(value);
}

function inputBusLabel(vars = inputVariables) {
  return vars.join("");
}

function outputBusLabel(vars = outputVariables) {
  return vars.join("");
}

function literalBase(label) {
  return label.replace(/'$/, "");
}

function isInputLiteral(label, vars = inputVariables) {
  return vars.includes(literalBase(label));
}

function comboToAssignments(combo, vars = inputVariables) {
  return vars.map((variable, index) => `${variable}=${combo[index]}`).join(",");
}

function splitSequenceIntoCombos(sequence, width) {
  const combos = [];
  for (let index = 0; index < sequence.length; index += width) {
    combos.push(sequence.slice(index, index + width));
  }
  return combos;
}

function analyze() {
  collectTableInput();
  if (!applyVariableSettings({ preserveValues: true })) return;
  collectTableInput();

  const modelType = getSelectedRadio("modelType");
  const ffType = getSelectedRadio("ffType");
  const rows = normalizeRows(tableRows);
  const validationError = validateRows(rows);
  const xSequence = els.xSequenceInput.value.trim();

  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  if (!/^[01]+$/.test(xSequence)) {
    setStatus("Input Sequence must contain only 0 and 1.", "error");
    return;
  }
  if (xSequence.length % inputVariables.length !== 0) {
    setStatus(`Input Sequence length must be a multiple of ${inputVariables.length} for ${inputVariables.join(",")}.`, "error");
    return;
  }

  const analysis = buildAnalysis({ rows, modelType, ffType });
  refreshInitialStateOptions();
  const initialState = els.initialStateSelect.value || rows[0].present;
  if (!analysis.stateMap.has(initialState)) {
    setStatus(`Initial state ${initialState || "(empty)"} is not present in the state table.`, "error");
    return;
  }

  const trace = simulateTimingTrace(analysis, initialState, xSequence);
  lastAnalysis = analysis;

  renderEquationSelect(analysis.equations);
  renderEquationList(analysis.equations);
  renderKMap(analysis.equations.find((equation) => equation.role === "ff"));
  renderCircuitDiagram(analysis);
  renderStateDiagram(analysis);
  renderTimingTrace(trace, analysis);
  renderTimingDiagram(trace, analysis);

  const note = analysis.notes.length ? ` ${analysis.notes[0]}` : "";
  setStatus(`Generated ${analysis.equations.length} equations and ${trace.length} timing cycles for ${analysis.stateCount} states.${note}`, "ready");
}

function buildAnalysis({ rows, modelType, ffType }) {
  const states = unique([
    ...rows.map((row) => row.present),
    ...rows.flatMap((row) => inputCombos.map((combo) => row.next[combo])),
  ]);

  const stateBits = Math.max(1, Math.ceil(Math.log2(states.length)));
  const stateMap = new Map(states.map((state, index) => [state, toBits(index, stateBits)]));
  const ffVarNames = [...stateVarNames(stateBits), ...inputVariables];
  const knownCombos = new Set();
  const transitions = [];
  const notes = [];

  rows.forEach((row) => {
    inputCombos.forEach((combo) => {
      const presentBits = stateMap.get(row.present);
      const nextBits = stateMap.get(row.next[combo]);
      const output = modelType === "moore" ? row.out.moore : row.out[combo];
      const inputBits = `${presentBits}${combo}`;
      const minterm = parseInt(inputBits, 2);
      knownCombos.add(minterm);
      transitions.push({
        presentState: row.present,
        nextState: row.next[combo],
        inputCombo: combo,
        presentBits,
        nextBits,
        output,
        minterm,
      });
    });
  });

  const ffDontCares = allIndices(ffVarNames.length).filter((index) => !knownCombos.has(index));
  const equations = [];

  for (let bit = 0; bit < stateBits; bit += 1) {
    const qName = ffVarNames[bit];
    const qIndex = qName.slice(1);
    if (ffType === "jk") {
      const jOnes = [];
      const jDcs = [...ffDontCares];
      const kOnes = [];
      const kDcs = [...ffDontCares];

      transitions.forEach((transition) => {
        const q = transition.presentBits[bit];
        const qNext = transition.nextBits[bit];
        if (q === "0") {
          if (qNext === "1") jOnes.push(transition.minterm);
          kDcs.push(transition.minterm);
        } else {
          jDcs.push(transition.minterm);
          if (qNext === "0") kOnes.push(transition.minterm);
        }
      });

      equations.push(makeEquation(`J${qIndex}`, "ff", ffVarNames, jOnes, jDcs));
      equations.push(makeEquation(`K${qIndex}`, "ff", ffVarNames, kOnes, kDcs));
    } else if (ffType === "t") {
      const tOnes = [];
      transitions.forEach((transition) => {
        if (transition.presentBits[bit] !== transition.nextBits[bit]) {
          tOnes.push(transition.minterm);
        }
      });
      equations.push(makeEquation(`T${qIndex}`, "ff", ffVarNames, tOnes, ffDontCares));
    } else if (ffType === "d") {
      const dOnes = [];
      transitions.forEach((transition) => {
        if (transition.nextBits[bit] === "1") {
          dOnes.push(transition.minterm);
        }
      });
      equations.push(makeEquation(`D${qIndex}`, "ff", ffVarNames, dOnes, ffDontCares));
    } else if (ffType === "sr") {
      const sOnes = [];
      const sDcs = [...ffDontCares];
      const rOnes = [];
      const rDcs = [...ffDontCares];

      transitions.forEach((transition) => {
        const q = transition.presentBits[bit];
        const qNext = transition.nextBits[bit];
        if (q === "0" && qNext === "0") {
          rDcs.push(transition.minterm);
        } else if (q === "0" && qNext === "1") {
          sOnes.push(transition.minterm);
        } else if (q === "1" && qNext === "0") {
          rOnes.push(transition.minterm);
        } else if (q === "1" && qNext === "1") {
          sDcs.push(transition.minterm);
        }
      });

      if (sOnes.some((minterm) => rOnes.includes(minterm))) {
        notes.push(`SR excitation conflict detected on ${qName}.`);
      }

      equations.push(makeEquation(`S${qIndex}`, "ff", ffVarNames, sOnes, sDcs));
      equations.push(makeEquation(`R${qIndex}`, "ff", ffVarNames, rOnes, rDcs));
    }
  }

  if (modelType === "moore") {
    const outputVars = stateVarNames(stateBits);
    const presentStateIndexes = new Set(rows.map((row) => parseInt(stateMap.get(row.present), 2)));
    const outputDcs = allIndices(outputVars.length).filter((index) => !presentStateIndexes.has(index));

    outputVariables.forEach((outputName, outputIndex) => {
      const outputOnes = [];
      rows.forEach((row) => {
        if (row.out.moore[outputIndex] === "1") {
          outputOnes.push(parseInt(stateMap.get(row.present), 2));
        }
      });
      equations.push(makeEquation(outputName, "output", outputVars, outputOnes, outputDcs));
    });
  } else {
    outputVariables.forEach((outputName, outputIndex) => {
      const outputOnes = transitions.filter((transition) => transition.output[outputIndex] === "1").map((transition) => transition.minterm);
      equations.push(makeEquation(outputName, "output", ffVarNames, outputOnes, ffDontCares));
    });
  }

  return {
    modelType,
    ffType,
    inputVariables: [...inputVariables],
    outputVariables: [...outputVariables],
    inputCombos: [...inputCombos],
    rows,
    states,
    stateMap,
    stateCount: states.length,
    stateBits,
    transitions,
    equations,
    notes: unique(notes),
  };
}

function makeEquation(name, role, vars, ones, dontCares) {
  const minimized = minimizeSop(vars, uniqueNumbers(ones), uniqueNumbers(dontCares));
  return {
    name,
    role,
    vars,
    ones: uniqueNumbers(ones),
    dontCares: uniqueNumbers(dontCares),
    expression: minimized.expression,
    implicants: minimized.implicants,
  };
}

function stateVarNames(bitCount) {
  return Array.from({ length: bitCount }, (_, index) => `Q${bitCount - index - 1}`);
}

function toBits(index, width) {
  return index.toString(2).padStart(width, "0");
}

function allIndices(varCount) {
  return Array.from({ length: 2 ** varCount }, (_, index) => index);
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueNumbers(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function minimizeSop(vars, ones, dontCares) {
  const varCount = vars.length;
  const oneSet = new Set(ones);

  if (ones.length === 0) {
    return { expression: "0", implicants: [] };
  }

  const sourceTerms = uniqueNumbers([...ones, ...dontCares]).map((index) => ({
    bits: toBits(index, varCount),
    covers: new Set([index]),
    hasOne: oneSet.has(index),
  }));

  let current = sourceTerms;
  const primeMap = new Map();

  while (current.length) {
    const nextMap = new Map();
    const combined = new Set();

    for (let i = 0; i < current.length; i += 1) {
      for (let j = i + 1; j < current.length; j += 1) {
        const mergedBits = combineBits(current[i].bits, current[j].bits);
        if (!mergedBits) continue;

        combined.add(i);
        combined.add(j);

        const covers = new Set([...current[i].covers, ...current[j].covers]);
        const hasOne = [...covers].some((cover) => oneSet.has(cover));
        if (!nextMap.has(mergedBits)) {
          nextMap.set(mergedBits, { bits: mergedBits, covers, hasOne });
        } else {
          const existing = nextMap.get(mergedBits);
          covers.forEach((cover) => existing.covers.add(cover));
          existing.hasOne = existing.hasOne || hasOne;
        }
      }
    }

    current.forEach((term, index) => {
      if (!combined.has(index) && term.hasOne) {
        if (!primeMap.has(term.bits)) {
          primeMap.set(term.bits, term);
        } else {
          const existing = primeMap.get(term.bits);
          term.covers.forEach((cover) => existing.covers.add(cover));
        }
      }
    });

    current = [...nextMap.values()];
  }

  const primes = [...primeMap.values()];
  const selected = [];
  const uncovered = new Set(ones);

  ones.forEach((minterm) => {
    const coveringPrimes = primes.filter((prime) => termCovers(prime.bits, minterm, varCount));
    if (coveringPrimes.length === 1 && !selected.includes(coveringPrimes[0])) {
      selected.push(coveringPrimes[0]);
    }
  });

  selected.forEach((term) => {
    [...uncovered].forEach((minterm) => {
      if (termCovers(term.bits, minterm, varCount)) uncovered.delete(minterm);
    });
  });

  while (uncovered.size) {
    const best = primes
      .filter((prime) => !selected.includes(prime))
      .map((prime) => ({
        prime,
        score: [...uncovered].filter((minterm) => termCovers(prime.bits, minterm, varCount)).length,
      }))
      .sort((a, b) => b.score - a.score || countLiterals(a.prime.bits) - countLiterals(b.prime.bits))[0];

    if (!best || best.score === 0) break;
    selected.push(best.prime);
    [...uncovered].forEach((minterm) => {
      if (termCovers(best.prime.bits, minterm, varCount)) uncovered.delete(minterm);
    });
  }

  const implicants = selected.map((term) => ({
    bits: term.bits,
    label: termToExpression(term.bits, vars),
  }));

  return {
    expression: implicants.map((implicant) => implicant.label).join(" + ") || "0",
    implicants,
  };
}

function combineBits(a, b) {
  let diffCount = 0;
  let merged = "";

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) {
      merged += a[i];
    } else if (a[i] !== "-" && b[i] !== "-") {
      diffCount += 1;
      merged += "-";
    } else {
      return "";
    }
  }

  return diffCount === 1 ? merged : "";
}

function termCovers(bits, minterm, varCount) {
  const mintermBits = toBits(minterm, varCount);
  return bits.split("").every((bit, index) => bit === "-" || bit === mintermBits[index]);
}

function countLiterals(bits) {
  return bits.replaceAll("-", "").length;
}

function termToExpression(bits, vars) {
  const terms = bits
    .split("")
    .map((bit, index) => {
      if (bit === "-") return "";
      return bit === "1" ? vars[index] : `${vars[index]}'`;
    })
    .filter(Boolean);
  return terms.length ? terms.join("") : "1";
}

function renderEquationSelect(equations) {
  const targetEquations = equations.filter((equation) => equation.role === "ff");
  els.equationSelect.disabled = false;
  els.equationSelect.innerHTML = "";
  targetEquations.forEach((equation) => {
    const option = document.createElement("option");
    option.value = String(equations.indexOf(equation));
    option.textContent = `${equation.name} = ${equation.expression}`;
    els.equationSelect.append(option);
  });
}

function renderEquationList(equations) {
  els.equationList.innerHTML = "";
  equations.forEach((equation) => {
    const card = document.createElement("article");
    card.className = "equation-card";
    card.innerHTML = `
      <span class="equation-name">${equation.role === "ff" ? "Flip-flop input" : "Output logic"}</span>
      <span class="equation-value">${equation.name} = ${equation.expression}</span>
    `;
    els.equationList.append(card);
  });
}

function renderKMap(equation) {
  if (!equation) return;

  if (equation.vars.length > 4) {
    els.kmapPanel.innerHTML = `
      <div class="kmap-title">
        <strong>${equation.name} K-map</strong>
        <span class="kmap-expression">${equation.expression}</span>
      </div>
      <div class="empty-state">
        <strong>Truth table fallback</strong>
        <span>This scaffold displays K-maps up to 4 variables. The equation is still minimized.</span>
      </div>
    `;
    return;
  }

  const map = buildKMapLayout(equation.vars);
  const oneSet = new Set(equation.ones);
  const dcSet = new Set(equation.dontCares);
  const grouped = new Set();

  equation.implicants.forEach((implicant) => {
    allIndices(equation.vars.length).forEach((index) => {
      if (termCovers(implicant.bits, index, equation.vars.length)) grouped.add(index);
    });
  });

  els.kmapPanel.innerHTML = "";

  const title = document.createElement("div");
  title.className = "kmap-title";
  title.innerHTML = `
    <strong>${equation.name} K-map</strong>
    <span class="kmap-expression">${equation.expression}</span>
  `;
  els.kmapPanel.append(title);

  const grid = document.createElement("div");
  grid.className = "kmap-grid";
  grid.style.gridTemplateColumns = `repeat(${map.cols.length + 1}, minmax(58px, 1fr))`;
  grid.append(makeKMapCell(`${map.rowLabel}\\${map.colLabel}`, "label"));

  map.cols.forEach((col) => grid.append(makeKMapCell(col.label, "label")));

  map.rows.forEach((row) => {
    grid.append(makeKMapCell(row.label, "label"));
    map.cols.forEach((col) => {
      const bitString = row.bits + col.bits;
      const index = parseInt(bitString, 2);
      const value = oneSet.has(index) ? "1" : dcSet.has(index) ? "X" : "0";
      const state = oneSet.has(index) ? "one" : dcSet.has(index) ? "dc" : "";
      const isGrouped = grouped.has(index) && value !== "0";
      grid.append(makeKMapCell(value, `${state}${isGrouped ? " grouped" : ""}`.trim()));
    });
  });

  els.kmapPanel.append(grid);

  const groupList = document.createElement("div");
  groupList.className = "group-list";
  if (equation.implicants.length) {
    equation.implicants.forEach((implicant, index) => {
      const chip = document.createElement("span");
      chip.className = "group-chip";
      chip.textContent = `Group ${index + 1}: ${implicant.label}`;
      groupList.append(chip);
    });
  } else {
    const chip = document.createElement("span");
    chip.className = "group-chip";
    chip.textContent = "No active groups";
    groupList.append(chip);
  }
  els.kmapPanel.append(groupList);
}

function buildKMapLayout(vars) {
  if (vars.length === 1) {
    return {
      rowLabel: "",
      colLabel: vars[0],
      rows: [{ label: "", bits: "" }],
      cols: [
        { label: "0", bits: "0" },
        { label: "1", bits: "1" },
      ],
    };
  }

  if (vars.length === 2) {
    return {
      rowLabel: vars[0],
      colLabel: vars[1],
      rows: [
        { label: "0", bits: "0" },
        { label: "1", bits: "1" },
      ],
      cols: [
        { label: "0", bits: "0" },
        { label: "1", bits: "1" },
      ],
    };
  }

  if (vars.length === 4) {
    return buildFourVariableKMapLayout(vars);
  }

  return {
    rowLabel: vars[0],
    colLabel: `${vars[1]}${vars[2]}`,
    rows: [
      { label: "0", bits: "0" },
      { label: "1", bits: "1" },
    ],
    cols: [
      { label: "00", bits: "00" },
      { label: "01", bits: "01" },
      { label: "11", bits: "11" },
      { label: "10", bits: "10" },
    ],
  };
}

function buildFourVariableKMapLayout(vars) {
  return {
    rowLabel: `${vars[0]}${vars[1]}`,
    colLabel: `${vars[2]}${vars[3]}`,
    rows: [
      { label: "00", bits: "00" },
      { label: "01", bits: "01" },
      { label: "11", bits: "11" },
      { label: "10", bits: "10" },
    ],
    cols: [
      { label: "00", bits: "00" },
      { label: "01", bits: "01" },
      { label: "11", bits: "11" },
      { label: "10", bits: "10" },
    ],
  };
}

function makeKMapCell(text, className) {
  const cell = document.createElement("div");
  cell.className = `kmap-cell ${className ? `kmap-${className}` : ""}`.replace("kmap-one", "one").replace("kmap-dc", "dc").replace("kmap-grouped", "grouped").replace("kmap-label", "kmap-label");
  cell.textContent = text;
  return cell;
}

function renderStateDiagram(analysis) {
  els.stateDiagramEmpty.hidden = true;
  const svg = els.stateDiagramSvg;
  svg.innerHTML = "";

  const stateCount = Math.max(analysis.states.length, 1);
  const padding = { top: 140, right: 210, bottom: 150, left: 170 };
  const contentWidth = Math.max(940, stateCount * 240);
  const contentHeight = Math.max(760, stateCount * 180);
  const width = contentWidth + padding.left + padding.right;
  const height = contentHeight + padding.top + padding.bottom;
  const center = { x: padding.left + contentWidth / 2, y: padding.top + contentHeight / 2 };
  const layoutRadius = Math.min(contentWidth, contentHeight) * 0.3;
  const nodeRadius = 34;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id: "stateArrow",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 3,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  marker.append(svgEl("path", { d: "M0,0 L0,6 L9,3 z", fill: "#64748b" }));
  defs.append(marker);
  svg.append(defs);

  const positions = new Map();
  analysis.states.forEach((state, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / analysis.states.length;
    positions.set(state, {
      x: center.x + Math.cos(angle) * layoutRadius,
      y: center.y + Math.sin(angle) * layoutRadius,
    });
  });

  const edgeLayer = svgEl("g");
  const nodeLayer = svgEl("g");
  svg.append(edgeLayer, nodeLayer);

  const transitions = [];
  analysis.rows.forEach((row) => {
    analysis.inputCombos.forEach((combo, comboIndex) => {
      const from = positions.get(row.present);
      const nextState = row.next[combo];
      const to = positions.get(nextState);
      const output = outputForTransition(row, combo, analysis.modelType);
      const inputText = analysis.inputVariables.length === 1 ? `${analysis.inputVariables[0]}=${combo}` : `${inputBusLabel(analysis.inputVariables)}=${combo}`;
      const label = analysis.modelType === "mealy" ? `${inputText} / ${outputBusLabel(analysis.outputVariables)}=${output}` : inputText;
      if (!from || !to) return;

      transitions.push({
        fromState: row.present,
        toState: nextState,
        from,
        to,
        label,
        comboIndex,
        isLoop: row.present === nextState,
      });
    });
  });

  const placedLabels = [];
  const stateDiagramLayout = {
    bounds: {
      x: padding.left,
      y: padding.top,
      w: width - padding.left - padding.right,
      h: height - padding.top - padding.bottom,
    },
    center,
    placedLabels,
    padding,
  };

  const transitionGeometries = layoutStateTransitions(transitions).map((transition) => {
    if (transition.isLoop) {
      return buildStateSelfLoopGeometry(transition, nodeRadius, stateDiagramLayout);
    }
    return buildStateEdgeGeometry(transition, nodeRadius, stateDiagramLayout);
  });
  const allStatePathSamples = transitionGeometries.flatMap((geometry) => geometry.pathSamples);
  transitionGeometries.forEach((geometry) => {
    drawStateTransition(edgeLayer, geometry, stateDiagramLayout, allStatePathSamples);
  });

  analysis.states.forEach((state) => {
    const pos = positions.get(state);
    const group = svgEl("g");
    group.append(svgEl("circle", { class: "state-node", cx: pos.x, cy: pos.y, r: nodeRadius }));
    group.append(svgText(state, pos.x, pos.y - (analysis.modelType === "moore" ? 3 : -4), { class: "state-node-label" }));
    if (analysis.modelType === "moore") {
      group.append(svgText(`${outputBusLabel(analysis.outputVariables)}=${mooreOutputForState(analysis, state)}`, pos.x, pos.y + 17, { class: "state-node-subtitle" }));
    }
    nodeLayer.append(group);
  });
}

function layoutStateTransitions(transitions) {
  const byNodePair = new Map();
  const selfLoopsByState = new Map();

  transitions.forEach((transition) => {
    if (transition.isLoop) {
      const loops = selfLoopsByState.get(transition.fromState) || [];
      loops.push(transition);
      selfLoopsByState.set(transition.fromState, loops);
      return;
    }

    const pairKey = [transition.fromState, transition.toState].sort().join("::");
    const pair = byNodePair.get(pairKey) || [];
    pair.push(transition);
    byNodePair.set(pairKey, pair);
  });

  byNodePair.forEach((pair) => {
    const byDirection = new Map();
    pair.forEach((transition) => {
      const directionKey = `${transition.fromState}->${transition.toState}`;
      const direction = byDirection.get(directionKey) || [];
      direction.push(transition);
      byDirection.set(directionKey, direction);
    });

    [...byDirection.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([directionKey, direction], directionIndex) => {
        direction
          .sort((a, b) => a.comboIndex - b.comboIndex)
          .forEach((transition, laneIndex) => {
            transition.directionKey = directionKey;
            transition.directionIndex = directionIndex;
            transition.directionCount = byDirection.size;
            transition.directionSide = byDirection.size > 1 && directionIndex % 2 === 1 ? -1 : 1;
            transition.laneIndex = laneIndex;
            transition.laneCount = direction.length;
          });
      });
  });

  selfLoopsByState.forEach((loops) => {
    loops
      .sort((a, b) => a.comboIndex - b.comboIndex)
      .forEach((transition, loopIndex) => {
        transition.loopIndex = loopIndex;
        transition.loopCount = loops.length;
      });
  });

  return transitions;
}

function buildStateEdgeGeometry(transition, radius, layout) {
  const { from, to, label } = transition;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const outwardNormal = stateEdgeNormal(from, to, layout.center, ux, uy);
  const normal = {
    x: outwardNormal.x * (transition.directionSide || 1),
    y: outwardNormal.y * (transition.directionSide || 1),
  };
  const centeredLane = transition.laneIndex - (transition.laneCount - 1) / 2;
  const endpointShift = centeredLane * 10;
  const start = {
    x: from.x + ux * radius + normal.x * endpointShift,
    y: from.y + uy * radius + normal.y * endpointShift,
  };
  const end = {
    x: to.x - ux * (radius + 7) + normal.x * endpointShift,
    y: to.y - uy * (radius + 7) + normal.y * endpointShift,
  };
  const curve = 66 + Math.abs(centeredLane) * 34 + (transition.directionCount > 1 ? 18 : 0);
  const control = {
    x: (start.x + end.x) / 2 + normal.x * curve,
    y: (start.y + end.y) / 2 + normal.y * curve,
  };
  const labelT = clamp(0.5 + centeredLane * 0.08, 0.34, 0.66);
  const labelPoint = quadraticPoint(start, control, end, labelT);
  const tangent = quadraticTangent(start, control, end, labelT);
  const pathNormal = chooseStateLabelNormal(tangent, normal);
  const pathSamples = sampleQuadraticPath(start, control, end, 72);

  return {
    label,
    className: "state-edge",
    d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    pathSamples,
    labelPlacement: {
      label,
      basePoint: labelPoint,
      normal: pathNormal,
      tangent,
      tangentShift: centeredLane * 24,
    },
  };
}

function drawStateTransition(layer, geometry, layout, allPathSamples) {
  layer.append(
    svgEl("path", {
      class: geometry.className,
      d: geometry.d,
      "marker-end": "url(#stateArrow)",
    }),
  );
  const placement = placeStateEdgeLabel({
    ...geometry.labelPlacement,
    pathSamples: allPathSamples,
    placedLabels: layout.placedLabels,
    bounds: layout.bounds,
  });
  drawStateEdgeLabel(layer, geometry.label, placement);
  layout.placedLabels.push(placement.box);
}

function stateEdgeNormal(from, to, center, ux, uy) {
  const baseNormal = { x: -uy, y: ux };
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const outward = { x: midpoint.x - center.x, y: midpoint.y - center.y };
  const outwardLength = Math.hypot(outward.x, outward.y);

  if (outwardLength < 1) {
    return baseNormal;
  }

  const dot = baseNormal.x * outward.x + baseNormal.y * outward.y;
  return dot >= 0 ? baseNormal : { x: -baseNormal.x, y: -baseNormal.y };
}

function quadraticPoint(start, control, end, t) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
  };
}

function quadraticTangent(start, control, end, t) {
  return normalizeVector(
    {
      x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
      y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
    },
    { x: 1, y: 0 },
  );
}

function cubicPoint(start, c1, c2, end, t) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT ** 3 * start.x + 3 * oneMinusT * oneMinusT * t * c1.x + 3 * oneMinusT * t * t * c2.x + t ** 3 * end.x,
    y: oneMinusT ** 3 * start.y + 3 * oneMinusT * oneMinusT * t * c1.y + 3 * oneMinusT * t * t * c2.y + t ** 3 * end.y,
  };
}

function sampleQuadraticPath(start, control, end, sampleCount = 60) {
  return Array.from({ length: sampleCount + 1 }, (_, index) => quadraticPoint(start, control, end, index / sampleCount));
}

function sampleCubicPath(start, c1, c2, end, sampleCount = 72) {
  return Array.from({ length: sampleCount + 1 }, (_, index) => cubicPoint(start, c1, c2, end, index / sampleCount));
}

function chooseStateLabelNormal(tangent, preferredNormal) {
  let normal = normalizeVector({ x: -tangent.y, y: tangent.x }, preferredNormal);
  if (normal.x * preferredNormal.x + normal.y * preferredNormal.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  return normal;
}

function buildStateSelfLoopGeometry(transition, radius, layout) {
  const { from: pos, label } = transition;
  const outward = normalizeVector({ x: pos.x - layout.center.x, y: pos.y - layout.center.y }, { x: 0, y: -1 });
  const tangent = { x: -outward.y, y: outward.x };
  const loopIndex = transition.loopIndex || 0;
  const centeredLoop = loopIndex - ((transition.loopCount || 1) - 1) / 2;
  const loopWidth = 78 + loopIndex * 24;
  const loopDepth = 96 + loopIndex * 38;
  const start = {
    x: pos.x - tangent.x * 15 + outward.x * (radius - 1),
    y: pos.y - tangent.y * 15 + outward.y * (radius - 1),
  };
  const end = {
    x: pos.x + tangent.x * 15 + outward.x * (radius - 1),
    y: pos.y + tangent.y * 15 + outward.y * (radius - 1),
  };
  const c1 = {
    x: pos.x - tangent.x * loopWidth + outward.x * (radius + loopDepth),
    y: pos.y - tangent.y * loopWidth + outward.y * (radius + loopDepth),
  };
  const c2 = {
    x: pos.x + tangent.x * loopWidth + outward.x * (radius + loopDepth),
    y: pos.y + tangent.y * loopWidth + outward.y * (radius + loopDepth),
  };
  const loopPoint = cubicPoint(start, c1, c2, end, 0.5);
  const pathSamples = sampleCubicPath(start, c1, c2, end, 84);

  return {
    label,
    className: "state-loop",
    d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
    pathSamples,
    labelPlacement: {
      label,
      basePoint: loopPoint,
      normal: outward,
      tangent,
      tangentShift: centeredLoop * 58,
      extraOffset: 16,
    },
  };
}

function normalizeVector(vector, fallback) {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 1) return fallback;
  return { x: vector.x / length, y: vector.y / length };
}

function placeStateEdgeLabel({ label, basePoint, normal, tangent, pathSamples, placedLabels, bounds, tangentShift = 0, extraOffset = 0 }) {
  const width = Math.max(48, label.length * 7.2 + 14);
  const height = 20;
  const unitNormal = normalizeVector(normal, { x: 0, y: -1 });
  const unitTangent = normalizeVector(tangent, { x: 1, y: 0 });
  const normalExtent = Math.abs(unitNormal.x) * (width / 2) + Math.abs(unitNormal.y) * (height / 2);
  const baseOffset = normalExtent + 28 + extraOffset;
  let bestPlacement = null;

  for (let offsetAttempt = 0; offsetAttempt < 8; offsetAttempt += 1) {
    for (let shiftAttempt = 0; shiftAttempt < 5; shiftAttempt += 1) {
      const shiftSign = shiftAttempt === 0 ? 0 : shiftAttempt % 2 === 1 ? 1 : -1;
      const shiftMagnitude = shiftAttempt === 0 ? 0 : Math.ceil(shiftAttempt / 2) * 22;
      const center = clampStateLabelCenter(
        {
          x: basePoint.x + unitNormal.x * (baseOffset + offsetAttempt * 16) + unitTangent.x * (tangentShift + shiftSign * shiftMagnitude),
          y: basePoint.y + unitNormal.y * (baseOffset + offsetAttempt * 16) + unitTangent.y * (tangentShift + shiftSign * shiftMagnitude),
        },
        width,
        height,
        bounds,
      );
      const box = stateLabelBox(center, width, height);
      const pathDistance = minDistanceFromBox(pathSamples, box);
      const overlapsPlaced = placedLabels.some((placedBox) => boxesOverlap(box, placedBox, 8));
      const score = pathDistance - (overlapsPlaced ? 1000 : 0) - offsetAttempt * 2 - shiftAttempt;
      const placement = { x: center.x, y: center.y, width, height, box, pathDistance, overlapsPlaced, score };

      if (!bestPlacement || placement.score > bestPlacement.score) bestPlacement = placement;
      if (pathDistance >= 12 && !overlapsPlaced) return placement;
    }
  }

  return bestPlacement;
}

function clampStateLabelCenter(center, width, height, bounds) {
  return {
    x: clamp(center.x, bounds.x + width / 2, bounds.x + bounds.w - width / 2),
    y: clamp(center.y, bounds.y + height / 2, bounds.y + bounds.h - height / 2),
  };
}

function stateLabelBox(center, width, height) {
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    w: width,
    h: height,
  };
}

function pointToBoxDistance(point, box) {
  const dx = Math.max(box.x - point.x, 0, point.x - (box.x + box.w));
  const dy = Math.max(box.y - point.y, 0, point.y - (box.y + box.h));
  return Math.hypot(dx, dy);
}

function minDistanceFromBox(points, box) {
  return Math.min(...points.map((point) => pointToBoxDistance(point, box)));
}

function boxesOverlap(a, b, margin = 0) {
  return !(
    a.x + a.w + margin < b.x ||
    b.x + b.w + margin < a.x ||
    a.y + a.h + margin < b.y ||
    b.y + b.h + margin < a.y
  );
}

function drawStateEdgeLabel(layer, label, placement) {
  const { x, y, width, height } = placement;
  const group = svgEl("g", { class: "state-edge-label-group" });
  group.append(
    svgEl("rect", {
      class: "state-edge-label-bg",
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
      rx: 5,
      ry: 5,
    }),
  );
  group.append(svgText(label, x, y + 4, { class: "state-edge-label" }));
  layer.append(group);
}

function simulateTimingTrace(analysis, initialState, xSequence) {
  const trace = [];
  let currentState = initialState;
  const sequenceCombos = splitSequenceIntoCombos(xSequence, analysis.inputVariables.length);

  sequenceCombos.forEach((inputCombo, cycle) => {
    const row = analysis.rows.find((item) => item.present === currentState);
    if (!row) return;

    const nextState = row.next[inputCombo];
    const presentBits = analysis.stateMap.get(currentState);
    const nextBits = analysis.stateMap.get(nextState);
    const output = outputForTransition(row, inputCombo, analysis.modelType);
    const ffInputs = getTraceFlipFlopInputs(analysis, presentBits, nextBits, inputCombo);

    trace.push({
      cycle: `C${cycle + 1}`,
      cycleIndex: cycle + 1,
      clock: `C${cycle + 1} &uarr;`,
      inputCombo,
      presentState: currentState,
      presentBits,
      nextState,
      nextBits,
      output,
      ffInputs,
    });
    currentState = nextState;
  });

  return trace;
}

function getTraceFlipFlopInputs(analysis, presentBits, nextBits, inputCombo) {
  const assignments = makeTraceAssignments(analysis, presentBits, inputCombo);
  const equationValues = analysis.equations
    .filter((equation) => equation.role === "ff")
    .map((equation) => ({
      name: equation.name,
      value: evaluateSopExpression(equation.expression, assignments, equation.vars),
    }));

  if (equationValues.length) {
    return equationValues;
  }

  const values = [];
  stateVarNames(analysis.stateBits).forEach((qName, bit) => {
    const qIndex = qName.slice(1);
    const q = presentBits[bit];
    const qNext = nextBits[bit];

    if (analysis.ffType === "jk") {
      const jk = jkExcitation(q, qNext);
      values.push({ name: `J${qIndex}`, value: jk.j }, { name: `K${qIndex}`, value: jk.k });
    } else if (analysis.ffType === "t") {
      values.push({ name: `T${qIndex}`, value: q === qNext ? "0" : "1" });
    } else if (analysis.ffType === "d") {
      values.push({ name: `D${qIndex}`, value: qNext });
    } else if (analysis.ffType === "sr") {
      const sr = srExcitation(q, qNext);
      values.push({ name: `S${qIndex}`, value: sr.s }, { name: `R${qIndex}`, value: sr.r });
    }
  });
  return values;
}

function makeTraceAssignments(analysis, presentBits, inputCombo) {
  const assignments = {};
  stateVarNames(analysis.stateBits).forEach((name, index) => {
    assignments[name] = presentBits[index] ?? "0";
  });
  analysis.inputVariables.forEach((name, index) => {
    assignments[name] = inputCombo[index] ?? "0";
  });
  return assignments;
}

function evaluateSopExpression(expression, assignments, vars) {
  const parsed = parseSopExpression(expression, vars);
  if (parsed.constant === "1") return "1";
  if (parsed.constant === "0") return "0";
  if (!parsed.terms.length) return "0";

  return parsed.terms.some((term) => {
    if (!term.length) return true;
    return term.every((literal) => {
      const value = assignments[literal.base] ?? "0";
      return literal.inverted ? value !== "1" : value === "1";
    });
  })
    ? "1"
    : "0";
}

function jkExcitation(q, qNext) {
  if (q === "0" && qNext === "0") return { j: "0", k: "X" };
  if (q === "0" && qNext === "1") return { j: "1", k: "X" };
  if (q === "1" && qNext === "0") return { j: "X", k: "1" };
  return { j: "X", k: "0" };
}

function srExcitation(q, qNext) {
  if (q === "0" && qNext === "0") return { s: "0", r: "X" };
  if (q === "0" && qNext === "1") return { s: "1", r: "0" };
  if (q === "1" && qNext === "0") return { s: "0", r: "1" };
  return { s: "X", r: "0" };
}

function outputForTransition(row, inputCombo, modelType) {
  if (modelType === "moore") return row.out.moore;
  return row.out[inputCombo];
}

function mooreOutputForState(analysis, state) {
  return analysis.rows.find((row) => row.present === state)?.out.moore ?? "0".repeat(analysis.outputVariables.length);
}

function renderTimingTrace(trace, analysis) {
  const inputNames = trace[0]?.ffInputs.map((input) => input.name) || getTraceInputNames(analysis.ffType, analysis.stateBits);
  const baseHeaders = ["Cycle", "CLK &uarr;", inputBusLabel(analysis.inputVariables), "Present State", "State Bits", "Next State", "Next Bits", outputBusLabel(analysis.outputVariables)];
  els.timingTraceHead.innerHTML = `
    <tr>
      ${[...baseHeaders, ...inputNames].map((header) => `<th>${header}</th>`).join("")}
    </tr>
  `;

  if (!trace.length) {
    els.timingTraceBody.innerHTML = `<tr><td class="trace-empty" colspan="${baseHeaders.length + inputNames.length}">No timing cycles to display.</td></tr>`;
    return;
  }

  const initialOutput = analysis.modelType === "moore" ? mooreOutputForState(analysis, trace[0].presentState) : trace[0].output;
  const initialCells = inputNames.map(() => `<td class="mono">-</td>`).join("");
  const initialRow = `
    <tr>
      <td class="mono">C0</td>
      <td class="mono">Initial</td>
      <td class="mono">${trace[0].inputCombo}</td>
      <td>${trace[0].presentState}</td>
      <td class="mono">${trace[0].presentBits}</td>
      <td>-</td>
      <td class="mono">-</td>
      <td class="mono">${initialOutput}</td>
      ${initialCells}
    </tr>
  `;

  els.timingTraceBody.innerHTML = initialRow + trace
    .map((step) => {
      const ffCells = inputNames.map((name) => {
        const found = step.ffInputs.find((input) => input.name === name);
        return `<td class="mono">${found?.value ?? ""}</td>`;
      });
      return `
        <tr>
          <td class="mono">${step.cycle}</td>
          <td class="mono">${step.clock}</td>
          <td class="mono">${step.inputCombo}</td>
          <td>${step.presentState}</td>
          <td class="mono">${step.presentBits}</td>
          <td>${step.nextState}</td>
          <td class="mono">${step.nextBits}</td>
          <td class="mono">${step.output}</td>
          ${ffCells.join("")}
        </tr>
      `;
    })
    .join("");
}

function getTraceInputNames(ffType, stateBits) {
  return stateVarNames(stateBits).flatMap((qName) => getFlipFlopInputLabels(ffType, qName.slice(1)));
}

function renderTimingDiagram(trace, analysis) {
  els.timingDiagramEmpty.hidden = true;
  const svg = els.timingDiagramSvg;
  svg.innerHTML = "";

  if (!trace.length) {
    els.timingDiagramEmpty.hidden = false;
    return;
  }

  const propagationDelay = 12;
  const combinationalDelay = 8;
  const qNames = stateVarNames(analysis.stateBits);
  const inputSignals = analysis.inputVariables.map((name, index) => ({
    name,
    values: trace.map((step) => step.inputCombo[index]),
    kind: "input",
  }));
  const ffInputNames = trace[0]?.ffInputs.map((input) => input.name) || getTraceInputNames(analysis.ffType, analysis.stateBits);
  const ffInputSignals = ffInputNames.map((name) => ({
    name,
    values: trace.map((step) => step.ffInputs.find((input) => input.name === name)?.value ?? "0"),
    kind: "ff-input",
  }));
  const initialMooreOutput = mooreOutputForState(analysis, trace[0].presentState);
  const outputSignals = analysis.outputVariables.map((name, index) => {
    if (analysis.modelType === "moore") {
      return {
        name,
        values: [initialMooreOutput[index], ...trace.map((step) => mooreOutputForState(analysis, step.nextState)[index] ?? "0")],
        kind: "moore-output",
      };
    }
    return {
      name,
      values: trace.map((step) => step.output[index]),
      kind: "mealy-output",
    };
  });
  const signals = [
    { name: "CLK", values: [], kind: "clock" },
    ...inputSignals,
    ...ffInputSignals,
    ...qNames.map((qName, index) => ({
      name: qName,
      values: [trace[0].presentBits[index], ...trace.map((step) => step.nextBits[index])],
      kind: "state",
    })),
    ...outputSignals,
  ];

  const cycleWidth = 96;
  const left = 72;
  const topMargin = 56;
  const waveTop = 86;
  const rowHeight = 44;
  const amplitude = 16;
  const cycleCount = Math.max(trace.length, 1);
  const endX = left + cycleCount * cycleWidth + cycleWidth / 2;
  const width = Math.max(760, endX + 70);
  const height = waveTop + signals.length * rowHeight + 44;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  for (let i = 0; i <= trace.length; i += 1) {
    const x = left + i * cycleWidth;
    svg.append(svgEl("line", { class: "wave-edge", x1: x, y1: topMargin - 14, x2: x, y2: height - 20 }));
    svg.append(svgText(`C${i}`, x, 24, { class: "cycle-label", "text-anchor": "middle" }));
  }

  signals.forEach((signal, index) => {
    const baseY = waveTop + index * rowHeight;
    svg.append(svgText(signal.name, 14, baseY + 7, { class: "wave-label" }));
    svg.append(svgEl("line", { class: "wave-axis", x1: left, y1: baseY, x2: width - 35, y2: baseY }));
    if (signal.kind === "clock") {
      svg.append(svgEl("path", { class: "wave-line clock", d: clockWavePath(left, baseY, trace.length, cycleWidth, amplitude) }));
    } else if (signal.kind === "state") {
      svg.append(svgEl("path", { class: "wave-line", d: delayedStepWavePath(signal.values, left, baseY, trace.length, cycleWidth, amplitude, propagationDelay, endX) }));
    } else if (signal.kind === "ff-input") {
      svg.append(svgEl("path", { class: "wave-line ff-input", d: mealyOutputWavePath(signal.values, trace, left, baseY, trace.length, cycleWidth, amplitude, propagationDelay, combinationalDelay, endX) }));
    } else if (signal.kind === "moore-output") {
      svg.append(svgEl("path", { class: "wave-line", d: delayedStepWavePath(signal.values, left, baseY, trace.length, cycleWidth, amplitude, propagationDelay + combinationalDelay, endX) }));
    } else if (signal.kind === "mealy-output") {
      svg.append(svgEl("path", { class: "wave-line", d: mealyOutputWavePath(signal.values, trace, left, baseY, trace.length, cycleWidth, amplitude, propagationDelay, combinationalDelay, endX) }));
    } else {
      svg.append(svgEl("path", { class: "wave-line", d: signalWavePath(signal.values, left, baseY, trace.length, cycleWidth, amplitude) }));
    }
  });
}

function signalWavePath(values, left, baseY, cycles, cycleWidth, amplitude) {
  if (!cycles) return "";
  const valueAt = (value) => (value === "1" ? baseY - amplitude : baseY + amplitude);
  const series = values.length === cycles ? [...values, values.at(-1)] : values;
  let path = `M ${left} ${valueAt(series[0])}`;

  for (let i = 0; i < cycles; i += 1) {
    const nextX = left + (i + 1) * cycleWidth;
    const currentY = valueAt(series[i]);
    const nextY = valueAt(series[i + 1] ?? series[i]);
    path += ` L ${nextX} ${currentY} L ${nextX} ${nextY}`;
  }

  return path;
}

function clockWavePath(left, baseY, cycles, cycleWidth, amplitude) {
  if (!cycles) return "";
  const low = baseY + amplitude;
  const high = baseY - amplitude;
  let path = `M ${left} ${low}`;
  for (let i = 1; i <= cycles; i += 1) {
    const riseX = left + i * cycleWidth;
    const fallX = riseX + cycleWidth / 2;
    path += ` L ${riseX} ${low} L ${riseX} ${high} L ${fallX} ${high} L ${fallX} ${low}`;
  }
  return path;
}

function delayedStepWavePath(values, left, baseY, cycles, cycleWidth, amplitude, delay, endX) {
  if (!cycles || !values.length) return "";
  const valueAt = (value) => (value === "1" ? baseY - amplitude : baseY + amplitude);
  let currentValue = values[0] ?? "0";
  let currentY = valueAt(currentValue);
  let path = `M ${left} ${currentY}`;

  for (let i = 1; i < values.length && i <= cycles; i += 1) {
    const nextValue = values[i] ?? currentValue;
    const nextY = valueAt(nextValue);
    const changeX = left + i * cycleWidth + delay;
    path += ` L ${changeX} ${currentY}`;
    if (nextY !== currentY) {
      path += ` L ${changeX} ${nextY}`;
    }
    currentValue = nextValue;
    currentY = nextY;
  }

  return `${path} L ${endX} ${currentY}`;
}

function mealyOutputWavePath(values, trace, left, baseY, cycles, cycleWidth, amplitude, propagationDelay, combinationalDelay, endX) {
  if (!cycles || !values.length) return "";
  const valueAt = (value) => (value === "1" ? baseY - amplitude : baseY + amplitude);
  let currentValue = values[0] ?? "0";
  let currentY = valueAt(currentValue);
  let path = `M ${left} ${currentY}`;

  for (let i = 1; i < values.length && i < cycles; i += 1) {
    const previous = trace[i - 1];
    const current = trace[i];
    const stateChanged = previous?.presentBits !== current?.presentBits;
    const delay = stateChanged ? propagationDelay + combinationalDelay : combinationalDelay;
    const nextValue = values[i] ?? currentValue;
    const nextY = valueAt(nextValue);
    const changeX = left + i * cycleWidth + delay;
    path += ` L ${changeX} ${currentY}`;
    if (nextY !== currentY) {
      path += ` L ${changeX} ${nextY}`;
    }
    currentValue = nextValue;
    currentY = nextY;
  }

  return `${path} L ${endX} ${currentY}`;
}

function renderCircuitDiagram(analysis) {
  els.diagramEmpty.hidden = true;
  const graph = buildCircuitGraph(analysis);
  const svg = els.circuitSvg;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${graph.width} ${graph.height}`);
  svg.dataset.validationIssues = JSON.stringify(graph.validation?.issues || []);

  const defs = svgEl("defs");
  const marker = svgEl("marker", {
    id: "arrow",
    markerWidth: 10,
    markerHeight: 10,
    refX: 8,
    refY: 3,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  marker.append(svgEl("path", { d: "M0,0 L0,6 L9,3 z", fill: "#64748b" }));
  defs.append(marker);
  svg.append(defs);

  const viewport = svgEl("g", { id: "diagramViewport" });
  svg.append(viewport);

  (graph.buses || []).forEach((bus) => drawCircuitBus(viewport, bus));
  (graph.wires || []).forEach((wire) => drawCircuitWire(viewport, wire));
  (graph.junctions || []).forEach((junction) => {
    viewport.append(svgEl("circle", { class: "junction-dot", cx: junction.x, cy: junction.y, r: 2.7, "data-signal": junction.signal || "" }));
  });
  graph.nodes.forEach((node) => drawCircuitNode(viewport, node));

  applyDiagramTransform();
}

function buildCircuitGraph(analysis) {
  const ffEquations = analysis.equations.filter((equation) => equation.role === "ff");
  const outputEquations = analysis.equations.filter((equation) => equation.role === "output");
  const qNames = stateVarNames(analysis.stateBits);
  const baseSignals = [...analysis.inputVariables, ...qNames];
  const parsedEquations = new Map(
    [...ffEquations, ...outputEquations].map((equation) => [equation.name, parseSopExpression(equation.expression, baseSignals)]),
  );
  const invertedSignals = new Set();
  let needsVcc = false;
  let needsGnd = false;

  parsedEquations.forEach((parsed) => {
    if (parsed.constant === "1") needsVcc = true;
    if (parsed.constant === "0") needsGnd = true;
    parsed.terms.forEach((term) => {
      if (!term.length) needsVcc = true;
      term.forEach((literal) => {
        if (literal.inverted) invertedSignals.add(literal.base);
      });
    });
  });

  const nodes = [];
  const wires = [];
  const buses = [];
  const signalRows = new Map();
  const tapCounts = new Map();
  let ffInputBypassCount = 0;
  const verticalLaneReservations = [];
  const horizontalLaneReservations = [];
  const laneOrderByFamily = { input: 0, feedback: 0, inverted: 0, constant: 0 };
  const inputX = 80;
  const busX = 160;
  const notGateX = 280;
  const andGateX = 480;
  const orGateX = 650;
  const flipFlopX = 820;
  const outputX = 1100;
  const signalX1 = busX;
  const signalX2 = andGateX - 24;
  const signalTop = 90;
  const busLaneGap = 56;
  const verticalWireGap = 28;
  const horizontalWireGap = 32;
  const tapWrapOffset = 16;
  const signalSpacing = busLaneGap;
  const branchGap = verticalWireGap;
  const notX = notGateX;
  const notW = 44;
  const notH = 28;
  const invertedSignalX1 = notX + notW + 68;
  let signalRowIndex = 0;

  const allocateVerticalLane = (signal, preferredX, startY, endY, options = {}) => {
    const laneGap = options.gap || verticalWireGap;
    const minX = options.minX ?? signalX1 + 54;
    const maxX = options.maxX ?? signalX2 - Math.max(18, verticalWireGap / 2);
    const laneMinX = Math.min(minX, maxX);
    const laneMaxX = Math.max(minX, maxX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    const candidates = [];

    for (let offset = 0; offset <= 8; offset += 1) {
      if (offset === 0) {
        candidates.push(preferredX);
      } else {
        candidates.push(preferredX + offset * laneGap);
        candidates.push(preferredX - offset * laneGap);
      }
    }

    const seenCandidates = new Set();
    const normalizedCandidates = candidates
      .map((candidate) => Math.max(laneMinX, Math.min(laneMaxX, candidate)))
      .filter((candidate) => {
        const key = Math.round(candidate * 10) / 10;
        if (seenCandidates.has(key)) return false;
        seenCandidates.add(key);
        return true;
      });

    const laneConflicts = (candidate) =>
      verticalLaneReservations.some(
        (reservation) =>
          !sameCircuitSignal(reservation.signal, signal) &&
          Math.abs(reservation.x - candidate) < laneGap &&
          rangeOverlapLength(reservation.minY, reservation.maxY, minY, maxY) > 0.5,
      );

    const laneX = normalizedCandidates.find((candidate) => !laneConflicts(candidate)) ?? normalizedCandidates[0] ?? preferredX;
    verticalLaneReservations.push({ signal, x: laneX, minY, maxY });
    return laneX;
  };

  const allocateHorizontalLane = (signal, preferredY, startX, endX, options = {}) => {
    const laneGap = options.gap || horizontalWireGap;
    const minYLimit = options.minY ?? signalTop;
    const maxYLimit = options.maxY ?? preferredY + laneGap * 8;
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const candidates = [];

    for (let offset = 0; offset <= 8; offset += 1) {
      if (offset === 0) {
        candidates.push(preferredY);
      } else {
        candidates.push(preferredY + offset * laneGap);
        candidates.push(preferredY - offset * laneGap);
      }
    }

    const seenCandidates = new Set();
    const normalizedCandidates = candidates
      .map((candidate) => Math.max(minYLimit, Math.min(maxYLimit, candidate)))
      .filter((candidate) => {
        const key = Math.round(candidate * 10) / 10;
        if (seenCandidates.has(key)) return false;
        seenCandidates.add(key);
        return true;
      });

    const laneConflicts = (candidate) =>
      horizontalLaneReservations.some(
        (reservation) =>
          !sameCircuitSignal(reservation.signal, signal) &&
          Math.abs(reservation.y - candidate) < laneGap &&
          rangeOverlapLength(reservation.minX, reservation.maxX, minX, maxX) > 0.5,
      );

    const laneY = normalizedCandidates.find((candidate) => !laneConflicts(candidate)) ?? normalizedCandidates[0] ?? preferredY;
    horizontalLaneReservations.push({ signal, y: laneY, minX, maxX });
    return laneY;
  };

  const routeManhattanWire = (start, end, options = {}) => {
    const signal = options.signal || options.kind || "wire";
    if (Number.isFinite(options.laneY)) {
      const laneY = allocateHorizontalLane(signal, options.laneY, start.x, end.x, options.horizontalLane || {});
      return compactManhattanPoints([start, { x: start.x, y: laneY }, { x: end.x, y: laneY }, end]);
    }

    const preferredLaneX = Number.isFinite(options.laneX) ? options.laneX : start.x + Math.max(verticalWireGap, (end.x - start.x) / 2);
    const laneX = Number.isFinite(options.laneX)
      ? options.laneX
      : allocateVerticalLane(signal, preferredLaneX, start.y, end.y, options.verticalLane || {});
    return compactManhattanPoints([start, { x: laneX, y: start.y }, { x: laneX, y: end.y }, end]);
  };

  const addSignalRow = (signal, label, kind = "signal", x1 = signalX1) => {
    const rowIndex = signalRowIndex;
    const labelGap = kind === "inverted" ? 44 : 38;
    const laneFamily = kind === "inverted" ? "inverted" : kind === "constant" ? "constant" : kind.startsWith("feedback") ? "feedback" : "input";
    const laneOrder = laneOrderByFamily[laneFamily] || 0;
    laneOrderByFamily[laneFamily] = laneOrder + 1;
    const row = {
      signal,
      label,
      kind,
      laneFamily,
      laneOrder,
      x1,
      x2: signalX2,
      y: signalTop + rowIndex * signalSpacing,
      labelX: kind === "inverted" ? x1 - labelGap : inputX,
      branchStart: (kind === "inverted" ? x1 + 42 : Math.max(x1 + 72, notX + notW + 54)) + (rowIndex % 5) * 9,
      branchGap,
      rowIndex,
    };
    signalRows.set(signal, row);
    buses.push(row);
    signalRowIndex += 1;
    return row;
  };

  const primaryLaneForRow = (row) => {
    const tapMargin = Math.max(18, verticalWireGap / 2);
    if (row.kind === "inverted") {
      return Math.min(row.x2, row.x1 + 8 + row.laneOrder * verticalWireGap);
    }
    if (row.kind === "constant") {
      return Math.min(row.x2 - tapMargin, row.x1 + 72 + row.laneOrder * verticalWireGap);
    }
    if (row.kind.startsWith("feedback")) {
      const feedbackLaneXs = [notX + notW + 24, notX + notW + 48, notX + notW + 104, notX + notW + 132];
      return Math.min(row.x2, feedbackLaneXs[row.laneOrder] ?? notX + notW + 132);
    }
    return Math.min(notX - verticalWireGap, row.x1 + 36 + row.laneOrder * verticalWireGap);
  };

  analysis.inputVariables.forEach((name) => {
    addSignalRow(name, name, "input");
  });

  qNames.forEach((name) => {
    addSignalRow(name, name, "feedback");
    addSignalRow(`${name}'`, `${name}'`, "feedback-complement");
  });

  analysis.inputVariables.forEach((name) => {
    if (invertedSignals.has(name)) addSignalRow(`${name}'`, `${name}'`, "inverted", invertedSignalX1);
  });

  if (needsVcc) addSignalRow("1", "", "constant");
  if (needsGnd) addSignalRow("0", "GND", "constant");

  const ffX = flipFlopX;
  const ffW = 170;
  const ffH = 110;
  const ffGap = 84;
  const ffStartY = Math.max(260, signalTop + signalRowIndex * signalSpacing + 96);
  const ffNodes = qNames.map((qName, index) => {
    const inputLabels = getFlipFlopInputLabels(analysis.ffType, qName.slice(1));
    const ports = [
      ...makeSidePorts(inputLabels, "left", ffH),
      { side: "bottom", offset: 0, label: "CLK" },
      ...makeSidePorts([qName, `${qName}'`], "right", ffH),
    ];
    return {
      id: `ff-${qName}`,
      type: "ff",
      title: `${qName} ${analysis.ffType.toUpperCase()} FF`,
      subtitle: inputLabels.join(" / "),
      x: ffX,
      y: ffStartY + index * (ffH + ffGap),
      w: ffW,
      h: ffH,
      ports,
    };
  });
  nodes.push(...ffNodes);

  const outputNodeHeight = Math.max(82, analysis.outputVariables.length * 28 + 44);
  const outputNodeY = ffStartY + ffNodes.length * (ffH + ffGap) + 52;
  const outputNode = {
    id: "outputY",
    type: "output",
    title: `Output ${outputBusLabel(analysis.outputVariables)}`,
    subtitle: "Circuit response",
    x: outputX,
    y: outputNodeY,
    w: 130,
    h: outputNodeHeight,
    ports: makeSidePorts(analysis.outputVariables, "left", outputNodeHeight),
  };
  nodes.push(outputNode);

  signalRows.forEach((row) => {
    if (row.kind !== "inverted") return;
    const baseRow = signalRows.get(literalBase(row.signal));
    if (!baseRow) return;
    const node = {
      id: `not-${literalBase(row.signal)}`,
      type: "not",
      title: "NOT",
      x: notX,
      y: row.y - notH / 2,
      w: notW,
      h: notH,
      ports: [
        { side: "left", offset: 0, label: literalBase(row.signal) },
        { side: "right", offset: 0, label: row.signal },
      ],
    };
    nodes.push(node);
    const inputPoint = anchor(node, "left", 0);
    const outputPoint = anchor(node, "right", 0);
    const preferredTapX = primaryLaneForRow(baseRow);
    const tapX = allocateVerticalLane(baseRow.signal, preferredTapX, baseRow.y, inputPoint.y, {
      minX: baseRow.x1 + 36,
      maxX: notX - verticalWireGap,
      gap: verticalWireGap,
    });
    wires.push({
      kind: "branch",
      signal: baseRow.signal,
      branchSignal: baseRow.signal,
      allowKeepOutIds: [node.id],
      branchPoint: { x: tapX, y: baseRow.y },
      points: [
        { x: tapX, y: baseRow.y },
        { x: tapX, y: inputPoint.y },
        inputPoint,
      ],
    });
    wires.push({
      kind: "branch",
      signal: row.signal,
      allowKeepOutIds: [node.id],
      points: [outputPoint, { x: row.x1, y: row.y }],
    });
  });

  const connectSignalToPoint = (signal, end, kind = "branch", options = {}) => {
    const row = signalRows.get(signal);
    if (!row) return;
    const { routeBelowLogic = false, ...wireOptions } = options;
    const count = tapCounts.get(signal) || 0;
    const tapMargin = Math.max(18, verticalWireGap / 2);
    const preferredTapX = primaryLaneForRow(row) + Math.floor(count / 6) * tapWrapOffset;
    const branchLaneMinX = row.kind === "inverted" ? row.x1 : row.kind.startsWith("feedback") ? notX + notW + 24 : row.x1 + 36;
    const branchLaneMaxX = row.kind === "inverted" || row.kind.startsWith("feedback") ? row.x2 : notX - verticalWireGap;
    const branchLaneGap = row.kind.startsWith("feedback") ? 24 : verticalWireGap;
    const tapX = allocateVerticalLane(signal, preferredTapX, row.y, end.y, {
      minX: branchLaneMinX,
      maxX: branchLaneMaxX,
      gap: branchLaneGap,
    });
    tapCounts.set(signal, count + 1);
    const branchStartPoint = { x: tapX, y: row.y };
    const targetIsFlipFlopInput = ffNodes.some(
      (node) => Math.abs(end.x - node.x) <= 0.5 && end.y >= node.y - horizontalWireGap && end.y <= node.y + node.h + horizontalWireGap,
    );
    const shouldRouteBelow = routeBelowLogic || targetIsFlipFlopInput;
    let routeBelowApproachX = null;
    const routePoints = shouldRouteBelow
      ? (() => {
        const ffBottom = Math.max(...ffNodes.map((node) => node.y + node.h));
        const logicNodes = nodes.filter((node) => node.type === "and" || node.type === "or" || node.type === "not");
        const logicBottom = logicNodes.length ? Math.max(...logicNodes.map((node) => node.y + node.h + 20)) : ffBottom;
        const belowOutputY = outputNode.y + outputNode.h + 24;
        const preferredBypassY = Math.max(end.y + 64, ffBottom + 36, logicBottom + horizontalWireGap, belowOutputY);
        const bypassY = allocateHorizontalLane(signal, preferredBypassY, tapX, end.x, {
          minY: Math.max(end.y + horizontalWireGap, logicBottom + 12, belowOutputY),
          maxY: belowOutputY + horizontalWireGap * 5,
          gap: horizontalWireGap,
        });
        const approachPreferredX = ffX - 78 + (ffInputBypassCount % 2) * 56;
        ffInputBypassCount += 1;
        routeBelowApproachX = allocateVerticalLane(signal, approachPreferredX, bypassY, end.y, {
          minX: ffX - 78,
          maxX: ffX - 22,
          gap: verticalWireGap,
        });
        return [branchStartPoint, { x: tapX, y: bypassY }, { x: routeBelowApproachX, y: bypassY }, { x: routeBelowApproachX, y: end.y }, end];
      })()
      : [branchStartPoint, { x: tapX, y: end.y }, end];
    wires.push({
      kind,
      signal,
      branchSignal: signal,
      branchPoint: branchStartPoint,
      routeBelowLogic: shouldRouteBelow,
      routeBelowY: routePoints.length > 3 ? routePoints[1].y : null,
      routeBelowApproachX,
      ...wireOptions,
      points: compactManhattanPoints(routePoints),
    });
  };

  const addWire = (start, end, kind = "branch", laneX = null, options = {}) => {
    wires.push({
      kind,
      ...options,
      points: routeManhattanWire(start, end, { ...options, kind, laneX, verticalLane: { minX: andGateX + 70, maxX: ffX - 36, gap: verticalWireGap } }),
    });
  };

  const addGateNode = (node) => {
    nodes.push(node);
    return node;
  };

  const keepOutAccess = (...ids) => ({ allowKeepOutIds: unique(ids.filter(Boolean)) });

  const ffEquationLayouts = layoutEquationGroups(
    ffEquations,
    (equation) => {
      const targetIndex = equation.name.replace(/^[A-Z]/, "");
      const ffNode = nodes.find((node) => node.id === `ff-Q${targetIndex}`);
      return anchor(ffNode, "left", getNodePortOffset(nodes, ffNode.id, equation.name)).y;
    },
    parsedEquations,
    ffStartY - 36,
  );
  const ffLogicBottom = Math.max(
    ...Array.from(ffEquationLayouts.values(), (layout) => layout.centerY + layout.height / 2),
    ffStartY + ffNodes.length * (ffH + ffGap),
  );
  outputNode.y = Math.max(outputNode.y, ffLogicBottom + 128);
  const outputEquationLayouts = layoutEquationGroups(
    outputEquations,
    (equation) => anchor(outputNode, "left", getNodePortOffset(nodes, outputNode.id, equation.name)).y,
    parsedEquations,
    outputNode.y,
  );

  const buildEquationNetwork = (equation, target, area) => {
    const parsed = parsedEquations.get(equation.name);
    if (!parsed) return;
    const networkY = area.centerY ?? target.point.y;
    const targetAccessId = target.keepOutId || null;

    if (parsed.constant) {
      connectSignalToPoint(parsed.constant, target.point, parsed.constant === "1" ? "constant" : "ground", keepOutAccess(targetAccessId));
      return;
    }

    if (parsed.terms.length === 1) {
      const term = parsed.terms[0];
      if (term.length === 0) {
        connectSignalToPoint("1", target.point, "constant");
        return;
      }
      if (term.length === 1) {
        connectSignalToPoint(term[0].signal, target.point, "branch", {
          ...keepOutAccess(targetAccessId),
          routeBelowLogic: Boolean(targetAccessId),
        });
        return;
      }

      const andNode = addAndGate(`${equation.name}-and`, area.andX, networkY, term, addGateNode);
      const andKeepOutAccess = { allowKeepOutIds: [andNode.id] };
      const andToTargetKeepOutAccess = keepOutAccess(andNode.id, targetAccessId);
      term.forEach((literal, index) =>
        connectSignalToPoint(literal.signal, anchor(andNode, "left", andNode.ports[index].offset), "branch", andKeepOutAccess),
      );
      addWire(anchor(andNode, "right", 0), target.point, "gate-output", null, { ...andToTargetKeepOutAccess, signal: equation.name });
      return;
    }

    const termPitch = area.termPitch || estimateEquationTermPitch(parsed);
    const orNode = addOrGate(`${equation.name}-or`, area.orX, networkY, parsed.terms, addGateNode, termPitch);
    const orKeepOutAccess = { allowKeepOutIds: [orNode.id] };
    const orToTargetKeepOutAccess = keepOutAccess(orNode.id, targetAccessId);
    parsed.terms.forEach((term, termIndex) => {
      const orInput = anchor(orNode, "left", orNode.ports[termIndex].offset);
      if (term.length === 0) {
        connectSignalToPoint("1", orInput, "constant", orKeepOutAccess);
      } else if (term.length === 1) {
        connectSignalToPoint(term[0].signal, orInput, "branch", orKeepOutAccess);
      } else {
        const termY = orInput.y;
        const andNode = addAndGate(`${equation.name}-and-${termIndex + 1}`, area.andX, termY, term, addGateNode);
        const andKeepOutAccess = { allowKeepOutIds: [andNode.id] };
        const andToOrKeepOutAccess = { allowKeepOutIds: [andNode.id, orNode.id] };
        term.forEach((literal, literalIndex) =>
          connectSignalToPoint(literal.signal, anchor(andNode, "left", andNode.ports[literalIndex].offset), "branch", andKeepOutAccess),
        );
        addWire(anchor(andNode, "right", 0), orInput, "gate-output", area.orX - 56 - termIndex * verticalWireGap, {
          ...andToOrKeepOutAccess,
          signal: `${equation.name}:term-${termIndex + 1}`,
        });
      }
    });
    addWire(anchor(orNode, "right", 0), target.point, "gate-output", null, { ...orToTargetKeepOutAccess, signal: equation.name });
  };

  ffEquations.forEach((equation) => {
    const targetIndex = equation.name.replace(/^[A-Z]/, "");
    const ffNode = nodes.find((node) => node.id === `ff-Q${targetIndex}`);
    const target = {
      point: anchor(ffNode, "left", getNodePortOffset(nodes, ffNode.id, equation.name)),
      keepOutId: ffNode.id,
    };
    const layout = ffEquationLayouts.get(equation.name);
    buildEquationNetwork(equation, target, { andX: andGateX, orX: orGateX, centerY: layout.centerY, termPitch: layout.termPitch });
  });

  outputEquations.forEach((equation) => {
    const target = {
      point: anchor(outputNode, "left", getNodePortOffset(nodes, outputNode.id, equation.name)),
    };
    const layout = outputEquationLayouts.get(equation.name);
    buildEquationNetwork(equation, target, { andX: andGateX, orX: orGateX, centerY: layout.centerY, termPitch: layout.termPitch });
  });

  const lastFfBottom = Math.max(...ffNodes.map((node) => node.y + node.h));
  const diagramBodyBottom = Math.max(lastFfBottom, outputNode.y + outputNode.h);
  const clockTapStartX = ffX + ffW + 36;
  const clockBusX2 = clockTapStartX + (ffNodes.length - 1) * verticalWireGap + 28;
  const clockY = diagramBodyBottom + 320;
  buses.push({ signal: "CLK", label: "CLK", kind: "clock", x1: signalX1, x2: clockBusX2, y: clockY });
  ffNodes.forEach((node, index) => {
    const clockPoint = anchor(node, "bottom", 0);
    const tapX = clockTapStartX + index * verticalWireGap;
    const laneY = allocateHorizontalLane("CLK", node.y + node.h + 36, tapX, clockPoint.x, {
      minY: node.y + node.h + 28,
      maxY: clockY - horizontalWireGap,
      gap: horizontalWireGap,
    });
    wires.push({
      kind: "clock",
      signal: "CLK",
      branchSignal: "CLK",
      branchPoint: { x: tapX, y: clockY },
      ...keepOutAccess(node.id),
      points: [
        { x: tapX, y: clockY },
        { x: tapX, y: laneY },
        { x: clockPoint.x, y: laneY },
        clockPoint,
      ],
    });
  });

  const feedbackLaneStart = ffX + ffW + 64;
  const feedbackLaneGap = 72;
  const feedbackOutputSignals = qNames.flatMap((qName) => [qName, `${qName}'`]);
  feedbackOutputSignals.forEach((signal, index) => {
    const row = signalRows.get(signal);
    const qName = literalBase(signal);
    const ffNode = nodes.find((node) => node.id === `ff-${qName}`);
    if (!row || !ffNode) return;
    const start = anchor(ffNode, "right", getNodePortOffset(nodes, ffNode.id, signal));
    const busEntry = { x: row.x2, y: row.y };
    const laneX = feedbackLaneStart + index * feedbackLaneGap;
    wires.push({
      kind: "feedback",
      signal,
      branchSignal: signal,
      ...keepOutAccess(ffNode.id),
      branchPoint: busEntry,
      points: compactManhattanPoints([
        start,
        { x: laneX, y: start.y },
        { x: laneX, y: busEntry.y },
        busEntry,
      ]),
    });
  });

  const gateKeepOutZones = nodes.filter((node) => node.type === "and" || node.type === "or" || node.type === "not" || node.type === "ff").map(makeGateKeepOutZone);
  const routedWires = assignWireLanes(wires, gateKeepOutZones);
  const junctions = buildCircuitJunctions(routedWires, buses);
  const validation = validateCircuitGraphConnections(nodes, routedWires, buses, junctions, gateKeepOutZones);
  if (validation.issues.length) {
    console.warn("Circuit diagram connection validation", validation.issues);
  }

  const maxNodeBottom = Math.max(...nodes.map((node) => node.y + node.h), outputNode.y + outputNode.h);
  const maxWireY = Math.max(...routedWires.flatMap((wire) => wire.points.map((point) => point.y)), 0);
  const maxWireX = Math.max(...routedWires.flatMap((wire) => wire.points.map((point) => point.x)), 0);
  const height = Math.max(680, maxNodeBottom + 70, maxWireY + 70);
  const width = Math.max(1600, maxWireX + 80);
  return { nodes, wires: routedWires, buses, junctions, width, height, validation };
}

function makeGateKeepOutZone(node) {
  const marginX = node.type === "ff" ? 18 : 20;
  const marginY = node.type === "ff" ? 18 : 20;
  return {
    id: node.id,
    type: node.type,
    x: node.x - marginX,
    y: node.y - marginY,
    w: node.w + marginX * 2,
    h: node.h + marginY * 2,
  };
}

function assignWireLanes(wires, keepOutZones) {
  return wires
    .map((wire, index) => sanitizeCircuitWire({ ...wire, points: routeWireAroundKeepOuts(wire, keepOutZones, index) }))
    .filter(hasRenderableWirePath);
}

function routeWireAroundKeepOuts(wire, keepOutZones, wireIndex) {
  const allowedIds = new Set(wire.allowKeepOutIds || []);
  let points = wire.points;
  let changed = true;
  let pass = 0;
  const maxPasses = Math.max(1, keepOutZones.length * 2);

  while (changed && pass < maxPasses) {
    changed = false;
    keepOutZones.forEach((zone, zoneIndex) => {
      if (allowedIds.has(zone.id) || !wireIntersectsKeepOut(points, zone)) {
        return;
      }
      const routed = routeWireAroundZone(points, zone, wireIndex + zoneIndex + pass, wire);
      if (!samePointList(points, routed)) {
        points = routed;
        changed = true;
      }
    });
    pass += 1;
  }

  return points;
}

function samePointList(a, b) {
  if (a.length !== b.length) return false;
  return a.every((point, index) => pointsEqual(point, b[index]));
}

function wireIntersectsKeepOut(points, zone) {
  return points.some((point, index) => index > 0 && segmentIntersectsRect(points[index - 1], point, zone));
}

function routeWireAroundZone(points, zone, wireIndex, wire = {}) {
  const start = points[0];
  const end = points[points.length - 1];
  const leftToRight = start.x <= end.x;
  const stagger = wireIndex % 5;
  const sideStagger = wireIndex % 3;
  const sideGap = 28;
  const beforeX = leftToRight ? zone.x - sideGap - sideStagger * 28 : zone.x + zone.w + sideGap + sideStagger * 28;
  const afterX = leftToRight ? zone.x + zone.w + sideGap + sideStagger * 28 : zone.x - sideGap - sideStagger * 28;
  const averageY = (start.y + end.y) / 2;
  const zoneCenterY = zone.y + zone.h / 2;
  const preferAbove = Math.abs(averageY - zoneCenterY) < 8 ? wireIndex % 2 === 0 : averageY < zoneCenterY;
  const laneOffset = 44 + stagger * 32;
  const laneY = preferAbove ? zone.y - laneOffset : zone.y + zone.h + laneOffset;

  if (wire.branchPoint && pointsEqual(start, wire.branchPoint)) {
    if (wire.routeBelowLogic) {
      const fallbackLaneY = zone.y + zone.h + 56 + (wireIndex % 4) * 32;
      const laneY = Math.max(Number.isFinite(wire.routeBelowY) ? wire.routeBelowY : fallbackLaneY, fallbackLaneY);
      const approachX = Number.isFinite(wire.routeBelowApproachX) ? wire.routeBelowApproachX : end.x;
      return compactManhattanPoints([
        start,
        { x: start.x, y: laneY },
        { x: approachX, y: laneY },
        { x: approachX, y: end.y },
        end,
      ]);
    }

    const branchSideGap = sideGap + signalLaneIndex(wire.signal || wire.kind) * 28;
    const exitX = leftToRight
      ? Math.min(start.x, zone.x - branchSideGap)
      : Math.max(start.x, zone.x + zone.w + branchSideGap);
    return compactManhattanPoints([
      start,
      { x: start.x, y: laneY },
      { x: exitX, y: laneY },
      { x: exitX, y: end.y },
      end,
    ]);
  }

  return compactManhattanPoints([
    start,
    { x: beforeX, y: start.y },
    { x: beforeX, y: laneY },
    { x: afterX, y: laneY },
    { x: afterX, y: end.y },
    end,
  ]);
}

function segmentIntersectsRect(a, b, rect) {
  if (pointInsideRect(a, rect) || pointInsideRect(b, rect)) return true;

  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const rectRight = rect.x + rect.w;
  const rectBottom = rect.y + rect.h;

  if (a.y === b.y) {
    return a.y >= rect.y && a.y <= rectBottom && maxX >= rect.x && minX <= rectRight;
  }

  if (a.x === b.x) {
    return a.x >= rect.x && a.x <= rectRight && maxY >= rect.y && minY <= rectBottom;
  }

  return maxX >= rect.x && minX <= rectRight && maxY >= rect.y && minY <= rectBottom;
}

function pointInsideRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function sanitizeCircuitWire(wire) {
  return {
    ...wire,
    points: compactManhattanPoints((wire.points || []).filter(isFinitePoint)),
  };
}

function hasRenderableWirePath(wire) {
  if (!wire.points || wire.points.length < 2) return false;
  return wire.points.some((point, index) => index > 0 && !pointsEqual(point, wire.points[index - 1]));
}

function buildCircuitJunctions(wires, buses) {
  const seen = new Set();
  const junctions = [];

  wires.forEach((wire) => {
    if (!wire.branchPoint || !hasRenderableWirePath(wire)) return;
    const point = wire.branchPoint;
    const bus = findBusAtPoint(point, buses, wire.branchSignal || wire.signal);
    if (!isFinitePoint(point) || !bus) return;
    if (!wireTouchesPoint(wire, point)) return;

    const key = `${bus.signal}:${pointKey(point)}`;
    if (seen.has(key)) return;
    seen.add(key);
    junctions.push({ ...point, signal: bus.signal });
  });

  return junctions;
}

function validateCircuitGraphConnections(nodes, wires, buses, junctions, keepOutZones = []) {
  const issues = [];

  junctions.forEach((junction) => {
    if (!findBusAtPoint(junction, buses, junction.signal)) {
      issues.push(`Junction ${pointKey(junction)} is not on its ${junction.signal || "unknown"} signal bus.`);
    }
    if (
      !wires.some(
        (wire) =>
          wire.branchPoint &&
          sameCircuitSignal(wire.branchSignal || wire.signal, junction.signal) &&
          pointsEqual(wire.branchPoint, junction) &&
          wireTouchesPoint(wire, junction),
      )
    ) {
      issues.push(`Junction ${pointKey(junction)} has no outgoing ${junction.signal || "unknown"} branch wire.`);
    }
  });

  nodes.forEach((node) => {
    (node.ports || []).forEach((port) => {
      if (!shouldValidateInputPort(node, port)) return;
      const point = anchor(node, port.side, port.offset || 0);
      if (!wires.some((wire) => wireEndpointTouchesPoint(wire, point))) {
        issues.push(`${node.id}:${port.label || port.side} input pin is not connected.`);
      }
    });
  });

  wires.forEach((wire, index) => {
    if (!hasRenderableWirePath(wire)) {
      issues.push(`Wire ${index} has no drawable path.`);
      return;
    }
    const start = wire.points[0];
    const end = wire.points[wire.points.length - 1];
    if (!isFinitePoint(start) || !isFinitePoint(end)) {
      issues.push(`Wire ${index} has an invalid endpoint.`);
    }
  });

  issues.push(...validateSignalIsolation(wires, buses));
  issues.push(...validateWireSpacing(wires, buses));
  issues.push(...validateKeepOutViolations(wires, keepOutZones));

  return { issues };
}

function shouldValidateInputPort(node, port) {
  if (node.type === "and" || node.type === "or" || node.type === "not" || node.type === "output") {
    return port.side === "left";
  }
  if (node.type === "ff") {
    return port.side === "left" || port.side === "bottom";
  }
  return false;
}

function validateSignalIsolation(wires, buses) {
  const issues = [];
  const segments = [];

  buses.forEach((bus) => {
    if (!bus.signal) return;
    segments.push({
      signal: bus.signal,
      label: `bus ${bus.signal}`,
      a: { x: bus.x1, y: bus.y },
      b: { x: bus.x2, y: bus.y },
    });
  });

  wires.forEach((wire, wireIndex) => {
    if (!wire.signal || !wire.points) return;
    wire.points.forEach((point, pointIndex) => {
      if (pointIndex === 0) return;
      const previous = wire.points[pointIndex - 1];
      if (pointsEqual(previous, point)) return;
      segments.push({
        signal: wire.signal,
        label: `wire ${wireIndex}`,
        a: previous,
        b: point,
      });
    });
  });

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i];
      const second = segments[j];
      if (sameCircuitSignal(first.signal, second.signal)) continue;
      if (!segmentsCoincidentlyOverlap(first, second)) continue;
      issues.push(`${first.signal} and ${second.signal} overlap on ${first.label} / ${second.label}.`);
      if (issues.length >= 12) return issues;
    }
  }

  return issues;
}

function validateWireSpacing(wires, buses) {
  const issues = [];
  const minWireDistance = 24;
  const segments = collectSignalSegments(wires, buses);

  for (let i = 0; i < segments.length; i += 1) {
    for (let j = i + 1; j < segments.length; j += 1) {
      const first = segments[i];
      const second = segments[j];
      if (sameCircuitSignal(first.signal, second.signal)) continue;
      const distance = parallelSegmentDistance(first, second);
      if (!Number.isFinite(distance) || distance >= minWireDistance || distance <= 0.5) continue;
      issues.push(`${first.signal} and ${second.signal} are only ${Math.round(distance)}px apart near ${first.label} / ${second.label}.`);
      if (issues.length >= 12) return issues;
    }
  }

  return issues;
}

function validateKeepOutViolations(wires, keepOutZones) {
  const issues = [];

  wires.forEach((wire, wireIndex) => {
    const allowedIds = new Set(wire.allowKeepOutIds || []);
    keepOutZones.forEach((zone) => {
      if (allowedIds.has(zone.id)) return;
      if (!wireIntersectsKeepOut(wire.points || [], zone)) return;
      issues.push(`${wire.signal || wire.kind || `wire ${wireIndex}`} crosses ${zone.id} keep-out.`);
    });
  });

  return issues.slice(0, 16);
}

function collectSignalSegments(wires, buses) {
  const segments = [];

  buses.forEach((bus) => {
    if (!bus.signal) return;
    segments.push({
      signal: bus.signal,
      label: `bus ${bus.signal}`,
      a: { x: bus.x1, y: bus.y },
      b: { x: bus.x2, y: bus.y },
    });
  });

  wires.forEach((wire, wireIndex) => {
    if (!wire.signal || !wire.points) return;
    wire.points.forEach((point, pointIndex) => {
      if (pointIndex === 0) return;
      const previous = wire.points[pointIndex - 1];
      if (pointsEqual(previous, point)) return;
      segments.push({
        signal: wire.signal,
        label: `wire ${wireIndex}`,
        a: previous,
        b: point,
      });
    });
  });

  return segments;
}

function parallelSegmentDistance(first, second) {
  const firstHorizontal = Math.abs(first.a.y - first.b.y) <= 0.5;
  const secondHorizontal = Math.abs(second.a.y - second.b.y) <= 0.5;
  const firstVertical = Math.abs(first.a.x - first.b.x) <= 0.5;
  const secondVertical = Math.abs(second.a.x - second.b.x) <= 0.5;

  if (firstHorizontal && secondHorizontal && rangeOverlapLength(first.a.x, first.b.x, second.a.x, second.b.x) > 0.5) {
    return Math.abs(first.a.y - second.a.y);
  }

  if (firstVertical && secondVertical && rangeOverlapLength(first.a.y, first.b.y, second.a.y, second.b.y) > 0.5) {
    return Math.abs(first.a.x - second.a.x);
  }

  return Number.POSITIVE_INFINITY;
}

function segmentsCoincidentlyOverlap(first, second) {
  const firstHorizontal = Math.abs(first.a.y - first.b.y) <= 0.5;
  const secondHorizontal = Math.abs(second.a.y - second.b.y) <= 0.5;
  const firstVertical = Math.abs(first.a.x - first.b.x) <= 0.5;
  const secondVertical = Math.abs(second.a.x - second.b.x) <= 0.5;

  if (firstHorizontal && secondHorizontal && Math.abs(first.a.y - second.a.y) <= 0.5) {
    return overlapLength(first.a.x, first.b.x, second.a.x, second.b.x) > 0.5;
  }

  if (firstVertical && secondVertical && Math.abs(first.a.x - second.a.x) <= 0.5) {
    return overlapLength(first.a.y, first.b.y, second.a.y, second.b.y) > 0.5;
  }

  return false;
}

function overlapLength(aStart, aEnd, bStart, bEnd) {
  return rangeOverlapLength(aStart, aEnd, bStart, bEnd);
}

function rangeOverlapLength(aStart, aEnd, bStart, bEnd) {
  const minA = Math.min(aStart, aEnd);
  const maxA = Math.max(aStart, aEnd);
  const minB = Math.min(bStart, bEnd);
  const maxB = Math.max(bStart, bEnd);
  return Math.min(maxA, maxB) - Math.max(minA, minB);
}

function wireTouchesPoint(wire, point) {
  return (wire.points || []).some((wirePoint) => pointsEqual(wirePoint, point));
}

function wireEndpointTouchesPoint(wire, point) {
  if (!wire.points || wire.points.length < 2) return false;
  return pointsEqual(wire.points[0], point) || pointsEqual(wire.points[wire.points.length - 1], point);
}

function pointOnAnyBus(point, buses) {
  return Boolean(findBusAtPoint(point, buses));
}

function findBusAtPoint(point, buses, signal = null) {
  if (!isFinitePoint(point)) return null;
  return (
    buses.find(
      (bus) =>
        (!signal || sameCircuitSignal(bus.signal, signal)) &&
        Math.abs(point.y - bus.y) <= 0.5 &&
        point.x >= bus.x1 - 0.5 &&
        point.x <= bus.x2 + 0.5,
    ) || null
  );
}

function sameCircuitSignal(a, b) {
  return Boolean(a && b && a === b);
}

function signalLaneIndex(signal) {
  const text = String(signal || "wire");
  return [...text].reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0) % 6;
}

function pointsEqual(a, b) {
  return Boolean(a && b && Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5);
}

function isFinitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function pointKey(point) {
  return `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`;
}

function compactManhattanPoints(points) {
  const deduped = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });

  return deduped.filter((point, index, list) => {
    if (index === 0 || index === list.length - 1) return true;
    const previous = list[index - 1];
    const next = list[index + 1];
    const sameVertical = previous.x === point.x && point.x === next.x;
    const sameHorizontal = previous.y === point.y && point.y === next.y;
    return !sameVertical && !sameHorizontal;
  });
}

function parseSopExpression(expression, signalNames) {
  const trimmed = (expression || "0").replace(/\s+/g, "");
  if (trimmed === "0" || trimmed === "1") {
    return { constant: trimmed, terms: [] };
  }

  return {
    constant: null,
    terms: trimmed.split("+").filter(Boolean).map((term) => parseProductTerm(term, signalNames)),
  };
}

function parseProductTerm(term, signalNames) {
  if (term === "1") return [];
  const orderedNames = [...signalNames].sort((a, b) => b.length - a.length);
  const literals = [];
  let cursor = 0;

  while (cursor < term.length) {
    const matched = orderedNames.find((name) => term.startsWith(name, cursor));
    if (!matched) {
      literals.push({ base: term.slice(cursor), signal: term.slice(cursor), label: term.slice(cursor), inverted: false });
      break;
    }

    cursor += matched.length;
    const inverted = term[cursor] === "'";
    if (inverted) cursor += 1;
    literals.push({
      base: matched,
      signal: inverted ? `${matched}'` : matched,
      label: inverted ? `${matched}'` : matched,
      inverted,
    });
  }

  return literals;
}

function estimateAndGateHeight(term) {
  return Math.max(72, term.length * 28 + 28);
}

function estimateEquationTermPitch(parsed) {
  const termHeights = parsed.terms.map((term) => (term.length > 1 ? estimateAndGateHeight(term) : 50));
  const tallestTerm = termHeights.length ? Math.max(...termHeights) : 50;
  return Math.max(112, tallestTerm + 48);
}

function estimateEquationGroupHeight(parsed) {
  if (!parsed || parsed.constant || parsed.terms.length <= 1) {
    const term = parsed?.terms?.[0] || [];
    return Math.max(96, term.length > 1 ? estimateAndGateHeight(term) + 42 : 96);
  }

  const termPitch = estimateEquationTermPitch(parsed);
  const termHeights = parsed.terms.map((term) => (term.length > 1 ? estimateAndGateHeight(term) : 50));
  const tallestTerm = Math.max(...termHeights);
  const termStackHeight = (parsed.terms.length - 1) * termPitch + tallestTerm;
  const orHeight = estimateOrGateHeight(parsed.terms.length, termPitch);
  return Math.max(112, termStackHeight, orHeight);
}

function layoutEquationGroups(equations, desiredCenterForEquation, parsedEquations, topY) {
  const layouts = new Map();
  const groupGap = 104;
  let currentBottom = topY - groupGap;

  equations.forEach((equation) => {
    const parsed = parsedEquations.get(equation.name);
    const height = estimateEquationGroupHeight(parsed);
    const termPitch = estimateEquationTermPitch(parsed);
    const desiredCenter = desiredCenterForEquation(equation);
    let top = desiredCenter - height / 2;
    if (top < currentBottom + groupGap) {
      top = currentBottom + groupGap;
    }

    const centerY = top + height / 2;
    layouts.set(equation.name, { centerY, height, termPitch });
    currentBottom = top + height;
  });

  return layouts;
}

function addAndGate(id, x, centerY, literals, addNode) {
  const h = estimateAndGateHeight(literals);
  const node = {
    id,
    type: "and",
    title: "AND",
    x,
    y: centerY - h / 2,
    w: 64,
    h,
    ports: [...makeSidePorts(literals.map((literal) => literal.label), "left", h), { side: "right", offset: 0, label: "" }],
  };
  return addNode(node);
}

function estimateOrGateHeight(inputCount, inputSpacing = 88) {
  if (inputCount <= 1) return 64;
  return Math.max(64, (inputCount - 1) * inputSpacing + 56);
}

function addOrGate(id, x, centerY, terms, addNode, inputSpacing = 88) {
  const h = estimateOrGateHeight(terms.length, inputSpacing);
  const node = {
    id,
    type: "or",
    title: "OR",
    x,
    y: centerY - h / 2,
    w: 70,
    h,
    ports: [...makeSidePorts(terms.map((_, index) => `T${index + 1}`), "left", h, inputSpacing), { side: "right", offset: 0, label: "" }],
  };
  return addNode(node);
}

function drawCircuitBus(group, bus) {
  const klass = `wire bus-wire ${bus.kind || ""}`.trim();
  group.append(svgEl("path", { class: klass, d: `M ${bus.x1} ${bus.y} L ${bus.x2} ${bus.y}`, "data-signal": bus.signal || "" }));
  group.append(svgEl("circle", { class: `source-terminal ${bus.kind || ""}`.trim(), cx: bus.x1, cy: bus.y, r: 4.5 }));
  if (bus.label) {
    drawBusLabel(group, bus);
  }

  if (bus.kind === "constant") {
    drawConstantSymbol(group, bus);
  }
}

function drawBusLabel(group, bus) {
  const labelX = bus.labelX ?? bus.x1 - 38;
  const labelY = bus.y - 17;
  const width = Math.max(28, bus.label.length * 8 + 14);
  const labelGroup = svgEl("g", { class: "bus-label-group" });
  labelGroup.append(
    svgEl("rect", {
      class: "bus-label-bg",
      x: labelX - width / 2,
      y: labelY - 14,
      width,
      height: 18,
      rx: 4,
      ry: 4,
    }),
  );
  labelGroup.append(svgText(bus.label, labelX, labelY, { class: "bus-label", "text-anchor": "middle" }));
  group.append(labelGroup);
}

function drawConstantSymbol(group, bus) {
  if (bus.label === "GND") {
    group.append(svgEl("line", { class: "constant-symbol", x1: bus.x1 - 42, y1: bus.y + 10, x2: bus.x1 - 18, y2: bus.y + 10 }));
    group.append(svgEl("line", { class: "constant-symbol", x1: bus.x1 - 38, y1: bus.y + 16, x2: bus.x1 - 22, y2: bus.y + 16 }));
    group.append(svgEl("line", { class: "constant-symbol", x1: bus.x1 - 34, y1: bus.y + 22, x2: bus.x1 - 26, y2: bus.y + 22 }));
  }
}

function drawCircuitWire(group, wire) {
  group.append(
    svgEl("path", {
      class: `wire ${wire.kind || ""}`.trim(),
      d: pointsToPath(wire.points),
      "data-signal": wire.signal || "",
    }),
  );
}

function drawCircuitNode(viewport, node) {
  const group = svgEl("g", { transform: `translate(${node.x}, ${node.y})` });

  if (node.type === "and") {
    drawAndGateNode(group, node);
  } else if (node.type === "or") {
    drawOrGateNode(group, node);
  } else if (node.type === "not") {
    drawNotGateNode(group, node);
  } else if (node.type === "ff") {
    drawFlipFlopNode(group, node);
  } else if (node.type === "output") {
    drawOutputNode(group, node);
  }

  viewport.append(group);
}

function drawAndGateNode(group, node) {
  const radiusX = node.w * 0.48;
  const midX = node.w - radiusX;
  group.append(
    svgEl("path", {
      class: "logic-gate and-gate",
      d: `M 0 0 L ${midX} 0 A ${radiusX} ${node.h / 2} 0 0 1 ${midX} ${node.h} L 0 ${node.h} Z`,
    }),
  );
  group.append(svgText("AND", node.w / 2 - 3, node.h / 2 + 4, { class: "gate-title", "text-anchor": "middle" }));
  appendGatePins(group, node);
}

function drawOrGateNode(group, node) {
  group.append(
    svgEl("path", {
      class: "logic-gate or-gate",
      d: `M 0 0 C ${node.w * 0.28} ${node.h * 0.1}, ${node.w * 0.34} ${node.h * 0.9}, 0 ${node.h} C ${node.w * 0.42} ${node.h * 0.92}, ${node.w * 0.82} ${node.h * 0.78}, ${node.w} ${node.h / 2} C ${node.w * 0.82} ${node.h * 0.22}, ${node.w * 0.42} ${node.h * 0.08}, 0 0 Z`,
    }),
  );
  group.append(svgText("OR", node.w / 2 + 4, node.h / 2 + 4, { class: "gate-title", "text-anchor": "middle" }));
  appendGatePins(group, node);
}

function drawNotGateNode(group, node) {
  group.append(svgEl("path", { class: "logic-gate not-gate", d: `M 0 0 L 0 ${node.h} L ${node.w - 9} ${node.h / 2} Z` }));
  group.append(svgEl("circle", { class: "logic-gate-bubble", cx: node.w - 4.5, cy: node.h / 2, r: 4.5 }));
  group.append(svgText("NOT", node.w / 2 - 3, -6, { class: "gate-title", "text-anchor": "middle" }));
  appendGatePins(group, node, { showLabels: false });
}

function drawFlipFlopNode(group, node) {
  group.append(svgEl("rect", { class: "node-box ff", width: node.w, height: node.h, rx: 8 }));
  group.append(svgText(node.title, node.w / 2, 26, { class: "node-title", "text-anchor": "middle" }));
  if (node.subtitle) {
    group.append(svgText(node.subtitle, node.w / 2, 48, { class: "node-subtitle", "text-anchor": "middle" }));
  }
  appendPortLabels(group, node);
}

function drawOutputNode(group, node) {
  group.append(svgEl("rect", { class: "node-box io", width: node.w, height: node.h, rx: 8 }));
  group.append(svgText(node.title, node.w / 2, 28, { class: "node-title", "text-anchor": "middle" }));
  if (node.subtitle) {
    group.append(svgText(node.subtitle, node.w / 2, 48, { class: "node-subtitle", "text-anchor": "middle" }));
  }
  appendPortLabels(group, node);
}

function appendGatePins(group, node, options = {}) {
  const showLabels = options.showLabels !== false;
  (node.ports || []).forEach((port) => {
    const point = anchor({ ...node, x: 0, y: 0 }, port.side, port.offset || 0);
    group.append(svgEl("circle", { class: "pin-dot gate-pin", cx: point.x, cy: point.y, r: 2.7 }));
    if (showLabels && port.side === "left" && port.label) {
      group.append(svgText(port.label, -7, point.y + 3, { class: "gate-pin-label", "text-anchor": "end" }));
    }
  });
}

function getFlipFlopInputLabels(ffType, qIndex) {
  if (ffType === "jk") return [`J${qIndex}`, `K${qIndex}`];
  if (ffType === "sr") return [`S${qIndex}`, `R${qIndex}`];
  if (ffType === "d") return [`D${qIndex}`];
  return [`T${qIndex}`];
}

function getNodePortOffset(nodes, nodeId, label) {
  const node = nodes.find((item) => item.id === nodeId);
  const port = node?.ports.find((item) => item.label === label);
  return port?.offset || 0;
}

function logicBlockHeight(inputCount) {
  const pinSpacing = 28;
  const minBlockHeight = 90;
  return Math.max(minBlockHeight, Math.max(inputCount, 1) * pinSpacing + 40);
}

function makeSidePorts(labels, side, nodeHeight, pinSpacing = 28) {
  const yValues = pinRows(nodeHeight, labels.length, pinSpacing);
  return labels.map((label, index) => ({
    side,
    offset: yValues[index] - nodeHeight / 2,
    label,
  }));
}

function pinRows(nodeHeight, count, pinSpacing = 28) {
  if (count <= 0) return [];
  if (count === 1) return [nodeHeight / 2];

  const span = (count - 1) * pinSpacing;
  const startY = (nodeHeight - span) / 2;
  return Array.from({ length: count }, (_, index) => startY + index * pinSpacing);
}

function anchor(node, side, offset = 0) {
  if (side === "left") return { x: node.x, y: node.y + node.h / 2 + offset };
  if (side === "right") return { x: node.x + node.w, y: node.y + node.h / 2 + offset };
  if (side === "top") return { x: node.x + node.w / 2 + offset, y: node.y };
  if (side === "bottom") return { x: node.x + node.w / 2 + offset, y: node.y + node.h };
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function makeManhattanPoints(start, end, edge) {
  if (edge.toSide === "bottom") {
    const laneY = edge.laneY || Math.max(start.y, end.y) + 38;
    return [
      start,
      { x: start.x + 40, y: start.y },
      { x: start.x + 40, y: laneY },
      { x: end.x, y: laneY },
      end,
    ];
  }

  const defaultLaneX = start.x <= end.x ? start.x + Math.max(42, (end.x - start.x) / 2) : Math.min(start.x, end.x) - 46;
  const laneX = edge.laneX || defaultLaneX;
  return [
    start,
    { x: laneX, y: start.y },
    { x: laneX, y: end.y },
    end,
  ];
}

function pointsToPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function labelOnLongestSegment(points) {
  let best = { x: points[0].x, y: points[0].y - 8 };
  let bestLength = 0;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    if (length > bestLength) {
      bestLength = length;
      best = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 };
    }
  }

  return best;
}

function labelNearEnd(points) {
  const end = points[points.length - 1];
  const beforeEnd = points[points.length - 2];
  return {
    x: (beforeEnd.x + end.x) / 2,
    y: (beforeEnd.y + end.y) / 2 - 8,
  };
}

function appendWireLabel(group, label, x, y) {
  const width = Math.max(18, label.length * 7 + 10);
  const labelGroup = svgEl("g", { class: "wire-label", transform: `translate(${x - width / 2}, ${y - 11})` });
  labelGroup.append(svgEl("rect", { class: "wire-label-bg", width, height: 16, rx: 4 }));
  labelGroup.append(svgText(label, width / 2, 12, { class: "wire-label-text", "text-anchor": "middle" }));
  group.append(labelGroup);
}

function appendPortLabels(group, node) {
  if (!node.ports) return;
  node.ports.forEach((port) => {
    const point = anchor({ ...node, x: 0, y: 0 }, port.side, port.offset || 0);
    group.append(svgEl("circle", { class: "pin-dot", cx: point.x, cy: point.y, r: 3 }));
    appendInsidePortLabel(group, node, port, point);
  });
}

function sidePortLabels(node, side) {
  return unique((node.ports || []).filter((port) => port.side === side).map((port) => port.label).filter(Boolean));
}

function appendInsidePortLabel(group, node, port, point) {
  if (!port.label) return;

  const attrs = {
    class: "pin-label",
    "dominant-baseline": "middle",
  };
  let x = point.x;
  let y = point.y;

  if (port.side === "left") {
    x = 18;
    attrs["text-anchor"] = "start";
  } else if (port.side === "right") {
    x = node.w - 24;
    attrs["text-anchor"] = "end";
  } else if (port.side === "bottom") {
    y = node.h - 14;
    attrs["text-anchor"] = "middle";
  } else {
    y = 14;
    attrs["text-anchor"] = "middle";
  }

  group.append(svgText(port.label, x, y, attrs));
}

function extractExpressionLiterals(expression) {
  if (!expression || expression === "0" || expression === "1") return [];
  const escapedInputs = inputVariables.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`Q\\d+'?|(?:${escapedInputs.join("|")})'?`, "g");
  return unique(expression.match(pattern) || []);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function svgText(text, x, y, attrs = {}) {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = text;
  return el;
}

function wrapSvgText(group, text, x, y, maxWidth) {
  const maxChars = Math.max(10, Math.floor(maxWidth / 6.8));
  const shortText = text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
  const line = svgText(shortText, x, y, { class: "node-subtitle", "text-anchor": "middle" });
  group.append(line);
}

function applyDiagramTransform() {
  const viewport = document.querySelector("#diagramViewport");
  if (!viewport) return;
  viewport.setAttribute("transform", `translate(${diagramView.x} ${diagramView.y}) scale(${diagramView.scale})`);
}

function zoomDiagram(multiplier) {
  diagramView.scale = clamp(diagramView.scale * multiplier, 0.45, 2.4);
  applyDiagramTransform();
}

function resetDiagramView() {
  diagramView = { x: 0, y: 0, scale: 1 };
  applyDiagramTransform();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

els.tableBody.addEventListener("input", () => {
  collectTableInput();
  refreshInitialStateOptions();
});
els.inputVariablesInput.addEventListener("change", () => applyVariableSettings({ preserveValues: true }));
els.outputVariablesInput.addEventListener("change", () => applyVariableSettings({ preserveValues: true }));
document.querySelectorAll('input[name="modelType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    collectTableInput();
    renderTable();
    resetOutput();
  });
});
els.addRowButton.addEventListener("click", addStateTableRow);
els.removeRowButton.addEventListener("click", removeStateTableRow);
els.clearButton.addEventListener("click", clearTable);
els.loadButton.addEventListener("click", loadExample);
els.parseDescriptionButton.addEventListener("click", parseDescriptionToStateTable);
els.generateButton.addEventListener("click", analyze);
els.equationSelect.addEventListener("change", () => {
  if (!lastAnalysis) return;
  renderKMap(lastAnalysis.equations[Number(els.equationSelect.value)]);
});

els.zoomInButton.addEventListener("click", () => zoomDiagram(1.12));
els.zoomOutButton.addEventListener("click", () => zoomDiagram(0.88));
els.resetViewButton.addEventListener("click", resetDiagramView);

els.circuitSvg.addEventListener("wheel", (event) => {
  if (!lastAnalysis) return;
  event.preventDefault();
  zoomDiagram(event.deltaY < 0 ? 1.08 : 0.92);
});

els.circuitSvg.addEventListener("pointerdown", (event) => {
  if (!lastAnalysis) return;
  dragStart = { x: event.clientX, y: event.clientY, viewX: diagramView.x, viewY: diagramView.y };
  els.diagramCanvas.classList.add("dragging");
  els.circuitSvg.setPointerCapture(event.pointerId);
});

els.circuitSvg.addEventListener("pointermove", (event) => {
  if (!dragStart) return;
  diagramView.x = dragStart.viewX + (event.clientX - dragStart.x);
  diagramView.y = dragStart.viewY + (event.clientY - dragStart.y);
  applyDiagramTransform();
});

els.circuitSvg.addEventListener("pointerup", (event) => {
  dragStart = null;
  els.diagramCanvas.classList.remove("dragging");
  if (els.circuitSvg.hasPointerCapture(event.pointerId)) {
    els.circuitSvg.releasePointerCapture(event.pointerId);
  }
});

applyInitialQuerySettings();
applyVariableSettings({ preserveValues: false });
