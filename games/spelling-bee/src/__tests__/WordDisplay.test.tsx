import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordDisplay } from '../components/WordDisplay';
import type { AudioManager } from '@kids-games-zone/shared';

const mockAudio = {
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  playSFX: vi.fn(),
  playVoice: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  preload: vi.fn().mockResolvedValue(undefined),
  setLanguage: vi.fn(),
} as unknown as AudioManager;

function makeWord(overrides: Partial<{
  word: string;
  image: string;
  definition: string;
  origin: string;
  sentence: string;
}> = {}) {
  return {
    word: 'cat',
    difficulty: 1,
    image: 'cat.webp',
    definition: '',
    origin: '',
    sentence: '',
    ...overrides,
  };
}

describe('WordDisplay — tiny-tier image fallback', () => {
  it('renders <img> when word.image is non-empty', () => {
    render(<WordDisplay word={makeWord()} ageTier="tiny" audioManager={mockAudio} />);
    const img = screen.getByAltText('cat');
    expect(img).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'imageFallbackLabel' })).toBeNull();
  });

  it('renders the fallback when word.image is empty string', () => {
    render(<WordDisplay word={makeWord({ image: '' })} ageTier="tiny" audioManager={mockAudio} />);
    expect(screen.queryByAltText('cat')).toBeNull();
    expect(screen.getByRole('img', { name: 'imageFallbackLabel' })).toBeTruthy();
  });

  it('swaps to the fallback when the image errors', () => {
    render(<WordDisplay word={makeWord()} ageTier="tiny" audioManager={mockAudio} />);
    const img = screen.getByAltText('cat');
    fireEvent.error(img);
    expect(screen.queryByAltText('cat')).toBeNull();
    expect(screen.getByRole('img', { name: 'imageFallbackLabel' })).toBeTruthy();
  });

  it('resets error state when the word prop changes', () => {
    const { rerender } = render(
      <WordDisplay word={makeWord()} ageTier="tiny" audioManager={mockAudio} />,
    );
    fireEvent.error(screen.getByAltText('cat'));
    expect(screen.getByRole('img', { name: 'imageFallbackLabel' })).toBeTruthy();

    rerender(
      <WordDisplay
        word={makeWord({ word: 'dog', image: 'dog.webp' })}
        ageTier="tiny"
        audioManager={mockAudio}
      />,
    );
    expect(screen.getByAltText('dog')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'imageFallbackLabel' })).toBeNull();
  });

  it('does not render an image or fallback for non-tiny tiers', () => {
    render(<WordDisplay word={makeWord()} ageTier="junior" audioManager={mockAudio} />);
    expect(screen.queryByAltText('cat')).toBeNull();
    expect(screen.queryByRole('img', { name: 'imageFallbackLabel' })).toBeNull();
  });
});

describe('WordDisplay — clue buttons (non-tiny)', () => {
  it('hides the target word from the rendered sentence using a fixed blank', () => {
    render(
      <WordDisplay
        word={makeWord({ word: 'cat', sentence: 'The cat sat on the mat.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'getSentence' }));
    const rendered = screen.getByText(/sat on the mat/i).textContent ?? '';
    expect(rendered.toLowerCase()).not.toContain('cat');
    expect(rendered).toContain('_____');
  });

  it('resets clue visibility when the word prop changes', () => {
    const { rerender } = render(
      <WordDisplay
        word={makeWord({ word: 'cat', definition: 'A small furry pet.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'getDefinition' }));
    expect(screen.getByText('A small furry pet.')).toBeTruthy();

    rerender(
      <WordDisplay
        word={makeWord({ word: 'dog', definition: 'A loyal four-legged friend.' })}
        ageTier="junior"
        audioManager={mockAudio}
      />,
    );
    expect(screen.queryByText('A small furry pet.')).toBeNull();
    expect(screen.queryByText('A loyal four-legged friend.')).toBeNull();
  });

  it('plays the pronunciation when the Hear button is clicked', () => {
    render(
      <WordDisplay word={makeWord({ word: 'cat' })} ageTier="junior" audioManager={mockAudio} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /hearWord/ }));
    expect(mockAudio.playVoice).toHaveBeenCalledWith('voice:word-cat');
  });
});
