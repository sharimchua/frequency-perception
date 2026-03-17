export const MIN_F = 20;
export const MAX_F = 6000;
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

export const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
export const freqToMidi = (f: number) => 12 * Math.log2(f / 440) + 69;
export const toBark = (f: number) => 13 * Math.atan(0.00076 * f) + 3.5 * Math.atan(Math.pow(f / 7500, 2));
export const toMel = (f: number) => 2595 * Math.log10(1 + f / 700);

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

export const INTERVAL_FACTS: Record<number, string[]> = {
  0: [
    "Unison — two identical frequencies create constructive interference, doubling amplitude. This is why choirs and orchestral sections sound so powerful.",
    "When two instruments play in unison, tiny tuning differences create a shimmering 'chorus' effect — this beating is actually the sum and difference of their frequencies.",
    "The human ear can detect pitch differences as small as 3–5 cents. In unison, even these micro-deviations create perceivable texture."
  ],
  1: [
    "The minor 2nd (ratio ~16:15) is the most dissonant interval — the frequencies are close enough to trigger 'roughness' on the basilar membrane of your inner ear.",
    "In horror film scores, the minor 2nd is used extensively because its beating frequency falls in the 20–30 Hz range, triggering anxiety responses.",
    "The semitone is the smallest interval in Western music, but in Arabic maqam, quarter-tones split it further — our 12-TET system is actually a compromise."
  ],
  2: [
    "The major 2nd (ratio 9:8) is the interval of a whole step — the building block of major scales. Its Bark distance is about 1.5z, right at the edge of roughness.",
    "When you sing 'Happy Birthday', the first two notes are a major 2nd apart. It's one of the most natural intervals for the human voice.",
    "Two notes a whole tone apart create a beat frequency that's audible as a distinct wobble — this is how piano tuners verify their work."
  ],
  3: [
    "The minor 3rd (ratio 6:5) is the interval of sadness in Western music — but in many cultures it carries no emotional connotation at all.",
    "Biologically, the minor 3rd falls in a 'sweet spot' on the Bark scale where our ears can distinguish both notes clearly while still perceiving their harmonic relationship.",
    "The opening of Beethoven's 5th Symphony — 'da-da-da-DUM' — spans a minor 3rd. It's one of the most recognised intervals in music history."
  ],
  4: [
    "The major 3rd (ratio 5:4) is the interval of joy. In just intonation it's perfectly consonant; in equal temperament it's 14 cents sharp — the biggest compromise in 12-TET.",
    "Barbershop quartets tune their major 3rds to the pure 5:4 ratio, creating audible 'combination tones' that sound like a phantom fifth voice.",
    "Your brain processes major 3rds differently from minor 3rds — fMRI studies show distinct activation patterns in the auditory cortex for each."
  ],
  5: [
    "The perfect 4th (ratio 4:3) was considered the most consonant interval in medieval music — more important than the 3rd. Rules of counterpoint were built around it.",
    "The 4th is an 'inverted 5th' — flip any perfect 5th and you get a 4th. Together they divide the octave into two interlocking consonances.",
    "Car horns in the US are typically tuned to a perfect 4th (F and B♭). The interval is piercing yet harmonically stable — perfect for alerts."
  ],
  6: [
    "The tritone (ratio 45:32) divides the octave exactly in half on the log scale. Medieval musicians called it 'Diabolus in Musica' — the Devil's interval.",
    "The tritone is unique: it's its own inversion. Go up 6 semitones or down 6 semitones — you arrive at the same interval class.",
    "Emergency vehicle sirens often alternate between notes a tritone apart because the interval is maximally attention-grabbing to the human auditory system."
  ],
  7: [
    "The perfect 5th (ratio 3:2) is the most consonant interval after the octave. It's the foundation of Pythagorean tuning and the Circle of Fifths.",
    "When you stack perfect 5ths, you generate all 12 notes of the chromatic scale — but you overshoot by 23.5 cents (the 'Pythagorean comma'). This tiny error shaped all of Western tuning history.",
    "Most power chords in rock music are bare 5ths. The interval is so consonant that distortion doesn't destroy its clarity — unlike 3rds, which turn muddy."
  ],
  8: [
    "The minor 6th (ratio 8:5) is the inversion of the major 3rd. It has a bittersweet quality — consonant but with an underlying tension.",
    "The opening interval of 'Love Story' is a minor 6th. Composers use it for longing and nostalgia because it resolves 'inward' toward the 5th.",
    "On the Mel scale, the minor 6th covers a substantial perceptual distance — your brain perceives it as a 'wide' interval even in the bass register."
  ],
  9: [
    "The major 6th (ratio 5:3) is used in the 'NBC chime' — three notes spanning a major 6th. It's one of the most recognisable sonic logos ever created.",
    "The major 6th is the inversion of the minor 3rd. Inverting intervals swaps their emotional quality: the 'sad' minor 3rd becomes the 'warm' major 6th.",
    "In the Bark scale, a major 6th spans about 5–7 critical bands, meaning your ear processes both notes with completely independent neural channels."
  ],
  10: [
    "The minor 7th (ratio 9:5) is the interval of dominant 7th chords — the most 'restless' chord in Western harmony, always wanting to resolve.",
    "Blues music is built on minor 7ths. The 'blue note' is actually a pitch-bent minor 7th that doesn't exist in standard 12-TET tuning.",
    "The minor 7th produces a beating rate that's fast enough to be perceived as 'buzzy' but slow enough to still hear both notes — right at the roughness boundary."
  ],
  11: [
    "The major 7th (ratio 15:8) is simultaneously dissonant and beautiful. Jazz musicians call it the 'jazz interval' — it defines the maj7 chord's dreamy quality.",
    "The major 7th is only one semitone from the octave, creating strong 'leading tone' pull — your brain expects resolution to the octave so strongly it's almost physical.",
    "Ravel and Debussy used stacked major 7ths to create the 'impressionist' sound — the interval's harmonic complexity produces rich, shimmering overtone interactions."
  ],
  12: [
    "The octave (ratio 2:1) is the most fundamental interval in all of music. Every culture on Earth recognises octave equivalence — a C4 and C5 are perceived as the 'same note'.",
    "Octave equivalence is hardwired into your auditory cortex. Neurons that fire for 440 Hz also fire for 880 Hz — they literally share neural circuitry.",
    "When you double a frequency, every harmonic of the lower note aligns perfectly with every other harmonic of the upper note. Zero beating. Perfect consonance."
  ],
};

// Fun facts about specific harmonics, contextual to the spectrum being viewed
export interface HarmonicFact {
  text: string;
  spectrum?: 'hz' | 'log' | 'bark' | 'mel'; // if set, only shown on this spectrum
}

export const getHarmonicFacts = (degree: number, freq: number, noteName: string): HarmonicFact[] => {
  const tet = getClosest12TET(freq);
  const centsOff = Math.abs(tet.cents);

  const facts: HarmonicFact[] = [];

  // Fundamental-specific facts
  if (degree === 1) {
    if (freq >= 420 && freq <= 460) {
      facts.push({ text: `${freq.toFixed(1)} Hz is near concert pitch A4 (440 Hz) — the universal tuning reference adopted in 1955. Before that, 'concert A' varied from 415 Hz to 465 Hz across Europe.` });
    }
    if (freq >= 256 && freq <= 264) {
      facts.push({ text: `This is near 'middle C' (~261.6 Hz) — the centre of the piano keyboard and the reference point for the scientific pitch standard where C4 = 256 Hz exactly.` });
    }
    if (freq < 80) {
      facts.push({ text: `Below 80 Hz, your ear struggles to identify pitch precisely. You feel these frequencies as much as hear them — bass is as much tactile as auditory.`, spectrum: 'hz' });
      facts.push({ text: `At this low frequency, the Bark scale compresses heavily — your cochlea dedicates very few hair cells to resolving bass, which is why bass notes sound 'muddy' together.`, spectrum: 'bark' });
    }
    if (freq > 2000) {
      facts.push({ text: `Above 2 kHz, your ear is at peak sensitivity — the ear canal resonance amplifies these frequencies by up to 20 dB. This is why high-pitched sounds feel 'louder'.`, spectrum: 'hz' });
    }
    facts.push({ text: `The fundamental (H1) at ${freq.toFixed(1)} Hz defines the perceived pitch. All other harmonics add timbre — the colour that distinguishes a guitar from a piano playing the same note.` });
    if (centsOff > 10) {
      facts.push({ text: `This frequency is ${tet.cents > 0 ? '+' : ''}${tet.cents.toFixed(1)}¢ from ${tet.name} in equal temperament. Deviations over 10¢ are noticeable to trained ears.`, spectrum: 'log' });
    }
  }

  // Harmonic-specific facts
  if (degree === 2) {
    facts.push({ text: `The 2nd harmonic (octave) at ${freq.toFixed(1)} Hz is exactly double the fundamental. It reinforces the root pitch and adds warmth and body to the sound.` });
    facts.push({ text: `On the Bark scale, this harmonic lands at ${toBark(freq).toFixed(1)}z. The wider the Bark gap from H1, the more independently your ear processes it.`, spectrum: 'bark' });
    facts.push({ text: `On the log scale, octaves are equally spaced — every doubling moves the same visual distance. This is why the log view maps directly to how musicians think about pitch.`, spectrum: 'log' });
  }
  if (degree === 3) {
    facts.push({ text: `The 3rd harmonic (octave + fifth) at ${freq.toFixed(1)} Hz is what gives brass instruments their characteristic 'bright' quality. Trumpets emphasise this partial strongly.` });
    facts.push({ text: `On the Mel scale, this harmonic at ${toMel(freq).toFixed(0)} mel shows the perceived pitch distance from the fundamental. The Mel scale was derived from listener experiments in the 1930s.`, spectrum: 'mel' });
  }
  if (degree === 4) {
    facts.push({ text: `The 4th harmonic (two octaves up) at ${freq.toFixed(1)} Hz. Clarinets are unusual — they naturally suppress even harmonics, which is why they sound 'hollow' compared to oboes.` });
  }
  if (degree === 5) {
    facts.push({ text: `The 5th harmonic (two octaves + major 3rd) at ${freq.toFixed(1)} Hz creates the 'sweetness' in a sound. It's the basis of the pure major triad in the harmonic series.` });
    facts.push({ text: `This harmonic is 14 cents flatter than the equal-tempered major 3rd — the difference between 'just' and 'equal' that makes barbershop singing sound uniquely resonant.`, spectrum: 'log' });
    facts.push({ text: `At ${toBark(freq).toFixed(1)} Bark, the 5th harmonic sits in a region where your ear has excellent frequency resolution — beating with nearby harmonics from other notes is clearly audible here.`, spectrum: 'bark' });
  }
  if (degree === 6) {
    facts.push({ text: `The 6th harmonic (two octaves + fifth) at ${freq.toFixed(1)} Hz. Beyond H6, harmonics contribute increasingly to 'brilliance' and 'edge' rather than perceived pitch.` });
    if (freq > 4000) {
      facts.push({ text: `At ${freq.toFixed(0)} Hz, this harmonic enters the region of peak ear sensitivity (2–5 kHz). It contributes significantly to how 'present' and 'bright' the sound feels.`, spectrum: 'hz' });
    }
  }

  // Generic frequency-range facts
  if (freq >= 1000 && freq <= 4000 && degree > 1) {
    facts.push({ text: `${freq.toFixed(0)} Hz falls in the speech-critical range (1–4 kHz). This is why overtones in this region make instruments 'cut through' a mix — your ear evolved to prioritise these frequencies for language.`, spectrum: 'hz' });
  }
  if (freq >= 100 && freq <= 300 && degree === 1) {
    facts.push({ text: `The ${freq.toFixed(0)} Hz range is the 'warmth' zone in audio engineering. Most male speaking voices have fundamentals here, which is why we find these frequencies comforting.`, spectrum: 'hz' });
  }

  return facts;
};
