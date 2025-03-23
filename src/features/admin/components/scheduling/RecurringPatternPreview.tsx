import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const RecurringPatternPreview = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pattern Preview</CardTitle>
        <Button variant="outline" size="sm">
          Modify Pattern
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Feb 15, 2025</TableCell>
              <TableCell>3:00 PM - 4:00 PM</TableCell>
              <TableCell>
                <Badge variant="outline">Available</Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Exclude
                </Button>
              </TableCell>
            </TableRow>
            {/* More rows... */}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
