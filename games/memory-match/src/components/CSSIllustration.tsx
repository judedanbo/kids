import type { IllustrationName } from '../utils/gridUtils';
import styles from './CSSIllustration.module.css';

function Cat() {
  return (
    <div className={styles.illustration}>
      <div className={styles.catFace}>
        <div className={styles.catEarLeft} />
        <div className={styles.catEarRight} />
        <div className={styles.catEyeLeft} />
        <div className={styles.catEyeRight} />
        <div className={styles.catNose} />
        <div className={styles.catWhiskerLeft} />
        <div className={styles.catWhiskerRight} />
      </div>
    </div>
  );
}

function Fish() {
  return (
    <div className={styles.illustration}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div className={styles.fishBody}>
          <div className={styles.fishTail} />
          <div className={styles.fishEye} />
        </div>
      </div>
    </div>
  );
}

function Butterfly() {
  return (
    <div className={styles.illustration}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.butterflyBody}>
          <div className={styles.butterflyWingTL} />
          <div className={styles.butterflyWingTR} />
          <div className={styles.butterflyWingBL} />
          <div className={styles.butterflyWingBR} />
          <div className={styles.butterflyAntennaLeft} />
          <div className={styles.butterflyAntennaRight} />
        </div>
      </div>
    </div>
  );
}

function Bird() {
  return (
    <div className={styles.illustration}>
      <div style={{ position: 'relative', marginTop: '14px' }}>
        <div className={styles.birdBody}>
          <div className={styles.birdHead}>
            <div className={styles.birdEye} />
            <div className={styles.birdBeak} />
          </div>
          <div className={styles.birdWing} />
          <div className={styles.birdTail} />
        </div>
      </div>
    </div>
  );
}

function Flower() {
  const petalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className={styles.illustration}>
      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {petalAngles.map((angle) => (
          <div
            key={angle}
            className={styles.petal}
            style={{
              transform: `translateX(-50%) translateY(-100%) rotate(${angle}deg)`,
              marginTop: '7px',
            }}
          />
        ))}
        <div className={styles.flowerCenter} />
      </div>
    </div>
  );
}

function Sun() {
  const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className={styles.illustration}>
      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {rayAngles.map((angle) => (
          <div
            key={angle}
            className={styles.ray}
            style={{
              transform: `translateX(-50%) translateY(-100%) rotate(${angle}deg)`,
              marginTop: '6px',
            }}
          />
        ))}
        <div className={styles.sunCircle} />
      </div>
    </div>
  );
}

function Tree() {
  return (
    <div className={styles.illustration} style={{ flexDirection: 'column' }}>
      <div className={styles.treeCanopy} />
      <div className={styles.treeTrunk} />
    </div>
  );
}

function Star() {
  return (
    <div className={styles.illustration}>
      <div className={styles.star} />
    </div>
  );
}

function Heart() {
  return (
    <div className={styles.illustration}>
      <div className={styles.heart} />
    </div>
  );
}

function House() {
  return (
    <div className={styles.illustration}>
      <div className={styles.houseWrapper}>
        <div className={styles.houseRoof} />
        <div className={styles.houseBody}>
          <div className={styles.houseDoor} />
        </div>
      </div>
    </div>
  );
}

const ILLUSTRATION_MAP: Record<IllustrationName, () => React.JSX.Element> = {
  cat: Cat,
  fish: Fish,
  butterfly: Butterfly,
  bird: Bird,
  flower: Flower,
  sun: Sun,
  tree: Tree,
  star: Star,
  heart: Heart,
  house: House,
};

export function CSSIllustration({ name }: { name: IllustrationName }) {
  const Component = ILLUSTRATION_MAP[name];
  return <Component />;
}
