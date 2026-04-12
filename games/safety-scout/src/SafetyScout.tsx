import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  CelebrationOverlay,
  InstructionBubble,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import { selectObjects, getCategories } from './utils/objectSelector';
import { useSafetyRound } from './hooks/useSafetyRound';
import { CategoryPicker } from './components/CategoryPicker';
import { ObjectCard } from './components/ObjectCard';
import { SafetyButtons } from './components/SafetyButtons';
import { ExplanationCard } from './components/ExplanationCard';
import allObjects from './data/objects.json';
import styles from './SafetyScout.module.css';

const OBJECTS_PER_ROUND_TINY = 6;
const OBJECTS_PER_ROUND_JUNIOR = 10;

export function SafetyScout({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('safety-scout');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const objectCount = isTiny ? OBJECTS_PER_ROUND_TINY : OBJECTS_PER_ROUND_JUNIOR;

  const categories = useMemo(() => getCategories(allObjects), []);

  const [initialObjects] = useState(() =>
    selectObjects(allObjects, { category: null, difficulty: config.difficulty, count: objectCount }),
  );

  const round = useSafetyRound({ objects: initialObjects, onScorePoint: onScore });

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      const objects = selectObjects(allObjects, { category, difficulty: config.difficulty, count: objectCount });
      round.startRound(objects);
    },
    [config.difficulty, objectCount, round],
  );

  // Audio: speak object name for tiny-tier
  useEffect(() => {
    if (round.phase === 'playing' && isTiny) {
      audioManager.playVoice(`voice:object-${round.currentObject.id}`);
    }
    if (round.phase === 'playing') {
      announce(t('objectOf', { current: round.currentObjectIndex + 1, total: round.maxScore }));
    }
  }, [round.phase, round.currentObjectIndex, round.currentObject.id, isTiny, audioManager, announce, t, round.maxScore]);

  // Audio: feedback
  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) {
        audioManager.playVoice('voice:encouragement-correct');
      }
    } else {
      audioManager.playSFX('incorrect');
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

  // Tiny-tier background music
  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:safety-scout-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  // Tiny-tier: voice explanation after feedback
  useEffect(() => {
    if (round.phase === 'feedback' && isTiny) {
      audioManager.playVoice(`voice:explain-${round.currentObject.id}`);
    }
  }, [round.phase, isTiny, round.currentObject, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'safety-scout',
      score: round.score,
      maxScore: round.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        objectsCorrect: round.objectsCorrect,
        objectsTotal: round.maxScore,
      },
    };
    onComplete(result);
  }, [round, config.difficulty, onComplete]);

  if (round.phase === 'category-select') {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <CategoryPicker categories={categories} onSelect={handleCategorySelect} />
      </GameShell>
    );
  }

  if (round.phase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character="🛡️" />
          <OptionButton label={t('letsGo')} state="default" onSelect={round.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  if (round.phase === 'complete') {
    return (
      <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={round.score}
          maxScore={round.maxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  const showFeedback = round.phase === 'feedback';
  const explanationTier = isTiny ? 'tiny' : 'junior';

  return (
    <GameShell title={t('title')} onBack={onExit} audioManager={audioManager} musicEnabled={config.settings.backgroundMusicEnabled}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        </div>

        <ProgressBar current={round.currentObjectIndex} total={round.maxScore} showLabel />

        <ObjectCard object={round.currentObject} ageTier={ageTier} audioManager={audioManager} />

        {!showFeedback && (
          <SafetyButtons
            onSafe={() => round.submitAnswer(true)}
            onHarmful={() => round.submitAnswer(false)}
            large={isTiny}
          />
        )}

        {showFeedback && (
          <div className={styles.feedbackArea}>
            <ExplanationCard
              explanation={round.currentObject.explanations[explanationTier]}
              isCorrect={round.isCorrect!}
              ageTier={ageTier}
            />
            <OptionButton label={t('nextObject')} state="default" onSelect={round.nextObject} size="large" />
          </div>
        )}
      </div>
    </GameShell>
  );
}
