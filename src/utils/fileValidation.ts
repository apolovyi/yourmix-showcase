export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const VALID_EXTENSIONS = ['.xlsx', '.xls'];
export const VALID_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export interface FileValidationError {
  type: 'invalid-type' | 'too-large' | 'empty';
  message: string;
}

export function validateFile(file: File): FileValidationError | null {
  if (file.size === 0) {
    return { type: 'empty', message: 'This file appears to be empty' };
  }
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!VALID_EXTENSIONS.includes(ext) && !VALID_MIME_TYPES.includes(file.type)) {
    return { type: 'invalid-type', message: 'Only Excel files (.xlsx, .xls) are supported' };
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { type: 'too-large', message: `File too large (${sizeMB} MB). Maximum is 50 MB.` };
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
