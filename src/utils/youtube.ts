const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname === "youtu.be") {
      const value = url.pathname.replace("/", "").trim();
      return YOUTUBE_ID_PATTERN.test(value) ? value : null;
    }

    if (url.pathname.startsWith("/shorts/")) {
      const value = url.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
      return YOUTUBE_ID_PATTERN.test(value) ? value : null;
    }

    if (url.pathname.startsWith("/embed/")) {
      const value = url.pathname.split("/embed/")[1]?.split("/")[0] ?? "";
      return YOUTUBE_ID_PATTERN.test(value) ? value : null;
    }

    const watchId = url.searchParams.get("v")?.trim() ?? "";
    return YOUTUBE_ID_PATTERN.test(watchId) ? watchId : null;
  } catch {
    return null;
  }
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
    playsinline: "1",
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
