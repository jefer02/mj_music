/**
 * DoublyLinkedList.ts
 * Generic doubly linked list implementation from scratch.
 * Each node holds a reference to the previous and next node.
 * Used as the core data structure for playlist song management.
 */

/**
 * A single node in the doubly linked list.
 */
export class ListNode<T> {
  data: T;
  prev: ListNode<T> | null = null;
  next: ListNode<T> | null = null;

  constructor(data: T) {
    this.data = data;
  }
}

/**
 * Doubly linked list with full CRUD and traversal capabilities.
 */
export class DoublyLinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private _size: number = 0;

  /** Number of elements in the list */
  get size(): number {
    return this._size;
  }

  /** Returns true if the list has no elements */
  get isEmpty(): boolean {
    return this._size === 0;
  }

  /** Returns the head node (first element) */
  getHead(): ListNode<T> | null {
    return this.head;
  }

  /** Returns the tail node (last element) */
  getTail(): ListNode<T> | null {
    return this.tail;
  }

  /**
   * Adds a new element at the beginning of the list.
   * Time complexity: O(1)
   */
  addFirst(data: T): ListNode<T> {
    const node = new ListNode(data);

    if (this.head === null) {
      // Empty list: head and tail point to the same node
      this.head = node;
      this.tail = node;
    } else {
      // Link new node before current head
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    this._size++;
    return node;
  }

  /**
   * Adds a new element at the end of the list.
   * Time complexity: O(1)
   */
  addLast(data: T): ListNode<T> {
    const node = new ListNode(data);

    if (this.tail === null) {
      // Empty list
      this.head = node;
      this.tail = node;
    } else {
      // Link new node after current tail
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }

    this._size++;
    return node;
  }

  /**
   * Inserts a new element at a given zero-based position.
   * Position 0 → addFirst, position >= size → addLast.
   * Time complexity: O(n)
   */
  insertAt(data: T, position: number): ListNode<T> {
    if (position <= 0) return this.addFirst(data);
    if (position >= this._size) return this.addLast(data);

    const node = new ListNode(data);
    const current = this.getNodeAt(position)!;
    const previous = current.prev!;

    // Wire the new node between previous and current
    node.prev = previous;
    node.next = current;
    previous.next = node;
    current.prev = node;

    this._size++;
    return node;
  }

  /**
   * Removes a specific node from the list.
   * Time complexity: O(1) when the node reference is known.
   */
  removeNode(node: ListNode<T>): T {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      // Node is the head
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      // Node is the tail
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this._size--;
    return node.data;
  }

  /**
   * Removes the element at a given zero-based position.
   * Time complexity: O(n)
   * Returns the removed element, or null if position is invalid.
   */
  removeAt(position: number): T | null {
    const node = this.getNodeAt(position);
    if (node === null) return null;
    return this.removeNode(node);
  }

  /**
   * Returns the node at a given zero-based position.
   * Traverses from head or tail depending on which is closer.
   * Time complexity: O(n/2) average
   */
  getNodeAt(position: number): ListNode<T> | null {
    if (position < 0 || position >= this._size) return null;

    let current: ListNode<T>;

    if (position <= this._size / 2) {
      // Traverse from head (faster for first half)
      current = this.head!;
      for (let i = 0; i < position; i++) {
        current = current.next!;
      }
    } else {
      // Traverse from tail (faster for second half)
      current = this.tail!;
      for (let i = this._size - 1; i > position; i--) {
        current = current.prev!;
      }
    }

    return current;
  }

  /**
   * Returns the zero-based index of the first node satisfying the predicate.
   * Returns -1 if not found. Time complexity: O(n)
   */
  findIndex(predicate: (data: T) => boolean): number {
    let current = this.head;
    let index = 0;
    while (current !== null) {
      if (predicate(current.data)) return index;
      current = current.next;
      index++;
    }
    return -1;
  }

  /**
   * Returns the first node satisfying the predicate, or null.
   */
  findNode(predicate: (data: T) => boolean): ListNode<T> | null {
    let current = this.head;
    while (current !== null) {
      if (predicate(current.data)) return current;
      current = current.next;
    }
    return null;
  }

  /**
   * Converts the list to a plain array (head → tail order).
   * Time complexity: O(n)
   */
  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;
    while (current !== null) {
      result.push(current.data);
      current = current.next;
    }
    return result;
  }

  /**
   * Executes a callback for each element (head → tail).
   */
  forEach(callback: (data: T, index: number, node: ListNode<T>) => void): void {
    let current = this.head;
    let index = 0;
    while (current !== null) {
      callback(current.data, index, current);
      current = current.next;
      index++;
    }
  }

  /**
   * Removes all nodes and resets the list.
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }
}
