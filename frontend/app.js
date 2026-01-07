const API_BASE = "http://localhost:8000";

// Existing DOM elements
const roundNumberEl = document.getElementById("roundNumber");
const userScoreEl = document.getElementById("userScore");
const botScoreEl = document.getElementById("botScore");
const userBombEl = document.getElementById("userBomb");
const botBombEl = document.getElementById("botBomb");
const announceEl = document.getElementById("announce");
const badgesEl = document.getElementById("badges");
const logListEl = document.getElementById("logList");
const roundToast = document.getElementById("roundToast");
const toastTitle = document.getElementById("toastTitle");
const toastSub = document.getElementById("toastSub");
const bombBtn = document.getElementById("bombBtn");
const customInput = document.getElementById("customInput");
const sendCustom = document.getElementById("sendCustom");
const restartBtn = document.getElementById("restartBtn");
const moveButtons = document.querySelectorAll("#moveButtons .btn");

// UX Enhancement: New DOM elements
const phaseIndicator = document.getElementById("phaseIndicator");
const phaseText = document.getElementById("phaseText");
const gameOverModal = document.getElementById("gameOverModal");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverScore = document.getElementById("gameOverScore");
const gameOverResult = document.getElementById("gameOverResult");
const gameOverIcon = document.getElementById("gameOverIcon");
const newGameBtn = document.getElementById("newGameBtn");
const moveRevealContainer = document.getElementById("moveRevealContainer");
const userMoveReveal = document.getElementById("userMoveReveal");
const botMoveReveal = document.getElementById("botMoveReveal");
const userMoveValue = document.getElementById("userMoveValue");
const botMoveValue = document.getElementById("botMoveValue");
const hintHelper = document.getElementById("hintHelper");

// Product Enhancement: New DOM elements for intelligence layer
const explainability = document.getElementById("explainability");
const explainText = document.getElementById("explainText");
const insight = document.getElementById("insight");
const insightText = document.getElementById("insightText");
const botThinking = document.getElementById("botThinking");
const roundTransition = document.getElementById("roundTransition");
const transitionTitle = document.getElementById("transitionTitle");
const transitionScore = document.getElementById("transitionScore");
const gameSummary = document.getElementById("gameSummary");
const summaryRounds = document.getElementById("summaryRounds");
const summaryInvalid = document.getElementById("summaryInvalid");
const summaryBomb = document.getElementById("summaryBomb");

let sessionId = null;
let gameState = null;
let isPlaying = false;

// Product Enhancement: Analytics tracking (read-only, for future observability)
let gameAnalytics = {
  invalidMoves: 0,
  bombUsed: false,
  roundsPlayed: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0
};

// UX Enhancement: Update phase indicator
function updatePhaseIndicator(phase) {
  phaseIndicator.classList.remove("resolving", "game-over");
  
  if (phase === "waiting") {
    phaseText.textContent = "Waiting for your move";
  } else if (phase === "resolving") {
    phaseText.textContent = "Resolving round…";
    phaseIndicator.classList.add("resolving");
  } else if (phase === "game-over") {
    phaseText.textContent = "Game over";
    phaseIndicator.classList.add("game-over");
  }
}

async function startGame() {
  try {
    const res = await fetch(`${API_BASE}/start`, { method: "POST" });
    const data = await res.json();
    sessionId = data.session_id;
    gameState = data.state;
    announceEl.textContent = data.message;
    logListEl.innerHTML = "";
    badgesEl.innerHTML = "";
    customInput.value = "";
    setButtonsDisabled(false);
    updateRoundDisplay();
    updateScoreDisplay();
    showToast("New match", "Best of 3. Your move!", "draw");
    
    // UX Enhancement: Reset phase and hide modal
    updatePhaseIndicator("waiting");
    gameOverModal.classList.remove("show");
    
    // Product Enhancement: Reset analytics tracking
    gameAnalytics = {
      invalidMoves: 0,
      bombUsed: false,
      roundsPlayed: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };
    
    // Hide explainability and insights
    explainability.style.display = "none";
    insight.style.display = "none";
    
    // Observability Hook (commented - for future analytics integration)
    // analytics.track("game_started", { session_id: sessionId });
  } catch (err) {
    announceEl.textContent = "Unable to start game. Is the backend running?";
  }
}

// UX Enhancement: Enhanced button disable with visual feedback
function setButtonsDisabled(disabled) {
  moveButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
  sendCustom.disabled = disabled;
  customInput.disabled = gameState?.game_over || disabled;
  
  // Update button label based on game state
  if (gameState?.game_over) {
    sendCustom.textContent = "Game Over";
  } else if (gameState?.round > 1 && !disabled) {
    sendCustom.textContent = "Next Round";
  } else {
    sendCustom.textContent = "Send";
  }
}

function updateRoundDisplay() {
  const currentRound = Math.min(gameState.round, gameState.max_rounds);
  roundNumberEl.textContent = currentRound;
}

function updateScoreDisplay(outcome) {
  // UX Enhancement: Animate score change
  const prevUserScore = parseInt(userScoreEl.textContent) || 0;
  const prevBotScore = parseInt(botScoreEl.textContent) || 0;
  
  userScoreEl.textContent = gameState.user_score;
  botScoreEl.textContent = gameState.bot_score;
  
  // Animate score if it changed
  if (gameState.user_score > prevUserScore) {
    userScoreEl.classList.add("score-update");
    setTimeout(() => userScoreEl.classList.remove("score-update"), 400);
  }
  if (gameState.bot_score > prevBotScore) {
    botScoreEl.classList.add("score-update");
    setTimeout(() => botScoreEl.classList.remove("score-update"), 400);
  }
  
  userBombEl.textContent = gameState.user_bomb_used ? "Bomb used" : "Bomb available";
  botBombEl.textContent = gameState.bot_bomb_used ? "Bomb used" : "Bomb unknown";

  const userCard = userScoreEl.parentElement;
  const botCard = botScoreEl.parentElement;
  userCard.classList.remove("is-winning", "is-losing", "is-draw", "is-invalid");
  botCard.classList.remove("is-winning", "is-losing", "is-draw", "is-invalid");

  if (!outcome) return;
  if (outcome === "user") {
    userCard.classList.add("is-winning");
    botCard.classList.add("is-losing");
  } else if (outcome === "bot") {
    userCard.classList.add("is-losing");
    botCard.classList.add("is-winning");
  } else if (outcome === "draw") {
    userCard.classList.add("is-draw");
    botCard.classList.add("is-draw");
  }
}

function addLogEntry(result) {
  const li = document.createElement("li");
  li.className = "log-item";
  const outcomeLabel = result.valid_move ? result.outcome : "invalid";
  
  // UX Enhancement: Add icons for better readability
  let icon = "";
  let outcomeText = "";
  if (outcomeLabel === "user") {
    icon = "🏆";
    outcomeText = "You win";
  } else if (outcomeLabel === "bot") {
    icon = "❌";
    outcomeText = "Bot wins";
  } else if (outcomeLabel === "draw") {
    icon = "🤝";
    outcomeText = "Draw";
  } else {
    icon = "⚠️";
    outcomeText = "Invalid";
  }
  
  li.innerHTML = `
    <div>
      <strong>Round ${Math.max(gameState.round - 1, 1)}</strong>
      <div class="log-meta">${icon} You: ${result.user_move || "invalid"} • Bot: ${result.bot_move || "n/a"}</div>
    </div>
    <span class="badge ${outcomeLabel === "user" ? "win" : outcomeLabel === "bot" ? "loss" : outcomeLabel === "invalid" ? "invalid" : "draw"}">
      ${outcomeText}
    </span>
  `;
  logListEl.prepend(li);
}

// UX Enhancement: Show move reveal animation
function showMoveReveal(userMove, botMove) {
  userMoveValue.textContent = getMoveEmoji(userMove);
  botMoveValue.textContent = "?";
  
  moveRevealContainer.classList.add("show");
  
  // Show bot move after delay for suspense
  setTimeout(() => {
    botMoveValue.textContent = getMoveEmoji(botMove);
  }, 600);
  
  // Hide after animation completes
  setTimeout(() => {
    moveRevealContainer.classList.remove("show");
  }, 2000);
}

// UX Enhancement: Get emoji for moves
function getMoveEmoji(move) {
  const emojiMap = {
    rock: "🪨",
    paper: "📄",
    scissors: "✂️",
    bomb: "💣"
  };
  return emojiMap[move?.toLowerCase()] || move;
}

// UX Enhancement: Show game over modal
function showGameOverModal() {
  const userWon = gameState.user_score > gameState.bot_score;
  const isDraw = gameState.user_score === gameState.bot_score;
  
  if (userWon) {
    gameOverIcon.textContent = "🎉";
    gameOverIcon.classList.add("celebration");
    gameOverTitle.textContent = "Victory!";
    gameOverResult.textContent = "You won the match!";
  } else if (isDraw) {
    gameOverIcon.textContent = "🤝";
    gameOverTitle.textContent = "Draw!";
    gameOverResult.textContent = "It's a tie!";
  } else {
    gameOverIcon.textContent = "😔";
    gameOverTitle.textContent = "Game Over";
    gameOverResult.textContent = "Bot won the match!";
  }
  
  gameOverScore.textContent = `Final Score: ${gameState.user_score}-${gameState.bot_score}`;
  
  // Product Enhancement: Populate end-of-game summary
  summaryRounds.textContent = gameAnalytics.roundsPlayed;
  summaryInvalid.textContent = gameAnalytics.invalidMoves;
  summaryBomb.textContent = gameAnalytics.bombUsed ? "Yes" : "No";
  
  gameOverModal.classList.add("show");
  updatePhaseIndicator("game-over");
  
  // Remove celebration class after animation
  setTimeout(() => {
    gameOverIcon.classList.remove("celebration");
  }, 1000);
  
  // Observability Hook (commented - for future analytics integration)
  // analytics.track("game_ended", {
  //   outcome: userWon ? "win" : isDraw ? "draw" : "loss",
  //   rounds_played: gameAnalytics.roundsPlayed,
  //   invalid_moves: gameAnalytics.invalidMoves,
  //   bomb_used: gameAnalytics.bombUsed
  // });
}

// UX Enhancement: Handle invalid input with animations
function handleInvalidInput() {
  customInput.classList.add("error-shake");
  setTimeout(() => customInput.classList.remove("error-shake"), 400);
  
  // Highlight valid buttons
  moveButtons.forEach(btn => {
    if (!btn.disabled) {
      btn.classList.add("highlight-valid");
      setTimeout(() => btn.classList.remove("highlight-valid"), 800);
    }
  });
  
  // Show helper hint
  hintHelper.style.display = "block";
  setTimeout(() => {
    hintHelper.style.display = "none";
  }, 3000);
}

// Product Enhancement: Explainability Layer - explains why outcome happened
function showExplainability(userMove, botMove, outcome, isValid) {
  let explanation = "";
  
  if (!isValid) {
    explanation = "Invalid input → Round wasted";
  } else if (outcome === "draw") {
    explanation = `Both played ${userMove} → Draw`;
  } else if (userMove === "bomb") {
    explanation = outcome === "user" 
      ? "Bomb beats everything → You win" 
      : "Both used bomb → Draw";
  } else if (botMove === "bomb") {
    explanation = "Bomb beats everything → Bot wins";
  } else {
    // Classic rules explanation
    const rules = {
      rock: { scissors: "Rock crushes Scissors" },
      paper: { rock: "Paper covers Rock" },
      scissors: { paper: "Scissors cut Paper" }
    };
    
    if (outcome === "user" && rules[userMove]?.[botMove]) {
      explanation = `${rules[userMove][botMove]} → You win`;
    } else if (outcome === "bot" && rules[botMove]?.[userMove]) {
      explanation = `${rules[botMove][userMove]} → Bot wins`;
    }
  }
  
  if (explanation) {
    explainText.textContent = explanation;
    explainability.style.display = "flex";
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      explainability.style.display = "none";
    }, 8000);
  }
}

// Product Enhancement: Passive User Insights - non-intrusive observations
function showUserInsight() {
  let insightMessage = "";
  
  // Consecutive wins/losses
  if (gameAnalytics.consecutiveWins >= 2) {
    insightMessage = "You've won 2 rounds in a row";
  } else if (gameAnalytics.consecutiveLosses >= 2) {
    insightMessage = "Bot is on a winning streak";
  }
  
  // Bomb unused and getting late in game
  if (!gameAnalytics.bombUsed && gameState.round >= 3 && !gameState.user_bomb_used) {
    insightMessage = "Bomb still unused — risky 👀";
  }
  
  // Invalid move happened
  if (gameAnalytics.invalidMoves > 0) {
    insightMessage = `An invalid input cost you ${gameAnalytics.invalidMoves} round${gameAnalytics.invalidMoves > 1 ? 's' : ''}`;
  }
  
  if (insightMessage) {
    insightText.textContent = insightMessage;
    insight.style.display = "block";
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
      insight.style.display = "none";
    }, 6000);
  }
}

// Product Enhancement: Bot Thinking Indicator (UX only, non-blocking)
function showBotThinking(duration = 400) {
  return new Promise((resolve) => {
    botThinking.classList.add("show");
    setTimeout(() => {
      botThinking.classList.remove("show");
      resolve();
    }, duration);
  });
}

// Product Enhancement: Round Transition Card
function showRoundTransition() {
  if (gameState.round > 1 && gameState.round <= gameState.max_rounds) {
    transitionTitle.textContent = `Round ${gameState.round}`;
    transitionScore.textContent = `Score: You ${gameState.user_score} – Bot ${gameState.bot_score}`;
    
    roundTransition.classList.add("show");
    
    setTimeout(() => {
      roundTransition.classList.remove("show");
    }, 1800);
  }
}

// Product Enhancement: Update feedback intensity based on outcome importance
function applyFeedbackIntensity(outcome, userMove, botMove) {
  const userCard = userScoreEl.parentElement;
  const botCard = botScoreEl.parentElement;
  
  // Check if this is a match-winning round
  const isMatchWinning = gameState.user_score === 2 || gameState.bot_score === 2;
  
  // Check if bomb was involved
  const bombInvolved = userMove === "bomb" || botMove === "bomb";
  
  // Remove previous intensity classes
  userCard.classList.remove("match-winning", "bomb-outcome");
  botCard.classList.remove("match-winning", "bomb-outcome");
  
  // Apply intensity gradient
  if (isMatchWinning && outcome === "user") {
    userCard.classList.add("match-winning");
  } else if (isMatchWinning && outcome === "bot") {
    botCard.classList.add("match-winning");
  }
  
  if (bombInvolved) {
    if (outcome === "user") {
      userCard.classList.add("bomb-outcome");
    } else if (outcome === "bot") {
      botCard.classList.add("bomb-outcome");
    }
  }
}

function showToast(title, sub, tone) {
  toastTitle.textContent = title;
  toastSub.textContent = sub;
  roundToast.classList.remove("win", "loss", "draw");
  roundToast.classList.add("show");
  setTimeout(() => roundToast.classList.remove("show"), 1800);
}

function renderBadges(result) {
  badgesEl.innerHTML = "";
  const add = (text, cls) => {
    const b = document.createElement("span");
    b.className = `badge ${cls}`;
    b.textContent = text;
    badgesEl.appendChild(b);
  };

  if (!result.valid_move) {
    add("Invalid move", "invalid");
    return;
  }

  if (result.user_move === "bomb") add("You used bomb", "bomb");
  if (result.bot_move === "bomb") add("Bot used bomb", "bomb");

  if (result.outcome === "user") add("You win the round", "win");
  if (result.outcome === "bot") add("Bot wins the round", "loss");
  if (result.outcome === "draw") add("Draw", "draw");
}

async function sendMove(moveText) {
  if (isPlaying || !sessionId) return;
  isPlaying = true;
  setButtonsDisabled(true);
  announceEl.textContent = "Refereeing…";
  
  // UX Enhancement: Update phase to resolving
  updatePhaseIndicator("resolving");
  
  // Product Enhancement: Show bot thinking indicator (UX only, 400ms)
  await showBotThinking(400);

  try {
    const res = await fetch(`${API_BASE}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, user_input: moveText })
    });

    if (!res.ok) throw new Error("Play failed");
    const data = await res.json();
    gameState = data.state;
    
    // Product Enhancement: Update analytics (read-only tracking)
    gameAnalytics.roundsPlayed++;
    if (!data.valid_move) {
      gameAnalytics.invalidMoves++;
    }
    if (data.user_move === "bomb") {
      gameAnalytics.bombUsed = true;
    }
    
    // Track consecutive wins/losses for insights
    if (data.outcome === "user") {
      gameAnalytics.consecutiveWins++;
      gameAnalytics.consecutiveLosses = 0;
    } else if (data.outcome === "bot") {
      gameAnalytics.consecutiveLosses++;
      gameAnalytics.consecutiveWins = 0;
    } else {
      gameAnalytics.consecutiveWins = 0;
      gameAnalytics.consecutiveLosses = 0;
    }

    updateRoundDisplay();
    updateScoreDisplay(data.outcome);
    renderBadges(data);
    addLogEntry(data);

    if (!data.valid_move) {
      announceEl.textContent = data.error || "Invalid input. Round wasted.";
      showToast("Invalid move", "That round was wasted.", "draw");
      userScoreEl.parentElement.classList.add("is-invalid");
      
      // UX Enhancement: Show invalid input feedback
      handleInvalidInput();
      
      // Product Enhancement: Show explainability
      showExplainability(null, null, null, false);
      
      // Observability Hook (commented - for future analytics integration)
      // analytics.track("invalid_move", { input: moveText });
    } else {
      announceEl.textContent = data.message;
      
      // Product Enhancement: Apply feedback intensity gradient
      applyFeedbackIntensity(data.outcome, data.user_move, data.bot_move);
      
      // UX Enhancement: Show move reveal animation
      showMoveReveal(data.user_move, data.bot_move);
      
      // Product Enhancement: Show explainability layer
      showExplainability(data.user_move, data.bot_move, data.outcome, true);
      
      // UX Enhancement: Bomb explosion effect
      if (data.user_move === "bomb") {
        bombBtn.classList.add("exploding");
        setTimeout(() => bombBtn.classList.remove("exploding"), 600);
        
        // Observability Hook (commented - for future analytics integration)
        // analytics.track("bomb_used", { outcome: data.outcome });
      }
      
      // UX Enhancement: Screen shake for bomb win
      if (data.user_move === "bomb" && data.outcome === "user") {
        document.body.classList.add("bomb-win-shake");
        setTimeout(() => document.body.classList.remove("bomb-win-shake"), 500);
      }
      
      const tone = data.outcome === "user" ? "win" : data.outcome === "bot" ? "loss" : "draw";
      showToast(data.outcome === "draw" ? "Round draw" : `${data.outcome === "user" ? "You" : "Bot"} win`, `You: ${data.user_move} • Bot: ${data.bot_move}`, tone);
      
      // Observability Hook (commented - for future analytics integration)
      // analytics.track("round_completed", {
      //   round: gameState.round - 1,
      //   user_move: data.user_move,
      //   bot_move: data.bot_move,
      //   outcome: data.outcome
      // });
    }

    if (gameState.game_over) {
      setButtonsDisabled(true);
      const final = gameState.user_score === gameState.bot_score ? "It's a tie." : gameState.user_score > gameState.bot_score ? "You win the match!" : "Bot wins the match.";
      announceEl.textContent = `${final} Final score ${gameState.user_score}-${gameState.bot_score}.`;
      
      // UX Enhancement: Show game over modal
      setTimeout(() => showGameOverModal(), 2200);
    } else {
      setButtonsDisabled(false);
      // UX Enhancement: Update phase back to waiting
      updatePhaseIndicator("waiting");
      
      // Product Enhancement: Show passive user insights
      setTimeout(() => showUserInsight(), 500);
      
      // Product Enhancement: Show round transition card
      setTimeout(() => showRoundTransition(), 1000);
    }

    bombBtn.disabled = gameState.user_bomb_used || gameState.game_over;
  } catch (err) {
    announceEl.textContent = "Network error. Please ensure backend is running.";
    updatePhaseIndicator("waiting");
  } finally {
    isPlaying = false;
  }
}

moveButtons.forEach((btn) =>
  btn.addEventListener("click", () => sendMove(btn.dataset.move))
);
sendCustom.addEventListener("click", () => {
  if (!customInput.value.trim()) return;
  sendMove(customInput.value.trim());
});
customInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendCustom.click();
  }
});
restartBtn.addEventListener("click", startGame);

// UX Enhancement: New game button in modal
newGameBtn.addEventListener("click", startGame);

startGame();
