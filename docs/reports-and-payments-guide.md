# Reports and Payments User Guide

This guide covers the enhanced Reports Dashboard export functionality and Payment Management system with email reminders.

## Reports Dashboard

### Overview
The Reports Dashboard provides comprehensive analytics and export capabilities for business intelligence and record-keeping.

### Accessing Reports
1. Navigate to **Admin Dashboard** → **Reports**
2. Select your desired time period (Week, Month, Year) 
3. View real-time charts for Revenue and Attendance data

### Export Options

#### Export Button Menu
Click the **"Export Report"** button in the top-right corner to access export options:

- **Export Full Report (CSV)**: Complete report with summary statistics, revenue data, and attendance data
- **Revenue Only (CSV)**: Revenue breakdown by date
- **Attendance Only (CSV)**: Lesson attendance and completion rates
- **Export as PDF**: Professional print-ready report

#### CSV Export Features
- **Professional formatting** with headers and proper date formatting
- **Summary statistics** including total students, active lessons, and revenue
- **Revenue breakdown** by date with totals and averages
- **Attendance metrics** with completion rates and cancellation data
- **Automatic download** to your default download folder

#### PDF Export Features  
- **Professional layout** with YM Movement branding
- **Print-optimized styling** with proper margins and typography
- **Summary cards** highlighting key metrics
- **Formatted tables** for easy reading
- **Browser print dialog** allows saving as PDF or printing directly

### Export File Naming
Files are automatically named with the period selected:
- `revenue-report-month.csv`
- `attendance-report-week.csv` 
- `combined-report-year.csv`

### Troubleshooting Export Issues
- **Popup Blocked**: Allow popups for PDF export functionality
- **No Data Available**: Ensure you have lesson and payment data for the selected period
- **Download Failed**: Check your browser's download settings and available disk space

## Payment Management System

### Overview
The Payment Management system handles all student payments with comprehensive tracking, verification, and automated reminders.

### Accessing Payments
1. Navigate to **Admin Dashboard** → **Payments**
2. Use the search bar to find specific payments by student name or reference code
3. Filter by status: All, Pending, or Completed

### Payment Operations

#### Verify Payment
1. Click on a payment to view details
2. Click **"Verify Payment"** button
3. Payment status changes from PENDING to COMPLETED
4. Verification timestamp and admin details are recorded

#### Send Payment Reminder
1. Find a pending payment
2. Click **"Send Reminder"** button  
3. Automated email is sent to the student
4. Reminder timestamp is recorded

#### Add Payment Notes
1. Open payment details
2. Click **"Add Note"** button
3. Enter timestamped notes for internal tracking
4. Notes are appended to payment history

### Email Reminder System

#### Automated Email Features
When you send a payment reminder, the student receives a professional email containing:

- **Payment Details**: Amount due, lesson information, due date
- **Payment Instructions**: 
  - Venmo: @yura-min
  - Zelle: (714) 743-7071
- **Reference Code**: Highlighted for easy copying
- **Contact Information**: Support email and phone number
- **Quick Links**: Direct link to student payment dashboard

#### Email Template Benefits
- **Professional branding** with YM Movement styling
- **Clear payment instructions** to reduce confusion
- **Reference code prominence** to ensure proper payment matching
- **Support contact information** for student questions
- **Mobile-responsive design** for all devices

### Payment Workflow

#### Typical Payment Process
1. **Lesson Booked**: Payment record created automatically
2. **Student Notified**: Confirmation email with payment details sent
3. **Payment Pending**: Shows in admin payments dashboard
4. **Reminder Sent**: Manual reminder email if payment is late  
5. **Payment Received**: Admin verifies payment manually
6. **Status Updated**: Payment marked as completed

### Payment Filtering and Search

#### Search Capabilities
- **Student Name**: Search by first or last name
- **Reference Code**: Find payments by unique reference code
- **Date Range**: Filter by creation or due date
- **Status**: Filter by payment status

#### Advanced Filtering
- **Pagination**: Handle large payment volumes efficiently  
- **Sorting**: Order by date, amount, or status
- **Bulk Operations**: Future feature for mass updates

## Best Practices

### Report Management
- **Regular Exports**: Export reports monthly for record-keeping
- **Data Backup**: Keep CSV exports as data backups
- **Trend Analysis**: Compare reports across different periods
- **Print Records**: Use PDF export for physical record-keeping

### Payment Management  
- **Timely Reminders**: Send reminders 3-7 days after lesson completion
- **Note Everything**: Add notes for unusual payment situations
- **Reference Code Usage**: Always include reference codes in payment communications
- **Follow-up Schedule**: Develop consistent reminder schedules

### Email Communication
- **Professional Tone**: Emails maintain professional YM Movement branding
- **Clear Instructions**: Payment methods and amounts are clearly stated
- **Contact Support**: Students can easily reach out with payment questions
- **Quick Resolution**: Direct links help students resolve payments faster

## Technical Details

### Export File Formats
- **CSV Files**: Compatible with Excel, Google Sheets, and other spreadsheet applications
- **PDF Files**: Standard format compatible with all PDF readers
- **Character Encoding**: UTF-8 for proper special character support

### Email System
- **Service Provider**: Resend API for reliable delivery
- **Development Mode**: Mock emails in development environment
- **Error Handling**: Non-blocking failures ensure payment operations continue
- **Logging**: Comprehensive logging for troubleshooting

### Performance
- **Client-Side Processing**: Exports are generated in the browser for speed
- **Efficient Queries**: Database queries optimized for large datasets  
- **Caching**: Report data cached for improved performance
- **Responsive**: All features work on desktop and mobile devices

## Support and Troubleshooting

### Common Issues
- **Export not working**: Check popup blocker settings
- **Email not received**: Check spam/junk folders
- **Payment not found**: Verify reference code spelling
- **PDF formatting issues**: Use Chrome or Firefox for best results

### Getting Help
- **Documentation**: Refer to this guide and API documentation
- **System Logs**: Check browser console for error messages
- **Contact Support**: Report persistent issues to development team
- **User Training**: Regular training sessions for optimal system usage