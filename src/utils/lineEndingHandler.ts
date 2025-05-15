/**
 * Utility functions for handling line endings across different platforms
 */

/**
 * Detects the line ending style used in the text
 * @param text The text to analyze
 * @returns The detected line ending ('\r\n' for Windows or '\n' for Unix/Mac)
 */
export function detectLineEnding(text: string): string {
    // Check if the text contains Windows-style line endings
    if (text.includes('\r\n')) {
        return '\r\n';
    }
    // Otherwise, assume Unix-style line endings
    return '\n';
}

/**
 * Normalizes line endings in text to match the specified style
 * @param text The text to normalize
 * @param lineEnding The line ending to use ('\r\n' for Windows or '\n' for Unix/Mac)
 * @returns The text with normalized line endings
 */
export function normalizeLineEndings(text: string, lineEnding: string): string {
    // First normalize all line endings to Unix style
    const unixText = text.replace(/\r\n/g, '\n');
    
    // Then convert to the target line ending style
    if (lineEnding === '\r\n') {
        return unixText.replace(/\n/g, '\r\n');
    }
    
    // If target is already Unix style, return as is
    return unixText;
}
