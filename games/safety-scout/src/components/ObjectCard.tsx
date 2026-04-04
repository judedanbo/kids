import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import type { SafetyObject } from '../utils/objectSelector';
import styles from './ObjectCard.module.css';

interface ObjectCardProps {
  object: SafetyObject;
  ageTier: AgeTier;
  audioManager: AudioManager;
}

export function ObjectCard({ object, ageTier, audioManager }: ObjectCardProps) {
  const isTiny = ageTier === 'tiny';

  const handlePlayName = () => {
    audioManager.playVoice(`voice:object-${object.id}`);
  };

  return (
    <div className={styles.container}>
      <img
        src={`/images/safety-scout/${object.image}`}
        alt={object.name}
        className={`${styles.image} ${isTiny ? styles.imageLarge : ''}`}
      />
      <p className={styles.name}>{object.name}</p>
      {isTiny && (
        <button className={styles.playButton} onClick={handlePlayName} aria-label={`Hear: ${object.name}`}>
          🔊
        </button>
      )}
    </div>
  );
}
