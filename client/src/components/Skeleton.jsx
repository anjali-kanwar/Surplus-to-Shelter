import React from 'react';

export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm space-y-4">
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-8 bg-stone-200 rounded w-1/2" />
          <div className="h-3 bg-stone-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 shadow-sm p-6 animate-pulse">
      <div className="h-5 bg-stone-200 rounded w-1/4 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-4 bg-stone-100 rounded ${
                  cIdx === 0 ? 'w-24' : cIdx === 1 ? 'flex-1' : 'w-28'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ListSkeleton = ({ items = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="h-5 bg-stone-200 rounded w-1/3" />
            <div className="h-5 bg-stone-100 rounded w-20" />
          </div>
          <div className="h-4 bg-stone-100 rounded w-2/3" />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="h-3 bg-stone-100 rounded w-3/4" />
            <div className="h-3 bg-stone-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
};
