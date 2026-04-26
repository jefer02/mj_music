import jsmediatags from "jsmediatags";

export interface SongTagReadResult {
  title: string | null;
  artist: string | null;
  coverDataUrl: string | null;
}

export async function readSongTags(file: Blob): Promise<SongTagReadResult> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (result: { tags: { title?: unknown; artist?: unknown; picture?: unknown } }) => {
        resolve({
          title: normalizeTagText(result.tags.title),
          artist: normalizeTagText(result.tags.artist),
          coverDataUrl: pictureTagToDataUrl(result.tags.picture),
        });
      },
      onError: () => {
        resolve({
          title: null,
          artist: null,
          coverDataUrl: null,
        });
      },
    });
  });
}

export async function readAudioDuration(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve) => {
      const audio = new Audio(objectUrl);
      let resolved = false;

      const finish = (duration: number): void => {
        if (resolved) {
          return;
        }

        resolved = true;
        resolve(duration);
      };

      audio.addEventListener("loadedmetadata", () => {
        finish(Number.isFinite(audio.duration) ? audio.duration : 0);
      });

      audio.addEventListener("error", () => {
        finish(0);
      });

      window.setTimeout(() => {
        finish(0);
      }, 2500);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function parseFileNameFallback(fileName: string): { title: string; artist: string } {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const split = nameWithoutExtension.split(" - ");

  if (split.length > 1) {
    return {
      artist: split[0].trim() || "Unknown artist",
      title: split.slice(1).join(" - ").trim() || nameWithoutExtension,
    };
  }

  return {
    title: nameWithoutExtension,
    artist: "Unknown artist",
  };
}

export function buildSongId(prefix: string = "song"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTagText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

function pictureTagToDataUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const picture = value as { data?: unknown; format?: unknown };
  if (!Array.isArray(picture.data) || picture.data.length === 0) {
    return null;
  }

  const mimeType = typeof picture.format === "string" ? picture.format : "image/jpeg";
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < picture.data.length; index += chunkSize) {
    const chunk = picture.data.slice(index, index + chunkSize) as number[];
    binary += String.fromCharCode(...chunk);
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}
