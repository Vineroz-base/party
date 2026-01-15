import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function log(msg) { console.log(msg); }
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setStage(stage) {
[idleEl, waitEl, countdownEl, raceFinishedEl].forEach(el => hide(el));
  if (stage === "idle") show(idleEl);
  if (stage === "waiting") show(waitEl);
  if (stage === "countdown") show(countdownEl);
  if (stage === "active") {
    show(raceFinishedEl);
    winnerBanner.classList.remove("visible");
    restartBtn.classList.add("hidden");
  }
  if (stage === "finished") {
    show(raceFinishedEl);
    restartBtn.classList.remove("hidden");
   }
}

const firebaseConfig = {
  apiKey: "AIzaSyBmj-_hMVfz70jZU67Ugd1aRZodckJUj6A",
  authDomain: "github-party.firebaseapp.com",
  databaseURL: "https://github-party-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "github-party",
  storageBucket: "github-party.firebasestorage.app",
  messagingSenderId: "301660898316",
  appId: "1:301660898316:web:aee18e9b10d5cf89239a29",
  measurementId: "G-1E7L3P0M2Q"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const auth = getAuth(app);
signInAnonymously(auth)
  .then(() => log("Master signed in anonymously"))
  .catch(err => log("Auth error: " + err));

const raceRef = ref(db, "tapRace/currentRace");
const playersRef = ref(db, "tapRace/players");

const idleEl = document.getElementById('idle');
const waitEl = document.getElementById('wait');
const countdownEl = document.getElementById('countdown');
const raceFinishedEl = document.getElementById('raceFinished');
const targetInput = document.getElementById('targetInput');
const createBtn = document.getElementById('createBtn');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playersCount = document.getElementById('playersCount');
const chartDivs = document.querySelectorAll('#chart');
const qrCanvas = document.getElementById('qrCanvas');
const winnerBanner = document.getElementById('winnerBanner');
const countNum = document.getElementById('countNum');

const qr = new QRious({ element: qrCanvas, size: 300 });

const animalPool = [
  "🐒", "🦍", "🐕", "🐩", "🐈", "🐅", "🐆", "🐎", "🦓", "🦌",
  "🦬", "🐂", "🐃", "🐄", "🐖", "🐏", "🐑", "🐐", "🐪", "🐫",
  "🦙", "🦒", "🐘", "🦣", "🦏", "🦛", "🐁", "🐀", "🐇", "🐿️",
  "🦔", "🦨", "🦘", "🦡", "🦃", "🐓", "🐤", "🐦", "🦅", "🦆",
  "🦢", "🦤", "🦩", "🦚", "🦜", "🐢", "🐉", "🦕", "🦖", "🐌",
  "🐛", "🐜"
];
const vehiclePool = [
  "🚂", "🚃", "🚌", "🚎", "🚐", "🚑", "🚒", "🚓", "🚕", "🚗",
  "🚙", "🛻", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🦽", "🦼",
  "🛺", "🚲", "🛴", "🚁"
];

const enableBots = document.getElementById("enableBots");
const botCount = document.getElementById("botCount");
const toggleBtn = document.getElementById("toggleAdvanced");
const advancedContent = document.getElementById("advancedContent");

// New references
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const botStyle = document.getElementById("botStyle");

// Initial state: disabled
botCount.disabled = true;
difficultyRadios.forEach(r => r.disabled = true);
botStyle.disabled = true;

// Toggle logic
enableBots.addEventListener("change", () => {
  if (enableBots.checked) {
    botCount.disabled = false;
    difficultyRadios.forEach(r => r.disabled = false);
    botStyle.disabled = false;
  } else {
    botCount.disabled = true;
    difficultyRadios.forEach(r => r.disabled = true);
    botStyle.disabled = true;
  }
});

let raceStage = "idle";
let targetTaps = 0;
let latestPlayers = {};
let confettiFired = false;
let raceStartTime = null;

onValue(playersRef, (snap) => {
  latestPlayers = snap.val() || {};
  const count = Object.keys(latestPlayers).length;
  playersCount.textContent = "Joined: " + count;
  startBtn.disabled = count < 2;

  renderChart(latestPlayers);

  for (const [id, p] of Object.entries(latestPlayers)) {
    if (p.tapCount >= targetTaps && !p.finishDuration && raceStartTime) {
      const duration = Date.now() - raceStartTime;
      update(ref(db, "tapRace/players/" + id), { finishDuration: duration });
    }

    if (raceStage === "active" && p.tapCount >= targetTaps) {
      const duration = Date.now() - raceStartTime;
      let winnerName;
      if (p.isBot) {
        winnerName = p.emoji;
      } else {
        winnerName = p.name;
      }
      update(raceRef, {
        stage: "finished",
        winnerId: id,
        winnerName: winnerName,
        winnerDuration: duration
      });
      break;
    }
  }
});

onValue(raceRef, (snap) => {
  const race = snap.val();
  if (!race) {
    set(raceRef, { stage: "idle" });
    remove(playersRef);
    return;
  }

  raceStage = race.stage;
  targetTaps = race.targetTaps || 0;
  log("Race stage: " + raceStage + ", targetTaps: " + targetTaps);

  if (raceStage === "idle") {
    setStage("idle");
    clearCharts();
    winnerBanner.classList.remove("visible");
    confettiFired = false;
  }
  else if (raceStage === "waiting") {
    setStage("waiting");
    qr.value = `${window.location.origin}/tap.html`;
    clearCharts();
    winnerBanner.classList.remove("visible");
    confettiFired = false;

    raceStartTime = null;
  }
  else if (raceStage === "countdown") {
    setStage("countdown");

    let count = 5;
    countNum.textContent = count;

    if (window.countdownInterval) {
      clearInterval(window.countdownInterval);
    }

    window.countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countNum.textContent = count;
      }
      else {
        clearInterval(window.countdownInterval);
        update(raceRef, { stage: "active" });
      }
    }, 1000);
  }
  else if (raceStage === "active") {
    setStage("active");
    if (!raceStartTime) { raceStartTime = Date.now(); } // mark start
    startBotEngines(snap.val().targetTaps);
    renderChart(latestPlayers);
  }
  else if (raceStage === "finished") {
    setStage("finished");
    stopBotEngines();
    renderChart(latestPlayers, race.winnerId, race.winnerDuration);

    if (race.winnerId && race.winnerDuration != null) {
      winnerBanner.textContent = "🏆 Winner: " + race.winnerName +
        " (" + (race.winnerDuration / 1000).toFixed(2) + "s)";
      winnerBanner.classList.add("visible");
    }

    if (!confettiFired) {
      confettiFired = true;
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    }
  }
});

function getSelectedDifficulty() {
  const selected = document.querySelector('input[name="difficulty"]:checked');
  return selected ? selected.value : "casual"; // default fallback
}

// Keep track of active bot intervals
let botIntervals = {};

function startBotEngines(targetTaps) {
  const difficulty = getSelectedDifficulty();
  const baseSpeed = (difficulty === "challenging") ? 400 : 600;

  Object.keys(latestPlayers).forEach(id => {
    const p = latestPlayers[id];
    if (p.isBot) {
      // Base speed depends on difficulty
      p.botBaseSpeed = baseSpeed * (1 + Math.random() * 1.5);

      const tapBot = () => {
        // Apply jitter relative to this bot’s personal base
        const jitterFactor = 1.2 + (Math.random() - 0.4);
        let delay = p.botBaseSpeed * jitterFactor;

        // Clamp minimum delay so bots don’t double‑tap instantly
        delay = Math.max(200, delay);

        botIntervals[id] = setTimeout(() => {
          const newCount = (latestPlayers[id]?.tapCount || 0) + 1;
          update(ref(db, "tapRace/players/" + id), { tapCount: newCount });

          if (newCount < targetTaps) {
            tapBot(); // schedule next tap
          } else {
            clearTimeout(botIntervals[id]);
            delete botIntervals[id];
          }
        }, delay);
      };
      tapBot();
    }
  });
}

function stopBotEngines() {
  Object.values(botIntervals).forEach(timeout => clearTimeout(timeout));
  botIntervals = {};
}

function clearCharts() {
  chartDivs.forEach(div => div.innerHTML = "");
}

function renderChart(players, winnerId = null, winnerDuration = null) {
  chartDivs.forEach(div => {
    // Ensure a raceContainer exists around this chart div
    let raceContainer = div.closest(".raceContainer");
    if (!raceContainer) {
      raceContainer = document.createElement("div");
      raceContainer.className = "raceContainer";
      div.parentNode.insertBefore(raceContainer, div);
      raceContainer.appendChild(div);
    }

    // Ensure a finishLine marker exists
    let finishLine = raceContainer.querySelector(".finishLine");
    if (!finishLine) {
      finishLine = document.createElement("span");
      finishLine.className = "finishLine";
      raceContainer.appendChild(finishLine);
    }

    // Build a sorted list of players
    const entries = Object.entries(players).map(([id, p]) => ({ id, ...p }));
    const sorted = entries.sort((a, b) => {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
      const aFinished = a.finishDuration != null;
      const bFinished = b.finishDuration != null;
      if (aFinished && bFinished) return a.finishDuration - b.finishDuration;
      if (aFinished) return -1;
      if (bFinished) return 1;
      return b.tapCount - a.tapCount;
    });

    const topPlayers = sorted.slice(0, 5);

    // Track which IDs are currently rendered
    const existingRows = Array.from(raceContainer.querySelectorAll(".playerRow"));

    // Remove rows that are no longer in topPlayers
    existingRows.forEach(r => {
      if (!topPlayers.find(p => p.id === r.dataset.id)) {
        raceContainer.removeChild(r);
      }
    });

    // Update or create rows for topPlayers
    topPlayers.forEach((p, rank) => {
      let row = raceContainer.querySelector(`.playerRow[data-id="${p.id}"]`);
      if (!row) {
        row = document.createElement("div");
        row.className = "playerRow";
        row.dataset.id = p.id;

        const nameSpan = document.createElement("span");
        nameSpan.className = "playerName";
        row.appendChild(nameSpan);

        const track = document.createElement("div");
        track.className = "track";

        const finishTimeSpan = document.createElement("span");
        finishTimeSpan.className = "finishTime";
        track.appendChild(finishTimeSpan);

        const iconWrapper = document.createElement("span");
        iconWrapper.className = "playerIcon";

        const inner = document.createElement("span");
        inner.className = "flipped";
        inner.textContent = p.isBot ? (p.emoji || "🏇") : "🚴";

        iconWrapper.appendChild(inner);
        track.appendChild(iconWrapper);
        row.appendChild(track);

        raceContainer.appendChild(row);
      }

      // Update name label
      const nameSpan = row.querySelector(".playerName");

      let medal = "";
      if (rank === 0) medal = "🥇";
      else if (rank === 1) medal = "🥈";
      else if (rank === 2) medal = "🥉";

      if (raceStage === "finished") {
        if (p.finishDuration != null) {
          nameSpan.textContent = `${medal} ${p.name}`;
          nameSpan.style.color = "";
        } else {
          nameSpan.textContent = `${medal} ${p.name}`;
          nameSpan.style.color = "#888"; // grey for unfinished
        }
      } else {
        nameSpan.textContent = `${medal} ${p.name}`;
        nameSpan.style.color = "";
      }

      // Update finish time (left-aligned on track)
      const finishTimeSpan = row.querySelector(".finishTime");
      finishTimeSpan.textContent =
        raceStage === "finished" && p.finishDuration != null
          ? (p.finishDuration / 1000).toFixed(2) + "s"
          : "";

      // Update icon position (animated via CSS transition)
      const progress = Math.min(
        99,
        targetTaps ? (p.tapCount / targetTaps) * 100 : 0
      );
      const iconWrapper = row.querySelector(".playerIcon");
      iconWrapper.style.left = progress + "%";
    });
  });
}

createBtn.onclick = () => {
  const target = parseInt(targetInput.value, 10) || 50;

  remove(playersRef);

  // Create race record
  set(raceRef, {
    stage: "waiting",
    targetTaps: target,
    winnerId: null,
    winnerDuration: null
  });

  // If bots are enabled, add them now
  if (enableBots.checked) {
    const count = Math.min(parseInt(botCount.value, 10), 999);
    const style = botStyle.value; // "animal" or "vehicle"
    const pool = (style === "vehicle") ? vehiclePool : animalPool;

    for (let i = 0; i < count; i++) {
      const botId = "bot_" + i;
      const botNumber = String(i + 1).padStart(3, "0");
      const randomEmoji = pool[Math.floor(Math.random() * pool.length)];

      set(ref(db, "tapRace/players/" + botId), {
        name: "Bot " + botNumber,
        tapCount: 0,
        emoji: randomEmoji,   // renamed to generic "emoji"
        isBot: true
      });
    }
  }
};

toggleBtn.onclick = () => {
  const expanded = advancedContent.classList.toggle("expanded");
  toggleBtn.textContent = expanded ? "Advanced options ▾" : "Advanced options ▸";
};

startBtn.onclick = () => {
  const target = parseInt(targetInput.value) || 50;
  update(raceRef, { stage: "countdown", targetTaps: target })
    .then(() => log("Countdown started"))
    .catch(err => log("Error starting countdown: " + err));
};

restartBtn.onclick = () => {
  set(raceRef, { stage: "idle" })
    .then(() => log("Race reset to idle"))
    .catch(err => log("Error resetting race: " + err));
  remove(playersRef);
};