import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Upload, PlaySquare, Loader2, Music2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/Button";

interface AddTrackPanelProps {
  onUploadLocalFile: (file: File) => Promise<void>;
  onAddYouTubeSong: (input: { url: string; title: string; artist: string }) => Promise<void>;
}

export function AddTrackPanel({ onUploadLocalFile, onAddYouTubeSong }: AddTrackPanelProps) {
  const { sourceMode } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube form state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeArtist, setYoutubeArtist] = useState("");

  // ── Local mode handlers ───────────────────────────────────────────────────

  const processFiles = async (files: File[]): Promise<void> => {
    const audioFiles = files.filter((f) => f.type.startsWith("audio/"));
    if (audioFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      for (const file of audioFiles) {
        await onUploadLocalFile(file);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  // ── YouTube form handler ──────────────────────────────────────────────────

  const handleAddYouTube = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
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
    <section className="panel add-track-panel" aria-label="Add music">
      <div className="panel-header-row">
        <h2 className="panel-title">Add Music</h2>
        {isSubmitting && <Loader2 size={16} className="spin-icon" aria-label="Uploading…" />}
      </div>

      {/* ── LOCAL MODE ── */}
      {sourceMode === "LOCAL" && (
        <div
          className={`drop-zone ${isDragging ? "is-dragging" : ""} ${isSubmitting ? "is-disabled" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => void handleDrop(e)}
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop audio files here or click to browse"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        >
          <Upload size={28} className="drop-zone-icon" />
          <p className="drop-zone-title">
            {isSubmitting ? "Uploading to server…" : "Drop audio files here"}
          </p>
          <p className="drop-zone-sub">or click to browse · MP3, FLAC, AAC, OGG…</p>
          <input
            ref={fileInputRef}
            id="local-file-input"
            type="file"
            accept="audio/*"
            multiple
            disabled={isSubmitting}
            onChange={(e) => void handleFileInput(e)}
            className="drop-zone-input"
          />
        </div>
      )}

      {/* ── ONLINE MODE ── */}
      {sourceMode === "ONLINE" && (
        <form className="yt-form" onSubmit={(e) => void handleAddYouTube(e)} noValidate>
          <div className="yt-form-header">
            <PlaySquare size={18} className="yt-icon" />
            <span>Add YouTube Song</span>
          </div>

          <label htmlFor="yt-url" className="source-label">YouTube URL</label>
          <input
            id="yt-url"
            className="input-field"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            required
            disabled={isSubmitting}
          />

          <label htmlFor="yt-title" className="source-label">Title <span className="optional">(optional)</span></label>
          <input
            id="yt-title"
            className="input-field"
            type="text"
            value={youtubeTitle}
            onChange={(e) => setYoutubeTitle(e.target.value)}
            placeholder="Song title"
            disabled={isSubmitting}
          />

          <label htmlFor="yt-artist" className="source-label">Artist <span className="optional">(optional)</span></label>
          <input
            id="yt-artist"
            className="input-field"
            type="text"
            value={youtubeArtist}
            onChange={(e) => setYoutubeArtist(e.target.value)}
            placeholder="Artist name"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting || !youtubeUrl.trim()}
          >
            <Music2 size={15} /> Add YouTube Song
          </Button>
        </form>
      )}
    </section>
  );
}
