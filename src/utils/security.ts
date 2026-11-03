/**
 * Security utilities to protect against Formula Injection / CSV Injection (CWE-1236)
 * and sanitize user input for spreadsheets and CSV exports.
 */

/**
 * Sanitizes a cell value before writing to Google Sheets, Excel (.xlsx), or CSV.
 * Prefixes strings starting with formula trigger characters (=, +, -, @, \t, \r)
 * with a single apostrophe (') so spreadsheet software treats them as plain text.
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);

  // Standalone hyphens or valid numbers (e.g. "-", "-12", "100") should remain untouched
  if (str === '-' || /^-?\d+(\.\d+)?$/.test(str.trim())) {
    return str;
  }

  // If string starts with =, +, @, tab or return, escape it
  if (/^[=+@\t\r]/.test(str)) {
    return `'${str}`;
  }

  // If string starts with hyphen followed by letters or parentheses (e.g. -cmd, -SUM)
  if (/^-[a-zA-Z(]/.test(str.trim())) {
    return `'${str}`;
  }

  return str;
}
