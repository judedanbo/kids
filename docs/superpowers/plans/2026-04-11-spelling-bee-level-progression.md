# Spelling Bee Level Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-level in-session progression to the Spelling Bee game so kids advance through 5 levels per session with a challenge ladder difficulty arc.

**Architecture:** A new `useSessionLevels` hook orchestrates 5 levels per session using a challenge ladder (warm-up → at-level → stretch). The existing `useSpellingRound` hook is refactored to handle per-level gameplay. A new `LevelPlay` component encapsulates per-level rendering and remounts via React `key` between levels. Word pools are expanded from ~17 to 80-100 entries per age tier.

**Tech Stack:** React 19, TypeScript (strict), Vitest, CSS Modules, react-i18next

**Spec:** `docs/superpowers/specs/2026-04-11-spelling-bee-level-progression-design.md`

---

## File Map

**New files:**
- `games/spelling-bee/src/hooks/useSessionLevels.ts` — session orchestration hook + exported pure functions
- `games/spelling-bee/src/__tests__/useSessionLevels.test.ts` — tests for pure functions
- `games/spelling-bee/src/components/LevelPlay.tsx` — per-level gameplay component
- `games/spelling-bee/src/components/LevelPlay.module.css` — gameplay styles
- `games/spelling-bee/src/components/LevelIndicator.tsx` — "Level 2 / 5" badge
- `games/spelling-bee/src/components/LevelIndicator.module.css` — indicator styles
- `games/spelling-bee/src/components/LevelTransition.tsx` — between-levels screen
- `games/spelling-bee/src/components/LevelTransition.module.css` — transition styles

**Modified files:**
- `games/spelling-bee/src/utils/wordSelector.ts` — add `exclude` param
- `games/spelling-bee/src/__tests__/wordSelector.test.ts` — tests for exclude
- `games/spelling-bee/src/hooks/useSpellingRound.ts` — remove instruction phase, externalize lives
- `games/spelling-bee/src/data/words-tiny.json` — expand from 18 to 80 words
- `games/spelling-bee/src/data/words-junior.json` — expand from 16 to 90 words
- `games/spelling-bee/src/data/words-explorer.json` — expand from 16 to 100 words
- `games/spelling-bee/src/SpellingBee.tsx` — rewrite as session orchestrator
- `games/spelling-bee/src/SpellingBee.module.css` — add session-level styles
- `games/spelling-bee/src/__tests__/SpellingBee.test.tsx` — update for multi-level flow
- `games/spelling-bee/src/locales/en/spelling-bee.json` — new translation keys
- `games/spelling-bee/src/locales/fr/spelling-bee.json` — new translation keys

---

### Task 1: Add `exclude` parameter to `selectWords`

**Files:**
- Modify: `games/spelling-bee/src/utils/wordSelector.ts`
- Modify: `games/spelling-bee/src/__tests__/wordSelector.test.ts`

- [ ] **Step 1: Write failing tests for word exclusion**

Add these tests to the existing `describe('selectWords')` block in `games/spelling-bee/src/__tests__/wordSelector.test.ts`:

```ts
it('excludes specified words from selection', () => {
  const result = selectWords(wordsTiny, { difficulty: 4, count: 10, exclude: ['cat', 'dog', 'sun'] });
  const words = result.map((w) => w.word);
  expect(words).not.toContain('cat');
  expect(words).not.toContain('dog');
  expect(words).not.toContain('sun');
});

it('returns empty array when all eligible words are excluded', () => {
  const allDiff1 = wordsTiny.filter((w) => w.difficulty <= 1);
  const excludeAll = allDiff1.map((w) => w.word);
  const result = selectWords(wordsTiny, { difficulty: 1, count: 5, exclude: excludeAll });
  expect(result).toHaveLength(0);
});

it('works normally when exclude is omitted', () => {
  const result = selectWords(wordsTiny, { difficulty: 2, count: 4 });
  expect(result).toHaveLength(4);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: 2 new tests FAIL (exclude not implemented), 1 new test PASSES (omitted exclude).

- [ ] **Step 3: Implement exclude in selectWords**

In `games/spelling-bee/src/utils/wordSelector.ts`, update the interface and function:

```ts
interface SelectOptions {
  difficulty: number;
  count: number;
  exclude?: string[];
}

export function selectWords(pool: WordEntry[], options: SelectOptions): WordEntry[] {
  const { difficulty, count, exclude = [] } = options;

  const excludeSet = new Set(exclude);
  const eligible = pool.filter((w) => w.difficulty <= difficulty && !excludeSet.has(w.word));

  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => {
    const distA = difficulty - a.difficulty;
    const distB = difficulty - b.difficulty;
    if (distA !== distB) return distA - distB;
    return Math.random() - 0.5;
  });

  const selected = sorted.slice(0, count);

  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/utils/wordSelector.ts games/spelling-bee/src/__tests__/wordSelector.test.ts
git commit -m "feat(spelling-bee): add exclude parameter to selectWords"
```

---

### Task 2: Expand word pools

**Files:**
- Modify: `games/spelling-bee/src/data/words-tiny.json`
- Modify: `games/spelling-bee/src/data/words-junior.json`
- Modify: `games/spelling-bee/src/data/words-explorer.json`

- [ ] **Step 1: Replace words-tiny.json with expanded version (80 words, 20 per difficulty)**

Replace the entire contents of `games/spelling-bee/src/data/words-tiny.json` with:

```json
[
  { "word": "cat", "difficulty": 1, "image": "cat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "dog", "difficulty": 1, "image": "dog.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "sun", "difficulty": 1, "image": "sun.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hat", "difficulty": 1, "image": "hat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "cup", "difficulty": 1, "image": "cup.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bed", "difficulty": 1, "image": "bed.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "pig", "difficulty": 1, "image": "pig.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hen", "difficulty": 1, "image": "hen.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "fox", "difficulty": 1, "image": "fox.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bug", "difficulty": 1, "image": "bug.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bat", "difficulty": 1, "image": "bat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "jam", "difficulty": 1, "image": "jam.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "nut", "difficulty": 1, "image": "nut.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "van", "difficulty": 1, "image": "van.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "mop", "difficulty": 1, "image": "mop.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hug", "difficulty": 1, "image": "hug.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "pot", "difficulty": 1, "image": "pot.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "pin", "difficulty": 1, "image": "pin.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "rat", "difficulty": 1, "image": "rat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "kit", "difficulty": 1, "image": "kit.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "pen", "difficulty": 2, "image": "pen.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bus", "difficulty": 2, "image": "bus.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "box", "difficulty": 2, "image": "box.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "map", "difficulty": 2, "image": "map.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "ant", "difficulty": 2, "image": "ant.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "owl", "difficulty": 2, "image": "owl.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "fin", "difficulty": 2, "image": "fin.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "gum", "difficulty": 2, "image": "gum.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "zip", "difficulty": 2, "image": "zip.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "dot", "difficulty": 2, "image": "dot.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "net", "difficulty": 2, "image": "net.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "rug", "difficulty": 2, "image": "rug.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "jug", "difficulty": 2, "image": "jug.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "mud", "difficulty": 2, "image": "mud.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "vet", "difficulty": 2, "image": "vet.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "cub", "difficulty": 2, "image": "cub.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "dip", "difficulty": 2, "image": "dip.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "wig", "difficulty": 2, "image": "wig.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "jet", "difficulty": 2, "image": "jet.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hop", "difficulty": 2, "image": "hop.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "tree", "difficulty": 3, "image": "tree.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "ball", "difficulty": 3, "image": "ball.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "fish", "difficulty": 3, "image": "fish.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bird", "difficulty": 3, "image": "bird.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "duck", "difficulty": 3, "image": "duck.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bell", "difficulty": 3, "image": "bell.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "drum", "difficulty": 3, "image": "drum.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "gift", "difficulty": 3, "image": "gift.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "kite", "difficulty": 3, "image": "kite.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "leaf", "difficulty": 3, "image": "leaf.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "moon", "difficulty": 3, "image": "moon.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "ring", "difficulty": 3, "image": "ring.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "ship", "difficulty": 3, "image": "ship.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "sock", "difficulty": 3, "image": "sock.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "tent", "difficulty": 3, "image": "tent.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "worm", "difficulty": 3, "image": "worm.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "book", "difficulty": 3, "image": "book.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "lamp", "difficulty": 3, "image": "lamp.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "milk", "difficulty": 3, "image": "milk.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "nest", "difficulty": 3, "image": "nest.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "cake", "difficulty": 4, "image": "cake.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "frog", "difficulty": 4, "image": "frog.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "star", "difficulty": 4, "image": "star.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "rain", "difficulty": 4, "image": "rain.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "snow", "difficulty": 4, "image": "snow.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "crab", "difficulty": 4, "image": "crab.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "flag", "difficulty": 4, "image": "flag.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "swan", "difficulty": 4, "image": "swan.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "drop", "difficulty": 4, "image": "drop.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "plum", "difficulty": 4, "image": "plum.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "skip", "difficulty": 4, "image": "skip.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "snap", "difficulty": 4, "image": "snap.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "spin", "difficulty": 4, "image": "spin.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "step", "difficulty": 4, "image": "step.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "swim", "difficulty": 4, "image": "swim.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "trip", "difficulty": 4, "image": "trip.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "bear", "difficulty": 4, "image": "bear.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "goat", "difficulty": 4, "image": "goat.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "clap", "difficulty": 4, "image": "clap.webp", "definition": "", "origin": "", "sentence": "" },
  { "word": "hand", "difficulty": 4, "image": "hand.webp", "definition": "", "origin": "", "sentence": "" }
]
```

- [ ] **Step 2: Replace words-junior.json with expanded version (90 words, 15 per difficulty)**

Replace the entire contents of `games/spelling-bee/src/data/words-junior.json` with:

```json
[
  { "word": "book", "difficulty": 1, "image": "", "definition": "A set of pages with words or pictures", "origin": "Old English", "sentence": "I read a book before bed." },
  { "word": "fish", "difficulty": 1, "image": "", "definition": "An animal that lives in water", "origin": "Old English", "sentence": "The fish swam in the pond." },
  { "word": "milk", "difficulty": 1, "image": "", "definition": "A white drink from cows", "origin": "Old English", "sentence": "She drank a glass of milk." },
  { "word": "desk", "difficulty": 1, "image": "", "definition": "A table used for reading or writing", "origin": "Latin", "sentence": "He sat at his desk to do homework." },
  { "word": "band", "difficulty": 1, "image": "", "definition": "A group of musicians or a strip of material", "origin": "Old English", "sentence": "The band played a fun song." },
  { "word": "cork", "difficulty": 1, "image": "", "definition": "A light material used to seal bottles", "origin": "Spanish", "sentence": "He popped the cork off the bottle." },
  { "word": "dust", "difficulty": 1, "image": "", "definition": "Tiny dry particles on surfaces", "origin": "Old English", "sentence": "She wiped the dust off the shelf." },
  { "word": "golf", "difficulty": 1, "image": "", "definition": "A sport played with clubs and a ball", "origin": "Scottish", "sentence": "Dad loves to play golf on weekends." },
  { "word": "help", "difficulty": 1, "image": "", "definition": "To give aid or assistance", "origin": "Old English", "sentence": "Can you help me carry this box?" },
  { "word": "jolt", "difficulty": 1, "image": "", "definition": "A sudden bump or shock", "origin": "English", "sentence": "The bus hit a bump and gave us a jolt." },
  { "word": "knob", "difficulty": 1, "image": "", "definition": "A round handle on a door or drawer", "origin": "German", "sentence": "Turn the knob to open the door." },
  { "word": "luck", "difficulty": 1, "image": "", "definition": "Good fortune or chance", "origin": "Dutch", "sentence": "She found a penny for good luck." },
  { "word": "mist", "difficulty": 1, "image": "", "definition": "A light fog or fine spray of water", "origin": "Old English", "sentence": "The morning mist covered the fields." },
  { "word": "pump", "difficulty": 1, "image": "", "definition": "A device that moves liquid or air", "origin": "Dutch", "sentence": "Use the pump to fill the tire with air." },
  { "word": "silk", "difficulty": 1, "image": "", "definition": "A smooth soft fabric", "origin": "Old English", "sentence": "The scarf was made of smooth silk." },
  { "word": "lamp", "difficulty": 2, "image": "", "definition": "A device that gives light", "origin": "Greek", "sentence": "Turn on the lamp please." },
  { "word": "jump", "difficulty": 2, "image": "", "definition": "To push yourself up into the air", "origin": "Middle English", "sentence": "He can jump very high." },
  { "word": "hand", "difficulty": 2, "image": "", "definition": "The part of your body at the end of your arm", "origin": "Old English", "sentence": "She raised her hand in class." },
  { "word": "blend", "difficulty": 2, "image": "", "definition": "To mix things together", "origin": "Old English", "sentence": "Blend the fruit to make a smoothie." },
  { "word": "clamp", "difficulty": 2, "image": "", "definition": "A tool that holds things together tightly", "origin": "Dutch", "sentence": "Use a clamp to hold the pieces together." },
  { "word": "drift", "difficulty": 2, "image": "", "definition": "To move slowly without control", "origin": "Old English", "sentence": "The boat began to drift down the river." },
  { "word": "frost", "difficulty": 2, "image": "", "definition": "A thin layer of ice on surfaces", "origin": "Old English", "sentence": "There was frost on the window this morning." },
  { "word": "grasp", "difficulty": 2, "image": "", "definition": "To hold something firmly", "origin": "Middle English", "sentence": "She tried to grasp the rope tightly." },
  { "word": "plank", "difficulty": 2, "image": "", "definition": "A long flat piece of wood", "origin": "Latin", "sentence": "He walked across the wooden plank." },
  { "word": "quilt", "difficulty": 2, "image": "", "definition": "A warm blanket made of stitched layers", "origin": "Latin", "sentence": "Grandma made a colorful quilt for my bed." },
  { "word": "shelf", "difficulty": 2, "image": "", "definition": "A flat board for storing things", "origin": "Old English", "sentence": "Put the books back on the shelf." },
  { "word": "stung", "difficulty": 2, "image": "", "definition": "Past tense of sting; pricked by an insect", "origin": "Old English", "sentence": "The bee stung him on the arm." },
  { "word": "swirl", "difficulty": 2, "image": "", "definition": "To move in a spinning pattern", "origin": "Scottish", "sentence": "Watch the paint swirl in the water." },
  { "word": "brake", "difficulty": 2, "image": "", "definition": "A device used to slow or stop", "origin": "Dutch", "sentence": "Press the brake to stop the bicycle." },
  { "word": "crisp", "difficulty": 2, "image": "", "definition": "Firm, crunchy, and fresh", "origin": "Latin", "sentence": "The apple was crisp and delicious." },
  { "word": "plant", "difficulty": 3, "image": "", "definition": "A living thing that grows in soil", "origin": "Latin", "sentence": "We planted a flower in the garden." },
  { "word": "crane", "difficulty": 3, "image": "", "definition": "A large bird or a machine for lifting", "origin": "Old English", "sentence": "The crane lifted the heavy box." },
  { "word": "stove", "difficulty": 3, "image": "", "definition": "A device used for cooking food", "origin": "Dutch", "sentence": "Dad cooked dinner on the stove." },
  { "word": "beach", "difficulty": 3, "image": "", "definition": "Sandy shore by the ocean", "origin": "Old English", "sentence": "We built sandcastles at the beach." },
  { "word": "candy", "difficulty": 3, "image": "", "definition": "A sweet treat made with sugar", "origin": "Arabic", "sentence": "She shared her candy with her friends." },
  { "word": "chalk", "difficulty": 3, "image": "", "definition": "A soft white stick used for writing", "origin": "Latin", "sentence": "The teacher wrote on the board with chalk." },
  { "word": "grape", "difficulty": 3, "image": "", "definition": "A small round fruit that grows in bunches", "origin": "French", "sentence": "She ate a bunch of purple grapes." },
  { "word": "knife", "difficulty": 3, "image": "", "definition": "A tool with a sharp blade for cutting", "origin": "Old English", "sentence": "Use a knife to cut the bread." },
  { "word": "pearl", "difficulty": 3, "image": "", "definition": "A round gem found inside an oyster", "origin": "Latin", "sentence": "The necklace had a shiny pearl." },
  { "word": "queen", "difficulty": 3, "image": "", "definition": "A female ruler of a kingdom", "origin": "Old English", "sentence": "The queen wore a golden crown." },
  { "word": "torch", "difficulty": 3, "image": "", "definition": "A portable light or flame", "origin": "French", "sentence": "He used a torch to see in the cave." },
  { "word": "watch", "difficulty": 3, "image": "", "definition": "A small clock worn on the wrist", "origin": "Old English", "sentence": "She checked the time on her watch." },
  { "word": "earth", "difficulty": 3, "image": "", "definition": "The planet we live on", "origin": "Old English", "sentence": "Earth is the third planet from the sun." },
  { "word": "giant", "difficulty": 3, "image": "", "definition": "Something very large or a huge person", "origin": "Greek", "sentence": "The giant sunflower grew taller than me." },
  { "word": "ocean", "difficulty": 3, "image": "", "definition": "A very large body of salt water", "origin": "Greek", "sentence": "Whales live in the ocean." },
  { "word": "brave", "difficulty": 4, "image": "", "definition": "Ready to face danger without fear", "origin": "French", "sentence": "The brave knight saved the village." },
  { "word": "float", "difficulty": 4, "image": "", "definition": "To rest on top of water", "origin": "Old English", "sentence": "The leaf will float on the river." },
  { "word": "castle", "difficulty": 4, "image": "", "definition": "A large strong building with towers", "origin": "Latin", "sentence": "The king lived in a grand castle." },
  { "word": "dragon", "difficulty": 4, "image": "", "definition": "A mythical fire-breathing creature", "origin": "Greek", "sentence": "The dragon guarded the treasure." },
  { "word": "forest", "difficulty": 4, "image": "", "definition": "A large area covered with trees", "origin": "Latin", "sentence": "The deer ran into the forest." },
  { "word": "knight", "difficulty": 4, "image": "", "definition": "An armored soldier from the Middle Ages", "origin": "Old English", "sentence": "The knight rode a white horse." },
  { "word": "orange", "difficulty": 4, "image": "", "definition": "A round citrus fruit or a color", "origin": "Sanskrit", "sentence": "She peeled an orange for a snack." },
  { "word": "picnic", "difficulty": 4, "image": "", "definition": "An outdoor meal", "origin": "French", "sentence": "We had a picnic in the park." },
  { "word": "rabbit", "difficulty": 4, "image": "", "definition": "A small furry animal with long ears", "origin": "Dutch", "sentence": "The rabbit hopped across the lawn." },
  { "word": "silver", "difficulty": 4, "image": "", "definition": "A shiny gray precious metal", "origin": "Old English", "sentence": "She wore a silver bracelet." },
  { "word": "ticket", "difficulty": 4, "image": "", "definition": "A piece of paper allowing entry or travel", "origin": "French", "sentence": "He bought a ticket for the show." },
  { "word": "trophy", "difficulty": 4, "image": "", "definition": "A prize given for winning", "origin": "Greek", "sentence": "The team won a shiny gold trophy." },
  { "word": "cotton", "difficulty": 4, "image": "", "definition": "A soft white fiber used to make cloth", "origin": "Arabic", "sentence": "This shirt is made of cotton." },
  { "word": "harbor", "difficulty": 4, "image": "", "definition": "A sheltered place where ships anchor", "origin": "Old English", "sentence": "The boats rested in the harbor." },
  { "word": "velvet", "difficulty": 4, "image": "", "definition": "A soft fabric with a smooth texture", "origin": "Latin", "sentence": "The curtains were made of red velvet." },
  { "word": "bridge", "difficulty": 5, "image": "", "definition": "A structure built over a river or road", "origin": "Old English", "sentence": "We walked across the bridge to the park." },
  { "word": "frozen", "difficulty": 5, "image": "", "definition": "Turned into ice or very cold", "origin": "Old English", "sentence": "The lake was frozen in winter." },
  { "word": "garden", "difficulty": 5, "image": "", "definition": "A piece of land where plants are grown", "origin": "French", "sentence": "She grows tomatoes in the garden." },
  { "word": "basket", "difficulty": 5, "image": "", "definition": "A container made of woven material", "origin": "French", "sentence": "She carried a basket of apples." },
  { "word": "cactus", "difficulty": 5, "image": "", "definition": "A desert plant with spines", "origin": "Greek", "sentence": "The cactus stores water inside its stem." },
  { "word": "falcon", "difficulty": 5, "image": "", "definition": "A fast bird of prey", "origin": "Latin", "sentence": "The falcon soared above the valley." },
  { "word": "hammer", "difficulty": 5, "image": "", "definition": "A tool used for hitting nails", "origin": "Old English", "sentence": "He used a hammer to build a birdhouse." },
  { "word": "insect", "difficulty": 5, "image": "", "definition": "A small animal with six legs", "origin": "Latin", "sentence": "A ladybug is a tiny insect." },
  { "word": "jungle", "difficulty": 5, "image": "", "definition": "A thick tropical forest", "origin": "Sanskrit", "sentence": "Monkeys swing through the jungle trees." },
  { "word": "magnet", "difficulty": 5, "image": "", "definition": "An object that attracts metal", "origin": "Greek", "sentence": "The magnet stuck to the fridge door." },
  { "word": "pocket", "difficulty": 5, "image": "", "definition": "A small bag sewn into clothing", "origin": "French", "sentence": "He put the coins in his pocket." },
  { "word": "rocket", "difficulty": 5, "image": "", "definition": "A vehicle that flies into space", "origin": "Italian", "sentence": "The rocket blasted off into the sky." },
  { "word": "wisdom", "difficulty": 5, "image": "", "definition": "Good judgment and knowledge", "origin": "Old English", "sentence": "Grandpa shared his wisdom with us." },
  { "word": "battle", "difficulty": 5, "image": "", "definition": "A fight between groups", "origin": "French", "sentence": "The two armies prepared for battle." },
  { "word": "colony", "difficulty": 5, "image": "", "definition": "A group of people or animals living together", "origin": "Latin", "sentence": "The ant colony worked together to gather food." },
  { "word": "market", "difficulty": 6, "image": "", "definition": "A place where people buy and sell things", "origin": "Latin", "sentence": "We bought fruit at the market." },
  { "word": "winter", "difficulty": 6, "image": "", "definition": "The coldest season of the year", "origin": "Old English", "sentence": "Snow falls in winter." },
  { "word": "captain", "difficulty": 6, "image": "", "definition": "The leader of a team or ship", "origin": "Latin", "sentence": "The captain steered the ship through the storm." },
  { "word": "dolphin", "difficulty": 6, "image": "", "definition": "A smart ocean mammal", "origin": "Greek", "sentence": "The dolphin jumped out of the water." },
  { "word": "freedom", "difficulty": 6, "image": "", "definition": "The state of being free", "origin": "Old English", "sentence": "The bird enjoyed its freedom in the sky." },
  { "word": "journey", "difficulty": 6, "image": "", "definition": "A trip from one place to another", "origin": "French", "sentence": "They began a long journey to the mountains." },
  { "word": "lantern", "difficulty": 6, "image": "", "definition": "A lamp with a protective case", "origin": "Latin", "sentence": "She hung a lantern to light the porch." },
  { "word": "monster", "difficulty": 6, "image": "", "definition": "A scary or imaginary creature", "origin": "Latin", "sentence": "The friendly monster lived under the bed." },
  { "word": "mystery", "difficulty": 6, "image": "", "definition": "Something that is hard to explain", "origin": "Greek", "sentence": "The missing key was a real mystery." },
  { "word": "perfect", "difficulty": 6, "image": "", "definition": "Without any mistakes or flaws", "origin": "Latin", "sentence": "She scored a perfect ten in the contest." },
  { "word": "problem", "difficulty": 6, "image": "", "definition": "Something that needs to be solved", "origin": "Greek", "sentence": "He worked hard to solve the math problem." },
  { "word": "rainbow", "difficulty": 6, "image": "", "definition": "An arc of colors in the sky after rain", "origin": "Old English", "sentence": "A rainbow appeared after the storm." },
  { "word": "shelter", "difficulty": 6, "image": "", "definition": "A place that gives protection", "origin": "Old English", "sentence": "They found shelter from the rain under a tree." },
  { "word": "feather", "difficulty": 6, "image": "", "definition": "A light covering on a bird's body", "origin": "Old English", "sentence": "She found a blue feather on the ground." },
  { "word": "blanket", "difficulty": 6, "image": "", "definition": "A warm covering used on beds", "origin": "French", "sentence": "He pulled the blanket over himself." }
]
```

- [ ] **Step 3: Replace words-explorer.json with expanded version (100 words, 10 per difficulty)**

Replace the entire contents of `games/spelling-bee/src/data/words-explorer.json` with:

```json
[
  { "word": "house", "difficulty": 1, "image": "", "definition": "A building where people live", "origin": "Old English", "sentence": "They moved to a new house." },
  { "word": "table", "difficulty": 1, "image": "", "definition": "A piece of furniture with a flat top", "origin": "Latin", "sentence": "Put the plates on the table." },
  { "word": "water", "difficulty": 1, "image": "", "definition": "A clear liquid essential for life", "origin": "Old English", "sentence": "She filled the glass with cold water." },
  { "word": "light", "difficulty": 1, "image": "", "definition": "Brightness that lets you see", "origin": "Old English", "sentence": "The light from the sun warmed the room." },
  { "word": "music", "difficulty": 1, "image": "", "definition": "Sounds arranged in a pleasing pattern", "origin": "Greek", "sentence": "She played beautiful music on the piano." },
  { "word": "paper", "difficulty": 1, "image": "", "definition": "A thin sheet used for writing", "origin": "Latin", "sentence": "He folded the paper into an airplane." },
  { "word": "river", "difficulty": 1, "image": "", "definition": "A large stream of water that flows to the sea", "origin": "Latin", "sentence": "The river flowed through the valley." },
  { "word": "smile", "difficulty": 1, "image": "", "definition": "A happy expression on the face", "origin": "Scandinavian", "sentence": "Her smile brightened everyone's day." },
  { "word": "tower", "difficulty": 1, "image": "", "definition": "A tall narrow building or structure", "origin": "Latin", "sentence": "The tower reached high above the city." },
  { "word": "green", "difficulty": 1, "image": "", "definition": "The color of grass and leaves", "origin": "Old English", "sentence": "The green leaves rustled in the wind." },
  { "word": "ocean", "difficulty": 2, "image": "", "definition": "A very large body of salt water", "origin": "Greek", "sentence": "Whales live in the ocean." },
  { "word": "forest", "difficulty": 2, "image": "", "definition": "A large area covered with trees", "origin": "Latin", "sentence": "The deer ran into the forest." },
  { "word": "window", "difficulty": 2, "image": "", "definition": "An opening in a wall fitted with glass", "origin": "Old Norse", "sentence": "She looked out the window at the garden." },
  { "word": "travel", "difficulty": 2, "image": "", "definition": "To go from one place to another", "origin": "French", "sentence": "They love to travel to new countries." },
  { "word": "energy", "difficulty": 2, "image": "", "definition": "The power to do work or move", "origin": "Greek", "sentence": "Solar panels turn sunlight into energy." },
  { "word": "desert", "difficulty": 2, "image": "", "definition": "A very dry area with little rain", "origin": "Latin", "sentence": "The desert can be very hot during the day." },
  { "word": "island", "difficulty": 2, "image": "", "definition": "Land surrounded by water", "origin": "Old English", "sentence": "The island had beautiful sandy beaches." },
  { "word": "puzzle", "difficulty": 2, "image": "", "definition": "A game that tests your thinking", "origin": "English", "sentence": "She solved the puzzle in ten minutes." },
  { "word": "temple", "difficulty": 2, "image": "", "definition": "A building used for worship", "origin": "Latin", "sentence": "The ancient temple stood on top of the hill." },
  { "word": "shadow", "difficulty": 2, "image": "", "definition": "A dark shape made when light is blocked", "origin": "Old English", "sentence": "His shadow stretched across the sidewalk." },
  { "word": "kitchen", "difficulty": 3, "image": "", "definition": "The room where food is prepared", "origin": "Latin", "sentence": "She baked cookies in the kitchen." },
  { "word": "blanket", "difficulty": 3, "image": "", "definition": "A warm covering used on beds", "origin": "French", "sentence": "He pulled the blanket over himself." },
  { "word": "balance", "difficulty": 3, "image": "", "definition": "Steady position or equal distribution", "origin": "Latin", "sentence": "She kept her balance on the beam." },
  { "word": "compass", "difficulty": 3, "image": "", "definition": "A tool that shows direction", "origin": "Latin", "sentence": "The compass pointed north through the forest." },
  { "word": "crystal", "difficulty": 3, "image": "", "definition": "A clear mineral or glass-like solid", "origin": "Greek", "sentence": "The crystal sparkled in the sunlight." },
  { "word": "gateway", "difficulty": 3, "image": "", "definition": "An entrance or opening in a wall or fence", "origin": "Old English", "sentence": "The gateway led to a beautiful garden." },
  { "word": "harvest", "difficulty": 3, "image": "", "definition": "The gathering of crops", "origin": "Old English", "sentence": "Farmers celebrate the autumn harvest." },
  { "word": "pattern", "difficulty": 3, "image": "", "definition": "A repeated design or arrangement", "origin": "French", "sentence": "The quilt had a colorful pattern." },
  { "word": "whisper", "difficulty": 3, "image": "", "definition": "To speak very softly", "origin": "Old English", "sentence": "She had to whisper in the library." },
  { "word": "chimney", "difficulty": 3, "image": "", "definition": "A structure that carries smoke from a fire", "origin": "French", "sentence": "Smoke rose from the chimney on the roof." },
  { "word": "dinosaur", "difficulty": 4, "image": "", "definition": "A large reptile that lived millions of years ago", "origin": "Greek", "sentence": "The museum has a dinosaur skeleton." },
  { "word": "elephant", "difficulty": 4, "image": "", "definition": "The largest land animal with a trunk", "origin": "Greek", "sentence": "The elephant sprayed water with its trunk." },
  { "word": "champion", "difficulty": 4, "image": "", "definition": "A winner or top competitor", "origin": "French", "sentence": "She became the spelling champion of her school." },
  { "word": "discover", "difficulty": 4, "image": "", "definition": "To find something for the first time", "origin": "Latin", "sentence": "Scientists discover new species every year." },
  { "word": "midnight", "difficulty": 4, "image": "", "definition": "Twelve o'clock at night", "origin": "Old English", "sentence": "The clock struck midnight on New Year's Eve." },
  { "word": "platform", "difficulty": 4, "image": "", "definition": "A raised flat surface to stand on", "origin": "French", "sentence": "They waited for the train on the platform." },
  { "word": "sandwich", "difficulty": 4, "image": "", "definition": "Food placed between two slices of bread", "origin": "English", "sentence": "He made a cheese sandwich for lunch." },
  { "word": "treasure", "difficulty": 4, "image": "", "definition": "Valuable items like gold and jewels", "origin": "Greek", "sentence": "The pirates searched for buried treasure." },
  { "word": "umbrella", "difficulty": 4, "image": "", "definition": "A folding cover that protects from rain", "origin": "Italian", "sentence": "She opened her umbrella when it started raining." },
  { "word": "vacation", "difficulty": 4, "image": "", "definition": "A period of rest from work or school", "origin": "Latin", "sentence": "The family went on vacation to the beach." },
  { "word": "adventure", "difficulty": 5, "image": "", "definition": "An exciting and unusual experience", "origin": "Latin", "sentence": "They went on an adventure in the mountains." },
  { "word": "geography", "difficulty": 5, "image": "", "definition": "The study of the Earth and its features", "origin": "Greek", "sentence": "In geography class we learned about rivers." },
  { "word": "butterfly", "difficulty": 5, "image": "", "definition": "An insect with large colorful wings", "origin": "Old English", "sentence": "A butterfly landed on the flower." },
  { "word": "detective", "difficulty": 5, "image": "", "definition": "A person who investigates crimes", "origin": "Latin", "sentence": "The detective searched for clues at the scene." },
  { "word": "education", "difficulty": 5, "image": "", "definition": "The process of learning and gaining knowledge", "origin": "Latin", "sentence": "Education helps people understand the world." },
  { "word": "furniture", "difficulty": 5, "image": "", "definition": "Tables, chairs, and other movable items in a room", "origin": "French", "sentence": "They bought new furniture for the living room." },
  { "word": "horseback", "difficulty": 5, "image": "", "definition": "The back of a horse; riding a horse", "origin": "Old English", "sentence": "She learned to ride horseback at the ranch." },
  { "word": "invention", "difficulty": 5, "image": "", "definition": "Something new that is created", "origin": "Latin", "sentence": "The telephone was an amazing invention." },
  { "word": "landscape", "difficulty": 5, "image": "", "definition": "A wide view of natural scenery", "origin": "Dutch", "sentence": "The landscape was filled with rolling hills." },
  { "word": "narrative", "difficulty": 5, "image": "", "definition": "A spoken or written account of events", "origin": "Latin", "sentence": "The book tells a thrilling narrative." },
  { "word": "beautiful", "difficulty": 6, "image": "", "definition": "Very pleasing to look at or hear", "origin": "French", "sentence": "The sunset was beautiful." },
  { "word": "dangerous", "difficulty": 6, "image": "", "definition": "Likely to cause harm or injury", "origin": "French", "sentence": "Swimming in the stormy sea is dangerous." },
  { "word": "excellent", "difficulty": 6, "image": "", "definition": "Extremely good or outstanding", "origin": "Latin", "sentence": "She did an excellent job on her project." },
  { "word": "guarantee", "difficulty": 6, "image": "", "definition": "A promise that something will happen", "origin": "French", "sentence": "The store offers a money-back guarantee." },
  { "word": "hurricane", "difficulty": 6, "image": "", "definition": "A powerful tropical storm with strong winds", "origin": "Spanish", "sentence": "The hurricane brought heavy rain and wind." },
  { "word": "imaginary", "difficulty": 6, "image": "", "definition": "Existing only in the mind; not real", "origin": "Latin", "sentence": "The child had an imaginary friend." },
  { "word": "knowledge", "difficulty": 6, "image": "", "definition": "Facts and skills learned through experience", "origin": "Old English", "sentence": "Reading builds knowledge about many topics." },
  { "word": "necessary", "difficulty": 6, "image": "", "definition": "Needed or required", "origin": "Latin", "sentence": "Water is necessary for all living things." },
  { "word": "labyrinth", "difficulty": 6, "image": "", "definition": "A complicated maze or network of paths", "origin": "Greek", "sentence": "They got lost in the garden labyrinth." },
  { "word": "wonderful", "difficulty": 6, "image": "", "definition": "Inspiring delight or admiration", "origin": "Old English", "sentence": "The fireworks show was truly wonderful." },
  { "word": "celebration", "difficulty": 7, "image": "", "definition": "A special event to mark an occasion", "origin": "Latin", "sentence": "The birthday celebration was fun." },
  { "word": "temperature", "difficulty": 7, "image": "", "definition": "How hot or cold something is", "origin": "Latin", "sentence": "The temperature dropped below zero." },
  { "word": "accomplish", "difficulty": 7, "image": "", "definition": "To successfully complete a task", "origin": "Latin", "sentence": "She worked hard to accomplish her goal." },
  { "word": "centimeter", "difficulty": 7, "image": "", "definition": "A unit of length equal to one hundredth of a meter", "origin": "Latin", "sentence": "The bug was only one centimeter long." },
  { "word": "conference", "difficulty": 7, "image": "", "definition": "A formal meeting for discussion", "origin": "Latin", "sentence": "Scientists gathered at the conference to share ideas." },
  { "word": "experiment", "difficulty": 7, "image": "", "definition": "A test done to discover something new", "origin": "Latin", "sentence": "The science experiment created colorful bubbles." },
  { "word": "generation", "difficulty": 7, "image": "", "definition": "All people born around the same time", "origin": "Latin", "sentence": "Each generation brings new ideas to the world." },
  { "word": "inhabitant", "difficulty": 7, "image": "", "definition": "A person or animal that lives in a place", "origin": "Latin", "sentence": "The island has very few inhabitants." },
  { "word": "masterpiece", "difficulty": 7, "image": "", "definition": "An outstanding work of art or skill", "origin": "Dutch", "sentence": "The painting in the museum is a masterpiece." },
  { "word": "thunderbolt", "difficulty": 7, "image": "", "definition": "A flash of lightning with a crash of thunder", "origin": "Old English", "sentence": "A thunderbolt lit up the dark sky." },
  { "word": "magnificent", "difficulty": 8, "image": "", "definition": "Extremely beautiful or impressive", "origin": "Latin", "sentence": "The castle was magnificent." },
  { "word": "anniversary", "difficulty": 8, "image": "", "definition": "A yearly celebration of a past event", "origin": "Latin", "sentence": "My parents celebrated their wedding anniversary." },
  { "word": "comfortable", "difficulty": 8, "image": "", "definition": "Giving physical ease and relaxation", "origin": "French", "sentence": "The chair was very comfortable." },
  { "word": "demonstrate", "difficulty": 8, "image": "", "definition": "To show how something works", "origin": "Latin", "sentence": "The teacher will demonstrate the experiment." },
  { "word": "environment", "difficulty": 8, "image": "", "definition": "The natural world around us", "origin": "French", "sentence": "We must protect the environment from pollution." },
  { "word": "furthermore", "difficulty": 8, "image": "", "definition": "In addition to what has been said", "origin": "Old English", "sentence": "The trip was fun and furthermore it was educational." },
  { "word": "imagination", "difficulty": 8, "image": "", "definition": "The ability to form pictures in the mind", "origin": "Latin", "sentence": "Her imagination created amazing stories." },
  { "word": "marketplace", "difficulty": 8, "image": "", "definition": "A place where goods are bought and sold", "origin": "Old English", "sentence": "The marketplace was busy with shoppers." },
  { "word": "nonetheless", "difficulty": 8, "image": "", "definition": "In spite of that; nevertheless", "origin": "Old English", "sentence": "It rained, but they went hiking nonetheless." },
  { "word": "mathematics", "difficulty": 8, "image": "", "definition": "The study of numbers, shapes, and patterns", "origin": "Greek", "sentence": "Mathematics helps us solve everyday problems." },
  { "word": "encyclopedia", "difficulty": 9, "image": "", "definition": "A book containing information on many subjects", "origin": "Greek", "sentence": "She looked it up in the encyclopedia." },
  { "word": "appreciation", "difficulty": 9, "image": "", "definition": "Recognition of the value of something", "origin": "Latin", "sentence": "He showed appreciation for his teacher's help." },
  { "word": "circumstance", "difficulty": 9, "image": "", "definition": "A condition or fact connected to an event", "origin": "Latin", "sentence": "Under the circumstance, they decided to wait." },
  { "word": "disappointed", "difficulty": 9, "image": "", "definition": "Sad because hopes were not met", "origin": "French", "sentence": "She was disappointed when the game was canceled." },
  { "word": "enthusiastic", "difficulty": 9, "image": "", "definition": "Having strong excitement or interest", "origin": "Greek", "sentence": "The students were enthusiastic about the field trip." },
  { "word": "independence", "difficulty": 9, "image": "", "definition": "Freedom from control by others", "origin": "Latin", "sentence": "The country celebrated its independence day." },
  { "word": "overwhelming", "difficulty": 9, "image": "", "definition": "Very great in amount or effect", "origin": "Old English", "sentence": "The support from friends was overwhelming." },
  { "word": "professional", "difficulty": 9, "image": "", "definition": "Relating to a job that requires special training", "origin": "Latin", "sentence": "The professional athlete trained every day." },
  { "word": "relationship", "difficulty": 9, "image": "", "definition": "A connection between people or things", "origin": "Latin", "sentence": "She has a good relationship with her neighbors." },
  { "word": "understanding", "difficulty": 9, "image": "", "definition": "The ability to comprehend something", "origin": "Old English", "sentence": "Reading helps build understanding of the world." },
  { "word": "extraordinary", "difficulty": 10, "image": "", "definition": "Very unusual or remarkable", "origin": "Latin", "sentence": "The magician performed an extraordinary trick." },
  { "word": "accomplishment", "difficulty": 10, "image": "", "definition": "Something achieved successfully", "origin": "French", "sentence": "Graduating from school is a great accomplishment." },
  { "word": "communication", "difficulty": 10, "image": "", "definition": "The sharing of information between people", "origin": "Latin", "sentence": "Good communication helps teams work together." },
  { "word": "demonstration", "difficulty": 10, "image": "", "definition": "An act of showing how something works", "origin": "Latin", "sentence": "The chef gave a cooking demonstration." },
  { "word": "characteristic", "difficulty": 10, "image": "", "definition": "A feature or quality of a person or thing", "origin": "Greek", "sentence": "Kindness is her most admirable characteristic." },
  { "word": "heartbreaking", "difficulty": 10, "image": "", "definition": "Causing overwhelming sadness", "origin": "Old English", "sentence": "The movie had a heartbreaking ending." },
  { "word": "infrastructure", "difficulty": 10, "image": "", "definition": "Basic systems needed for a society to function", "origin": "Latin", "sentence": "Roads and bridges are part of our infrastructure." },
  { "word": "transformation", "difficulty": 10, "image": "", "definition": "A complete change in form or appearance", "origin": "Latin", "sentence": "The caterpillar's transformation into a butterfly was amazing." },
  { "word": "recommendation", "difficulty": 10, "image": "", "definition": "A suggestion about what to do", "origin": "Latin", "sentence": "The teacher's recommendation helped her choose a good book." },
  { "word": "unforgettable", "difficulty": 10, "image": "", "definition": "Impossible to forget; very memorable", "origin": "Old English", "sentence": "The trip to the Grand Canyon was unforgettable." }
]
```

- [ ] **Step 4: Run existing tests to verify word data works**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: All tests PASS. The existing `selectWords` tests verify the function works with the expanded pools.

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/data/
git commit -m "feat(spelling-bee): expand word pools to 80/90/100 words per age tier"
```

---

### Task 3: Create session levels logic

**Files:**
- Create: `games/spelling-bee/src/hooks/useSessionLevels.ts`
- Create: `games/spelling-bee/src/__tests__/useSessionLevels.test.ts`

- [ ] **Step 1: Write tests for pure functions**

Create `games/spelling-bee/src/__tests__/useSessionLevels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLadder, adjustDifficulty, TOTAL_LEVELS, LEVEL_WORD_COUNTS, ADVANCEMENT_THRESHOLD } from '../hooks/useSessionLevels';

describe('buildLadder', () => {
  it('creates 5 levels with warmup/at-level/stretch pattern', () => {
    const ladder = buildLadder(3);
    expect(ladder).toHaveLength(5);
    expect(ladder.map((l) => l.difficulty)).toEqual([2, 3, 3, 4, 4]);
  });

  it('clamps warmup to minimum difficulty 1', () => {
    const ladder = buildLadder(1);
    expect(ladder.map((l) => l.difficulty)).toEqual([1, 1, 1, 2, 2]);
  });

  it('assigns correct word counts per level', () => {
    const ladder = buildLadder(3);
    expect(ladder.map((l) => l.wordCount)).toEqual([3, 4, 5, 6, 7]);
  });

  it('works at high difficulty', () => {
    const ladder = buildLadder(9);
    expect(ladder.map((l) => l.difficulty)).toEqual([8, 9, 9, 10, 10]);
  });
});

describe('adjustDifficulty', () => {
  it('returns planned difficulty when accuracy meets threshold', () => {
    expect(adjustDifficulty(4, 3, 0.8)).toBe(4);
  });

  it('returns planned difficulty when accuracy exactly meets threshold', () => {
    expect(adjustDifficulty(4, 3, ADVANCEMENT_THRESHOLD)).toBe(4);
  });

  it('clamps to previous difficulty when accuracy is below threshold', () => {
    expect(adjustDifficulty(4, 3, 0.5)).toBe(3);
  });

  it('returns planned difficulty when it is at or below previous', () => {
    expect(adjustDifficulty(3, 3, 0.5)).toBe(3);
    expect(adjustDifficulty(2, 3, 0.5)).toBe(2);
  });

  it('clamps correctly at zero accuracy', () => {
    expect(adjustDifficulty(5, 3, 0)).toBe(3);
  });

  it('allows planned difficulty at perfect accuracy', () => {
    expect(adjustDifficulty(10, 3, 1.0)).toBe(10);
  });
});

describe('constants', () => {
  it('has 5 total levels', () => {
    expect(TOTAL_LEVELS).toBe(5);
  });

  it('word counts sum to 25', () => {
    expect(LEVEL_WORD_COUNTS.reduce((a, b) => a + b, 0)).toBe(25);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useSessionLevels hook**

Create `games/spelling-bee/src/hooks/useSessionLevels.ts`:

```ts
import { useState, useCallback, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import { selectWords, type WordEntry } from '../utils/wordSelector';

export type SessionPhase = 'instruction' | 'playing' | 'level-transition' | 'complete';

export const TOTAL_LEVELS = 5;
export const LEVEL_WORD_COUNTS = [3, 4, 5, 6, 7];
export const ADVANCEMENT_THRESHOLD = 0.7;
const SESSION_LIVES = 3;

export interface LevelPlan {
  difficulty: number;
  wordCount: number;
}

export function buildLadder(startDifficulty: number): LevelPlan[] {
  const warmup = Math.max(startDifficulty - 1, 1);
  const atLevel = startDifficulty;
  const stretch = startDifficulty + 1;

  return [
    { difficulty: warmup, wordCount: LEVEL_WORD_COUNTS[0] },
    { difficulty: atLevel, wordCount: LEVEL_WORD_COUNTS[1] },
    { difficulty: atLevel, wordCount: LEVEL_WORD_COUNTS[2] },
    { difficulty: stretch, wordCount: LEVEL_WORD_COUNTS[3] },
    { difficulty: stretch, wordCount: LEVEL_WORD_COUNTS[4] },
  ];
}

export function adjustDifficulty(
  planned: number,
  previousDifficulty: number,
  accuracy: number,
): number {
  if (accuracy >= ADVANCEMENT_THRESHOLD) {
    return planned;
  }
  return Math.min(planned, previousDifficulty);
}

interface UseSessionLevelsOptions {
  startingDifficulty: number;
  ageTier: AgeTier;
  wordPool: WordEntry[];
}

export interface SessionState {
  sessionPhase: SessionPhase;
  currentLevel: number;
  totalLevels: number;
  levelDifficulty: number;
  levelWords: WordEntry[];
  lives: number;
  maxLives: number;
  sessionScore: number;
  sessionMaxScore: number;
  levelsCompleted: number;
  highestDifficulty: number;
}

export interface SessionActions {
  dismissInstruction: () => void;
  completeLevel: (wordsCorrect: number, wordsAttempted: number) => void;
  loseLife: () => void;
  startNextLevel: () => void;
  addScore: (points: number) => void;
}

export function useSessionLevels(
  options: UseSessionLevelsOptions,
): SessionState & SessionActions {
  const { startingDifficulty, ageTier, wordPool } = options;
  const isTiny = ageTier === 'tiny';

  const ladderRef = useRef(buildLadder(startingDifficulty));
  const usedWordsRef = useRef<string[]>([]);
  const livesRef = useRef(isTiny ? Infinity : SESSION_LIVES);
  const currentLevelRef = useRef(1);

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('instruction');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [lives, setLives] = useState(isTiny ? Infinity : SESSION_LIVES);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMaxScore, setSessionMaxScore] = useState(0);
  const [levelsCompleted, setLevelsCompleted] = useState(0);
  const [highestDifficulty, setHighestDifficulty] = useState(startingDifficulty);

  // Select initial words for level 1
  const [levelWords, setLevelWords] = useState<WordEntry[]>(() => {
    const plan = ladderRef.current[0];
    const words = selectWords(wordPool, {
      difficulty: plan.difficulty,
      count: plan.wordCount,
      exclude: [],
    });
    usedWordsRef.current = words.map((w) => w.word);
    return words;
  });

  const levelDifficulty = ladderRef.current[currentLevelRef.current - 1].difficulty;

  const dismissInstruction = useCallback(() => {
    setSessionPhase('playing');
  }, []);

  const loseLife = useCallback(() => {
    livesRef.current -= 1;
    setLives(livesRef.current);
  }, []);

  const addScore = useCallback((points: number) => {
    setSessionScore((prev) => prev + points);
  }, []);

  const completeLevel = useCallback(
    (wordsCorrect: number, wordsAttempted: number) => {
      const accuracy = wordsAttempted > 0 ? wordsCorrect / wordsAttempted : 0;
      setSessionMaxScore((prev) => prev + wordsAttempted);
      setLevelsCompleted((prev) => prev + 1);

      const currentDiff = ladderRef.current[currentLevelRef.current - 1].difficulty;
      setHighestDifficulty((prev) => Math.max(prev, currentDiff));

      // Session over: last level or out of lives
      if (currentLevelRef.current >= TOTAL_LEVELS || livesRef.current <= 0) {
        setSessionPhase('complete');
        return;
      }

      // Adjust remaining levels based on performance
      const nextIdx = currentLevelRef.current; // 0-indexed for next level
      const nextPlanned = ladderRef.current[nextIdx].difficulty;
      const adjusted = adjustDifficulty(nextPlanned, currentDiff, accuracy);
      ladderRef.current[nextIdx] = { ...ladderRef.current[nextIdx], difficulty: adjusted };

      // Propagate clamp to all remaining levels
      for (let i = nextIdx + 1; i < TOTAL_LEVELS; i++) {
        if (ladderRef.current[i].difficulty > adjusted) {
          ladderRef.current[i] = { ...ladderRef.current[i], difficulty: adjusted };
        }
      }

      setSessionPhase('level-transition');
    },
    [],
  );

  const startNextLevel = useCallback(() => {
    const nextLevel = currentLevelRef.current + 1;
    currentLevelRef.current = nextLevel;
    setCurrentLevel(nextLevel);

    const nextPlan = ladderRef.current[nextLevel - 1];
    const words = selectWords(wordPool, {
      difficulty: nextPlan.difficulty,
      count: nextPlan.wordCount,
      exclude: usedWordsRef.current,
    });
    usedWordsRef.current = [...usedWordsRef.current, ...words.map((w) => w.word)];

    setHighestDifficulty((prev) => Math.max(prev, nextPlan.difficulty));
    setLevelWords(words);
    setSessionPhase('playing');
  }, [wordPool]);

  return {
    sessionPhase,
    currentLevel,
    totalLevels: TOTAL_LEVELS,
    levelDifficulty,
    levelWords,
    lives,
    maxLives: isTiny ? 0 : SESSION_LIVES,
    sessionScore,
    sessionMaxScore,
    levelsCompleted,
    highestDifficulty,
    dismissInstruction,
    completeLevel,
    loseLife,
    startNextLevel,
    addScore,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/hooks/useSessionLevels.ts games/spelling-bee/src/__tests__/useSessionLevels.test.ts
git commit -m "feat(spelling-bee): add useSessionLevels hook with challenge ladder logic"
```

---

### Task 4: Refactor useSpellingRound for per-level use

**Files:**
- Modify: `games/spelling-bee/src/hooks/useSpellingRound.ts`

- [ ] **Step 1: Rewrite useSpellingRound**

Replace the entire contents of `games/spelling-bee/src/hooks/useSpellingRound.ts`:

```ts
import { useState, useCallback, useRef } from 'react';
import type { AgeTier } from '@kids-games-zone/shared';
import type { WordEntry } from '../utils/wordSelector';

export type RoundPhase = 'playing' | 'feedback' | 'complete';

interface UseSpellingRoundOptions {
  words: WordEntry[];
  ageTier: AgeTier;
  onScorePoint: (points: number) => void;
  lives: number;
  onLifeLost: () => void;
  onRoundComplete: (wordsCorrect: number, wordsAttempted: number) => void;
}

interface SpellingRoundState {
  phase: RoundPhase;
  currentWordIndex: number;
  currentWord: WordEntry;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  wordsCorrect: number;
}

interface SpellingRoundActions {
  submitAnswer: (answer: string) => void;
  nextWord: () => void;
}

export function useSpellingRound(
  options: UseSpellingRoundOptions,
): SpellingRoundState & SpellingRoundActions {
  const { words, ageTier, onScorePoint, lives, onLifeLost, onRoundComplete } = options;
  const isTiny = ageTier === 'tiny';

  const [phase, setPhase] = useState<RoundPhase>('playing');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const wordsCorrectRef = useRef(0);

  // Sync lives from props into a ref for reliable reads in callbacks
  const livesRef = useRef(lives);
  livesRef.current = lives;

  const maxScore = words.length;
  const currentWord = words[currentWordIndex] ?? words[0];

  const submitAnswer = useCallback(
    (answer: string) => {
      const correct = answer.toLowerCase() === currentWord.word.toLowerCase();
      setIsCorrect(correct);
      setPhase('feedback');

      if (correct) {
        wordsCorrectRef.current += 1;
        setScore((prev) => prev + 1);
        onScorePoint(1);
      } else if (!isTiny) {
        onLifeLost();
      }
    },
    [currentWord, isTiny, onScorePoint, onLifeLost],
  );

  const nextWord = useCallback(() => {
    setIsCorrect(null);

    const isLastWord = currentWordIndex >= words.length - 1;
    const outOfLives = !isTiny && livesRef.current <= 0;

    if (isLastWord || outOfLives) {
      setPhase('complete');
      onRoundComplete(wordsCorrectRef.current, currentWordIndex + 1);
      return;
    }

    setCurrentWordIndex((prev) => prev + 1);
    setPhase('playing');
  }, [currentWordIndex, words.length, isTiny, onRoundComplete]);

  return {
    phase,
    currentWordIndex,
    currentWord,
    score,
    maxScore,
    isCorrect,
    wordsCorrect: wordsCorrectRef.current,
    submitAnswer,
    nextWord,
  };
}
```

- [ ] **Step 2: Run tests (expect existing round tests to fail, which we'll fix in Task 9)**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Note: Some existing `SpellingBee.test.tsx` tests will now fail because the component API changed. This is expected — Task 8 and 9 will update the component and its tests.

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/hooks/useSpellingRound.ts
git commit -m "refactor(spelling-bee): externalize lives and remove instruction phase from useSpellingRound"
```

---

### Task 5: Add i18n keys

**Files:**
- Modify: `games/spelling-bee/src/locales/en/spelling-bee.json`
- Modify: `games/spelling-bee/src/locales/fr/spelling-bee.json`

- [ ] **Step 1: Update English locale**

Replace the entire contents of `games/spelling-bee/src/locales/en/spelling-bee.json`:

```json
{
  "title": "Spelling Bee",
  "instruction": "Listen to the word and spell it!",
  "instructionTiny": "Look at the picture and spell the word!",
  "letsGo": "Let's Go!",
  "hearWord": "Hear the word",
  "playWord": "Play word pronunciation",
  "definition": "Definition",
  "origin": "Origin",
  "sentence": "Use in a sentence",
  "getDefinition": "Show definition",
  "getOrigin": "Show word origin",
  "getSentence": "Show word in a sentence",
  "originLabel": "Origin: {{origin}}",
  "correct": "Correct! Well done!",
  "incorrect": "Not quite. The word was {{word}}.",
  "incorrectTiny": "Almost! Try the next one!",
  "nextWord": "Next Word",
  "wordOf": "Word {{current}} of {{total}}",
  "livesRemaining": "{{lives}} lives remaining",
  "celebrationTitle": "Great Spelling!",
  "finalScore": "You spelled {{score}} of {{total}} words correctly!",
  "encourageTiny": "Well done!",
  "encourageJunior": "Nice spelling!",
  "gameOver": "Game Over",
  "levelOf": "Level {{current}} of {{total}}",
  "levelComplete": "Level {{level}} Complete!",
  "levelUp": "Level Up!",
  "nextLevel": "Next Level",
  "scoreSoFar": "Score: {{score}}",
  "levelEncourageTiny": "Amazing job!",
  "levelEncourageJunior": "Keep going, you're doing great!",
  "levelEncourageExplorer": "Nice work! Ready for the next challenge?",
  "sessionComplete": "You completed {{levels}} levels!",
  "reachedLevel": "You reached Level {{level}}!"
}
```

- [ ] **Step 2: Update French locale**

Replace the entire contents of `games/spelling-bee/src/locales/fr/spelling-bee.json`:

```json
{
  "title": "Concours d'orthographe",
  "instruction": "Écoute le mot et épelle-le !",
  "instructionTiny": "Regarde l'image et épelle le mot !",
  "letsGo": "C'est parti !",
  "hearWord": "Écouter le mot",
  "playWord": "Lire la prononciation du mot",
  "definition": "Définition",
  "origin": "Origine",
  "sentence": "Dans une phrase",
  "getDefinition": "Afficher la définition",
  "getOrigin": "Afficher l'origine du mot",
  "getSentence": "Afficher le mot dans une phrase",
  "originLabel": "Origine : {{origin}}",
  "correct": "Correct ! Bien joué !",
  "incorrect": "Pas tout à fait. Le mot était {{word}}.",
  "incorrectTiny": "Presque ! Essaie le suivant !",
  "nextWord": "Mot suivant",
  "wordOf": "Mot {{current}} sur {{total}}",
  "livesRemaining": "{{lives}} vies restantes",
  "celebrationTitle": "Super orthographe !",
  "finalScore": "Tu as épelé {{score}} mots sur {{total}} correctement !",
  "encourageTiny": "Bien joué !",
  "encourageJunior": "Belle orthographe !",
  "gameOver": "Fin de partie",
  "levelOf": "Niveau {{current}} sur {{total}}",
  "levelComplete": "Niveau {{level}} terminé !",
  "levelUp": "Niveau supérieur !",
  "nextLevel": "Niveau suivant",
  "scoreSoFar": "Score : {{score}}",
  "levelEncourageTiny": "Super travail !",
  "levelEncourageJunior": "Continue, tu es formidable !",
  "levelEncourageExplorer": "Beau travail ! Prêt pour le prochain défi ?",
  "sessionComplete": "Tu as complété {{levels}} niveaux !",
  "reachedLevel": "Tu as atteint le niveau {{level}} !"
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/locales/
git commit -m "feat(spelling-bee): add i18n keys for level progression UI"
```

---

### Task 6: Create LevelIndicator component

**Files:**
- Create: `games/spelling-bee/src/components/LevelIndicator.tsx`
- Create: `games/spelling-bee/src/components/LevelIndicator.module.css`

- [ ] **Step 1: Create LevelIndicator component**

Create `games/spelling-bee/src/components/LevelIndicator.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import styles from './LevelIndicator.module.css';

interface LevelIndicatorProps {
  current: number;
  total: number;
}

export function LevelIndicator({ current, total }: LevelIndicatorProps) {
  const { t } = useTranslation('spelling-bee');

  return (
    <div className={styles.indicator} aria-label={t('levelOf', { current, total })}>
      <span className={styles.label}>{t('levelOf', { current, total })}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create CSS module**

Create `games/spelling-bee/src/components/LevelIndicator.module.css`:

```css
.indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-medium);
  font-family: var(--font-family-display);
  font-weight: 700;
  font-size: 0.9rem;
}

.label {
  white-space: nowrap;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/components/LevelIndicator.tsx games/spelling-bee/src/components/LevelIndicator.module.css
git commit -m "feat(spelling-bee): add LevelIndicator component"
```

---

### Task 7: Create LevelTransition component

**Files:**
- Create: `games/spelling-bee/src/components/LevelTransition.tsx`
- Create: `games/spelling-bee/src/components/LevelTransition.module.css`

- [ ] **Step 1: Create LevelTransition component**

Create `games/spelling-bee/src/components/LevelTransition.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { OptionButton } from '@kids-games-zone/shared';
import type { AgeTier } from '@kids-games-zone/shared';
import styles from './LevelTransition.module.css';

interface LevelTransitionProps {
  levelCompleted: number;
  totalLevels: number;
  score: number;
  ageTier: AgeTier;
  onContinue: () => void;
}

export function LevelTransition({
  levelCompleted,
  totalLevels,
  score,
  ageTier,
  onContinue,
}: LevelTransitionProps) {
  const { t } = useTranslation('spelling-bee');

  const encourageKey =
    ageTier === 'tiny'
      ? 'levelEncourageTiny'
      : ageTier === 'junior'
        ? 'levelEncourageJunior'
        : 'levelEncourageExplorer';

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.star} aria-hidden="true">
        {'\u2B50'}
      </div>
      <h2 className={styles.title}>{t('levelComplete', { level: levelCompleted })}</h2>
      <p className={styles.score}>{t('scoreSoFar', { score })}</p>
      <p className={styles.encourage}>{t(encourageKey)}</p>
      <OptionButton
        label={t('nextLevel')}
        state="default"
        onSelect={onContinue}
        size="large"
      />
      <p className={styles.progress}>
        {t('levelOf', { current: levelCompleted + 1, total: totalLevels })}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create CSS module**

Create `games/spelling-bee/src/components/LevelTransition.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-xxl);
  text-align: center;
  min-height: 60vh;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.star {
  font-size: 4rem;
  animation: bounce 0.5s ease-out;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.title {
  font-family: var(--font-family-display);
  font-size: 1.75rem;
  color: var(--color-primary);
  margin: 0;
}

.score {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.encourage {
  font-size: 1.1rem;
  color: var(--color-text-secondary, #666);
  margin: 0;
}

.progress {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #666);
  margin: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/components/LevelTransition.tsx games/spelling-bee/src/components/LevelTransition.module.css
git commit -m "feat(spelling-bee): add LevelTransition component"
```

---

### Task 8: Create LevelPlay and integrate into SpellingBee

**Files:**
- Create: `games/spelling-bee/src/components/LevelPlay.tsx`
- Create: `games/spelling-bee/src/components/LevelPlay.module.css`
- Modify: `games/spelling-bee/src/SpellingBee.tsx`
- Modify: `games/spelling-bee/src/SpellingBee.module.css`

- [ ] **Step 1: Create LevelPlay component**

Create `games/spelling-bee/src/components/LevelPlay.tsx`:

```tsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  OptionButton,
  ProgressBar,
  ScoreDisplay,
  useAnnounce,
} from '@kids-games-zone/shared';
import type { AgeTier, AudioManager } from '@kids-games-zone/shared';
import { scrambleWithDistractors } from '../utils/letterScrambler';
import { useSpellingRound } from '../hooks/useSpellingRound';
import { LetterTiles } from './LetterTiles';
import { Keyboard } from './Keyboard';
import { WordDisplay } from './WordDisplay';
import { LivesDisplay } from './LivesDisplay';
import type { WordEntry } from '../utils/wordSelector';
import styles from './LevelPlay.module.css';

interface LevelPlayProps {
  words: WordEntry[];
  ageTier: AgeTier;
  lives: number;
  maxLives: number;
  onScorePoint: (points: number) => void;
  onLifeLost: () => void;
  onRoundComplete: (wordsCorrect: number, wordsAttempted: number) => void;
  audioManager: AudioManager;
}

export function LevelPlay({
  words,
  ageTier,
  lives,
  maxLives,
  onScorePoint,
  onLifeLost,
  onRoundComplete,
  audioManager,
}: LevelPlayProps) {
  const { t } = useTranslation('spelling-bee');
  const announce = useAnnounce();
  const isTiny = ageTier === 'tiny';

  const round = useSpellingRound({
    words,
    ageTier,
    onScorePoint,
    lives,
    onLifeLost,
    onRoundComplete,
  });

  const tiles = useMemo(
    () => (isTiny ? scrambleWithDistractors(round.currentWord.word, 3) : []),
    [isTiny, round.currentWord.word],
  );

  useEffect(() => {
    if (round.phase === 'playing') {
      audioManager.playVoice(`voice:word-${round.currentWord.word}`);
      announce(t('wordOf', { current: round.currentWordIndex + 1, total: words.length }));
    }
  }, [round.phase, round.currentWordIndex, round.currentWord.word, audioManager, announce, t, words.length]);

  useEffect(() => {
    if (round.phase !== 'feedback') return;
    if (round.isCorrect) {
      audioManager.playSFX('correct');
      if (isTiny) audioManager.playVoice('voice:encouragement-correct');
    } else {
      audioManager.playSFX('incorrect');
      if (isTiny) audioManager.playVoice('voice:encouragement-tryagain');
    }
  }, [round.phase, round.isCorrect, audioManager, isTiny]);

  // Round completed — parent will unmount this component
  if (round.phase === 'complete') {
    return null;
  }

  const showFeedback = round.phase === 'feedback';

  return (
    <div className={styles.playArea}>
      <div className={styles.topBar}>
        <ScoreDisplay score={round.score} maxScore={round.maxScore} showStars />
        {!isTiny && <LivesDisplay lives={lives} maxLives={maxLives} />}
      </div>

      <ProgressBar current={round.currentWordIndex} total={words.length} showLabel />

      <WordDisplay word={round.currentWord} ageTier={ageTier} audioManager={audioManager} />

      {!showFeedback && isTiny && (
        <LetterTiles letters={tiles} wordLength={round.currentWord.word.length} onSubmit={round.submitAnswer} />
      )}

      {!showFeedback && !isTiny && (
        <Keyboard onSubmit={round.submitAnswer} />
      )}

      {showFeedback && (
        <div className={styles.feedbackArea} aria-live="assertive">
          <p className={round.isCorrect ? styles.correctText : styles.incorrectText}>
            {round.isCorrect
              ? t('correct')
              : isTiny
                ? t('incorrectTiny')
                : t('incorrect', { word: round.currentWord.word })}
          </p>
          <OptionButton label={t('nextWord')} state="default" onSelect={round.nextWord} size="large" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create LevelPlay CSS module**

Create `games/spelling-bee/src/components/LevelPlay.module.css`:

```css
.playArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  width: 100%;
}

.topBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--spacing-md);
}

.feedbackArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.correctText {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-success, #34a853);
  margin: 0;
}

.incorrectText {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-error, #ea4335);
  margin: 0;
  text-align: center;
}
```

- [ ] **Step 3: Rewrite SpellingBee.tsx as session orchestrator**

Replace the entire contents of `games/spelling-bee/src/SpellingBee.tsx`:

```tsx
import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GameShell,
  OptionButton,
  CelebrationOverlay,
  InstructionBubble,
} from '@kids-games-zone/shared';
import type { GameProps, GameResult, AgeTier } from '@kids-games-zone/shared';
import { useSessionLevels } from './hooks/useSessionLevels';
import { LevelPlay } from './components/LevelPlay';
import { LevelIndicator } from './components/LevelIndicator';
import { LevelTransition } from './components/LevelTransition';
import wordsTiny from './data/words-tiny.json';
import wordsJunior from './data/words-junior.json';
import wordsExplorer from './data/words-explorer.json';
import styles from './SpellingBee.module.css';

function getWordPool(ageTier: AgeTier) {
  switch (ageTier) {
    case 'tiny': return wordsTiny;
    case 'junior': return wordsJunior;
    case 'explorer': return wordsExplorer;
  }
}

export function SpellingBee({ config, onScore, onComplete, onExit, audioManager }: GameProps) {
  const { t } = useTranslation('spelling-bee');
  const startTimeRef = useRef(Date.now());
  const ageTier = config.profile.ageTier;
  const isTiny = ageTier === 'tiny';
  const wordPool = useMemo(() => getWordPool(ageTier), [ageTier]);

  const session = useSessionLevels({
    startingDifficulty: config.difficulty,
    ageTier,
    wordPool,
  });

  const handleScorePoint = useCallback(
    (points: number) => {
      onScore(points);
      session.addScore(points);
    },
    [onScore, session.addScore],
  );

  // Background music for tiny tier
  useEffect(() => {
    if (isTiny && config.settings.musicEnabled) {
      audioManager.playMusic('music:game-bgm', { loop: true, fadeIn: 1000 });
    }
    return () => {
      audioManager.stopMusic({ fadeOut: 500 });
    };
  }, [isTiny, config.settings.musicEnabled, audioManager]);

  const handleCelebrationComplete = useCallback(() => {
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
    const result: GameResult = {
      gameId: 'spelling-bee',
      score: session.sessionScore,
      maxScore: session.sessionMaxScore,
      timeSpent,
      difficulty: session.highestDifficulty,
      completedAt: new Date().toISOString(),
      metrics: {
        wordsCorrect: session.sessionScore,
        wordsTotal: session.sessionMaxScore,
        levelsCompleted: session.levelsCompleted,
        livesRemaining: isTiny ? null : session.lives,
      },
    };
    onComplete(result);
  }, [session, isTiny, onComplete]);

  // Instruction screen
  if (session.sessionPhase === 'instruction') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <div className={styles.gameArea}>
          <InstructionBubble text={isTiny ? t('instructionTiny') : t('instruction')} character={'\u{1F41D}'} />
          <OptionButton label={t('letsGo')} state="default" onSelect={session.dismissInstruction} size="large" />
        </div>
      </GameShell>
    );
  }

  // Level transition screen
  if (session.sessionPhase === 'level-transition') {
    return (
      <GameShell title={t('title')} onBack={onExit}>
        <LevelTransition
          levelCompleted={session.currentLevel}
          totalLevels={session.totalLevels}
          score={session.sessionScore}
          ageTier={ageTier}
          onContinue={session.startNextLevel}
        />
      </GameShell>
    );
  }

  // Session complete
  if (session.sessionPhase === 'complete') {
    const completionMessage =
      session.levelsCompleted >= session.totalLevels
        ? t('sessionComplete', { levels: session.levelsCompleted })
        : t('reachedLevel', { level: session.levelsCompleted });

    return (
      <GameShell title={t('title')} onBack={onExit}>
        <CelebrationOverlay
          title={completionMessage}
          score={session.sessionScore}
          maxScore={session.sessionMaxScore}
          onComplete={handleCelebrationComplete}
        />
      </GameShell>
    );
  }

  // Active gameplay
  return (
    <GameShell title={t('title')} onBack={onExit}>
      <div className={styles.gameArea}>
        <LevelIndicator current={session.currentLevel} total={session.totalLevels} />
        <LevelPlay
          key={session.currentLevel}
          words={session.levelWords}
          ageTier={ageTier}
          lives={session.lives}
          maxLives={session.maxLives}
          onScorePoint={handleScorePoint}
          onLifeLost={session.loseLife}
          onRoundComplete={session.completeLevel}
          audioManager={audioManager}
        />
      </div>
    </GameShell>
  );
}
```

- [ ] **Step 4: Update SpellingBee.module.css**

Replace the contents of `games/spelling-bee/src/SpellingBee.module.css`:

```css
.gameArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
  max-width: 600px;
  margin: 0 auto;
}
```

- [ ] **Step 5: Commit**

```bash
git add games/spelling-bee/src/components/LevelPlay.tsx games/spelling-bee/src/components/LevelPlay.module.css games/spelling-bee/src/SpellingBee.tsx games/spelling-bee/src/SpellingBee.module.css
git commit -m "feat(spelling-bee): integrate multi-level session into SpellingBee"
```

---

### Task 9: Update integration tests

**Files:**
- Modify: `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`

- [ ] **Step 1: Rewrite SpellingBee.test.tsx**

Replace the entire contents of `games/spelling-bee/src/__tests__/SpellingBee.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SpellingBee } from '../SpellingBee';
import type { GameProps } from '@kids-games-zone/shared';

function createMockProps(overrides: Partial<GameProps> = {}): GameProps {
  return {
    config: {
      difficulty: 1,
      profile: {
        id: 'test',
        name: 'Test',
        avatar: '',
        age: 7,
        ageTier: 'junior',
        createdAt: new Date().toISOString(),
        parentPin: '',
        preferences: {
          musicVolume: 50,
          sfxVolume: 100,
          voiceVolume: 100,
          language: 'en',
          theme: 'default',
        },
        progress: {},
        rewards: [],
        stats: {
          totalPlayTime: 0,
          totalGamesPlayed: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayedAt: '',
        },
      },
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        language: 'en',
        highContrastMode: false,
      },
    },
    onScore: vi.fn(),
    onComplete: vi.fn(),
    onExit: vi.fn(),
    audioManager: {
      playMusic: vi.fn(),
      stopMusic: vi.fn(),
      playSFX: vi.fn(),
      playVoice: vi.fn(),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unmute: vi.fn(),
      preload: vi.fn().mockResolvedValue(undefined),
    } as unknown as GameProps['audioManager'],
    storageManager: {} as unknown as GameProps['storageManager'],
    ...overrides,
  };
}

function createTinyProps(): GameProps {
  const props = createMockProps();
  return {
    ...props,
    config: {
      ...props.config,
      profile: { ...props.config.profile, age: 4, ageTier: 'tiny' },
    },
  };
}

describe('SpellingBee', () => {
  it('renders game shell with title', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('title')).toBeTruthy();
  });

  it('shows instruction bubble initially', () => {
    render(<SpellingBee {...createMockProps()} />);
    expect(screen.getByText('instruction')).toBeTruthy();
  });

  it('shows tiny instruction for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    expect(screen.getByText('instructionTiny')).toBeTruthy();
  });

  it('shows level indicator after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText(/levelOf/)).toBeTruthy();
  });

  it('shows on-screen keyboard for junior-tier after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'On-screen keyboard' })).toBeTruthy();
  });

  it('shows letter tiles for tiny-tier after dismissing instruction', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('group', { name: 'Letter tiles' })).toBeTruthy();
  });

  it('shows hear word button after dismissing instruction', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByText(/hearWord/)).toBeTruthy();
  });

  it('plays word voice on entering play phase', () => {
    const props = createMockProps();
    render(<SpellingBee {...props} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(props.audioManager.playVoice).toHaveBeenCalled();
  });

  it('shows lives display for junior-tier', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByLabelText(/lives remaining/)).toBeTruthy();
  });

  it('does not show lives display for tiny-tier', () => {
    render(<SpellingBee {...createTinyProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.queryByLabelText(/lives remaining/)).toBeNull();
  });

  it('shows progress bar', () => {
    render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('has no accessibility violations on instruction screen', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations during gameplay', async () => {
    const { container } = render(<SpellingBee {...createMockProps()} />);
    fireEvent.click(screen.getByText('letsGo'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `pnpm --filter @kids-games-zone/spelling-bee test`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add games/spelling-bee/src/__tests__/SpellingBee.test.tsx
git commit -m "test(spelling-bee): update integration tests for multi-level session"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`

Expected: All tests PASS across all packages.

- [ ] **Step 2: Type check**

Run: `pnpm typecheck`

Expected: No type errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`

Expected: No lint errors.

- [ ] **Step 4: Build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 5: Manual smoke test**

Run: `pnpm dev`

Open `http://localhost:3000`, select a profile, and play Spelling Bee. Verify:
- Instruction screen shows, then gameplay starts at Level 1
- Level indicator shows "Level 1 of 5"
- After completing Level 1 words, "Level Up!" transition appears
- "Next Level" button advances to Level 2 with new words
- Progress continues through all 5 levels
- Score accumulates across levels
- Lives (non-tiny) persist across levels
- Celebration shows total score and levels completed at the end
