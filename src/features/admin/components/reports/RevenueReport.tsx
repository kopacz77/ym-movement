import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const RevenueReport = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Report</CardTitle>
        <Select defaultValue="month">
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Average Per Lesson</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
