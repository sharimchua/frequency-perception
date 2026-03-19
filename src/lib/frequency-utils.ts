export const MIN_F = 20;
export const MAX_F = 20000;
export const HARMONIC_COUNT = 6;

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const INTERVALS = [
  { name: 'U', semi: 0, full: 'Unison' },
  { name: 'm2', semi: 1, full: 'Minor 2nd' },
  { name: 'M2', semi: 2, full: 'Major 2nd' },
  { name: 'm3', semi: 3, full: 'Minor 3rd' },
  { name: 'M3', semi: 4, full: 'Major 3rd' },
  { name: 'P4', semi: 5, full: 'Perfect 4th' },
  { name: 'TT', semi: 6, full: 'Tritone' },
  { name: 'P5', semi: 7, full: 'Perfect 5th' },
  { name: 'm6', semi: 8, full: 'Minor 6th' },
  { name: 'M6', semi: 9, full: 'Major 6th' },
  { name: 'm7', semi: 10, full: 'Minor 7th' },
  { name: 'M7', semi: 11, full: 'Major 7th' },
  { name: 'P8', semi: 12, full: 'Octave' },
];

// ─────────────────────────────────────────────────────────────────
// Tuning System Architectures
// ─────────────────────────────────────────────────────────────────

export interface TuningTone {
  degree: number;      // 0-based index within the period
  name: string;        // e.g., 'C', 'P5', 'Quarter-tone sharp'
  cents: number;       // Relative to root
  ratioStr?: string;   // Geometric derivation e.g., '3/2'
  ratioVal?: number;   // 1.5
}

export interface TuningSystem {
  id: string;
  name: string;
  description: string;
  history: string;
  pros: string[];
  cons: string[];
  periodCents: number; // Usually 1200 for an octave
  layout: '12-tone' | 'linear'; // '12-tone' renders piano; 'linear' renders circles
  tones: TuningTone[];
}

export const TUNING_SYSTEMS: Record<string, TuningSystem> = {
  '12tet': {
    id: '12tet',
    name: '12-Tone Equal Temperament',
    description: 'The standard tuning system of modern Western music, dividing the octave into 12 mathematically equal semitones.',
    history: 'Developed through the 17th and 18th centuries (notably by theorists like Simon Stevin and popularized by J.S. Bach), 12-TET was a technological solution to the "comma" problem — the mathematical impossibility of stacking pure fifths to perfectly reach an octave. It replaced earlier systems like Meantone or Well-Temperament to allow instruments like the piano to play in all 24 keys with equal (if slightly imperfect) resonance.',
    pros: [
      'Perfect Transposition: Every key sounds identical in character.',
      'Harmonic Freedom: Facilitates complex modularity and chromaticism.',
      'Instrument Standardization: Simplified the manufacturing of fixed-pitch instruments.'
    ],
    cons: [
      'No Pure Intervals: Except for the octave, every interval is slightly "out of tune" compared to the natural overtone series.',
      'Loss of Key Color: Earlier temperaments gave different keys unique emotional "flavors" which 12-TET homogenizes.'
    ],
    periodCents: 1200,
    layout: '12-tone',
    tones: [
      { degree: 0, name: 'Unison', cents: 0, ratioVal: 1, ratioStr: '1/1' },
      { degree: 1, name: 'Minor 2nd', cents: 100, ratioVal: 1.059463 },
      { degree: 2, name: 'Major 2nd', cents: 200, ratioVal: 1.125, ratioStr: '9/8' },
      { degree: 3, name: 'Minor 3rd', cents: 300, ratioVal: 1.18518, ratioStr: '32/27' },
      { degree: 4, name: 'Major 3rd', cents: 400, ratioVal: 1.25, ratioStr: '5/4' },
      { degree: 5, name: 'Perfect 4th', cents: 500, ratioVal: 1.333333, ratioStr: '4/3' },
      { degree: 6, name: 'Tritone', cents: 600, ratioVal: 1.414214 },
      { degree: 7, name: 'Perfect 5th', cents: 700, ratioVal: 1.5, ratioStr: '3/2' },
      { degree: 8, name: 'Minor 6th', cents: 800, ratioVal: 1.6, ratioStr: '8/5' },
      { degree: 9, name: 'Major 6th', cents: 900, ratioVal: 1.666667, ratioStr: '5/3' },
      { degree: 10, name: 'Minor 7th', cents: 1000, ratioVal: 1.777778, ratioStr: '16/9' },
      { degree: 11, name: 'Major 7th', cents: 1100, ratioVal: 1.875, ratioStr: '15/8' },
    ]
  },
  '24tet': {
    id: '24tet',
    name: '24-TET (Quarter Tones)',
    description: 'A microtonal expansion of equal temperament that divides the octave into 24 equal steps, introducing the "Quarter Tone".',
    history: 'While frequently utilized by 20th-century avant-garde Western composers (like Ivan Wyschnegradsky and Alois Hába), 24-TET is often used as a Western notation-approximation for Maqam systems in Arabic and Persian music, which utilize neutral seconds and thirds that fall between the keys of a standard piano.',
    pros: [
      'Microtonal Precision: Allows for much more nuanced melodic shading.',
      'Cultural Bridge: Can approximate non-Western scales (like Arabic Maqams) on digital instruments.',
      'Symmetry: Retained the ease of 12-TET transposition while doubling the available pitch palette.'
    ],
    cons: [
      'Increasing Complexity: Doubling the notes makes practical performance and notation significantly harder.',
      'Acoustic Friction: Quarter tones can be perceived by untrained Western ears as "out of tune" rather than as discrete new notes.'
    ],
    layout: 'linear',
    periodCents: 1200,
    tones: Array.from({ length: 24 }).map((_, i) => ({
      degree: i,
      name: i % 2 === 0 ? ['Unison','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7'][i/2] : `QT ${Math.floor(i/2) + 1}`,
      cents: i * 50,
      ratioVal: Math.pow(2, (i * 50) / 1200),
      ratioStr: i === 0 ? '1/1' : undefined
    }))
  }
};

export interface GridFrequency {
  degree: number;
  octave: number;
  freq: number;
  tone: TuningTone;
}

export const generateTuningFrequencies = (tuning: TuningSystem, anchorFreq: number = 261.625565): GridFrequency[] => {
  const freqs: GridFrequency[] = [];
  
  // Go down
  let currentOctave = -1;
  while (true) {
    let octaveFreqs = tuning.tones.map(t => {
      const centsOffset = (currentOctave * tuning.periodCents) + t.cents;
      const freq = anchorFreq * Math.pow(2, centsOffset / 1200);
      return { degree: t.degree, octave: currentOctave, freq, tone: t };
    });
    if (octaveFreqs[octaveFreqs.length - 1].freq < MIN_F) {
      freqs.unshift(...octaveFreqs.filter(f => f.freq >= MIN_F));
      break;
    }
    freqs.unshift(...octaveFreqs);
    currentOctave--;
  }

  // Go up (including octave 0)
  currentOctave = 0;
  while (true) {
    let octaveFreqs = tuning.tones.map(t => {
      const centsOffset = (currentOctave * tuning.periodCents) + t.cents;
      const freq = anchorFreq * Math.pow(2, centsOffset / 1200);
      return { degree: t.degree, octave: currentOctave, freq, tone: t };
    });
    if (octaveFreqs[0].freq > MAX_F) break;
    freqs.push(...octaveFreqs.filter(f => f.freq <= MAX_F));
    currentOctave++;
  }
  
  return freqs;
};


export const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export interface HarmonicFact {
  text: string;
  label?: string; // e.g. "H3 — Theoretical"
  spectrum?: 'hz' | 'log' | 'cultural' | 'bark' | 'mel' | null;
}

// ─────────────────────────────────────────────────────────────────
// PEDAGOGICAL FACT GENERATORS
// ─────────────────────────────────────────────────────────────────

/**
 * Facts about the Cultural Tuning Layer.
 */
export const getCulturalFacts = (tuning: TuningSystem, degree: number): HarmonicFact[] => {
  const facts: HarmonicFact[] = [];
  const per = tuning.tones.length;
  const t = tuning.tones[degree % per];
  const octaves = Math.floor(degree / per);

  if (tuning.id === '12tet') {
    facts.push({
      text: `In 12-TET, every step is exactly 100 cents. This mathematical symmetry was a revolutionary 'hack' that allowed Western music to transpose freely across all 24 keys without the instrument sounding out of tune in certain registers.`,
      spectrum: 'cultural'
    });
    if (t.ratioStr) {
      facts.push({
        text: `The ${t.name} here is derived from the ratio ${t.ratioStr}. In 12-TET, we intentionally 'temper' (slightly detune) this pure physical ratio to make the keyboard cycle perfectly.`,
        spectrum: 'cultural'
      });
    }
  } else if (tuning.id === '24tet') {
    facts.push({
      text: `24-TET introduces the Quarter Tone (50 cents). This allows the system to approximate the neutral intervals found in Arabic Maqam and Persian Dastgah music, which feel 'in-between' to ears trained only on 12-tone scales.`,
      spectrum: 'cultural'
    });
    if (degree % 2 !== 0) {
      facts.push({
        text: `You have selected a Quarter Tone step. In many Eastern traditions, these aren't just 'out of tune' notes, but essential melodic points that carry specific emotional weight and heritage.`,
        spectrum: 'cultural'
      });
    }
  }

  if (octaves > 0) {
    facts.push({
      text: `This interval spans ${octaves} octave${octaves > 1 ? 's' : ''}. Tuning systems usually 'repeat' every octave (equivalence), but the physical roughness of intervals actually changes as you move into different registers.`,
      spectrum: 'cultural'
    });
  }

  return facts;
};

export const freqToMidi = (f: number) => 12 * Math.log2(f / 440) + 69;

/**
 * Traunmüller (1990) formula for Bark scale.
 * More robust at high frequencies than the Zwicker approximation.
 */
export const toBark = (f: number) => {
  return ((26.81 * f) / (1960 + f)) - 0.53;
};

/**
 * Standard Mel scale formula (S.S. Stevens).
 */
export const toMel = (f: number) => 1127 * Math.log(1 + f / 700);

export const getNoteName = (n: number) => {
  const r = Math.round(n);
  return `${NOTE_NAMES[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`;
};

export const getClosest12TET = (freq: number) => {
  const mFloat = 12 * Math.log2(freq / 440) + 69;
  const mRound = Math.round(mFloat);
  const cents = (mFloat - mRound) * 100;
  return { midi: mRound, name: getNoteName(mRound), freq: midiToFreq(mRound), cents };
};

export const getVal = (f: number, scale: string) => {
  if (scale === 'hz') return f;
  if (scale === 'log') return Math.log2(f);
  if (scale === 'bark') return toBark(f);
  if (scale === 'mel') return toMel(f);
  return f;
};

export const getPct = (f: number, scale: string) => {
  const v = getVal(f, scale);
  const min = getVal(MIN_F, scale);
  const max = getVal(MAX_F, scale);
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
};

export interface Harmonic {
  id: string;
  note: string;
  degree: number;
  freq: number;
  color: string;
  isFund: boolean;
}

export interface Interference {
  h1: Harmonic;
  h2: Harmonic;
  barkDist: number;
}

export const INTERVAL_FACTS: Record<number, HarmonicFact[]> = {
  0: [
    { text: "Unison — two identical frequencies create constructive interference, doubling amplitude. This is why choirs and orchestral sections sound so powerful.", spectrum: 'hz' },
    { text: "When two instruments play in unison, tiny tuning differences create a shimmering 'chorus' effect — this beating is actually the sum and difference of their frequencies.", spectrum: 'bark' },
    { text: "The human ear can detect pitch differences as small as 3–5 cents. In unison, even these micro-deviations create perceivable texture.", spectrum: 'mel' },
    { text: "On the log scale, unison means zero interval distance. Every harmonic of one source lands exactly on a harmonic of the other — the overtone series are perfectly superimposed.", spectrum: 'log' },
    { text: "In physical Hz terms, unison means the air pressure wave patterns are identical. When perfectly in phase, they sum to double the pressure amplitude — a 6 dB increase.", spectrum: 'hz' },
    { text: "On the Bark scale, unison means zero critical-band separation. Your cochlea literally cannot distinguish the two sources — it perceives one louder sound.", spectrum: 'bark' },
    { text: "Perceptually, unison at 0 mel separation means your brain fuses both sources into a single auditory 'object'. Spatial cues (stereo panning) are the only way to tell them apart.", spectrum: 'mel' }
  ],
  1: [
    { text: "The minor 2nd (ratio ~16:15) is the most dissonant interval — the frequencies are close enough to trigger 'roughness' on the basilar membrane of your inner ear.", spectrum: 'bark' },
    { text: "In horror film scores, the minor 2nd is used extensively because its beating frequency falls in the 20–30 Hz range, triggering anxiety responses.", spectrum: 'mel' },
    { text: "The semitone is the smallest interval in Western music, but in Arabic maqam, quarter-tones split it further — our 12-TET system is actually a compromise.", spectrum: 'cultural' },
    { text: "A semitone spans exactly 100 cents on the log scale — the smallest equal-tempered step. Yet this 'small' step creates the strongest sense of melodic tension and resolution in Western music.", spectrum: 'log' },
    { text: "The Hz difference of a semitone varies wildly by register: ~1.5 Hz at the bottom of the piano but ~470 Hz at the top. Same interval, vastly different physics.", spectrum: 'hz' },
    { text: "At a semitone apart, the fundamentals share a critical band across most of the audible range. This is the biological definition of maximum dissonance — the hair cells simply cannot separate them.", spectrum: 'bark' },
    { text: "The Mel scale shows a semitone as a relatively large perceptual step in the bass but a tiny one in the treble. This is why low-register semitones sound 'crunchy' while high ones sound 'tight'.", spectrum: 'mel' }
  ],
  2: [
    { text: "The major 2nd (ratio 9:8) is the interval of a whole step — the building block of major scales. Its Bark distance is about 1.5z, right at the edge of roughness.", spectrum: 'bark' },
    { text: "When you sing 'Happy Birthday', the first two notes are a major 2nd apart. It's one of the most natural intervals for the human voice.", spectrum: 'mel' },
    { text: "Two notes a whole tone apart create a beat frequency that's audible as a distinct wobble — this is how piano tuners verify their work.", spectrum: 'hz' },
    { text: "On the log scale, a whole tone = 200 cents. The whole-tone scale (C-D-E-F#-G#-A#) divides the octave into 6 equal steps, creating the 'dreamlike' sound Debussy made famous.", spectrum: 'log' },
    { text: "In Hz, a whole tone above A4 (440 Hz) is B4 (493.88 Hz) — a 53.88 Hz gap. But a whole tone above A2 (110 Hz) is B2 (123.47 Hz) — only 13.47 Hz. Same interval, 4× less physical energy.", spectrum: 'hz' },
    { text: "Perceptually, the major 2nd spans about 60–100 mel depending on register. Your brain treats it as 'one step' regardless — evidence that pitch perception is fundamentally logarithmic, not linear.", spectrum: 'mel' }
  ],
  3: [
    { text: "The minor 3rd (ratio 6:5) is the interval of sadness in Western music — but in many cultures it carries no emotional connotation at all.", spectrum: 'cultural' },
    { text: "Biologically, the minor 3rd falls in a 'sweet spot' on the Bark scale where our ears can distinguish both notes clearly while still perceiving their harmonic relationship.", spectrum: 'bark' },
    { text: "The opening of Beethoven's 5th Symphony — 'da-da-da-DUM' — spans a minor 3rd. It's one of the most recognised intervals in music history.", spectrum: 'log' },
    { text: "On the Hz axis, a minor 3rd's beat frequency is fast enough (30–80 Hz in the mid-range) to be perceived as a distinct 'buzzing' texture rather than individual pulses.", spectrum: 'hz' },
    { text: "The minor 3rd spans about 3 semitones on the log scale. In equal temperament it's 300 cents — 16 cents wider than the 'pure' 6:5 ratio (315.64 cents). Most ears don't notice.", spectrum: 'log' },
    { text: "On the Mel scale, the minor 3rd covers enough perceptual distance that your brain assigns each note a distinct 'pitch identity' — unlike the semitone where they blur.", spectrum: 'mel' }
  ],
  4: [
    { text: "The major 3rd (ratio 5:4) is the interval of joy. In just intonation it's perfectly consonant; in equal temperament it's 14 cents sharp — the biggest compromise in 12-TET.", spectrum: 'cultural' },
    { text: "Barbershop quartets tune their major 3rds to the pure 5:4 ratio, creating audible 'combination tones' that sound like a phantom fifth voice.", spectrum: 'hz' },
    { text: "Your brain processes major 3rds differently from minor 3rds — fMRI studies show distinct activation patterns in the auditory cortex for each.", spectrum: 'mel' },
    { text: "On the log scale, the equal-tempered major 3rd (400 cents) is the most 'out of tune' interval in 12-TET compared to its just-intonation ideal (386 cents). This 14-cent error shaped centuries of tuning debate.", spectrum: 'log' },
    { text: "On the Bark scale, a major 3rd puts the fundamentals clearly in separate critical bands for most registers. This clean separation is what makes the interval sound 'bright' and 'open'.", spectrum: 'bark' },
    { text: "The Hz gap of a major 3rd varies enormously: about 18 Hz around C2 (65 Hz) but about 580 Hz around C6 (1047 Hz). The physical distance explodes, but the perceived distance stays constant.", spectrum: 'hz' }
  ],
  5: [
    { text: "The perfect 4th (ratio 4:3) was considered the most consonant interval in medieval music — more important than the 3rd. Rules of counterpoint were built around it.", spectrum: 'cultural' },
    { text: "The 4th is an 'inverted 5th' — flip any perfect 5th and you get a 4th. Together they divide the octave into two interlocking consonances.", spectrum: 'log' },
    { text: "Car horns in the US are typically tuned to a perfect 4th (F and B♭). The interval is piercing yet harmonically stable — perfect for alerts.", spectrum: 'mel' },
    { text: "In Hz, a perfect 4th above A4 (440 Hz) is D5 (587.33 Hz) — a gap of 147 Hz. This beat frequency is too fast for your ear to track as pulses; instead you hear harmonic fusion.", spectrum: 'hz' },
    { text: "On the Bark scale, a perfect 4th always spans more than 2 critical bands in the mid-range. This comfortable separation is why medieval organum — singing in parallel 4ths — sounded stable and clear.", spectrum: 'bark' },
    { text: "The Mel-scale distance of a perfect 4th shrinks as you go higher in register. At A2 it's about 150 mel; at A5 it's about 100 mel. This is why high-register 4ths sound 'thinner' than low ones.", spectrum: 'mel' }
  ],
  6: [
    { text: "The tritone (ratio 45:32) divides the octave exactly in half on the log scale. Medieval musicians called it 'Diabolus in Musica' — the Devil's interval.", spectrum: 'cultural' },
    { text: "The tritone is unique: it's its own inversion. Go up 6 semitones or down 6 semitones — you arrive at the same interval class.", spectrum: 'log' },
    { text: "Emergency vehicle sirens often alternate between notes a tritone apart because the interval is maximally attention-grabbing to the human auditory system.", spectrum: 'mel' },
    { text: "In Hz, the tritone has the ratio √2:1 (≈1.4142). This irrational number means the frequencies never align in a repeating pattern — the waveform literally never repeats, which is the physical basis of its instability.", spectrum: 'hz' },
    { text: "On the Bark scale, a tritone sits at the boundary between 'clearly separated' and 'interacting'. It's dissonant not because of critical-band roughness but because of the lack of harmonic alignment.", spectrum: 'bark' },
    { text: "Perceptually, the tritone spans exactly half a perceived octave on the Mel scale only near 1000 Hz. At other registers, this 'half' is stretched or compressed — one reason the tritone sounds different across the keyboard.", spectrum: 'mel' }
  ],
  7: [
    { text: "The perfect 5th (ratio 3:2) is the most consonant interval after the octave. It's the foundation of Pythagorean tuning and the Circle of Fifths.", spectrum: 'cultural' },
    { text: "When you stack perfect 5ths, you generate all 12 notes of the chromatic scale — but you overshoot by 23.5 cents (the 'Pythagorean comma'). This tiny error shaped all of Western tuning history.", spectrum: 'log' },
    { text: "Most power chords in rock music are bare 5ths. The interval is so consonant that distortion doesn't destroy its clarity — unlike 3rds, which turn muddy.", spectrum: 'bark' },
    { text: "In Hz, a perfect 5th has a 3:2 ratio — meaning for every 2 cycles of the lower note, the upper completes exactly 3. This simple phase relationship is visible as a clean, repeating waveform pattern.", spectrum: 'hz' },
    { text: "On the log scale, the 5th spans 700 cents — close to 7/12 of an octave. This near-equal division is why the Circle of Fifths nearly closes after 12 steps.", spectrum: 'log' },
    { text: "The Mel-scale distance of a 5th is psychoacoustically 'comfortable' — wide enough to be clearly two notes, but harmonically related enough to fuse into a stable unit. This is the perceptual basis of power chord 'punch'.", spectrum: 'mel' }
  ],
  8: [
    { text: "The minor 6th (ratio 8:5) is the inversion of the major 3rd. It has a bittersweet quality — consonant but with an underlying tension.", spectrum: 'log' },
    { text: "The opening interval of 'Love Story' is a minor 6th. Composers use it for longing and nostalgia because it resolves 'inward' toward the 5th.", spectrum: 'mel' },
    { text: "On the Mel scale, the minor 6th covers a substantial perceptual distance — your brain perceives it as a 'wide' interval even in the bass register.", spectrum: 'mel' },
    { text: "In Hz, the 8:5 ratio means that every 5 cycles of the lower note align with 8 of the upper. This 5-cycle pattern is long enough that your ear needs time to 'lock on' — explaining the interval's ambiguous character.", spectrum: 'hz' },
    { text: "On the Bark scale, a minor 6th separates the fundamentals by 4–6 critical bands. Your ear processes them as fully independent pitch events, with no roughness at the fundamental level.", spectrum: 'bark' }
  ],
  9: [
    { text: "The major 6th (ratio 5:3) is used in the 'NBC chime' — three notes spanning a major 6th. It's one of the most recognisable sonic logos ever created.", spectrum: 'mel' },
    { text: "The major 6th is the inversion of the minor 3rd. Inverting intervals swaps their emotional quality: the 'sad' minor 3rd becomes the 'warm' major 6th.", spectrum: 'log' },
    { text: "In the Bark scale, a major 6th spans about 5–7 critical bands, meaning your ear processes both notes with completely independent neural channels.", spectrum: 'bark' },
    { text: "In Hz, the 5:3 ratio produces a wave pattern that repeats every 3 cycles of the upper note. This moderate complexity gives the major 6th its characteristic 'warm but open' quality.", spectrum: 'hz' },
    { text: "On the Mel scale, a major 6th spans roughly 250–400 mel depending on register — nearly half a perceived octave. This wide perceptual spread is why it works so well for melodic leaps.", spectrum: 'mel' }
  ],
  10: [
    { text: "The minor 7th (ratio 9:5) is the interval of dominant 7th chords — the most 'restless' chord in Western harmony, always wanting to resolve.", spectrum: 'log' },
    { text: "Blues music is built on minor 7ths. The 'blue note' is actually a pitch-bent minor 7th that doesn't exist in standard 12-TET tuning.", spectrum: 'cultural' },
    { text: "The minor 7th produces a beating rate that's fast enough to be perceived as 'buzzy' but slow enough to still hear both notes — right at the roughness boundary.", spectrum: 'bark' },
    { text: "In Hz, the minor 7th ratio of 9:5 creates a complex interference pattern that takes 5 cycles to repeat. This is long enough that your ear perceives harmonic ambiguity — the interval 'leans' toward resolution.", spectrum: 'hz' },
    { text: "On the Mel scale, the minor 7th is perceptually almost as wide as an octave. This is why dominant 7th chords feel 'open' and 'spacious' despite their harmonic tension.", spectrum: 'mel' }
  ],
  11: [
    { text: "The major 7th (ratio 15:8) is simultaneously dissonant and beautiful. Jazz musicians call it the 'jazz interval' — it defines the maj7 chord's dreamy quality.", spectrum: 'mel' },
    { text: "The major 7th is only one semitone from the octave, creating strong 'leading tone' pull — your brain expects resolution to the octave so strongly it's almost physical.", spectrum: 'mel' },
    { text: "Ravel and Debussy used stacked major 7ths to create the 'impressionist' sound — the interval's harmonic complexity produces rich, shimmering overtone interactions.", spectrum: 'bark' },
    { text: "On the log scale, 1100 cents puts the major 7th just 100 cents shy of the octave. This near-miss is musically potent: your brain hears it as an 'almost octave' that demands completion.", spectrum: 'log' },
    { text: "In Hz, the 15:8 ratio creates an interference pattern that takes 8 cycles to repeat — among the most complex of the simple intervals. This long cycle is what gives the major 7th its shimmer.", spectrum: 'hz' },
    { text: "On the Bark scale, the major 7th's fundamentals are far apart (6+ critical bands), yet their overtone series create dense cross-note interference. This paradox — clean fundamentals, rough harmonics — is the maj7's signature.", spectrum: 'bark' }
  ],
  12: [
    { text: "The octave (ratio 2:1) is the most fundamental interval in all of music. Every culture on Earth recognises octave equivalence — a C4 and C5 are perceived as the 'same note'.", spectrum: 'cultural' },
    { text: "Octave equivalence is hardwired into your auditory cortex. Neurons that fire for 440 Hz also fire for 880 Hz — they literally share neural circuitry.", spectrum: 'mel' },
    { text: "When you double a frequency, every harmonic of the lower note aligns perfectly with every other harmonic of the upper note. Zero beating. Perfect consonance.", spectrum: 'bark' },
    { text: "On the log scale, the octave is exactly 1200 cents — the fundamental unit of musical measurement. All other intervals are defined as fractions of this distance.", spectrum: 'log' },
    { text: "In Hz, the octave above A4 (440 Hz) is A5 (880 Hz) — a 440 Hz gap. But the octave above A1 (55 Hz) is A2 (110 Hz) — only 55 Hz. Same interval, 8× less physical energy.", spectrum: 'hz' },
    { text: "On the Mel scale, octaves are not equal: a low-register octave spans about 500 mel, while a high-register one spans only about 250 mel. Your brain 'compresses' upper octaves.", spectrum: 'mel' }
  ],
};

// Fun facts about specific harmonics, contextual to the spectrum being viewed

export const getHarmonicFacts = (degree: number, freq: number, noteName: string): HarmonicFact[] => {
  const tet = getClosest12TET(freq);
  const centsOff = Math.abs(tet.cents);
  const barkVal = toBark(freq);
  const melVal = toMel(freq);

  const facts: HarmonicFact[] = [];

  // ──────────────────────────────────────────────────
  // FUNDAMENTAL (H1)
  // ──────────────────────────────────────────────────
  if (degree === 1) {
    // Hz-spectrum facts
    if (freq >= 420 && freq <= 460) {
      facts.push({ text: `${freq.toFixed(1)} Hz is near concert pitch A4 (440 Hz) — the universal tuning reference adopted in 1955. Before that, 'concert A' varied from 415 Hz to 465 Hz across Europe.` });
    }
    if (freq >= 256 && freq <= 264) {
      facts.push({ text: `This is near 'middle C' (~261.6 Hz) — the centre of the piano keyboard and the reference point for the scientific pitch standard where C4 = 256 Hz exactly.` });
    }
    if (freq < 80) {
      facts.push({ text: `Below 80 Hz, your ear struggles to identify pitch precisely. You feel these frequencies as much as hear them — bass is as much tactile as auditory.`, spectrum: 'hz' });
    }
    if (freq > 2000) {
      facts.push({ text: `Above 2 kHz, your ear is at peak sensitivity — the ear canal resonance amplifies these frequencies by up to 20 dB. This is why high-pitched sounds feel 'louder'.`, spectrum: 'hz' });
    }
    if (freq >= 100 && freq <= 300) {
      facts.push({ text: `The ${freq.toFixed(0)} Hz range is the 'warmth' zone in audio engineering. Most male speaking voices have fundamentals here, which is why we find these frequencies comforting.`, spectrum: 'hz' });
    }
    if (freq >= 300 && freq <= 600) {
      facts.push({ text: `${freq.toFixed(0)} Hz sits in the 'body' range of most instruments. Female speaking voices and violin fundamentals live here — the ear resolves pitch cleanly at this register.`, spectrum: 'hz' });
    }

    // General fundamental
    facts.push({ text: `The fundamental (H1) at ${freq.toFixed(1)} Hz defines the perceived pitch. All other harmonics add timbre — the colour that distinguishes a guitar from a piano playing the same note.` });

    // Log-spectrum facts
    if (centsOff > 10) {
      facts.push({ text: `This frequency is ${tet.cents > 0 ? '+' : ''}${tet.cents.toFixed(1)}¢ from ${tet.name} in equal temperament. Deviations over 10¢ are noticeable to trained ears.`, spectrum: 'log' });
    }
    facts.push({ text: `On the log scale, this fundamental sits at ${Math.log2(freq).toFixed(2)} octaves above 1 Hz. Every fixed distance on this axis represents the same musical interval — a semitone is always 1/12 of the space between octaves.`, spectrum: 'log' });

    // Bark-spectrum facts
    if (freq < 100) {
      facts.push({ text: `At ${barkVal.toFixed(1)} Bark, the critical bandwidth is roughly 100 Hz. Your ear acts like a low-pass filter here, merging frequencies that are physically distinct into a single perceived 'thump'.`, spectrum: 'bark' });
    } else if (freq < 500) {
      facts.push({ text: `The fundamental sits at ${barkVal.toFixed(1)} Bark. In this 'power' register, the Bark scale reveals how the cochlea's mechanical resonance is tuned to prioritize detecting harmonics over fundamental precision.`, spectrum: 'bark' });
    } else if (freq < 3000) {
      facts.push({ text: `At ${barkVal.toFixed(1)} Bark, you're in the 'critical' band of maximum resolution. Each Bark band here represents about 1mm of distance along your inner ear's basilar membrane.`, spectrum: 'bark' });
    } else {
      facts.push({ text: `At ${barkVal.toFixed(1)} Bark, H1 is in the 'edge' region. Above 12 Bark, frequency resolution decreases as the ear prioritizes temporal (timing) information over spectral (pitch) location.`, spectrum: 'bark' });
    }

    // Mel-spectrum facts
    if (freq < 200) {
      facts.push({ text: `At ${melVal.toFixed(0)} mel, your brain 'inflates' this pitch distance. A 20 Hz shift here feels as massive as a 200 Hz shift in the treble — the Mel scale maps this perceptual distortion.`, spectrum: 'mel' });
    } else if (freq < 1000) {
      facts.push({ text: `At ${melVal.toFixed(0)} mel, pitch perception is at its most 'natural' (linear). Stevens' experiments showed that underneath 1000 mel, the human brain correlates Hz and Pitch almost 1:1.`, spectrum: 'mel' });
    } else {
      facts.push({ text: `At ${melVal.toFixed(0)} mel, the 'Perceptual Law of Diminishing Returns' kicks in. Even though the frequency is ${freq.toFixed(0)} Hz, it 'sounds' only slightly higher than a note half its frequency.`, spectrum: 'mel' });
    }
    facts.push({ text: `The Mel scale (from 'Melody') was derived by asking subjects to tune a second tone until it sounded 'exactly half the pitch' of a reference. It proves our brains don't hear frequencies, they hear 'mels'.`, spectrum: 'mel' });
  }

  // ──────────────────────────────────────────────────
  // 2nd HARMONIC (Octave)
  // ──────────────────────────────────────────────────
  if (degree === 2) {
    facts.push({ text: `The 2nd harmonic (octave) at ${freq.toFixed(1)} Hz is exactly double the fundamental. It reinforces the root pitch and adds warmth and body to the sound.` });
    facts.push({ text: `On the log scale, octaves are equally spaced — every doubling moves the same visual distance. This is why the log view maps directly to how musicians think about pitch.`, spectrum: 'log' });
    const barkFund = toBark(freq / 2);
    const barkGap = barkVal - barkFund;
    facts.push({ text: `The Bark gap between H1 and H2 is ${barkGap.toFixed(1)}z (${barkFund.toFixed(1)} → ${barkVal.toFixed(1)}). When this gap exceeds ~1.0z, your ear processes the two as fully independent tones with no roughness.`, spectrum: 'bark' });
    if (barkGap < 1.5) {
      facts.push({ text: `At this register, H1 and H2 are only ${barkGap.toFixed(1)} Bark apart — close enough that their critical bands partially overlap. This creates the characteristic 'fullness' of low-register octaves.`, spectrum: 'bark' });
    }
    facts.push({ text: `Perceptually, H2 at ${melVal.toFixed(0)} mel is exactly 1 'perceived octave' above H1. If this number was higher, the interval would sound 'stretched' (like a jazz piano), if lower, it would sound 'compressed'.`, spectrum: 'mel' });
    facts.push({ text: `On the Bark scale, named after Heinrich Barkhausen, H2 (${barkVal.toFixed(1)}z) and H1 are usually separated by more than 1.5 Bark. This wide gap is why octaves sound so clean — there is zero critical band overlap.`, spectrum: 'bark' });
  }

  // ──────────────────────────────────────────────────
  // 3rd HARMONIC (Octave + Fifth)
  // ──────────────────────────────────────────────────
  if (degree === 3) {
    facts.push({ text: `The 3rd harmonic (octave + fifth) at ${freq.toFixed(1)} Hz is what gives brass instruments their characteristic 'bright' quality. Trumpets emphasise this partial strongly.` });
    facts.push({ text: `On the log scale, H3 is exactly log₂(3) ≈ 1.585 octaves above the fundamental. This non-integer relationship is why the 3rd harmonic introduces the first 'new' pitch class into the series — the perfect fifth.`, spectrum: 'log' });
    const barkFund = toBark(freq / 3);
    facts.push({ text: `H3 sits at ${barkVal.toFixed(1)} Bark, a full ${(barkVal - barkFund).toFixed(1)}z above the fundamental. At this separation, your ear treats them as completely independent — no roughness, just a clear harmonic glow.`, spectrum: 'bark' });
    facts.push({ text: `On the Bark scale, notice how H2 and H3 are closer together than H1 and H2. Critical bands widen as frequency rises. Heinz Barkhausen (1881-1956) defined these bands as the frequency range where the ear merges sounds.`, spectrum: 'bark' });
    const melFund = toMel(freq / 3);
    facts.push({ text: `At ${melVal.toFixed(0)} mel, H3 is perceptually ${(melVal - melFund).toFixed(0)} mel above the fundamental. The Mel scale reveals that each successive harmonic adds diminishing 'perceived distance' — a psychoacoustic compression.`, spectrum: 'mel' });
    facts.push({ text: `The Mel scale's name comes from 'melody' — it was derived by Stanley Smith Stevens (1906–1973) using listeners who judged when a pitch was 'exactly twice' as high as another.`, spectrum: 'mel' });
  }

  // ──────────────────────────────────────────────────
  // 4th HARMONIC (Two Octaves)
  // ──────────────────────────────────────────────────
  if (degree === 4) {
    facts.push({ text: `The 4th harmonic (two octaves up) at ${freq.toFixed(1)} Hz. Clarinets are unusual — they naturally suppress even harmonics, which is why they sound 'hollow' compared to oboes.` });
    facts.push({ text: `On the log scale, H4 is exactly 2 octaves above the fundamental. The perfectly even spacing of octave harmonics (H1, H2, H4) is visible as equal gaps — this regularity is the backbone of tonal music.`, spectrum: 'log' });
    const bark3 = toBark(freq * 3 / 4); // H3 frequency
    const barkGap34 = Math.abs(barkVal - bark3);
    facts.push({ text: `The Bark distance between H3 (${bark3.toFixed(1)}z) and H4 (${barkVal.toFixed(1)}z) is just ${barkGap34.toFixed(2)}z. ${barkGap34 < 1.0 ? "This is within the critical band — these harmonics create perceptible 'beating' or roughness." : "This exceeds the critical band — your ear resolves them independently."}`, spectrum: 'bark' });
    const melFund = toMel(freq / 4);
    facts.push({ text: `At ${melVal.toFixed(0)} mel (${(melVal - melFund).toFixed(0)} mel above H1), H4 demonstrates perceptual compression: two physical octaves translate to progressively fewer 'perceived pitch units' as you climb the register.`, spectrum: 'mel' });
    if (freq > 2000) {
      facts.push({ text: `At ${freq.toFixed(0)} Hz, H4 enters the speech-critical band (1–4 kHz). Your auditory system is maximally sensitive here due to ear canal resonance — this harmonic strongly shapes how 'present' a sound feels.`, spectrum: 'hz' });
    }
  }

  // ──────────────────────────────────────────────────
  // 5th HARMONIC (Two Octaves + Major 3rd)
  // ──────────────────────────────────────────────────
  if (degree === 5) {
    facts.push({ text: `The 5th harmonic (two octaves + major 3rd) at ${freq.toFixed(1)} Hz creates the 'sweetness' in a sound. It's the basis of the pure major triad in the harmonic series.` });
    facts.push({ text: `This harmonic is 14 cents flatter than the equal-tempered major 3rd — the difference between 'just' and 'equal' that makes barbershop singing sound uniquely resonant.`, spectrum: 'log' });
    const bark4 = toBark(freq * 4 / 5); // H4 frequency
    const barkGap45 = Math.abs(barkVal - bark4);
    facts.push({ text: `H5 at ${barkVal.toFixed(1)} Bark is only ${barkGap45.toFixed(2)}z from H4. ${barkGap45 < 1.0 ? "These harmonics share a critical band — the 'clash' between H4 and H5 is what gives complex tones their characteristic shimmer and texture." : "These are resolved independently — the timbre contribution is clean and separate."}`, spectrum: 'bark' });
    facts.push({ text: `On the Bark scale, H4 and H5 are closer together than H1 and H2 were — this progressive 'bunching' of upper harmonics is why rich timbres have more roughness in the treble.`, spectrum: 'bark' });
    const melFund = toMel(freq / 5);
    facts.push({ text: `At ${melVal.toFixed(0)} mel, H5 has covered ${(melVal - melFund).toFixed(0)} mel of perceptual distance from the fundamental. Notice how each successive harmonic adds less and less mel distance — your brain treats upper harmonics as increasingly 'close'.`, spectrum: 'mel' });
    if (freq > 1000 && freq < 5000) {
      facts.push({ text: `At ${freq.toFixed(0)} Hz, the Mel scale shows H5 in the region where speech formants live. This is why the 5th harmonic is critical for vowel recognition and vocal timbre.`, spectrum: 'mel' });
    }
  }

  // ──────────────────────────────────────────────────
  // 6th HARMONIC (Two Octaves + Fifth)
  // ──────────────────────────────────────────────────
  if (degree === 6) {
    facts.push({ text: `The 6th harmonic (two octaves + fifth) at ${freq.toFixed(1)} Hz. Beyond H6, harmonics contribute increasingly to 'brilliance' and 'edge' rather than perceived pitch.` });
    if (freq > 4000) {
      facts.push({ text: `At ${freq.toFixed(0)} Hz, this harmonic enters the region of peak ear sensitivity (2–5 kHz). It contributes significantly to how 'present' and 'bright' the sound feels.`, spectrum: 'hz' });
    }
    if (freq > 8000) {
      facts.push({ text: `Above 8 kHz, H6 is in the 'air' and 'sparkle' range of audio. These extreme upper harmonics add the sense of space and openness — you can't pinpoint pitch here, but you feel their absence if they're filtered out.`, spectrum: 'hz' });
    }
    facts.push({ text: `On the log scale, H6 sits at log₂(6) ≈ 2.585 octaves above the fundamental. The interval from H5 to H6 is a minor 3rd — notice how the harmonic series contains all the building blocks of Western harmony.`, spectrum: 'log' });
    const bark5 = toBark(freq * 5 / 6); // H5 frequency
    const barkGap56 = Math.abs(barkVal - bark5);
    facts.push({ text: `H5 → H6 spans only ${barkGap56.toFixed(2)} Bark. ${barkGap56 < 1.0 ? "This is within one critical band — your ear fuses these into a single 'brightness' sensation rather than hearing two separate tones." : "Still resolved independently, but barely — this is the boundary where harmonics begin to merge into 'timbre'."}`, spectrum: 'bark' });
    facts.push({ text: `At ${barkVal.toFixed(1)} Bark, H6 is near the upper end of the Bark scale (~24z). The remaining Bark bands above this are wide and poorly resolved — your cochlea is running out of space to separate sounds.`, spectrum: 'bark' });
    const melFund = toMel(freq / 6);
    facts.push({ text: `H6 at ${melVal.toFixed(0)} mel is ${(melVal - melFund).toFixed(0)} mel above H1. Compare this span to the H1→H2 mel distance — the total is far less than you'd expect from 2.5+ octaves, showing how dramatically pitch perception compresses in the treble.`, spectrum: 'mel' });
    facts.push({ text: `The Mel scale reveals why synthesisers sound 'thin' without upper harmonics: H5 and H6 add very little perceived pitch height but substantial textural richness. Removing them makes sounds feel artificially sterile.`, spectrum: 'mel' });
  }

  // ──────────────────────────────────────────────────
  // GENERIC CROSS-SPECTRUM FACTS
  // ──────────────────────────────────────────────────
  if (freq >= 1000 && freq <= 4000 && degree > 1) {
    facts.push({ text: `${freq.toFixed(0)} Hz falls in the speech-critical range (1–4 kHz). This is why overtones in this region make instruments 'cut through' a mix — your ear evolved to prioritise these frequencies for language.`, spectrum: 'hz' });
  }
  if (freq > 5000 && degree > 2) {
    facts.push({ text: `Above 5 kHz, pitch perception weakens dramatically. At ${freq.toFixed(0)} Hz, this harmonic is more 'texture' than 'note' — it adds sizzle, not melody. Removing it would make the sound duller but not change the perceived key.`, spectrum: 'hz' });
  }

  return facts;
};

// ──────────────────────────────────────────────────
// INTERFERENCE PAIR FACTS
// Facts shown when user clicks an interference pill
// ──────────────────────────────────────────────────
export const getInterferenceFacts = (
  h1: Harmonic, h2: Harmonic, barkDist: number, intervalSemitones: number
): HarmonicFact[] => {
  const facts: HarmonicFact[] = [];
  const hzDiff = Math.abs(h1.freq - h2.freq);
  const lowerFreq = Math.min(h1.freq, h2.freq);
  const higherFreq = Math.max(h1.freq, h2.freq);
  const beatRate = hzDiff;
  const ratio = higherFreq / lowerFreq;
  const centsDiff = Math.abs(1200 * Math.log2(ratio));
  const melDiff = Math.abs(toMel(h1.freq) - toMel(h2.freq));

  // Beat frequency facts
  if (beatRate < 20) {
    facts.push({ text: `These harmonics beat at ${beatRate.toFixed(1)} Hz — slow enough to hear as a distinct 'wobble' or tremolo. This is how piano tuners verify octaves and fifths: they listen for the beats to disappear.` });
  } else if (beatRate < 80) {
    facts.push({ text: `The beat frequency between these is ${beatRate.toFixed(1)} Hz — in the range perceived as 'roughness'. Your auditory system cannot separate the tones cleanly, creating a buzzing, gritty sensation.` });
  } else {
    facts.push({ text: `At ${beatRate.toFixed(0)} Hz apart, these harmonics create rapid beating that your ear perceives as timbral roughness rather than distinct pulses. This is the 'texture' that gives dissonance its edge.` });
  }

  // Bark distance analysis
  if (barkDist < 0.3) {
    facts.push({ text: `With only ${barkDist.toFixed(2)} Bark separation, these harmonics fall deep within the same critical band. Your basilar membrane physically cannot vibrate at two distinct points this close together — it 'smears' them into one rough, beating sensation.`, spectrum: 'bark' });
  } else if (barkDist < 0.5) {
    facts.push({ text: `At ${barkDist.toFixed(2)} Bark, these harmonics are at peak roughness — close enough to interfere strongly on the basilar membrane, but distinct enough that the beating is maximally jarring. This zone (~0.25–0.5 Bark) is the ear's 'discomfort peak'.`, spectrum: 'bark' });
  } else if (barkDist < 0.75) {
    facts.push({ text: `At ${barkDist.toFixed(2)} Bark, these harmonics are in the upper roughness zone. The interference is receding — still perceptible as a 'buzz' in sustained tones, but approaching the threshold where your ear starts to separate them.`, spectrum: 'bark' });
  } else {
    facts.push({ text: `At ${barkDist.toFixed(2)} Bark, these harmonics are near the edge of the critical band. The roughness is subtle — more of a warmth or colour than outright dissonance. Many orchestrators use this range intentionally for richness.`, spectrum: 'bark' });
  }

  // Mel distance
  facts.push({ text: `Perceptually, these harmonics are ${melDiff.toFixed(0)} mel apart. For context, a whole tone in the middle register spans about 60–100 mel. ${melDiff < 40 ? "This tiny mel gap confirms that your brain barely distinguishes their pitches — it hears 'texture', not 'interval'." : "This is wide enough that your brain treats them as distinct pitch events competing for attention."}`, spectrum: 'mel' });

  // Cross-note analysis
  if (h1.note !== h2.note) {
    facts.push({ text: `This clash is a cross-note interference: ${h1.note} harmonic ${h1.degree} (${h1.freq.toFixed(0)} Hz) interacts with ${h2.note} harmonic ${h2.degree} (${h2.freq.toFixed(0)} Hz). These cross-note clashes define the 'colour' of the interval — they're why a perfect 5th sounds different from a perfect 4th even though both are consonant.` });

    // Near-miss resonance
    const nearestSimpleRatio = findNearestSimpleRatio(ratio);
    if (nearestSimpleRatio) {
      facts.push({ text: `The frequency ratio ${ratio.toFixed(4)} is close to the simple ratio ${nearestSimpleRatio.num}:${nearestSimpleRatio.den} (${(nearestSimpleRatio.num / nearestSimpleRatio.den).toFixed(4)}). Near-miss ratios create the most psychoacoustically interesting interference — almost consonant but with enough deviation to produce audible beating.` });
    }
  } else {
    facts.push({ text: `This is a same-note clash between harmonics ${h1.degree} and ${h2.degree} of ${h1.note}. These intra-note clashes shape the timbre of a single instrument — a bright trumpet has strong clashes here, while a mellow flute does not.` });
  }

  // Musical context
  if (centsDiff < 50) {
    facts.push({ text: `These harmonics are only ${centsDiff.toFixed(0)}¢ apart — less than a quartertone. In Western music this would be perceived as a single 'out-of-tune' note. In microtonal traditions (Arabic maqam, Indian shruti), intervals this small carry melodic meaning.`, spectrum: 'log' });
  }

  // Frequency range context
  if (lowerFreq > 2000 && lowerFreq < 5000) {
    facts.push({ text: `Both harmonics sit in the 2–5 kHz sensitivity peak of human hearing. Interference here is disproportionately noticeable because your ear canal naturally amplifies these frequencies by up to 20 dB.`, spectrum: 'hz' });
  }
  if (lowerFreq > 5000) {
    facts.push({ text: `These harmonics are above 5 kHz — in the sibilance and shimmer range. While the roughness is real, it contributes more to perceived 'brightness' and 'air' than to dissonance or pitch conflict.`, spectrum: 'hz' });
  }

  return facts;
};

// Helper: find nearest simple ratio (for interference pair analysis)
const findNearestSimpleRatio = (ratio: number): { num: number; den: number } | null => {
  const candidates = [
    { num: 1, den: 1 }, { num: 2, den: 1 }, { num: 3, den: 2 }, { num: 4, den: 3 },
    { num: 5, den: 4 }, { num: 5, den: 3 }, { num: 6, den: 5 }, { num: 7, den: 6 },
    { num: 8, den: 7 }, { num: 9, den: 8 }, { num: 7, den: 4 }, { num: 7, den: 5 },
  ];
  let best: { num: number; den: number } | null = null;
  let bestDiff = Infinity;
  for (const c of candidates) {
    const r = c.num / c.den;
    const diff = Math.abs(ratio - r);
    if (diff < 0.02 && diff < bestDiff && diff > 0.001) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
};

// ──────────────────────────────────────────────────
// CONTEXTUAL FACTS (considers both notes)
// Facts about the relationship between the two notes'
// full harmonic spectra
// ──────────────────────────────────────────────────
export const getContextualFacts = (
  harmonicsX: Harmonic[], harmonicsY: Harmonic[],
  stDiff: number, activeSpectrum?: string | null
): HarmonicFact[] => {
  const facts: HarmonicFact[] = [];
  if (!harmonicsX.length || !harmonicsY.length) return facts;

  const fundX = harmonicsX[0].freq;
  const fundY = harmonicsY[0].freq;
  const barkX = toBark(fundX);
  const barkY = toBark(fundY);
  const barkGap = Math.abs(barkX - barkY);
  const melGap = Math.abs(toMel(fundX) - toMel(fundY));

  // Near-coincident harmonics (resonances)
  const resonances: { hx: Harmonic; hy: Harmonic; cents: number }[] = [];
  for (const hx of harmonicsX) {
    for (const hy of harmonicsY) {
      const cents = Math.abs(1200 * Math.log2(hx.freq / hy.freq));
      if (cents < 50 && cents > 1) {
        resonances.push({ hx, hy, cents });
      }
    }
  }

  if (resonances.length > 0) {
    const closest = resonances.sort((a, b) => a.cents - b.cents)[0];
    facts.push({
      text: `Near-resonance detected: ${closest.hx.note} H${closest.hx.degree} (${closest.hx.freq.toFixed(0)} Hz) is only ${closest.cents.toFixed(1)}¢ from ${closest.hy.note} H${closest.hy.degree} (${closest.hy.freq.toFixed(0)} Hz). When harmonics nearly coincide like this, they create slow beating that can sound either beautifully shimmering or unsettling, depending on the timbre.`
    });
    if (resonances.length > 1) {
      facts.push({
        text: `This interval has ${resonances.length} near-resonance points across the harmonic series. More overlaps generally mean greater consonance — this is why simple ratios (2:1, 3:2) have many coincidences and sound 'pure'.`
      });
    }
  } else if (stDiff > 0 && stDiff < 12) {
    facts.push({
      text: `No near-resonances found in the first ${harmonicsX.length} harmonics. This means the overtone series of these two notes are largely independent — each harmonic occupies its own frequency 'slot'. This separation contributes to the distinctive colour of this interval.`
    });
  }

  // Bark fundamental gap analysis
  if (barkGap < 1.0 && stDiff > 0) {
    facts.push({
      text: `The fundamentals are only ${barkGap.toFixed(2)} Bark apart — within the same critical band. This means even the root notes create perceptible roughness. This is the biological basis of dissonance for this interval.`,
      spectrum: 'bark'
    });
  } else if (barkGap < 2.0 && stDiff > 0) {
    facts.push({
      text: `At ${barkGap.toFixed(2)} Bark apart, the fundamentals are just outside the critical band — resolved cleanly by your ear. But their lower harmonics (H2, H3) may still overlap in Bark space, creating the subtle richness that distinguishes live music from synthesised tones.`,
      spectrum: 'bark'
    });
  } else if (stDiff > 0) {
    facts.push({
      text: `The fundamentals are ${barkGap.toFixed(1)} Bark apart — well beyond the critical band. Your ear treats them as completely independent sounds. Any roughness in this interval comes entirely from upper harmonic interactions, not from the fundamentals themselves.`,
      spectrum: 'bark'
    });
  }

  // Mel gap analysis
  if (stDiff > 0) {
    const octaveMels = toMel(fundX * 2) - toMel(fundX);
    const pctOfOctave = (melGap / octaveMels * 100);
    facts.push({
      text: `Perceptually, the fundamental gap spans ${melGap.toFixed(0)} mel — about ${pctOfOctave.toFixed(0)}% of a perceived octave at this register. ${pctOfOctave < 30 ? "Your brain perceives this as a 'small' step, even if the Hz gap is substantial." : pctOfOctave > 80 ? "This is perceived as a 'wide' interval — your brain assigns the two notes to clearly separate pitch categories." : "This moderate perceived distance is typical of musically expressive intervals."}`,
      spectrum: 'mel'
    });
  }

  // Clash density analysis
  const totalClashes = (() => {
    let count = 0;
    for (const hx of harmonicsX) {
      for (const hy of harmonicsY) {
        if (hx.note === hy.note) continue;
        const dist = Math.abs(toBark(hx.freq) - toBark(hy.freq));
        if (dist >= 0.01 && dist < 1.0) count++;
      }
    }
    return count;
  })();

  if (stDiff > 0) {
    if (totalClashes === 0) {
      facts.push({
        text: `Zero cross-note clashes in the first ${harmonicsX.length} harmonics — this is remarkably clean. The overtone series of these two notes coexist without Bark-band conflict, which is why this interval sounds pure and stable.`
      });
    } else if (totalClashes <= 2) {
      facts.push({
        text: `Only ${totalClashes} cross-note clash${totalClashes === 1 ? '' : 'es'} between the harmonic series. This low clash count is characteristic of consonant intervals — the overtones 'avoid' each other's critical bands, creating a sense of harmonic clarity.`
      });
    } else if (totalClashes <= 5) {
      facts.push({
        text: `${totalClashes} cross-note clashes detected across the harmonic series. This moderate roughness is what gives this interval its character — enough tension to be interesting, but not so much that it sounds harsh.`
      });
    } else {
      facts.push({
        text: `${totalClashes} cross-note clashes across the harmonic series — high roughness. This dense interference pattern is why closely-spaced intervals sound 'tense'. Orchestrators manage this by using register and timbre to reduce the number of active harmonics.`
      });
    }
  }

  // Specific interval colour observations
  if (stDiff === 7) {
    const h3x = harmonicsX.find(h => h.degree === 3);
    const h2y = harmonicsY.find(h => h.degree === 2);
    if (h3x && h2y) {
      const gap = Math.abs(h3x.freq - h2y.freq);
      facts.push({
        text: `Perfect 5th signature: Note X's 3rd harmonic (${h3x.freq.toFixed(0)} Hz) aligns near Note Y's 2nd harmonic (${h2y.freq.toFixed(0)} Hz) — only ${gap.toFixed(1)} Hz apart. This near-perfect coincidence is the acoustic reason the 5th is the most consonant interval after the octave.`
      });
    }
  }
  if (stDiff === 5) {
    const h4x = harmonicsX.find(h => h.degree === 4);
    const h3y = harmonicsY.find(h => h.degree === 3);
    if (h4x && h3y) {
      const gap = Math.abs(h4x.freq - h3y.freq);
      facts.push({
        text: `Perfect 4th signature: Note X's 4th harmonic (${h4x.freq.toFixed(0)} Hz) aligns near Note Y's 3rd harmonic (${h3y.freq.toFixed(0)} Hz) — ${gap.toFixed(1)} Hz apart. This harmonic coincidence is why the 4th is the inversion of the 5th and almost as consonant.`
      });
    }
  }
  if (stDiff === 4) {
    const h5x = harmonicsX.find(h => h.degree === 5);
    const h4y = harmonicsY.find(h => h.degree === 4);
    if (h5x && h4y) {
      const gap = Math.abs(h5x.freq - h4y.freq);
      facts.push({
        text: `Major 3rd signature: Note X's 5th harmonic (${h5x.freq.toFixed(0)} Hz) aligns near Note Y's 4th harmonic (${h4y.freq.toFixed(0)} Hz) — ${gap.toFixed(1)} Hz apart. In equal temperament this gap is ~14 cents, which is why barbershop quartets and string ensembles tune 3rds 'just' for maximum resonance.`
      });
    }
  }

  return facts;
};

// ──────────────────────────────────────────────────
// AMBIENT FACTS (always available, register-aware)
// Facts based on the current frequencies and spectrum
// even when nothing is hovered or locked
// ──────────────────────────────────────────────────
export const getAmbientFacts = (
  freqX: number, freqY: number, stDiff: number, spectrum: string
): HarmonicFact[] => {
  const facts: HarmonicFact[] = [];
  const avgFreq = (freqX + freqY) / 2;
  const ratio = freqY / freqX;

  // Register-specific observations
  if (spectrum === 'hz') {
    if (avgFreq < 100) {
      facts.push({ text: `You're exploring the sub-bass register (< 100 Hz). Down here, sound is felt as much as heard — bass frequencies vibrate your chest cavity and can even affect heart rhythm at high amplitudes.`, spectrum: 'hz' });
      facts.push({ text: `At these low frequencies, the wavelength of sound is enormous — ${(343 / avgFreq).toFixed(1)} metres. This is why bass notes 'wrap around' obstacles and fill rooms, while treble is directional.`, spectrum: 'hz' });
    } else if (avgFreq < 300) {
      facts.push({ text: `The ${avgFreq.toFixed(0)} Hz range is where most male voices and cello fundamentals sit. Audio engineers call this the 'warmth' zone — boosting it makes recordings feel intimate.`, spectrum: 'hz' });
    } else if (avgFreq < 1000) {
      facts.push({ text: `Around ${avgFreq.toFixed(0)} Hz, most acoustic instruments have their fundamental energy. This is the 'body' of sound — cutting these frequencies makes any instrument sound thin.`, spectrum: 'hz' });
    } else if (avgFreq < 4000) {
      facts.push({ text: `The ${avgFreq.toFixed(0)} Hz region is where human hearing is most sensitive, thanks to the resonant frequency of the ear canal (~2.5 kHz). Sounds here appear louder than they actually are.`, spectrum: 'hz' });
    } else {
      facts.push({ text: `Above 4 kHz, you're in the 'presence' and 'air' bands. These frequencies add sparkle and definition but contribute almost nothing to perceived pitch — they're pure texture.`, spectrum: 'hz' });
    }
  }

  if (spectrum === 'log') {
    const octaveX = Math.log2(freqX / 440);
    const octaveY = Math.log2(freqY / 440);
    if (stDiff === 0) {
      facts.push({ text: `At unison, the log-scale position is ${Math.log2(freqX).toFixed(2)} octaves above 1 Hz. On this axis, every equal visual distance represents the same musical interval — a property no other scale has.`, spectrum: 'log' });
    }
    if (Math.abs(octaveX) < 0.5) {
      facts.push({ text: `Note X is near A4 (440 Hz) — the international standard pitch since 1955. Before standardisation, orchestras in different cities could be nearly a semitone apart, making touring musicians' lives difficult.`, spectrum: 'log' });
    }
    const centsFromET = Math.abs(1200 * Math.log2(ratio) - stDiff * 100);
    if (stDiff > 0 && centsFromET > 0.5) {
      facts.push({ text: `The actual frequency ratio (${ratio.toFixed(4)}) deviates from the equal-tempered ideal by ${centsFromET.toFixed(1)} cents. In 12-TET, this deviation is always zero by design — but in other tuning systems, it reveals the 'character' of each key.`, spectrum: 'log' });
    }
  }

  if (spectrum === 'bark') {
    const barkX = toBark(freqX);
    const barkY = toBark(freqY);
    const barkMid = (barkX + barkY) / 2;
    if (barkMid < 4) {
      facts.push({ text: `At ${barkMid.toFixed(1)} Bark, you're in the wide-band bass region. Critical bands here span 100+ Hz — your ear is essentially 'low-resolution' in the bass, which is why bass chords sound muddy with close voicings.`, spectrum: 'bark' });
    } else if (barkMid < 12) {
      facts.push({ text: `At ${barkMid.toFixed(1)} Bark, you're in the peak-resolution zone. Critical bands here are narrow (~100 Hz), giving your ear maximum ability to distinguish separate pitches. This is the sweet spot for harmony.`, spectrum: 'bark' });
    } else {
      facts.push({ text: `At ${barkMid.toFixed(1)} Bark, critical bands are widening again. Your cochlea is running out of physical space to separate frequencies — this is why very high harmonics merge into 'brightness' rather than distinct notes.`, spectrum: 'bark' });
    }
    facts.push({ text: `The Bark scale has ~24 bands total, named after Heinrich Barkhausen (1881-1956). Each band corresponds to a roughly 1.3mm section of the basilar membrane in your inner ear — the entire membrane is only about 35mm long.`, spectrum: 'bark' });
  }

  if (spectrum === 'mel') {
    const melX = toMel(freqX);
    const melY = toMel(freqY);
    const melMid = (melX + melY) / 2;
    if (melMid < 500) {
      facts.push({ text: `At ${melMid.toFixed(0)} mel, pitch perception is nearly linear — a 100 Hz increase 'sounds like' roughly 100 mel. Below 1000 Hz, your brain maps frequency to pitch almost 1:1.`, spectrum: 'mel' });
    } else if (melMid < 1500) {
      facts.push({ text: `At ${melMid.toFixed(0)} mel, you're in the transition zone where pitch perception starts to compress. From here upward, each doubling of frequency adds progressively fewer mel — the logarithmic nature of hearing takes over.`, spectrum: 'mel' });
    } else {
      facts.push({ text: `At ${melMid.toFixed(0)} mel, pitch perception is strongly compressed. Large Hz differences feel like small pitch changes. This is why melodies above ~2 kHz sound 'squeezed' and lose their intervallic clarity.`, spectrum: 'mel' });
    }
    if (stDiff > 0) {
      const melGap = Math.abs(melX - melY);
      const octaveMels = toMel(freqX * 2) - melX;
      facts.push({ text: `This interval spans ${melGap.toFixed(0)} mel — about ${(melGap / octaveMels * 100).toFixed(0)}% of a perceived octave at this register. The Mel scale was created in 1937 by Stevens, Volkmann & Newman to quantify exactly this kind of perceptual measurement.`, spectrum: 'mel' });
    }
  }

  return facts;
};
