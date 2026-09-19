import { describe, it, expect } from 'vitest';
import { validateFile } from '@/utils/fileValidation';

function createFile(name: string, size: number, type = ''): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('validateFile', () => {
  it('should accept a valid .xlsx file', () => {
    const file = createFile(
      'prices.xlsx',
      1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(validateFile(file)).toBeNull();
  });

  it('should accept a valid .xls file', () => {
    const file = createFile('prices.xls', 1024, 'application/vnd.ms-excel');
    expect(validateFile(file)).toBeNull();
  });

  it('should accept .xlsx with no MIME type (extension-based)', () => {
    const file = createFile('prices.xlsx', 1024);
    expect(validateFile(file)).toBeNull();
  });

  it('should reject an empty file', () => {
    const file = createFile('empty.xlsx', 0);
    const error = validateFile(file);
    expect(error).toEqual({ type: 'empty', message: 'This file appears to be empty' });
  });

  it('should reject a non-Excel file', () => {
    const file = createFile('document.pdf', 1024, 'application/pdf');
    const error = validateFile(file);
    expect(error).toEqual({
      type: 'invalid-type',
      message: 'Only Excel files (.xlsx, .xls) are supported',
    });
  });

  it('should reject a file larger than 50 MB', () => {
    const size = 65 * 1024 * 1024;
    const file = createFile('huge.xlsx', size);
    const error = validateFile(file);
    expect(error?.type).toBe('too-large');
    expect(error?.message).toContain('65.0 MB');
    expect(error?.message).toContain('50 MB');
  });

  it('should check empty before type (empty file with wrong extension)', () => {
    const file = createFile('empty.txt', 0, 'text/plain');
    const error = validateFile(file);
    expect(error?.type).toBe('empty');
  });
});
