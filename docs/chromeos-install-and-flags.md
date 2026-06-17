# ChromeOS install and flags

This project intentionally targets experimental ChromeOS/Chrome capabilities.

## Required flags

Enable at least:

```text
chrome://flags/#enable-isolated-web-app-dev-mode
```

Also enable the relevant unframed/borderless IWA/PWA flags available on the target ChromeOS build. The exact flag names can change; search `chrome://flags` for:

```text
IWA
Isolated Web App
unframed
borderless
window controls
```

Record the exact flags used in `docs/platform-notes.md`.

## Extension install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from `apps/extension/dist`.
4. Go to ChromeOS input settings.
5. Add/select:
   - `Input Assist US`
   - `Input Assist Finnish`

## IWA dev install

1. Build recorder IWA.
2. Enable IWA dev mode flag.
3. Open `chrome://web-app-internals`.
4. Install/test via Chrome's IWA developer flow.
5. Confirm the installed app opens as a tiny unframed recorder window.

## Required manual setup

- Put the IWA origin into the extension manifest `externally_connectable.matches`.
- Set the extension ID in the IWA config.
- Configure ASR API key in the IWA settings page.
- Grant microphone permission.
- Select `Input Assist US` or `Input Assist Finnish` as the active ChromeOS input method.
