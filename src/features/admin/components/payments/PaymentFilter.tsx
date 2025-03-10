// src/features/admin/components/payments/PaymentFilter.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentStatus } from '@prisma/client';

interface PaymentFilterProps {
  currentFilter: PaymentStatus | 'ALL';
  onFilterChange: (status: PaymentStatus | 'ALL') => void;
}

export const PaymentFilter: React.FC<PaymentFilterProps> = ({ 
  currentFilter, 
  onFilterChange 
}) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Filter:</span>
      <Select value={currentFilter} onValueChange={(value: PaymentStatus | 'ALL') => onFilterChange(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger >
        <SelectContent className="w-full">
          <SelectItem value="ALL" className="w-full">All Statuses</SelectItem>
          <SelectItem value="PENDING" className="w-full">Pending</SelectItem>
          <SelectItem value="COMPLETED" className="w-full">Completed</SelectItem>
          <SelectItem value="FAILED" className="w-full">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};