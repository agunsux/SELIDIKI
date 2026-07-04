-- db/migrations/002_bind_risk_trigger.sql
-- Bind the update_phone_risk_score function as an AFTER INSERT trigger on fraud_reports.

DROP TRIGGER IF EXISTS trigger_update_phone_risk ON fraud_reports;

CREATE TRIGGER trigger_update_phone_risk
AFTER INSERT ON fraud_reports
FOR EACH ROW
EXECUTE FUNCTION update_phone_risk_score();
