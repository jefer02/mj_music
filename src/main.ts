/**
 * main.ts
 * Application entry point.
 * Wires together StorageService, MusicPlayer, Playlist, and UIController.
 */

import "./ui/styles/styles.css";
import { MusicPlayer } from "./core/MusicPlayer";
import { StorageService } from "./services/StorageService";
import { UIController } from "./ui/UIController";
import { hideStartupLoader } from "./ui/StartupLoader";

async function bootstrap(): Promise<void> {
  // 1. Initialize IndexedDB storage
  const storage = new StorageService();
  await storage.init();

  // 2. Create core player
  const player = new MusicPlayer();
  player.setVolume(0.8);

  // 3. Create UI controller (wires DOM events, player events, storage)
  const ui = new UIController(player, storage);

  // 4. Restore persisted songs and playlists
  await ui.loadPersistedData();

  // 5. Auto-save on page unload
  window.addEventListener("beforeunload", () => {
    ui.persistState();
  });

  console.log("🎵 MJ Music iniciado correctamente");
}

function showBootstrapError(error: unknown): void {
  const body = document.body;
  const msg = document.createElement("div");
  const message = error instanceof Error ? error.message : "Error desconocido";

  msg.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;color:#fff;padding:2rem;border-radius:1rem;text-align:center;font-family:sans-serif";
  msg.innerHTML = `<h2>Error al iniciar</h2><p>${message}</p>`;
  body.appendChild(msg);
}

async function startApplication(): Promise<void> {
  try {
    await bootstrap();
    await hideStartupLoader();
  } catch (error) {
    console.error("Error al iniciar MJ Music:", error);
    await hideStartupLoader();
    showBootstrapError(error);
  }
}

// Start the application when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  void startApplication();
});
