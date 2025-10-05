import { ReactNode } from 'react';

interface TableauResponsiveProps {
  children: ReactNode;
}

export function TableauResponsive({ children }: TableauResponsiveProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
