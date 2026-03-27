import { useRovingTabindex } from '@kids-games-zone/shared';
import type { CardData, GridConfig } from '../utils/gridUtils';
import { Card } from './Card';
import styles from './CardGrid.module.css';

export interface CardGridProps {
  cards: CardData[];
  gridConfig: GridConfig;
  flippedIds: Set<number>;
  matchedPairIds: Set<number>;
  onCardClick: (cardId: number) => void;
  disabled: boolean;
}

export function CardGrid({
  cards,
  gridConfig,
  flippedIds,
  matchedPairIds,
  onCardClick,
  disabled,
}: CardGridProps) {
  const { columns, cardSize } = gridConfig;
  const { getItemProps } = useRovingTabindex({
    itemCount: cards.length,
    columns,
    orientation: 'grid',
  });

  return (
    <div className={styles.gridWrapper}>
      <div
        role="grid"
        aria-label="Memory card grid"
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardSize}px)`,
        }}
      >
        {cards.map((card, index) => {
          const isFlipped = flippedIds.has(card.id) || matchedPairIds.has(card.pairId);
          const isMatched = matchedPairIds.has(card.pairId);
          const { tabIndex, onKeyDown, ref: refCallback } = getItemProps(index);
          return (
            <Card
              key={card.id}
              illustration={card.illustration}
              isFlipped={isFlipped}
              isMatched={isMatched}
              onClick={() => onCardClick(card.id)}
              disabled={disabled || isMatched}
              size={cardSize}
              index={index}
              totalCards={cards.length}
              tabIndex={tabIndex}
              onKeyDown={onKeyDown}
              refCallback={refCallback}
            />
          );
        })}
      </div>
    </div>
  );
}
