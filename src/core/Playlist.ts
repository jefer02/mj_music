/**
 * Playlist.ts
 * Encapsulates a DoublyLinkedList of Songs and tracks the currently selected node.
 * Provides all CRUD operations and cursor navigation required by the player.
 */

import { Song } from "../models/Song";
import { DoublyLinkedList, ListNode } from "../data-structures/DoublyLinkedList";

export class Playlist {
  /** Unique identifier for this playlist */
  readonly id: string;

  /** Display name */
  name: string;

  /** Internal doubly linked list of songs */
  private list: DoublyLinkedList<Song>;

  /** Pointer to the currently selected node */
  private currentNode: ListNode<Song> | null = null;

  constructor(name: string, id?: string) {
    this.name = name;
    this.id = id ?? `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.list = new DoublyLinkedList<Song>();
  }

  // ─────────────────────────────────────────────
  // Read-only accessors
  // ─────────────────────────────────────────────

  get size(): number {
    return this.list.size;
  }

  get isEmpty(): boolean {
    return this.list.isEmpty;
  }

  /** The song currently pointed at by the cursor */
  get currentSong(): Song | null {
    return this.currentNode?.data ?? null;
  }

  /** All songs as an ordered array */
  get songs(): Song[] {
    return this.list.toArray();
  }

  // ─────────────────────────────────────────────
  // Mutation operations
  // ─────────────────────────────────────────────

  /**
   * Adds a song at the beginning of the playlist.
   */
  addFirst(song: Song): void {
    const node = this.list.addFirst(song);
    if (this.currentNode === null) {
      this.currentNode = node;
    }
  }

  /**
   * Adds a song at the end of the playlist.
   */
  addLast(song: Song): void {
    const node = this.list.addLast(song);
    if (this.currentNode === null) {
      this.currentNode = node;
    }
  }

  /**
   * Inserts a song at the given zero-based position.
   */
  insertAt(song: Song, position: number): void {
    const node = this.list.insertAt(song, position);
    if (this.currentNode === null) {
      this.currentNode = node;
    }
  }

  /**
   * Removes a song by its ID.
   * If the removed song was the current one, moves cursor forward (or backward).
   */
  removeSongById(songId: string): boolean {
    const node = this.list.findNode((s) => s.id === songId);
    if (node === null) return false;

    // Move cursor away before removing
    if (this.currentNode === node) {
      this.currentNode = node.next ?? node.prev ?? null;
    }

    this.list.removeNode(node);
    return true;
  }

  // ─────────────────────────────────────────────
  // Cursor / navigation
  // ─────────────────────────────────────────────

  /**
   * Moves the cursor to the next song. Returns it, or null if at the end.
   */
  next(): Song | null {
    if (this.currentNode?.next) {
      this.currentNode = this.currentNode.next;
    }
    return this.currentNode?.data ?? null;
  }

  /**
   * Moves the cursor to the previous song. Returns it, or null if at the start.
   */
  previous(): Song | null {
    if (this.currentNode?.prev) {
      this.currentNode = this.currentNode.prev;
    }
    return this.currentNode?.data ?? null;
  }

  /** Moves the cursor to the first song */
  goToFirst(): Song | null {
    this.currentNode = this.list.getHead();
    return this.currentNode?.data ?? null;
  }

  /** Returns true if there is a next song */
  hasNext(): boolean {
    return this.currentNode?.next !== null && this.currentNode?.next !== undefined;
  }

  /** Returns true if there is a previous song */
  hasPrevious(): boolean {
    return this.currentNode?.prev !== null && this.currentNode?.prev !== undefined;
  }

  /**
   * Sets the cursor to a specific song by ID.
   * Returns the song if found, null otherwise.
   */
  selectById(songId: string): Song | null {
    const node = this.list.findNode((s) => s.id === songId);
    if (node) {
      this.currentNode = node;
      return node.data;
    }
    return null;
  }

  /**
   * Returns the zero-based index of the current song.
   */
  get currentIndex(): number {
    if (!this.currentNode) return -1;
    return this.list.findIndex((s) => s.id === this.currentNode!.data.id);
  }

  /**
   * Serializes the playlist to JSON (metadata only, no blobs).
   */
  toJSON(): PlaylistData {
    return {
      id: this.id,
      name: this.name,
      songs: this.list.toArray().map((s) => s.toJSON()),
      currentSongId: this.currentNode?.data.id ?? null,
    };
  }
}

export interface PlaylistData {
  id: string;
  name: string;
  songs: ReturnType<Song["toJSON"]>[];
  currentSongId: string | null;
}
