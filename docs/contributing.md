# Contributing to Yura Scheduler v3

Thank you for your interest in contributing to the Yura Scheduler v3 project! This document provides guidelines for contributing to this figure skating lesson management platform.

## 🚀 Quick Start

1. **Fork the repository** and clone it locally
2. **Install dependencies**: `pnpm install`
3. **Set up environment**: Copy `.env.example` to `.env.local` and configure
4. **Run database migrations**: `pnpm prisma:migrate`
5. **Start development server**: `pnpm dev`

## 📋 Development Guidelines

### Code Standards

- **Language**: TypeScript (strict mode enabled)
- **Formatting**: Biome (not Prettier/ESLint)
- **Architecture**: Feature-based organization
- **Indentation**: 2 spaces, 100 character line width, double quotes

### Security Requirements

⚠️ **Security is our top priority**. All contributions must:

- Use input sanitization for all user inputs
- Follow password security policies
- Include rate limiting for sensitive endpoints
- Add security logging for critical operations
- Include security tests for new features

### Testing Requirements

All new features must include:

- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **Security tests** for user input handling
- **Component tests** for React components

Run tests with: `pnpm test`

### Database Changes

- **Schema changes**: Always create migrations with `pnpm prisma:migrate`
- **Relation names**: Use PascalCase (e.g., `User`, `Lesson`, `Student`)
- **Test data**: Use the test data factories in `__tests__/helpers/`

## 🔒 Security Guidelines

### Input Validation
```typescript
// ✅ Good: Use sanitization hook
const { sanitizeInput } = useSanitizedInput();
const cleanInput = sanitizeInput(userInput);

// ❌ Bad: Direct user input usage
const result = await api.create({ data: userInput });
```

### API Security
```typescript
// ✅ Good: Server-side sanitization + logging
.mutation(async ({ ctx, input }) => {
  const sanitized = sanitizeInput(input.content);
  logSecurityEvent('DATA_CREATED', { userId: ctx.session?.user?.id });
  // ... rest of logic
});
```

### Password Handling
```typescript
// ✅ Good: Use validatePasswordStrength
const validation = validatePasswordStrength(password);
if (!validation.isValid) {
  throw new Error(validation.errors.join(', '));
}
```

## 🏗️ Architecture

### Directory Structure
```
src/
├── features/           # Feature-based modules
│   ├── admin/         # Admin functionality
│   ├── student/       # Student functionality
│   └── auth/          # Authentication
├── components/ui/     # Reusable UI components
├── lib/              # Core utilities
├── hooks/            # Custom React hooks
└── types/            # TypeScript definitions
```

### Feature Organization
Each feature should contain:
- `api/queries/` - TRPC endpoints
- `components/` - React components
- `types/` - TypeScript types
- `hooks/` - Feature-specific hooks

## 📝 Commit Guidelines

We use conventional commits:

```
feat: add password strength validation
fix: resolve XSS vulnerability in student notes
security: implement rate limiting on auth routes
test: add security tests for input sanitization
docs: update API documentation
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `security`: Security improvement
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvements

## 🧪 Testing Guidelines

### Security Testing
Always include security tests:

```typescript
it("should sanitize malicious input", () => {
  const maliciousInput = "<script>alert('xss')</script>";
  const result = sanitizeInput(maliciousInput);
  expect(result).not.toContain("<script>");
});
```

### API Testing
```typescript
it("should enforce authentication", async () => {
  const response = await request(app)
    .post("/api/admin/students")
    .send(validData);
  expect(response.status).toBe(401);
});
```

### Component Testing
```typescript
it("should handle form submission securely", async () => {
  render(<StudentForm />);
  // Test sanitization, validation, etc.
});
```

## 🚀 Pull Request Process

1. **Create a feature branch**: `git checkout -b feat/your-feature`
2. **Write comprehensive tests** for your changes
3. **Run security checks**: `pnpm test __tests__/security/`
4. **Update documentation** if needed
5. **Create pull request** with detailed description

### PR Requirements
- [ ] All tests passing
- [ ] Security tests included
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
- [ ] Code follows style guidelines

## 🔍 Code Review Guidelines

### Security Review Checklist
- [ ] Input sanitization implemented
- [ ] Authentication/authorization checked
- [ ] No sensitive data exposed
- [ ] Rate limiting considered
- [ ] Security logging added

### Code Quality Checklist
- [ ] TypeScript types properly defined
- [ ] Error handling implemented
- [ ] Tests comprehensive
- [ ] Performance considerations
- [ ] Accessibility standards met

## 🛠️ Development Environment

### Required Tools
- **Node.js**: v18+ (recommended: v20)
- **pnpm**: Package manager
- **PostgreSQL**: Database (Neon recommended)
- **Git**: Version control

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Email (optional)
RESEND_API_KEY="your-key"

# Google Calendar (optional)
GOOGLE_CLIENT_ID="your-id"
GOOGLE_CLIENT_SECRET="your-secret"
```

## 📚 Resources

- **TRPC Documentation**: https://trpc.io/
- **Next.js App Router**: https://nextjs.org/docs/app
- **Prisma ORM**: https://www.prisma.io/docs
- **Radix UI**: https://www.radix-ui.com/

## 🤝 Community

- **Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Security**: Report vulnerabilities privately

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Yura Scheduler v3! Your help makes this project better for everyone. 🎉