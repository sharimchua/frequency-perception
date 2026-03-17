import React, { useState, useMemo, useRef, useCallback } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip, Line } from 'recharts';
import { Activity, Layers, AlertTriangle, Music, X } from 'lucide-react';

// --- Global Theme & Config ---
const THEME = {
  bg: '#000000',
  panel: '#09090b',
  border: '#27272a',
  text: '#ffffff',
  textMuted: '#a1a1aa',
  noteA: '#06b6d4',
  noteB: '#ec4899',
  alert: '#eab308'
};

const MIN_F = 20;
const MAX_F = 6000;
const HARMONIC_COUNT = 6;

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const INTERVALS = [
  { name: 'U', semi: 0 }, { name: 'm2', semi: 1 }, { name: 'M2', semi: 2 }, { name: 'm3', semi: 3 }, { name: 'M3', semi: 4 },
  { name: 'P4', semi: 5 }, { name: 'TT', semi: 6 }, { name: 'P5', semi: 7 }, { name: 'm6', semi: 8 },
  { name: 'M6', semi: 9 }, { name: 'm7', semi: 10 }, { name: 'M7', semi: 11 }, { name: 'P8', semi: 12 },
];

// --- Math Helpers ---
const midiToFreq = n => 440 * Math.pow(2, (n - 69) / 12);
const freqToMidi = f => 12 * Math.log2(f / 440) + 69;
const toBark     = f => 13 * Math.atan(0.00076 * f) + 3.5 * Math.atan(Math.pow(f / 7500, 2));
const toMel      = f => 2595 * Math.log10(1 + f / 700);

const getNoteName = n => {
  const r = Math.round(n);
  return `${NOTE_NAMES[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`;
};

const getClosest12TET = (freq) => {
  const mFloat = 12 * Math.log2(freq / 440) + 69;
  const mRound = Math.round(mFloat);
  const cents = (mFloat - mRound) * 100;
  return { midi: mRound, name: getNoteName(mRound), freq: midiToFreq(mRound), cents };
};

const getVal = (f, scale) => {
  if (scale === 'hz') return f;
  if (scale === 'log') return Math.log2(f);
  if (scale === 'bark') return toBark(f);
  if (scale === 'mel') return toMel(f);
  return f;
};

const getPct = (f, scale) => {
  const v = getVal(f, scale);
  const min = getVal(MIN_F, scale);
  const max = getVal(MAX_F, scale);
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
};

export default function App() {
  const [midiA, setMidiA] = useState(69);
  const [stDiff, setStDiff] = useState(7);
  const [showOvertones, setShowOvertones] = useState(true);
  const [highlightedPair, setHighlightedPair] = useState(null); // { id1, id2 }

  const keyboardRef = useRef(null);
  const [hoveredHarm, setHoveredHarm] = useState(null);
  const [hoverPct, setHoverPct] = useState(null);

  const midiB = useMemo(() => Math.min(108, midiA + stDiff), [midiA, stDiff]);
  const freqA = useMemo(() => midiToFreq(midiA), [midiA]);
  const freqB = useMemo(() => midiToFreq(midiB), [midiB]);

  const harmonicsA = useMemo(() => Array.from({ length: HARMONIC_COUNT }, (_, i) => ({
    id: `A${i+1}`, note: 'A', degree: i+1, freq: freqA * (i+1), color: THEME.noteA, isFund: i === 0
  })), [freqA]);

  const harmonicsB = useMemo(() => Array.from({ length: HARMONIC_COUNT }, (_, i) => ({
    id: `B${i+1}`, note: 'B', degree: i+1, freq: freqB * (i+1), color: THEME.noteB, isFund: i === 0
  })), [freqB]);

  const activeHarmonics = useMemo(() => {
    if (!showOvertones) return stDiff === 0 ? [harmonicsA[0]] : [harmonicsA[0], harmonicsB[0]];
    return stDiff === 0 ? harmonicsA : [...harmonicsA, ...harmonicsB];
  }, [showOvertones, stDiff, harmonicsA, harmonicsB]);

  const chartData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const f = MIN_F * Math.pow(MAX_F / MIN_F, i / 120);
      pts.push({ hz: f, log: Math.log2(f), bark: toBark(f), mel: toMel(f), y: 50 });
    }
    return pts;
  }, []);

  const interferences = useMemo(() => {
    const clashes = [];
    for (let i = 0; i < activeHarmonics.length; i++) {
      for (let j = i + 1; j < activeHarmonics.length; j++) {
        const h1 = activeHarmonics[i];
        const h2 = activeHarmonics[j];
        const hzDiff = Math.abs(h1.freq - h2.freq);
        if (hzDiff < 3) continue;
        const dist = Math.abs(toBark(h1.freq) - toBark(h2.freq));
        if (dist < 1.0) clashes.push({ h1, h2, barkDist: dist });
      }
    }
    return clashes.sort((a, b) => a.barkDist - b.barkDist);
  }, [activeHarmonics]);

  const handleKbMove = useCallback((e) => {
    if (!keyboardRef.current) return;
    const rect = keyboardRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const logF = frac * (Math.log2(MAX_F) - Math.log2(MIN_F)) + Math.log2(MIN_F);
    const f = Math.pow(2, logF);
    let closest = null;
    let minCents = Infinity;
    activeHarmonics.forEach(h => {
      const cents = Math.abs(1200 * Math.log2(h.freq / f));
      if (cents < minCents) { minCents = cents; closest = h; }
    });
    if (minCents < 150) { setHoveredHarm(closest); setHoverPct(getPct(closest.freq, 'log')); } 
    else { setHoveredHarm(null); }
  }, [activeHarmonics]);

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { hz, bark, mel } = payload[0].payload;
    const tet = getClosest12TET(hz);
    return (
      <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, padding: '8px 12px', pointerEvents: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.8)', borderRadius: 4, zIndex: 1000 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{hz.toFixed(1)} Hz</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: THEME.textMuted }}>{bark.toFixed(2)}z | {mel.toFixed(0)}m</div>
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${THEME.border}`, fontSize: 10, color: THEME.textMuted }}>
          {tet.name} <span style={{ color: tet.cents > 0 ? '#10b981' : '#ef4444' }}>{tet.cents > 0 ? '+' : ''}{tet.cents.toFixed(1)}¢</span>
        </div>
      </div>
    );
  };

  const PsychoChart = ({ title, desc, dataKey }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: THEME.text, margin: 0, textTransform: 'uppercase' }}>{title}</h3>
        <span style={{ fontSize: 10, color: THEME.textMuted }}>{desc}</span>
      </div>
      <div style={{ height: 140, background: THEME.panel, border: `1px solid ${THEME.border}`, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="1 4" stroke={THEME.border} vertical={false} />
            <XAxis dataKey={dataKey} type="number" domain={[getVal(MIN_F, dataKey), getVal(MAX_F, dataKey)]} hide />
            <YAxis hide domain={[0, 100]} />
            <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: '#3f3f46' }} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 1000 }} />
            <Line type="monotone" dataKey="y" stroke="transparent" dot={false} activeDot={{ r: 3, fill: '#fff' }} />
            {activeHarmonics.map(h => {
              const isHighlighted = highlightedPair 
                ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                : true;
              return (
                <ReferenceLine 
                  key={h.id} 
                  x={getVal(h.freq, dataKey)} 
                  stroke={h.color} 
                  strokeWidth={h.isFund ? 2 : 1} 
                  strokeOpacity={isHighlighted ? (h.isFund ? 1 : 0.6) : 0.1} 
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
           <div style={{ position: 'relative', width: '100%', height: '100%', margin: '0 10px' }}>
             {activeHarmonics.map(h => {
               if (h.isFund) return null;
               const p = getPct(h.freq, dataKey);
               const isHighlighted = highlightedPair 
                 ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                 : true;
               return (
                 <div key={`lbl-${h.id}`} style={{ position: 'absolute', left: `calc(${p}% * calc(100% - 20px) / 100%)`, bottom: 4, transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, color: h.color, opacity: isHighlighted ? 0.8 : 0.1 }}>H{h.degree}</div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );

  const toggleHighlight = (h1, h2) => {
    if (highlightedPair && highlightedPair.id1 === h1.id && highlightedPair.id2 === h2.id) {
      setHighlightedPair(null);
    } else {
      setHighlightedPair({ id1: h1.id, id2: h2.id });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, padding: '0 16px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .hg-slider { -webkit-appearance: none; width: 100%; height: 2px; background: ${THEME.border}; outline: none; }
        .hg-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #fff; cursor: pointer; }
        .slider-cyan::-webkit-slider-thumb { background: ${THEME.noteA}; }
        .slider-pink::-webkit-slider-thumb { background: ${THEME.noteB}; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .interference-pill { transition: all 0.2s ease; cursor: pointer; }
        .interference-pill:hover { filter: brightness(1.2); transform: translateY(-1px); }
        .interference-pill.active { outline: 2px solid #fff; outline-offset: 1px; }
      `}</style>

      {/* --- Sticky Stats Header --- */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2000, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${THEME.border}`, margin: '0 -16px 16px', padding: '8px 16px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Activity size={16} />
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
              <span style={{ color: THEME.noteA }}>{getNoteName(midiA)} ({freqA.toFixed(1)}Hz)</span>
              <span style={{ margin: '0 8px', color: THEME.textMuted }}>→</span>
              <span style={{ color: THEME.noteB }}>{getNoteName(midiB)} ({freqB.toFixed(1)}Hz)</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 10, fontWeight: 600, fontFamily: 'monospace', textTransform: 'uppercase' }}>
            <div style={{ color: THEME.textMuted }}>Interval Δ:</div>
            <div style={{ color: '#fff' }}>Hz: <span style={{ color: THEME.alert }}>{Math.abs(freqA - freqB).toFixed(1)}</span></div>
            <div style={{ color: '#fff' }}>Semi: <span style={{ color: THEME.alert }}>{stDiff}</span></div>
            <div style={{ color: '#fff' }}>Bark: <span style={{ color: THEME.alert }}>{Math.abs(toBark(freqA) - toBark(freqB)).toFixed(2)}z</span></div>
            <div style={{ color: '#fff' }}>Mel: <span style={{ color: THEME.alert }}>{Math.abs(toMel(freqA) - toMel(freqB)).toFixed(0)}m</span></div>
          </div>
        </div>
      </div>

      {/* --- Compact Control Panel --- */}
      <div style={{ maxWidth: 1000, margin: '0 auto 20px', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12 }}>
        {/* Tuning controls */}
        <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, padding: '12px', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ flex: 1 }}><input type="range" min="21" max="108" value={midiA} onChange={(e) => { const v = parseInt(e.target.value); if (v + stDiff <= 108) setMidiA(v); else setMidiA(108 - stDiff); }} className="hg-slider slider-cyan" /></div>
            <div style={{ flex: 1 }}><input type="range" min="21" max="108" value={midiB} onChange={(e) => setStDiff(Math.max(0, parseInt(e.target.value) - midiA))} className="hg-slider slider-pink" /></div>
            <button 
              onClick={() => setShowOvertones(!showOvertones)} 
              title={showOvertones ? "Hide Overtones" : "Show Overtones"}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showOvertones ? '#fff' : 'transparent', color: showOvertones ? '#000' : '#fff', border: `1px solid ${THEME.border}`, cursor: 'pointer', borderRadius: 4 }}
            >
              <Layers size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {INTERVALS.map(iv => (
              <button key={iv.name} onClick={() => setStDiff(iv.semi)} style={{ flex: 1, padding: '3px 0', fontSize: 9, background: stDiff === iv.semi ? THEME.text : THEME.bg, color: stDiff === iv.semi ? '#000' : THEME.textMuted, border: `1px solid ${THEME.border}`, cursor: 'pointer', minWidth: '24px' }}>{iv.name}</button>
            ))}
          </div>
        </div>

        {/* Interference Engine Pills */}
        <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, padding: '10px', borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} color={THEME.alert} />
              <span style={{ fontSize: 9, fontWeight: 800, color: THEME.textMuted, letterSpacing: '0.05em' }}>INTERFERENCE ENGINE</span>
            </div>
            {highlightedPair && (
              <button onClick={() => setHighlightedPair(null)} style={{ background: 'none', border: 'none', color: THEME.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                <X size={10} /> Clear Highlight
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 60, overflowY: 'auto' }} className="scrollbar-hide">
            {interferences.length === 0 ? (
              <div style={{ fontSize: 10, color: THEME.textMuted, opacity: 0.5, fontStyle: 'italic' }}>Timbres perfectly resolved.</div>
            ) : (
              interferences.map((c, i) => {
                const isActive = highlightedPair && highlightedPair.id1 === c.h1.id && highlightedPair.id2 === c.h2.id;
                return (
                  <div 
                    key={i} 
                    onClick={() => toggleHighlight(c.h1, c.h2)}
                    className={`interference-pill ${isActive ? 'active' : ''}`}
                    style={{ 
                      background: THEME.bg, 
                      border: `1px solid ${THEME.border}`, 
                      padding: '2px 8px', 
                      borderRadius: 100, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      fontSize: 9,
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: c.h1.color, fontWeight: 800 }}>{c.h1.note}{c.h1.degree}</span>
                    <span style={{ color: THEME.textMuted }}>+</span>
                    <span style={{ color: c.h2.color, fontWeight: 800 }}>{c.h2.note}{c.h2.degree}</span>
                    <span style={{ color: c.barkDist < 0.3 ? '#ef4444' : THEME.alert, marginLeft: 2 }}>Δ{c.barkDist.toFixed(2)}z</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto' }}>
        <PsychoChart title="I. Physical (Hz)" desc="Absolute air vibration. Spacing expands exponentially." dataKey="hz" />
        <PsychoChart title="II. Theoretical (Log)" desc="Music theory view. Intervals are spatially fixed." dataKey="log" />

        <div style={{ marginBottom: 24 }}>
          <div style={{ background: THEME.panel, border: `1px solid ${THEME.border}`, padding: '12px', position: 'relative', borderRadius: 4 }}>
             <div style={{ position: 'relative', height: 16, marginBottom: 2 }}>
               {activeHarmonics.map((h, i) => {
                 const isHighlighted = highlightedPair 
                    ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                    : true;
                 return (
                  <div 
                    key={`mk-${h.id}-${i}`} 
                    style={{ 
                      position: 'absolute', left: `${getPct(h.freq, 'log')}%`, bottom: 0, 
                      width: h.isFund ? 4 : 2, 
                      height: h.isFund ? 16 : 8, 
                      background: h.color, 
                      transform: 'translateX(-50%)',
                      opacity: isHighlighted ? 1 : 0.1
                    }} 
                  />
                 );
               })}
             </div>
             <div ref={keyboardRef} onMouseMove={handleKbMove} onMouseLeave={() => setHoveredHarm(null)} style={{ display: 'flex', height: 40, border: `1px solid #18181b`, cursor: 'crosshair', position: 'relative', overflow: 'hidden' }}>
               {Array.from({ length: 72 }).map((_, i) => {
                 const m = 36 + i;
                 const isBlack = [1,3,6,8,10].includes(m % 12);
                 return (
                    <div key={m} style={{ flex: 1, position: 'relative', background: '#f4f4f5', borderRight: '1px solid #d4d4d8', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 2 }}>
                      {isBlack && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', background: '#18181b', zIndex: 2 }} />}
                    </div>
                 );
               })}
             </div>
             {hoveredHarm && (
               <div style={{ position: 'absolute', bottom: '100%', left: `${hoverPct}%`, transform: 'translateX(-50%)', background: THEME.panel, border: `1px solid ${hoveredHarm.color}`, padding: '6px 10px', zIndex: 3000, pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.9)', borderRadius: 4, marginBottom: 8, whiteSpace: 'nowrap' }}>
                 <div style={{ fontSize: 9, fontWeight: 800, color: hoveredHarm.color }}>{hoveredHarm.note} H{hoveredHarm.degree}</div>
                 <div style={{ fontSize: 12, fontWeight: 700 }}>{hoveredHarm.freq.toFixed(1)} Hz</div>
                 <div style={{ fontSize: 9, color: THEME.textMuted }}>{getClosest12TET(hoveredHarm.freq).name} <span style={{ color: '#fff' }}>{getClosest12TET(hoveredHarm.freq).cents.toFixed(1)}¢</span></div>
               </div>
             )}
          </div>
        </div>

        <PsychoChart title="III. Biological (Bark)" desc="Ear resolution. Clashes occur when Δ < 1.0z." dataKey="bark" />
        <PsychoChart title="IV. Psychological (Mel)" desc="Perceived pitch distance. Bass feels 'wide'." dataKey="mel" />
      </main>
    </div>
  );
}