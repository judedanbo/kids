import styles from './InstructionBubble.module.css';

interface InstructionBubbleProps {
  text: string;
  audioSrc?: string;
  character?: string;
  onAudioPlay?: () => void;
}

function SpeakerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function InstructionBubble({
  text,
  audioSrc,
  character,
  onAudioPlay,
}: InstructionBubbleProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.bubble}>
        <span>{text}</span>
        {audioSrc && (
          <button
            className={styles.audioButton}
            onClick={onAudioPlay}
            aria-label="Play instruction audio"
          >
            <SpeakerIcon />
          </button>
        )}
      </div>
      {character && <span className={styles.character}>{character}</span>}
    </div>
  );
}
