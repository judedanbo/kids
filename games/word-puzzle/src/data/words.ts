export interface WordEntry {
  word: string;
  clue: string;
}

export interface WordCategory {
  name: string;
  words: Record<number, WordEntry[]>;
}

export const categories: WordCategory[] = [
  {
    name: 'Animals',
    words: {
      1: [
        { word: 'cat', clue: 'A furry pet that meows' },
        { word: 'dog', clue: 'A loyal pet that barks' },
        { word: 'hen', clue: 'A bird that lays eggs' },
        { word: 'pig', clue: 'A farm animal that rolls in mud' },
        { word: 'cow', clue: 'A farm animal that gives milk' },
        { word: 'bat', clue: 'A flying mammal that comes out at night' },
        { word: 'ant', clue: 'A tiny insect that lives in a colony' },
        { word: 'fox', clue: 'A sly red wild animal' },
        { word: 'owl', clue: 'A wise bird that hoots at night' },
        { word: 'ram', clue: 'A male sheep with big horns' },
        { word: 'emu', clue: 'A very tall bird that cannot fly' },
        { word: 'yak', clue: 'A shaggy ox from the mountains' },
      ],
      2: [
        { word: 'bear', clue: 'A big furry animal that loves honey' },
        { word: 'deer', clue: 'A graceful animal with antlers' },
        { word: 'frog', clue: 'A green amphibian that hops and croaks' },
        { word: 'duck', clue: 'A bird that swims and quacks' },
        { word: 'crab', clue: 'A sea creature with claws and a hard shell' },
        { word: 'lamb', clue: 'A baby sheep' },
        { word: 'mole', clue: 'A small animal that digs tunnels underground' },
        { word: 'wolf', clue: 'A wild animal that howls at the moon' },
        { word: 'worm', clue: 'A long wiggly creature that lives in soil' },
        { word: 'lion', clue: 'The king of the jungle with a big mane' },
        { word: 'fish', clue: 'A scaly creature that lives in water' },
        { word: 'swan', clue: 'A large elegant white bird on water' },
      ],
      3: [
        { word: 'tiger', clue: 'A striped big cat from the jungle' },
        { word: 'horse', clue: 'A large animal you can ride' },
        { word: 'eagle', clue: 'A powerful bird with sharp talons' },
        { word: 'shark', clue: 'A large fierce fish in the ocean' },
        { word: 'panda', clue: 'A black and white bear from China' },
        { word: 'hippo', clue: 'A huge animal that loves rivers' },
        { word: 'rhino', clue: 'A large animal with a horn on its nose' },
        { word: 'llama', clue: 'A fluffy South American animal' },
        { word: 'otter', clue: 'A playful furry animal that swims' },
        { word: 'koala', clue: 'A sleepy Australian animal in a gum tree' },
        { word: 'zebra', clue: 'A black and white striped wild horse' },
        { word: 'moose', clue: 'A very tall deer with wide antlers' },
      ],
      4: [
        { word: 'parrot', clue: 'A colorful bird that can talk' },
        { word: 'rabbit', clue: 'A fluffy animal with long ears that hops' },
        { word: 'monkey', clue: 'A clever animal that swings in trees' },
        { word: 'jaguar', clue: 'A spotted big cat from South America' },
        { word: 'donkey', clue: 'A stubborn farm animal that brays' },
        { word: 'turtle', clue: 'A slow reptile that carries its home' },
        { word: 'walrus', clue: 'A large sea animal with long tusks' },
        { word: 'lizard', clue: 'A scaly reptile that baskets in the sun' },
        { word: 'ferret', clue: 'A long furry pet related to weasels' },
        { word: 'salmon', clue: 'A pink fish that swims upstream to spawn' },
        { word: 'toucan', clue: 'A tropical bird with a huge colorful beak' },
        { word: 'turkey', clue: 'A large bird eaten at Thanksgiving' },
      ],
      5: [
        { word: 'cheetah', clue: 'The fastest land animal with spots' },
        { word: 'dolphin', clue: 'A smart sea mammal that leaps and plays' },
        { word: 'penguin', clue: 'A black and white bird that cannot fly' },
        { word: 'gorilla', clue: 'The largest ape that lives in forests' },
        { word: 'panther', clue: 'A sleek black big cat' },
        { word: 'lobster', clue: 'A red sea creature with big claws' },
        { word: 'hamster', clue: 'A small fluffy pet with pouchy cheeks' },
        { word: 'vulture', clue: 'A large bird that eats dead animals' },
        { word: 'ostrich', clue: 'The tallest bird with very long legs' },
        { word: 'leopard', clue: 'A spotted big cat that climbs trees' },
        { word: 'buffalo', clue: 'A large wild ox that roams in herds' },
        { word: 'cricket', clue: 'A chirping insect that jumps high' },
      ],
    },
  },
  {
    name: 'Food',
    words: {
      1: [
        { word: 'egg', clue: 'You crack this to make breakfast' },
        { word: 'ham', clue: 'A salty pink meat from a pig' },
        { word: 'jam', clue: 'A sweet spread made from fruit' },
        { word: 'pie', clue: 'A baked dish with a pastry crust' },
        { word: 'pea', clue: 'A small round green vegetable' },
        { word: 'nut', clue: 'A hard shell with a seed inside' },
        { word: 'yam', clue: 'A sweet root vegetable' },
        { word: 'fig', clue: 'A sweet purple fruit' },
        { word: 'oat', clue: 'A grain used for porridge' },
        { word: 'bun', clue: 'A small soft bread roll' },
        { word: 'dip', clue: 'A sauce you scoop with chips' },
        { word: 'rye', clue: 'A grain used to make dark bread' },
      ],
      2: [
        { word: 'rice', clue: 'Tiny white grains eaten with many dishes' },
        { word: 'cake', clue: 'A sweet baked treat for birthdays' },
        { word: 'corn', clue: 'A yellow vegetable grown on a cob' },
        { word: 'milk', clue: 'A white drink that comes from cows' },
        { word: 'plum', clue: 'A small purple fruit' },
        { word: 'lime', clue: 'A small sour green citrus fruit' },
        { word: 'pear', clue: 'A green or yellow fruit shaped like a teardrop' },
        { word: 'bean', clue: 'A small oval legume that grows in a pod' },
        { word: 'kiwi', clue: 'A small brown fruit with bright green inside' },
        { word: 'taco', clue: 'A Mexican food in a folded tortilla shell' },
        { word: 'soup', clue: 'A warm liquid food eaten with a spoon' },
        { word: 'mint', clue: 'A cool fresh-tasting herb' },
      ],
      3: [
        { word: 'mango', clue: 'A sweet tropical yellow-orange fruit' },
        { word: 'pizza', clue: 'A round flat bread with tomato and cheese' },
        { word: 'grape', clue: 'A small round fruit that grows in bunches' },
        { word: 'toast', clue: 'Bread that has been browned in heat' },
        { word: 'onion', clue: 'A round vegetable that makes you cry when cut' },
        { word: 'melon', clue: 'A large sweet juicy fruit with seeds inside' },
        { word: 'peach', clue: 'A fuzzy sweet orange-pink fruit' },
        { word: 'pasta', clue: 'Italian noodles made from flour and water' },
        { word: 'salad', clue: 'A mix of raw vegetables in a bowl' },
        { word: 'cream', clue: 'The thick white fat from milk' },
        { word: 'olive', clue: 'A small oval fruit used to make oil' },
        { word: 'bagel', clue: 'A round bread with a hole in the middle' },
      ],
      4: [
        { word: 'cherry', clue: 'A small round red fruit on a stem' },
        { word: 'carrot', clue: 'An orange root vegetable rabbits love' },
        { word: 'cookie', clue: 'A small flat sweet baked snack' },
        { word: 'muffin', clue: 'A small round cake baked in a cup' },
        { word: 'banana', clue: 'A long yellow fruit with a peel' },
        { word: 'walnut', clue: 'A wrinkly brown nut in a hard shell' },
        { word: 'lentil', clue: 'A tiny flat seed cooked in soups' },
        { word: 'turnip', clue: 'A round white and purple root vegetable' },
        { word: 'garlic', clue: 'A smelly bulb that adds flavor to food' },
        { word: 'yogurt', clue: 'A thick creamy dairy food made from milk' },
        { word: 'pepper', clue: 'A spicy or sweet crunchy vegetable' },
        { word: 'waffle', clue: 'A crispy grid-patterned breakfast cake' },
      ],
      5: [
        { word: 'apricot', clue: 'A small orange fruit like a tiny peach' },
        { word: 'avocado', clue: 'A creamy green fruit used to make guacamole' },
        { word: 'spinach', clue: 'Dark green leafy vegetable rich in iron' },
        { word: 'pretzel', clue: 'A twisted salty baked snack' },
        { word: 'broccoli', clue: 'A green vegetable that looks like tiny trees' },
        { word: 'blueberry', clue: 'A tiny blue berry that stains your tongue' },
        { word: 'coconut', clue: 'A large tropical nut with white flesh inside' },
        { word: 'pumpkin', clue: 'A large orange vegetable carved at Halloween' },
        { word: 'noodles', clue: 'Long thin strips of pasta or dough' },
        { word: 'popcorn', clue: 'Kernels of corn that pop when heated' },
        { word: 'pancake', clue: 'A flat round cake cooked in a pan' },
        { word: 'mustard', clue: 'A yellow sauce put on hot dogs' },
      ],
    },
  },
  {
    name: 'Nature',
    words: {
      1: [
        { word: 'sun', clue: 'The bright star that lights up the day' },
        { word: 'sky', clue: 'The blue space above us' },
        { word: 'mud', clue: 'Wet dirt you can squish between your toes' },
        { word: 'log', clue: 'A big cut piece of a tree trunk' },
        { word: 'ice', clue: 'Frozen water that is cold and slippery' },
        { word: 'sea', clue: 'A large body of salty water' },
        { word: 'fog', clue: 'A thick mist that makes it hard to see' },
        { word: 'oak', clue: 'A large tree that grows acorns' },
        { word: 'bay', clue: 'A curved area of sea near the shore' },
        { word: 'dew', clue: 'Water drops on grass in the morning' },
        { word: 'ash', clue: 'Grey powder left after something burns' },
        { word: 'fen', clue: 'A flat marshy wetland' },
      ],
      2: [
        { word: 'moon', clue: 'The big round light in the night sky' },
        { word: 'rain', clue: 'Water that falls from clouds' },
        { word: 'snow', clue: 'White frozen flakes that fall in winter' },
        { word: 'cave', clue: 'A hollow space inside a rock or mountain' },
        { word: 'leaf', clue: 'A flat green part of a plant' },
        { word: 'sand', clue: 'Tiny grains found on beaches and deserts' },
        { word: 'wave', clue: 'A moving ridge of water in the ocean' },
        { word: 'vine', clue: 'A climbing plant that twists around things' },
        { word: 'rock', clue: 'A hard piece of stone from the earth' },
        { word: 'mist', clue: 'A light thin fog over water or hills' },
        { word: 'pond', clue: 'A small still body of fresh water' },
        { word: 'pine', clue: 'An evergreen tree with needle-like leaves' },
      ],
      3: [
        { word: 'cloud', clue: 'A fluffy white mass of water in the sky' },
        { word: 'river', clue: 'A long flowing body of fresh water' },
        { word: 'flame', clue: 'The glowing part of a fire' },
        { word: 'stone', clue: 'A small hard piece of rock' },
        { word: 'shore', clue: 'The land at the edge of the sea' },
        { word: 'marsh', clue: 'Wet soggy ground near water' },
        { word: 'frost', clue: 'A thin icy layer on cold surfaces' },
        { word: 'maple', clue: 'A tree whose leaves turn bright red in autumn' },
        { word: 'creek', clue: 'A small shallow stream' },
        { word: 'delta', clue: 'Where a river splits into many streams at the sea' },
        { word: 'grove', clue: 'A small group of trees' },
        { word: 'coral', clue: 'A colorful rock-like structure in the ocean' },
      ],
      4: [
        { word: 'desert', clue: 'A dry hot land covered in sand and rocks' },
        { word: 'forest', clue: 'A large area covered in many trees' },
        { word: 'rapids', clue: 'A fast-moving stretch of a river' },
        { word: 'pebble', clue: 'A small smooth rounded stone' },
        { word: 'tundra', clue: 'A cold flat treeless land near the poles' },
        { word: 'jungle', clue: 'A thick tropical forest full of plants' },
        { word: 'meadow', clue: 'A field of grass and wildflowers' },
        { word: 'summit', clue: 'The highest point at the top of a mountain' },
        { word: 'canyon', clue: 'A deep narrow valley cut by a river' },
        { word: 'lagoon', clue: 'A shallow pool of water near the sea' },
        { word: 'spring', clue: 'A place where water bubbles up from the ground' },
        { word: 'fossil', clue: 'The remains of an ancient creature in rock' },
      ],
      5: [
        { word: 'tornado', clue: 'A violent spinning column of air' },
        { word: 'rainbow', clue: 'An arc of colors seen after rain and sunshine' },
        { word: 'volcano', clue: 'A mountain that erupts with hot lava' },
        { word: 'horizon', clue: 'The line where the sky meets the earth' },
        { word: 'thunder', clue: 'The loud booming sound during a storm' },
        { word: 'wetland', clue: 'Land covered with shallow water' },
        { word: 'savanna', clue: 'A grassy plain in Africa with few trees' },
        { word: 'iceberg', clue: 'A huge floating chunk of ice in the ocean' },
        { word: 'estuary', clue: 'Where a river meets the sea' },
        { word: 'cascade', clue: 'A series of small waterfalls' },
        { word: 'eclipse', clue: 'When one celestial body blocks another' },
        { word: 'plateau', clue: 'A large flat area of high ground' },
      ],
    },
  },
];

export function getWordsForRound(
  categoryIndex: number,
  difficulty: number,
  count: number,
): WordEntry[] {
  const category = categories[categoryIndex];
  if (!category) throw new Error(`Invalid categoryIndex: ${categoryIndex}`);
  const pool = category.words[difficulty];
  if (!pool) throw new Error(`Invalid difficulty: ${difficulty}`);

  // Fisher-Yates shuffle on a copy
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export function getRandomCategoryIndex(): number {
  return Math.floor(Math.random() * categories.length);
}
