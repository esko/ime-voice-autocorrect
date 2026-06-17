# GitHub issue breakdown

Create these issues for the first complete release. All are required.

## Foundation

1. Scaffold TypeScript monorepo
2. Add shared build/test/typecheck tooling
3. Add CI for typecheck/test/build
4. Add strict lint/prettier config
5. Add platform docs and manual test plan

## Shared protocol

6. Define extension-recorder protocol schemas
7. Implement protocol validation with tests
8. Implement session ID and protocol version guards
9. Implement heartbeat and reconnect state tests

## Dictation core

10. Port dictation session architecture from `tabby-voice-dictation`
11. Implement toggle and push-to-talk state machine
12. Implement partial/final transcript handling
13. Implement transcript formatter and spoken punctuation
14. Implement scratch-that/undo command
15. Implement silence timeout and error teardown
16. Add dictation core unit tests

## ASR runtime

17. Implement AudioWorklet mic capture pipeline
18. Implement PCM16/base64 utilities
19. Implement client-side noise gate
20. Implement ElevenLabs token fetch
21. Implement realtime WebSocket session
22. Implement pure realtime protocol decoder
23. Implement flush-on-stop
24. Implement reconnect/backoff
25. Add ASR runtime tests with mocked browser globals

## Recorder IWA

26. Create recorder IWA app shell
27. Add IWA manifest and dev install docs
28. Implement unframed tiny recorder UI
29. Implement passive active-state UI
30. Implement extras/settings route
31. Implement settings persistence
32. Implement mic permission flow
33. Implement recorder diagnostics/debug bundle

## Bridge

34. Add extension `externally_connectable`
35. Implement IWA-initiated connection
36. Implement extension bridge endpoint
37. Implement reconnect/availability state
38. Sync non-secret settings to extension
39. Route recorder events to dictation session
40. Add bridge tests

## IME extension

41. Create MV3 ChromeOS IME extension
42. Add `Input Assist US` input component
43. Add `Input Assist Finnish` input component
44. Implement context tracking
45. Implement key router and layout pass-through
46. Implement dictation chord handling
47. Implement IME text commit/delete adapter
48. Implement assistive undo window adapter
49. Implement IME menu items/status
50. Add Chrome API mock tests

## Autocorrect

51. Implement tokenizer
52. Implement English dictionary loader
53. Implement SymSpell-style candidate lookup
54. Implement keyboard-neighbor scoring
55. Implement confidence gating
56. Implement technical/Finnish ignore rules
57. Implement personal dictionary and ignore list
58. Implement correction on word boundary
59. Implement undo after correction
60. Integrate autocorrect with IME
61. Add autocorrect test suite

## Integration and hardening

62. Integrate dictation final commit with IME
63. Integrate dictation transcript cleanup + English autocorrect
64. Add settings synchronization end-to-end
65. Add password/unsafe field safeguards
66. Add error states and structured logs
67. Add secret redaction
68. Complete manual ChromeOS acceptance tests
69. Update docs with actual flags/layout IDs
70. Prepare release build instructions
