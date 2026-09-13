export const UNCONFIRMED_UPLOAD_LIMITS = {
  /** Combined size cap across all files in one upload session (15MB). No file-count limit. */
  maxTotalBytes: 15 * 1024 * 1024,
  /** Safety net per single file (server-side). Consistent with the total rule. */
  maxBytesPerFile: 15 * 1024 * 1024,
  /** Rows per confirm chunk — keeps every Server Action payload small. */
  confirmChunkSize: 500,
} as const;
