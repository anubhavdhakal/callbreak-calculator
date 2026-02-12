const PLAYER_COUNT = 4;
const MAX_TRICKS = 13;
const TOTAL_ROUNDS = 5;
const MID_SCORE_AT_ROUND = 4;
const STORAGE_KEY = "callbreak-calculator-state-v2";

const state = {
  names: Array.from({ length: PLAYER_COUNT }, (_, i) => `Player ${i + 1}`),
  rounds: [],
  draft: {
    expected: [1, 1, 1, 1],
    achieved: [0, 0, 0, 0],
    expectedLocked: false
  }
};

const roundTitle = document.getElementById("round-title");
const expectedWrap = document.getElementById("expected-wrap");
const achievedWrap = document.getElementById("achieved-wrap");
const fixedBtn = document.getElementById("toggle-fixed");
const submitRoundBtn = document.getElementById("submit-round");
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

function isIntInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function sanitizeDraft(draft) {
  const safe = {
    expected: [1, 1, 1, 1],
    achieved: [0, 0, 0, 0],
    expectedLocked: false
  };

  if (!draft || typeof draft !== "object") return safe;

  if (Array.isArray(draft.expected) && draft.expected.length === PLAYER_COUNT) {
    safe.expected = draft.expected.map((value) => {
      const n = Number(value);
      return isIntInRange(n, 0, MAX_TRICKS) ? n : 1;
    });
  }

  if (Array.isArray(draft.achieved) && draft.achieved.length === PLAYER_COUNT) {
    safe.achieved = draft.achieved.map((value) => {
      const n = Number(value);
      return isIntInRange(n, 0, MAX_TRICKS) ? n : 0;
    });
  }

  safe.expectedLocked = Boolean(draft.expectedLocked);
  return safe;
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
      state.rounds = parsed.rounds
        .filter((round) => Array.isArray(round) && round.length === PLAYER_COUNT)
        .slice(0, TOTAL_ROUNDS);
    }

    state.draft = sanitizeDraft(parsed.draft);

    if (state.rounds.length >= TOTAL_ROUNDS) {
      state.draft.expectedLocked = false;
    }
  } catch (error) {
    console.error("Failed to parse saved state", error);
  }
}

function playerTotals(roundLimit = state.rounds.length) {
  const totals = Array.from({ length: PLAYER_COUNT }, () => 0);
  state.rounds.slice(0, roundLimit).forEach((round) => {
    round.forEach((entry, idx) => {
      totals[idx] = toOneDecimal(totals[idx] + entry.score);
    });
  });
  return totals;
}

function rankFromScores(scores) {
  const sorted = [...scores]
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score);

  const ranks = Array(PLAYER_COUNT).fill("--");
  let rank = 1;

  sorted.forEach((item, index) => {
    if (index > 0 && item.score < sorted[index - 1].score) {
      rank = index + 1;
    }
    ranks[item.idx] = String(rank);
  });

  return ranks;
}

function rowValuesOrZero(roundIndex) {
  const round = state.rounds[roundIndex];
  if (!round) return Array(PLAYER_COUNT).fill("0.0");
  return round.map((entry) => entry.score.toFixed(1));
}

function renderTable() {
  tableHead.innerHTML = `<tr><th>CallBreak</th>${state.names.map((name) => `<th>${name}</th>`).join("")}</tr>`;

  const midTotals = playerTotals(MID_SCORE_AT_ROUND);
  const finalTotals = playerTotals(TOTAL_ROUNDS);
  const rankRow = state.rounds.length === TOTAL_ROUNDS ? rankFromScores(finalTotals) : Array(PLAYER_COUNT).fill("--");

  let rows = "";
  rows += `<tr><td>Round1</td>${rowValuesOrZero(0).map((v) => `<td>${v}</td>`).join("")}</tr>`;
  rows += `<tr><td>Round2</td>${rowValuesOrZero(1).map((v) => `<td>${v}</td>`).join("")}</tr>`;
  rows += `<tr><td>Round3</td>${rowValuesOrZero(2).map((v) => `<td>${v}</td>`).join("")}</tr>`;
  rows += `<tr><td>Round4</td>${rowValuesOrZero(3).map((v) => `<td>${v}</td>`).join("")}</tr>`;
  rows += `<tr class="mid-row"><td>Mid-score</td>${midTotals.map((v) => `<td>${v.toFixed(1)}</td>`).join("")}</tr>`;
  rows += `<tr><td>Round5</td>${rowValuesOrZero(4).map((v) => `<td>${v}</td>`).join("")}</tr>`;
  rows += `<tr class="final-row"><td>Final-score</td>${finalTotals.map((v) => `<td>${v.toFixed(1)}</td>`).join("")}</tr>`;
  rows += `<tr class="rank-row"><td>Rank</td>${rankRow.map((v) => `<td>${v}</td>`).join("")}</tr>`;

  tableBody.innerHTML = rows;
}

function updateRoundHeader() {
  if (state.rounds.length >= TOTAL_ROUNDS) {
    roundTitle.textContent = `Completed: ${TOTAL_ROUNDS} / ${TOTAL_ROUNDS}`;
    return;
  }
  roundTitle.textContent = `Round ${state.rounds.length + 1} / ${TOTAL_ROUNDS}`;
}

function renderInputRow(container, type, values, disabled = false) {
  container.innerHTML = "";
  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(MAX_TRICKS);
    input.value = String(values[i]);
    input.id = `${type}-${i}`;
    input.className = "input";
    input.disabled = disabled;

    input.addEventListener("input", () => {
      const n = Number(input.value);
      if (isIntInRange(n, 0, MAX_TRICKS)) {
        state.draft[type][i] = n;
        saveState();
      }
    });

    container.appendChild(input);
  }
}

function renderRoundInputs() {
  const gameDone = state.rounds.length >= TOTAL_ROUNDS;

  renderInputRow(expectedWrap, "expected", state.draft.expected, state.draft.expectedLocked || gameDone);
  renderInputRow(achievedWrap, "achieved", state.draft.achieved, gameDone);

  fixedBtn.disabled = gameDone;
  submitRoundBtn.disabled = gameDone;

  if (state.draft.expectedLocked) {
    fixedBtn.textContent = "Edit";
    fixedBtn.classList.add("is-locked");
  } else {
    fixedBtn.textContent = "Fixed";
    fixedBtn.classList.remove("is-locked");
  }

  updateRoundHeader();
}

function bindNameInputs() {
  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const input = document.getElementById(`name-${i}`);
    input.value = state.names[i];
    input.addEventListener("input", () => {
      const clean = input.value.trim().slice(0, 24);
      state.names[i] = clean || `Player ${i + 1}`;
      renderTable();
      saveState();
    });
  }
}

function readExpectedFromUI() {
  const expected = [];

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const n = Number(document.getElementById(`expected-${i}`).value);
    if (!isIntInRange(n, 0, MAX_TRICKS)) {
      return { error: `Expected values must be between 0 and ${MAX_TRICKS}.` };
    }
    expected.push(n);
  }

  return { expected };
}

function readAchievedFromUI() {
  const achieved = [];
  let achievedTotal = 0;

  for (let i = 0; i < PLAYER_COUNT; i += 1) {
    const n = Number(document.getElementById(`achieved-${i}`).value);
    if (!isIntInRange(n, 0, MAX_TRICKS)) {
      return { error: `Achieved values must be between 0 and ${MAX_TRICKS}.` };
    }
    achieved.push(n);
    achievedTotal += n;
  }

  if (achievedTotal !== MAX_TRICKS) {
    return { error: `Total achieved tricks must be ${MAX_TRICKS}. Currently ${achievedTotal}.` };
  }

  return { achieved };
}

function toggleExpectedFixed() {
  if (state.rounds.length >= TOTAL_ROUNDS) return;

  if (!state.draft.expectedLocked) {
    const { expected, error } = readExpectedFromUI();
    if (error) {
      showMessage(error);
      return;
    }

    state.draft.expected = expected;
    state.draft.expectedLocked = true;
    showMessage("");
  } else {
    state.draft.expectedLocked = false;
  }

  saveState();
  renderRoundInputs();
}

function submitRound() {
  if (state.rounds.length >= TOTAL_ROUNDS) {
    showMessage("All 5 rounds are already complete.");
    return;
  }

  if (!state.draft.expectedLocked) {
    showMessage("Please click Fixed after entering expected points.");
    return;
  }

  const { achieved, error } = readAchievedFromUI();
  if (error) {
    showMessage(error);
    return;
  }

  state.draft.achieved = achieved;

  const round = state.draft.expected.map((expected, idx) => ({
    call: expected,
    achieved: state.draft.achieved[idx],
    score: scoreFor(expected, state.draft.achieved[idx])
  }));

  state.rounds.push(round);
  state.draft.expectedLocked = false;
  state.draft.expected = [1, 1, 1, 1];
  state.draft.achieved = [0, 0, 0, 0];

  if (state.rounds.length === TOTAL_ROUNDS) {
    showMessage("Game complete. Final scores and ranks are ready.");
  } else {
    showMessage("");
  }

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
  state.draft.expectedLocked = false;
  showMessage("");
  saveState();
  renderRoundInputs();
  renderTable();
}

function resetGame() {
  if (!window.confirm("Reset all 5 rounds and totals?")) return;

  state.rounds = [];
  state.draft = {
    expected: [1, 1, 1, 1],
    achieved: [0, 0, 0, 0],
    expectedLocked: false
  };

  showMessage("");
  saveState();
  renderRoundInputs();
  renderTable();
}

loadState();
bindNameInputs();
renderRoundInputs();
renderTable();

document.getElementById("toggle-fixed").addEventListener("click", toggleExpectedFixed);
document.getElementById("submit-round").addEventListener("click", submitRound);
document.getElementById("undo-round").addEventListener("click", undoRound);
document.getElementById("reset-game").addEventListener("click", resetGame);
