# T04 Deterministic Fixture Transitions

Official baseline before each failure: `T04-NORMAL-D1-A → T04-NORMAL-D1-B`.

| Fixture | freshness / error_code | rows | last good |
| --- | --- | ---: | ---: |
| T04-TIMEOUT | stale / timeout | 1 | 105 |
| T04-AUTH-401 | stale / auth | 1 | 105 |
| T04-RATE-429 | stale / rate_limit | 1 | 105 |
| T04-OFFLINE | stale / offline | 1 | 105 |
| T04-SCHEMA-BREAK | stale / schema_error | 1 | 105 |

Recovery replay: `D1-A → D1-B → TIMEOUT → T04-RECOVER-D2`.

- before retry: `stale / timeout`, rows `1`, last good `105`
- after retry: `fresh / none`, rows `2`, value `120`, record date `2026-08-25`, signed delta `+15 pt`

These are synthetic-only fixtures and never write the live Redis evidence keys.
