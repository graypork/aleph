# T08 Implementation Status

Verified on Vercel preview deployment `dpl_46pWph1eSBzXRUutQcLPJFVJXBZh` for commit `eb1fc56ef9a1913282471bb623a90ad34f7d5d49`:

- Full Node test suite: 178 tests, 178 pass, 0 fail.
- Vite production build: success.
- Preview deployment: READY.
- Public intro remains available without app authentication.
- Private data is server-only synthetic data and is not embedded in the public HTML/client source.
- Password input is not implemented.
- Passkey challenge replay, account isolation, session ownership, credential deletion, and public-key storage have automated contract coverage.

Still requires physical-device evidence before final coursework submission:

- Register two real passkeys for the Miles account.
- Delete one and authenticate with the remaining passkey.
- Register the Sandbox account and capture bidirectional cross-account denial.
- Capture a real replayed login verification returning 409.
- Record the actual passkey storage location selected by the device/browser.

Do not represent these manual items as completed until they are actually performed.