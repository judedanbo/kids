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

  return (
    <div className={styles.gridWrapper}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardSize}px)`,
        }}
      >
        {cards.map((card) => {
          const isFlipped = flippedIds.has(card.id) || matchedPairIds.has(card.pairId);
          const isMatched = matchedPairIds.has(card.pairId);
          return (
            <Card
              key={card.id}
              illustration={card.illustration}
              isFlipped={isFlipped}
              isMatched={isMatched}
              onClick={() => onCardClick(card.id)}
              disabled={disabled || isMatched}
              size={cardSize}
            />
          );
        })}
      </div>
    </div>
  );
}
