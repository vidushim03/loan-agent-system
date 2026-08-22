import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import ValidationError

from models import OrchestratorInput
from agents import process_orchestrator

import uvicorn
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None
    print("WARNING: Supabase credentials not found. DB logging will be skipped.")

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Python AI Backend is running"}

@app.post("/api/chat")
async def chat(request: Request):
    try:
        body = await request.json()
        
        # Parse and validate input
        try:
            input_data = OrchestratorInput(
                user_message=body.get("message"),
                conversation_state=body.get("conversationState")
            )
        except ValidationError as ve:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {ve}")
            
        # Run agent orchestrator
        result = process_orchestrator(input_data.user_message, input_data.conversation_state)
        updated_state = result["updated_state"]
        agent_used = result["agent_used"]
        response_text = result["response"]
        
        # Log to Supabase (if configured)
        if supabase and updated_state.application_id:
            try:
                # Log User message
                supabase.table("conversation_logs").insert({
                    "application_id": updated_state.application_id,
                    "sender": "user",
                    "message": input_data.user_message
                }).execute()
                
                # Log Agent message
                supabase.table("conversation_logs").insert({
                    "application_id": updated_state.application_id,
                    "sender": "agent",
                    "message": response_text,
                    "metadata": {
                        "agent_type": agent_used,
                        "stage": updated_state.stage.value
                    }
                }).execute()
                
                # Log audit
                supabase.table("agent_audit_logs").insert({
                    "application_id": updated_state.application_id,
                    "user_id": None, # Ideally passed in headers or state
                    "agent_used": agent_used,
                    "from_stage": input_data.conversation_state.stage.value,
                    "to_stage": updated_state.stage.value,
                    "message_excerpt": input_data.user_message[:120],
                    "conversation_summary": updated_state.conversation_summary
                }).execute()
            except Exception as db_err:
                print(f"Supabase Logging Error: {db_err}")

        # Return dict serialization of models
        return {
            "success": True,
            "response": response_text,
            "updated_state": updated_state.model_dump(),
            "agent_used": agent_used
        }
        
    except Exception as e:
        print(f"Chat API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
