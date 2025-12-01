// Text Extraction Helper - Internal Processing
// Supports PDF, DOCX, TXT

/**
 * Extract text from various file types
 * Returns plain text string
 */
export async function extractText(
  fileBuffer: Buffer,
  fileType: string,
  fileName: string
): Promise<string> {
  console.log('📄 Extracting text...');
  console.log('   File type:', fileType);
  console.log('   File name:', fileName);
  console.log('   Buffer size:', fileBuffer.length, 'bytes');

  try {
    // Determine file type
    const lowerType = fileType.toLowerCase();
    const lowerName = fileName.toLowerCase();

    // PDF
    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
      console.log('   📕 Processing as PDF...');
      return await extractFromPDF(fileBuffer);
    }

    // DOCX
    if (
      lowerType.includes('wordprocessingml') ||
      lowerType.includes('msword') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc')
    ) {
      console.log('   📘 Processing as DOCX...');
      return await extractFromDOCX(fileBuffer);
    }

    // Plain text
    if (lowerType.includes('text/plain') || lowerName.endsWith('.txt')) {
      console.log('   📄 Processing as TXT...');
      return fileBuffer.toString('utf-8');
    }

    // CSV
    if (lowerType.includes('csv') || lowerName.endsWith('.csv')) {
      console.log('   📊 Processing as CSV...');
      return fileBuffer.toString('utf-8');
    }

    // Unsupported
    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error: any) {
    console.error('❌ Text extraction failed:', error.message);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from PDF buffer
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfParse = (await import('pdf-parse')).default;
    
    console.log('   Parsing PDF with pdf-parse...');
    const data = await pdfParse(buffer);
    
    console.log('   ✅ PDF parsed');
    console.log('      Pages:', data.numpages);
    console.log('      Text length:', data.text?.length || 0);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }

    return data.text;
  } catch (error: any) {
    console.error('   ❌ PDF extraction failed:', error.message);
    
    // Fallback: try basic text extraction
    console.log('   Attempting fallback extraction...');
    try {
      const text = buffer.toString('utf-8');
      const cleaned = text
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleaned.length > 100) {
        console.log('   ✅ Fallback extraction successful');
        return cleaned;
      }
    } catch (fallbackError) {
      console.error('   ❌ Fallback also failed');
    }

    throw new Error(`PDF extraction completely failed: ${error.message}`);
  }
}

/**
 * Extract text from DOCX buffer
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import
    const mammoth = await import('mammoth');
    
    console.log('   Extracting text from DOCX with mammoth...');
    const result = await mammoth.extractRawText({ buffer });
    
    console.log('   ✅ DOCX extracted');
    console.log('      Text length:', result.value?.length || 0);

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX contains no extractable text');
    }

    return result.value;
  } catch (error: any) {
    console.error('   ❌ DOCX extraction failed:', error.message);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}
