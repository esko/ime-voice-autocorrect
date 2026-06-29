# ChromeOS install

## Build

```fish
pnpm install
pnpm build   # outputs apps/extension/dist
```

## Install the extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked → `apps/extension/dist`.
4. Open ChromeOS input settings and add/select `Input Assist`.

## ChromeOS gotchas

- **Load from a ChromeOS-native path, not the Linux container.** Unpacked MV3
  service workers often fail to register ("An unknown error occurred when
  fetching the script.") when loaded directly from Crostini/Linux files. Copy
  `apps/extension/dist` into a ChromeOS location (e.g. My files → Downloads) and
  load it from there.
- **Reload after every build.** `vite build` empties and rewrites `dist`; if the
  extension is loaded during the rebuild, click the ↻ reload icon (or Remove +
  Load unpacked) afterwards.
- **"Service worker (inactive)" is normal** for MV3 — the worker idles between
  events. It is only a problem if accompanied by an error.

No special `chrome://flags` are required for the autocorrect keyboard.
