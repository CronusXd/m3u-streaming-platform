'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps {
  onClick?: () => void;
  children: ReactNode;
  danger?: boolean;
}

export function DropdownItem({ onClick, children, danger }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
        danger
          ? 'text-red-600 dark:text-red-400'
          : 'text-gray-700 dark:text-gray-300'
      )}
    >
      {children}
    </button>
  );
}
