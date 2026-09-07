// Hassas Kuyumcu Terazisi Donanım ve Protokol Sabitleri

export const SCALE_CONSTANTS = {
  DEFAULT_BAUD_RATE: 9600,
  DEFAULT_DATA_BITS: 8 as const,
  DEFAULT_STOP_BITS: 1 as const,
  DEFAULT_TIMEOUT_MS: 8000,
  ERROR_DISPLAY_MS: 3000,
  UNIT_GRAM: 'g',
  UNIT_CARAT: 'ct',
} as const;

export const SCALE_STABILITY = {
  STABLE: 'stable',
  UNSTABLE: 'unstable',
} as const;

export const SCALE_SOURCES = {
  HARDWARE: 'hardware',
  SIMULATION: 'simulation',
} as const;
