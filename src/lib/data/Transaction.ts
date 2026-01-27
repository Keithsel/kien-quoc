/**
 * Transaction Manager
 *
 * Provides atomic operations for state updates.
 * Both offline (SolidJS store) and online (Firebase) modes use this
 * to ensure consistency and enable rollback on errors.
 */

export type OperationType = 'set' | 'update' | 'delete';

export interface Operation<T = unknown> {
  type: OperationType;
  path: string;
  value?: T;
  previousValue?: T;
}

export interface TransactionOptions {
  /** If true, apply changes optimistically before commit */
  optimistic?: boolean;
  /** Timeout in ms before auto-rollback */
  timeout?: number;
}

export class Transaction {
  private operations: Operation[] = [];
  private committed = false;
  private rolledBack = false;

  /**
   * Add an operation to the transaction
   */
  add<T>(type: OperationType, path: string, value?: T, previousValue?: T): this {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already finalized');
    }
    this.operations.push({ type, path, value, previousValue });
    return this;
  }

  /**
   * Set a value at path
   */
  set<T>(path: string, value: T, previousValue?: T): this {
    return this.add('set', path, value, previousValue);
  }

  /**
   * Update (merge) value at path
   */
  update<T extends object>(path: string, value: Partial<T>, previousValue?: T): this {
    return this.add('update', path, value, previousValue);
  }

  /**
   * Delete value at path
   */
  delete(path: string, previousValue?: unknown): this {
    return this.add('delete', path, undefined, previousValue);
  }

  /**
   * Get all operations in this transaction
   */
  getOperations(): ReadonlyArray<Operation> {
    return this.operations;
  }

  /**
   * Get operation count
   */
  get size(): number {
    return this.operations.length;
  }

  /**
   * Check if transaction is empty
   */
  get isEmpty(): boolean {
    return this.operations.length === 0;
  }

  /**
   * Mark transaction as committed
   */
  markCommitted(): void {
    this.committed = true;
  }

  /**
   * Mark transaction as rolled back
   */
  markRolledBack(): void {
    this.rolledBack = true;
  }

  /**
   * Check if transaction was finalized
   */
  get isFinalized(): boolean {
    return this.committed || this.rolledBack;
  }
}

/**
 * Transaction executor interface
 * Each store type (SolidJS, Firebase) implements this
 */
export interface TransactionExecutor {
  /**
   * Execute a transaction atomically
   * @returns Promise that resolves on success, rejects on failure (with auto-rollback)
   */
  execute(transaction: Transaction, options?: TransactionOptions): Promise<void>;
}

/**
 * Create a new transaction
 */
export function createTransaction(): Transaction {
  return new Transaction();
}

/**
 * Helper to batch multiple updates into a single transaction
 */
export function batchUpdates<T extends object>(
  items: Array<{ path: string; value: Partial<T>; previousValue?: T }>
): Transaction {
  const tx = createTransaction();
  for (const item of items) {
    tx.update(item.path, item.value, item.previousValue);
  }
  return tx;
}
