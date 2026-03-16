// src/app/(protected)/admin/guide/page.tsx
"use client";

import {
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Settings,
  UserCheck,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useId } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function AdminGuidePage() {
  // useId() gives each component instance a unique prefix, solving the
  // duplicate-ID problem caused by AppLayout rendering children twice
  // (desktop + mobile containers).
  const uid = useId();

  function scrollToSection(id: string) {
    const el = document.getElementById(`${uid}-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Guide</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about managing YM Movement
        </p>
      </div>

      {/* Quick Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quick Navigation
          </CardTitle>
          <CardDescription>Jump to the section you need</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => scrollToSection("students")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Managing Students</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("scheduling")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="font-medium">Scheduling Lessons</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("payments")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Payment Tracking</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("lesson-types")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <FileText className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Lesson Types</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("settings")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Settings & Pricing</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("coaches")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Coach Management</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("video-lessons")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Video className="h-4 w-4 text-teal-600" />
              <span className="font-medium">Video Lessons</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("tips")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <BookOpen className="h-4 w-4 text-pink-600" />
              <span className="font-medium">Tips & Tricks</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Sections */}
      <div className="space-y-4">
        {/* Students Section */}
        <GuideSection
          uid={uid}
          id="students"
          icon={<Users className="h-5 w-5" />}
          title="Managing Students"
          description="How to add, approve, and manage students"
        >
          <div className="space-y-6">
            <SubSection
              icon={<UserPlus className="h-4 w-4" />}
              title="Adding New Students"
              steps={[
                "Students sign up through the public registration page",
                'New students appear in "Pending Approvals" on your dashboard',
                'Go to Students page and click the "Pending" tab',
                'Review student information and click "Approve" or "Reject"',
                "Approved students can now book lessons",
              ]}
            />

            <SubSection
              icon={<UserCheck className="h-4 w-4" />}
              title="Approving Students"
              steps={[
                'Navigate to Students → "Pending Approvals" tab',
                "Review student details (name, email, parent info)",
                'Click "Approve" to grant booking access',
                "Student receives email confirmation",
                "They can now see and book available time slots",
              ]}
            />

            <SubSection
              icon={<Settings className="h-4 w-4" />}
              title="Setting Custom Pricing"
              steps={[
                "Go to Students page and find the student",
                'Click "Edit" or view student details',
                'Enable "Custom Pricing" toggle',
                "Set prices for each lesson type:",
                "  • Private Lessons",
                "  • Choreography",
                "  • Group Lessons",
                "  • Competition Prep",
                'Click "Save" - prices update automatically for future bookings',
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">💡 Pro Tip</p>
              <p className="text-sm text-blue-800 mt-1">
                Set custom pricing for students with special rates, scholarships, or family
                discounts. Default pricing is used if custom pricing is not enabled.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Scheduling Section */}
        <GuideSection
          uid={uid}
          id="scheduling"
          icon={<Calendar className="h-5 w-5" />}
          title="Scheduling Lessons"
          description="Creating time slots and managing your calendar"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Plus className="h-4 w-4" />}
              title="Creating Time Slots"
              steps={[
                "Go to Schedule page",
                'Click "Create Time Slot" button',
                "Select date, start time, and end time",
                "Choose the rink location",
                "Set maximum number of students (usually 1-4)",
                'Click "Create" to add to calendar',
              ]}
            />

            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Creating Multiple Slots (Bulk Create)"
              steps={[
                'On Schedule page, click "Bulk Create Slots"',
                "Select date range (e.g., all of December)",
                "Choose days of the week (e.g., Mon, Wed, Fri)",
                "Set time (e.g., 9:00 AM - 10:00 AM)",
                "Select rink and max students",
                'Click "Create All" - creates slots for all matching days',
              ]}
            />

            <SubSection
              icon={<UserPlus className="h-4 w-4" />}
              title="Assigning Students to Lessons"
              steps={[
                "Click on any time slot in the calendar",
                'Click "Assign Student with Lesson Type" button',
                "Select the student from dropdown",
                "Choose lesson type (Private, Choreography, Group, Competition Prep)",
                "Add any notes (optional)",
                'Click "Assign" - creates lesson and updates Google Calendar',
              ]}
            />

            <SubSection
              icon={<FileText className="h-4 w-4" />}
              title="Editing Lesson Types & Notes"
              steps={[
                "Click on a time slot with assigned student",
                "Click the pencil ✏️ icon next to student name",
                "Change lesson type from dropdown",
                "Review price preview (updates automatically)",
                "Edit lesson notes (previous notes are pre-filled)",
                'Click "Update Lesson Type" to save changes',
                "Notes appear below the lesson type badge in the slot view",
                "Payment record and Google Calendar update automatically",
              ]}
            />

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">✅ Calendar Colors</p>
              <div className="text-sm text-green-800 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Green = Available (no students assigned)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>Amber = Partially filled (some spots available)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Blue = Full (all spots taken)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span>Gray = Inactive</span>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Lesson Types Section */}
        <GuideSection
          uid={uid}
          id="lesson-types"
          icon={<FileText className="h-5 w-5" />}
          title="Lesson Types & Pricing"
          description="Understanding different lesson types"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LessonTypeCard
                title="Private Lessons"
                color="bg-blue-100 text-blue-700 border-blue-300"
                description="One-on-one instruction focused on individual technique and skills"
                defaultPrice="$120"
              />
              <LessonTypeCard
                title="Choreography"
                color="bg-purple-100 text-purple-700 border-purple-300"
                description="Program development and routine choreography sessions"
                defaultPrice="$150"
              />
              <LessonTypeCard
                title="Group Lessons"
                color="bg-green-100 text-green-700 border-green-300"
                description="Small group instruction (2-4 students)"
                defaultPrice="$80"
              />
              <LessonTypeCard
                title="Competition Prep"
                color="bg-orange-100 text-orange-700 border-orange-300"
                description="Intensive preparation for upcoming competitions"
                defaultPrice="$180"
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-900">💰 How Pricing Works</p>
              <ul className="text-sm text-purple-800 mt-2 space-y-1 list-disc list-inside">
                <li>Each lesson type has a default price (set in Settings)</li>
                <li>Students with custom pricing override defaults</li>
                <li>Prices are automatically calculated when assigning lessons</li>
                <li>Changing lesson type updates payment amount automatically</li>
              </ul>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Payments Section */}
        <GuideSection
          uid={uid}
          id="payments"
          icon={<CreditCard className="h-5 w-5" />}
          title="Payment Tracking"
          description="Managing payments and sending reminders"
        >
          <div className="space-y-6">
            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="Tracking Payments"
              steps={[
                "Go to Payments page to see all payment records",
                "Payments are automatically created when lessons are assigned",
                'Status shows "Pending", "Paid", or "Cancelled"',
                "Use filters to find specific payments (student, status, date)",
                "Payment amount reflects lesson type and custom pricing",
              ]}
            />

            <SubSection
              icon={<FileText className="h-4 w-4" />}
              title="Marking Payments as Paid"
              steps={[
                "Find the payment in the Payments table",
                'Click "Mark as Paid" button',
                "Confirm payment was received (Venmo/Zelle/Cash)",
                "Payment status updates to Paid",
                "Optional: Add notes about payment method",
              ]}
            />

            <SubSection
              icon={<UserCheck className="h-4 w-4" />}
              title="Sending Payment Reminders"
              steps={[
                "Navigate to Payments page",
                "Find payment with Pending status",
                'Click "Send Reminder" button',
                "Student receives email with:",
                "  • Amount due and lesson details",
                "  • Payment instructions (Venmo/Zelle/Cash)",
                "  • Your contact information",
              ]}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900">📧 Payment Methods</p>
              <div className="text-sm text-amber-800 mt-2 space-y-1">
                <p>
                  <strong>Venmo:</strong> @yura-min
                </p>
                <p>
                  <strong>Zelle:</strong> (714) 743-7071
                </p>
                <p>
                  <strong>Cash:</strong> In person at lesson
                </p>
                <p className="mt-2 text-xs">
                  Payment instructions are automatically included in reminder emails
                </p>
              </div>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Settings Section */}
        <GuideSection
          uid={uid}
          id="settings"
          icon={<Settings className="h-5 w-5" />}
          title="Settings & Configuration"
          description="Default pricing and system settings"
        >
          <div className="space-y-6">
            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="Setting Default Prices"
              steps={[
                "Go to Settings page",
                'Find "Default Pricing" section',
                "Set prices for each lesson type:",
                "  • Private Lessons (default: $120)",
                "  • Choreography (default: $150)",
                "  • Group Lessons (default: $80)",
                "  • Competition Prep (default: $180)",
                'Click "Save Changes"',
                "New prices apply to future lesson assignments",
              ]}
            />

            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Managing Rinks"
              steps={[
                'Go to Settings → "Rink Management"',
                'Click "Add Rink" to create new location',
                "Enter rink name, address, and timezone",
                "Rinks appear in time slot creation dropdown",
                "Each rink can have different timezones for accurate scheduling",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">🌐 Timezone Support</p>
              <p className="text-sm text-blue-800 mt-1">
                Each rink has its own timezone. Times are displayed in the rink's local timezone,
                with your local time shown below if different. This ensures accuracy when managing
                multiple locations.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Coach Management Section */}
        <GuideSection
          uid={uid}
          id="coaches"
          icon={<Users className="h-5 w-5" />}
          title="Coach Management"
          description="Managing coaches on your platform"
        >
          <div className="space-y-6">
            <SubSection
              icon={<UserPlus className="h-4 w-4" />}
              title="Adding & Approving Coaches"
              steps={[
                "Go to Coaches page from the sidebar",
                'Click "Add Coach" to create a new coach account',
                "Enter coach details: name, email, bio, skills, certifications",
                "Set lesson pricing for each type (Private, Choreography, Group, Competition Prep)",
                "Set revenue split percentage (default: 70%)",
                "New coaches appear in Pending tab until approved",
                "Approved coaches receive email and can access their Coach Portal",
              ]}
            />

            <SubSection
              icon={<Settings className="h-4 w-4" />}
              title="Managing Coach Status"
              steps={[
                "Go to Coaches page and select a coach",
                "View coach profile, students, lessons, and earnings",
                "Activate or suspend a coach as needed",
                "Suspended coaches lose portal access immediately",
                "Reactivate suspended coaches to restore access",
                "Adjust lesson pricing or revenue split anytime",
              ]}
            />

            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Coach Proposals"
              steps={[
                "Coaches submit time slot proposals from their portal",
                "Proposals appear in the Coach Proposals queue",
                "Review proposed date, time, rink, and capacity",
                "Approve to create the time slot on the calendar",
                "Deny with optional notes explaining why",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">💡 Multi-Coach Scheduling</p>
              <p className="text-sm text-blue-800 mt-1">
                Each coach manages their own schedule independently. Time slots are scoped per-coach,
                so multiple coaches can have overlapping slots at the same rink. Use the coach filter
                on the Schedule page to view individual coach calendars.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Video Lessons Section */}
        <GuideSection
          uid={uid}
          id="video-lessons"
          icon={<Video className="h-5 w-5" />}
          title="Video Lessons"
          description="Teaching remotely with virtual rink slots"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Video className="h-4 w-4" />}
              title="Creating Video Lesson Slots"
              steps={[
                "Video Lesson is a special virtual rink (already set up)",
                'On normal days, create slots and select "Video Lesson" as the rink',
                "On blocked travel/competition dates, click the calendar date",
                "Only Video Lesson will appear as a rink option",
                'An amber banner confirms: "This date is blocked. Only Video Lesson is available."',
                "Create the slot and assign students as usual",
              ]}
            />

            <SubSection
              icon={<Users className="h-4 w-4" />}
              title="How Students See Video Lessons"
              steps={[
                "On normal days, students can browse and book Video Lesson slots themselves",
                "On blocked dates, Video Lesson slots are hidden from student browsing",
                "Students cannot self-book Video Lesson slots on blocked dates",
                "You must manually assign students to Video Lesson slots on blocked dates",
                "Assigned students see the lesson on their schedule with a video camera icon",
                "Students receive normal booking notifications",
              ]}
            />

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">✅ Travel Teaching</p>
              <p className="text-sm text-green-800 mt-1">
                Block your travel dates, then create Video Lesson slots on those dates for students
                who need to continue training. Assign them manually - they'll see the lesson on their
                schedule and get notified.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Tips & Tricks Section */}
        <GuideSection
          uid={uid}
          id="tips"
          icon={<BookOpen className="h-5 w-5" />}
          title="Tips & Best Practices"
          description="Helpful hints for efficient management"
        >
          <div className="space-y-4">
            <TipCard
              emoji="⚡"
              title="Weekly Routine"
              tip="Every Monday morning: 1) Review pending student approvals, 2) Create next week's time slots, 3) Check upcoming lesson schedule"
            />
            <TipCard
              emoji="📱"
              title="Mobile Access"
              tip="The app works great on mobile! On your phone, use Week view for easier navigation - it shows only 7 days at a time instead of the whole month."
            />
            <TipCard
              emoji="🔔"
              title="Stay Updated"
              tip="Check the notifications bell icon regularly for important updates about new student registrations and system messages."
            />
            <TipCard
              emoji="📅"
              title="Bulk Operations"
              tip="Save time by using Bulk Create for recurring weekly lessons. Set it up once and create a month's worth of slots in seconds!"
            />
            <TipCard
              emoji="💵"
              title="Payment Follow-up"
              tip="Send payment reminders 2-3 days after lessons. Most students pay promptly when reminded via email."
            />
            <TipCard
              emoji="📝"
              title="Lesson Notes"
              tip="Add notes when assigning students (e.g., 'Working on axel' or 'Competition in 2 weeks'). These show up in the calendar and help you prepare."
            />
            <TipCard
              emoji="🎯"
              title="Calendar Navigation"
              tip="Desktop: Use drag-and-drop to reschedule lessons. Mobile: Tap time slots to view/edit details. Both sync to Google Calendar automatically!"
            />
            <TipCard
              emoji="👥"
              title="Coach Oversight"
              tip="Use the Dashboard's coach overview cards to monitor each coach's hours, students, and earnings at a glance. Click into any coach for detailed statistics."
            />
            <TipCard
              emoji="🎥"
              title="Video Lessons"
              tip="Traveling but still want to teach? Block your dates for travel, then create Video Lesson slots on those dates. Only virtual rink options appear on blocked dates!"
            />
          </div>
        </GuideSection>
      </div>

      {/* Footer */}
      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Need More Help?</p>
            <p className="text-sm text-muted-foreground">
              If you have questions not covered in this guide, please reach out for additional
              support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function GuideSection({
  uid,
  id,
  icon,
  title,
  description,
  children,
}: {
  uid: string;
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`${uid}-${id}`} className="scroll-mt-4 lg:scroll-mt-28">
      <Collapsible defaultOpen className="group">
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-left">
                <span className="flex items-center gap-2">
                  {icon}
                  {title}
                </span>
                <span className="text-sm text-muted-foreground group-data-[state=open]:rotate-180 transition-transform">
                  ▼
                </span>
              </CardTitle>
              <CardDescription className="text-left">{description}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">{children}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function SubSection({
  icon,
  title,
  steps,
}: {
  icon: React.ReactNode;
  title: string;
  steps: string[];
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <ol className="space-y-2 ml-6">
        {steps.map((step, index) => (
          <li key={index} className="text-sm text-muted-foreground flex gap-3">
            <span className="font-medium text-primary min-w-[1.5rem]">{index + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LessonTypeCard({
  title,
  color,
  description,
  defaultPrice,
}: {
  title: string;
  color: string;
  description: string;
  defaultPrice: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-sm font-bold">{defaultPrice}</span>
      </div>
      <p className="text-sm opacity-90">{description}</p>
    </div>
  );
}

function TipCard({ emoji, title, tip }: { emoji: string; title: string; tip: string }) {
  return (
    <div className="flex gap-3 p-4 bg-muted/50 rounded-lg border">
      <span className="text-2xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{tip}</p>
      </div>
    </div>
  );
}
