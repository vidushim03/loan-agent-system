CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS kyc_profiles (
    pan_number VARCHAR(10) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(10) NOT NULL,
    kyc_status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_profiles (
    pan_number VARCHAR(10) PRIMARY KEY,
    score INTEGER NOT NULL,
    status VARCHAR(120) NOT NULL,
    active_loans INTEGER DEFAULT 0,
    credit_history_years INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pan_number VARCHAR(10),
    full_name VARCHAR(100),
    age INTEGER,
    phone VARCHAR(10),
    employment_type VARCHAR(20),
    monthly_income DECIMAL(12,2),
    company_name VARCHAR(100),
    loan_amount_requested DECIMAL(12,2),
    loan_purpose VARCHAR(50),
    preferred_tenure INTEGER,
    existing_emi DECIMAL(10,2) DEFAULT 0,
    has_credit_card BOOLEAN DEFAULT FALSE,
    credit_card_outstanding DECIMAL(10,2) DEFAULT 0,
    credit_score INTEGER,
    credit_status VARCHAR(100),
    active_loans INTEGER DEFAULT 0,
    approval_status VARCHAR(20) DEFAULT 'pending',
    sanctioned_amount DECIMAL(12,2),
    interest_rate DECIMAL(5,2),
    monthly_emi DECIMAL(10,2),
    rejection_reason TEXT,
    failed_rules TEXT[],
    sanction_letter_url TEXT,
    conversation_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_logs (
    id SERIAL PRIMARY KEY,
    application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    sender VARCHAR(20) CHECK (sender IN ('user', 'agent')),
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_used VARCHAR(50) NOT NULL,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),
    message_excerpt TEXT,
    conversation_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_app_user ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_app_status ON loan_applications(approval_status);
CREATE INDEX IF NOT EXISTS idx_conv_logs_app ON conversation_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_app ON agent_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON agent_audit_logs(user_id);

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON loan_applications;
CREATE POLICY "Users can view own applications"
    ON loan_applications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON loan_applications;
CREATE POLICY "Users can insert own applications"
    ON loan_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON loan_applications;
CREATE POLICY "Users can update own applications"
    ON loan_applications FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own conversation logs" ON conversation_logs;
CREATE POLICY "Users can view own conversation logs"
    ON conversation_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM loan_applications la
            WHERE la.id = conversation_logs.application_id
            AND la.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own conversation logs" ON conversation_logs;
CREATE POLICY "Users can insert own conversation logs"
    ON conversation_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM loan_applications la
            WHERE la.id = conversation_logs.application_id
            AND la.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own audit logs" ON agent_audit_logs;
CREATE POLICY "Users can view own audit logs"
    ON agent_audit_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own audit logs" ON agent_audit_logs;
CREATE POLICY "Users can insert own audit logs"
    ON agent_audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
