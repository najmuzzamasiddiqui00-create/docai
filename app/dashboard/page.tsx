'use client';

import { UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import UploadBox from '@/components/UploadBox';
import SubscriptionCard from '@/components/SubscriptionCard';

// Force dynamic - no static caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Document {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  file_type?: string;
  processed_output?: any | null;
  processed_results?: Array<{
    summary: string;
    metadata: any;
  }>;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get base URL for API calls
  const getBaseUrl = () => {
    return typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_APP_URL || '');
  };

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    } else if (isLoaded && user) {
      loadDocuments();
      
      // Set up polling for processing documents (every 5 seconds)
      pollingRef.current = setInterval(() => {
        loadDocuments();
      }, 5000);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isLoaded, user, router]);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${getBaseUrl()}/api/documents/list`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const data = await response.json();
      
      // Parse processed_output if it's a string
      const docs = (data.documents || []).map((doc: any) => {
        let processedOutput = doc.processed_output;
        if (processedOutput && typeof processedOutput === 'string') {
          try {
            processedOutput = JSON.parse(processedOutput);
          } catch {
            processedOutput = null;
          }
        }
        return { ...doc, processed_output: processedOutput };
      });
      
      setDocuments(docs);
      
      // Stop polling if no documents are processing
      const hasProcessing = docs.some(
        (doc: Document) => doc.status === 'processing' || doc.status === 'queued'
      );
      if (!hasProcessing && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUploadStart = (file: File) => {
    console.log('Upload started:', file.name);
  };

  const handleUploadComplete = async (documentId: string) => {
    console.log('Upload completed:', documentId);
    await loadDocuments();
  };

  const handleUploadError = (error: string) => {
    if (error === 'CREDIT_LIMIT') {
      setShowCreditLimitModal(true);
    } else {
      toast.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const deletePromise = fetch(`${getBaseUrl()}/api/documents/${id}`, {
      method: 'DELETE',
      cache: 'no-store',
      credentials: 'include',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting...',
      success: () => {
        loadDocuments();
        return 'Document deleted successfully';
      },
      error: 'Failed to delete document',
    });
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Toaster position="top-right" />
      
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-bold text-lg">D</span>
              </motion.div>
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DocAI
              </Link>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-gray-600 hover:text-indigo-600 transition text-sm font-medium">
                Home
              </Link>
              <Link href="/dashboard/subscription" className="text-gray-600 hover:text-indigo-600 transition text-sm font-medium">
                Subscription
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Welcome back, {user?.firstName || 'there'}! 👋
          </h1>
          <p className="text-xl text-gray-600">Upload and process your documents with AI-powered intelligence</p>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column: Upload Box (2 columns) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Document</h2>
                <p className="text-gray-600">Process any document with AI in seconds</p>
              </div>
              <UploadBox
                onUploadStart={handleUploadStart}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </div>
          </motion.div>

          {/* Right Column: Subscription Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SubscriptionCard />
          </motion.div>
        </div>

        {/* Recent Documents Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {documents.length > 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Documents</h2>
                  <p className="text-gray-600">{documents.length} total documents processed</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadDocuments}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition"
                >
                  🔄 Refresh
                </motion.button>
              </div>
              
              <div className="space-y-4">
                {documents.slice(0, 10).map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group p-6 border-2 border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-2xl">📄</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 truncate mb-1">{doc.file_name}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                              doc.status === 'completed' ? 'bg-green-100 text-green-700 shadow-sm' :
                              doc.status === 'processing' ? 'bg-yellow-100 text-yellow-700 shadow-sm' :
                              doc.status === 'failed' ? 'bg-red-100 text-red-700 shadow-sm' :
                              'bg-blue-100 text-blue-700 shadow-sm'
                            }`}>
                              {doc.status}
                            </span>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {doc.status === 'completed' && (
                          <div className="mt-4">
                            <motion.button
                              whileHover={{ x: 5 }}
                              onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                            >
                              {expandedDoc === doc.id ? '▼' : '▶'} View AI Summary
                            </motion.button>
                            
                            {expandedDoc === doc.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-100"
                              >
                                {((doc as any).processed_output?.summary || doc.processed_results?.[0]?.summary) && (
                                  <div className="mb-4">
                                    <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                      <span>🤖</span> AI-Generated Summary
                                    </h4>
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                      {((doc as any).processed_output?.summary) || doc.processed_results?.[0]?.summary}
                                    </p>
                                  </div>
                                )}
                                {(((doc as any).processed_output && typeof (doc as any).processed_output === 'object') || doc.processed_results?.[0]?.metadata) && (
                                  <div className="flex gap-6 text-xs text-gray-600 pt-4 border-t border-indigo-200">
                                    {((doc as any).processed_output?.wordCount || doc.processed_results?.[0]?.metadata?.wordCount) && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-indigo-600">📊 Words:</span>
                                        <span className="font-semibold">{(((doc as any).processed_output?.wordCount) || doc.processed_results?.[0]?.metadata?.wordCount)?.toLocaleString?.() || (((doc as any).processed_output?.wordCount) || doc.processed_results?.[0]?.metadata?.wordCount)}</span>
                                      </div>
                                    )}
                                    {((doc as any).processed_output?.charCount || doc.processed_results?.[0]?.metadata?.charCount) && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-indigo-600">🔤 Characters:</span>
                                        <span className="font-semibold">{(((doc as any).processed_output?.charCount) || doc.processed_results?.[0]?.metadata?.charCount)?.toLocaleString?.() || (((doc as any).processed_output?.charCount) || doc.processed_results?.[0]?.metadata?.charCount)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}
                        <div className="mt-4">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            View details
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <span className="text-5xl">📄</span>
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Documents Yet</h3>
              <p className="text-gray-600 text-lg mb-6">Upload your first document to get started with AI-powered processing</p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition"
                >
                  ⬆️ Upload Document
                </button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Credit Limit Modal */}
      {showCreditLimitModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowCreditLimitModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
              >
                <span className="text-4xl">🚀</span>
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Free Credits Exhausted!
              </h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                You've used all 5 free uploads. Upgrade to <span className="font-bold text-indigo-600">Pro</span> or <span className="font-bold text-purple-600">Premium</span> for unlimited processing!
              </p>
              
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-100">
                <h3 className="font-bold text-lg text-gray-900 mb-4">✨ Unlock Premium Features</h3>
                <ul className="text-left space-y-3 text-gray-700">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-medium">Unlimited uploads & processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-medium">Advanced AI summaries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="font-medium">Priority support & faster processing</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowCreditLimitModal(false);
                    router.push('/dashboard/subscription');
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition"
                >
                  🎯 View Plans & Upgrade
                </motion.button>
                <button
                  onClick={() => setShowCreditLimitModal(false)}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
