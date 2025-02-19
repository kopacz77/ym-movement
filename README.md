Yura Min Academy Admin & Scheduling System
A full-stack application built with Next.js, TRPC, Prisma, and Tailwind CSS to manage lessons, student registrations, scheduling, and payments. This system also integrates with Google Calendar to synchronize lesson events and offers an admin dashboard for analytics and reporting.

Overview
The application is designed to serve as a management portal for an academy. It provides features such as:

Admin Dashboard: Get a quick overview of the academy’s performance through overview cards, revenue charts, and student activity charts.
Scheduling: Create and manage time slots, recurring patterns, and lessons. Supports both individual and bulk slot creation.
Student Management: Handle new student registrations, pending approvals, profile management, and lesson progress tracking.
Payments: Process payments with status tracking and verification.
Google Calendar Integration: Automatically create, update, or delete Google Calendar events for scheduled lessons.
API & TRPC: A robust backend API built with TRPC that connects to a PostgreSQL database via Prisma.
Development Middleware: A temporary middleware to bypass authentication during development (to be replaced with proper authentication before production).
Features
Responsive UI: Uses Tailwind CSS and custom UI components for a modern, responsive design with dark mode support.
Real-Time Analytics: Displays real-time data about student activity, revenue, and lesson statistics.
Dynamic Scheduling: Advanced scheduling system that includes conflict detection, bulk time slot creation, and recurring event patterns.
Student Progress Tracking: Track and display student attendance, lesson progress, and detailed lesson notes.
TRPC API: Simplifies API development with type-safe queries and mutations.
Google Calendar Service: Manages lesson events by interacting with the Google Calendar API.
Tech Stack
Frontend: Next.js, React, TypeScript, Tailwind CSS, React Query, TRPC
Backend: Node.js, Next.js API routes, Prisma ORM, PostgreSQL
Authentication: NextAuth (middleware currently bypasses auth for rapid development)
Utilities: Google Calendar API integration, date-fns for date formatting
Directory Structure
src/app/
Contains Next.js pages and layouts (including the public, protected, and dashboard pages).

src/components/ui/
Reusable UI components (e.g., buttons, cards, dialogs, alerts, tables, forms).

src/features/admin/
Admin-specific features such as analytics, scheduling, student management, and reports.

src/features/scheduling/
Components, hooks, and utilities related to lesson scheduling and booking.

prisma/
Prisma schema and migration files for database management.

src/lib/
Utility libraries including API client setup (TRPC), authentication options, Google Calendar service, date utilities, and more.

src/providers/
React context providers for React Query and TRPC.

src/server/
Server-side API routing and TRPC context/routers.

src/styles/
Global styles using Tailwind CSS.

src/types/
Shared TypeScript type definitions.

Getting Started
Prerequisites
Node.js (version 14 or above)
Yarn or npm
PostgreSQL database instance
Installation
Clone the Repository

bash
Copy
git clone <repository-url>
cd <repository-directory>
Install Dependencies

bash
Copy
yarn install
# or
npm install
Set Up Environment Variables

Create a .env file at the project root with variables such as:

env
Copy
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
NEXTAUTH_SECRET=your_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
INSTRUCTOR_EMAIL=your_instructor_email
Run Prisma Migrations

Apply the database schema using Prisma:

bash
Copy
npx prisma migrate dev
Start the Development Server

bash
Copy
yarn dev
# or
npm run dev
Scripts
dev – Starts the development server.
build – Builds the project for production.
start – Runs the production server.
prisma:migrate – Runs Prisma migrations.
lint – Lints the codebase using ESLint.
format – Formats the code using Prettier.
Contributing
Contributions are welcome! Please submit issues or pull requests for improvements or bug fixes. Make sure to follow the existing code style and include tests where applicable.

License
This project is licensed under the MIT License.

Acknowledgements
Built with Next.js, TRPC, Prisma, and Tailwind CSS.
Inspired by modern management systems and the need for efficient scheduling and student administration.
Contact
For any questions or support, please contact your.email@example.com.
