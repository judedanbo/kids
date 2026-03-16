import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ProgressBar } from '@kids-games-zone/shared';
import type { GameManifest, GameProgress } from '@kids-games-zone/shared';
import styles from './GameCard.module.css';

interface GameCardProps {
  manifest: GameManifest;
  progress?: GameProgress;
  isRecent?: boolean;
}

const SKILL_COLORS: Record<string, string> = {
  literacy: '#4a90d9',
  numeracy: '#ff8c42',
  logic: '#9b59b6',
  memory: '#2ecc71',
  creativity: '#e74c3c',
  motor_skills: '#f39c12',
  science: '#1abc9c',
  social_skills: '#e91e63',
};

const SKILL_ICONS: Record<string, string> = {
  literacy: '📚',
  numeracy: '🔢',
  logic: '🧩',
  memory: '🧠',
  creativity: '🎨',
  motor_skills: '🏃',
  science: '🔬',
  social_skills: '🤝',
};

export function GameCard({ manifest, progress, isRecent }: GameCardProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const isLocked = manifest.status === 'coming_soon' || manifest.status === 'retired';
  const primarySkill = manifest.skills[0];
  const bgColor = SKILL_COLORS[primarySkill] ?? '#4a90d9';
  const skillIcon = SKILL_ICONS[primarySkill] ?? '🎮';

  function handleClick() {
    if (!isLocked) {
      navigate(`/game/${manifest.id}`);
    }
  }

  return (
    <motion.button
      className={`${styles.card} ${isRecent ? styles.recent : ''} ${isLocked ? styles.locked : ''}`}
      onClick={handleClick}
      whileHover={
        !isLocked && !shouldReduceMotion ? { scale: 1.03 } : undefined
      }
      whileTap={
        !isLocked && !shouldReduceMotion ? { scale: 0.98 } : undefined
      }
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label={`${manifest.name}${isLocked ? ' (locked)' : ''}`}
      disabled={isLocked}
    >
      <div className={styles.thumbnail} style={{ backgroundColor: bgColor }}>
        <span className={styles.thumbnailIcon}>{skillIcon}</span>
        {isLocked && <span className={styles.lockOverlay}>🔒</span>}
        {!progress && !isLocked && <span className={styles.newBadge}>New!</span>}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{manifest.name}</h3>

        <div className={styles.pills}>
          <span className={styles.agePill}>
            Ages {manifest.ageRange[0]}-{manifest.ageRange[1]}
          </span>
          {manifest.skills.slice(0, 2).map((skill) => (
            <span key={skill} className={styles.skillPill}>
              {SKILL_ICONS[skill] ?? '🎮'}
            </span>
          ))}
        </div>

        {progress && !isLocked && (
          <div className={styles.progressContainer}>
            <ProgressBar
              current={progress.currentLevel}
              total={manifest.maxDifficulty}
            />
          </div>
        )}
      </div>
    </motion.button>
  );
}
