'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { Document } from '@/types';

// Force dynamic - no static caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullText, setShowFullText] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load document with cache-busting
  const loadDocument = useCallback(async () => {
    try {
      // Use absolute URL with cache busting
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || '');
      
      const response = await fetch(`${baseUrl}/api/documents/${params.id}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDocument(data.document);
        
        // Stop polling if processing is complete or failed
        if (data.document.status === 'completed' || data.document.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } else {
        toast.error(data.error || 'Failed to load document');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      toast.error('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  // Initial load and polling setup
  useEffect(() => {
    loadDocument();
    
    // Set up polling for processing documents (every 3 seconds)
    pollingRef.current = setInterval(() => {
      loadDocument();
    }, 3000);
    
    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadDocument]);

  const handleDownloadReport = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || '');
        
      const response = await fetch(`${baseUrl}/api/documents/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.id }),
        cache: 'no-store',
        credentials: 'include',
      });

      if (response.ok) {
        const report = await response.json();
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document?.file_name || 'document'}-report.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded!');
      } else {
        toast.error('Failed to download report');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const handleDownloadFile = async () => {
    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_APP_URL || '');
        
      const response = await fetch(`${baseUrl}/api/documents/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.id }),
        cache: 'no-store',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
        toast.success('Download started!');
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Document not found</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Safe analysis reference - parse if string
  let analysis: any = {};
  if (document.processed_output) {
    if (typeof document.processed_output === 'string') {
      try {
        analysis = JSON.parse(document.processed_output);
      } catch {
        analysis = {};
      }
    } else {
      analysis = document.processed_output;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadFile}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download File
              </button>
              
              {document.status === 'completed' && (
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Document Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{document.file_name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {document.file_type}
                  </span>
                  <span>{(document.file_size / 1024).toFixed(2)} KB</span>
                  <span>
                    Uploaded {new Date(document.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                document.status === 'completed' ? 'bg-green-100 text-green-700' :
                document.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                document.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {document.status}
              </span>
            </div>
          </div>

          {/* Processing Results */}
          {document.status === 'completed' && analysis && (
            <div className="space-y-6">
              {/* Summary */}
              {analysis.summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🤖</span> AI Summary
                  </h2>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {analysis.summary}
                  </p>
                </motion.div>
              )}

              {/* Metadata Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {analysis.wordCount !== undefined && (
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Word Count</div>
                    <div className="text-3xl font-bold text-indigo-600">
                      {analysis.wordCount.toLocaleString()}
                    </div>
                  </div>
                )}

                {analysis.charCount !== undefined && (
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Characters</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {analysis.charCount.toLocaleString()}
                    </div>
                  </div>
                )}

                {analysis.sentiment && (
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Sentiment</div>
                    <div className="text-2xl font-bold text-green-600 capitalize">
                      {analysis.sentiment}
                    </div>
                  </div>
                )}

                {analysis.category && (
                  <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                    <div className="text-sm font-medium text-gray-600 mb-2">Category</div>
                    <div className="text-2xl font-bold text-orange-600 capitalize">
                      {analysis.category}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Key Points */}
              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📌</span> Key Points
                  </h2>
                  <ul className="space-y-3">
                    {analysis.keyPoints.map((point: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Keywords */}
              {analysis.keywords && analysis.keywords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🏷️</span> Keywords
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Extracted Text */}
              {analysis.extracted_text && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">📄</span> Extracted Text
                    </h2>
                    <button
                      onClick={() => setShowFullText(!showFullText)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
                    >
                      {showFullText ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  
                  <div className={`overflow-hidden transition-all ${showFullText ? 'max-h-none' : 'max-h-64'}`}>
                    <pre className="whitespace-pre-wrap text-gray-700 text-sm font-mono bg-gray-50 p-6 rounded-xl border border-gray-200">
                      {analysis.extracted_text}
                    </pre>
                  </div>
                  
                  {!showFullText && analysis.extracted_text.length > 500 && (
                    <div className="mt-2 text-center">
                      <button
                        onClick={() => setShowFullText(true)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Show more...
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Completed but no analysis available */}
          {document.status === 'completed' && (!analysis || Object.keys(analysis).length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">ℹ️</span> Analysis Not Found
              </h2>
              <p className="text-blue-800">
                This document is marked as completed, but no analysis data was found. It may have been processed before the latest update. You can retry processing from the dashboard.
              </p>
            </motion.div>
          )}

          {/* Error State */}
          {document.status === 'failed' && document.error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-red-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">⚠️</span> Processing Failed
              </h2>
              <p className="text-red-700">{document.error}</p>
            </motion.div>
          )}

          {/* Processing State with Auto-Refresh Notice */}
          {document.status === 'processing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-yellow-900 mb-2">Processing in Progress</h2>
              <p className="text-yellow-700 mb-2">Your document is being analyzed. This may take a few moments...</p>
              <p className="text-yellow-600 text-sm">⏱️ This page auto-refreshes every 3 seconds</p>
            </motion.div>
          )}

          {/* Queued State with Auto-Refresh Notice */}
          {document.status === 'queued' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Queued for Processing</h2>
              <p className="text-blue-700 mb-2">Your document is queued and will be processed shortly...</p>
              <p className="text-blue-600 text-sm">⏱️ This page auto-refreshes every 3 seconds</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
