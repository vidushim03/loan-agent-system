INSERT INTO kyc_profiles (pan_number, full_name, date_of_birth, phone, kyc_status)
VALUES
  ('ABCDE1234F', 'Rajesh Kumar', '1988-03-20', '9876543211', 'VERIFIED'),
  ('FGHIJ5678K', 'Priya Sharma', '1992-11-08', '9876543212', 'VERIFIED'),
  ('BADPA0456N', 'Demo User', '1995-11-20', '9876543213', 'VERIFIED')
ON CONFLICT (pan_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  phone = EXCLUDED.phone,
  kyc_status = EXCLUDED.kyc_status,
  updated_at = NOW();

INSERT INTO credit_profiles (pan_number, score, status, active_loans, credit_history_years, defaults)
VALUES
  ('ABCDE1234F', 820, 'Excellent payment history', 2, 10, 0),
  ('FGHIJ5678K', 720, 'Good payment history', 2, 5, 0),
  ('BADPA0456N', 660, 'Some late payments', 3, 4, 0)
ON CONFLICT (pan_number) DO UPDATE SET
  score = EXCLUDED.score,
  status = EXCLUDED.status,
  active_loans = EXCLUDED.active_loans,
  credit_history_years = EXCLUDED.credit_history_years,
  defaults = EXCLUDED.defaults,
  updated_at = NOW();

INSERT INTO underwriting_policies (
  policy_name,
  version,
  min_age,
  max_age,
  min_income_salaried,
  min_income_self_employed,
  min_credit_score,
  max_dti_ratio,
  max_loan_multiplier_salaried,
  max_loan_multiplier_self_employed,
  active
)
VALUES (
  'Default Personal Loan Policy',
  1,
  21,
  60,
  25000,
  40000,
  650,
  50,
  10,
  5,
  TRUE
);
