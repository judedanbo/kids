import { CONTINENTS, type Continent, type Country } from './countryPool';

export type GameMode = 'capital' | 'flag' | 'fact' | 'continent';

export interface QuestionOption {
  /** Set for capital / flag / fact modes. */
  country?: Country;
  /** Set for continent mode. */
  continent?: Continent;
}

export interface Question {
  id: string;
  mode: GameMode;
  /** The country the question is about. */
  subject: Country;
  /** Index into `subject.facts` — only meaningful for the `fact` mode. */
  factIndex: number;
  options: QuestionOption[];
  correctIndex: number;
}

export interface GenerateOptions {
  pool: Country[];
  modes: GameMode[];
  count: number;
  /** 1–5; at 3+ distractors prefer the same continent (harder). */
  difficulty: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks up to 3 distractor countries for `subject`, distinct from each other
 * and from the subject on the given display field. At difficulty 3+ it prefers
 * same-continent countries (capitals/flags that are easier to confuse).
 */
function pickDistractors(
  subject: Country,
  pool: Country[],
  difficulty: number,
  keyOf: (c: Country) => string,
): Country[] {
  const subjectKey = keyOf(subject);
  const seen = new Set<string>([subjectKey]);
  const candidates = pool.filter((c) => {
    const k = keyOf(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return c.code !== subject.code;
  });

  const sameContinent = shuffle(candidates.filter((c) => c.continent === subject.continent));
  const others = shuffle(candidates.filter((c) => c.continent !== subject.continent));

  const ordered = difficulty >= 3 ? [...sameContinent, ...others] : shuffle(candidates);

  return ordered.slice(0, 3);
}

function makeQuestion(
  subject: Country,
  mode: GameMode,
  pool: Country[],
  difficulty: number,
  index: number,
): Question {
  if (mode === 'continent') {
    const options: QuestionOption[] = shuffle([...CONTINENTS]).map((continent) => ({
      continent,
    }));
    const correctIndex = options.findIndex((o) => o.continent === subject.continent);
    return { id: `q${index}`, mode, subject, factIndex: 0, options, correctIndex };
  }

  const keyOf = mode === 'capital' ? (c: Country) => c.capital : (c: Country) => c.code;
  const distractors = pickDistractors(subject, pool, difficulty, keyOf);
  const choices = shuffle([subject, ...distractors]);
  const options: QuestionOption[] = choices.map((country) => ({ country }));
  const correctIndex = choices.findIndex((c) => c.code === subject.code);
  const factIndex =
    mode === 'fact' && subject.facts.length > 0
      ? Math.floor(Math.random() * subject.facts.length)
      : 0;

  return { id: `q${index}`, mode, subject, factIndex, options, correctIndex };
}

/**
 * Builds a session's worth of questions. Subjects are unique within the
 * session; modes are assigned round-robin over a shuffled mode order so every
 * enabled mode appears with roughly even frequency.
 */
export function generateQuestions(opts: GenerateOptions): Question[] {
  const { pool, modes, count, difficulty } = opts;
  if (pool.length === 0 || modes.length === 0 || count <= 0) return [];

  // Fact mode needs countries that actually have facts.
  const factCapablePool = pool.filter((c) => c.facts.length > 0);
  const subjects = shuffle(pool).slice(0, Math.min(count, pool.length));
  const modeOrder = shuffle([...modes]);

  return subjects.map((subject, i) => {
    let mode = modeOrder[i % modeOrder.length];
    if (mode === 'fact' && subject.facts.length === 0) {
      mode = modeOrder.find((m) => m !== 'fact') ?? 'flag';
    }
    const distractorPool = mode === 'fact' ? factCapablePool : pool;
    return makeQuestion(subject, mode, distractorPool, difficulty, i);
  });
}
