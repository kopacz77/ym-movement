// src/app/(protected)/coach/guide/page.tsx
"use client";

import {
  BookOpen,
  Calendar,
  Clock,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  User,
  Users,
  Video,
} from "lucide-react";
import { useId } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function CoachGuidePage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Coach Guide</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about using the YM Movement Coach Portal
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
              onClick={() => scrollToSection("dashboard")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <LayoutDashboard className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("schedule")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="font-medium">Schedule & Blocked Dates</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("proposals")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Time Slot Proposals</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("students")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Your Students</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("earnings")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <CreditCard className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Earnings & Payments</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("profile")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <User className="h-4 w-4 text-teal-600" />
              <span className="font-medium">Profile & Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <HelpCircle className="h-4 w-4 text-pink-600" />
              <span className="font-medium">Common Questions</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Sections */}
      <div className="space-y-4">
        {/* Dashboard Section */}
        <GuideSection
          uid={uid}
          id="dashboard"
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Your Dashboard"
          description="Overview of your coaching activity at a glance"
        >
          <div className="space-y-6">
            <SubSection
              icon={<LayoutDashboard className="h-4 w-4" />}
              title="Dashboard Overview"
              steps={[
                "Your dashboard is the first thing you see after logging in",
                "Overview cards show: Total Students, Upcoming Lessons, Completed This Month, and Monthly Earnings",
                "Upcoming Lessons widget shows your next 5 scheduled lessons with student names and details",
                "Past Lessons widget shows your 5 most recent completed lessons",
                "All earnings reflect your revenue split percentage",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Quick Start</p>
              <p className="text-sm text-blue-800 mt-1">
                Check your dashboard each morning to see your upcoming lessons, review student
                details, and track your earnings. Everything updates in real time!
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Schedule Section */}
        <GuideSection
          uid={uid}
          id="schedule"
          icon={<Calendar className="h-5 w-5" />}
          title="Schedule & Blocked Dates"
          description="Viewing your calendar and managing availability"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Viewing Your Schedule"
              steps={[
                'Go to "Schedule" from the sidebar',
                "Your calendar shows all time slots assigned to you",
                "Switch between Day, Week, and Month views",
                "Click any time slot to see full details (students, lesson types, notes)",
                "Filter by rink to focus on a specific location",
                "Use timezone filter when viewing slots across different rinks",
              ]}
            />

            <SubSection
              icon={<Clock className="h-4 w-4" />}
              title="Managing Blocked Dates"
              steps={[
                'Click the "Blocked Dates" button on the Schedule page',
                "Add blocked periods for travel, competitions, or other unavailability",
                "Enter a title, date range, type (Travel/Competition/Other), and optional description",
                "Blocked dates appear on your calendar as colored overlays",
                "Students cannot book your slots on blocked dates",
                "You can edit or delete blocked dates anytime",
              ]}
            />

            <SubSection
              icon={<Video className="h-4 w-4" />}
              title="Video Lessons During Travel"
              steps={[
                "Even while traveling, you can offer video lessons",
                "The admin creates Video Lesson slots on your blocked dates",
                "Students are manually assigned to these virtual slots",
                "Video lessons show with a camera icon on student schedules",
                "Students cannot self-book video lessons on blocked dates",
              ]}
            />

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">Calendar Colors</p>
              <div className="text-sm text-green-800 mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Green = Available (no students assigned)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>Amber = Partially filled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Blue = Fully booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>Gray = Blocked date (Travel/Competition)</span>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Proposals Section */}
        <GuideSection
          uid={uid}
          id="proposals"
          icon={<Clock className="h-5 w-5" />}
          title="Time Slot Proposals"
          description="Requesting new time slots for your schedule"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Clock className="h-4 w-4" />}
              title="Submitting a Proposal"
              steps={[
                'Go to "Proposals" from the sidebar',
                'Click "Propose New Availability"',
                "Select the rink where you want to teach",
                "Pick a date (must be in the future)",
                "Set start and end times",
                "Set maximum students (1-10)",
                'Click "Submit Proposal" to send for admin review',
              ]}
            />

            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Tracking Your Proposals"
              steps={[
                "All your proposals appear in the proposals list",
                "Status shows as Pending (yellow), Approved (green), or Denied (red)",
                "Approved proposals become real time slots on the calendar",
                "Denied proposals may include admin notes explaining why",
                "You can cancel pending proposals if plans change",
              ]}
            />

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-900">Proposal Tips</p>
              <p className="text-sm text-purple-800 mt-1">
                Submit proposals a few days in advance so the admin has time to review. Include
                realistic times and avoid proposing slots that overlap with your existing schedule.
                Approved slots are immediately visible to students for booking.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Students Section */}
        <GuideSection
          uid={uid}
          id="students"
          icon={<Users className="h-5 w-5" />}
          title="Your Students"
          description="Viewing your assigned student roster"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Users className="h-4 w-4" />}
              title="Student Roster"
              steps={[
                'Go to "Students" from the sidebar',
                "View all students currently assigned to you",
                "See each student's name, email, skill level, and total lessons",
                "Students are automatically assigned when they book your time slots",
                "The admin can also manually assign students to your lessons",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Student Relationships</p>
              <p className="text-sm text-blue-800 mt-1">
                Your student list grows automatically as students book lessons with you. You can see
                each student's skill level and lesson count to help personalize your teaching
                approach.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Earnings Section */}
        <GuideSection
          uid={uid}
          id="earnings"
          icon={<CreditCard className="h-5 w-5" />}
          title="Earnings & Payments"
          description="Tracking your revenue and payment history"
        >
          <div className="space-y-6">
            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="Earnings Overview"
              steps={[
                'Go to "Earnings" from the sidebar',
                "Overview cards show: Total Earnings, This Month, Pending Payments, and Revenue Split",
                "All earnings are calculated after your revenue split percentage is applied",
                "Lesson types include Private, Choreography, Group, Competition Prep, and Off-Ice Dance",
                "For example: if your split is 70% and a lesson costs $100, you earn $70",
                "Pending payments show money that students haven't yet paid",
              ]}
            />

            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="Payment History"
              steps={[
                "The payment history table shows all lesson payments",
                "Each entry shows: date, student name, lesson type, amount, status, and payment method",
                "Completed payments (green) have been received and verified",
                "Pending payments (yellow) are awaiting student payment",
                "The admin handles payment verification and reminders",
              ]}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900">Revenue Split</p>
              <p className="text-sm text-amber-800 mt-1">
                Your revenue split percentage is set by the platform admin. It determines your share
                of each lesson payment. Check your Earnings page to see your current split rate
                displayed on the overview cards.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Profile Section */}
        <GuideSection
          uid={uid}
          id="profile"
          icon={<User className="h-5 w-5" />}
          title="Profile & Google Calendar"
          description="Managing your coach profile and calendar integration"
        >
          <div className="space-y-6">
            <SubSection
              icon={<User className="h-4 w-4" />}
              title="Updating Your Profile"
              steps={[
                'Go to "Profile" from the sidebar',
                "Update your bio to describe your coaching style and background",
                "Add your skills as comma-separated tags",
                "Enter certifications and years of experience",
                "Your photo URL can link to a profile image",
                'Click "Save" to update your profile',
                "Lesson rates are shown for reference (set by admin)",
              ]}
            />

            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Google Calendar Integration"
              steps={[
                "Scroll to the Google Calendar section on your Profile page",
                'Click "Connect Google Calendar" to link your account',
                "Sign in with your Google account and grant calendar access",
                "Once connected, lessons automatically sync to your Google Calendar",
                "New bookings, cancellations, and changes update your calendar in real time",
                'Click "Disconnect" anytime to remove the integration',
              ]}
            />

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">Calendar Sync</p>
              <p className="text-sm text-green-800 mt-1">
                Connecting Google Calendar is highly recommended! It keeps your personal calendar in
                sync with your teaching schedule so you never double-book yourself.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* FAQ Section */}
        <GuideSection
          uid={uid}
          id="faq"
          icon={<HelpCircle className="h-5 w-5" />}
          title="Common Questions"
          description="Frequently asked questions"
        >
          <div className="space-y-4">
            <FAQCard
              question="How do I get time slots on the calendar?"
              answer="Submit a time slot proposal from the Proposals page. Once the admin approves it, the slot appears on your calendar and students can book it. The admin can also create slots for you directly."
            />
            <FAQCard
              question="Can I edit or delete my time slots?"
              answer="Time slot management is handled by the admin. If you need to change or remove a slot, submit a new proposal or contact the admin. You can cancel pending proposals from the Proposals page."
            />
            <FAQCard
              question="How do blocked dates work?"
              answer="Block dates when you're unavailable (travel, competitions, etc.). Students won't see your slots on blocked dates. The admin can still create Video Lesson slots on your blocked dates for remote teaching."
            />
            <FAQCard
              question="When do I get paid?"
              answer="Payments are tracked per lesson. Students pay via Venmo, Zelle, or cash. The admin verifies payments and your Earnings page shows your revenue after the split percentage is applied."
            />
            <FAQCard
              question="What's my revenue split?"
              answer="Your revenue split is set by the admin (default is 70%). This means you earn 70% of each lesson payment. The admin may also set coach-specific lesson rates for you. Check your Earnings page to see your current rate."
            />
            <FAQCard
              question="Can students book my slots directly?"
              answer="Yes! Once your proposal is approved and the time slot is on the calendar, students can browse and book it themselves. The admin can also assign students to your slots manually."
            />
            <FAQCard
              question="How does Google Calendar sync work?"
              answer="Connect your Google Calendar from the Profile page. Once connected, all lesson bookings, cancellations, and changes automatically appear on your Google Calendar in real time."
            />
            <FAQCard
              question="What are Video Lessons?"
              answer="Video Lessons are remote sessions using the virtual 'Video Lesson' rink. The admin can create these slots even on your blocked travel dates and assign students to them. Students see a camera icon on their schedule for video lessons."
            />
            <FAQCard
              question="What are Off-Ice Dance lessons?"
              answer="Off-Ice Dance is a lesson type for off-ice dance training. The admin assigns this type when scheduling your lessons. Pricing for Off-Ice Dance follows the same structure as other lesson types."
            />
            <FAQCard
              question="Will new features be added to the Coach Portal?"
              answer="Yes! The Coach Portal is actively growing. New features and capabilities will be added over time to give you more tools for managing your coaching."
            />
            <FAQCard
              question="Do I get notifications?"
              answer="Yes! You receive notifications when students book or cancel lessons with you. Check the bell icon in the header for recent updates."
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
              If you have questions not covered in this guide, reach out to the platform admin for
              additional support.
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

function FAQCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg border">
      <p className="font-medium text-sm mb-2">Q: {question}</p>
      <p className="text-sm text-muted-foreground">A: {answer}</p>
    </div>
  );
}
