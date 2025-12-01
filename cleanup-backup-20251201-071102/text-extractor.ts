import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

interface ExtractionResult {
  text: string;
  method: string;
}

/**
 * Extract text with fallback parsers for reliability
 * 
 * Strategy:
 * 1. Try primary parser for file type
 * 2. If fails, try alternative parser
 * 3. If all fail, return descriptive message
 */
export async function extractTextWithFallback(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<ExtractionResult> {
  
  // ===== PDF FILES =====
  if (fileType === 'application/pdf') {
    try {
      console.log('📄 Attempting PDF extraction with pdf-parse...');
      const data = await pdfParse(buffer);
      
      if (data.text && data.text.trim().length > 0) {
        console.log(`✅ PDF parsed successfully: ${data.text.length} chars`);
        return {
          text: data.text,
          method: 'pdf-parse',
        };
      }
      
      console.log('⚠️ PDF parsed but no text found');
      return {
        text: 'PDF file processed. Document appears to contain images or is empty. OCR service required for image-based PDFs.',
        method: 'pdf-parse-empty',
      };
    } catch (pdfError: any) {
      console.error('❌ pdf-parse failed:', pdfError.message);
      
      // Fallback: Return error info
      return {
        text: `PDF file uploaded. Text extraction failed: ${pdfError.message}. The file may be corrupted, password-protected, or contain only images.`,
        method: 'pdf-parse-failed',
      };
    }
  }

  // ===== WORD DOCUMENTS =====
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    try {
      console.log('📝 Attempting DOCX extraction with mammoth...');
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.value && result.value.trim().length > 0) {
        console.log(`✅ DOCX parsed successfully: ${result.value.length} chars`);
        return {
          text: result.value,
          method: 'mammoth',
        };
      }
      
      console.log('⚠️ DOCX parsed but no text found');
      return {
        text: 'Word document processed. Document appears to be empty or contains only formatting.',
        method: 'mammoth-empty',
      };
    } catch (docxError: any) {
      console.error('❌ mammoth failed:', docxError.message);
      
      // Fallback: Try as text
      try {
        console.log('🔄 Attempting fallback: read as plain text...');
        const text = buffer.toString('utf-8');
        
        if (text.length > 50) {
          return {
            text: text.substring(0, 10000), // Limit size
            method: 'text-fallback',
          };
        }
      } catch {}
      
      return {
        text: `Word document uploaded. Text extraction failed: ${docxError.message}. The file may be corrupted or use an unsupported format.`,
        method: 'docx-failed',
      };
    }
  }

  // ===== TEXT FILES =====
  if (
    fileType.startsWith('text/') ||
    fileType === 'application/json' ||
    fileType === 'application/xml' ||
    fileType === 'application/rtf'
  ) {
    try {
      console.log('📃 Reading text file...');
      const text = buffer.toString('utf-8');
      
      if (text.length === 0) {
        return {
          text: 'Text file is empty.',
          method: 'text-empty',
        };
      }
      
      console.log(`✅ Text file read: ${text.length} chars`);
      return {
        text: text,
        method: 'text-direct',
      };
    } catch (textError: any) {
      console.error('❌ Text read failed:', textError.message);
      return {
        text: `Text file uploaded but could not be read: ${textError.message}`,
        method: 'text-failed',
      };
    }
  }

  // ===== IMAGE FILES =====
  if (fileType.startsWith('image/')) {
    console.log('🖼️ Image file detected');
    return {
      text: `Image file uploaded: ${fileName}. File type: ${fileType}. Note: Text extraction from images requires OCR (Optical Character Recognition) service, which is not currently enabled. The image has been stored successfully.`,
      method: 'image-metadata',
    };
  }

  // ===== UNSUPPORTED FILES =====
  console.log(`⚠️ Unsupported file type: ${fileType}`);
  return {
    text: `File uploaded successfully: ${fileName}. File type: ${fileType}. This file type does not support automatic text extraction. The file has been stored and can be downloaded.`,
    method: 'unsupported-type',
  };
}

/**
 * Extract text from PDF with primary parser
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extract text from DOCX with primary parser
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
