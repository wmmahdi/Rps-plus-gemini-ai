import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv

from .game_state import clone_state
from .tools import (
    generate_bot_move,
    resolve_round,
    update_game_state,
    validate_move,
)

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - graceful degradation when package missing
    genai = None

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"


class Agent:
    """Gemini-powered agent orchestrating intent understanding and tool execution."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        if self.api_key and genai:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(MODEL_NAME)

    def _call_gemini(self, prompt: str) -> Optional[str]:
        if not self.model:
            return None
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return None

    def interpret_user_move(
        self, user_text: str, user_bomb_used: bool
    ) -> Dict[str, Any]:
        """
        Interpret user intent into a normalized move.

        Uses direct validation first, then Gemini classification as a backup.
        """
        is_valid, normalized, error = validate_move(user_text, user_bomb_used)
        if is_valid:
            return {
                "valid": True,
                "move": normalized,
                "error": None,
                "source": "direct",
            }

        gemini_prompt = (
            "You are a strict classifier for Rock-Paper-Scissors-Plus. "
            "Allowed tokens: rock, paper, scissors, bomb. "
            "Reply with exactly one token if the text clearly maps; otherwise reply 'invalid'.\n"
            f"User text: {user_text!r}"
        )
        candidate = self._call_gemini(gemini_prompt)
        if candidate:
            is_valid, normalized, error = validate_move(candidate, user_bomb_used)
            if is_valid:
                return {
                    "valid": True,
                    "move": normalized,
                    "error": None,
                    "source": "gemini",
                }

        return {
            "valid": False,
            "move": None,
            "error": error or "Invalid move",
            "source": "failed",
        }

    def summarize_round(
        self,
        round_number: int,
        user_move: Optional[str],
        bot_move: Optional[str],
        outcome: str,
        state: Dict[str, Any],
        valid_move: bool,
    ) -> str:
        """Produce a short announcer-style summary using Gemini when available."""
        base = (
            f"Round {round_number} | "
            f"User move: {user_move or 'invalid'} | Bot move: {bot_move or 'n/a'} | "
            f"Outcome: {outcome}. "
            f"Score — You {state['user_score']} : Bot {state['bot_score']}."
        )

        if not self.model:
            return base

        prompt = (
            "You are the energetic referee of a Rock-Paper-Scissors-Plus game. "
            "Keep it to one short sentence. Mention round, moves, outcome, and score. "
            "Do not invent any data. Here are the facts: "
            + base
        )
        ai_text = self._call_gemini(prompt)
        return ai_text or base

    def play_round(self, state: Dict[str, Any], user_text: str) -> Dict[str, Any]:
        if state.get("game_over"):
            return {
                "state": clone_state(state),
                "message": "Game already finished.",
                "outcome": "complete",
                "valid_move": False,
            }

        interpretation = self.interpret_user_move(user_text, state["user_bomb_used"])
        valid_move = interpretation["valid"]
        user_move = interpretation["move"] if valid_move else None

        bot_move = generate_bot_move(state["bot_bomb_used"]) if valid_move else None
        outcome = resolve_round(user_move, bot_move) if valid_move else "draw"

        update_game_state(state, outcome, user_move, bot_move, valid_move)

        summary = self.summarize_round(
            state["round"] - 1,  # round number just completed
            user_move,
            bot_move,
            outcome,
            state,
            valid_move,
        )

        return {
            "state": clone_state(state),
            "user_move": user_move,
            "bot_move": bot_move,
            "outcome": outcome,
            "valid_move": valid_move,
            "error": None if valid_move else interpretation["error"],
            "source": interpretation["source"],
            "message": summary,
        }
