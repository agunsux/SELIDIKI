-- ══════════════════════════════════════════════════════════════════
-- SELIDIKI PostgreSQL Schema
-- Indonesia Digital Trust & Fraud Intelligence Platform
-- Version: 1.0.0
-- ══════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. USERS ─────────────────────────────────────────────────────
-- Privacy-first: phone stored as SHA-256 hash only

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash      VARCHAR(64)  UNIQUE NOT NULL,
    firebase_uid    VARCHAR(128) UNIQUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_active     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    premium_until   TIMESTAMPTZ,
    report_count    INT          NOT NULL DEFAULT 0,
    scan_count      INT          NOT NULL DEFAULT 0,
    is_banned       BOOLEAN      NOT NULL DEFAULT FALSE,
    ban_reason      TEXT,
    metadata        JSONB        DEFAULT '{}'
);

CREATE INDEX idx_users_phone_hash ON users(phone_hash);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_premium_until ON users(premium_until) WHERE premium_until IS NOT NULL;

COMMENT ON TABLE users IS 'User accounts. Phone stored as SHA-256 hash for privacy.';
COMMENT ON COLUMN users.phone_hash IS 'SHA-256(SALT + normalized_phone_number)';

-- ── 2. PHONE PROFILES ────────────────────────────────────────────
-- Fraud reputation for phone numbers

CREATE TABLE phone_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_hash      VARCHAR(64) UNIQUE NOT NULL,
    risk_score      SMALLINT    NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    primary_category VARCHAR(50),
    reports_count   INT         NOT NULL DEFAULT 0,
    verified_reports_count INT  NOT NULL DEFAULT 0,
    last_activity   TIMESTAMPTZ,
    first_reported  TIMESTAMPTZ,
    signals         JSONB       DEFAULT '[]',
    trend_7d        SMALLINT    DEFAULT 0, -- Report count change in last 7 days
    is_confirmed_fraud BOOLEAN  DEFAULT FALSE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT risk_score_check CHECK (risk_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_phone_profiles_hash ON phone_profiles(phone_hash);
CREATE INDEX idx_phone_profiles_risk ON phone_profiles(risk_score DESC);
CREATE INDEX idx_phone_profiles_category ON phone_profiles(primary_category);

COMMENT ON TABLE phone_profiles IS 'Aggregated fraud reputation for phone numbers.';

-- ── 3. BANK ACCOUNT PROFILES ─────────────────────────────────────

CREATE TABLE bank_account_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_hash    VARCHAR(64) NOT NULL,
    bank_code       VARCHAR(20) NOT NULL,
    risk_score      SMALLINT    NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    reports_count   INT         NOT NULL DEFAULT 0,
    categories      TEXT[]      DEFAULT ARRAY[]::TEXT[],
    last_activity   TIMESTAMPTZ,
    first_reported  TIMESTAMPTZ,
    is_blocked      BOOLEAN     DEFAULT FALSE, -- Official block from bank partner
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_hash, bank_code)
);

CREATE INDEX idx_bank_profiles_hash ON bank_account_profiles(account_hash, bank_code);
CREATE INDEX idx_bank_profiles_risk ON bank_account_profiles(risk_score DESC);

-- ── 4. FRAUD REPORTS ─────────────────────────────────────────────
-- Community fraud reports

CREATE TYPE fraud_target_type AS ENUM ('phone', 'account', 'link', 'whatsapp', 'website');
CREATE TYPE fraud_category AS ENUM (
    'marketplace_scam',
    'fake_investment',
    'illegal_loan',
    'phishing',
    'fake_cs',
    'apk_malware',
    'romance_scam',
    'social_engineering',
    'other'
);
CREATE TYPE report_status AS ENUM ('pending', 'verified', 'rejected', 'escalated');

CREATE TABLE fraud_reports (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id     VARCHAR(50)      UNIQUE NOT NULL,
    reporter_hash   VARCHAR(64),     -- NULL for anonymous reports
    target_type     fraud_target_type NOT NULL,
    target_hash     VARCHAR(64)      NOT NULL,
    category        fraud_category   NOT NULL,
    description     TEXT,
    evidence_url    TEXT,
    confidence      SMALLINT         DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
    status          report_status    NOT NULL DEFAULT 'pending',
    verified_by     UUID,            -- Moderator user ID
    verified_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    ai_score        SMALLINT,        -- AI confidence that this is real fraud
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_target ON fraud_reports(target_hash, target_type);
CREATE INDEX idx_reports_category ON fraud_reports(category);
CREATE INDEX idx_reports_status ON fraud_reports(status);
CREATE INDEX idx_reports_created ON fraud_reports(created_at DESC);
CREATE INDEX idx_reports_reporter ON fraud_reports(reporter_hash) WHERE reporter_hash IS NOT NULL;

COMMENT ON TABLE fraud_reports IS 'Community fraud reports. Target stored as hash for privacy.';

-- ── 5. SCAN HISTORY ──────────────────────────────────────────────

CREATE TYPE scan_input_type AS ENUM ('message', 'url', 'screenshot', 'phone', 'account');

CREATE TABLE scan_history (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_hash       VARCHAR(64),    -- NULL for guest scans
    input_type      scan_input_type NOT NULL,
    input_hash      VARCHAR(64),    -- Hash of actual input for dedup
    risk_score      SMALLINT        CHECK (risk_score BETWEEN 0 AND 100),
    status          VARCHAR(20),    -- SAFE, WARNING, DANGEROUS
    category        VARCHAR(100),
    result_json     JSONB,          -- Full AI result
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_user ON scan_history(user_hash, created_at DESC) WHERE user_hash IS NOT NULL;
CREATE INDEX idx_history_type ON scan_history(input_type, created_at DESC);

-- Auto-delete history older than 90 days (privacy)
-- Add to cron: DELETE FROM scan_history WHERE created_at < NOW() - INTERVAL '90 days';

-- ── 6. URL INTELLIGENCE ──────────────────────────────────────────

CREATE TABLE url_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          VARCHAR(255) UNIQUE NOT NULL,
    url_hash        VARCHAR(64),
    risk_score      SMALLINT    DEFAULT 0,
    is_phishing     BOOLEAN     DEFAULT FALSE,
    is_malware      BOOLEAN     DEFAULT FALSE,
    registered_at   DATE,       -- Domain registration date
    country         VARCHAR(5),
    reports_count   INT         DEFAULT 0,
    first_seen      TIMESTAMPTZ DEFAULT NOW(),
    last_checked    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_url_domain ON url_profiles(domain);
CREATE INDEX idx_url_risk ON url_profiles(risk_score DESC);

-- ── 7. AUDIT LOG ─────────────────────────────────────────────────

CREATE TABLE audit_log (
    id          BIGSERIAL   PRIMARY KEY,
    action      VARCHAR(50) NOT NULL,
    actor_hash  VARCHAR(64),
    target_id   VARCHAR(255),
    target_type VARCHAR(50),
    ip_hash     VARCHAR(64),
    metadata    JSONB       DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_hash) WHERE actor_hash IS NOT NULL;

-- ── 8. FUNCTIONS & TRIGGERS ──────────────────────────────────────

-- Auto-update risk score based on reports
CREATE OR REPLACE FUNCTION update_phone_risk_score()
RETURNS TRIGGER AS $$
DECLARE
    v_reports_count INT;
    v_new_score INT;
BEGIN
    SELECT reports_count INTO v_reports_count
    FROM phone_profiles
    WHERE phone_hash = NEW.target_hash;

    -- Score formula: base 10 + log(reports) * 15, capped at 100
    v_new_score := LEAST(100, 10 + FLOOR(LN(GREATEST(v_reports_count, 1) + 1) * 15)::INT);

    UPDATE phone_profiles
    SET
        risk_score = v_new_score,
        updated_at = NOW()
    WHERE phone_hash = NEW.target_hash;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_phone_profiles_updated_at
    BEFORE UPDATE ON phone_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bank_profiles_updated_at
    BEFORE UPDATE ON bank_account_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 9. VIEWS ─────────────────────────────────────────────────────

-- Trending fraud reports (last 7 days)
CREATE VIEW trending_fraud AS
SELECT
    target_hash,
    target_type,
    category,
    COUNT(*) as report_count,
    MAX(created_at) as latest_report,
    AVG(confidence) as avg_confidence
FROM fraud_reports
WHERE
    created_at >= NOW() - INTERVAL '7 days'
    AND status IN ('pending', 'verified')
GROUP BY target_hash, target_type, category
ORDER BY report_count DESC;

-- High risk phone numbers
CREATE VIEW high_risk_phones AS
SELECT
    pp.*,
    fr.category as most_reported_category
FROM phone_profiles pp
LEFT JOIN LATERAL (
    SELECT category
    FROM fraud_reports
    WHERE target_hash = pp.phone_hash
    GROUP BY category
    ORDER BY COUNT(*) DESC
    LIMIT 1
) fr ON TRUE
WHERE pp.risk_score >= 70
ORDER BY pp.risk_score DESC, pp.reports_count DESC;
