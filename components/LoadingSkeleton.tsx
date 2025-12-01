import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 animate-pulse">
      <div className="h-5 w-1/3 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-1/4 bg-gray-200 rounded mb-4"></div>
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
      </div>
      <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-5/6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white rounded-2xl shadow border p-8">
        <div className="h-8 w-1/2 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow border p-6">
            <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-1/2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow border p-8">
        <div className="h-6 w-1/4 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
          <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
