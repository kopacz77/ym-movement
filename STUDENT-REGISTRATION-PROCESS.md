# Student Registration Process

This document outlines the complete student registration and approval workflow for YM Movement.

## Overview

YM Movement uses an industry-standard two-phase registration system:
1. **Initial Application** - Student submits basic information for approval
2. **Registration Completion** - After approval, student completes full profile and creates password

This approach allows administrators to control who can access the platform while providing a professional onboarding experience.

## Registration Flow

### Phase 1: Initial Application

#### Student Self-Registration
1. Student visits `/auth/signup`
2. Submits basic information (name, email, initial preferences)
3. Receives welcome email confirming application is pending approval
4. Student record created with `isApproved: false` status

#### Admin-Created Students
1. Admin creates student via "New Student" dialog in admin dashboard
2. Student record created with `isApproved: false` status
3. Optional welcome email sent to student

### Phase 2: Admin Approval

1. Admin reviews pending applications in **Students > Pending Approvals**
2. Admin clicks "Approve" for qualified applicants
3. System performs the following actions:
   - Updates student record: `isApproved: true`
   - Sets approval timestamp and admin ID
   - Generates secure password reset token (24-hour expiry)
   - Sends approval email with registration completion link

### Phase 3: Registration Completion

1. Student receives approval email with "Complete Your Registration" link
2. Student clicks link → redirects to `/auth/complete-registration?token=xxx`
3. System verifies token and displays registration completion form
4. Student completes comprehensive profile:
   - **Account Setup**: Create secure password
   - **Profile Information**: Level, phone number, date of birth
   - **Emergency Contact**: Name, phone, relationship
   - **Additional Notes**: Goals, questions, special needs
5. Student submits form → account fully activated
6. Redirect to login page with success message

## Email Communications

### Welcome Email (Phase 1)
- **Subject**: "Welcome to YM Movement"
- **Content**: Registration received, pending admin approval
- **Trigger**: Student application submitted

### Approval Email (Phase 2)
- **Subject**: "🎉 Account Approved - Complete Your Registration"
- **Content**: 
  - Congratulations on approval
  - "Complete Your Registration" button with secure token link
  - Explanation of next steps
  - 24-hour expiration notice
- **Trigger**: Admin approves student application

### No Additional Emails (Phase 3)
- Registration completion redirects to login
- Standard login process from that point forward

## Security Features

### Token-Based Security
- **Secure tokens**: Cryptographically generated 64-character hex strings
- **Expiration**: 24-hour window for registration completion
- **Single-use**: Token consumed after successful registration
- **Database cleanup**: Expired tokens automatically deleted

### Data Validation
- **Password requirements**: Minimum 8 characters with confirmation
- **Input sanitization**: All user inputs sanitized before database storage
- **Security logging**: All approval actions logged for audit trail

### Access Control
- **Admin-only approval**: Only authenticated admins can approve students
- **Token verification**: Registration completion requires valid, non-expired token
- **Session management**: Standard NextAuth session handling post-registration

## Database Schema

### Student Model
```prisma
model Student {
  id            String   @id
  userId        String   @unique
  isApproved    Boolean  @default(false)
  approvedAt    DateTime?
  approvedById  String?
  level         Level
  phone         String?
  dateOfBirth   DateTime?
  emergencyContact Json?
  notes         String?
  maxLessonsPerWeek Int @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  User          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... other relations
}
```

### Password Reset Token Model
```prisma
model PasswordResetToken {
  id        String   @id
  userId    String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())
  
  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Technical Implementation

### API Endpoints

#### Student Management
- `admin.student.createStudent` - Create new student (admin)
- `admin.student.approveStudent` - Approve pending student (admin)
- `admin.student.getPendingApprovals` - Get pending applications (admin)

#### Authentication
- `admin.auth.verifyResetToken` - Verify registration completion token
- `admin.auth.resetPassword` - Complete registration with password creation

### Key Components

#### Admin Interface
- **PendingApprovals.tsx** - Display and manage pending student applications
- **NewStudentDialog.tsx** - Admin interface for creating students
- **StudentList.tsx** - Manage approved students

#### Student Interface
- **CompleteRegistrationForm.tsx** - Comprehensive registration completion form
- **SignupPage.tsx** - Initial student application form

### Email Service
- **Resend API** integration for transactional emails
- **Template-based** HTML emails with professional styling
- **Environment-based** fallbacks for development

## User Experience Flow

```
Student applies → Welcome email sent
       ↓
Admin reviews → Approves application
       ↓
Approval email → Complete registration link
       ↓
Student clicks → Registration form displayed
       ↓
Form completed → Password created + profile updated
       ↓
Redirect to login → Standard authentication flow
```

## Configuration

### Environment Variables
```bash
RESEND_API_KEY="re_xxxxx"           # Email service API key
NEXT_PUBLIC_BASE_URL="https://..."  # Base URL for email links
```

### Feature Flags
- `sendEmail: boolean` - Enable/disable welcome emails
- `sendInvite: boolean` - Enable/disable invitation emails (admin-created students)

## Troubleshooting

### Common Issues

#### "Invalid Registration Link"
- **Cause**: Token expired (>24 hours) or already used
- **Solution**: Admin must re-approve student to generate new token

#### "Email Not Received"
- **Cause**: Resend API key issues or email delivery problems
- **Solution**: Check API key configuration and email logs

#### "Token Verification Failed"
- **Cause**: Database connection issues or token format problems
- **Solution**: Check database connectivity and token generation logic

### Debugging

#### Enable Email Logging
```typescript
// In development mode
console.log('Approval email result:', emailResult);
```

#### Database Token Inspection
```sql
SELECT * FROM PasswordResetToken WHERE userId = 'user-id';
```

## Future Enhancements

### Potential Improvements
1. **SMS notifications** for approval status
2. **Progressive profile completion** (skip optional fields initially)
3. **Social login** integration (Google, Facebook)
4. **Bulk approval** for multiple students
5. **Custom approval workflows** (multi-step approval)

### Analytics Opportunities
1. **Registration conversion rates** (application → completion)
2. **Time-to-completion** metrics
3. **Approval bottleneck** analysis
4. **Student onboarding** success tracking

## Maintenance

### Regular Tasks
1. **Clean expired tokens** (automated via Prisma)
2. **Monitor email delivery** rates
3. **Review pending approvals** backlog
4. **Update email templates** as needed

### Security Audits
1. **Token generation** entropy verification
2. **Email link** security assessment
3. **Input validation** testing
4. **Access control** verification

---

*Last updated: August 6, 2025*
*Documentation maintained by: Development Team*