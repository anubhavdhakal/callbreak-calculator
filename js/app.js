const PLAYER_COUNT = 4;
const MAX_TRICKS = 13;
const STORAGE_KEY = "callbreak-calculator-state-v1";

const state = {
  names: Array.from({ length: PLAYER_COUNT }, (_, i) => `Player ${i + 1}`),
  rounds: []
};

const roundTitle = document.getElementById("round-title");
const roundGrid = document.getElementById("round-grid");
const message = document.getElementById("message");
const tableHead = document.getElementById("table-head");
const tableBody = document.getElementById("table-body");

function toOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function scoreFor(call, achieved) {
  if (achieved >= call) {
    return toOneDecimal(call + (achieved - call) * 0.1);
  }
  return -call;
}

function showMessage(text = "") {
  message.textContent = text;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.names) && parsed.names.length === PLAYER_COUNT) {
      state.names = parsed.names.map((name, i) => String(name || `Player ${i + 1}`).slice(0, 24));
    }
    if (Array.isArray(parsed.rounds)) {
      state.rounds = parsed.rounds.filter((round) => Array.isArray(round) && round.length === PLAYER_COUNT);
    }
  } catch (error) {
    console.error("Failed to parse saved state", error);
  }
}

function createInput(type, min, max, value) {
  const input = document.createElement("input");
  input.type = type;
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.className = "input";
  input.required = true;
  return input;
}

function renderRoundInputs() {
  roundTitle.textContent = `Round ${state.rounds.length + 1}`;
  roundGrid.innerHTML = "";

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const box = document.createElement("article");
    box.className = "player-box";

    const title = document.createElement("h3");
    title.textContent = state.names[i] || `Player ${i + 1}`;

    const row = document.createElement("div");
    row.className = "row";

    const callField = document.createElement("label");
    callField.className = "field";
    const callSpan = document.createElement("span");
    callSpan.textContent = "Call";
    const callInput = createInput("number", 0, MAX_TRICKS, 1);
    callInput.id = `call-${i}`;

    const achievedField = document.createElement("label");
    achievedField.className = "field";
    const achievedSpan = document.createElement("span");
    achievedSpan.textContent = "Achieved";
    const achievedInput = createInput("number", 0, MAX_TRICKS, 0);
    achievedInput.id = `achieved-${i}`;

    callField.append(callSpan, callInput);
    achievedField.append(achievedSpan, achievedInput);
    row.append(callField, achievedField);
    box.append(title, row);
    roundGrid.append(box);
  }
}

function playerTotals() {
  const totals = Array.from({ length: PLAYER_COUNT }, () => 0);
  state.rounds.forEach((round) => {
    round.forEach((entry, idx) => {
      totals[idx] = toOneDecimal(totals[idx] + entry.score);
    });
  });
  return totals;
}

function renderTable() {
  const headerCells = ["Round", ...state.names, "Round Total"];
  tableHead.innerHTML = `<tr>${headerCells.map((cell) => `<th>${cell}</th>`).join("")}</tr>`;

  const totals = playerTotals();
  let rows = "";

  state.rounds.forEach((round, index) => {
    const roundTotal = toOneDecimal(round.reduce((sum, p) => sum + p.score, 0));
    const scores = round.map((entry) => entry.score.toFixed(1));
    rows += `<tr><td>R${index + 1}</td>${scores.map((s) => `<td>${s}</td>`).join("")}<td>${roundTotal.toFixed(1)}</td></tr>`;
  });

  const grandTotal = toOneDecimal(totals.reduce((sum, value) => sum + value, 0));
  rows += `<tr class="total-row"><td>Total</td>${totals.map((s) => `<td>${s.toFixed(1)}</td>`).join("")}<td>${grandTotal.toFixed(1)}</td></tr>`;

  tableBody.innerHTML = rows;
}

function readRoundInputs() {
  const round = [];
  let achievedTotal = 0;

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const call = Number(document.getElementById(`call-${i}`).value);
    const achieved = Number(document.getElementById(`achieved-${i}`).value);

    if (!Number.isInteger(call) || !Number.isInteger(achieved)) {
      return { error: "Use whole numbers for call and achieved." };
    }
    if (call < 0 || call > MAX_TRICKS || achieved < 0 || achieved > MAX_TRICKS) {
      return { error: `Values must stay between 0 and ${MAX_TRICKS}.` };
    }

    achievedTotal += achieved;
    round.push({ call, achieved, score: scoreFor(call, achieved) });
  }

  if (achievedTotal !== MAX_TRICKS) {
    return { error: `Total achieved tricks must be ${MAX_TRICKS}. Currently ${achievedTotal}.` };
  }

  return { round };
}

function bindNameInputs() {
  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const input = document.getElementById(`name-${i}`);
    input.value = state.names[i];
    input.addEventListener("input", () => {
      const clean = input.value.trim().slice(0, 24);
      state.names[i] = clean || `Player ${i + 1}`;
      renderRoundInputs();
      renderTable();
      saveState();
    });
  }
}

function addRound() {
  const { round, error } = readRoundInputs();
  if (error) {
    showMessage(error);
    return;
  }

  state.rounds.push(round);
  showMessage("");
  saveState();
  renderRoundInputs();
  renderTable();
}

function undoRound() {
  if (state.rounds.length === 0) {
    showMessage("No round to undo.");
    return;
  }

  state.rounds.pop();
  showMessage("");
  saveState();
  renderRoundInputs();
  renderTable();
}

function resetGame() {
  if (!window.confirm("Reset all rounds and totals?")) return;
  state.rounds = [];
  showMessage("");
  saveState();
  renderRoundInputs();
  renderTable();
}

loadState();
bindNameInputs();
renderRoundInputs();
renderTable();

document.getElementById("add-round").addEventListener("click", addRound);
document.getElementById("undo-round").addEventListener("click", undoRound);
document.getElementById("reset-game").addEventListener("click", resetGame);
