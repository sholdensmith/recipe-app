'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface BackLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: ReactNode;
  back?: BackLink;
  actions?: ReactNode;
  maxWidth?: '4xl' | '7xl';
}

export default function PageHeader({
  title,
  back,
  actions,
  maxWidth = '7xl',
}: PageHeaderProps) {
  const widthClass = maxWidth === '4xl' ? 'max-w-4xl' : 'max-w-7xl';

  return (
    <header className="bg-white shadow-sm print:hidden">
      <div className={`${widthClass} mx-auto px-4 py-6 sm:px-6 lg:px-8`}>
        {back &&
          (back.href ? (
            <Link
              href={back.href}
              className="text-sm text-gray-600 hover:text-gray-900 inline-block mb-3"
            >
              ← {back.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={back.onClick}
              className="text-sm text-gray-600 hover:text-gray-900 inline-block mb-3 cursor-pointer bg-transparent border-none p-0"
            >
              ← {back.label}
            </button>
          ))}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-words min-w-0">
            {title}
          </h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
