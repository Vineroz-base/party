import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, update, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

function log(msg) { console.log(msg); }
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setStage(stage) {
  [idleEl, waitingEl, countdownEl, activeEl, finishedEl].forEach(el => hide(el));

  if (stage === "idle") {
    show(idleEl);
    renderWaiting(false);
  }
  if (stage === "waiting") {
    show(waitingEl);
    renderWaiting(!!uid && !!playerRef);
  }
  if (stage === "countdown") {
    show(countdownEl);
  }
  if (stage === "active") {
    show(activeEl);
  }
  if (stage === "finished") {
    show(finishedEl);
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

let playerRef = null;
let raceRef = ref(db, "tapRace/currentRace");
let targetTaps = 0;
let tapCount = 0;
let playerName = "";
let uid = null;
let joining = false;
let finishTimeRecorded = false;

// Elements
const idleEl = document.getElementById("idle");
const waitingEl = document.getElementById("waiting");
const countdownEl = document.getElementById("countdown");
const activeEl = document.getElementById("active");
const finishedEl = document.getElementById("finished");

const countdownNum = document.getElementById("countdownNum");
const tapBtn = document.getElementById("tapBtn");
const winnerBanner = document.getElementById("winnerBanner");
const finishMessage = document.getElementById("finishMessage");
const finishSub = document.getElementById("finishSub");

const waitingForm = document.getElementById("waitingForm");
const waitingStatus = document.getElementById("waitingStatus");
const waitingName = document.getElementById("waitingName");

function renderWaiting(joined) {
  if (joined) {
    hide(waitingForm);
    if (waitingName) waitingName.textContent = playerName || "Guest";
    show(waitingStatus);
  } else {
    // Reset form to a clean state
    const nameInput = document.getElementById("nameInput");
    if (nameInput) nameInput.value = "";
    show(waitingForm);
    hide(waitingStatus);
  }
}

async function init() {
  try {
    await signInAnonymously(auth);
    log("Signed in anonymously, UID: " + auth.currentUser.uid);
  } catch (err) {
    log("Auth error: " + err);
  }

  // Attach Ready button once (static join form in waitingEl)
  const nameInput = document.getElementById("nameInput");
  const readyBtn = document.getElementById("readyBtn");

  if (readyBtn) {
    readyBtn.onclick = () => {
      uid = auth.currentUser.uid;
      playerName = (nameInput?.value.trim()) || "Guest";
      playerRef = ref(db, "tapRace/players/" + uid);

      set(playerRef, { name: playerName, tapCount: 0 })
        .then(() => {
          localStorage.setItem("tapRaceUid", uid);
          renderWaiting(true);      // show joined status immediately
          setStage("waiting");      // keep user in waiting stage
        })
        .catch(err => log("[READY] Error writing player record: " + err));
    };
  }

  // Restore saved UID if present
  const savedUid = localStorage.getItem("tapRaceUid");
  if (savedUid) {
    uid = savedUid;
    playerRef = ref(db, "tapRace/players/" + uid);
    onValue(playerRef, (snap) => {
      const player = snap.val();
      if (player) {
        playerName = player.name;
        tapCount = player.tapCount || 0;
      } else {
        // Reset if player record missing
        localStorage.removeItem("tapRaceUid");
        uid = null;
        playerRef = null;
        tapCount = 0;
        playerName = "";
        setStage("waiting");
      }
    });
  }

  // Race listener
  onValue(raceRef, (snap) => {
    const race = snap.val();
    if (!race) return;

    const stage = race.stage;
    targetTaps = race.targetTaps || 0;

    if (stage === "idle") {
      // Full reset
      localStorage.removeItem("tapRaceUid");
      uid = null;
      playerRef = null;
      playerName = "";
      tapCount = 0;
      finishTimeRecorded = false;
      winnerBanner.classList.add("hidden");
      setStage("idle");            // ensures renderWaiting(false)
      return;
    }

    if (stage === "waiting") {
      setStage("waiting");         // renderWaiting based on uid/playerRef
      finishTimeRecorded = false;
      return;
    }

    if (stage === "countdown") {
      setStage("countdown");
      let count = 5;
      countdownNum.textContent = count;
      if (window.countdownInterval) clearInterval(window.countdownInterval);
      window.countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          countdownNum.textContent = count;
        } else {
          clearInterval(window.countdownInterval);
        }
      }, 1000);
      return;
    }

    if (stage === "active") {
      if (!uid || !playerRef) {
        // Not joined—no tap button
        setStage("finished");
        finishMessage.textContent = "Race is in progress.";
        finishSub.textContent = "Please wait for the next game to start.";
        return;
      }
      tapBtn.style.visibility = "hidden"; // hide first
      setStage("active");
      tapBtn.disabled = false;
      const remaining = targetTaps - tapCount;
      tapBtn.textContent = remaining > 0 ? remaining : "Done!";
      if (tapCount >= targetTaps) {
        tapBtn.disabled = true;
      } else {
        moveButtonRandom();
      }
      tapBtn.style.visibility = "visible"; // show only after update
    }

    if (stage === "finished") {
      setStage("finished");
      if (tapCount >= targetTaps) {
        finishMessage.textContent = "🎉 You finished!";
        finishSub.textContent = "Waiting for results...";
      } else {
        finishMessage.textContent = "The race is now finished.";
        finishSub.textContent = "Please wait for a new race to start.";
      }
      if (race.winnerName) {
        finishSub.textContent = "Winner: " + race.winnerName;
        if (playerName === race.winnerName) {
          winnerBanner.classList.remove("hidden");
          confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
        }
      }
    }
  });

  // Tap button logic
  tapBtn.onclick = () => {
    if (tapCount >= targetTaps) return;
    tapCount++;
    if (tapCount >= targetTaps && !finishTimeRecorded) {
      finishTimeRecorded = true;
      update(ref(db, "tapRace/players/" + uid), { tapCount, finishTime: Date.now() });
    } else {
      update(ref(db, "tapRace/players/" + uid), { tapCount });
    }
    const remaining = targetTaps - tapCount;
    if (tapCount >= targetTaps) {
      tapBtn.textContent = "Done!";
      tapBtn.disabled = true;
    } else {
      tapBtn.textContent = remaining;
      moveButtonRandom();
    }
  };

  function moveButtonRandom() {
    const btnSize = 90;
    const maxX = window.innerWidth - btnSize;
    const maxY = window.innerHeight - btnSize;
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    tapBtn.style.left = x + "px";
    tapBtn.style.top = y + "px";
  }

  moveButtonRandom();
}

init();
