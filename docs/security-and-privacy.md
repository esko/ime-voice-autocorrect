# Security and privacy

## Local-only

- All correction logic runs locally in the extension/engine. No network calls,
  no remote services, no telemetry.
- The user dictionary and learned corrections live in `chrome.storage.local`,
  never sent anywhere.

## Text the IME can see

- A ChromeOS IME is highly privileged: it sees keystrokes and surrounding text
  across ChromeOS apps. Keep that data in memory only for the current token /
  correction; do not persist raw typed text.
- Debug/diagnostic exports must redact any captured text by default.

## Text insertion safety

- Never commit text if the IME context is invalid or after `onBlur`.
- Never silently switch to another target context.
- Bypass autocorrect entirely in password fields and other unsafe contexts
  (url, email, number) and in code/identifier-like text.

## Permissions

- Only `"input"` and `"storage"` are requested. No host permissions, no
  `externally_connectable`, no network permissions.
