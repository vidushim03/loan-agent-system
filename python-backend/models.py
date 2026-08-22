from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime

class ConversationStage(str, Enum):
    greeting = 'greeting'
    collect_pan = 'collect_pan'
    collect_phone = 'collect_phone'
    collect_employment = 'collect_employment'
    collect_income = 'collect_income'
    collect_loan_details = 'collect_loan_details'
    collect_existing_obligations = 'collect_existing_obligations'
    underwriting = 'underwriting'
    approved = 'approved'
    rejected = 'rejected'
    completed = 'completed'

class MessageSender(str, Enum):
    user = 'user'
    agent = 'agent'

class ChatMessage(BaseModel):
    id: str
    sender: MessageSender
    message: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class LoanApplicationData(BaseModel):
    pan_number: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_income: Optional[float] = None
    company_name: Optional[str] = None
    loan_amount_requested: Optional[float] = None
    loan_purpose: Optional[str] = None
    preferred_tenure: Optional[int] = None
    existing_emi: Optional[float] = None
    has_credit_card: Optional[bool] = None
    credit_card_outstanding: Optional[float] = None
    credit_score: Optional[int] = None
    credit_status: Optional[str] = None
    active_loans: Optional[int] = None
    sanctioned_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    monthly_emi: Optional[float] = None

class StageTransition(BaseModel):
    from_stage: ConversationStage
    to_stage: ConversationStage
    agent_used: str
    timestamp: str

class ConversationState(BaseModel):
    application_id: Optional[str] = None
    stage: ConversationStage
    loan_data: LoanApplicationData = Field(default_factory=LoanApplicationData)
    messages: List[ChatMessage] = Field(default_factory=list)
    kyc_verified: bool = False
    credit_checked: bool = False
    conversation_summary: Optional[str] = None
    stage_history: List[StageTransition] = Field(default_factory=list)

class OrchestratorInput(BaseModel):
    user_message: str
    conversation_state: ConversationState

class OrchestratorOutput(BaseModel):
    response: str
    updated_state: ConversationState
    agent_used: Optional[str] = None
