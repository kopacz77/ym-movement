# Testing Guide - YM Movement Platform

This document provides comprehensive information about testing the YM Movement figure skating scheduling platform.

## 🧪 Testing Architecture

The application uses a multi-layered testing approach to ensure reliability and quality:

### Testing Stack
- **Unit Tests**: [Vitest](https://vitest.dev/) - Fast, modern testing framework
- **End-to-End Tests**: [Playwright](https://playwright.dev/) - Cross-browser automation
- **MCP Integration**: Claude Code Model Context Protocol servers
- **CI/CD**: GitHub Actions for automated testing

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install

# Install system dependencies (Linux/WSL)
sudo npx playwright install-deps
```

### Running Tests
```bash
# Run all unit tests
npm run test

# Run all E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

## 📋 Test Structure

### Directory Structure
```
tests/
├── student-signup.spec.ts      # Student registration flow
├── authentication.spec.ts      # Login/logout functionality  
├── admin-dashboard.spec.ts     # Admin interface testing
├── lesson-scheduling.spec.ts   # Scheduling system tests
├── e2e-complete-flow.spec.ts   # Full user journey tests
└── helpers/
    └── test-utils.ts           # Shared utilities and helpers

__tests__/
├── components/                 # Unit tests for components
├── lib/                       # Unit tests for utilities
└── hooks/                     # Unit tests for custom hooks
```

## 🎭 End-to-End Testing with Playwright

### Configuration
The Playwright configuration (`playwright.config.ts`) includes:
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile and tablet viewports
- Automatic dev server startup
- Screenshot and video capture on failures
- HTML reporting

### Test Suites

#### 1. Student Signup Flow (`student-signup.spec.ts`)
- ✅ Form validation and error handling
- ✅ Real-time password strength validation
- ✅ Account creation with email verification
- ✅ Duplicate email prevention
- ✅ Responsive design testing

#### 2. Authentication (`authentication.spec.ts`)
- ✅ Login/logout functionality
- ✅ Session management
- ✅ Protected route access
- ✅ Role-based authorization (Admin/Student)
- ✅ Password reset flows

#### 3. Admin Dashboard (`admin-dashboard.spec.ts`)
- ✅ Navigation and menu functionality
- ✅ Student management and approval
- ✅ Payment verification workflows
- ✅ Data export capabilities
- ✅ Bulk operations testing

#### 4. Lesson Scheduling (`lesson-scheduling.spec.ts`)
- ✅ Time slot creation and management
- ✅ Lesson booking and cancellation
- ✅ Conflict detection and validation
- ✅ Payment integration testing
- ✅ Google Calendar integration

#### 5. Complete User Journey (`e2e-complete-flow.spec.ts`)
- ✅ Full signup-to-booking workflow
- ✅ Admin approval process
- ✅ Payment verification cycle
- ✅ Email notification verification
- ✅ Cross-device compatibility

### Test Data Management

The test suite uses the `test-utils.ts` helper file for:
- **Test Data Generation**: Unique emails, future dates, mock data
- **Authentication Helpers**: Login as admin/student functions
- **Database Operations**: User creation, approval workflows
- **Navigation Helpers**: Page navigation and URL verification
- **Responsive Testing**: Multi-viewport testing utilities

## 🎮 Interactive Testing

### Playwright UI Mode
```bash
# Launch interactive testing interface
npm run test:e2e:ui
```
Features:
- Visual test execution
- Step-by-step debugging
- Test result analysis
- Performance metrics

### Test Generation
```bash
# Generate tests by recording interactions
npm run test:e2e:codegen
```
This opens a browser where you can:
1. Navigate through the application
2. Record your interactions
3. Generate test code automatically

### Debugging Tests
```bash
# Debug with visible browser
npm run test:e2e:headed

# Step-by-step debugging
npm run test:e2e:debug
```

## 📊 Test Reports

### HTML Reports
```bash
# Generate and view HTML report
npm run test:e2e:report
```

The report includes:
- Test execution results
- Screenshots of failures
- Performance metrics
- Browser compatibility results

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage
```

## 🔧 Custom Test Utilities

### Helper Functions
The `test-utils.ts` file provides:

```typescript
// Authentication helpers
loginAsAdmin(page)
loginAsStudent(page, email, password)

// Data creation
createStudentAccount(page, studentData)
createTimeSlot(page, slotData)

// Navigation helpers
navigateToAdminPage(page, section)
navigateToStudentPage(page, section)

// Test data generators
generateTestEmail(prefix)
generateFutureDateTime(daysFromNow, hour)

// Responsive testing
testResponsiveDesign(page, url)
```

### Test Data
Pre-configured test data for:
- Student accounts with various levels
- Admin credentials
- Rink information
- Emergency contacts
- Payment details

## 🌐 Cross-Browser Testing

Tests run on multiple browsers and devices:

### Desktop Browsers
- **Chromium** (Latest)
- **Firefox** (Latest)  
- **WebKit/Safari** (Latest)

### Mobile Devices
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

### Responsive Breakpoints
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1920px width

## 🔐 Testing Security Features

### Authentication Testing
- ✅ Protected route access control
- ✅ Session timeout handling
- ✅ Cross-site request forgery (CSRF) protection
- ✅ Role-based permission validation

### Data Security
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection verification
- ✅ Sensitive data handling

## 📧 Email Testing

Email functionality is tested through:
- API endpoint verification
- Mock email service responses
- Configuration validation
- Error handling scenarios

**Note**: Actual email delivery is verified in development/staging environments only.

## 🔄 Continuous Integration

### GitHub Actions
Tests automatically run on:
- Pull request creation
- Push to main branch
- Scheduled nightly runs

### Test Pipeline
1. **Lint & Type Check** - Code quality validation
2. **Unit Tests** - Component and utility testing
3. **Build Verification** - Ensure application builds successfully
4. **E2E Tests** - Full application testing
5. **Security Scan** - Vulnerability assessment

## 🏗️ MCP Integration

### Claude Code MCP Servers
The project includes MCP servers for enhanced development:

#### Playwright MCP Server
- **Purpose**: Browser automation for testing
- **Status**: ✅ Configured and connected
- **Command**: `claude mcp list` to verify

#### shadcn/ui MCP Server  
- **Purpose**: UI component access and development
- **Status**: ✅ Configured and connected
- **Usage**: Enhanced UI development workflow

## 🐛 Troubleshooting

### Common Issues

#### Playwright Installation
```bash
# If browser installation fails
npx playwright install --force

# For WSL/Linux dependency issues
sudo npx playwright install-deps
```

#### Test Failures
1. **Timeout Issues**: Increase timeout in test configuration
2. **Element Not Found**: Check for dynamic content loading
3. **Authentication Failures**: Verify test credentials
4. **Network Issues**: Ensure dev server is running

#### Development Server
```bash
# Ensure dev server is running before E2E tests
npm run dev

# Or let Playwright start it automatically (configured in playwright.config.ts)
```

### Debug Mode
```bash
# Run single test with debugging
npx playwright test --debug student-signup.spec.ts

# Run specific test case
npx playwright test --grep "should create student account"
```

## 📚 Best Practices

### Writing Tests
1. **Use descriptive test names** that explain the expected behavior
2. **Follow the AAA pattern** (Arrange, Act, Assert)
3. **Keep tests independent** - no dependencies between tests
4. **Use page object patterns** for complex interactions
5. **Mock external services** when appropriate

### Test Data
1. **Generate unique data** for each test run
2. **Clean up test data** after test completion (when possible)
3. **Use realistic data** that matches production scenarios
4. **Avoid hard-coded values** - use test utilities

### Performance
1. **Minimize test duration** while maintaining coverage
2. **Use parallel execution** for independent tests
3. **Optimize selectors** for reliability and speed
4. **Implement proper waiting strategies** for dynamic content

## 🚀 Future Enhancements

### Planned Improvements
- [ ] Visual regression testing with screenshot comparison
- [ ] API integration testing with mock services
- [ ] Performance testing with load simulation
- [ ] Accessibility testing automation
- [ ] Database state management for tests
- [ ] Test data seeding and cleanup automation

### Contributing to Tests
When adding new features:
1. Write corresponding tests
2. Update test documentation
3. Ensure cross-browser compatibility
4. Add responsive design tests
5. Include error scenario testing

---

For more information about specific testing scenarios or to contribute to the test suite, please refer to the [Contributing Guide](CONTRIBUTING.md) or reach out to the development team.