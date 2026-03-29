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

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(120),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    organization VARCHAR(120),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'customer'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
        updated_at = NOW();

    RETURN NEW;
END;
;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

CREATE TABLE IF NOT EXISTS underwriting_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    min_age INTEGER NOT NULL DEFAULT 21,
    max_age INTEGER NOT NULL DEFAULT 60,
    min_income_salaried DECIMAL(12,2) NOT NULL DEFAULT 25000,
    min_income_self_employed DECIMAL(12,2) NOT NULL DEFAULT 40000,
    min_credit_score INTEGER NOT NULL DEFAULT 650,
    max_dti_ratio DECIMAL(5,2) NOT NULL DEFAULT 50,
    max_loan_multiplier_salaried DECIMAL(5,2) NOT NULL DEFAULT 10,
    max_loan_multiplier_self_employed DECIMAL(5,2) NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
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
    application_stage VARCHAR(30) DEFAULT 'draft',
    assigned_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    policy_version INTEGER,
    risk_band VARCHAR(30),
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

CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_application_documents_unique_type
ON application_documents(application_id, document_type);

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
CREATE INDEX IF NOT EXISTS idx_application_stage ON loan_applications(application_stage);
CREATE INDEX IF NOT EXISTS idx_application_documents_app ON application_documents(application_id);

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Reviewers can manage applications" ON loan_applications;
CREATE POLICY "Reviewers can manage applications"
    ON loan_applications FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('reviewer', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('reviewer', 'admin')
        )
    );

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

DROP POLICY IF EXISTS "Users can view own profiles" ON user_profiles;
CREATE POLICY "Users can view own profiles"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profiles" ON user_profiles;
CREATE POLICY "Users can insert own profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profiles" ON user_profiles;
CREATE POLICY "Users can update own profiles"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Policies are readable by authenticated users" ON underwriting_policies;
CREATE POLICY "Policies are readable by authenticated users"
    ON underwriting_policies FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage policies" ON underwriting_policies;
CREATE POLICY "Admins manage policies"
    ON underwriting_policies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own documents" ON application_documents;
CREATE POLICY "Users can view own documents"
    ON application_documents FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON application_documents;
CREATE POLICY "Users can insert own documents"
    ON application_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviewers can manage documents" ON application_documents;
CREATE POLICY "Reviewers can manage documents"
    ON application_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('reviewer', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role IN ('reviewer', 'admin')
        )
    );

