import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const AttendanceReport = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Total Lessons</TableHead>
              <TableHead>Attended</TableHead>
              <TableHead>Missed</TableHead>
              <TableHead>Attendance Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* This will be populated with real data */}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
