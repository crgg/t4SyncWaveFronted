/**
 * Network latency estimator for music synchronization.
 *
 * Strategy:
 *  - Every incoming `playback-state` carries the server's wall-clock timestamp.
 *  - One-way latency ≈ Date.now() − serverTimestamp (valid when both clocks are NTP-synced,
 *    which is true for virtually every modern device within ≤ 50 ms).
 *  - We keep the last BUFFER_SIZE samples and return the MEDIAN to reject outliers
 *    (spikes caused by GC pauses, tab throttling, etc.).
 *  - We also add per-source overhead constants for Spotify's REST API startup delay.
 */

const BUFFER_SIZE = 8; // Rolling window size
const MIN_SAMPLE_MS = 0; // Reject negative (clock skew artefacts)
const MAX_SAMPLE_MS = 3000; // Reject absurd values (tab was backgrounded, etc.)
const DEFAULT_LATENCY_MS = 80; // Cold-start assumption before we have real data

/** Extra milliseconds the Spotify Web API takes to start audio after a PUT /play call */
export const SPOTIFY_PLAY_OVERHEAD_MS = 600;

/** Extra milliseconds a Spotify seek takes to be audible after the API call */
export const SPOTIFY_SEEK_OVERHEAD_MS = 150;

// Module-level rolling buffer (singleton — one estimator per browser tab)
const samples: number[] = [];

/**
 * Record a new one-way latency sample from a server timestamp.
 * Call this every time you receive a `playback-state` event.
 */
export function recordNetworkSample(serverTimestampMs: number): void {
  if (!serverTimestampMs || serverTimestampMs <= 0) return;
  const sample = Date.now() - serverTimestampMs;
  if (sample < MIN_SAMPLE_MS || sample > MAX_SAMPLE_MS) return;
  samples.push(sample);
  if (samples.length > BUFFER_SIZE) samples.shift();
}

/** Median of the rolling buffer — robust against outliers. */
export function getOneWayLatencyMs(): number {
  if (samples.length === 0) return DEFAULT_LATENCY_MS;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // For even-length arrays average the two middle values
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Compensate a position received from the server so it reflects "where the track
 * actually is right now" rather than "where it was when the server sent the message".
 *
 * @param positionSeconds  - Raw position from the server payload (seconds)
 * @param serverTimestampMs - Unix timestamp when the server emitted the event (ms)
 * @param isPlaying        - Whether playback is active; pause events don't need compensation
 * @param overheadMs       - Extra overhead to add (e.g. Spotify API startup time)
 */
export function compensatePositionSeconds(
  positionSeconds: number,
  serverTimestampMs: number | undefined,
  isPlaying: boolean,
  overheadMs = 0
): number {
  if (!isPlaying) return positionSeconds;

  let networkMs: number;
  if (serverTimestampMs && serverTimestampMs > 0) {
    // Record the sample *and* use this specific message's elapsed time —
    // it is the most accurate estimate for this particular message.
    recordNetworkSample(serverTimestampMs);
    const elapsed = Date.now() - serverTimestampMs;
    networkMs = elapsed >= 0 && elapsed < MAX_SAMPLE_MS ? elapsed : getOneWayLatencyMs();
  } else {
    networkMs = getOneWayLatencyMs();
  }

  return Math.max(0, positionSeconds + (networkMs + overheadMs) / 1000);
}

/**
 * Compensate a position that came from a REST API response (already stale by the time
 * the client reads it). Uses the server's `lastEventTime` as the reference point.
 *
 * @param positionSeconds  - Position in the server snapshot (seconds)
 * @param lastEventTimeMs  - When the server last updated the state (Unix ms)
 * @param isPlaying        - Whether playback was active when the snapshot was taken
 */
export function compensateStalePosition(
  positionSeconds: number,
  lastEventTimeMs: number | undefined | null,
  isPlaying: boolean
): number {
  if (!isPlaying || !lastEventTimeMs || lastEventTimeMs <= 0) return positionSeconds;
  const elapsed = Date.now() - lastEventTimeMs;
  // If stale by more than 5 minutes something is wrong — don't advance wildly
  if (elapsed < 0 || elapsed > 5 * 60 * 1000) return positionSeconds;
  return Math.max(0, positionSeconds + elapsed / 1000);
}

/** Debug helper — useful in the browser console during development */
export function getLatencyDebugInfo() {
  return {
    samples: [...samples],
    medianMs: getOneWayLatencyMs(),
    sampleCount: samples.length,
  };
}
