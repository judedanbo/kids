import { useState } from 'react';
import styles from './IconImage.module.css';

interface IconImageProps {
  /** Public URL of the generated image, e.g. "/images/ui/nav-home.webp". */
  src: string;
  /** Accessible label. Pass empty string + aria-hidden wrapper for decorative icons. */
  alt: string;
  /**
   * Emoji shown while the image is loading or if it fails to load. Required
   * so the UI is never empty when assets haven't been generated yet
   * (local-only image-generator pipeline — CI/tests never have images).
   */
  fallback: string;
  /** Size in px. Defaults to 32. Applies as width AND height. */
  size?: number;
  className?: string;
}

/**
 * Renders a pre-rendered illustration with a graceful emoji fallback.
 *
 * Images are produced locally by `tools/image-generator` and committed under
 * `platform/public/images/`. If the image is missing (freshly checked-out
 * branch, CI, test runs) this component falls back to the original emoji so
 * the app stays usable and tests don't need network/image fixtures.
 */
export function IconImage({ src, alt, fallback, size = 32, className }: IconImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`${styles.fallback} ${className ?? ''}`}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${styles.img} ${className ?? ''}`}
    />
  );
}
