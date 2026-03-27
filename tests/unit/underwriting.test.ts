import { UnderwritingAgent } from "../../lib/agents/underwriting-agent";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const agent = new UnderwritingAgent();

const approved = agent.evaluate({
  age: 30,
  employment_type: 'Salaried',
  monthly_income: 90000,
  loan_amount_requested: 500000,
  preferred_tenure: 36,
  existing_emi: 10000,
  credit_score: 780,
});
assert(approved.approved === true, 'Expected approved scenario to pass');

const rejected = agent.evaluate({
  age: 22,
  employment_type: 'Self-Employed',
  monthly_income: 25000,
  loan_amount_requested: 900000,
  preferred_tenure: 24,
  existing_emi: 15000,
  credit_score: 610,
});
assert(rejected.approved === false, 'Expected rejected scenario to fail');
assert((rejected.failed_rules || []).length > 0, 'Rejected decision should include failed rules');

console.log('underwriting.test.ts passed');
