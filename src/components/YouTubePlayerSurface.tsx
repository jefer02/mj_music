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
  // Store stable refs so we don't re-mount when callbacks identity changes
  const callbacksRef = useRef(callbacks);
  const onPlayerReadyRef = useRef(onPlayerReady);

  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady; }, [onPlayerReady]);

  // Mount once — update callbacks via ref to avoid dependency loop
  useEffect(() => {
    const service = new YouTubePlayerService({
      onPlay: () => callbacksRef.current.onPlay(),
      onPause: () => callbacksRef.current.onPause(),
      onEnded: () => callbacksRef.current.onEnded(),
      onDurationChange: (d) => callbacksRef.current.onDurationChange(d),
      onTimeUpdate: (t) => callbacksRef.current.onTimeUpdate(t),
      onError: () => callbacksRef.current.onError(),
    });
    serviceRef.current = service;
    let mounted = true;

    const mount = async (): Promise<void> => {
      if (!hostRef.current) return;
      try {
        await service.mount(hostRef.current);
        if (!mounted) return;
        onPlayerReadyRef.current({
          loadVideo: (videoId, autoplay) => service.loadVideo(videoId, autoplay),
          play: () => service.play(),
          pause: () => service.pause(),
          stop: () => service.stop(),
          seekTo: (s) => service.seekTo(s),
          setVolume: (v) => service.setVolume(v),
        });
      } catch {
        callbacksRef.current.onError();
      }
    };

    void mount();

    return () => {
      mounted = false;
      onPlayerReadyRef.current(null);
      service.destroy();
      serviceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — refs keep everything stable

  return (
    <div className={`youtube-surface ${isVisible ? "is-visible" : ""}`}>
      <div className="youtube-frame-host" ref={hostRef} />
    </div>
  );
}
