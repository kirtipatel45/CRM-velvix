import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalItems, itemsPerPage = 10, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => onPageChange(i)}
          className={`relative inline-flex items-center px-3.5 py-1.5 text-xs font-medium border-t border-b ${
            i === currentPage
              ? 'z-10 bg-[#EFF6FF] border-[#2563EB] text-[#175CD3] font-semibold'
              : 'bg-white border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'
          }`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-secondary text-xs h-8 px-3 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-secondary text-xs h-8 px-3 disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[#667085]">
            Showing <span className="font-semibold text-[#111827]">{startItem}</span> to{' '}
            <span className="font-semibold text-[#111827]">{endItem}</span> of{' '}
            <span className="font-semibold text-[#111827]">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-lg shadow-xs overflow-hidden" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-xs font-medium text-[#667085] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {renderPageNumbers()}
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-xs font-medium text-[#667085] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
