# Party Repo 🎉

Multiplayer web experiences built for large audiences, projector-friendly UIs, and celebratory group dynamics.  
This repo hosts **Tap Race**, **Bingo**, and **Lucky Draw**, all powered by Firebase (`github-party` project).

---

## 🚀 Features

- **Tap Race**
  - Real-time multiplayer tapping game.
  - Stage-driven UI with projector support.
  - Smooth bar animations, distinct player colors (4-color cycle).
  - Bold player names outside bars, responsive scaling.
  - Pulsing animation highlights the winner.
  - Robust debugging with guard flags and console logs.

- **Bingo**
  - Classic multiplayer bingo game.
  - Master and guest pages aligned for projector use.
  - Files relocated to root for simpler hosting.
  - Updated join URL in `bingo_master.html`.

- **Lucky Draw**
  - Guest/admin two-page flow (`number.html` + `number_master.html`).
  - Results stored in Firestore with formatted timestamps (GMT+8).
  - Timestamp-based reset flag prevents infinite reload loops.

---

## 📂 Repo Structure

- `tap.html` → Guest page for Tap Race  
- `tap_master.html` → Master page for Tap Race  
- `bingo.html` → Guest page for Bingo  
- `bingo_master.html` → Master page for Bingo  
- `number.html` → Guest page for Lucky Draw  
- `number_master.html` → Admin page for Lucky Draw  
- `css/` → Shared styles  
- `js/` → Shared scripts (Firebase logic, animations)  

---

## 🔑 Firebase Setup

- Project: **github-party**
- Services: Firestore + Anonymous Authentication
- Usage:
  - Firestore stores game state and results.
  - Anonymous auth ensures guests/masters can join without permission errors.
  - Reset flags used to clear stale state between rounds.

---

## 🛠️ Development Notes

- **Debugging:** Console logs + empirical validation for race conditions.
- **UI Design:** Projector-friendly layouts, square grids, celebratory animations.
- **Consistency:** Master/guest flows aligned across games for clarity and fairness.
- **Deployment:** Hosted under `Vineroz-base`.

---

## 🎯 Roadmap

- Add new party games (Trivia Showdown, Emoji Charades).
- Harden guest logic to reset stale state after master restarts.
- Expand celebratory feedback (confetti, sound effects).
- Improve mobile responsiveness for guest pages.

---

## 📜 License

MIT License. Free to use, modify, and share.
