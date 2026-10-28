# T08 Implementation Status

## Current runtime baseline

Verified on production deployment `dpl_Ea9oKAXqQKS3ntaBgYd1UaACnnNq` for functional commit `50a1d8454077ca53a7029433bcdf2f70fa254af6`:

- Full Node test suite: **182 tests, 182 pass, 0 fail**.
- Vite production build: **success**.
- Production deployment: **READY**.
- Public intro remains available without app authentication.
- Private data is server-only synthetic data and is not embedded in the public HTML/client source.
- Password input is not implemented.
- Passkey challenge replay, account isolation, session ownership, credential deletion, public-key storage, local-device registration preference, and hybrid login hints have automated contract coverage.

The evidence-document updates after this runtime baseline are documentation-only and do not change passkey runtime behavior.

## Physical-device evidence

Completed on an iPhone with Face ID:

- Miles first passkey registration succeeded.
- Authentication succeeded and the three synthetic private notes became visible.
- The UI showed one Miles passkey named `localDevice`, registered `2026-10-27`.
- Logout succeeded.
- Re-login with the existing Miles passkey and Face ID succeeded, and the private notes became visible again.
- Storage location is recorded conservatively as **iPhone platform passkey, authenticated with Face ID**.

Not performed on a physical device:

- Registering two Miles passkeys.
- Deleting one Miles passkey and authenticating with the other.
- Capturing the deleted Miles credential disappearing from the live allow list.
- Deliberately cancelling registration and comparing credential counts before/after.

These items remain explicitly marked incomplete in the submission document.

## Production API evidence — 2026-10-28

### Unauthenticated private access

Direct production request:

```text
GET /api/passkey?action=private
HTTP 401
{"error":"AUTH_REQUIRED"}
```

### Cross-account denial

A temporary Chromium virtual WebAuthn authenticator registered a Sandbox credential against the real production endpoint. With that Sandbox session:

```text
GET /api/passkey?action=private&owner=miles
HTTP 403
{"error":"CROSS_ACCOUNT_FORBIDDEN"}
```

The temporary Sandbox credential was then deleted successfully (`remaining=0`) and the Sandbox session was logged out. Miles → Sandbox was not separately captured in production; the automated contract test covers that direction.

### Challenge replay

Using the same temporary Sandbox WebAuthn credential:

```text
first login-verify: HTTP 200
same challengeId + response replay: HTTP 409
{"error":"CHALLENGE_EXPIRED_OR_USED"}
```

The contract test additionally verifies that signature verification is not invoked a second time after the challenge has already been consumed.

### Fresh challenge generation

Production option requests returned different challenges on consecutive calls. Only the first 12 characters are recorded:

```text
registration: QFjmAHCADelu != XNQhCVjB4KAm
login:        rF9IOLpBgTM8 != scaBWzdYHtT_
```

The unused challenge records are short-lived and expire under the existing 5-minute TTL.

## Submission status

The implementation is functional and the main security paths now have a combination of physical-device, live-production, and automated-contract evidence. The remaining gap is intentionally narrow: the optional/manual two-Miles-passkey delete-and-fallback scenario was not completed because the user chose to skip provisioning a second passkey provider/authenticator.

Do not represent that skipped scenario, the uncaptured reverse live 403, or the uncaptured registration-cancel count comparison as completed physical-device evidence.
