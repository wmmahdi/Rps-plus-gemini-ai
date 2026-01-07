import os
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent import Agent
from .game_state import clone_state, initial_state

app = FastAPI(title="Rock Paper Scissors Plus Referee")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = Agent()
sessions = {}


class PlayRequest(BaseModel):
    session_id: str
    user_input: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/start")
def start_game():
    session_id = str(uuid4())
    state = initial_state()
    sessions[session_id] = state
    return {
        "session_id": session_id,
        "state": clone_state(state),
        "message": "New game started. Best of 3. Bomb beats all but can only be used once!",
    }


@app.post("/play")
def play_round(request: PlayRequest):
    state = sessions.get(request.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    result = agent.play_round(state, request.user_input)
    sessions[request.session_id] = state
    return {"session_id": request.session_id, **result}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
