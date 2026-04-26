import { useEffect, useRef } from "react";
import { YouTubePlayerService } from "../services/YouTubePlayerService";
import type { YouTubePlayerCallbacks, YouTubePlayerHandle } from "../types/player";

interface YouTubePlayerSurfaceProps {
  isVisible: boolean;
  callbacks: YouTubePlayerCallbacks;
  onPlayerReady: (handle: YouTubePlayerHandle | null) => void;
}

export function YouTubePlayerSurface(props: YouTubePlayerSurfaceProps) {
  const { isVisible, callbacks, onPlayerReady } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const serviceRef = useRef<YouTubePlayerService | null>(null);

  useEffect(() => {
    const service = new YouTubePlayerService(callbacks);
    serviceRef.current = service;

    let mounted = true;

    const mountPlayer = async (): Promise<void> => {
      if (!hostRef.current) {
        return;
      }

      try {
        await service.mount(hostRef.current);
        if (!mounted) {
          return;
        }

        onPlayerReady({
          loadVideo: (videoId, autoplay) => service.loadVideo(videoId, autoplay),
          play: () => service.play(),
          pause: () => service.pause(),
          stop: () => service.stop(),
          seekTo: (seconds) => service.seekTo(seconds),
          setVolume: (volume) => service.setVolume(volume),
        });
      } catch {
        callbacks.onError();
      }
    };

    void mountPlayer();

    return () => {
      mounted = false;
      onPlayerReady(null);
      service.destroy();
      serviceRef.current = null;
    };
  }, [callbacks, onPlayerReady]);

  useEffect(() => {
    serviceRef.current?.setCallbacks(callbacks);
  }, [callbacks]);

  return (
    <div className={`youtube-surface ${isVisible ? "is-visible" : ""}`}>
      <div className="youtube-frame-host" ref={hostRef} />
    </div>
  );
}
