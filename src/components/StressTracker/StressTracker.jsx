import MoodSlider from './MoodSlider';
import StressChart from './StressChart';

export default function StressTracker({ mood, setMood, history }) {
  return (
    <section className="column col3">
      <div className="col-eyebrow">Check-in</div>
      <h2 className="col-title">How are you doing?</h2>

      <MoodSlider mood={mood} setMood={setMood} />
      <StressChart history={history} />
    </section>
  );
}