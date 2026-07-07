import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  onPageSizeChange?: (newSize: number) => void;
}

export function PageSizeSelector({ 
  pageSize, 
  onPageSizeChange 
}: { 
  pageSize: number; 
  onPageSizeChange: (newSize: number) => void; 
}) {
  const [inputValue, setInputValue] = useState(pageSize.toString());
  
  useEffect(() => {
    setInputValue(pageSize.toString());
  }, [pageSize]);

  return (
    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner no-print">
      <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap">Per Page</span>
      <input
        type="text"
        name={Math.random().toString()}
        autoComplete="new-password"
        value={inputValue}
        onChange={(e) => {
          const val = e.target.value;
          setInputValue(val);
          const num = parseInt(val);
          if (!isNaN(num) && num >= 0) {
            onPageSizeChange(num);
          }
        }}
        className="bg-transparent text-white font-bold text-sm w-12 outline-none text-center focus:text-neon-blue transition-colors"
      />
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const safeTotalPages = totalPages === Infinity || isNaN(totalPages) ? 1 : totalPages;
  const startIndex = pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = pageSize > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", safeTotalPages);
      } else if (currentPage >= safeTotalPages - 2) {
        pages.push(1, "...", safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", safeTotalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-4 border-t border-white/5 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
        <div className="text-xs text-gray-400">
          Showing <span className="font-bold text-neon-blue">{startIndex}</span> to{" "}
          <span className="font-bold text-neon-blue">{endIndex}</span> of{" "}
          <span className="font-bold text-white">{totalItems}</span> entries
        </div>
        
        {onPageSizeChange && (
          <PageSizeSelector pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        )}
      </div>
      
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={typeof page === "string"}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              typeof page === "string"
                ? "border-transparent text-gray-500 cursor-default"
                : currentPage === page
                ? "bg-neon-blue text-slate-950 font-bold border-neon-blue shadow-lg shadow-neon-blue/20"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white cursor-pointer"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
          disabled={currentPage >= safeTotalPages}
          className="flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
