import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  try {
    // PDF files
    if (fileType === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    } 
    
    // Word documents
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      return await extractTextFromDocx(buffer);
    } 
    
    // Text-based files
    if (
      fileType.startsWith('text/') ||
      fileType === 'application/json' ||
      fileType === 'application/xml'
    ) {
      return buffer.toString('utf-8');
    }
    
    // Image files - return metadata instead of text
    if (fileType.startsWith('image/')) {
      return `Image file: ${fileType}. Image text extraction requires OCR service.`;
    }
    
    // Excel/Spreadsheet files
    if (
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'Spreadsheet file detected. Specialized parsing required.';
    }
    
    // PowerPoint files
    if (
      fileType === 'application/vnd.ms-powerpoint' ||
      fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return 'Presentation file detected. Specialized parsing required.';
    }
    
    // Archive files
    if (
      fileType === 'application/zip' ||
      fileType === 'application/x-rar-compressed'
    ) {
      return 'Archive file detected. Cannot extract text from compressed files.';
    }

    // Default fallback
    return `File type ${fileType} uploaded successfully. Advanced processing may be required.`;
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to process file type: ${fileType}`);
  }
}

export async function summarizeText(text: string, retries = 3): Promise<string> {
  try {
    // Truncate text to fit model context window
    const maxLength = 8000; // Gemini 1.5 Flash can handle this well
    const truncatedText = text.substring(0, maxLength);

    console.log(`🤖 Calling Google Gemini API...`);
    console.log(`📝 Text length: ${text.length} chars (using ${truncatedText.length})`);

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured');
      return `Text extracted successfully (${text.length} characters). AI summary unavailable - API key not configured.`;
    }

    console.log(`🔑 API key present: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const geminiModel = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500,
          },
        });
        
        // Generate summary
        const prompt = `Provide a concise summary of this document in 2-3 clear, informative sentences. Focus on the main points and key information:\n\n${truncatedText}`;
        console.log(`📤 Sending request to Gemini (attempt ${attempt}/${retries})...`);
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const summary = response.text();
        
        if (!summary || summary.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }
        
        const duration = Date.now() - startTime;
        console.log(`✅ Gemini summary generated in ${duration}ms`);
        console.log(`📊 Summary: ${summary.substring(0, 100)}...`);
        
        return summary.trim();
      } catch (fetchError: any) {
        console.error(`❌ Gemini attempt ${attempt}/${retries} failed:`, fetchError.message);
        
        if (attempt === retries) {
          // Last attempt failed, return fallback
          console.error('❌ All Gemini attempts failed');
          return `Document processed successfully. Text extracted (${text.length} characters). AI summary temporarily unavailable - ${fetchError.message}`;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Should never reach here, but just in case
    return `Text extracted successfully (${text.length} characters). AI processing completed.`;

  } catch (error: any) {
    console.error('❌ Unexpected error in summarizeText:', error);
    
    // Return a helpful fallback
    const preview = text.length > 300 ? text.substring(0, 300) + '...' : text;
    return `Document processed. Text preview:\n\n${preview}\n\n[AI summary unavailable: ${error.message}]`;
  }
}

export async function analyzeDocument(text: string): Promise<{
  wordCount: number;
  charCount: number;
  sentiment?: string;
  keywords?: string[];
}> {
  const words = text.trim().split(/\s+/);
  
  return {
    wordCount: words.length,
    charCount: text.length,
  };
}
