'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />}
            {item.href ? (
              <Link href={item.href} className="text-teal-400 hover:text-teal-300 transition-colors">
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-white dark:text-white font-semibold' : 'text-gray-400 dark:text-gray-400'}>
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
