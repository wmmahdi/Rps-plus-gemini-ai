import copy


def initial_state():
    """Return a fresh initial game state."""
    return {
        "round": 1,
        "max_rounds": 3,
        "user_score": 0,
        "bot_score": 0,
        "user_bomb_used": False,
        "bot_bomb_used": False,
        "game_over": False,
    }


def clone_state(state):
    """Return a deep copy of the state to prevent accidental mutation."""
    return copy.deepcopy(state)
