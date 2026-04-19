import { useAnnounce, IconImage } from '@kids-games-zone/shared';
import styles from './ObjectGroups.module.css';

const EMOJI_MAP: Record<string, string> = {
  apple: '🍎',
  star: '⭐',
  block: '🟦',
  butterfly: '🦋',
  fish: '🐟',
  flower: '🌸',
};

const IMAGE_MAP: Record<string, string> = {
  apple: '/images/games/more-or-less/apple.webp',
  star: '/images/games/more-or-less/star.webp',
  block: '/images/games/more-or-less/block.webp',
  butterfly: '/images/games/more-or-less/butterfly.webp',
  fish: '/images/games/more-or-less/fish.webp',
  flower: '/images/games/more-or-less/flower.webp',
};

interface ObjectGroup {
  objectType: string;
  count: number;
}

interface ObjectGroupsProps {
  groups: ObjectGroup[];
  onSelect: (index: number) => void;
  disabled?: boolean;
}

export function ObjectGroups({ groups, onSelect, disabled = false }: ObjectGroupsProps) {
  const announce = useAnnounce();

  const handleSelect = (index: number) => {
    if (disabled) return;
    announce(
      `Selected group ${index + 1} with ${groups[index].count} ${groups[index].objectType}s`,
    );
    onSelect(index);
  };

  return (
    <div className={styles.container} role="group" aria-label="Choose a group">
      {groups.map((group, index) => (
        <button
          key={index}
          className={styles.group}
          onClick={() => handleSelect(index)}
          disabled={disabled}
          aria-label={`Group with ${group.count} ${group.objectType}s`}
        >
          <div className={styles.objects}>
            {Array.from({ length: group.count }, (_, i) => {
              const src = IMAGE_MAP[group.objectType];
              const fallback = EMOJI_MAP[group.objectType] ?? '⬛';
              return (
                <span key={i} className={styles.object} aria-hidden="true">
                  {src ? <IconImage src={src} alt="" fallback={fallback} size={48} /> : fallback}
                </span>
              );
            })}
          </div>
          <span className={styles.count}>{group.count}</span>
        </button>
      ))}
    </div>
  );
}
