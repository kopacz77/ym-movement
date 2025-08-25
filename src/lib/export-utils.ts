// src/lib/export-utils.ts
"use client";

import { format } from "date-fns";

// Types for export data
interface RevenueDataItem {
  date: string;
  totalRevenue: number;
}

interface AttendanceDataItem {
  date: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  attendanceRate: number;
}

interface OverviewData {
  totalStudents: number;
  activeLessons: number;
  pendingPayments?: number;
  monthlyRevenue: number;
}

interface ExportOptions {
  period: "week" | "month" | "year";
  format: "csv" | "pdf";
}

// CSV Export Functions
export const exportRevenueToCSV = (data: RevenueDataItem[], options: ExportOptions): void => {
  const csvHeaders = ["Date", "Revenue"];
  const csvRows = data.map((item) => [
    format(new Date(item.date), "yyyy-MM-dd"),
    item.totalRevenue.toFixed(2),
  ]);

  const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

  downloadCSV(csvContent, `revenue-report-${options.period}.csv`);
};

export const exportAttendanceToCSV = (data: AttendanceDataItem[], options: ExportOptions): void => {
  const csvHeaders = [
    "Date",
    "Total Lessons",
    "Completed Lessons",
    "Cancelled Lessons",
    "Attendance Rate (%)",
  ];

  const csvRows = data.map((item) => [
    format(new Date(item.date), "yyyy-MM-dd"),
    item.totalLessons.toString(),
    item.completedLessons.toString(),
    item.cancelledLessons.toString(),
    item.attendanceRate.toFixed(1),
  ]);

  const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

  downloadCSV(csvContent, `attendance-report-${options.period}.csv`);
};

export const exportCombinedReportToCSV = (
  revenueData: RevenueDataItem[],
  attendanceData: AttendanceDataItem[],
  overviewData: OverviewData,
  options: ExportOptions,
): void => {
  // Create summary section
  const summarySection = [
    "YM Movement - Combined Report",
    `Period: ${options.period}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    "",
    "Summary Statistics",
    `Total Students,${overviewData.totalStudents}`,
    `Active Lessons,${overviewData.activeLessons}`,
    `Monthly Revenue,$${overviewData.monthlyRevenue.toFixed(2)}`,
    "",
    "Revenue Data",
    "Date,Revenue",
  ];

  const revenueSection = revenueData.map(
    (item) => `${format(new Date(item.date), "yyyy-MM-dd")},${item.totalRevenue.toFixed(2)}`,
  );

  const attendanceSection = [
    "",
    "Attendance Data",
    "Date,Total Lessons,Completed,Cancelled,Attendance Rate (%)",
    ...attendanceData.map(
      (item) =>
        `${format(new Date(item.date), "yyyy-MM-dd")},${item.totalLessons},${item.completedLessons},${item.cancelledLessons},${item.attendanceRate.toFixed(1)}`,
    ),
  ];

  const csvContent = [...summarySection, ...revenueSection, ...attendanceSection].join("\n");

  downloadCSV(csvContent, `combined-report-${options.period}.csv`);
};

// PDF Export Functions (using browser's print to PDF)
export const exportToPDF = async (
  revenueData: RevenueDataItem[],
  attendanceData: AttendanceDataItem[],
  overviewData: OverviewData,
  options: ExportOptions,
): Promise<void> => {
  // Create a new window with styled report content
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups for this site.");
  }

  const htmlContent = generatePrintableHTML(revenueData, attendanceData, overviewData, options);

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close window after printing (user can cancel if needed)
      printWindow.onafterprint = () => printWindow.close();
    }, 500);
  };
};

// Helper function to download CSV
const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// Generate HTML content for PDF printing
const generatePrintableHTML = (
  revenueData: RevenueDataItem[],
  attendanceData: AttendanceDataItem[],
  overviewData: OverviewData,
  options: ExportOptions,
): string => {
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const avgAttendance =
    attendanceData.length > 0
      ? attendanceData.reduce((sum, item) => sum + item.attendanceRate, 0) / attendanceData.length
      : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>YM Movement - ${options.period} Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #2563eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #2563eb; 
          margin: 0;
          font-size: 28px;
        }
        .header p { 
          margin: 5px 0; 
          color: #666;
        }
        .summary { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 20px; 
          margin-bottom: 30px;
        }
        .summary-card { 
          background: #f8fafc; 
          padding: 20px; 
          border-radius: 8px; 
          border-left: 4px solid #2563eb;
        }
        .summary-card h3 { 
          margin-top: 0; 
          color: #2563eb;
          font-size: 16px;
        }
        .summary-card .value { 
          font-size: 24px; 
          font-weight: bold; 
          color: #1e293b;
        }
        .section { 
          margin-bottom: 40px;
        }
        .section h2 { 
          color: #2563eb; 
          border-bottom: 1px solid #e2e8f0; 
          padding-bottom: 10px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px;
        }
        th, td { 
          border: 1px solid #e2e8f0; 
          padding: 12px; 
          text-align: left;
        }
        th { 
          background-color: #f1f5f9; 
          font-weight: bold;
          color: #475569;
        }
        tr:nth-child(even) { 
          background-color: #f8fafc;
        }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          color: #64748b; 
          font-size: 14px;
        }
        @media print {
          body { margin: 20px; }
          .summary { grid-template-columns: repeat(4, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>YM Movement</h1>
        <p>Business Report - ${options.period.toUpperCase()}</p>
        <p>Generated on ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
      </div>

      <div class="summary">
        <div class="summary-card">
          <h3>Total Students</h3>
          <div class="value">${overviewData.totalStudents}</div>
        </div>
        <div class="summary-card">
          <h3>Active Lessons</h3>
          <div class="value">${overviewData.activeLessons}</div>
        </div>
        <div class="summary-card">
          <h3>Total Revenue</h3>
          <div class="value">$${totalRevenue.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <h3>Avg Attendance</h3>
          <div class="value">${avgAttendance.toFixed(1)}%</div>
        </div>
      </div>

      <div class="section">
        <h2>Revenue Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${revenueData
              .map(
                (item) => `
              <tr>
                <td>${format(new Date(item.date), "MMMM dd, yyyy")}</td>
                <td>$${item.totalRevenue.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Attendance Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Lessons</th>
              <th>Completed</th>
              <th>Cancelled</th>
              <th>Attendance Rate</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceData
              .map(
                (item) => `
              <tr>
                <td>${format(new Date(item.date), "MMMM dd, yyyy")}</td>
                <td>${item.totalLessons}</td>
                <td>${item.completedLessons}</td>
                <td>${item.cancelledLessons}</td>
                <td>${item.attendanceRate.toFixed(1)}%</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report was generated automatically by YM Movement scheduling system.</p>
        <p>For questions, contact your system administrator.</p>
      </div>
    </body>
    </html>
  `;
};
