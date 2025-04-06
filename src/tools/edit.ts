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
        
        // First check if the search string exists
        const searchIndex = content.indexOf(block.search);
        if (searchIndex === -1) {
            return {
                success: false,
                message: `Search content not found in ${filePath}`
            };
        }

        // Ensure the search string doesn't contain any edit markers
        const hasMarkers = 
            block.search.includes('<<<<<<< SEARCH') || 
            block.search.includes('=======') || 
            block.search.includes('>>>>>>> REPLACE');
            
        if (hasMarkers) {
            return {
                success: false,
                message: `Search string contains edit markers, which is not allowed to prevent marker leakage.`
            };
        }

        // Ensure the replace string doesn't contain any edit markers
        const replaceHasMarkers = 
            block.replace.includes('<<<<<<< SEARCH') || 
            block.replace.includes('=======') || 
            block.replace.includes('>>>>>>> REPLACE');
            
        if (replaceHasMarkers) {
            return {
                success: false,
                message: `Replace string contains edit markers, which is not allowed.`
            };
        }

        // Replace content - only replace the first occurrence for safety
        const newContent = 
            content.substring(0, searchIndex) + 
            block.replace + 
            content.substring(searchIndex + block.search.length);

        // Count all occurrences for informational purposes
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
        
        // Double check that no markers leaked into the file
        const hasMarkersInResult = 
            updatedContent.includes('<<<<<<< SEARCH') || 
            updatedContent.includes('=======') || 
            updatedContent.includes('>>>>>>> REPLACE');
            
        if (hasMarkersInResult) {
            return {
                success: false,
                message: `Warning: Edit markers found in the result file. This may indicate a problem with the edit process.`
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
    if (lines.length === 0) {
        throw new Error('Invalid edit block format - empty content');
    }
    
    const filePath = lines[0].trim();
    if (!filePath) {
        throw new Error('Invalid edit block format - missing file path on first line');
    }
    
    // Find the markers
    const searchStart = lines.indexOf('<<<<<<< SEARCH');
    const divider = lines.indexOf('=======');
    const replaceEnd = lines.indexOf('>>>>>>> REPLACE');
    
    if (searchStart === -1 || divider === -1 || replaceEnd === -1) {
        throw new Error('Invalid edit block format - missing markers');
    }
    
    // Validate marker order
    if (!(searchStart < divider && divider < replaceEnd)) {
        throw new Error('Invalid edit block format - markers in wrong order');
    }
    
    // Extract search and replace content
    const search = lines.slice(searchStart + 1, divider).join('\n');
    const replace = lines.slice(divider + 1, replaceEnd).join('\n');
    
    // Ensure search string is not empty
    if (!search.trim()) {
        throw new Error('Invalid edit block format - empty search string');
    }
    
    // Check for nested markers which would cause issues
    const hasNestedMarkers = 
        search.includes('<<<<<<< SEARCH') || 
        search.includes('=======') || 
        search.includes('>>>>>>> REPLACE') ||
        replace.includes('<<<<<<< SEARCH') || 
        replace.includes('=======') || 
        replace.includes('>>>>>>> REPLACE');
        
    if (hasNestedMarkers) {
        throw new Error('Invalid edit block format - nested markers detected in search or replace text');
    }
    
    return {
        filePath,
        searchReplace: { search, replace }
    };
}