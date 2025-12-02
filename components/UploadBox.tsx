'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface UploadBoxProps {
  onUploadStart: (file: File) => void;
  onUploadComplete: (documentId: string) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

type UploadStage = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/rtf': '.rtf',
  'image/jpeg': '.jpg/.jpeg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export default function UploadBox({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxSizeMB = 10,
}: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDuration, setProcessingDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get base URL for API calls
  const getBaseUrl = () => {
    return typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_APP_URL || '');
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return `File type not supported. Supported: ${Object.values(ALLOWED_TYPES).join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    if (disabled) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      onUploadError(validationError);
      return;
    }

    setCurrentFile(file);
    setUploadStage('uploading');
    setUploadProgress(0);
    onUploadStart(file);

    try {
      // === STEP 1: INSTANT UPLOAD (under 1 second) ===
      console.log('📤 Step 1: Uploading file:', file.name, 'Size:', formatFileSize(file.size));
      
      // Simulate smooth progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 150);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${getBaseUrl()}/api/upload`, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('📥 Upload response status:', uploadResponse.status);

      // Validate upload response
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('❌ Upload failed:', errorData);
        
        if (errorData.error === 'LIMIT_REACHED' || errorData.requiresSubscription) {
          throw new Error('CREDIT_LIMIT');
        }
        
        // Show detailed server error message if available
        const serverError = errorData.document?.error || errorData.error || errorData.message || 'Upload failed';
        throw new Error(serverError);
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ Upload successful:', uploadData);
      console.log('   Response keys:', Object.keys(uploadData));
      console.log('   documentId:', uploadData.documentId);
      console.log('   document:', uploadData.document);

      // Check if upload was successful but webhook failed
      if (uploadData.success === false && uploadData.document?.status === 'failed') {
        console.error('❌ Upload succeeded but processing queue failed');
        throw new Error(uploadData.document.error || 'Failed to queue document for processing');
      }

      if (!uploadData.documentId && !uploadData.document?.id) {
        console.error('❌ No documentId in response:', uploadData);
        throw new Error('Server did not return a document ID');
      }

      const documentId = uploadData.documentId || uploadData.document.id;
      console.log('🎯 Document ID extracted:', documentId);

      // === STEP 2: TRIGGER INTERNAL PROCESSING ===
      console.log('\n⚡ === STEP 2: TRIGGER INTERNAL PROCESSING ===');
      console.log('   Calling /api/process-document...');
      
      // Trigger processing route (non-blocking)
      fetch(`${getBaseUrl()}/api/process-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
        cache: 'no-store',
        credentials: 'include',
      })
        .then(res => {
          console.log('✅ Process-document triggered:', res.status);
          if (!res.ok) {
            console.error('⚠️ Process-document returned error status');
          }
        })
        .catch(err => {
          console.error('⚠️ Process-document call failed:', err.message);
        });

      // === TRANSITION TO QUEUED STATE ===
      console.log('\n📋 === TRANSITIONING TO QUEUED STATE ===');
      console.log('   Document is queued for internal processing');
      console.log('   Starting polling in 500ms...\n');
      
      setTimeout(() => {
        console.log('⏰ 500ms delay complete, setting state to queued');
        setUploadStage('queued');
        setProcessingDuration(0);
        
        // Start processing duration counter
        processingTimerRef.current = setInterval(() => {
          setProcessingDuration((prev) => prev + 1);
        }, 1000);
        
        console.log('🔄 Starting to poll document status for:', documentId);
        // Start polling for status updates
        pollDocumentStatus(documentId);
      }, 500);

    } catch (error: any) {
      console.error('❌ Upload/processing error:');
      console.error('  Name:', error.name);
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack?.substring(0, 200));
      
      setUploadStage('failed');
      
      if (error.message === 'CREDIT_LIMIT') {
        console.log('💳 Credit limit reached');
        onUploadError('CREDIT_LIMIT');
        toast.error('⚠️ Free credits exhausted. Upgrade to continue uploading.', {
          duration: 6000,
          position: 'top-center',
        });
      } else {
        const errorMessage = error.message || 'Upload failed. Please try again.';
        console.error('📛 Error:', errorMessage);
        onUploadError(errorMessage);
        toast.error(`Upload failed: ${errorMessage}`, {
          duration: 6000,
          position: 'top-center',
        });
      }
      
      // Reset after delay
      setTimeout(() => {
        resetUpload();
      }, 4000);
    }
  };

  const pollDocumentStatus = async (documentId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (60 * 2s)
    
    console.log('\n🔄 === STARTING DOCUMENT STATUS POLLING ===');
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Max attempts: ${maxAttempts}`);
    console.log(`   Poll interval: 2 seconds\n`);
    
    const poll = async () => {
      attempts++;
      console.log(`\n🔄 Poll #${attempts}/${maxAttempts} - Fetching status...`);
      
      try {
        const pollUrl = `${getBaseUrl()}/api/documents/${documentId}`;
        console.log(`   GET ${pollUrl}`);
        
        const response = await fetch(pollUrl, { cache: 'no-store', credentials: 'include' });
        
        console.log(`   Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          console.error('❌ Status check failed:', response.status, response.statusText);
          throw new Error(`Failed to fetch document status: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('   Response data:', data);
        
        if (!data.document) {
          console.error('❌ Invalid response structure:', data);
          throw new Error('Invalid document response');
        }
        
        const doc = data.document;
        console.log(`   📊 Current status: "${doc.status}"`);
        console.log(`   🕐 Attempt: ${attempts}/${maxAttempts}`);
        
        // === QUEUED STATE ===
        if (doc.status === 'queued') {
          console.log('   📋 Status: QUEUED - waiting for internal processor...');
          // Update UI to queued if not already
          if (uploadStage !== 'queued') {
            console.log('   🎨 Updating UI to queued state');
            setUploadStage('queued');
          }
          // Continue polling
          if (attempts < maxAttempts) {
            console.log('   ⏳ Scheduling next poll in 2 seconds...');
            setTimeout(poll, 2000);
          } else {
            // Timeout on queued
            console.error('\n❌❌❌ TIMEOUT: Document stuck in queued state ❌❌❌');
            console.error(`   Waited ${maxAttempts * 2} seconds`);
            if (processingTimerRef.current) {
              clearInterval(processingTimerRef.current);
            }
            setUploadStage('failed');
            toast.error('Processing timed out. Please try again or contact support.', {
              duration: 6000,
            });
            onUploadError('Processing timeout - queued');
            setTimeout(() => {
              resetUpload();
            }, 4000);
          }
          
        // === PROCESSING STATE ===
        } else if (doc.status === 'processing') {
          console.log('   🤖 Status: PROCESSING - internal backend is working...');
          // Update UI to processing if not already
          if (uploadStage !== 'processing') {
            console.log('   🎨 Updating UI to processing state');
            setUploadStage('processing');
          }
          // Continue polling
          if (attempts < maxAttempts) {
            console.log('   ⏳ Scheduling next poll in 2 seconds...');
            setTimeout(poll, 2000);
          } else {
            // Timeout on processing
            console.error('\n❌❌❌ TIMEOUT: Processing took too long ❌❌❌');
            console.error(`   Waited ${maxAttempts * 2} seconds`);
            if (processingTimerRef.current) {
              clearInterval(processingTimerRef.current);
            }
            setUploadStage('failed');
            toast.error('Processing is taking longer than expected. Check your documents page.', {
              duration: 6000,
            });
            onUploadError('Processing timeout');
            setTimeout(() => {
              resetUpload();
            }, 4000);
          }
          
        // === COMPLETED STATE ===
        } else if (doc.status === 'completed') {
          console.log('\n✅✅✅ Status: COMPLETED ✅✅✅');
          console.log('   Processing finished successfully!');
          console.log('   Has results:', !!doc.processed_output);
          console.log('📊 Results:', doc.processed_output?.summary?.substring(0, 100));
          
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
          }
          
          setUploadStage('completed');
          toast.success('✅ Document processed successfully!', {
            duration: 4000,
          });
          onUploadComplete(documentId);
          
          // Reset after showing success
          setTimeout(() => {
            resetUpload();
          }, 3000);
          
        // === FAILED STATE ===
        } else if (doc.status === 'failed') {
          console.error('\n❌ === PROCESSING FAILED ===');
          console.error('   Document ID:', documentId);
          console.error('   Error field:', doc.error || 'No error message');
          console.error('   Processed output:', doc.processed_output);
          
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
          }
          
          setUploadStage('failed');
          
          // Extract error message from response
          let errorMsg = 'Processing failed. Please try again.';
          
          if (doc.error) {
            // Use the detailed error message from the processing pipeline
            errorMsg = doc.error;
            console.error('   📛 Using error from doc.error:', errorMsg);
          } else if (doc.processed_output?.summary) {
            errorMsg = doc.processed_output.summary;
            console.error('   📛 Using error from processed_output.summary:', errorMsg);
          }
          
          // Extract just the error type for cleaner display
          const shortError = errorMsg.includes(':') 
            ? errorMsg.split(':').slice(1).join(':').trim() 
            : errorMsg;
          
          console.error('   📛 Final error message:', shortError);
          
          toast.error(`❌ ${shortError}`, {
            duration: 8000,
            position: 'top-center',
          });
          onUploadError(errorMsg);
          
          setTimeout(() => {
            resetUpload();
          }, 5000);
          
        // === UNKNOWN STATUS (shouldn't happen) ===
        } else {
          console.warn(`⚠️ Unknown status: ${doc.status}`);
          // Continue polling for unknown states
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            console.error('⏱️ Polling timeout - max attempts reached');
            
            if (processingTimerRef.current) {
              clearInterval(processingTimerRef.current);
            }
            
            setUploadStage('failed');
            toast.error('Processing is taking longer than expected. Check your documents page.', {
              duration: 6000,
            });
            onUploadError('Processing timeout');
            
            setTimeout(() => {
              resetUpload();
            }, 4000);
          }
        }
        
      } catch (error: any) {
        console.error('❌ Polling error:', error.message);
        console.error(`  Attempt ${attempts}/${maxAttempts}`);
        
        // Retry on error
        if (attempts < maxAttempts) {
          console.log('🔄 Retrying poll in 2s...');
          setTimeout(poll, 2000);
        } else {
          console.error('❌ Polling failed after max attempts');
          
          if (processingTimerRef.current) {
            clearInterval(processingTimerRef.current);
          }
          
          setUploadStage('failed');
          toast.error('Failed to check processing status. Please refresh and check your documents.', {
            duration: 6000,
          });
          onUploadError('Status check failed');
          
          setTimeout(() => {
            resetUpload();
          }, 4000);
        }
      }
    };
    
    poll();
  };

  const resetUpload = () => {
    setUploadStage('idle');
    setCurrentFile(null);
    setUploadProgress(0);
    setProcessingDuration(0);
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && uploadStage === 'idle') {
      setIsDragging(true);
    }
  }, [disabled, uploadStage]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploadStage !== 'idle') return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, uploadStage]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept={Object.keys(ALLOWED_TYPES).join(',')}
        className="hidden"
        disabled={disabled || uploadStage !== 'idle'}
      />

      <AnimatePresence mode="wait">
        {uploadStage === 'idle' && (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              relative border-3 border-dashed rounded-2xl p-12 
              text-center cursor-pointer transition-all duration-300
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 scale-105' 
                : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">☁️</span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isDragging ? 'Drop your file here' : 'Upload Document'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                Drag & drop or click to browse
              </p>
              
              <p className="text-sm text-gray-500">
                Supported: PDF, DOC, DOCX, TXT, CSV, Images (Max {maxSizeMB}MB)
              </p>
            </motion.div>
          </motion.div>
        )}

        {uploadStage === 'uploading' && currentFile && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-3xl">{getFileIcon(currentFile.type)}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{currentFile.name}</h3>
                <p className="text-sm text-gray-600">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-blue-900">Uploading...</span>
                <span className="text-blue-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {uploadStage === 'queued' && currentFile && (
          <motion.div
            key="queued"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 shadow-lg"
          >
            <div className="flex items-start gap-4 mb-6">
              <motion.div
                className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-3xl">📋</span>
              </motion.div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">Queued for Processing</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Your document is in the processing queue
                </p>
                <p className="text-xs text-gray-600">
                  ⏱️ {processingDuration}s elapsed • Waiting for processing service...
                </p>
              </div>
            </div>

            <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ width: '30%' }}
              />
            </div>
          </motion.div>
        )}

        {uploadStage === 'processing' && currentFile && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200 shadow-lg"
          >
            <div className="flex items-start gap-4 mb-6">
              <motion.div
                className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <span className="text-3xl">🤖</span>
              </motion.div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">AI Processing...</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Extracting text and generating summary
                </p>
                <p className="text-xs text-gray-600">
                  ⏱️ {processingDuration}s elapsed • This may take up to 30s
                </p>
              </div>
            </div>

            <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-yellow-500 to-orange-600 h-full rounded-full"
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '40%' }}
              />
            </div>
          </motion.div>
        )}

        {uploadStage === 'completed' && currentFile && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <motion.svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-green-900 mb-1">Success! 🎉</h3>
                <p className="text-sm text-green-700">Document processed successfully</p>
              </div>
            </div>
          </motion.div>
        )}

        {uploadStage === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-8 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-red-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-1">Processing Failed</h3>
                <p className="text-sm text-red-700">Please try again or contact support</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
