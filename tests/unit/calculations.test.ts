import { calculateEMI, calculateDTI, calculateInterestRate } from "../../lib/utils/calculations";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const emi = calculateEMI(500000, 11.5, 36);
assert(emi > 16000 && emi < 17000, `Expected EMI around 16-17k, got ${emi}`);

const dti = calculateDTI(12000, emi, 75000);
assert(dti > 30 && dti < 40, `Expected DTI around 30-40, got ${dti}`);

assert(calculateInterestRate(810) === 10.5, 'Interest for score 810 should be 10.5');
assert(calculateInterestRate(760) === 11.5, 'Interest for score 760 should be 11.5');
assert(calculateInterestRate(640) === 16.0, 'Interest for score 640 should be 16.0');

console.log('calculations.test.ts passed');
