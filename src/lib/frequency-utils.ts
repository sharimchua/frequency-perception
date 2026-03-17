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
