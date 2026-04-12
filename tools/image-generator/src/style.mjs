/**
 * Shared style guidance applied to every prompt.
 *
 * The style is intentionally "realistic but soft" — a 3D, Pixar/claymation
 * look rather than photorealism. At the small sizes (32–256px) these icons
 * render in the app, photorealism reads as muddy and age-inappropriate.
 * This style keeps subjects recognizable and warm for ages 3–12.
 *
 * Safety guidance is baked into every prompt so nothing scary, violent,
 * or otherwise inappropriate gets generated.
 */
export const STYLE_PREFIX =
  'Cheerful 3D render in the style of a modern Pixar/claymation short. ' +
  'Soft studio lighting, rounded friendly shapes, vibrant pastel colors, ' +
  'smooth clay-like or polished-plastic materials, centered composition. ';

export const STYLE_SUFFIX =
  ' Plain, very soft pastel background with subtle radial gradient. ' +
  'Suitable for a young children\'s educational app (ages 3–12). ' +
  'Safe, wholesome, non-violent, age-appropriate. ' +
  'No text, no letters, no numbers, no logos, no watermarks. ' +
  'No weapons, no blood, no gore, no scary faces, no dark themes.';

/** Wrap a subject description with the shared style. */
export function stylize(subject) {
  return `${STYLE_PREFIX}${subject}.${STYLE_SUFFIX}`;
}
