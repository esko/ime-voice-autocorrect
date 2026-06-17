# Security and privacy

## Secrets

- ASR API key lives only in the recorder IWA.
- Extension receives only non-secret settings.
- Logs/debug bundles must redact:
  - API keys
  - tokens
  - auth headers
  - full provider URLs containing tokens
  - transcript text if user chooses redacted debug export

## Microphone

- Mic capture happens only inside recorder IWA.
- Dictation starts only from explicit keyboard command.
- Active recording must be visibly indicated by recorder window state.
- Stopping/cancelling must stop tracks and close audio graph.

## Text insertion

- Never commit text if IME context is invalid.
- Never commit text after blur.
- Never silently switch to another target context.
- Disable dictation in password fields; autocorrect may continue.
- Use conservative behavior in URL/email/number fields.

## Network

- External ASR provider is expected.
- Do not send audio before session start is acknowledged.
- Reconnect only on transient errors.
- Do not reconnect after user stop/cancel.
- Bound flush waits.

## Debugging

- Debug bundle should include:
  - extension version
  - IWA version
  - protocol version
  - bridge state
  - recorder state
  - last redacted ASR error
  - last state transitions
  - current Chrome flags manually recorded by user
- Debug bundle must not include API key by default.
