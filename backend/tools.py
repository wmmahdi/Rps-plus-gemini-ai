import random
from typing import Optional, Tuple

VALID_MOVES = {"rock", "paper", "scissors", "bomb"}


def validate_move(move: Optional[str], user_bomb_used: bool) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Normalize and validate a move.

    Returns: (is_valid, normalized_move, error_message)
    - normalized_move is lowercased and stripped when valid.
    - Bomb can only be used once per player per game.
    """
    if move is None:
        return False, None, "No move provided"

    normalized = move.strip().lower()
    if normalized not in VALID_MOVES:
        return False, None, "Invalid move"

    if normalized == "bomb" and user_bomb_used:
        return False, None, "Bomb already used"

    return True, normalized, None


def generate_bot_move(bot_bomb_used: bool) -> str:
    """Generate a random bot move while respecting the single-bomb rule."""
    if bot_bomb_used:
        return random.choice(["rock", "paper", "scissors"])

    # Give bomb a smaller chance so gameplay feels fair.
    moves = ["rock", "paper", "scissors", "bomb"]
    weights = [0.3, 0.3, 0.3, 0.1]
    return random.choices(moves, weights=weights, k=1)[0]


def resolve_round(user_move: str, bot_move: str) -> str:
    """
    Resolve a round given valid moves.

    Returns: "user" | "bot" | "draw"
    """
    if user_move == bot_move:
        return "draw"

    if user_move == "bomb":
        return "user"
    if bot_move == "bomb":
        return "bot"

    beats = {
        "rock": "scissors",
        "scissors": "paper",
        "paper": "rock",
    }
    return "user" if beats[user_move] == bot_move else "bot"


def update_game_state(
    state: dict,
    outcome: str,
    user_move: Optional[str],
    bot_move: Optional[str],
    valid_move: bool,
) -> dict:
    """
    Mutate and return the state based on the round outcome.

    - Increments round even when the user move is invalid.
    - Scores update only on valid moves.
    - Tracks bomb usage for both players.
    - Marks game_over after exceeding max_rounds.
    """
    if state.get("game_over"):
        return state

    if valid_move and user_move:
        if user_move == "bomb":
            state["user_bomb_used"] = True
        if bot_move == "bomb":
            state["bot_bomb_used"] = True

        if outcome == "user":
            state["user_score"] += 1
        elif outcome == "bot":
            state["bot_score"] += 1
    # invalid move: no score changes

    state["round"] += 1

    if state["round"] > state["max_rounds"]:
        state["game_over"] = True
        state["round"] = state["max_rounds"]

    return state
