import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Line } from 'recharts';
import { Waves, AlertTriangle, X, Lightbulb, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MIN_F, MAX_F, HARMONIC_COUNT, INTERVALS, INTERVAL_FACTS,
  midiToFreq, freqToMidi, toBark, toMel, getNoteName, getClosest12TET, getVal, getPct,
  getHarmonicFacts, getContextualFacts, getInterferenceFacts, getAmbientFacts, getCulturalFacts, TUNING_SYSTEMS, generateTuningFrequencies,
  type Harmonic, type Interference, type TuningSystem
} from '@/lib/frequency-utils';

type SpectrumKey = 'hz' | 'log' | 'cultural' | 'bark' | 'mel';

// HSL values matching CSS vars for inline chart usage
const COLOR_NOTE_X = 'hsl(33, 90%, 55%)';
const COLOR_NOTE_Y = 'hsl(200, 60%, 45%)';
const COLOR_BORDER = 'hsl(0, 0%, 16%)';
const COLOR_LOCKED = 'hsl(142, 70%, 55%)';

export default function Index() {
  const [tuningId, setTuningId] = useState<string>('12tet');
  const tuning = useMemo(() => TUNING_SYSTEMS[tuningId] || TUNING_SYSTEMS['12tet'], [tuningId]);

  // Anchor on standard C4 = 261.625565 Hz
  const gridFreqs = useMemo(() => generateTuningFrequencies(tuning, 261.625565), [tuning]);

  const defaultRootIndex = useMemo(() => {
    let best = 0; let minDist = Infinity;
    gridFreqs.forEach((g, i) => { const dist = Math.abs(g.freq - 440); if (dist < minDist) { minDist = dist; best = i; } });
    return best;
  }, [gridFreqs]);

  const [rootIndex, setRootIndex] = useState<number>(defaultRootIndex);
  const [intervalDegree, setIntervalDegree] = useState<number>(0);
  const [showOvertones, setShowOvertones] = useState(false);
  const [highlightedPair, setHighlightedPair] = useState<{ id1: string; id2: string } | null>(null);

  useEffect(() => {
    if (gridFreqs.length === 0) return;
    setRootIndex(prev => Math.min(Math.max(0, prev), gridFreqs.length - 1 - tuning.tones.length));
    setIntervalDegree(prev => Math.min(Math.max(0, prev), tuning.tones.length));
  }, [gridFreqs, tuning]);

  const keyboardRef = useRef<HTMLDivElement>(null);
  const [hoveredHarm, setHoveredHarm] = useState<Harmonic | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [activeSpectrum, setActiveSpectrum] = useState<SpectrumKey | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const freqX = useMemo(() => gridFreqs[rootIndex]?.freq || 440, [gridFreqs, rootIndex]);
  const targetIndex = Math.min(rootIndex + intervalDegree, gridFreqs.length - 1);
  const freqY = useMemo(() => gridFreqs[targetIndex]?.freq || 440, [gridFreqs, targetIndex, intervalDegree]);

  const centsDiff = useMemo(() => 1200 * Math.log2(freqY / freqX), [freqX, freqY]);
  const stDiff = Math.round(centsDiff / 100);
  const midiX = useMemo(() => freqToMidi(freqX), [freqX]);
  const midiY = useMemo(() => freqToMidi(freqY), [freqY]);

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
        if (dist >= 0.01 && dist < 1.0) clashes.push({ h1, h2, barkDist: dist });
      }
    }
    return clashes.sort((a, b) => a.barkDist - b.barkDist);
  }, [activeHarmonics]);

  const toggleHighlight = (h1: Harmonic, h2: Harmonic) => {
    if (highlightedPair && highlightedPair.id1 === h1.id && highlightedPair.id2 === h2.id) {
      setHighlightedPair(null);
      setIsLocked(false);
    } else {
      setHighlightedPair({ id1: h1.id, id2: h2.id });
      setIsLocked(true);
      setHoveredHarm(null); // Mutually exclusive
      setHoverPct(null);
    }
  };

  const clearAnalysis = useCallback(() => {
    setIsLocked(false);
    setHoveredHarm(null);
    setHoverPct(null);
    setHighlightedPair(null);
    setActiveSpectrum(null);
  }, []);

  const toggleLock = useCallback((h: Harmonic | null) => {
    if (h) {
      if (isLocked && hoveredHarm?.id === h.id) {
        setIsLocked(false);
        setHoveredHarm(null);
        setHoverPct(null);
      } else {
        setHoveredHarm(h);
        setHoverPct(getPct(h.freq, 'log'));
        setIsLocked(true);
        setHighlightedPair(null); // Mutually exclusive
      }
    } else {
      setIsLocked(false);
      setHoveredHarm(null);
      setHoverPct(null);
      setActiveSpectrum(null);
      setHighlightedPair(null);
    }
  }, [isLocked, hoveredHarm]);

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
  }, [activeHarmonics, toggleLock]);

  const handleChartHover = useCallback((dataKey: SpectrumKey, e: React.MouseEvent, containerRef: HTMLDivElement | null) => {
    if (!containerRef || isLocked) return;
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
  }, [activeHarmonics, toggleLock]);

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

  return (
    <div className="min-h-screen bg-background text-foreground text-sm selection:bg-primary/20">
      <style>{`
        .fa-slider { -webkit-appearance: none; width: 100%; height: 3px; background: hsl(0,0%,16%); outline: none; border-radius: 2px; }
        .fa-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; cursor: pointer; transition: transform 0.1s ease; }
        .fa-slider::-webkit-slider-thumb:hover { transform: scale(1.25); }
        .slider-x::-webkit-slider-thumb { background: ${COLOR_NOTE_X}; box-shadow: 0 0 10px ${COLOR_NOTE_X}40; border: 2px solid white; }
        .slider-y::-webkit-slider-thumb { background: ${COLOR_NOTE_Y}; box-shadow: 0 0 10px ${COLOR_NOTE_Y}40; border: 2px solid white; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .interference-pill { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
        .interference-pill:hover { filter: brightness(1.1); transform: translateY(-2px); }
        .interference-pill.active { border-color: ${COLOR_LOCKED}; background: hsla(142, 70%, 55%, 0.1); box-shadow: 0 4px 12px hsla(142, 70%, 55%, 0.15); }
        @keyframes heartbeat {
          0% { stroke-opacity: 1; stroke-width: 3; filter: drop-shadow(0 0 2px ${COLOR_LOCKED}); }
          50% { stroke-opacity: 0.5; stroke-width: 6; filter: drop-shadow(0 0 8px ${COLOR_LOCKED}); }
          100% { stroke-opacity: 1; stroke-width: 3; filter: drop-shadow(0 0 2px ${COLOR_LOCKED}); }
        }
        .animate-heartbeat { animation: heartbeat 2s ease-in-out infinite; }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:opacity-80 transition-all hover:scale-105 active:scale-95">
              <img src="/images/midlife-muso-logo.webp" alt="Midlife Muso" className="h-9 w-9 rounded-lg shadow-md border border-border/20" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-display text-base font-black tracking-widest text-foreground">FREQUENCY PERCEPTION</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
                <span>A <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline hover:text-white transition-colors">Midlife Muso</a> Tool</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-4 bg-card/40 px-3 py-1.5 rounded-xl border border-border/50 shadow-inner">
            {isLocked && (
              <button
                onClick={clearAnalysis}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm group whitespace-nowrap"
                title="Clear Analysis"
              >
                <X size={12} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                <span className="opacity-90">
                  {hoveredHarm
                    ? `Locked: ${hoveredHarm.freq.toFixed(1)}Hz (${getNoteName(freqToMidi(hoveredHarm.freq))})`
                    : highlightedPair
                      ? `Locked: ${highlightedPair.id1} × ${highlightedPair.id2}`
                      : 'Locked'}
                </span>
              </button>
            )}

            {(isLocked) && <div className="h-4 w-[1px] bg-border/40 hidden sm:block"></div>}

            <div className="font-mono-display text-xs sm:text-sm font-black text-right sm:text-left leading-tight tracking-tight my-auto">
              <span className="text-note-x block sm:inline drop-shadow-sm">{freqX.toFixed(1)}Hz <span className="text-muted-foreground font-normal opacity-50 ml-1 tracking-normal">({tuning.layout === '12-tone' ? getNoteName(Math.round(midiX)) : `Step ${gridFreqs[rootIndex]?.degree}`})</span></span>
              <span className="mx-1 sm:mx-3 text-muted-foreground/30 hidden sm:inline">/</span>
              <span className="text-note-y block sm:inline drop-shadow-sm">
                {freqY.toFixed(1)}Hz <span className="text-muted-foreground font-normal opacity-50 ml-1 tracking-normal">({tuning.layout === '12-tone' ? getNoteName(Math.round(midiY)) : `Step ${gridFreqs[targetIndex]?.degree}`})</span>
              </span>
            </div>

            <div className="h-4 w-[1px] bg-border/50 hidden sm:block"></div>

            <button
              onClick={() => setShowOvertones(!showOvertones)}
              title={showOvertones ? "Hide Overtones" : "Show Overtones"}
              className={`flex h-7 w-7 items-center justify-center rounded border transition-colors ${showOvertones ? 'bg-slate-700 border-slate-600 text-white shadow-sm' : 'bg-transparent border-border text-muted-foreground hover:bg-muted'}`}
            >
              <Waves size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4">
        <PsychoChart
          title="I. Physical (Hz)"
          shortDesc="Absolute air vibration; spacing expands exponentially."
          longDesc="This is the raw mechanical reality of sound: molecules being pushed and pulled through air at specific rates. The exponential spacing you see here mirrors how instruments actually behave in the physical world. The length of a vibrating string — or the volume of air inside a bell — does not scale linearly with the pitch we hear. To double a string's pitch, you halve its length. Each octave packs double the frequency range of the one below it. A grand piano stretches from 27 Hz to 4,186 Hz, yet no octave 'feels' wider than any other. This layer reveals the raw disproportion between physical cause and perceived effect."
          dataKey="hz"
          activeHarmonics={activeHarmonics}
          harmonicsX={harmonicsX}
          harmonicsY={harmonicsY}
          stDiff={stDiff}
          midiX={midiX}
          midiY={midiY}
          hoveredHarm={hoveredHarm}
          highlightedPair={highlightedPair}
          isLocked={isLocked}
          chartData={chartData}
          setActiveSpectrum={setActiveSpectrum}
          handleChartHover={handleChartHover}
          handleChartClick={handleChartClick}
          freqX={freqX}
          freqY={freqY}
        />
        <PsychoChart
          title="II. Theoretical (Log)"
          shortDesc="Music theory view; intervals are spatially fixed."
          longDesc="Compress the exponential Hz axis logarithmically and something remarkable happens: the intervals lock into a consistent geometry. Every octave becomes the same width, every perfect fifth the same span. This is the layer music theory lives in — the one that makes notation, scales, and harmony feel stable and predictable regardless of register. It's the mathematical translation between physical reality and musical thought, the grid that makes composition possible."
          dataKey="log"
          activeHarmonics={activeHarmonics}
          harmonicsX={harmonicsX}
          harmonicsY={harmonicsY}
          stDiff={stDiff}
          midiX={midiX}
          midiY={midiY}
          hoveredHarm={hoveredHarm}
          highlightedPair={highlightedPair}
          isLocked={isLocked}
          chartData={chartData}
          setActiveSpectrum={setActiveSpectrum}
          handleChartHover={handleChartHover}
          handleChartClick={handleChartClick}
          freqX={freqX}
          freqY={freqY}
        />

        {/* III. Cultural (Tuning) */}
        <div className="mb-4 border-b border-border/20 pb-4 last:border-0">
          <div className="mb-2">
            <p className="text-xs font-bold text-foreground leading-tight">
              <span className="uppercase tracking-[0.2em] opacity-80 mr-3 text-primary">III. Cultural (Tuning)</span>
              Discrete note selection; dividing the continuum into musical steps.
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/85 leading-relaxed max-w-none">
              While physics provides an infinite spectrum of frequencies and theory anchors them logarithmically, human cultures must slice this continuum into a finite set of playable notes. This is the Cultural Tuning layer. A tuning system is a negotiated compromise: it sacrifices perfect mathematical resonance for the ability to build physical instruments, compose easily, and create predictable harmony. Equal temperament forces artificial symmetry onto nature's overtone series, while other global traditions derive intricate microtonal steps from pure geometric ratios. It is here that raw acoustic vibration is fundamentally shaped into the specific tonal palettes that define our diverse musical languages.
            </p>
          </div>

          <div
            className="mb-2 rounded-xl border border-border/60 bg-card/30 p-3 pt-2 shadow-inner"
            onMouseEnter={() => setActiveSpectrum('cultural')}
            onMouseLeave={() => { if (!isLocked) setActiveSpectrum(null); }}
          >
            <div className="mb-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-mono-display text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/40">Tuning Grid</span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <select
                  className="bg-card border border-border text-xs rounded px-2 py-1.5 font-mono shadow-sm"
                  value={tuningId}
                  onChange={(e) => setTuningId(e.target.value)}
                  title="Select Cultural Tuning System"
                >
                  {Object.values(TUNING_SYSTEMS).map(sys => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase font-bold w-12 text-right">Root</span>
                  <input type="range" className="fa-slider w-24 slider-x" min="0" max={gridFreqs.length - 1 - tuning.tones.length} value={rootIndex} onChange={(e) => setRootIndex(parseInt(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 bg-background/50 px-2 py-1 rounded border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase font-bold w-16 text-right">Interval</span>
                  <input type="range" className="fa-slider w-24 slider-y" min="0" max={tuning.tones.length * 2} value={intervalDegree} onChange={(e) => setIntervalDegree(parseInt(e.target.value))} />
                </div>
              </div>
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
                      } as any}
                    />
                  );
                })}
              </div>
              <div
                ref={keyboardRef}
                onMouseMove={handleKbMove}
                onMouseLeave={() => { if (!isLocked) { setHoveredHarm(null); setActiveSpectrum(null); } }}
                onClick={handleKbClick}
                className="relative border border-black/20 h-8 md:h-12 lg:h-16 bg-[#D7C4B1] overflow-hidden"
                style={{ cursor: isLocked ? 'default' : 'crosshair' }}
              >
                {tuning.layout === '12-tone' ? (
                  Array.from({ length: 135 - 15 + 1 }).map((_, i) => {
                    const m = 15 + i;
                    const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
                    const f = midiToFreq(m);
                    const nextF = midiToFreq(m + 1);
                    const left = getPct(f, 'log');
                    const right = getPct(nextF, 'log');
                    const hMatch = activeHarmonics.find(h => Math.round(freqToMidi(h.freq)) === m);
                    const isHighlighted = hMatch && (!highlightedPair || hMatch.id === highlightedPair.id1 || hMatch.id === highlightedPair.id2);
                    const isLockedMatch = isLocked && hoveredHarm?.id === hMatch?.id;

                    const baseWhite = '#D7C4B1';
                    const baseBlack = '#1A1A1A';
                    const highlightColor = isLockedMatch ? COLOR_LOCKED : (hMatch?.color || '#FF9F43');

                    return (
                      <div
                        key={`piano-${m}`}
                        className={`absolute top-0 flex flex-col items-center border-r border-black/20 transition-all duration-200 ${isBlack ? 'z-20 h-[62%]' : 'z-10 h-full'}`}
                        style={{
                          left: `${left}%`,
                          width: `${right - left}%`,
                          background: isHighlighted ? highlightColor : (isBlack ? baseBlack : baseWhite),
                          borderRadius: isBlack ? '0 0 3px 3px' : '0 0 2px 2px',
                          zIndex: isBlack ? 20 : 10,
                          opacity: isHighlighted ? 1 : (isBlack ? 1 : 0.95)
                        }}
                      />
                    );
                  })
                ) : (
                  gridFreqs.map((g, i) => {
                    const left = getPct(g.freq, 'log');
                    if (left < 0 || left > 100) return null;
                    const hMatch = activeHarmonics.find(h => Math.abs(1200 * Math.log2(h.freq / g.freq)) < 15);
                    const isHighlighted = hMatch && (!highlightedPair || hMatch.id === highlightedPair.id1 || hMatch.id === highlightedPair.id2);
                    const isLockedMatch = isLocked && hoveredHarm?.id === hMatch?.id;
                    const hue = (g.degree * (360 / tuning.tones.length)) % 360;
                    const baseColor = `hsl(${hue}, 40%, 40%)`;
                    const highlightColor = isLockedMatch ? COLOR_LOCKED : (hMatch?.color || `hsl(${hue}, 80%, 60%)`);

                    return (
                      <div
                        key={`grid-${i}`}
                        className="absolute top-1/2 flex items-center justify-center rounded-full border border-black/40 transition-all duration-200"
                        style={{
                          left: `${left}%`,
                          width: isHighlighted ? '14px' : '8px',
                          height: isHighlighted ? '14px' : '8px',
                          transform: 'translate(-50%, -50%)',
                          background: isHighlighted ? highlightColor : baseColor,
                          zIndex: isHighlighted ? 20 : 10
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-1 text-center text-xs text-muted-foreground/80 font-mono flex items-center justify-center gap-3">
              <span>
                {intervalDegree > 0 && intervalDegree % tuning.tones.length === 0
                  ? (intervalDegree === tuning.tones.length ? 'Octave' : `${intervalDegree / tuning.tones.length} Octaves`)
                  : tuning.tones[intervalDegree % tuning.tones.length]?.name} ({intervalDegree} steps)
              </span>
              {tuning.tones[intervalDegree % tuning.tones.length]?.ratioStr && (
                <><span className="text-border">|</span><span>Pure Ratio: {tuning.tones[intervalDegree % tuning.tones.length].ratioStr}</span></>
              )}
            </div>

            <div className="mt-4 flex flex-col xl:flex-row gap-4 items-stretch">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#10B981]" />
                  <span className="font-mono-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historical Context</span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed italic">{tuning.history}</p>
              </div>
              <div className="w-full xl:w-80 shrink-0 flex flex-col justify-center">
                <div className="rounded-xl border border-[#10B981]/25 bg-[#10B981]/5 p-4 relative overflow-hidden shadow-xl ring-1 ring-[#10B981]/10 min-h-[100px] flex flex-col justify-between">
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#10B981]/60 to-[#059669]/60" />
                  <div>
                    <div className="flex items-center gap-2.5 mb-2 border-b border-[#10B981]/10 pb-2">
                      <div className="p-1.5 rounded-lg bg-[#10B981]/15 shadow-sm ring-1 ring-[#10B981]/20">
                        <Lightbulb size={14} className="text-[#059669]" />
                      </div>
                      <span className="font-mono-display text-[10px] font-black uppercase tracking-[0.25em] text-[#059669]/80">Phase III Insight</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/95 font-medium italic">
                      {(INTERVAL_FACTS[stDiff]?.find((f: any) => f.spectrum === 'cultural')?.text) || getCulturalFacts(tuning, intervalDegree)[0]?.text || "Explore how different cultures slice the continuum of sound into discrete steps..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PsychoChart
          title="IV. Biological (Bark)"
          shortDesc="Ear resolution; clashes occur when Δ < 1.0z."
          longDesc="The cochlea divides the audible range into overlapping critical bands — the Bark scale maps these — and within each band, sounds compete for the same hair cells. When two frequencies land within a single critical band (Δ < 1.0z), the ear cannot fully resolve them and perceives roughness or beating. The bands are not uniform across the spectrum: they are wider in the bass, which is why low-register clusters sound muddy even across large interval gaps. At high frequencies the bands narrow in absolute Hz terms but cover more semitones, meaning intervals that feel spacious and distinct in the midrange begin to blur and merge in the upper register — a cluster of high harmonics can become perceptually fused into a single bright texture rather than a set of discrete pitches."
          dataKey="bark"
          activeHarmonics={activeHarmonics}
          harmonicsX={harmonicsX}
          harmonicsY={harmonicsY}
          stDiff={stDiff}
          midiX={midiX}
          midiY={midiY}
          hoveredHarm={hoveredHarm}
          highlightedPair={highlightedPair}
          isLocked={isLocked}
          chartData={chartData}
          setActiveSpectrum={setActiveSpectrum}
          handleChartHover={handleChartHover}
          handleChartClick={handleChartClick}
        />

        {/* Dissonance Detector */}
        <div className="rounded-xl border border-red-500/20 bg-card p-3 my-4 shadow-inner relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-orange-400 to-red-500" />
          <div className="mb-2 flex items-center justify-between pl-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="font-mono-display text-sm font-black uppercase tracking-widest text-muted-foreground/80">Dissonance Detector</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 p-2 bg-background/50 rounded-xl min-h-[60px]">
            {interferences.length === 0 ? (
              <div className="text-xs italic text-muted-foreground/60 w-full text-center py-4">Timbres perfectly resolved — no mask-band interference.</div>
            ) : (
              interferences.map((c, i) => (
                <div
                  key={i}
                  onClick={() => toggleHighlight(c.h1, c.h2)}
                  className={`interference-pill flex items-center gap-3 rounded-full border border-border/50 bg-card/80 px-4 py-1.5 font-mono-display text-[11px] shadow-sm ${highlightedPair?.id1 === c.h1.id && highlightedPair?.id2 === c.h2.id ? 'active' : ''}`}
                >
                  <span className="font-black" style={{ color: c.h1.color }}>{c.h1.note}{c.h1.degree}</span>
                  <span className="text-muted-foreground/30">✕</span>
                  <span className="font-black" style={{ color: c.h2.color }}>{c.h2.note}{c.h2.degree}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${c.barkDist < 0.3 ? 'bg-red-500/20 text-red-500' : 'bg-gold/20 text-gold shadow-sm shadow-gold/20'}`}>Δ{c.barkDist.toFixed(2)}z</span>
                </div>
              ))
            )}
          </div>
        </div>

        <PsychoChart
          title="V. Psychological (Mel)"
          shortDesc="Perceived pitch distance — bass feels 'wide'."
          longDesc="Even after the cochlea processes sound, the brain further warps what we consciously hear. The Mel scale captures this perceptual stretching: equal steps in Mel feel equally spaced in pitch to the listener, yet the underlying frequency differences are vastly unequal. Low notes feel far apart even when their Hz difference is modest; high notes feel compressed even when the Hz gap is large. This is why a bass line feels spacious and grounded, and why a cluster of high harmonics can feel tight and bright. It's the final transformation from signal to sensation — the subjective experience of pitch distance that composers intuitively exploit."
          dataKey="mel"
          activeHarmonics={activeHarmonics}
          harmonicsX={harmonicsX}
          harmonicsY={harmonicsY}
          stDiff={stDiff}
          midiX={midiX}
          midiY={midiY}
          hoveredHarm={hoveredHarm}
          highlightedPair={highlightedPair}
          isLocked={isLocked}
          chartData={chartData}
          setActiveSpectrum={setActiveSpectrum}
          handleChartHover={handleChartHover}
          handleChartClick={handleChartClick}
        />

        <footer className="mt-6 flex items-center justify-center gap-6 border-t border-border/40 pt-4">
          <a href="https://midlifemuso.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-all hover:scale-105">
            <img src="/images/midlife-muso-logo.webp" alt="Midlife Muso" className="h-5 w-5 rounded shadow-sm" />
            midlifemuso.com
            <ExternalLink size={10} />
          </a>
        </footer>
      </div>
    </div>
  );
}

// Reusable Presentation Components
interface PsychoChartProps {
  title: string;
  shortDesc: string;
  longDesc: string;
  dataKey: SpectrumKey;
  activeHarmonics: Harmonic[];
  harmonicsX: Harmonic[];
  harmonicsY: Harmonic[];
  stDiff: number;
  midiX: number;
  midiY: number;
  freqX: number;
  freqY: number;
  hoveredHarm: Harmonic | null;
  highlightedPair: { id1: string; id2: string } | null;
  isLocked: boolean;
  chartData: any[];
  setActiveSpectrum: (s: SpectrumKey | null) => void;
  handleChartHover: (key: SpectrumKey, e: any, container: HTMLDivElement | null) => void;
  handleChartClick: (key: SpectrumKey, e: any, container: HTMLDivElement | null) => void;
}

const PsychoChart = ({
  title, shortDesc, longDesc, dataKey,
  activeHarmonics, harmonicsX, harmonicsY, stDiff, midiX, midiY, freqX, freqY,
  hoveredHarm, highlightedPair, isLocked, chartData,
  setActiveSpectrum, handleChartHover, handleChartClick
}: PsychoChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [factIdx, setFactIdx] = useState(0);
  const [scrubPct, setScrubPct] = useState<number | null>(null);

  const localHandleHover = (e: React.MouseEvent) => {
    if (!containerRef.current || isLocked) return;
    const rect = containerRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubPct(frac * 100);
    handleChartHover(dataKey, e, containerRef.current);
  };

  const localHandleMouseLeave = () => {
    setScrubPct(null);
    if (!isLocked) setActiveSpectrum(null);
  };

  const scrubHz = useMemo(() => {
    if (scrubPct === null) return null;
    const minV = getVal(MIN_F, dataKey);
    const maxV = getVal(MAX_F, dataKey);
    const val = (scrubPct / 100) * (maxV - minV) + minV;
    if (dataKey === 'hz') return val;
    if (dataKey === 'log') return Math.pow(2, val);
    if (dataKey === 'bark') return val * 100;
    return 700 * (Math.pow(10, val / 2595) - 1);
  }, [scrubPct, dataKey]);

  const phaseFacts = useMemo(() => {
    const hits = [];
    const rawIv = INTERVAL_FACTS[stDiff] || INTERVAL_FACTS[0];
    hits.push(...rawIv.filter(f => f.spectrum === dataKey));

    const ctx = getContextualFacts(harmonicsX, harmonicsY, stDiff, dataKey);
    hits.push(...ctx.filter(f => f.spectrum === dataKey));

    if (hoveredHarm) {
      const noteName = hoveredHarm.note === 'X' ? getNoteName(midiX) : getNoteName(midiY);
      hits.push(...getHarmonicFacts(hoveredHarm.degree, hoveredHarm.freq, noteName).filter(f => f.spectrum === dataKey));
    }
    return hits;
  }, [stDiff, dataKey, hoveredHarm, harmonicsX, harmonicsY, midiX, midiY]);

  useEffect(() => setFactIdx(0), [stDiff, hoveredHarm]);

  return (
    <div
      className="relative mb-4 last:mb-0 transition-all duration-300 hover:z-20 group border-b border-border/20 pb-4 last:border-0 pt-4"
      onMouseEnter={() => setActiveSpectrum(dataKey)}
      onMouseLeave={localHandleMouseLeave}
    >
      <div className="flex flex-col xl:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <p className="text-xs font-bold text-foreground leading-tight">
              <span className="uppercase tracking-[0.2em] opacity-80 mr-3 text-primary">{title}</span>
              {shortDesc}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/85 leading-relaxed max-w-none">{longDesc}</p>
          </div>
          <div className="relative h-24 md:h-28 w-full rounded-xl border border-border/60 bg-card/40 p-1.5 shadow-inner transition-colors hover:border-primary/40" ref={containerRef}>
            <div className="absolute inset-0 z-20 cursor-crosshair"
              onMouseMove={localHandleHover}
              onClick={(e) => handleChartClick(dataKey, e as any, containerRef.current)}
              onMouseLeave={localHandleMouseLeave}
            />
            {scrubPct !== null && scrubHz !== null && !isLocked && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-30 border-l border-dashed border-primary/40"
                style={{ left: `${scrubPct}%` }}
              >
                <div className="absolute top-0 -translate-x-1/2 -translate-y-full pb-1">
                  <div className="bg-card/95 backdrop-blur shadow-md px-2 py-1 rounded border border-border text-[9px] font-mono font-bold whitespace-nowrap">
                    {scrubHz.toFixed(1)} Hz <span className="text-muted-foreground ml-0.5 opacity-80">({getClosest12TET(scrubHz).name})</span>
                  </div>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 8, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDER} vertical={false} opacity={0.5} />
                <XAxis dataKey={dataKey} type="number" hide domain={[getVal(MIN_F, dataKey), getVal(MAX_F, dataKey)]} />
                <YAxis hide domain={[0, 100]} />
                <ReferenceLine y={50} stroke={COLOR_BORDER} strokeWidth={1} />
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
                      stroke={isLockedMatch ? COLOR_LOCKED : h.color}
                      strokeWidth={isLockedMatch ? 4 : isHovered ? 3 : h.isFund ? 2 : 1}
                      strokeOpacity={isHighlighted ? (h.isFund ? 1 : 0.7) : 0.15}
                      className={isLockedMatch ? 'animate-heartbeat' : ''}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {/* Mel Warping Visualization */}
            {dataKey === 'mel' && (
              <div className="absolute inset-y-0 left-[14px] right-[14px] pointer-events-none z-0 overflow-visible">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {activeHarmonics.map(h => {
                    const pLog = getPct(h.freq, 'log');
                    const pMel = getPct(h.freq, 'mel');
                    const isHighlighted = !highlightedPair || h.id === highlightedPair.id1 || h.id === highlightedPair.id2;
                    const isHovered = hoveredHarm?.id === h.id;
                    const isLockedMatch = isLocked && isHovered;
                    const opacity = isHighlighted ? (isHovered ? 0.6 : 0.25) : 0.05;
                    const isNoteY = h.note === 'Y';

                    // Sinusoidal cubic bezier curve
                    const edgeY = isNoteY ? 10 : 90; // Stop slightly before the absolute edge to align cleanly with the circular labels
                    const ctrlY = isNoteY ? 30 : 70;

                    return (
                      <path
                        key={`warp-${h.id}`}
                        d={`M ${pLog} 50 C ${pLog} ${ctrlY}, ${pMel} ${ctrlY}, ${pMel} ${edgeY}`}
                        fill="none"
                        stroke={isLockedMatch ? COLOR_LOCKED : h.color}
                        strokeWidth={isLockedMatch ? 1.5 : 0.5}
                        strokeDasharray={isLockedMatch ? "4 2" : "2 1"}
                        strokeOpacity={opacity}
                        className={isLockedMatch ? 'animate-dash-flow' : ''}
                      />
                    );
                  })}
                </svg>
              </div>
            )}

            <div className="pointer-events-none absolute inset-y-0 left-[14px] right-[14px] z-10">
              <div className="relative h-full w-full">
                {activeHarmonics.map(h => {
                  const p = getPct(h.freq, dataKey);
                  const isHighlighted = h.id === highlightedPair?.id1 || h.id === highlightedPair?.id2 || !highlightedPair;
                  if (p < 0 || p > 100) return null;
                  return (
                    <div
                      key={`lbl-${h.id}`}
                      className="absolute z-10 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white shadow-md transition-opacity"
                      style={{
                        left: `${p}%`,
                        top: h.note === 'X' ? 'auto' : '4px',
                        bottom: h.note === 'X' ? '4px' : 'auto',
                        transform: 'translateX(-50%)',
                        backgroundColor: isLocked && hoveredHarm?.id === h.id ? COLOR_LOCKED : h.color,
                        opacity: isHighlighted ? 1 : 0.1
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

        <div className="w-full xl:w-80 shrink-0 flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="rounded-xl border border-[#10B981]/25 bg-[#10B981]/5 p-4 relative overflow-hidden group/fact shadow-xl ring-1 ring-[#10B981]/10 h-full flex flex-col justify-between min-h-[100px]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#10B981]/60 to-[#059669]/60" />
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-[#10B981]/10 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#10B981]/15 shadow-sm ring-1 ring-[#10B981]/20">
                    <Lightbulb size={14} className="text-[#059669]" />
                  </div>
                  <span className="font-mono-display text-[10px] font-black uppercase tracking-[0.25em] text-[#059669]/80">Phase {title.split('.')[0]} Insight</span>
                </div>
                {phaseFacts.length > 1 && (
                  <div className="flex gap-1.5 bg-[#10B981]/15 rounded-md px-2 py-1 shadow-sm ring-1 ring-[#10B981]/20">
                    <button onClick={() => setFactIdx(p => (p - 1 + phaseFacts.length) % phaseFacts.length)} className="p-0.5 rounded hover:bg-[#10B981]/25 text-[#059669] transition-all"><ChevronLeft size={12} /></button>
                    <span className="font-mono text-[9px] text-[#059669] font-bold tabular-nums self-center px-1">{factIdx + 1}/{phaseFacts.length}</span>
                    <button onClick={() => setFactIdx(p => (p + 1) % phaseFacts.length)} className="p-0.5 rounded hover:bg-[#10B981]/25 text-[#059669] transition-all"><ChevronRight size={12} /></button>
                  </div>
                )}
              </div>
              <p className="text-[12px] leading-relaxed text-foreground/95 font-medium italic">
                {phaseFacts[factIdx]?.text || `Explore the ${dataKey.toUpperCase()} dimension by selecting harmonics or comparing notes in the charts...`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
