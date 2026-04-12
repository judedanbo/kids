import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { stylize } from './style.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..', '..', '..');
export const PUBLIC_IMAGES = join(REPO_ROOT, 'platform', 'public', 'images');

/**
 * Shape of every manifest entry:
 *   id:       stable unique ID (used for filtering / logs)
 *   category: logical group, used by --category flag and --pilot
 *   file:     absolute output path (WebP)
 *   size:     '1024x1024' | '1024x1536' | '1536x1024'
 *   prompt:   full text prompt sent to the model
 *   pilot:    true if this entry is part of the small pilot batch
 */

// ---------------------------------------------------------------------------
// STATIC ENTRIES (hand-authored prompts for high-visibility assets)
// ---------------------------------------------------------------------------

const UI_NAV = [
  ['nav-home',     'a cozy cartoon house with a red roof and a heart-shaped window, friendly and welcoming'],
  ['nav-profile',  'a smiling round cartoon avatar bust of a cheerful child with short hair, gender-neutral, joyful expression'],
  ['nav-rewards',  'a shiny gold trophy cup with two handles and a star on the front, sparkles around it'],
  ['nav-settings', 'a chunky friendly gear/cog shaped like soft rounded clay, pastel blue'],
];

const UI_SKILLS = [
  ['skill-literacy',     'an open storybook with colorful pages and a small rainbow arching over it'],
  ['skill-numeracy',     'a cluster of friendly floating number blocks (123) in bright colors'],
  ['skill-logic',        'a set of three colorful interlocking puzzle pieces fitting together'],
  ['skill-memory',       'a cartoon lightbulb with a tiny smiling brain glowing inside, warm yellow glow'],
  ['skill-creativity',   'a rainbow painter\'s palette with three fluffy paint blobs and a smiling paintbrush'],
  ['skill-motor',        'a cheerful running shoe with wings on the heel, pastel colors'],
  ['skill-science',      'a friendly round science flask with bubbling pastel liquid and little stars floating up'],
  ['skill-social',       'two rounded cartoon hands meeting in a high-five, with a small heart between them'],
  ['skill-default-game', 'a cheerful retro game controller as a soft rounded toy, pastel colors'],
];

const UI_REWARDS = [
  ['reward-first-star',   'a single large glossy gold star with a proud little smile, sparkles around it'],
  ['reward-speed-demon',  'a friendly lightning bolt mascot giving a thumbs-up, dynamic motion lines, cheerful not scary'],
  ['reward-bookworm',     'a cute smiling cartoon worm wearing round glasses, peeking out of a stack of colorful books'],
  ['reward-math-wizard',  'a tiny friendly wizard with a pointed hat made of number shapes, holding a glowing plus sign'],
  ['reward-super-streak', 'a soft cartoon flame mascot with big eyes and a confident smile, warm cozy fire, not scary'],
  ['reward-explorer',     'a rolled-up treasure map with a compass rose sticker on it, soft pastel colors'],
  ['reward-master',       'a shiny gold crown with colorful gem buttons, glowing softly'],
];

const UI_STATUS = [
  ['status-lock',         'a chunky friendly padlock in pastel blue, rounded clay-like shape, closed but not menacing'],
  ['status-empty-trophy', 'an empty trophy shelf with a friendly little "add your first trophy" placeholder outline'],
  ['status-empty-stars',  'a soft swirl of small sparkling stars on a gentle pastel background'],
  ['status-empty-target', 'a cheerful archery target with a rounded bullseye and a small gold star in the center'],
];

const GAME_THUMBNAILS = [
  ['thumb-math-adventure', 'a colorful adventure scene: friendly number blocks stacked like a playful castle on a rolling pastel hill, a plus sign kite flying in the sky'],
  ['thumb-memory-match',   'a grid of colorful face-down cartoon playing cards, two cards flipped revealing matching smiling animal faces'],
  ['thumb-more-or-less',   'two groups of cheerful fruit (apples) on a pastel surface, one group clearly larger, with a friendly question mark floating above'],
  ['thumb-safety-scout',   'a cheerful cartoon shield mascot with a smile, surrounded by safe household items (cup, ball, book) arranged neatly'],
  ['thumb-spelling-bee',   'a friendly smiling cartoon bee mascot hovering next to a glowing honeycomb, cute not scary'],
  ['thumb-word-puzzle',    'colorful wooden letter blocks scattered playfully, spelling nothing in particular, warm wood texture'],
];

const GAME_MASCOTS = [
  ['mascot-calculator', 'a friendly cartoon calculator with a smiling face, rounded buttons and a happy screen display (no readable numbers)'],
  ['mascot-card-deck',  'a cheerful cartoon deck of cards with a smiling face on the top card, casually fanned out'],
  ['mascot-numbers',    'a cluster of cute smiling number-shaped characters hugging each other, pastel colors'],
  ['mascot-shield',     'a friendly rounded cartoon shield with a gentle smile, pastel blue and gold, safe and reassuring'],
  ['mascot-bee',        'a plump smiling cartoon bee with big kind eyes and tiny friendly wings, hovering happily, cute not scary'],
  ['mascot-letters',    'a small group of smiling alphabet letter blocks (rounded wood-like) standing side by side'],
];

const MORE_OR_LESS_OBJECTS = [
  ['mol-apple',     'a single glossy red cartoon apple with a green leaf on top, cheerful highlight'],
  ['mol-star',      'a single bright yellow cartoon star with rounded points and a soft glow'],
  ['mol-block',     'a single chunky blue toy block with rounded corners, soft plastic look'],
  ['mol-butterfly', 'a single friendly cartoon butterfly with colorful pastel wings and a small smile, front view'],
  ['mol-fish',      'a single cheerful cartoon orange fish with big friendly eyes, side view, bubbles around it'],
  ['mol-flower',    'a single pink cartoon flower with five rounded petals and a smiling yellow center'],
];

const SPELLING_BEE_EXTRA = [
  ['sb-heart-full',  'a single plump glossy red cartoon heart, vibrant and full of life, soft highlight'],
  ['sb-heart-empty', 'a single cartoon heart outline only, gentle gray, soft pastel — indicates a lost life, not scary'],
  ['sb-speaker',     'a small friendly round cartoon loudspeaker icon with gentle sound wave curves, pastel blue'],
];

// ---------------------------------------------------------------------------
// CONTENT ENTRIES (derived from game data files, one per dataset row)
// ---------------------------------------------------------------------------

/** Subject-only prompts for neutral spelling-bee vocabulary. */
function spellingBeeSubjectFor(word) {
  // Generic fallback — an isolated cheerful illustration of the word.
  // The style/suffix is added by `stylize()`.
  return `a single cheerful, clearly recognizable cartoon ${word}, isolated centered subject, age-appropriate and friendly`;
}

/** Subject-only prompts for safety-scout household/outdoor objects. */
function safetyScoutSubjectFor(obj) {
  // Object-specific touches to avoid ambiguous / unsafe-looking renderings.
  const tweaks = {
    'kitchen-knife': 'a small cartoon kitchen knife lying flat on a wooden cutting board, shown as a neutral household item (no hands, no blood, no aggressive pose)',
    'medicine-bottle': 'a small cartoon medicine bottle with a childproof cap, no readable label, neutral household item',
    'razor': 'a cartoon safety razor lying flat on a bathroom counter, shown as a neutral household item (no blood, no injury)',
    'electrical-outlet': 'a cartoon wall outlet on a pastel wall, clean and neutral, no sparks, no damage',
    'candle': 'a single cartoon candle with a small gentle flame, warm and cozy, not threatening',
    'matches': 'a small cartoon matchbox lying closed on a pastel surface, neutral household item, no open flame',
    'busy-road': 'a cheerful cartoon street with a few cars and a crossing zebra, daytime, friendly not chaotic',
    'stray-animal': 'a gentle cartoon dog with a slightly messy coat sitting calmly outdoors, friendly and safe-looking',
    'deep-puddle': 'a cartoon muddy puddle on a sidewalk with gentle ripples, daytime, not scary',
    'power-tools': 'a small cartoon cordless drill resting on a workbench, neutral, not in use'
  };
  if (tweaks[obj.id]) return tweaks[obj.id];
  return `a single cheerful, clearly recognizable cartoon ${obj.name.toLowerCase()}, isolated centered subject, neutral household or outdoor item, age-appropriate`;
}

// ---------------------------------------------------------------------------
// MANIFEST BUILDER
// ---------------------------------------------------------------------------

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

/** Tags that are part of the minimal pilot batch for style approval. */
const PILOT_IDS = new Set([
  'ui/nav-home',
  'ui/reward-first-star',
  'ui/skill-literacy',
  'games/mascots/mascot-bee',
  'games/thumbnails/thumb-spelling-bee',
  'games/more-or-less/mol-apple',
  'spelling-bee/cat',
  'safety-scout/cup',
]);

function mk(category, id, subject, outputPath, size = '1024x1024') {
  const fullId = `${category}/${id}`;
  return {
    id: fullId,
    category,
    file: outputPath,
    size,
    prompt: stylize(subject),
    pilot: PILOT_IDS.has(fullId),
  };
}

export async function buildManifest() {
  const entries = [];

  // UI — nav / skills / rewards / status
  for (const [id, s] of UI_NAV)
    entries.push(mk('ui', id, s, join(PUBLIC_IMAGES, 'ui', `${id}.webp`)));
  for (const [id, s] of UI_SKILLS)
    entries.push(mk('ui', id, s, join(PUBLIC_IMAGES, 'ui', `${id}.webp`)));
  for (const [id, s] of UI_REWARDS)
    entries.push(mk('ui', id, s, join(PUBLIC_IMAGES, 'ui', `${id}.webp`)));
  for (const [id, s] of UI_STATUS)
    entries.push(mk('ui', id, s, join(PUBLIC_IMAGES, 'ui', `${id}.webp`)));

  // Game thumbnails
  for (const [id, s] of GAME_THUMBNAILS) {
    const gameId = id.replace(/^thumb-/, '');
    entries.push(mk('games/thumbnails', id, s,
      join(PUBLIC_IMAGES, 'games', `${gameId}.webp`), '1536x1024'));
  }

  // Game mascots
  for (const [id, s] of GAME_MASCOTS)
    entries.push(mk('games/mascots', id, s,
      join(PUBLIC_IMAGES, 'games', 'mascots', `${id.replace(/^mascot-/, '')}.webp`)));

  // More-or-Less counting objects
  for (const [id, s] of MORE_OR_LESS_OBJECTS)
    entries.push(mk('games/more-or-less', id, s,
      join(PUBLIC_IMAGES, 'games', 'more-or-less', `${id.replace(/^mol-/, '')}.webp`)));

  // Spelling Bee gameplay extras (hearts, speaker)
  for (const [id, s] of SPELLING_BEE_EXTRA)
    entries.push(mk('games/spelling-bee', id, s,
      join(PUBLIC_IMAGES, 'games', 'spelling-bee', `${id.replace(/^sb-/, '')}.webp`)));

  // Spelling Bee word illustrations (derived from data files, deduped)
  const sbDir = join(REPO_ROOT, 'games', 'spelling-bee', 'src', 'data');
  const [tiny, junior, explorer] = await Promise.all([
    readJson(join(sbDir, 'words-tiny.json')),
    readJson(join(sbDir, 'words-junior.json')),
    readJson(join(sbDir, 'words-explorer.json')),
  ]);
  const sbSeen = new Set();
  for (const w of [...tiny, ...junior, ...explorer]) {
    if (!w.image || sbSeen.has(w.image)) continue;
    sbSeen.add(w.image);
    entries.push(mk('spelling-bee', w.word,
      spellingBeeSubjectFor(w.word),
      join(PUBLIC_IMAGES, 'spelling-bee', w.image)));
  }

  // Safety Scout object illustrations (derived from data file)
  const ssObjects = await readJson(
    join(REPO_ROOT, 'games', 'safety-scout', 'src', 'data', 'objects.json'),
  );
  for (const obj of ssObjects) {
    if (!obj.image) continue;
    entries.push(mk('safety-scout', obj.id,
      safetyScoutSubjectFor(obj),
      join(PUBLIC_IMAGES, 'safety-scout', obj.image)));
  }

  // Re-mark pilot for content entries (pilot set includes two content IDs)
  for (const e of entries) e.pilot = PILOT_IDS.has(e.id);

  return entries;
}
