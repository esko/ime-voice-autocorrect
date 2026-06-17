# Open questions for implementation

These should be answered by testing on the target Chromebook, not by changing scope.

1. Exact layout IDs accepted by `input_components`:
   - `us::eng` vs `xkb:us::eng`
   - `fi::fin` vs `xkb:fi::fin`

2. Exact unframed/borderless IWA flag names on the current ChromeOS build.

3. Whether IWA mic permission requires a specific `permissions_policy` value on the target build.

4. Whether `chrome.runtime.connect(extensionId)` is exposed from the IWA environment exactly as documented, or whether additional setup is needed.

5. Whether `chrome.input.ime.deleteSurroundingText` behaves consistently in all target ChromeOS apps.

6. Whether `setAssistiveWindowProperties` works for undo UI in all target apps.

7. Which dictation chord is least conflicting with US/Finnish layouts:
   - Right Alt hold
   - Right Alt double tap
   - Search/Launcher chord
   - Ctrl+Alt+D
   - another physical-key-based chord
