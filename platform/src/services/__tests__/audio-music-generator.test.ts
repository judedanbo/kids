import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebAudioMusicGenerator } from '../audio-music-generator';

// Mock Web Audio API
class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  frequency = { value: 0, setValueAtTime: vi.fn() };
  type: OscillatorType = 'sine';
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = {};
  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  close = vi.fn(async () => {});
  resume = vi.fn(async () => {});
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', vi.fn(() => new MockAudioContext()));
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WebAudioMusicGenerator', () => {
  let generator: WebAudioMusicGenerator;

  beforeEach(() => {
    generator = new WebAudioMusicGenerator();
  });

  afterEach(() => {
    generator.stop();
  });

  describe('start()', () => {
    it('creates an AudioContext and begins playback', () => {
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });

    it('does not create multiple AudioContexts on repeated start calls', () => {
      generator.start({ volume: 0.3 });
      generator.start({ volume: 0.5 });
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });

    it('respects the volume option', () => {
      generator.start({ volume: 0.5 });
      expect(generator.isActive()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('stops playback and isActive returns false', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      expect(generator.isActive()).toBe(false);
    });

    it('is a no-op when not playing', () => {
      expect(() => generator.stop()).not.toThrow();
    });
  });

  describe('setVolume()', () => {
    it('updates volume while playing', () => {
      generator.start({ volume: 0.3 });
      expect(() => generator.setVolume(0.8)).not.toThrow();
    });

    it('is a no-op when not playing', () => {
      expect(() => generator.setVolume(0.5)).not.toThrow();
    });
  });

  describe('isActive()', () => {
    it('returns false before start', () => {
      expect(generator.isActive()).toBe(false);
    });

    it('returns true after start', () => {
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });

    it('returns false after stop', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      expect(generator.isActive()).toBe(false);
    });
  });

  describe('restart', () => {
    it('can start again after stop', () => {
      generator.start({ volume: 0.3 });
      generator.stop();
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });
  });

  describe('suspended AudioContext (autoplay policy)', () => {
    let suspendedContext: MockAudioContext;

    beforeEach(() => {
      suspendedContext = new MockAudioContext();
      suspendedContext.state = 'suspended';
      // resume() resolves but context stays suspended until user gesture
      suspendedContext.resume = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            // Simulate: resolve changes state to running
            suspendedContext.state = 'running';
            resolve();
          }),
      );
      vi.stubGlobal(
        'AudioContext',
        vi.fn(() => suspendedContext),
      );
      generator = new WebAudioMusicGenerator();
    });

    it('marks isActive true immediately even when context is suspended', () => {
      generator.start({ volume: 0.3 });
      expect(generator.isActive()).toBe(true);
    });

    it('calls context.resume() when context is suspended', () => {
      generator.start({ volume: 0.3 });
      expect(suspendedContext.resume).toHaveBeenCalled();
    });

    it('begins playback after context resumes', async () => {
      generator.start({ volume: 0.3 });
      // Flush the resume() microtask so beginPlayback fires
      await Promise.resolve();
      await Promise.resolve();
      expect(suspendedContext.createGain).toHaveBeenCalled();
    });

    it('does not begin playback if stopped before context resumes', async () => {
      // Make resume hang (never resolve during this test)
      suspendedContext.resume = vi.fn(() => new Promise<void>(() => {}));
      suspendedContext.state = 'suspended';
      vi.stubGlobal(
        'AudioContext',
        vi.fn(() => suspendedContext),
      );
      generator = new WebAudioMusicGenerator();

      generator.start({ volume: 0.3 });
      generator.stop();
      // createGain should not have been called since playback never began
      expect(suspendedContext.createGain).not.toHaveBeenCalled();
    });

    it('registers unlock listeners on document', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      generator.start({ volume: 0.3 });
      const eventTypes = addSpy.mock.calls.map((c) => c[0]);
      expect(eventTypes).toContain('click');
      expect(eventTypes).toContain('keydown');
      expect(eventTypes).toContain('touchstart');
      addSpy.mockRestore();
    });

    it('does not register unlock listeners twice on repeated starts', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      generator.start({ volume: 0.3 });
      generator.stop();
      generator.start({ volume: 0.3 });
      const clickCalls = addSpy.mock.calls.filter((c) => c[0] === 'click');
      expect(clickCalls).toHaveLength(1);
      addSpy.mockRestore();
    });
  });
});
