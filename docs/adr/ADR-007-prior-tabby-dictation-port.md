# ADR-007: Port dictation architecture from `tabby-voice-dictation`

## Status

Accepted.

## Decision

Use `esko/tabby-voice-dictation` as the implementation model for the dictation subsystem.

Port or recreate the architectural components:

- framework-agnostic `DictationSession`
- `BackendSession` / provider registry abstraction
- `AudioPipeline`
- `RealtimeSocket`
- pure `realtimeProtocol`
- `TranscriptDelivery`
- `transcriptFormatter`
- client-side noise gate
- push-to-talk and toggle modes
- status port

Do not port Tabby-specific terminal injection, Angular services, or Tabby settings.

## Rationale

The prior repo already solved the hard ASR/session boundaries and testability concerns. Reusing that shape reduces risk and avoids re-learning the ASR streaming details.

## Consequences

- The first implementation should preserve module boundaries from the Tabby repo.
- The terminal delivery port becomes an `ImeTextPort`.
- Partial transcript delivery defaults to status-only, not live insertion.
- Tests should mirror the prior repo's emphasis on pure module tests and hand-written fakes.
