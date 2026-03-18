import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip, Line } from 'recharts';
import { Activity, Layers, AlertTriangle, X, Lightbulb, ExternalLink } from 'lucide-react';
import {
  MIN_F, MAX_F, HARMONIC_COUNT, INTERVALS, INTERVAL_FACTS,
  midiToFreq, freqToMidi, toBark, toMel, getNoteName, getClosest12TET, getVal, getPct,
  getHarmonicFacts,
  type Harmonic, type Interference, type HarmonicFact,
} from '@/lib/frequency-utils';

// HSL values matching CSS vars for inline chart usage
const COLOR_NOTE_X = 'hsl(33, 90%, 55%)';
const COLOR_NOTE_Y = 'hsl(200, 60%, 45%)';
const COLOR_BORDER = 'hsl(0, 0%, 16%)';
const COLOR_TEXT_MUTED = 'hsl(0, 0%, 55%)';
const COLOR_GOLD = 'hsl(45, 100%, 60%)';

type SpectrumKey = 'hz' | 'log' | 'bark' | 'mel';

export default function Index() {
  const [midiX, setMidiX] = useState(69);
  const [stDiff, setStDiff] = useState(7);
  const [showOvertones, setShowOvertones] = useState(true);
  const [highlightedPair, setHighlightedPair] = useState<{ id1: string; id2: string } | null>(null);
  const [factIndex, setFactIndex] = useState(0);

  const keyboardRef = useRef<HTMLDivElement>(null);
  const [hoveredHarm, setHoveredHarm] = useState<Harmonic | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [harmonicFacts, setHarmonicFacts] = useState<HarmonicFact[]>([]);
  const [harmonicFactIdx, setHarmonicFactIdx] = useState(0);
  const [activeSpectrum, setActiveSpectrum] = useState<SpectrumKey | null>(null);

  const midiY = useMemo(() => midiX + stDiff, [midiX, stDiff]);
  const freqX = useMemo(() => midiToFreq(midiX), [midiX]);
  const freqY = useMemo(() => midiToFreq(midiY), [midiY]);

  const harmonicsX = useMemo<Harmonic[]>(() => Array.from({ length: HARMONIC_COUNT }, (_, i) => ({
    id: `X${i + 1}`, note: 'X', degree: i + 1, freq: freqX * (i + 1), color: COLOR_NOTE_X, isFund: i === 0
  })), [freqX]);

  const harmonicsY = useMemo<Harmonic[]>(() => Array.from({ length: HARMONIC_COUNT }, (_, i) => ({
    id: `Y${i + 1}`, note: 'Y', degree: i + 1, freq: freqY * (i + 1), color: COLOR_NOTE_Y, isFund: i === 0
  })), [freqY]);

  const activeHarmonics = useMemo(() => {
    if (!showOvertones) return stDiff === 0 ? [harmonicsX[0]] : [harmonicsX[0], harmonicsY[0]];
    return stDiff === 0 ? harmonicsX : [...harmonicsX, ...harmonicsY];
  }, [showOvertones, stDiff, harmonicsX, harmonicsY]);

  const chartData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const f = MIN_F * Math.pow(MAX_F / MIN_F, i / 120);
      pts.push({ hz: f, log: Math.log2(f), bark: toBark(f), mel: toMel(f), y: 50 });
    }
    return pts;
  }, []);

  const interferences = useMemo<Interference[]>(() => {
    const clashes: Interference[] = [];
    for (let i = 0; i < activeHarmonics.length; i++) {
      for (let j = i + 1; j < activeHarmonics.length; j++) {
        const h1 = activeHarmonics[i];
        const h2 = activeHarmonics[j];
        const hzDiff = Math.abs(h1.freq - h2.freq);
        if (hzDiff < 3) continue;
        const dist = Math.abs(toBark(h1.freq) - toBark(h2.freq));
        // Only show clashes (0.01 < d < 1.0) and avoid perfect resonances
        if (dist >= 0.01 && dist < 1.0) clashes.push({ h1, h2, barkDist: dist });
      }
    }
    return clashes.sort((a, b) => a.barkDist - b.barkDist);
  }, [activeHarmonics]);

  // Rotate interval facts
  useEffect(() => { setFactIndex(0); }, [stDiff]);
  useEffect(() => {
    const facts = INTERVAL_FACTS[stDiff] || INTERVAL_FACTS[0];
    if (facts.length <= 1) return;
    const timer = setInterval(() => setFactIndex(prev => (prev + 1) % facts.length), 8000);
    return () => clearInterval(timer);
  }, [stDiff]);

  // Update harmonic facts when hovered harmonic changes
  useEffect(() => {
    if (!hoveredHarm) { setHarmonicFacts([]); return; }
    const noteName = hoveredHarm.note === 'X' ? getNoteName(midiX) : getNoteName(midiY);
    const allFacts = getHarmonicFacts(hoveredHarm.degree, hoveredHarm.freq, noteName);
    // Filter by active spectrum if set
    const filtered = allFacts.filter(f => !f.spectrum || f.spectrum === activeSpectrum);
    setHarmonicFacts(filtered);
    setHarmonicFactIdx(0);
  }, [hoveredHarm, activeSpectrum, midiX, midiY]);

  const currentFact = (INTERVAL_FACTS[stDiff] || INTERVAL_FACTS[0])[factIndex] || '';
  const currentIntervalName = INTERVALS.find(iv => iv.semi === stDiff)?.full || 'Interval';

  const handleChartHover = useCallback((dataKey: SpectrumKey, e: React.MouseEvent, containerRef: HTMLDivElement | null) => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const minV = getVal(MIN_F, dataKey);
    const maxV = getVal(MAX_F, dataKey);
    const val = frac * (maxV - minV) + minV;
    // Convert back to Hz
    let hz: number;
    if (dataKey === 'hz') hz = val;
    else if (dataKey === 'log') hz = Math.pow(2, val);
    else if (dataKey === 'bark') hz = val * 100; // approximate
    else hz = 700 * (Math.pow(10, val / 2595) - 1); // mel to hz

    let closest: Harmonic | null = null;
    let minCents = Infinity;
    activeHarmonics.forEach(h => {
      const cents = Math.abs(1200 * Math.log2(h.freq / hz));
      if (cents < minCents) { minCents = cents; closest = h; }
    });
    if (minCents < 200 && closest) {
      setHoveredHarm(closest);
      setHoverPct(getPct(closest.freq, dataKey));
      setActiveSpectrum(dataKey);
    } else {
      setHoveredHarm(null);
      setActiveSpectrum(null);
    }
  }, [activeHarmonics]);

  const handleKbMove = useCallback((e: React.MouseEvent) => {
    if (!keyboardRef.current) return;
    const rect = keyboardRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const logF = frac * (Math.log2(MAX_F) - Math.log2(MIN_F)) + Math.log2(MIN_F);
    const f = Math.pow(2, logF);
    let closest: Harmonic | null = null;
    let minCents = Infinity;
    activeHarmonics.forEach(h => {
      const cents = Math.abs(1200 * Math.log2(h.freq / f));
      if (cents < minCents) { minCents = cents; closest = h; }
    });
    if (minCents < 150 && closest) {
      setHoveredHarm(closest);
      setHoverPct(getPct(closest.freq, 'log'));
      setActiveSpectrum('log');
    } else {
      setHoveredHarm(null);
      setActiveSpectrum(null);
    }
  }, [activeHarmonics]);

  const toggleHighlight = (h1: Harmonic, h2: Harmonic) => {
    if (highlightedPair && highlightedPair.id1 === h1.id && highlightedPair.id2 === h2.id) {
      setHighlightedPair(null);
    } else {
      setHighlightedPair({ id1: h1.id, id2: h2.id });
    }
  };

  const ChartTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { hz, bark, mel } = payload[0].payload;
    const tet = getClosest12TET(hz);
    return (
      <div className="rounded border border-border bg-card px-3 py-2 shadow-xl" style={{ pointerEvents: 'none', zIndex: 1000 }}>
        <div className="font-mono-display text-sm md:text-base font-extrabold text-foreground">{hz.toFixed(1)} Hz</div>
        <div className="font-mono-display text-xs md:text-sm text-muted-foreground">{bark.toFixed(2)}z | {mel.toFixed(0)}m</div>
        <div className="mt-1 border-t border-border pt-1 font-mono-display text-xs md:text-sm text-muted-foreground">
          {tet.name} <span className={tet.cents > 0 ? 'text-emerald-400' : 'text-red-400'}>{tet.cents > 0 ? '+' : ''}{tet.cents.toFixed(1)}¢</span>
        </div>
      </div>
    );
  };

  const PsychoChart = ({ title, desc, dataKey }: { title: string; desc: string; dataKey: SpectrumKey }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    return (
      <div className="mb-1.5">
        <div className="mb-0.5 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h3 className="font-mono-display text-xs font-extrabold uppercase tracking-widest text-foreground">{title}</h3>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground uppercase opacity-50">Range: 20Hz - 20kHz</span>
        </div>
        <div
          ref={chartRef}
          className="relative border border-border bg-card h-14 md:h-20 lg:h-24"
          style={{ cursor: 'crosshair' }}
          onMouseMove={(e) => handleChartHover(dataKey, e, chartRef.current)}
          onMouseLeave={() => { setHoveredHarm(null); setActiveSpectrum(null); }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="1 4" stroke={COLOR_BORDER} vertical={false} />
              <XAxis dataKey={dataKey} type="number" domain={[getVal(MIN_F, dataKey), getVal(MAX_F, dataKey)]} hide />
              <YAxis hide domain={[0, 100]} />
              <RechartsTooltip content={<ChartTooltipContent />} cursor={{ stroke: COLOR_BORDER }} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 1000 }} />
              <Line type="monotone" dataKey="y" stroke="transparent" dot={false} activeDot={{ r: 3, fill: '#fff' }} />
              {activeHarmonics.map(h => {
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                const isHovered = hoveredHarm?.id === h.id;
                return (
                  <ReferenceLine
                    key={h.id}
                    x={getVal(h.freq, dataKey)}
                    stroke={h.color}
                    strokeWidth={isHovered ? 3 : h.isFund ? 2 : 1}
                    strokeOpacity={isHighlighted ? (h.isFund ? 1 : 0.7) : 0.1}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="relative h-full w-full" style={{ margin: '0 8px' }}>
              {activeHarmonics.map(h => {
                if (h.isFund) return null;
                const p = getPct(h.freq, dataKey);
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                return (
                  <div key={`lbl-${h.id}`} className="font-mono-display absolute bottom-0 text-[9px] md:text-[10px] lg:text-[11px] font-bold" style={{ left: `${p}%`, transform: 'translateX(-50%)', color: h.color, opacity: isHighlighted ? 0.8 : (p > 100 ? 0 : 0.1), visibility: p > 100 ? 'hidden' : 'visible' }}>H{h.degree}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Custom slider styles */}
      <style>{`
        .fa-slider { -webkit-appearance: none; width: 100%; height: 3px; background: hsl(0,0%,16%); outline: none; border-radius: 2px; }
        .fa-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; cursor: pointer; }
        .slider-x::-webkit-slider-thumb { background: ${COLOR_NOTE_X}; box-shadow: 0 0 8px ${COLOR_NOTE_X}; }
        .slider-y::-webkit-slider-thumb { background: ${COLOR_NOTE_Y}; box-shadow: 0 0 8px ${COLOR_NOTE_Y}; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .interference-pill { transition: all 0.15s ease; cursor: pointer; }
        .interference-pill:hover { filter: brightness(1.3); transform: translateY(-1px); }
        .interference-pill.active { box-shadow: inset 0 0 0 2px hsl(33,90%,55%); }
      `}</style>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src="/images/midlife-muso-logo.webp" alt="Midlife Muso" className="h-8 w-8 rounded" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-display text-sm font-bold tracking-wider text-foreground">FREQUENCY ANALYSER</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>A <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Midlife Muso</a> Tool</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-4">
            <div className="font-mono-display text-xs sm:text-sm font-semibold text-right sm:text-left leading-tight sm:leading-normal">
              <span className="text-note-x block sm:inline">{getNoteName(midiX)} ({freqX.toFixed(1)}Hz)</span>
              <span className="mx-1 sm:mx-2 text-muted-foreground hidden sm:inline">→</span>
              <span className="text-note-y block sm:inline">
                {getNoteName(midiY)} ({freqY.toFixed(1)}Hz)
                {midiY > 108 && <span className="ml-1.5 inline-block rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-bold text-red-400 uppercase">Off-Kb</span>}
              </span>
            </div>
            <div className="hidden items-center gap-3 font-mono-display text-xs font-semibold uppercase lg:flex">
              <span className="text-muted-foreground">Δ</span>
              <span>Hz: <span className="text-gold">{Math.abs(freqX - freqY).toFixed(1)}</span></span>
              <span>Semi: <span className="text-gold">{stDiff}</span></span>
              <span>Bark: <span className="text-gold">{Math.abs(toBark(freqX) - toBark(freqY)).toFixed(2)}z</span></span>
              <span>Mel: <span className="text-gold">{Math.abs(toMel(freqX) - toMel(freqY)).toFixed(0)}m</span></span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-4">
        {/* Controls Row */}
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1.5fr]">
          {/* Tuning */}
          <div className="rounded border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex-1">
                <label className="font-mono-display text-[10px] md:text-xs font-bold uppercase tracking-wider text-note-x block mb-1">Note X</label>
                <div className="flex items-center h-6">
                  <input type="range" min="21" max="108" value={midiX} onChange={(e) => setMidiX(parseInt(e.target.value))} className="fa-slider slider-x" />
                </div>
              </div>
              <div className="flex-1">
                <label className="font-mono-display text-[10px] md:text-xs font-bold uppercase tracking-wider text-note-y block mb-1 sm:text-right">Note Y</label>
                <div className="flex items-center gap-2 h-6">
                  <input type="range" min="21" max="108" value={Math.min(108, midiY)} onChange={(e) => setStDiff(Math.max(0, parseInt(e.target.value) - midiX))} className="fa-slider slider-y flex-1" />
                  {midiY > 108 && <span className="text-[10px] font-bold text-red-500 uppercase shrink-0 leading-none">+{midiY - 108}</span>}
                </div>
              </div>
              <button
                onClick={() => setShowOvertones(!showOvertones)}
                title={showOvertones ? "Hide Overtones" : "Show Overtones"}
                className={`flex h-8 w-8 items-center justify-center rounded border border-border transition-colors md:h-9 md:w-9 ${showOvertones ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground'}`}
              >
                <Layers size={15} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 md:gap-1.5">
              {INTERVALS.map(iv => (
                <button
                  key={iv.name}
                  onClick={() => setStDiff(iv.semi)}
                  className={`font-mono-display min-w-[28px] flex-1 rounded-sm border border-border px-1.5 py-1 text-[11px] md:text-xs font-semibold transition-colors ${stDiff === iv.semi ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  {iv.name}
                </button>
              ))}
            </div>
          </div>

          {/* Interference Engine */}
          <div className="rounded border border-border bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-gold" />
                <span className="font-mono-display text-[11px] md:text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Interference Engine</span>
              </div>
              {highlightedPair && (
                <button onClick={() => setHighlightedPair(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <div className="scrollbar-hide flex max-h-16 md:max-h-32 flex-wrap gap-1.5 overflow-y-auto w-full p-1 -m-1">
              {interferences.length === 0 ? (
                <div className="text-xs italic text-muted-foreground opacity-50">Timbres perfectly resolved.</div>
              ) : (
                interferences.map((c, i) => {
                  const isActive = highlightedPair && highlightedPair.id1 === c.h1.id && highlightedPair.id2 === c.h2.id;
                  return (
                    <div
                      key={i}
                      onClick={() => toggleHighlight(c.h1, c.h2)}
                      className={`interference-pill flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono-display text-[11px] md:text-xs ${isActive ? 'active' : ''}`}
                    >
                      <span className="font-extrabold" style={{ color: c.h1.color }}>{c.h1.note}{c.h1.degree}</span>
                      <span className="text-muted-foreground">+</span>
                      <span className="font-extrabold" style={{ color: c.h2.color }}>{c.h2.note}{c.h2.degree}</span>
                      <span className={c.barkDist < 0.3 ? 'text-red-400' : 'text-gold'}>Δ{c.barkDist.toFixed(2)}z</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Fun Fact Bar — shows harmonic fact if hovering, otherwise interval fact */}
        <div className="mt-2 flex items-start gap-2.5 rounded border border-primary/30 bg-primary/5 px-3 py-2">
          <Lightbulb size={15} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0">
            {hoveredHarm && harmonicFacts.length > 0 ? (
              <>
                <span className="font-mono-display text-[11px] md:text-xs font-bold uppercase tracking-wider text-primary">
                  {hoveredHarm.note === 'X' ? getNoteName(midiX) : getNoteName(midiY)} — H{hoveredHarm.degree} ({hoveredHarm.freq.toFixed(1)} Hz)
                  {activeSpectrum && <span className="ml-2 text-muted-foreground">on {activeSpectrum.toUpperCase()} scale</span>}
                </span>
                <p className="mt-0.5 text-sm md:text-base leading-snug text-foreground/80">{harmonicFacts[harmonicFactIdx % harmonicFacts.length]?.text}</p>
              </>
            ) : (
              <>
                <span className="font-mono-display text-[11px] md:text-xs font-bold uppercase tracking-wider text-primary">{currentIntervalName}</span>
                <p className="mt-0.5 text-sm md:text-base leading-snug text-foreground/80">{currentFact}</p>
              </>
            )}
          </div>
        </div>

        {/* Spectrum Charts */}
        <div className="mt-2">
          <PsychoChart title="I. Physical (Hz)" desc="Absolute air vibration — spacing expands exponentially." dataKey="hz" />
          <PsychoChart title="II. Theoretical (Log)" desc="Music theory view — intervals are spatially fixed." dataKey="log" />

          {/* Keyboard */}
          <div className="relative mb-1.5 rounded border border-border bg-card p-2">
            <div className="relative mb-0.5 h-3 md:h-4 lg:h-5">
              {activeHarmonics.map((h, i) => {
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                return (
                  <div
                    key={`mk-${h.id}-${i}`}
                    className="absolute bottom-0"
                    style={{
                      left: `${getPct(h.freq, 'log')}%`,
                      width: h.isFund ? 3 : 2,
                      height: h.isFund ? '100%' : '50%',
                      background: h.color,
                      transform: 'translateX(-50%)',
                      opacity: isHighlighted ? 1 : 0.1
                    }}
                  />
                );
              })}
              {activeHarmonics.some(h => freqToMidi(h.freq) > 108.5) && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500/40 pointer-events-none z-10" />
              )}
            </div>
            <div
              ref={keyboardRef}
              onMouseMove={handleKbMove}
              onMouseLeave={() => { setHoveredHarm(null); setActiveSpectrum(null); }}
              className="relative flex overflow-hidden border border-border h-8 md:h-12 lg:h-16"
              style={{ cursor: 'crosshair' }}
            >
              {Array.from({ length: 72 }).map((_, i) => {
                const m = 36 + i;
                const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
                const isLast = i === 71;
                return (
                  <div key={m} className="relative flex flex-1 items-end justify-center" style={{ background: 'hsl(0, 0%, 88%)', borderRight: '1px solid hsl(0, 0%, 72%)' }}>
                    {isBlack && <div className="absolute left-0 right-0 top-0 z-[2]" style={{ height: '60%', background: 'hsl(0, 0%, 10%)' }} />}
                    {isLast && activeHarmonics.some(h => freqToMidi(h.freq) > 108.5) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 pointer-events-none">
                        <span className="font-mono-display text-[8px] md:text-[9px] font-black text-red-500/60 rotate-90 uppercase leading-none tracking-tighter">OFF-RANGE</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hoveredHarm && hoverPct !== null && (
              <div
                className="pointer-events-none absolute z-50 rounded border bg-card px-3 py-2 shadow-xl"
                style={{ bottom: '100%', left: `${hoverPct}%`, transform: 'translateX(-50%)', borderColor: hoveredHarm.color, marginBottom: 6, whiteSpace: 'nowrap' }}
              >
                <div className="font-mono-display text-[11px] font-extrabold" style={{ color: hoveredHarm.color }}>{hoveredHarm.note} H{hoveredHarm.degree}</div>
                <div className="font-mono-display text-sm font-bold text-foreground">{hoveredHarm.freq.toFixed(1)} Hz</div>
                <div className="font-mono-display text-xs text-muted-foreground">{getClosest12TET(hoveredHarm.freq).name} <span className="text-foreground">{getClosest12TET(hoveredHarm.freq).cents.toFixed(1)}¢</span></div>
              </div>
            )}
          </div>

          <PsychoChart title="III. Biological (Bark)" desc="Ear resolution — clashes occur when Δ < 1.0z." dataKey="bark" />
          <PsychoChart title="IV. Psychological (Mel)" desc="Perceived pitch distance — bass feels 'wide'." dataKey="mel" />
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-center gap-4 border-t border-border pt-3">
          <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <img src="/images/midlife-muso-logo.webp" alt="Midlife Muso" className="h-5 w-5 rounded" />
            midlifemuso.com
            <ExternalLink size={10} />
          </a>
          <a href="https://midlifemuso.com/learning" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Learning
          </a>
          <a href="https://midlifemuso.com/apps" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Apps
          </a>
          <a href="https://midlifemuso.com/about-me" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            About
          </a>
        </div>
      </div>
    </div>
  );
}
