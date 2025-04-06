import { readFile, writeFile } from './filesystem.js';

interface SearchReplace {
    search: string;
    replace: string;
}

/**
 * Performs a search and replace operation on a file.
 * This function:
 * 1. Reads the file content
 * 2. Finds the search text
 * 3. Replaces it with the new text
 * 4. Writes the file back
 * 5. Verifies the change was applied correctly
 * 
 * The function is tested in ./test/unit/edit.test.js and ./test/integration/edit.test.js
 * 
 * @param filePath Path to the file to edit
 * @param block Object containing search and replace strings
 * @returns Object containing:
 *   - success: Boolean indicating if the operation succeeded
 *   - message: Descriptive message about the result
 *   - matchCount: (Optional) Number of occurrences of the search text found
 */
export async function performSearchReplace(filePath: string, block: SearchReplace): Promise<{
    success: boolean;
    message: string;
    matchCount?: number;
}> {
    try {
        const content = await readFile(filePath);
        
        // Find first occurrence
        const searchIndex = content.indexOf(block.search);
        if (searchIndex === -1) {
            return {
                success: false,
                message: `Search content not found in ${filePath}`
            };
        }

        // Replace content
        const newContent = 
            content.substring(0, searchIndex) + 
            block.replace + 
            content.substring(searchIndex + block.search.length);

        // Count occurrences for informational purposes
        let count = 0;
        let pos = content.indexOf(block.search);
        while (pos !== -1) {
            count++;
            pos = content.indexOf(block.search, pos + 1);
        }

        await writeFile(filePath, newContent, { createDirectories: false });
        
        // Verify the change was successful
        const updatedContent = await readFile(filePath);
        const verifyIndex = updatedContent.indexOf(block.replace);
        
        if (verifyIndex === -1) {
            return {
                success: false,
                message: `Verification failed: replacement text not found in updated file ${filePath}`
            };
        }
        
        return {
            success: true,
            message: `Successfully applied edit to ${filePath}`,
            matchCount: count
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            message: `Error applying edit to ${filePath}: ${errorMessage}`
        };
    }
}

/**
 * Parses a block of text in the format expected by the desktop_fs_edit_block tool.
 * The format is:
 * - First line: file path
 * - Second line: <<<<<<< SEARCH
 * - Next N lines: text to search for
 * - Next line: =======
 * - Next M lines: text to replace with
 * - Last line: >>>>>>> REPLACE
 * 
 * @param blockContent The block of text to parse
 * @returns An object containing the file path and search/replace data
 */
export async function parseEditBlock(blockContent: string): Promise<{
    filePath: string;
    searchReplace: SearchReplace;
}> {
    const lines = blockContent.split('\n');
    
    // First line should be the file path
    const filePath = lines[0].trim();
    
    // Find the markers
    const searchStart = lines.indexOf('<<<<<<< SEARCH');
    const divider = lines.indexOf('=======');
    const replaceEnd = lines.indexOf('>>>>>>> REPLACE');
    
    if (searchStart === -1 || divider === -1 || replaceEnd === -1) {
        throw new Error('Invalid edit block format - missing markers');
    }
    
    // Extract search and replace content
    const search = lines.slice(searchStart + 1, divider).join('\n');
    const replace = lines.slice(divider + 1, replaceEnd).join('\n');
    
    return {
        filePath,
        searchReplace: { search, replace }
    };
}