export interface HiResDetectionResult {
  isHiRes: boolean;
  bitrateKbps: number | null;
}

export function detectHiResFromLocalTrack(fileSizeBytes: number, durationSeconds: number): HiResDetectionResult {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    const isHiResFromSize = fileSizeBytes >= 45 * 1024 * 1024;
    return {
      isHiRes: isHiResFromSize,
      bitrateKbps: null,
    };
  }

  const bitrateKbps = Math.round(((fileSizeBytes * 8) / durationSeconds) / 1000);
  const isHiRes = bitrateKbps >= 1000;

  return {
    isHiRes,
    bitrateKbps,
  };
}

export function detectHiResFromTextHint(title: string, artist: string): HiResDetectionResult {
  const normalized = `${title} ${artist}`.toLowerCase();
  const match = /(hi[\s-]?res|24\s?bit|96\s?k|192\s?k|lossless|flac|studio\s?master)/.test(normalized);

  return {
    isHiRes: match,
    bitrateKbps: null,
  };
}
