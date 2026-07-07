'use client';

import { ReactNode, useState } from 'react';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  /** Render in red (destructive actions). */
  danger?: boolean;
}

/**
 * Compact "⋯" overflow menu for secondary page actions, so headers stay
 * slim on mobile.
 */
export default function ActionMenu({
  items,
  label = 'More actions',
}: {
  items: ActionMenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors touch-manipulation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8.25a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm0 5.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm0 5.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" />
        </svg>
      </button>

      {open && (
        <>
          {/* Invisible backdrop: clicking anywhere else closes the menu */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-30 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 hover:bg-gray-50 transition-colors ${
                  item.danger ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
