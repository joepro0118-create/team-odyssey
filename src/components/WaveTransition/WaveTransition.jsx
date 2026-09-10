import { forwardRef, useImperativeHandle, useRef } from 'react';

function waveEdge(x0, h, amp, humps) {
  const step = h / humps;
  let d = '';
  for (let i = 0; i < humps; i++) {
    const ymid = step * (i + 0.5);
    const yend = step * (i + 1);
    const cx = x0 + (i % 2 === 0 ? amp : -amp);
    d += ` Q${cx},${ymid} ${x0},${yend}`;
  }
  return d;
}

function bandPath(x0, h, amp, humps, farLeft) {
  return `M${farLeft},0 L${x0},0${waveEdge(x0, h, amp, humps)} L${farLeft},${h} Z`;
}

// Calm late-night tide against rock: a slow filtered swell, a soft low
// thud where the water meets the rock, and a long quiet foam fizz after.
function playTideSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const duration = 1.5;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const env = Math.sin(Math.PI * Math.pow(t, 0.85));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const swell = ctx.createBufferSource();
    swell.buffer = buffer;
    const swellFilter = ctx.createBiquadFilter();
    swellFilter.type = 'lowpass';
    swellFilter.Q.value = 0.5;
    swellFilter.frequency.setValueAtTime(220, now);
    swellFilter.frequency.linearRampToValueAtTime(750, now + 0.55);
    swellFilter.frequency.linearRampToValueAtTime(160, now + duration);
    const swellGain = ctx.createGain();
    swellGain.gain.setValueAtTime(0.0001, now);
    swellGain.gain.exponentialRampToValueAtTime(0.45, now + 0.5);
    swellGain.gain.exponentialRampToValueAtTime(0.02, now + duration);
    swell.connect(swellFilter);
    swellFilter.connect(swellGain);
    swellGain.connect(ctx.destination);
    swell.start(now);

    const thudStart = now + 0.5;
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(85, thudStart);
    thud.frequency.exponentialRampToValueAtTime(38, thudStart + 0.4);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, thudStart);
    thudGain.gain.exponentialRampToValueAtTime(0.4, thudStart + 0.03);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudStart + 0.55);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(thudStart);
    thud.stop(thudStart + 0.6);

    const fizzStart = now + 0.45;
    const fizzDur = 1.5;
    const fizzBufferSize = ctx.sampleRate * fizzDur;
    const fizzBuffer = ctx.createBuffer(1, fizzBufferSize, ctx.sampleRate);
    const fizzData = fizzBuffer.getChannelData(0);
    for (let j = 0; j < fizzBufferSize; j++) {
      const ft = j / fizzBufferSize;
      fizzData[j] = (Math.random() * 2 - 1) * Math.pow(1 - ft, 2.5);
    }
    const fizz = ctx.createBufferSource();
    fizz.buffer = fizzBuffer;
    const fizzFilter = ctx.createBiquadFilter();
    fizzFilter.type = 'highpass';
    fizzFilter.frequency.value = 2200;
    const fizzGain = ctx.createGain();
    fizzGain.gain.setValueAtTime(0.09, fizzStart);
    fizzGain.gain.linearRampToValueAtTime(0.0001, fizzStart + fizzDur);
    fizz.connect(fizzFilter);
    fizzFilter.connect(fizzGain);
    fizzGain.connect(ctx.destination);
    fizz.start(fizzStart);
  } catch {
    // Web Audio unavailable — the transition still plays silently.
  }
}

// Renders a transparent overlay covering the canvas area. Sidebar (via
// App.jsx's goTo) calls waveRef.current.play(onMid) right before scrolling
// to a new column; onMid fires partway through the wave animation so the
// scroll happens while the wave is at its fullest, masking the jump cut.
const WaveTransition = forwardRef(function WaveTransition(_, ref) {
  const overlayRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play(onMid) {
      const overlay = overlayRef.current;
      if (!overlay) {
        onMid?.();
        return;
      }

      const w = window.innerWidth || overlay.clientWidth || 1920;
      const h = window.innerHeight || overlay.clientHeight || 1080;
      const bandW = w * 0.55;
      const farLeft = -w * 4;

      overlay.style.display = 'block';

      overlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
      overlay.innerHTML =
        `<g id="waveGroup">` +
        `<path d="${bandPath(bandW - 22, h, 18, 5, farLeft)}" fill="#0A3D5C" opacity="0.55"></path>` +
        `<path d="${bandPath(bandW, h, 22, 6, farLeft)}" fill="#1F6F8B"></path>` +
        `<path d="${bandPath(bandW + 12, h, 14, 8, farLeft)}" fill="none" stroke="#CFEEE1" stroke-width="5" stroke-linecap="round" opacity="0.85"></path>` +
        `</g>`;

      const group = overlay.querySelector('#waveGroup');
      group.style.transform = `translateX(${-bandW}px)`;

      const anim = group.animate(
        [
          { transform: `translateX(${-bandW}px)` },
          { transform: `translateX(${w + bandW * 0.3}px)` },
        ],
        { duration: 900, easing: 'cubic-bezier(.36,.6,.24,1)' }
      );

      const bubbleCount = 6;
      for (let b = 0; b < bubbleCount; b++) {
        const y = (h / bubbleCount) * (b + 0.5) + (Math.random() * 20 - 10);
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('r', 3 + Math.random() * 3);
        el.setAttribute('cy', y);
        el.setAttribute('cx', 12);
        el.setAttribute('fill', '#FFFDF8');
        el.setAttribute('opacity', '0.9');
        overlay.appendChild(el);
        const delay = 120 + b * 70 + Math.random() * 60;
        const travel = w + bandW * 0.6;
        el.animate(
          [
            { transform: 'translate(0px,0px)', opacity: 0.9 },
            { transform: `translate(${travel}px,${Math.random() * 24 - 12}px)`, opacity: 0 },
          ],
          { duration: 750, delay, easing: 'cubic-bezier(.36,.6,.24,1)', fill: 'forwards' }
        );
      }

      playTideSound();
      setTimeout(() => onMid?.(), 430);
      anim.onfinish = () => {
        overlay.innerHTML = '';
        overlay.style.display = 'none';
      };
    },
  }));

  return <svg ref={overlayRef} className="wave-overlay" preserveAspectRatio="none" style={{ display: 'none' }} />;
});

export default WaveTransition;
