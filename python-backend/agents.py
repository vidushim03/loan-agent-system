import json
from typing import Dict, Any
from datetime import datetime

from pydantic import BaseModel
from groq import Groq

from models import (
    ConversationState, ConversationStage, ChatMessage, MessageSender,
    StageTransition, LoanApplicationData
)

import os
from dotenv import load_dotenv

groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    groq_client = None
    print("[WARNING] GROQ_API_KEY not set. ExtractionAgent will return empty results.")
else:
    groq_client = Groq(api_key=groq_api_key)

# Mock Databases
MOCK_KYC_DB = {
    "ABCDE1234F": {"full_name": "Vidushi Maheshwari", "age": 21, "phone": "9413196995", "kyc_status": "VERIFIED"},
    "XYZXY1234Z": {"full_name": "Test User", "age": 35, "phone": "9999999999", "kyc_status": "VERIFIED"}
}

MOCK_CREDIT_BUREAU = {
    "ABCDE1234F": {"score": 780, "status": "EXCELLENT", "active_loans": 0},
    "XYZXY1234Z": {"score": 620, "status": "FAIR", "active_loans": 2}
}

class ExtractionAgent:
    @staticmethod
    def extract(message: str, current_stage: ConversationStage) -> Dict[str, Any]:
        """Uses Groq to intelligently extract structured data from user input."""
        
        # Define schemas based on stage
        schema = None
        system_prompt = "You are a data extraction assistant. Extract the requested fields from the user message. Output ONLY valid JSON."
        
        if current_stage == ConversationStage.collect_pan:
            schema = {"pan_number": "string (10 characters, e.g. ABCDE1234F)"}
        elif current_stage == ConversationStage.collect_employment:
            schema = {"employment_type": "string (Salaried, Self-Employed, or Business Owner)"}
        elif current_stage == ConversationStage.collect_income:
            schema = {"monthly_income": "integer (e.g. 50000)"}
        elif current_stage == ConversationStage.collect_loan_details:
            schema = {
                "loan_amount_requested": "integer",
                "preferred_tenure": "integer (in months)",
                "loan_purpose": "string"
            }
        elif current_stage == ConversationStage.collect_existing_obligations:
            schema = {"existing_emi": "integer"}
            
        if not schema:
            return {}

        prompt = f"""
        {system_prompt}
        Expected JSON Schema:
        {json.dumps(schema)}
        
        User Message: "{message}"
        """
        
        try:
            # Simple fallback extraction when Groq is not configured
            if groq_client is None:
                # Basic regex / keyword parsing for required fields
                import re
                result = {}
                if current_stage == ConversationStage.collect_pan:
                    match = re.search(r"[A-Z]{5}[0-9]{4}[A-Z]", message.upper())
                    if match:
                        result["pan_number"] = match.group(0)
                elif current_stage == ConversationStage.collect_employment:
                    # Look for known employment types
                    for typ in ["Salaried", "Self-Employed", "Business Owner"]:
                        if typ.lower() in message.lower():
                            result["employment_type"] = typ
                            break
                elif current_stage == ConversationStage.collect_income:
                    nums = re.findall(r"\d+", message)
                    if nums:
                        result["monthly_income"] = int(nums[0])
                elif current_stage == ConversationStage.collect_loan_details:
                    # Expect format: amount <num>, purpose <text>, tenure <num>
                    amt_match = re.search(r"(\d{5,})", message)
                    tenure_match = re.search(r"(\d{1,3})\s*months", message, re.IGNORECASE)
                    purpose_match = re.search(r"purpose\s*(\w+)", message, re.IGNORECASE)
                    if amt_match:
                        result["loan_amount_requested"] = int(amt_match.group(1))
                    if tenure_match:
                        result["preferred_tenure"] = int(tenure_match.group(1))
                    if purpose_match:
                        result["loan_purpose"] = purpose_match.group(1)
                elif current_stage == ConversationStage.collect_existing_obligations:
                    # Find a number for EMI
                    nums = re.findall(r"\d+", message)
                    if nums:
                        result["existing_emi"] = int(nums[0])
                return result
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print("Extraction Error:", e)
            return {}

def build_summary(loan_data: LoanApplicationData, history: list) -> str:
    parts = []
    if loan_data.full_name: parts.append(f"Name: {loan_data.full_name}")
    if loan_data.pan_number: parts.append(f"PAN: {loan_data.pan_number}")
    if loan_data.employment_type: parts.append(f"Emp: {loan_data.employment_type}")
    if loan_data.monthly_income: parts.append(f"Income: {loan_data.monthly_income}")
    if loan_data.loan_amount_requested: parts.append(f"Requested: {loan_data.loan_amount_requested}")
    if loan_data.credit_score: parts.append(f"Credit: {loan_data.credit_score}")
    
    if history:
        latest = [f"{s.from_stage}->{s.to_stage}" for s in history[-3:]]
        parts.append("Stages: " + ", ".join(latest))
    return " | ".join(parts)


def process_orchestrator(user_message: str, state: ConversationState) -> Dict[str, Any]:
    """The main router logic migrating from orchestrator.ts"""
    
    # 1. Add user message
    msg_id = f"msg_{int(datetime.utcnow().timestamp()*1000)}"
    user_msg = ChatMessage(id=msg_id, sender=MessageSender.user, message=user_message, timestamp=datetime.utcnow().isoformat())
    state.messages.append(user_msg)
    
    response = ""
    new_stage = state.stage
    agent_used = "master"
    
    stage_logic = state.stage
    
    if stage_logic == ConversationStage.greeting:
        response = "Welcome to QuickLoan AI. I can help you apply for a personal loan.\n\nTo verify your identity, please provide your PAN number in this format: ABCDE1234F."
        new_stage = ConversationStage.collect_pan
        
    elif stage_logic == ConversationStage.collect_pan:
        extracted = ExtractionAgent.extract(user_message, state.stage)
        pan = extracted.get("pan_number", "").upper()
        
        if pan and len(pan) == 10:
            kyc = MOCK_KYC_DB.get(pan)
            if kyc:
                state.loan_data.pan_number = pan
                state.loan_data.full_name = kyc["full_name"]
                state.loan_data.age = kyc["age"]
                state.loan_data.phone = kyc["phone"]
                state.kyc_verified = True
                agent_used = "kyc"
                response = f"KYC Verified. Welcome {kyc['full_name']}.\n\nNow, please tell me your employment type (Salaried, Self-Employed, or Business Owner)."
                new_stage = ConversationStage.collect_employment
            else:
                response = f"KYC Failed. No records found for PAN {pan}. Please try again."
        else:
            response = "I couldn't detect a valid 10-character PAN number. Please provide it."

    elif stage_logic == ConversationStage.collect_employment:
        extracted = ExtractionAgent.extract(user_message, state.stage)
        emp = extracted.get("employment_type")
        if emp:
            state.loan_data.employment_type = emp
            response = f"Great, you are {emp}. What is your monthly income in rupees?"
            new_stage = ConversationStage.collect_income
        else:
            response = "Please specify if you are Salaried, Self-Employed, or a Business Owner."

    elif stage_logic == ConversationStage.collect_income:
        extracted = ExtractionAgent.extract(user_message, state.stage)
        income = extracted.get("monthly_income")
        if income and isinstance(income, (int, float)):
            state.loan_data.monthly_income = float(income)
            response = f"Income of INR {income} noted.\n\nPlease share your requested loan amount, purpose, and preferred tenure in months (e.g. 500000 for a wedding over 36 months)."
            new_stage = ConversationStage.collect_loan_details
        else:
            response = "Please enter your monthly income as a number."

    elif stage_logic == ConversationStage.collect_loan_details:
        extracted = ExtractionAgent.extract(user_message, state.stage)
        amt = extracted.get("loan_amount_requested")
        tenure = extracted.get("preferred_tenure")
        purpose = extracted.get("loan_purpose")
        
        if amt and tenure:
            state.loan_data.loan_amount_requested = float(amt)
            state.loan_data.preferred_tenure = int(tenure)
            state.loan_data.loan_purpose = purpose or "Other"
            
            response = f"Captured amount: INR {amt} for {tenure} months.\n\nFinally, do you have any existing monthly EMIs? (Enter 0 if none)."
            new_stage = ConversationStage.collect_existing_obligations
        else:
            response = "Please include the loan amount and tenure in months."

    elif stage_logic == ConversationStage.collect_existing_obligations:
        extracted = ExtractionAgent.extract(user_message, state.stage)
        emi = extracted.get("existing_emi")
        
        if emi is not None:
            state.loan_data.existing_emi = float(emi)
            
            # RUN CREDIT AND UNDERWRITING
            pan = state.loan_data.pan_number
            credit = MOCK_CREDIT_BUREAU.get(pan, {"score": 600, "status": "UNKNOWN", "active_loans": 0})
            
            state.loan_data.credit_score = credit["score"]
            state.loan_data.credit_status = credit["status"]
            state.loan_data.active_loans = credit["active_loans"]
            state.credit_checked = True
            
            agent_used = "underwriting"
            
            # Simple Underwriting rules
            decision = {"approved": True, "rejection_reason": None, "failed_rules": []}
            dti = (state.loan_data.existing_emi / state.loan_data.monthly_income) * 100 if state.loan_data.monthly_income else 100
            
            if state.loan_data.credit_score < 650:
                decision["approved"] = False
                decision["failed_rules"].append(f"Credit score {state.loan_data.credit_score} is below minimum 650.")
            if dti > 50:
                decision["approved"] = False
                decision["failed_rules"].append(f"DTI ratio {dti:.1f}% exceeds maximum 50%.")
                
            response = f"Credit score fetched: {state.loan_data.credit_score}.\n\n"
            if decision["approved"]:
                state.loan_data.sanctioned_amount = state.loan_data.loan_amount_requested
                state.loan_data.interest_rate = 10.5
                # EMI calculation P * r * (1 + r)^n / ((1 + r)^n - 1)
                P = state.loan_data.sanctioned_amount
                r = state.loan_data.interest_rate / 12 / 100
                n = state.loan_data.preferred_tenure
                state.loan_data.monthly_emi = (P * r * ((1+r)**n)) / (((1+r)**n) - 1)
                
                response += f"Congratulations! Your loan of INR {P} is provisionally approved at 10.5% interest."
                new_stage = ConversationStage.approved
            else:
                response += f"Unfortunately, we cannot approve the loan at this time. Failed policies: {', '.join(decision['failed_rules'])}"
                new_stage = ConversationStage.rejected
                
        else:
            response = "Please enter your existing EMI amount."

    else:
        response = "The application process has concluded."
        
    # Append transition
    transition = StageTransition(
        from_stage=state.stage,
        to_stage=new_stage,
        agent_used=agent_used,
        timestamp=datetime.utcnow().isoformat()
    )
    state.stage_history.append(transition)
    state.stage = new_stage
    state.conversation_summary = build_summary(state.loan_data, state.stage_history)
    
    agent_msg = ChatMessage(
        id=f"msg_{int(datetime.utcnow().timestamp()*1000)+1}",
        sender=MessageSender.agent,
        message=response,
        timestamp=datetime.utcnow().isoformat(),
        metadata={"agent_type": agent_used}
    )
    state.messages.append(agent_msg)
    
    return {
        "response": response,
        "updated_state": state,
        "agent_used": agent_used
    }
