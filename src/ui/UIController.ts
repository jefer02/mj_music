/**
 * UIController.ts
 * Handles all UI interactions for MJ Music.
 * Visible text is in Spanish, while internal logic can stay in English.
 */

import { Song } from "../models/Song";
import { Playlist } from "../core/Playlist";
import { MusicPlayer } from "../core/MusicPlayer";
import { StorageService } from "../services/StorageService";


const LIBRARY_PLAYLIST_ID = "library";
const THEME_STORAGE_KEY = "mjmusic_theme";

type ThemeMode = "light" | "dark";

export class UIController {
  private player: MusicPlayer;
  private storage: StorageService;

  // State
  private playlists: Playlist[] = [];
  private activePlaylist: Playlist | null = null;
  private allSongs: Map<string, Song> = new Map();
  private selectedSongIds: Set<string> = new Set();
  private currentTheme: ThemeMode = "light";
  private notificationTimer: ReturnType<typeof setTimeout> | null = null;

  private elements: {
    songList: HTMLElement;
    playlistsList: HTMLElement;
    currentTitle: HTMLElement;
    currentArtist: HTMLElement;
    progressBar: HTMLInputElement;
    progressFill: HTMLElement;
    currentTime: HTMLElement;
    totalTime: HTMLElement;
    btnPlay: HTMLButtonElement;
    btnPrev: HTMLButtonElement;
    btnNext: HTMLButtonElement;
    btnLoad: HTMLButtonElement;
    fileInput: HTMLInputElement;
    volumeSlider: HTMLInputElement;
    playlistNameInput: HTMLInputElement;
    btnCreatePlaylist: HTMLButtonElement;
    btnSelectAllSongs: HTMLButtonElement;
    btnClearSongSelection: HTMLButtonElement;
    btnAddSelectedToActive: HTMLButtonElement;
    activePlaylistName: HTMLElement;
    songCount: HTMLElement;
    notification: HTMLElement;
    dropZone: HTMLElement;
    playlistSongSelector: HTMLElement;
    playlistRuleMsg: HTMLElement;
    btnThemeToggle: HTMLButtonElement;
  };

  constructor(player: MusicPlayer, storage: StorageService) {
    this.player = player;
    this.storage = storage;

    this.elements = {
      songList: this.getRequiredElement<HTMLElement>("song-list"),
      playlistsList: this.getRequiredElement<HTMLElement>("playlists-list"),
      currentTitle: this.getRequiredElement<HTMLElement>("current-title"),
      currentArtist: this.getRequiredElement<HTMLElement>("current-artist"),
      progressBar: this.getRequiredElement<HTMLInputElement>("progress-bar"),
      progressFill: this.getRequiredElement<HTMLElement>("progress-fill"),
      currentTime: this.getRequiredElement<HTMLElement>("current-time"),
      totalTime: this.getRequiredElement<HTMLElement>("total-time"),
      btnPlay: this.getRequiredElement<HTMLButtonElement>("btn-play"),
      btnPrev: this.getRequiredElement<HTMLButtonElement>("btn-prev"),
      btnNext: this.getRequiredElement<HTMLButtonElement>("btn-next"),
      btnLoad: this.getRequiredElement<HTMLButtonElement>("btn-load"),
      fileInput: this.getRequiredElement<HTMLInputElement>("file-input"),
      volumeSlider: this.getRequiredElement<HTMLInputElement>("volume-slider"),
      playlistNameInput: this.getRequiredElement<HTMLInputElement>("playlist-name-input"),
      btnCreatePlaylist: this.getRequiredElement<HTMLButtonElement>("btn-create-playlist"),
      btnSelectAllSongs: this.getRequiredElement<HTMLButtonElement>("btn-select-all-songs"),
      btnClearSongSelection: this.getRequiredElement<HTMLButtonElement>("btn-clear-song-selection"),
      btnAddSelectedToActive: this.getRequiredElement<HTMLButtonElement>("btn-add-selected-to-active"),
      activePlaylistName: this.getRequiredElement<HTMLElement>("active-playlist-name"),
      songCount: this.getRequiredElement<HTMLElement>("song-count"),
      notification: this.getRequiredElement<HTMLElement>("notification"),
      dropZone: this.getRequiredElement<HTMLElement>("drop-zone"),
      playlistSongSelector: this.getRequiredElement<HTMLElement>("playlist-song-selector"),
      playlistRuleMsg: this.getRequiredElement<HTMLElement>("playlist-rule-msg"),
      btnThemeToggle: this.getRequiredElement<HTMLButtonElement>("btn-theme-toggle"),
    };

    this.bindPlayerEvents();
    this.bindUIEvents();
    this.loadThemeFromStorage();
    this.setPlayButtonState(false);
  }

  /**
   * Loads persisted data and builds the initial UI state.
   */
  async loadPersistedData(): Promise<void> {
    const songsMetadata = this.storage.loadSongsMetadata();
    const restoredSongs = await this.storage.restoreSongs(songsMetadata);
    restoredSongs.forEach((song) => this.allSongs.set(song.id, song));

    const libraryPlaylist = new Playlist("Biblioteca general", LIBRARY_PLAYLIST_ID);
    restoredSongs.forEach((song) => libraryPlaylist.addLast(song));

    this.playlists = [libraryPlaylist];

    const playlistsData = this.storage.loadPlaylistsData();

    for (const pd of playlistsData) {
      if (pd.id === LIBRARY_PLAYLIST_ID) {
        continue;
      }

      const playlist = new Playlist(pd.name, pd.id);

      for (const meta of pd.songs) {
        const song = this.allSongs.get(meta.id);
        if (song) {
          playlist.addLast(song);
        }
      }

      if (pd.currentSongId) {
        playlist.selectById(pd.currentSongId);
      }

      this.playlists.push(playlist);
    }

    this.setActivePlaylist(libraryPlaylist);
    this.renderPlaylists();
    this.renderSongSelector();
    this.updatePlaylistCreationAvailability();
    this.updateNowPlaying();
  }

  private bindPlayerEvents(): void {
    this.player.on("play", () => {
      this.setPlayButtonState(true);
      this.updateNowPlaying();
      this.renderSongList();
    });

    this.player.on("pause", () => {
      this.setPlayButtonState(false);
    });

    this.player.on("songChanged", () => {
      this.updateNowPlaying();
      this.renderSongList();
    });

    this.player.on("timeUpdate", () => {
      this.updateProgress();
    });

    this.player.on("durationLoaded", () => {
      const song = this.player.currentSong;
      if (song) {
        this.elements.totalTime.textContent = song.durationFormatted;
        this.renderSongList(); // refresh duration shown in list
      }
    });

    this.player.on("ended", () => {
      this.setPlayButtonState(false);
    });

    this.player.on("error", () => {
      this.notify("No se pudo reproducir la cancion seleccionada", "error");
    });
  }

  private bindUIEvents(): void {
    this.elements.btnLoad.addEventListener("click", () => {
      this.elements.fileInput.click();
    });

    this.elements.dropZone.addEventListener("click", () => {
      this.elements.fileInput.click();
    });

    this.elements.dropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.elements.fileInput.click();
      }
    });

    this.elements.fileInput.addEventListener("change", (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        void this.handleIncomingFiles(Array.from(files));
      }
      this.elements.fileInput.value = "";
    });

    const preventDefaults = (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
    };

    this.elements.dropZone.addEventListener("dragover", (event) => {
      preventDefaults(event);
      this.elements.dropZone.classList.add("drag-over");
    });

    this.elements.dropZone.addEventListener("dragleave", (event) => {
      preventDefaults(event);
      this.elements.dropZone.classList.remove("drag-over");
    });

    this.elements.dropZone.addEventListener("drop", (event) => {
      preventDefaults(event);
      this.elements.dropZone.classList.remove("drag-over");

      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        void this.handleIncomingFiles(Array.from(files));
      }
    });

    window.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    window.addEventListener("drop", (event) => {
      event.preventDefault();
    });

    this.elements.btnPlay.addEventListener("click", () => this.player.togglePlay());
    this.elements.btnPrev.addEventListener("click", () => this.player.previous());
    this.elements.btnNext.addEventListener("click", () => this.player.next());

    this.elements.progressBar.addEventListener("input", () => {
      const pct = parseFloat(this.elements.progressBar.value);
      this.player.seekTo((pct / 100) * this.player.duration);
    });

    this.elements.volumeSlider.addEventListener("input", () => {
      this.player.setVolume(parseFloat(this.elements.volumeSlider.value) / 100);
    });

    this.elements.btnCreatePlaylist.addEventListener("click", () => this.createPlaylistFromSelection());
    this.elements.playlistNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.createPlaylistFromSelection();
      }
    });

    this.elements.btnSelectAllSongs.addEventListener("click", () => {
      this.selectAllSongsInSelector();
    });

    this.elements.btnClearSongSelection.addEventListener("click", () => {
      this.clearSongSelection();
    });

    this.elements.btnAddSelectedToActive.addEventListener("click", () => {
      this.addSelectedSongsToActivePlaylist();
    });

    this.elements.btnThemeToggle.addEventListener("click", () => {
      this.toggleTheme();
    });
  }

  private async handleIncomingFiles(files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const library = this.getLibraryPlaylist();
    let imported = 0;
    let duplicated = 0;
    let ignored = 0;

    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        ignored++;
        continue;
      }

      if (this.isDuplicateFile(file)) {
        duplicated++;
        continue;
      }

      const song = await this.createSongFromFile(file);
      this.allSongs.set(song.id, song);
      library.addLast(song);

      await this.storage.saveAudioBlob(song.id, file);
      imported++;
    }

    if (imported > 0) {
      this.persistState();
      this.renderSongList();
      this.renderPlaylists();
      this.renderSongSelector();
      this.updatePlaylistCreationAvailability();
      this.updateNowPlaying();
    }

    const chunks: string[] = [];
    if (imported > 0) {
      chunks.push(`${imported} cancion(es) cargada(s) e insertada(s) automaticamente en la lista doble`);
    }
    if (duplicated > 0) {
      chunks.push(`${duplicated} archivo(s) ya existia(n) y se omitio(omitieron)`);
    }
    if (ignored > 0) {
      chunks.push(`${ignored} archivo(s) no eran audio`);
    }

    if (chunks.length === 0) {
      this.notify("No se cargaron canciones", "warning");
      return;
    }

    this.notify(chunks.join(". "), imported > 0 ? "success" : "warning");
  }

  private createSongFromFile(file: File): Promise<Song> {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio(objectUrl);

      // Parse title / artist from filename (remove extension, split by " - ")
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split(" - ");
      const artist = parts.length > 1 ? parts[0].trim() : "Artista desconocido";
      const title = parts.length > 1 ? parts.slice(1).join(" - ").trim() : nameWithoutExt;

      const song = new Song({
        title,
        artist,
        objectUrl,
        fileName: file.name,
        fileSize: file.size,
      });

      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(song);
      };

      audio.addEventListener("loadedmetadata", () => {
        song.duration = audio.duration;
        finish();
      });

      audio.addEventListener("error", () => finish());

      setTimeout(() => finish(), 2500);
    });
  }

  private createPlaylistFromSelection(): void {
    if (this.allSongs.size === 0) {
      this.notify("Primero debes cargar canciones para crear playlists", "warning");
      return;
    }

    const name = this.elements.playlistNameInput.value.trim();
    if (!name) {
      this.notify("Escribe un nombre para la playlist", "warning");
      return;
    }

    const selectedSongs = this.getSelectedSongs();
    if (selectedSongs.length === 0) {
      this.notify("Selecciona al menos una cancion para la playlist", "warning");
      return;
    }

    const playlist = new Playlist(name);
    selectedSongs.forEach((song) => playlist.addLast(song));

    this.playlists.push(playlist);
    this.elements.playlistNameInput.value = "";
    this.clearSongSelection();
    this.setActivePlaylist(playlist);
    this.renderPlaylists();
    this.persistState();
    this.notify(`Playlist "${name}" creada con ${selectedSongs.length} cancion(es)`, "success");
  }

  private addSelectedSongsToActivePlaylist(): void {
    if (!this.activePlaylist) {
      return;
    }

    if (this.activePlaylist.id === LIBRARY_PLAYLIST_ID) {
      this.notify("Selecciona una playlist personalizada para agregar canciones", "warning");
      return;
    }

    const selectedSongs = this.getSelectedSongs();
    if (selectedSongs.length === 0) {
      this.notify("Selecciona canciones en el panel de creacion de playlists", "warning");
      return;
    }

    const existingIds = new Set(this.activePlaylist.songs.map((song) => song.id));
    let added = 0;

    selectedSongs.forEach((song) => {
      if (!existingIds.has(song.id)) {
        this.activePlaylist!.addLast(song);
        existingIds.add(song.id);
        added++;
      }
    });

    if (added === 0) {
      this.notify("Las canciones seleccionadas ya estan en la lista activa", "info");
      return;
    }

    this.persistState();
    this.renderSongList();
    this.renderPlaylists();
    this.notify(`${added} cancion(es) agregada(s) a la playlist activa`, "success");
  }

  private setActivePlaylist(playlist: Playlist): void {
    this.activePlaylist = playlist;
    this.player.setPlaylist(playlist);
    this.elements.activePlaylistName.textContent = playlist.name;
    this.updateAddSelectedButtonState();
    this.renderSongList();
    this.updateNowPlaying();
  }

  private renderSongList(): void {
    const list = this.elements.songList;
    list.innerHTML = "";

    if (!this.activePlaylist || this.activePlaylist.isEmpty) {
      list.innerHTML = `<li class="empty-state">
        <p>No hay canciones en esta lista.<br />Carga archivos de audio para comenzar.</p>
      </li>`;
      this.elements.songCount.textContent = "0 canciones";
      return;
    }

    const songs = this.activePlaylist.songs;
    const current = this.player.currentSong;
    this.elements.songCount.textContent = `${songs.length} canción${songs.length !== 1 ? "es" : ""}`;

    songs.forEach((song: Song, index: number) => {
      const li = document.createElement("li");
      li.className = "song-item" + (current?.id === song.id ? " active" : "");
      li.setAttribute("data-song-id", song.id);

      const removeTitle =
        this.activePlaylist?.id === LIBRARY_PLAYLIST_ID
          ? "Eliminar del sistema"
          : "Quitar de esta playlist";

      li.innerHTML = `
        <div class="song-index">${index + 1}</div>
        <div class="song-info">
          <span class="song-title">${this.escapeHtml(song.title)}</span>
          <span class="song-artist">${this.escapeHtml(song.artist)}</span>
        </div>
        <div class="song-duration">${song.durationFormatted}</div>
        <div class="song-actions">
          <button class="btn-play-song" title="Reproducir" data-id="${song.id}">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="btn-delete-song" title="${removeTitle}" data-id="${song.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      `;

      // Play song on click
      li.querySelector(".btn-play-song")!.addEventListener("click", (e) => {
        e.stopPropagation();
        this.player.play(song);
      });

      // Delete song
      li.querySelector(".btn-delete-song")!.addEventListener("click", (e) => {
        e.stopPropagation();
        void this.deleteSong(song.id);
      });

      // Click row to play
      li.addEventListener("click", () => this.player.play(song));

      list.appendChild(li);
    });
  }

  private renderPlaylists(): void {
    const list = this.elements.playlistsList;
    list.innerHTML = "";

    this.playlists.forEach((pl) => {
      const li = document.createElement("li");
      li.className = "playlist-item" + (pl.id === this.activePlaylist?.id ? " active" : "");
      li.innerHTML = `
        <div class="playlist-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1"/>
            <circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/>
          </svg>
        </div>
        <div class="playlist-info">
          <span class="playlist-name">${this.escapeHtml(pl.name)}</span>
          <span class="playlist-count">${pl.size} canción${pl.size !== 1 ? "es" : ""}</span>
        </div>
        ${
          pl.id !== LIBRARY_PLAYLIST_ID
            ? `<button class="btn-delete-playlist" data-id="${pl.id}" title="Eliminar lista">✕</button>`
            : ""
        }
      `;

      li.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest(".btn-delete-playlist")) {
          this.setActivePlaylist(pl);
          this.renderPlaylists();
        }
      });

      li.querySelector(".btn-delete-playlist")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deletePlaylist(pl.id);
      });

      list.appendChild(li);
    });
  }

  private renderSongSelector(): void {
    this.syncSelectedSongIds();
    const container = this.elements.playlistSongSelector;
    container.innerHTML = "";

    if (this.allSongs.size === 0) {
      container.innerHTML = `<p class="selector-empty">No hay canciones cargadas todavia</p>`;
      return;
    }

    const songs = [...this.allSongs.values()].sort((a, b) => {
      return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
    });

    songs.forEach((song) => {
      const row = document.createElement("label");
      row.className = "selector-item";

      const checked = this.selectedSongIds.has(song.id) ? "checked" : "";
      row.innerHTML = `
        <input type="checkbox" data-song-id="${song.id}" ${checked} />
        <span>${this.escapeHtml(song.title)} - ${this.escapeHtml(song.artist)}</span>
      `;

      const checkbox = row.querySelector("input") as HTMLInputElement;
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.selectedSongIds.add(song.id);
        } else {
          this.selectedSongIds.delete(song.id);
        }
      });

      container.appendChild(row);
    });
  }

  private async deleteSong(songId: string): Promise<void> {
    if (!this.activePlaylist) return;

    const removingFromLibrary = this.activePlaylist.id === LIBRARY_PLAYLIST_ID;
    const isCurrentSong = this.player.currentSong?.id === songId;

    if (isCurrentSong) {
      this.player.stop();
    }

    if (removingFromLibrary) {
      this.removeSongFromAllPlaylists(songId);

      const stored = this.allSongs.get(songId);
      if (stored?.objectUrl) {
        URL.revokeObjectURL(stored.objectUrl);
      }

      this.allSongs.delete(songId);
      this.selectedSongIds.delete(songId);
      await this.storage.deleteAudioBlob(songId);
      this.renderSongSelector();
      this.updatePlaylistCreationAvailability();
      this.notify("Cancion eliminada del sistema", "info");
    } else {
      this.activePlaylist.removeSongById(songId);
      this.notify("Cancion retirada de la playlist activa", "info");
    }

    this.persistState();
    this.renderPlaylists();
    this.renderSongList();
    this.updateNowPlaying();
  }

  private deletePlaylist(playlistId: string): void {
    if (playlistId === LIBRARY_PLAYLIST_ID) {
      this.notify("La biblioteca general no puede eliminarse", "warning");
      return;
    }

    if (this.playlists.length <= 1) {
      return;
    }

    this.playlists = this.playlists.filter((p) => p.id !== playlistId);

    if (this.activePlaylist?.id === playlistId) {
      this.player.stop();
      this.setActivePlaylist(this.getLibraryPlaylist());
    }

    this.renderPlaylists();
    this.persistState();
    this.notify("Playlist eliminada", "info");
  }

  private updateNowPlaying(): void {
    const song = this.player.currentSong ?? this.activePlaylist?.currentSong;

    if (song) {
      this.elements.currentTitle.textContent = song.title;
      this.elements.currentArtist.textContent = song.artist;
      this.elements.totalTime.textContent = song.durationFormatted;
    } else {
      this.elements.currentTitle.textContent = "Sin cancion seleccionada";
      this.elements.currentArtist.textContent = "—";
      this.elements.totalTime.textContent = "--:--";
      this.elements.currentTime.textContent = "00:00";
      this.elements.progressBar.value = "0";
      this.elements.progressFill.style.width = "0%";
    }
  }

  private updateProgress(): void {
    const pct = this.player.progress;
    this.elements.progressBar.value = String(pct);
    this.elements.progressFill.style.width = `${pct}%`;
    this.elements.currentTime.textContent = this.formatTime(this.player.currentTime);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  persistState(): void {
    this.storage.saveSongsMetadata([...this.allSongs.values()]);
    const customPlaylists = this.playlists
      .filter((playlist) => playlist.id !== LIBRARY_PLAYLIST_ID)
      .map((playlist) => playlist.toJSON());
    this.storage.savePlaylistsData(customPlaylists);
  }

  notify(message: string, type: "success" | "warning" | "info" | "error" = "info"): void {
    const el = this.elements.notification;
    el.textContent = message;
    el.className = `notification ${type} visible`;

    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationTimer = setTimeout(() => {
      el.classList.remove("visible");
    }, 3500);
  }

  private updatePlaylistCreationAvailability(): void {
    const hasSongs = this.allSongs.size > 0;

    this.elements.playlistNameInput.disabled = !hasSongs;
    this.elements.btnCreatePlaylist.disabled = !hasSongs;
    this.elements.btnSelectAllSongs.disabled = !hasSongs;
    this.elements.btnClearSongSelection.disabled = !hasSongs;

    if (!hasSongs) {
      this.elements.playlistRuleMsg.textContent =
        "Primero carga canciones para habilitar la creacion de playlists.";
    } else {
      this.elements.playlistRuleMsg.textContent =
        "Selecciona canciones existentes para crear o completar playlists.";
    }

    this.updateAddSelectedButtonState();
  }

  private updateAddSelectedButtonState(): void {
    const hasSongs = this.allSongs.size > 0;
    const isLibrary = this.activePlaylist?.id === LIBRARY_PLAYLIST_ID;

    if (!hasSongs) {
      this.elements.btnAddSelectedToActive.disabled = true;
      this.elements.btnAddSelectedToActive.textContent = "Agregar seleccion a lista activa";
      return;
    }

    if (isLibrary) {
      this.elements.btnAddSelectedToActive.disabled = true;
      this.elements.btnAddSelectedToActive.textContent = "Selecciona una playlist personalizada";
      return;
    }

    this.elements.btnAddSelectedToActive.disabled = false;
    this.elements.btnAddSelectedToActive.textContent = "Agregar seleccion a lista activa";
  }

  private selectAllSongsInSelector(): void {
    this.selectedSongIds = new Set(this.allSongs.keys());
    this.renderSongSelector();
  }

  private clearSongSelection(): void {
    this.selectedSongIds.clear();
    this.renderSongSelector();
  }

  private getSelectedSongs(): Song[] {
    this.syncSelectedSongIds();
    const selected: Song[] = [];

    this.selectedSongIds.forEach((songId) => {
      const song = this.allSongs.get(songId);
      if (song) {
        selected.push(song);
      }
    });

    return selected;
  }

  private syncSelectedSongIds(): void {
    [...this.selectedSongIds].forEach((songId) => {
      if (!this.allSongs.has(songId)) {
        this.selectedSongIds.delete(songId);
      }
    });
  }

  private isDuplicateFile(file: File): boolean {
    for (const song of this.allSongs.values()) {
      if (song.fileName === file.name && song.fileSize === file.size) {
        return true;
      }
    }
    return false;
  }

  private removeSongFromAllPlaylists(songId: string): void {
    this.playlists.forEach((playlist) => {
      playlist.removeSongById(songId);
    });
  }

  private getLibraryPlaylist(): Playlist {
    const existing = this.playlists.find((playlist) => playlist.id === LIBRARY_PLAYLIST_ID);
    if (existing) {
      return existing;
    }

    const library = new Playlist("Biblioteca general", LIBRARY_PLAYLIST_ID);
    this.playlists.unshift(library);
    return library;
  }

  private setPlayButtonState(isPlaying: boolean): void {
    if (isPlaying) {
      this.elements.btnPlay.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      this.elements.btnPlay.title = "Pausar";
      return;
    }

    this.elements.btnPlay.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    this.elements.btnPlay.title = "Reproducir";
  }

  private loadThemeFromStorage(): void {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    this.applyTheme(saved === "dark" ? "dark" : "light");
  }

  private toggleTheme(): void {
    const nextTheme: ThemeMode = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    this.elements.btnThemeToggle.textContent = theme === "light" ? "Modo oscuro" : "Modo claro";
  }

  private getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`No se encontro el elemento #${id}`);
    }
    return element as T;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
