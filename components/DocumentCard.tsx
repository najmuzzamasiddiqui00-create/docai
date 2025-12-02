'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Document } from '@/types';
import StatusBadge from './StatusBadge';

interface DocumentCardProps {
  document: Document;
  onUpdate: () => void;
}

export default function DocumentCard({ document, onUpdate }: DocumentCardProps) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(document.file_name);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localStatus, setLocalStatus] = useState(document.status);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get base URL for API calls
  const getBaseUrl = () => {
    return typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_APP_URL || '');
  };

  // Poll for status updates when processing
  useEffect(() => {
    if (document.status === 'processing' || document.status === 'queued') {
      pollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${getBaseUrl()}/api/documents/${document.id}`, {
            cache: 'no-store',
          });
          const data = await response.json();
          if (data.document && data.document.status !== localStatus) {
            setLocalStatus(data.document.status);
            if (data.document.status === 'completed' || data.document.status === 'failed') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              onUpdate(); // Refresh parent list
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);
    }
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [document.id, document.status, localStatus, onUpdate]);

  // Update local status when prop changes
  useEffect(() => {
    setLocalStatus(document.status);
  }, [document.status]);

  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch(`${getBaseUrl()}/api/documents/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id }),
        cache: 'no-store',
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
    } finally {
      setIsProcessing(false);
      setShowActions(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a valid name');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`${getBaseUrl()}/api/documents/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id, newName: newName.trim() }),
        cache: 'no-store',
      });

      if (response.ok) {
        toast.success('Document renamed!');
        setShowRenameDialog(false);
        onUpdate();
      } else {
        toast.error('Failed to rename document');
      }
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch(`${getBaseUrl()}/api/documents/${document.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (response.ok) {
        toast.success('Document deleted!');
        setShowDeleteDialog(false);
        onUpdate();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch(`${getBaseUrl()}/api/documents/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id }),
        cache: 'no-store',
      });

      if (response.ok) {
        toast.success('Processing retry initiated!');
        setShowActions(false);
        onUpdate();
      } else {
        toast.error('Failed to retry processing');
      }
    } catch (error) {
      console.error('Retry error:', error);
      toast.error('Failed to retry processing');
    } finally {
      setIsProcessing(false);
    }
  };

  // Safe analysis accessor - parse if string
  let analysis: any = {};
  if ((document as any).processed_output) {
    if (typeof (document as any).processed_output === 'string') {
      try {
        analysis = JSON.parse((document as any).processed_output);
      } catch {
        analysis = {};
      }
    } else {
      analysis = (document as any).processed_output;
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <Link href={`/documents/${document.id}`}>
                <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-indigo-600 transition cursor-pointer">
                  {document.file_name}
                </h3>
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(document.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                  <div className="py-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={handleDownload}
                      disabled={isProcessing}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      Download File
                    </button>
                    <button
                      onClick={() => {
                        setShowRenameDialog(true);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Rename
                    </button>
                    {document.status === 'failed' && (
                      <button
                        onClick={handleRetry}
                        disabled={isProcessing}
                        className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition disabled:opacity-50"
                      >
                        Retry Processing
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDeleteDialog(true);
                        setShowActions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status & Info */}
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={localStatus} />
            <span className="text-sm text-gray-600">{document.file_type}</span>
            <span className="text-sm text-gray-600">
              {(document.file_size / 1024).toFixed(2)} KB
            </span>
            {(localStatus === 'processing' || localStatus === 'queued') && (
              <span className="text-xs text-blue-600 animate-pulse">⏱️ Auto-updating...</span>
            )}
          </div>

          {/* Analysis Preview */}
          {localStatus === 'completed' && (
            <div className="space-y-3">
              {analysis.summary && (
                <p className="text-sm text-gray-700 line-clamp-3">
                  {analysis.summary}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {analysis.sentiment && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Sentiment: {analysis.sentiment}
                  </span>
                )}
                {analysis.category && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                    {analysis.category}
                  </span>
                )}
                {typeof analysis.wordCount === 'number' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {analysis.wordCount.toLocaleString()} words
                  </span>
                )}
              </div>

              {(Array.isArray(analysis.keyPoints) && analysis.keyPoints.length > 0) && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {analysis.keyPoints.slice(0,3).map((pt:string, i:number) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-indigo-600 font-semibold">{i+1}.</span>
                      <span className="flex-1 truncate">{pt}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(Array.isArray(analysis.keywords) && analysis.keywords.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {analysis.keywords.slice(0,6).map((kw:string, i:number) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium truncate max-w-[80px]">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {localStatus === 'failed' && document.error && (
            <p className="text-sm text-red-600">
              Error: {document.error}
            </p>
          )}
          
          {/* Processing indicator */}
          {(localStatus === 'processing' || localStatus === 'queued') && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>{localStatus === 'processing' ? 'Processing...' : 'Queued...'}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/documents/${document.id}`}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium text-center transition"
            >
              View Details
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rename Document</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
              placeholder="Enter new name"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {isProcessing ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Document?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The document and all its data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
