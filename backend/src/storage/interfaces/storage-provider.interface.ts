/**
 * Storage provider abstraction.
 *
 * Any concrete storage backend (local disk, S3, R2, etc.) must implement
 * this interface so the rest of the application can persist and remove
 * files without coupling to a specific vendor SDK.
 */
export interface StorageSaveResult {
  /** Publicly accessible URL where the saved file can be served from. */
  url: string;
  /** Opaque storage key (used to reference the file for later deletion). */
  key: string;
}

export interface IStorageProvider {
  /**
   * Persist a single uploaded file and return its public URL plus the
   * opaque storage key. Implementations are responsible for validating
   * the file, generating a safe filename, and creating any required
   * destination resources.
   */
  save(file: Express.Multer.File): Promise<StorageSaveResult>;

  /**
   * Remove a previously stored file by its storage key. Implementations
   * should treat a missing file as a successful no-op (do not throw).
   */
  delete(key: string): Promise<void>;
}
