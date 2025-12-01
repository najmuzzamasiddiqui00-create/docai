import React from 'react';

interface TagChipProps {
  label: string;
  color?: 'indigo' | 'purple' | 'gray' | 'green' | 'orange' | 'blue';
}

const colorMap: Record<string, string> = {
  indigo: 'from-indigo-50 to-purple-50 text-indigo-700 border-indigo-100',
  purple: 'from-purple-50 to-pink-50 text-purple-700 border-purple-100',
  gray: 'from-gray-50 to-gray-100 text-gray-700 border-gray-200',
  green: 'from-green-50 to-emerald-50 text-green-700 border-green-100',
  orange: 'from-orange-50 to-amber-50 text-orange-700 border-orange-100',
  blue: 'from-blue-50 to-cyan-50 text-blue-700 border-blue-100',
};

export default function TagChip({ label, color = 'indigo' }: TagChipProps) {
  return (
    <span
      className={`px-3 py-1 bg-gradient-to-r rounded-full text-xs font-medium border ${colorMap[color]}`}
      title={label}
    >
      {label}
    </span>
  );
}
