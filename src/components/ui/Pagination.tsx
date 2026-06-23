import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-4 border-t border-white/10 bg-white/2 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-xs text-gray-400">
        Showing <span className="font-semibold text-white">{startIndex}</span> to{" "}
        <span className="font-semibold text-white">{endIndex}</span> of{" "}
        <span className="font-semibold text-white">{totalItems}</span> entries
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
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all cursor-pointer"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
