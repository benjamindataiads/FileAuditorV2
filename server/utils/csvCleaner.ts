/**
 * Utility functions to clean and validate CSV/TSV data
 */
export const cleanField = (field: string): string => {
  if (!field) return field;
  
  // Remove BOM and other invisible characters
  field = field.replace(/^\uFEFF/, '');
  
  // Handle quotes more aggressively
  if (field.includes('"')) {
    // First, handle escaped quotes
    field = field.replace(/""/g, '\"');
    
    // Remove any non-printable characters after quotes
    field = field.replace(/"[\s\u0000-\u001F\u007F-\u009F]+/g, '"');
    
    // Handle unmatched quotes
    const quoteCount = (field.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      // If we have unmatched quotes, escape them
      field = field.replace(/"/g, '\\"');
    }
    
    // Clean up any remaining problematic characters
    field = field.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }
  
  return field.trim();
};

export const cleanRow = (row: string): string => {
  // Handle empty or invalid rows
  if (!row || typeof row !== 'string') return '';
  
  // Split by tabs, clean each field, then rejoin
  const fields = row.split('\t');
  return fields.map(field => {
    try {
      return cleanField(field);
    } catch (error) {
      console.warn('Error cleaning field:', { field, error });
      return field; // Return original field if cleaning fails
    }
  }).join('\t');
};

export const cleanTsvContent = (content: string): string => {
  // Handle BOM at file level
  content = content.replace(/^\uFEFF/, '');
  
  // Split content into lines, clean each line, then rejoin
  const lines = content.split('\n');
  return lines.map((line, index) => {
    try {
      return cleanRow(line);
    } catch (error) {
      console.warn('Error cleaning line:', { lineNumber: index + 1, error });
      return line; // Return original line if cleaning fails
    }
  }).join('\n');
};

export const validateTsvStructure = (content: string): { isValid: boolean; error?: string } => {
  const lines = content.split('\n');
  if (lines.length < 2) return { isValid: false, error: 'File is empty or has no data rows' };
  
  const headerCount = lines[0].split('\t').length;
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const columnCount = lines[i].split('\t').length;
    if (columnCount !== headerCount) {
      return {
        isValid: false,
        error: `Inconsistent column count at line ${i + 1}: expected ${headerCount}, got ${columnCount}`
      };
    }
  }
  
  return { isValid: true };
}; 