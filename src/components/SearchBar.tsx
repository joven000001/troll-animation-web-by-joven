import React, { useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
  totalCount,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to quickly focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 sm:left-4 pointer-events-none text-[#b49f87]">
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search animations, videos, photos, or stickers..."
          className="w-full pl-10 sm:pl-12 pr-20 sm:pr-28 py-2.5 sm:py-3.5 bg-[#1b1713] border border-[#3e3428] rounded-xl sm:rounded-2xl text-[#fbf7ee] text-xs sm:text-base placeholder:text-[#7f7162] shadow-lg shadow-black/40 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
        />

        {/* Clear and Keyboard indicator */}
        <div className="absolute right-2.5 sm:right-3.5 flex items-center gap-1.5 sm:gap-2">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 rounded-md text-[#b49f87] hover:text-[#fbf7ee] hover:bg-[#2d251f] transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-[#a89b8c] bg-[#241e19] border border-[#3e3428] rounded">
              /
            </kbd>
          )}

          <div className="text-[10px] sm:text-[11px] font-medium text-[#a89b8c] border-l border-[#3e3428] pl-2">
            {resultCount} {resultCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
    </div>
  );
};
