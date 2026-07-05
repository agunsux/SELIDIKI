-- db/migrations/003_update_risk_triggers_and_roles.sql
-- Add role column to users table and implement unified trigger for phone and bank risk scores.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Redefine unified trigger function to calculate risk scores for both phones and bank accounts
CREATE OR REPLACE FUNCTION update_profile_risk_score()
RETURNS TRIGGER AS $$
DECLARE
    v_reports_count INT;
    v_new_score INT;
    v_bank_rec RECORD;
BEGIN
    IF NEW.target_type = 'phone' THEN
        SELECT reports_count INTO v_reports_count
        FROM phone_profiles
        WHERE phone_hash = NEW.target_hash;

        IF v_reports_count IS NOT NULL THEN
            -- Score formula: base 10 + log(reports) * 15, capped at 100
            v_new_score := LEAST(100, 10 + FLOOR(LN(v_reports_count + 1) * 15)::INT);
            UPDATE phone_profiles
            SET risk_score = v_new_score,
                updated_at = NOW()
            WHERE phone_hash = NEW.target_hash;
        END IF;

    ELSIF NEW.target_type = 'account' THEN
        -- Recalculate risk score for bank accounts under this target hash
        FOR v_bank_rec IN 
            SELECT bank_code, reports_count 
            FROM bank_account_profiles 
            WHERE account_hash = NEW.target_hash
        LOOP
            v_new_score := LEAST(100, 10 + FLOOR(LN(v_bank_rec.reports_count + 1) * 15)::INT);
            UPDATE bank_account_profiles
            SET risk_score = v_new_score,
                updated_at = NOW()
            WHERE account_hash = NEW.target_hash AND bank_code = v_bank_rec.bank_code;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind the updated trigger to fraud_reports
DROP TRIGGER IF EXISTS trigger_update_phone_risk ON fraud_reports;
DROP TRIGGER IF EXISTS trigger_update_profile_risk ON fraud_reports;

CREATE TRIGGER trigger_update_profile_risk
AFTER INSERT ON fraud_reports
FOR EACH ROW
EXECUTE FUNCTION update_profile_risk_score();
