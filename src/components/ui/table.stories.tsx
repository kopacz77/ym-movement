import type { Meta, StoryObj } from "@storybook/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

// Tier-1 UI primitive. Composition demo with inline sample data — no TRPC, no MSW.

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRows = [
  {
    id: "p1",
    student: "Sarah Chen",
    lesson: "Private",
    date: "May 28, 10:00 AM",
    amount: "$85.00",
    status: "Paid",
  },
  {
    id: "p2",
    student: "Alex Rivera",
    lesson: "Choreography",
    date: "May 28, 2:00 PM",
    amount: "$120.00",
    status: "Pending",
  },
  {
    id: "p3",
    student: "Jordan Park",
    lesson: "Group",
    date: "May 29, 9:00 AM",
    amount: "$45.00",
    status: "Paid",
  },
  {
    id: "p4",
    student: "Casey Lee",
    lesson: "Comp Prep",
    date: "May 29, 11:00 AM",
    amount: "$95.00",
    status: "Pending",
  },
  {
    id: "p5",
    student: "Morgan Wu",
    lesson: "Private",
    date: "May 30, 4:00 PM",
    amount: "$85.00",
    status: "Paid",
  },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Lesson Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleRows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.student}</TableCell>
            <TableCell>{row.lesson}</TableCell>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.amount}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Lesson Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
            No records to display.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithManyRows: Story = {
  render: () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `bulk-${i}`,
      student: `Student ${String.fromCharCode(65 + (i % 26))} ${i + 1}`,
      lesson: ["Private", "Choreography", "Group", "Comp Prep"][i % 4],
      date: `May ${(i % 28) + 1}, 10:00 AM`,
      amount: `$${(75 + (i % 5) * 10).toFixed(2)}`,
      status: i % 3 === 0 ? "Pending" : "Paid",
    }));
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Lesson Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.student}</TableCell>
              <TableCell>{row.lesson}</TableCell>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.amount}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};
