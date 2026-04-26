import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

interface AddTrackPanelProps {
  onAddLocalFiles: (files: File[]) => Promise<void>;
  onAddYouTubeSong: (input: {
    url: string;
    title: string;
    artist: string;
  }) => Promise<void>;
}

export function AddTrackPanel({ onAddLocalFiles, onAddYouTubeSong }: AddTrackPanelProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeArtist, setYoutubeArtist] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLocalInput = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLocalFiles(files);
    } finally {
      setIsSubmitting(false);
      event.target.value = "";
    }
  };

  const handleAddYouTube = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onAddYouTubeSong({
        url: youtubeUrl,
        title: youtubeTitle,
        artist: youtubeArtist,
      });

      setYoutubeUrl("");
      setYoutubeTitle("");
      setYoutubeArtist("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel add-track-panel" aria-label="Track sources">
      <h2 className="panel-title">Add Music Source</h2>

      <div className="source-block">
        <label className="source-label" htmlFor="local-file-input">
          Add local song
        </label>
        <input
          id="local-file-input"
          className="input-field"
          type="file"
          accept="audio/*"
          multiple
          disabled={isSubmitting}
          onChange={handleLocalInput}
        />
      </div>

      <form className="source-block" onSubmit={(event) => void handleAddYouTube(event)}>
        <label className="source-label" htmlFor="youtube-url-input">
          Add YouTube song
        </label>
        <input
          id="youtube-url-input"
          className="input-field"
          type="url"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
          disabled={isSubmitting}
        />
        <input
          className="input-field"
          type="text"
          value={youtubeTitle}
          onChange={(event) => setYoutubeTitle(event.target.value)}
          placeholder="Title (optional)"
          disabled={isSubmitting}
        />
        <input
          className="input-field"
          type="text"
          value={youtubeArtist}
          onChange={(event) => setYoutubeArtist(event.target.value)}
          placeholder="Artist (optional)"
          disabled={isSubmitting}
        />
        <button className="btn-primary" type="submit" disabled={isSubmitting}>
          Save YouTube song
        </button>
      </form>
    </section>
  );
}
