import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip, Line } from 'recharts';
import { Activity, Layers, AlertTriangle, X, Lightbulb, ExternalLink, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import {
  MIN_F, MAX_F, HARMONIC_COUNT, INTERVALS, INTERVAL_FACTS, NOTE_NAMES,
  midiToFreq, freqToMidi, toBark, toMel, getNoteName, getClosest12TET, getVal, getPct,
  getHarmonicFacts, getInterferenceFacts, getContextualFacts,
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

  const keyboardRef = useRef<HTMLDivElement>(null);
  const [hoveredHarm, setHoveredHarm] = useState<Harmonic | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [harmonicFacts, setHarmonicFacts] = useState<HarmonicFact[]>([]);
  const [harmonicFactIdx, setHarmonicFactIdx] = useState(0);
  const [activeSpectrum, setActiveSpectrum] = useState<SpectrumKey | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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

  // Manual fact index management
  useEffect(() => { setHarmonicFactIdx(0); }, [stDiff, hoveredHarm, highlightedPair]);

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

  // Interference pair facts (when clicking a pill)
  const interferenceFacts = useMemo<HarmonicFact[]>(() => {
    if (!highlightedPair) return [];
    const clash = interferences.find(c => c.h1.id === highlightedPair.id1 && c.h2.id === highlightedPair.id2);
    if (!clash) return [];
    const all = getInterferenceFacts(clash.h1, clash.h2, clash.barkDist, stDiff);
    return activeSpectrum ? all.filter(f => !f.spectrum || f.spectrum === activeSpectrum) : all;
  }, [highlightedPair, interferences, stDiff, activeSpectrum]);

  // Contextual facts about the two notes' relationship
  const contextualFacts = useMemo<HarmonicFact[]>(() => {
    if (stDiff === 0) return [];
    const all = getContextualFacts(harmonicsX, harmonicsY, stDiff, activeSpectrum);
    return activeSpectrum ? all.filter(f => !f.spectrum || f.spectrum === activeSpectrum) : all;
  }, [harmonicsX, harmonicsY, stDiff, activeSpectrum]);

  const currentIntervalName = INTERVALS.find(iv => iv.semi === stDiff)?.full || 'Interval';

  // Combined default facts: interval facts + contextual facts, rotating
  const defaultFacts = useMemo(() => {
    const intervalFacts = (INTERVAL_FACTS[stDiff] || INTERVAL_FACTS[0]).map(text => ({ text, label: currentIntervalName }));
    const ctxFacts = contextualFacts.map(f => ({ text: f.text, label: `${currentIntervalName} — Harmonic Analysis` }));
    return [...intervalFacts, ...ctxFacts];
  }, [stDiff, contextualFacts, currentIntervalName]);

  const activeFacts = useMemo(() => {
    if (hoveredHarm && harmonicFacts.length > 0) return harmonicFacts;
    if (highlightedPair && interferenceFacts.length > 0) return interferenceFacts;
    return defaultFacts;
  }, [hoveredHarm, harmonicFacts, highlightedPair, interferenceFacts, defaultFacts]);

  const currentFactIndex = harmonicFactIdx;

  const nextFact = useCallback(() => {
    setHarmonicFactIdx(prev => (prev + 1) % (activeFacts.length || 1));
  }, [activeFacts]);

  const prevFact = useCallback(() => {
    setHarmonicFactIdx(prev => (prev - 1 + activeFacts.length) % (activeFacts.length || 1));
  }, [activeFacts]);

  useEffect(() => {
    if (!isLocked) {
      setHarmonicFactIdx(0);
    }
  }, [hoveredHarm, highlightedPair, isLocked]);

  const toggleLock = useCallback((h: Harmonic | null) => {
    if (h) {
      setHoveredHarm(h);
      setHoverPct(getPct(h.freq, 'log')); // default to log pct for visual consistency
      setIsLocked(true);
      setHighlightedPair(null); // Priority: Lock tone clears interference selection
    } else {
      setIsLocked(false);
      setHoveredHarm(null);
      setHoverPct(null);
      setActiveSpectrum(null);
    }
  }, []);

  const handleChartClick = useCallback((dataKey: SpectrumKey, e: React.MouseEvent, containerRef: HTMLDivElement | null) => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const minV = getVal(MIN_F, dataKey);
    const maxV = getVal(MAX_F, dataKey);
    const val = frac * (maxV - minV) + minV;
    
    let hz: number;
    if (dataKey === 'hz') hz = val;
    else if (dataKey === 'log') hz = Math.pow(2, val);
    else if (dataKey === 'bark') hz = val * 100;
    else hz = 700 * (Math.pow(10, val / 2595) - 1);

    let closest: Harmonic | null = null;
    let minCents = Infinity;
    activeHarmonics.forEach(h => {
      const cents = Math.abs(1200 * Math.log2(h.freq / hz));
      if (cents < minCents) { minCents = cents; closest = h; }
    });

    if (closest) toggleLock(closest);
  }, [activeHarmonics, toggleLock, isLocked]);

  const handleChartHover = useCallback((dataKey: SpectrumKey, e: React.MouseEvent, containerRef: HTMLDivElement | null) => {
    if (!containerRef || isLocked) return;
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
  }, [activeHarmonics, isLocked]);

  const handleKbClick = useCallback((e: React.MouseEvent) => {
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

    if (closest) toggleLock(closest);
  }, [activeHarmonics, toggleLock, isLocked]);

  const handleKbMove = useCallback((e: React.MouseEvent) => {
    if (!keyboardRef.current || isLocked) return;
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
  }, [activeHarmonics, isLocked]);

  const toggleHighlight = (h1: Harmonic, h2: Harmonic) => {
    if (highlightedPair && highlightedPair.id1 === h1.id && highlightedPair.id2 === h2.id) {
      setHighlightedPair(null);
      setIsLocked(false);
    } else {
      setHighlightedPair({ id1: h1.id, id2: h2.id });
      setIsLocked(true);
      setHoveredHarm(null); // Priority: Locking pair clears tone hover/lock
      setHoverPct(null);
    }
  };

  const ChartTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { hz, bark, mel } = payload[0].payload;
    const tet = getClosest12TET(hz);
    
    // Find if we are close to a harmonic to consolidate tooltips
    const closestHarm = activeHarmonics.find(h => {
      const cents = Math.abs(1200 * Math.log2(h.freq / hz));
      return cents < 50;
    });

    return (
      <div className="rounded border border-border bg-card px-3 py-2 shadow-xl" style={{ pointerEvents: 'none', zIndex: 1000 }}>
        {closestHarm && (
          <div className="mb-2 border-b border-border pb-1.5">
            <div className="font-mono-display text-xs font-black uppercase tracking-tighter" style={{ color: closestHarm.color }}>
              {closestHarm.note} {closestHarm.isFund ? 'Fundamental' : `Harmonic ${closestHarm.degree}`}
            </div>
          </div>
        )}
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
          style={{ cursor: isLocked ? 'default' : 'crosshair' }}
          onMouseMove={(e) => handleChartHover(dataKey, e, chartRef.current)}
          onMouseLeave={() => { if (!isLocked) { setHoveredHarm(null); setActiveSpectrum(null); } }}
          onClick={(e) => handleChartClick(dataKey, e, chartRef.current)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="1 4" stroke={COLOR_BORDER} vertical={false} />
              <XAxis dataKey={dataKey} type="number" domain={[getVal(MIN_F, dataKey), getVal(MAX_F, dataKey)]} padding={{ left: 0, right: 0 }} hide />
              <YAxis hide domain={[0, 100]} />
              <RechartsTooltip 
                content={<ChartTooltipContent />} 
                cursor={{ stroke: COLOR_BORDER }} 
                isAnimationActive={false} 
                allowEscapeViewBox={{ x: true, y: true }} 
                wrapperStyle={{ zIndex: 1000, visibility: isLocked ? 'hidden' : 'visible' }} 
              />
              <Line type="monotone" dataKey="y" stroke="transparent" dot={false} activeDot={{ r: 3, fill: '#fff' }} />
              {activeHarmonics.map(h => {
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                const isHovered = hoveredHarm?.id === h.id;
                const isLockedMatch = isLocked && isHovered;
                return (
                  <ReferenceLine
                    key={h.id}
                    x={getVal(h.freq, dataKey)}
                    stroke={h.color}
                    strokeWidth={isLockedMatch ? 4 : isHovered ? 3 : h.isFund ? 2 : 1}
                    strokeOpacity={isHighlighted ? (h.isFund ? 1 : 0.7) : 0.1}
                    className={isLockedMatch ? 'animate-heartbeat' : ''}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="relative h-full w-full" style={{ padding: '0 8px' }}>
              {activeHarmonics.map(h => {
                const p = getPct(h.freq, dataKey);
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                const isNoteX = h.note === 'X';
                const isVisible = p >= 0 && p <= 100;
                
                return (
                  <div 
                    key={`lbl-${h.id}`} 
                    className={`font-mono-display absolute z-10 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black leading-none text-white shadow-sm transition-opacity`} 
                    style={{ 
                      left: `${p}%`, 
                      top: isNoteX ? 'auto' : '4px',
                      bottom: isNoteX ? '4px' : 'auto',
                      transform: 'translateX(-50%)', 
                      backgroundColor: h.color, 
                      opacity: isVisible ? (isHighlighted ? 1 : 0.1) : 0, 
                      visibility: isVisible ? 'visible' : 'hidden' 
                    }}
                  >
                    {h.isFund ? 'F' : h.degree}
                  </div>
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
        @keyframes heartbeat {
          0% { stroke-opacity: 1; stroke-width: 3; }
          50% { stroke-opacity: 0.4; stroke-width: 5; }
          100% { stroke-opacity: 1; stroke-width: 3; }
        }
        @keyframes glow-pulse {
          0% { opacity: 1; filter: drop-shadow(0 0 2px var(--pulse-color)); }
          50% { opacity: 0.6; filter: drop-shadow(0 0 8px var(--pulse-color)); }
          100% { opacity: 1; filter: drop-shadow(0 0 2px var(--pulse-color)); }
        }
        .animate-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
        .animate-glow-pulse { animation: glow-pulse 1.5s ease-in-out infinite; }
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

        {/* Fun Fact Bar — Unified layout to prevent height shifts */}
        <div className={`mt-2 flex flex-col gap-2 rounded border px-3 py-2 transition-all duration-300 ${isLocked ? 'border-primary/50 bg-primary/[0.07] shadow-sm' : 'border-primary/30 bg-primary/5'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Lightbulb size={15} className={`mt-0.5 shrink-0 ${isLocked ? 'text-primary animate-pulse' : 'text-primary'}`} />
              <div className="min-w-0 flex-1">
                {/* Unified Header & Dashboard */}
                <div className="flex flex-col gap-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      {isLocked ? (
                        <button
                          onClick={() => toggleLock(null)}
                          className="group flex items-center gap-1.5 rounded bg-primary px-2 py-0.5 border border-primary hover:bg-transparent hover:text-primary transition-all duration-200"
                          title="Click to Unlock"
                        >
                          <span className="font-mono-display text-xs md:text-sm font-black text-primary-foreground group-hover:text-primary uppercase tracking-tight">
                            {hoveredHarm ? `${hoveredHarm.note}H${hoveredHarm.degree}` : highlightedPair ? `${highlightedPair.id1} + ${highlightedPair.id2}` : currentIntervalName}
                          </span>
                          <Lock size={12} className="text-primary-foreground group-hover:text-primary animate-pulse" />
                          <span className="font-mono-display text-[9px] font-black uppercase tracking-widest ml-1 opacity-80 group-hover:opacity-100">Locked</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded bg-primary/20 px-2 py-0.5 border border-primary/30">
                          <span className="font-mono-display text-xs md:text-sm font-black text-primary uppercase tracking-tight">
                            {hoveredHarm ? `${hoveredHarm.note}H${hoveredHarm.degree}` : highlightedPair ? `${highlightedPair.id1} + ${highlightedPair.id2}` : currentIntervalName}
                          </span>
                        </div>
                      )}
                    </div>
                  
                  {/* Quad-Spectrum Frequency Dashboard (Unified Style) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-md bg-background/40 border border-border/50 p-2">
                    {hoveredHarm ? (
                      <>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Physical</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{hoveredHarm.freq.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">Hz</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Theoretical</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{getClosest12TET(hoveredHarm.freq).name}<span className="text-[10px] ml-1 opacity-50 font-normal">{getClosest12TET(hoveredHarm.freq).cents > 0 ? '+' : ''}{getClosest12TET(hoveredHarm.freq).cents.toFixed(1)}¢</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Biological</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{toBark(hoveredHarm.freq).toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">z</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Psychological</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{toMel(hoveredHarm.freq).toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">m</span></span>
                        </div>
                      </>
                    ) : highlightedPair ? (
                      <>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Harmonic X</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{activeHarmonics.find(h=>h.id===highlightedPair.id1)?.freq.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">Hz</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Harmonic Y</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{activeHarmonics.find(h=>h.id===highlightedPair.id2)?.freq.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">Hz</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Clash (Bark)</span>
                          <span className="font-mono-display text-xs font-bold text-gold">Δ {Math.abs(toBark(activeHarmonics.find(h=>h.id===highlightedPair.id1)?.freq!) - toBark(activeHarmonics.find(h=>h.id===highlightedPair.id2)?.freq!)).toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">z</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Clash (Mel)</span>
                          <span className="font-mono-display text-xs font-bold text-gold">Δ {Math.abs(toMel(activeHarmonics.find(h=>h.id===highlightedPair.id1)?.freq!) - toMel(activeHarmonics.find(h=>h.id===highlightedPair.id2)?.freq!)).toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">m</span></span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Note X Fund.</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{freqX.toFixed(1)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">Hz</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Theoretical</span>
                          <span className="font-mono-display text-xs font-bold text-foreground">{currentIntervalName}<span className="text-[10px] ml-1 opacity-50 font-normal">+{stDiff}st</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Bark Gap</span>
                          <span className="font-mono-display text-xs font-bold text-primary">Δ {Math.abs(toBark(freqX) - toBark(freqY)).toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">z</span></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[9px] uppercase tracking-tighter text-muted-foreground leading-none mb-1">Mel Distance</span>
                          <span className="font-mono-display text-xs font-bold text-primary">Δ {Math.abs(toMel(freqX) - toMel(freqY)).toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50 font-normal">m</span></span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Fact Text */}
                <p className="text-sm md:text-base leading-snug text-foreground/90 font-medium min-h-[3rem]">
                  {activeFacts[harmonicFactIdx % activeFacts.length]?.text}
                </p>
              </div>
            </div>

            {/* Fact Controls — Always visible if multiple facts exist */}
            {activeFacts.length > 1 && (
              <div className="flex shrink-0 flex-col items-center gap-1.5 min-w-[60px]">
                <div className="flex items-center gap-1.5 rounded bg-primary/10 p-1 border border-primary/20">
                  <button onClick={prevFact} className="rounded p-0.5 hover:bg-primary/20 transition-colors" title="Previous Fact">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono text-[10px] md:text-xs font-bold px-1 tabular-nums text-primary/70">
                    {(harmonicFactIdx % activeFacts.length) + 1} / {activeFacts.length}
                  </span>
                  <button onClick={nextFact} className="rounded p-0.5 hover:bg-primary/20 transition-colors" title="Next Fact">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spectrum Charts */}
        <div className="mt-2">
          <PsychoChart title="I. Physical (Hz)" desc="Absolute air vibration — spacing expands exponentially." dataKey="hz" />
          <PsychoChart title="II. Theoretical (Log)" desc="Music theory view — intervals are spatially fixed." dataKey="log" />

          {/* Keyboard Analysis Dashboard */}
          <div className="mt-4 mb-2 rounded-xl border border-border/60 bg-card/30 p-4 pt-3 shadow-inner">
            <div className="mb-3 flex items-center justify-center">
              <span className="font-mono-display text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/50">Piano Dashboard</span>
            </div>
            
            <div className="relative rounded-md border border-black/40 bg-[#D7C4B1] p-0.5 shadow-2xl transition-all duration-300">
            <div className="relative mb-0.5 h-3 md:h-4 lg:h-5">
              {activeHarmonics.map((h, i) => {
                const isHighlighted = highlightedPair
                  ? (h.id === highlightedPair.id1 || h.id === highlightedPair.id2)
                  : true;
                const isHovered = hoveredHarm?.id === h.id;
                const isLockedMatch = isLocked && isHovered;
                return (
                  <div
                    key={`mk-${h.id}-${i}`}
                    className={`absolute bottom-0 ${isLockedMatch ? 'animate-glow-pulse' : ''}`}
                    style={{
                      left: `${getPct(h.freq, 'log')}%`,
                      width: isLockedMatch ? 4 : (h.isFund ? 3 : 2),
                      height: h.isFund ? '100%' : '50%',
                      background: h.color,
                      transform: 'translateX(-50%)',
                      opacity: isHighlighted ? 1 : 0.1,
                      '--pulse-color': h.color
                    } as any}
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
              onMouseLeave={() => { if (!isLocked) { setHoveredHarm(null); setActiveSpectrum(null); } }}
              onClick={handleKbClick}
              className="relative border border-black/20 h-8 md:h-12 lg:h-16 bg-[#D7C4B1] overflow-hidden"
              style={{ cursor: isLocked ? 'default' : 'crosshair' }}
            >
              {Array.from({ length: 135 - 15 + 1 }).map((_, i) => {
                const m = 15 + i;
                const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
                const f = midiToFreq(m);
                const nextF = midiToFreq(m + 1);
                const left = getPct(f, 'log');
                const right = getPct(nextF, 'log');
                const hMatch = activeHarmonics.find(h => Math.round(freqToMidi(h.freq)) === m);
                const isFund = hMatch?.isFund;
                const isHighlighted = hMatch && (!highlightedPair || hMatch.id === highlightedPair.id1 || hMatch.id === highlightedPair.id2);
                const isLockedMatch = isLocked && hoveredHarm?.id === hMatch?.id;
                
                // Colors from screenshot
                const baseWhite = '#D7C4B1';
                const baseBlack = '#1A1A1A';
                const highlightColor = hMatch?.color || '#FF9F43';
                const noteName = NOTE_NAMES[m % 12];

                return (
                  <div 
                    key={m} 
                    className={`absolute top-0 flex flex-col items-center border-r border-black/20 transition-all duration-200 ${isBlack ? 'z-20 h-[62%]' : 'z-10 h-full'}`} 
                    style={{ 
                      left: `${left}%`, 
                      width: `${right - left}%`,
                      background: isHighlighted ? highlightColor : (isBlack ? baseBlack : baseWhite),
                      borderRadius: isBlack ? '0 0 3px 3px' : '0 0 2px 2px',
                      boxShadow: isBlack 
                        ? `0 3px 6px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(255,255,255,0.05)${isHighlighted ? `, 0 0 12px ${highlightColor}80` : ''}` 
                        : `inset 0 -2px 4px rgba(0,0,0,0.05)${isHighlighted ? `, inset 0 -8px 20px rgba(0,0,0,0.1), 0 0 15px ${highlightColor}60` : ''}`,
                      zIndex: isBlack ? 20 : 10,
                      opacity: isHighlighted ? 1 : (isBlack ? 1 : 0.95)
                    }}
                  >

                    {isLockedMatch && (
                      <div className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-white/40 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Floating tooltip only for keyboard hover (where there is no Recharts scrubber) */}
            {hoveredHarm && hoverPct !== null && !isLocked && !activeSpectrum && (
              <div
                className="pointer-events-none absolute z-50 rounded border bg-card px-3 py-2 shadow-xl"
                style={{ bottom: '100%', left: `${hoverPct}%`, transform: 'translateX(-50%)', borderColor: hoveredHarm.color, marginBottom: 6, whiteSpace: 'nowrap' }}
              >
                <div className="font-mono-display text-[11px] font-extrabold" style={{ color: hoveredHarm.color }}>{hoveredHarm.note} {hoveredHarm.isFund ? 'Fundamental' : `H${hoveredHarm.degree}`}</div>
                <div className="font-mono-display text-sm font-bold text-foreground">{hoveredHarm.freq.toFixed(1)} Hz</div>
                <div className="font-mono-display text-xs text-muted-foreground">{getClosest12TET(hoveredHarm.freq).name} <span className="text-foreground">{getClosest12TET(hoveredHarm.freq).cents.toFixed(1)}¢</span></div>
              </div>
            )}
          </div>
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
