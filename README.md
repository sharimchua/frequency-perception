# Harmonic Frequency Analyzer

A React-based web application that visualizes sound frequencies across multiple psychoacoustic domains (Physical, Theoretical, Biological, Psychological). Discover the science of pitch, intervals, and harmonics, built specifically for [Midlife Muso](https://midlifemuso.com).

## Overview

The Harmonic Frequency Analyzer allows you to compare two musical notes (Note A and Note B) and visualize their harmonic series to identify phenomena such as auditory interference (roughness) and tonal consonance. It plots frequencies across four scales:
- **Physical (Hz):** Absolute air vibration (exponential spacing).
- **Theoretical (Log):** Traditional music theory view (linear spacing for intervals).
- **Biological (Bark):** Ear resolution model showing critical bands.
- **Psychological (Mel):** Perceived pitch distance.

## Tech Stack

- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed. This project uses `npm` as the package manager.

```sh
# Clone the repository
git clone https://github.com/sharimchua/harmonic-frequency-analyzer.git
cd harmonic-frequency-analyzer

# Install dependencies
npm install
```

### Running Locally

To start the Vite development server:
```sh
npm run dev
```
The application will be available at `http://localhost:8080/`.

### Building for Production
```sh
npm run build
```
The output will be compiled to the `/dist` directory.

### Testing
- **Unit/Component Testing**: `npm run test` (Using Vitest)
- **E2E Testing**: Add your playwright tests and run `npx playwright test` (if configured).

## License

This project belongs to Midlife Muso.
