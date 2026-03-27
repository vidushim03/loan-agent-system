/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConversationStage, OrchestratorInput, OrchestratorOutput, ChatMessage, StageTransition } from '@/types';
import { KYCAgent } from './kyc-agent';
import { CreditAgent } from './credit-agent';
import { UnderwritingAgent } from './underwriting-agent';
import { v4 as uuidv4 } from 'uuid';

export class Orchestrator {
  private kycAgent: KYCAgent;
  private creditAgent: CreditAgent;
  private underwritingAgent: UnderwritingAgent;

  constructor() {
    this.kycAgent = new KYCAgent();
    this.creditAgent = new CreditAgent();
    this.underwritingAgent = new UnderwritingAgent();
  }

  async process(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const { user_message, conversation_state } = input;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      sender: 'user',
      message: user_message,
      timestamp: new Date(),
    };

    const updatedMessages = [...conversation_state.messages, userMsg];

    let response = '';
    let newStage = conversation_state.stage;
    let updatedLoanData = { ...conversation_state.loan_data };
    let agentUsed = 'master';
    let kycVerified = conversation_state.kyc_verified;
    let creditChecked = conversation_state.credit_checked;

    switch (conversation_state.stage) {
      case 'greeting':
        response = await this.handleGreeting();
        newStage = 'collect_pan';
        break;

      case 'collect_pan': {
        const panResult = await this.handlePANCollection(user_message);
        if (panResult.success && panResult.data) {
          updatedLoanData = {
            ...updatedLoanData,
            pan_number: panResult.data.pan_number,
            full_name: panResult.data.full_name,
            age: panResult.data.age,
            phone: panResult.data.phone,
          };
          kycVerified = true;
          newStage = 'collect_employment';
          response = panResult.response;
          agentUsed = 'kyc';
        } else {
          response = panResult.response;
          newStage = 'collect_pan';
        }
        break;
      }

      case 'collect_employment': {
        const empResult = await this.handleEmploymentCollection(user_message);
        updatedLoanData = { ...updatedLoanData, ...empResult.data };
        response = empResult.response;
        newStage = empResult.nextStage;
        break;
      }

      case 'collect_income': {
        const incomeResult = await this.handleIncomeCollection(user_message);
        updatedLoanData = { ...updatedLoanData, ...incomeResult.data };
        response = incomeResult.response;
        newStage = incomeResult.nextStage;
        break;
      }

      case 'collect_loan_details': {
        const loanResult = await this.handleLoanDetailsCollection(user_message);
        updatedLoanData = { ...updatedLoanData, ...loanResult.data };
        response = loanResult.response;
        newStage = loanResult.nextStage;
        break;
      }

      case 'collect_existing_obligations': {
        const emiResult = await this.handleEMICollection(user_message);
        updatedLoanData = { ...updatedLoanData, ...emiResult.data };
        response = emiResult.response;
        newStage = emiResult.nextStage;

        if (newStage === 'underwriting' && updatedLoanData.pan_number) {
          const creditResult = await this.creditAgent.checkCredit(updatedLoanData.pan_number);
          if (creditResult.success && creditResult.data) {
            updatedLoanData.credit_score = creditResult.data.score;
            updatedLoanData.credit_status = creditResult.data.status;
            updatedLoanData.active_loans = creditResult.data.active_loans;
            creditChecked = true;

            response += '\n\n' + this.creditAgent.generateResponse(creditResult);
            response += '\n\nAnalyzing your application...';
            agentUsed = 'credit';
          }
        }
        break;
      }

      case 'underwriting': {
        const decision = this.underwritingAgent.evaluate(updatedLoanData);
        response = this.underwritingAgent.generateResponse(decision, updatedLoanData.full_name || 'Customer');

        if (decision.approved) {
          updatedLoanData.sanctioned_amount = decision.sanctioned_amount;
          updatedLoanData.interest_rate = decision.interest_rate;
          updatedLoanData.monthly_emi = decision.monthly_emi;
          newStage = 'approved';
        } else {
          newStage = 'rejected';
        }
        agentUsed = 'underwriting';
        break;
      }

      case 'approved':
      case 'rejected':
        response = 'Your application has been processed. Thank you for using QuickLoan.';
        newStage = 'completed';
        break;

      default:
        response = 'Something went wrong. Let us start a new application.';
        newStage = 'greeting';
    }

    const transition: StageTransition = {
      from_stage: conversation_state.stage,
      to_stage: newStage,
      agent_used: agentUsed,
      timestamp: new Date().toISOString(),
    };

    const stageHistory = [...(conversation_state.stage_history ?? []), transition];
    const conversationSummary = this.buildSummary(updatedLoanData, stageHistory);

    const agentMsg: ChatMessage = {
      id: uuidv4(),
      sender: 'agent',
      message: response,
      timestamp: new Date(),
      metadata: {
        agent_type: agentUsed,
      },
    };

    const finalMessages = [...updatedMessages, agentMsg];

    return {
      response,
      updated_state: {
        ...conversation_state,
        stage: newStage,
        loan_data: updatedLoanData,
        messages: finalMessages,
        kyc_verified: kycVerified,
        credit_checked: creditChecked,
        stage_history: stageHistory,
        conversation_summary: conversationSummary,
      },
      agent_used: agentUsed,
    };
  }

  private buildSummary(loanData: Record<string, any>, stageHistory: StageTransition[]): string {
    const latest = stageHistory.slice(-4).map((s) => `${s.from_stage}->${s.to_stage}`).join(', ');
    const parts = [
      loanData.full_name ? `Name: ${loanData.full_name}` : null,
      loanData.pan_number ? `PAN: ${loanData.pan_number}` : null,
      loanData.employment_type ? `Employment: ${loanData.employment_type}` : null,
      loanData.monthly_income ? `Income: INR ${loanData.monthly_income}` : null,
      loanData.loan_amount_requested ? `Requested: INR ${loanData.loan_amount_requested}` : null,
      loanData.credit_score ? `Credit: ${loanData.credit_score}` : null,
      latest ? `Recent stages: ${latest}` : null,
    ].filter(Boolean);

    return parts.join(' | ');
  }

  private async handleGreeting(): Promise<string> {
    return `Welcome to QuickLoan. I can help you apply for a personal loan.\n\nTo verify your identity, please provide your PAN number in this format: ABCDE1234F.`;
  }

  private async handlePANCollection(message: string): Promise<{ success: boolean; data?: any; response: string }> {
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]/gi;
    const panMatch = message.match(panRegex);

    if (!panMatch) {
      return {
        success: false,
        response: 'I could not find a valid PAN number. Please share PAN in this format: ABCDE1234F.',
      };
    }

    const pan = panMatch[0].toUpperCase();
    const kycResult = await this.kycAgent.verify(pan);

    if (!kycResult.success) {
      return {
        success: false,
        response: this.kycAgent.generateResponse(kycResult),
      };
    }

    const successResponse = this.kycAgent.generateResponse(kycResult);
    const nextQuestion = '\n\nNow tell me your employment type: Salaried, Self-Employed, or Business Owner.';

    return {
      success: true,
      data: kycResult.data,
      response: successResponse + nextQuestion,
    };
  }

  private async handleEmploymentCollection(message: string): Promise<{ data: any; response: string; nextStage: ConversationStage }> {
    const lowerMsg = message.toLowerCase();
    let employmentType: string | undefined;

    if (lowerMsg.includes('salaried') || lowerMsg.includes('1')) employmentType = 'Salaried';
    else if (lowerMsg.includes('self') || lowerMsg.includes('2')) employmentType = 'Self-Employed';
    else if (lowerMsg.includes('business') || lowerMsg.includes('3')) employmentType = 'Business Owner';

    if (!employmentType) {
      return {
        data: {},
        response: 'Please choose one: Salaried, Self-Employed, or Business Owner.',
        nextStage: 'collect_employment',
      };
    }

    return {
      data: { employment_type: employmentType as any },
      response: `Great. You are ${employmentType}. What is your monthly income in rupees?`,
      nextStage: 'collect_income',
    };
  }

  private async handleIncomeCollection(message: string): Promise<{ data: any; response: string; nextStage: ConversationStage }> {
    const numberMatch = message.match(/[\d,]+/);
    if (!numberMatch) {
      return {
        data: {},
        response: 'Please enter monthly income as a number, for example 50000.',
        nextStage: 'collect_income',
      };
    }

    const income = parseInt(numberMatch[0].replace(/,/g, ''));

    if (income < 10000) {
      return {
        data: {},
        response: 'That looks too low. Please enter monthly income in rupees, for example 50000.',
        nextStage: 'collect_income',
      };
    }

    return {
      data: { monthly_income: income },
      response: `Income of INR ${income.toLocaleString('en-IN')} noted.\n\nNow share loan amount, purpose, and tenure (months).`,
      nextStage: 'collect_loan_details',
    };
  }

  private async handleLoanDetailsCollection(message: string): Promise<{ data: any; response: string; nextStage: ConversationStage }> {
    const data: any = {};

    const amountMatch = message.match(/[\d,]+/);
    if (amountMatch) data.loan_amount_requested = parseInt(amountMatch[0].replace(/,/g, ''));

    const tenureMatch = message.match(/(\d+)\s*(month|months|mo)/i);
    if (tenureMatch) data.preferred_tenure = parseInt(tenureMatch[1]);

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('wedding')) data.loan_purpose = 'Wedding';
    else if (lowerMsg.includes('education')) data.loan_purpose = 'Education';
    else if (lowerMsg.includes('medical')) data.loan_purpose = 'Medical';
    else if (lowerMsg.includes('home') || lowerMsg.includes('renovation')) data.loan_purpose = 'Home Renovation';
    else if (lowerMsg.includes('business')) data.loan_purpose = 'Business';
    else data.loan_purpose = 'Other';

    if (!data.loan_amount_requested || !data.preferred_tenure) {
      return {
        data: {},
        response: 'Please include loan amount and tenure in months. Example: 500000 wedding 36 months.',
        nextStage: 'collect_loan_details',
      };
    }

    return {
      data,
      response: `Captured:\n- Amount: INR ${data.loan_amount_requested.toLocaleString('en-IN')}\n- Purpose: ${data.loan_purpose}\n- Tenure: ${data.preferred_tenure} months\n\nLast question: do you have any existing monthly EMIs? Enter 0 if none.`,
      nextStage: 'collect_existing_obligations',
    };
  }

  private async handleEMICollection(message: string): Promise<{ data: any; response: string; nextStage: ConversationStage }> {
    const numberMatch = message.match(/[\d,]+/);
    const existingEMI = numberMatch ? parseInt(numberMatch[0].replace(/,/g, '')) : 0;

    return {
      data: { existing_emi: existingEMI },
      response: `Existing EMI of INR ${existingEMI.toLocaleString('en-IN')} noted. Fetching credit score now...`,
      nextStage: 'underwriting',
    };
  }
}
