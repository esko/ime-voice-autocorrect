import { describe, expect, it, vi } from "vitest";
import { DictationSession } from "./dictationSession.js";
import type {
  ImeTextPort,
  LoggerPort,
  RecorderPort,
  RecorderStatusPort,
  StreamHandlers,
} from "./ports.js";

function createFakes() {
  const commits: string[] = [];
  let validContext = true;
  let handlers: StreamHandlers | null = null;

  const ime: ImeTextPort = {
    hasValidContext: () => validContext,
    commitText: async (text) => {
      commits.push(text);
      return true;
    },
  };

  const recorder: RecorderPort = {
    start: vi.fn(async (_sessionId, nextHandlers) => {
      handlers = nextHandlers;
    }),
    stop: vi.fn(async () => {
      handlers?.onCommitted("hello world");
    }),
    cancel: vi.fn(),
  };

  const status: RecorderStatusPort = {
    show: vi.fn(),
    hide: vi.fn(),
    setPartial: vi.fn(),
  };

  const logger: LoggerPort = {
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    commits,
    handlers: () => handlers,
    ime,
    recorder,
    status,
    logger,
    setValidContext(value: boolean) {
      validContext = value;
    },
  };
}

describe("DictationSession", () => {
  it("push-to-talk starts on keydown and commits once on keyup", async () => {
    const fakes = createFakes();
    const session = new DictationSession({
      ime: fakes.ime,
      recorder: fakes.recorder,
      status: fakes.status,
      logger: fakes.logger,
      config: {
        activationMode: "push-to-talk",
        spokenPunctuation: false,
        appendSpace: false,
      },
    });

    session.onDictationChordDown();
    expect(session.isRunning()).toBe(true);
    session.onDictationChordUp();
    await vi.waitUntil(() => fakes.commits.length === 1);

    expect(fakes.commits).toEqual(["hello world"]);
    expect(session.isRunning()).toBe(false);
  });

  it("ignores key repeat while the chord is held", () => {
    const fakes = createFakes();
    const session = new DictationSession({
      ime: fakes.ime,
      recorder: fakes.recorder,
      status: fakes.status,
      logger: fakes.logger,
    });

    session.onDictationChordDown();
    session.onDictationChordDown();
    expect((fakes.recorder.start as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("toggle mode stays open until manual end with one commit", async () => {
    const fakes = createFakes();
    let handlers: StreamHandlers | null = null;
    const recorder: RecorderPort = {
      start: vi.fn(async (_sessionId, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
      }),
      stop: vi.fn(async () => {}),
      cancel: vi.fn(),
    };

    const session = new DictationSession({
      ime: fakes.ime,
      recorder,
      status: fakes.status,
      logger: fakes.logger,
      config: {
        activationMode: "toggle",
        spokenPunctuation: false,
        appendSpace: false,
      },
    });

    session.onDictationChordDown();
    session.onDictationChordUp();
    if (!handlers) {
      throw new Error("handlers not set");
    }
    handlers.onCommitted("first");
    handlers.onCommitted("second");
    session.onDictationChordDown();
    session.onDictationChordUp();
    await vi.waitUntil(() => fakes.commits.length === 1);

    expect(fakes.commits).toEqual(["first second"]);
  });

  it("escape cancels without commit", () => {
    const fakes = createFakes();
    const session = new DictationSession({
      ime: fakes.ime,
      recorder: fakes.recorder,
      status: fakes.status,
      logger: fakes.logger,
    });

    session.onDictationChordDown();
    session.onEscape();

    expect(fakes.recorder.cancel).toHaveBeenCalled();
    expect(fakes.commits).toEqual([]);
  });

  it("context loss cancels without commit", () => {
    const fakes = createFakes();
    const session = new DictationSession({
      ime: fakes.ime,
      recorder: fakes.recorder,
      status: fakes.status,
      logger: fakes.logger,
    });

    session.onDictationChordDown();
    session.onContextLost();

    expect(fakes.recorder.cancel).toHaveBeenCalled();
    expect(fakes.commits).toEqual([]);
  });

  it("scratch that removes the last segment before finalize", async () => {
    const fakes = createFakes();
    let handlers: StreamHandlers | null = null;
    const recorder: RecorderPort = {
      start: vi.fn(async (_sessionId, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
      }),
      stop: vi.fn(async () => {}),
      cancel: vi.fn(),
    };

    const session = new DictationSession({
      ime: fakes.ime,
      recorder,
      status: fakes.status,
      logger: fakes.logger,
      config: {
        activationMode: "push-to-talk",
        spokenPunctuation: false,
        appendSpace: false,
      },
    });

    session.onDictationChordDown();
    if (!handlers) {
      throw new Error("handlers not set");
    }
    handlers.onCommitted("delete me");
    handlers.onCommitted("scratch that");
    handlers.onCommitted("keep me");
    session.onDictationChordUp();
    await Promise.resolve();

    expect(fakes.commits).toEqual(["keep me"]);
  });

  it("keeps partials on the status port only", () => {
    const fakes = createFakes();
    const session = new DictationSession({
      ime: fakes.ime,
      recorder: fakes.recorder,
      status: fakes.status,
      logger: fakes.logger,
    });

    session.onDictationChordDown();
    fakes.handlers()?.onPartial("partial text");

    expect(fakes.status.setPartial).toHaveBeenCalledWith("partial text");
    expect(fakes.commits).toEqual([]);
  });

  it("applies spoken punctuation on finalize", async () => {
    const fakes = createFakes();
    let handlers: StreamHandlers | null = null;
    const recorder: RecorderPort = {
      start: async (_sessionId, nextHandlers) => {
        handlers = nextHandlers;
        nextHandlers.onCommitted("hello comma world period");
      },
      stop: async () => {},
      cancel: vi.fn(),
    };

    const session = new DictationSession({
      ime: fakes.ime,
      recorder,
      status: fakes.status,
      logger: fakes.logger,
      config: {
        activationMode: "push-to-talk",
        spokenPunctuation: true,
        appendSpace: false,
      },
    });

    session.onDictationChordDown();
    session.onDictationChordUp();
    await Promise.resolve();

    expect(fakes.commits[0]).toMatch(/hello,\s+world\./);
  });

  it("switches to toggle mode after updateConfig", async () => {
    const fakes = createFakes();
    let handlers: StreamHandlers | null = null;
    const recorder: RecorderPort = {
      start: vi.fn(async (_sessionId, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
      }),
      stop: vi.fn(async () => {}),
      cancel: vi.fn(),
    };

    const session = new DictationSession({
      ime: fakes.ime,
      recorder,
      status: fakes.status,
      logger: fakes.logger,
      config: {
        activationMode: "push-to-talk",
        spokenPunctuation: false,
        appendSpace: false,
      },
    });

    session.updateConfig({ activationMode: "toggle" });
    session.onDictationChordDown();
    session.onDictationChordUp();
    handlers?.onCommitted("first");
    session.onDictationChordDown();
    session.onDictationChordUp();
    await vi.waitUntil(() => fakes.commits.length === 1);

    expect(fakes.commits).toEqual(["first"]);
  });
});
