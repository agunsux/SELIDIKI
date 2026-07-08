# Baseline API Report

## Summary
Before initiating the repository refactoring and operational hardening in Sprint 2A & 2A.5, we captured the baseline API contracts and response shapes using `scripts/captureBaseline.js` and exported it to `test/baseline_snapshot.json`.

All 14 checked endpoints successfully returned expected formats and 200 HTTP statuses.

---

## Endpoint Inventory and Statuses

| Endpoint Name | Method | Path | Status | Latency | Expected Result Summary |
|---|---|---|---|---|---|
| `health` | GET | `/health` | 200 | ~17ms | API health response. |
| `send-otp` | POST | `/api/v1/user/auth/send-otp` | 200 | ~14ms | Returns status message and ephemeral OTP code in test mode. |
| `verify-otp` | POST | `/api/v1/user/auth/verify-otp` | 200 | ~4ms | Verifies OTP code and returns signed session JWT token. |
| `check-phone` | GET | `/api/v1/check/phone/081234567890` | 200 | ~3ms | Evaluates phone risk profile (masked number, status, signals, count). |
| `check-account` | GET | `/api/v1/check/account` | 200 | ~4ms | Evaluates bank account risk profile. |
| `report-trending` | GET | `/api/v1/report/trending` | 200 | ~5ms | Lists public verified trending reports. |
| `scan-message` | POST | `/api/v1/scan/message` | 200 | ~4ms | Returns AI analysis status, risk score, confidence, and categories. |
| `scan-url` | POST | `/api/v1/scan/url` | 200 | ~4ms | Returns AI analysis status, domain, and risk parameters. |
| `scan-screenshot` | POST | `/api/v1/scan/screenshot` | 200 | ~3ms | Returns AI analysis status for base64 image data. |
| `reputation-health` | GET | `/api/v1/reputation/health` | 200 | ~4ms | Exposes engine and connection status for reputation services. |
| `reputation-check` | POST | `/api/v1/reputation/check` | 200 | ~4ms | Exposes reputation metrics (score, explanation, counts) for PHONE/BANK. |
| `user-history` | GET | `/api/v1/user/history` | 200 | ~5ms | Retrieves paginated user query history. |
| `user-delete-data` | DELETE | `/api/v1/user/data` | 200 | ~4ms | Executes right-to-erasure deletion of user data under UU PDP. |
| `submit-report` | POST | `/api/v1/report` | 200 | ~3ms | Submits new fraud report, returning tracking ID. |

---

## Behavior Verification Guidelines
For future refactoring and database switches, each endpoint execution must align with the parameters in `test/baseline_snapshot.json`. Specifically:
1. Envelope success parameter (`success: true`) must remain consistent.
2. Response latency regression must not exceed 5%.
3. Output nullability, enum ranges, and field types must be strictly checked by Phase 10 contract tests.
