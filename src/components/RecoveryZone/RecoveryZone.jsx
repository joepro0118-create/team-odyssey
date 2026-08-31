import LifePreserverButton from './LifePreserverButton';
import NudgeCard from './NudgeCard';
import { nudges } from '../../data/mockData';

export default function RecoveryZone({ onHideLowPriority }) {
  return (
    <section className="column col4">
      <div className="col-eyebrow">Reset</div>
      <h2 className="col-title">Recovery zone</h2>

      <LifePreserverButton onHideLowPriority={onHideLowPriority} />

      <div className="nudges">
        {nudges.map((n) => (
          <NudgeCard key={n.id} nudge={n} />
        ))}
      </div>
    </section>
  );
}