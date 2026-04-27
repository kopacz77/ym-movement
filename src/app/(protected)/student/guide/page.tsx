// src/app/(protected)/student/guide/page.tsx
"use client";

import {
  BookOpen,
  Calendar,
  CreditCard,
  HelpCircle,
  Plus,
  Settings,
  User,
  Video,
  X,
} from "lucide-react";
import { useId } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function StudentGuidePage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Student Guide</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about using YM Movement
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
              onClick={() => scrollToSection("getting-started")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <User className="h-4 w-4 text-[#0891b2]" />
              <span className="font-medium">Getting Started</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("booking")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="font-medium">Booking Lessons</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("schedule")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="font-medium">My Schedule</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("coaches")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <User className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Choosing a Coach</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("payments")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <CreditCard className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Payments</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("profile")}
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer text-left"
            >
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Profile & Settings</span>
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
        {/* Getting Started Section */}
        <GuideSection
          uid={uid}
          id="getting-started"
          icon={<User className="h-5 w-5" />}
          title="Getting Started"
          description="Welcome to YM Movement! Here's how to get started"
        >
          <div className="space-y-6">
            <SubSection
              icon={<User className="h-4 w-4" />}
              title="After Registration"
              steps={[
                "You've created your account - great first step!",
                "Your account needs to be approved by the instructor",
                "You'll receive an email when approved (usually within 24 hours)",
                "Once approved, you can book lessons right away",
                "Your dashboard shows your upcoming lessons and payment status",
              ]}
            />

            <SubSection
              icon={<BookOpen className="h-4 w-4" />}
              title="What You Can Do"
              steps={[
                "📅 Book available lesson time slots",
                "👀 View your upcoming lesson schedule",
                "💳 Track your payments and pay for lessons",
                "👤 Update your profile and contact information",
                "📧 Receive notifications about lessons and payments",
                "❌ Cancel lessons if needed (with advance notice)",
                "👩‍🏫 Choose from multiple coaches for different lesson types",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">✨ Your Dashboard</p>
              <p className="text-sm text-blue-800 mt-1">
                The Dashboard is your home base - it shows upcoming lessons, recent activity, and
                payment status. You can also browse coaches to find the right instructor for your
                needs!
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Booking Lessons Section */}
        <GuideSection
          uid={uid}
          id="booking"
          icon={<Calendar className="h-5 w-5" />}
          title="Booking Lessons"
          description="How to find and book available lesson times"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Finding Available Times"
              steps={[
                'Go to "Book Lessons" from the sidebar or dashboard',
                "Browse the calendar to see available time slots",
                "Green slots are available - click to see details",
                "View time, location (rink), and lesson duration",
                "You can filter by date to find times that work for you",
              ]}
            />

            <SubSection
              icon={<Plus className="h-4 w-4" />}
              title="Booking a Lesson"
              steps={[
                "Click on an available (green) time slot",
                "Review the lesson details (time, rink, price)",
                'Click "Book This Lesson" to confirm',
                "Your lesson is now scheduled!",
                "You'll see it on your schedule and dashboard",
                "The instructor receives a notification of your booking",
              ]}
            />

            <SubSection
              icon={<X className="h-4 w-4" />}
              title="Canceling a Lesson"
              steps={[
                'Go to "My Schedule" to see your booked lessons',
                "Click on the lesson you need to cancel",
                'Click "Cancel Lesson" button',
                "Confirm the cancellation",
                "Please cancel with advance notice when possible",
                "The time slot becomes available for other students",
              ]}
            />

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-900">⚠️ Cancellation Policy</p>
              <div className="text-sm text-red-800 mt-2 space-y-1">
                <p>
                  Cancellations made <strong>more than 24 hours</strong> before the lesson are free
                  of charge.
                </p>
                <p>
                  Cancellations made <strong>within 24 hours</strong> are considered late — you will
                  be responsible for the full lesson fee.
                </p>
                <p className="mt-2 text-xs">
                  View full policies on the Policies page in the sidebar.
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">📱 Mobile Tip</p>
              <p className="text-sm text-green-800 mt-1">
                On mobile, use the Week view for easier browsing - it shows just 7 days at a time
                instead of the whole month. Tap the Week/Month/Day buttons to switch views.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Choosing a Coach Section */}
        <GuideSection
          uid={uid}
          id="coaches"
          icon={<User className="h-5 w-5" />}
          title="Choosing a Coach"
          description="Finding the right instructor for your lessons"
        >
          <div className="space-y-6">
            <SubSection
              icon={<User className="h-4 w-4" />}
              title="Browsing Coaches"
              steps={[
                "When booking a lesson, you can filter by coach",
                "Each coach has their own schedule and availability",
                "Different coaches may specialize in different lesson types",
                "Coach names appear on available time slots",
                "Select a coach to see only their available times",
              ]}
            />

            <SubSection
              icon={<Video className="h-4 w-4" />}
              title="Video Lessons"
              steps={[
                "Some lessons are offered via video call instead of at the rink",
                "Video lessons show a camera icon instead of a map pin on your schedule",
                "On normal days, you can browse and book Video Lesson slots yourself",
                "During instructor travel periods, video lessons may be assigned to you directly",
                "You'll receive a notification when assigned to a video lesson",
                "Check your schedule for video lesson details and timing",
              ]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">👩‍🏫 Multiple Coaches</p>
              <p className="text-sm text-blue-800 mt-1">
                YM Movement works with multiple coaches! Each coach sets their own schedule and
                pricing. Browse available time slots to find the right coach and time for you.
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
          title="My Schedule"
          description="Viewing and managing your booked lessons"
        >
          <div className="space-y-6">
            <SubSection
              icon={<Calendar className="h-4 w-4" />}
              title="Viewing Your Schedule"
              steps={[
                'Click "My Schedule" in the sidebar',
                "See all your upcoming lessons in calendar view",
                "Click on any lesson to see full details",
                "View lesson type, time, location, and notes",
                "Check if payment is pending or completed",
              ]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <LessonTypeCard
                title="Private Lessons"
                color="bg-blue-100 text-blue-700 border-blue-300"
                description="One-on-one instruction focused on technique and skills"
              />
              <LessonTypeCard
                title="Choreography"
                color="bg-purple-100 text-purple-700 border-purple-300"
                description="Program development and routine choreography"
              />
              <LessonTypeCard
                title="Group Lessons"
                color="bg-emerald-50 text-emerald-700 border-emerald-300"
                description="Small group instruction with other students"
              />
              <LessonTypeCard
                title="Competition Prep"
                color="bg-orange-100 text-orange-700 border-orange-300"
                description="Intensive preparation for upcoming competitions"
              />
              <LessonTypeCard
                title="Off-Ice Dance"
                color="bg-rose-100 text-rose-700 border-rose-300"
                description="Off-ice dance training for posture, expression, and movement"
              />
              <LessonTypeCard
                title="Video Lessons"
                color="bg-teal-100 text-teal-700 border-teal-300"
                description="Remote instruction via video call — look for the camera icon"
              />
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-purple-900">🎯 Lesson Types</p>
              <p className="text-sm text-purple-800 mt-1">
                Your instructor assigns the lesson type when scheduling. Each type focuses on
                different aspects of your skating development and may have different pricing. Video
                lessons show a camera icon on your lesson card.
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Payments Section */}
        <GuideSection
          uid={uid}
          id="payments"
          icon={<CreditCard className="h-5 w-5" />}
          title="Payments"
          description="How to view and pay for your lessons"
        >
          <div className="space-y-6">
            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="Viewing Your Payments"
              steps={[
                'Go to "Payments" from the sidebar',
                "See all lesson payments (pending and paid)",
                "Each payment shows:",
                "  • Lesson date and type",
                "  • Amount due",
                "  • Payment status (Pending/Paid)",
                "Filter by status to see what you owe",
              ]}
            />

            <SubSection
              icon={<CreditCard className="h-4 w-4" />}
              title="How to Pay"
              steps={[
                "Find the payment marked as 'Pending'",
                "Note the amount due and lesson details",
                "Send payment via Venmo, Zelle, or Cash:",
                "  • Venmo: @yura-min",
                "  • Zelle: (714) 743-7071",
                "  • Cash: Bring exact amount to your lesson",
                "Include your name and lesson date in the payment note",
                "Your instructor will mark it as paid once received",
              ]}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900">💳 Payment Methods</p>
              <div className="text-sm text-amber-800 mt-2 space-y-2">
                <div>
                  <p className="font-semibold">Venmo</p>
                  <p>Send to: @yura-min</p>
                  <p className="text-xs mt-1">
                    Include your name and lesson date in the payment note
                  </p>
                </div>
                <div className="mt-3">
                  <p className="font-semibold">Zelle</p>
                  <p>Send to: (714) 743-7071</p>
                  <p className="text-xs mt-1">
                    Include your name and lesson date in the payment note
                  </p>
                </div>
                <div className="mt-3">
                  <p className="font-semibold">Cash</p>
                  <p>Bring exact amount to your lesson</p>
                  <p className="text-xs mt-1">
                    Hand payment directly to your instructor at the rink
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">⏰ When to Pay</p>
              <p className="text-sm text-blue-800 mt-1">
                Payments are typically due within 2-3 days after your lesson. You may receive a
                reminder email if payment is pending. Pay promptly to keep your account in good
                standing!
              </p>
            </div>
          </div>
        </GuideSection>

        <Separator />

        {/* Profile & Settings Section */}
        <GuideSection
          uid={uid}
          id="profile"
          icon={<Settings className="h-5 w-5" />}
          title="Profile & Settings"
          description="Managing your account information"
        >
          <div className="space-y-6">
            <SubSection
              icon={<User className="h-4 w-4" />}
              title="Updating Your Profile"
              steps={[
                'Go to "Profile" from the sidebar',
                "Update your contact information:",
                "  • Name and email address",
                "  • Phone number",
                "  • Parent/guardian contact info (if applicable)",
                "  • Emergency contact details",
                'Click "Save Changes" when done',
              ]}
            />

            <SubSection
              icon={<Settings className="h-4 w-4" />}
              title="Account Settings"
              steps={[
                'Go to "Settings" from the sidebar',
                "Notifications tab: Toggle email notifications on/off",
                "  • Enable lesson reminders (24 hours before your lesson)",
                "Appearance tab: Enable dark mode for a darker color theme",
                "Password tab: Change your password",
                "  • Enter current password, then new password twice",
                '  • Click "Update Password" to save',
              ]}
            />

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-900">📧 Keep Info Updated</p>
              <p className="text-sm text-green-800 mt-1">
                Make sure your email and phone number are current so you receive important
                notifications about lessons, schedule changes, and payment reminders!
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
              question="How long does approval take?"
              answer="Usually within 24 hours! You'll receive an email when approved. If it's been longer, check your spam folder or contact the instructor."
            />
            <FAQCard
              question="Can I book multiple lessons at once?"
              answer="Yes! Browse the calendar and book as many available time slots as you'd like. Each one will appear on your schedule."
            />
            <FAQCard
              question="What if I need to cancel a lesson?"
              answer="Go to My Schedule, click the lesson, and select Cancel Lesson. Please give as much advance notice as possible so the time slot can be made available to others."
            />
            <FAQCard
              question="How do I know my payment was received?"
              answer="Check the Payments page - once your instructor confirms receipt, the status will change from 'Pending' to 'Paid'."
            />
            <FAQCard
              question="Can I change my lesson type?"
              answer="Lesson types are assigned by the instructor based on your training needs. If you have questions about your lesson type, please discuss with your instructor."
            />
            <FAQCard
              question="What if I can't find a time that works?"
              answer="Check back regularly as new time slots are added! You can also reach out to your instructor to request additional availability."
            />
            <FAQCard
              question="Do I get notifications about my lessons?"
              answer="Yes! You'll receive notifications for booking confirmations, payment reminders, and important schedule updates. Check the bell icon in the header."
            />
            <FAQCard
              question="Can I use the app on my phone?"
              answer="Absolutely! The app works great on mobile. For the best experience on your phone, use the Week view when booking lessons."
            />
            <FAQCard
              question="Can I choose which coach I want?"
              answer="Yes! When booking lessons, you can filter available time slots by coach. Each coach has their own schedule and availability, so browse to find the best fit for you."
            />
            <FAQCard
              question="What are Off-Ice Dance lessons?"
              answer="Off-Ice Dance lessons focus on dance training off the ice to improve posture, expression, and movement quality. They appear on your schedule like other lesson types."
            />
            <FAQCard
              question="What are Video Lessons?"
              answer="Video Lessons are remote sessions conducted via video call. They appear on your schedule with a camera icon instead of a map pin. During instructor travel periods, your coach may assign you a video lesson directly."
            />
          </div>
        </GuideSection>
      </div>

      {/* Footer */}
      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Still Have Questions?</p>
            <p className="text-sm text-muted-foreground">
              Don't hesitate to reach out to your instructor for any additional help or questions
              about using the platform or your skating lessons.
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
}: {
  title: string;
  color: string;
  description: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm opacity-90">{description}</p>
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
