import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import {
  GameShell,
  OptionButton,
  ScoreDisplay,
  ProgressBar,
  CelebrationOverlay,
  InstructionBubble,
  GameTimer,
  PauseMenu,
  IconImage,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult } from '@kids-games-zone/shared';
import {
  getPool,
  flagEmoji,
  flagSrc,
  localizedName,
  localizedCapital,
  continentKey,
  continentEmoji,
} from './utils/countryPool';
import { generateQuestions, type GameMode } from './utils/questionGenerator';
import { useGlobeSession } from './hooks/useGlobeSession';
import { QuestionCard } from './components/QuestionCard';
import styles from './GlobeTrotter.module.css';

const TIER_MODES: Record<string, GameMode[]> = {
  tiny: ['flag', 'continent'],
  junior: ['capital', 'flag', 'continent'],
  explorer: ['capital', 'flag', 'fact', 'continent'],
};

const TIER_COUNT: Record<string, number> = {
  tiny: 6,
  junior: 8,
  explorer: 10,
};

function poolDifficultyFor(tier: string, configDifficulty: number): number {
  if (tier === 'tiny') return 1;
  if (tier === 'junior') return Math.max(2, Math.min(configDifficulty, 3));
  return Math.max(3, configDifficulty);
}

/** Outer component owns the restart nonce; the inner session is remounted on restart. */
export function GlobeTrotter(props: GameProps) {
  const [runId, setRunId] = useState(0);
  return <GlobeTrotterSession key={runId} {...props} onRestart={() => setRunId((n) => n + 1)} />;
}

function GlobeTrotterSession({
  config,
  onScore,
  onComplete,
  onExit,
  audioManager,
  onRestart,
}: GameProps & { onRestart: () => void }) {
  const { t } = useTranslation('globe-trotter');
  const announce = useAnnounce();
  const startTimeRef = useRef(Date.now());

  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const lang = config.settings.language;

  const [paused, setPaused] = useState(false);

  const questions = useMemo(() => {
    const poolDifficulty = poolDifficultyFor(ageTier, config.difficulty);
    return generateQuestions({
      pool: getPool(poolDifficulty),
      modes: TIER_MODES[ageTier] ?? TIER_MODES.junior,
      count: TIER_COUNT[ageTier] ?? TIER_COUNT.junior,
      difficulty: config.difficulty,
    });
  }, [ageTier, config.difficulty]);

  const session = useGlobeSession({ questions, onScorePoint: onScore });
  const { phase, currentQuestion } = session;

  useEffect(() => {
    if (phase === 'playing') {
      announce(
        t('questionOf', {
          current: session.currentIndex + 1,
          total: session.maxScore,
        }),
      );
    }
  }, [phase, session.currentIndex, session.maxScore, announce, t]);

  useEffect(() => {
    if (phase !== 'feedback') return;
    audioManager.playSFX(session.isCorrect ? 'correct' : 'incorrect');
  }, [phase, session.isCorrect, audioManager]);

  useEffect(() => {
    if (phase === 'complete') audioManager.playSFX('celebrate');
  }, [phase, audioManager]);

  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:globe-trotter-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'globe-trotter',
      score: session.score,
      maxScore: session.maxScore,
      timeSpent,
      difficulty: config.difficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        questionsCorrect: session.correctCount,
        questionsTotal: session.maxScore,
      },
    };
    onComplete(result);
  }, [session.score, session.maxScore, session.correctCount, config.difficulty, onComplete]);

  function optionLabel(index: number): string {
    const opt = currentQuestion.options[index];
    if (opt.continent) return t(`continent.${continentKey(opt.continent)}`);
    if (!opt.country) return '';
    if (currentQuestion.mode === 'capital') return localizedCapital(opt.country, lang);
    return localizedName(opt.country, lang);
  }

  function optionIcon(index: number) {
    const opt = currentQuestion.options[index];
    if (opt.continent) {
      return (
        <span className={styles.optionIcon} aria-hidden="true">
          {continentEmoji(opt.continent)}
        </span>
      );
    }
    if (currentQuestion.mode === 'flag' && opt.country) {
      return (
        <span className={styles.optionIcon}>
          <IconImage
            src={flagSrc(opt.country.code)}
            alt=""
            fallback={flagEmoji(opt.country.code)}
            size={32}
          />
        </span>
      );
    }
    return undefined;
  }

  function optionState(index: number): 'default' | 'correct' | 'incorrect' {
    if (phase !== 'feedback') return 'default';
    if (index === currentQuestion.correctIndex) return 'correct';
    if (index === session.selectedIndex) return 'incorrect';
    return 'default';
  }

  const shellProps = {
    title: t('title'),
    onBack: onExit,
    audioManager,
    musicEnabled: config.settings.backgroundMusicEnabled,
  };

  if (phase === 'instruction') {
    const instructionKey = isTiny ? 'instructionTiny' : 'instruction';
    return (
      <GameShell {...shellProps}>
        <div className={styles.gameArea}>
          <InstructionBubble text={t(instructionKey)} character="🌍" />
          <OptionButton label={t('letsGo')} onSelect={session.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  if (phase === 'complete') {
    return (
      <GameShell {...shellProps} disableBackConfirm>
        <CelebrationOverlay
          title={t('celebrationTitle')}
          score={session.score}
          maxScore={session.maxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  const showFeedback = phase === 'feedback';

  return (
    <GameShell {...shellProps} onPause={() => setPaused(true)}>
      <div className={styles.gameArea}>
        <div className={styles.topBar}>
          <ScoreDisplay score={session.score} maxScore={session.maxScore} showStars />
          {!isTiny && <GameTimer mode="countup" paused={paused || showFeedback} size={56} />}
        </div>

        <ProgressBar current={session.currentIndex} total={session.maxScore} showLabel />

        <QuestionCard question={currentQuestion} lang={lang} t={t} />

        <div className={styles.options} role="group" aria-label={t('answers')}>
          {currentQuestion.options.map((_, index) => (
            <OptionButton
              key={index}
              label={optionLabel(index)}
              icon={optionIcon(index)}
              state={optionState(index)}
              disabled={showFeedback}
              onSelect={() => session.submitAnswer(index)}
              size={isTiny ? 'large' : 'normal'}
            />
          ))}
        </div>

        {showFeedback && (
          <div className={styles.feedbackArea}>
            <p
              className={session.isCorrect ? styles.correctMsg : styles.incorrectMsg}
              role="status"
            >
              {session.isCorrect ? t('correct') : t('incorrect')}
            </p>
            <OptionButton label={t('next')} onSelect={session.next} size="large" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {paused && (
          <PauseMenu onResume={() => setPaused(false)} onRestart={onRestart} onExit={onExit} />
        )}
      </AnimatePresence>
    </GameShell>
  );
}
