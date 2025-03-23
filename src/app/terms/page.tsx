// src/app/terms/page.tsx
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>

      <div className="prose max-w-none">
        <p className="text-muted-foreground">Last Updated: March 10, 2025</p>

        <h2 className="mt-8 text-xl font-semibold">1. Agreement to Terms</h2>
        <p>
          By accessing or using YM Movement services, you agree to be bound by these Terms of
          Service. For users under 18, a parent or legal guardian must agree to these terms on the
          minor&apos;s behalf. If you do not agree to these terms, please do not use our services.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Description of Services</h2>
        <p>
          YM Movement provides ice dance coaching, training, scheduling, and progress tracking
          services for students of all ages, including children as young as 5 years old. Our
          platform facilitates booking lessons, monitoring development, and communication between
          students, parents, and coaches.
        </p>

        <h2 className="mt-8 text-xl font-semibold">3. User Accounts and Parental Responsibility</h2>
        <p>
          <strong>For adult students:</strong> You are responsible for maintaining the
          confidentiality of your account credentials and for all activities under your account.
        </p>
        <p>
          <strong>For students under 18:</strong> Parents or legal guardians must:
        </p>
        <ul className="list-disc pl-6">
          <li>Create and manage accounts on behalf of their children</li>
          <li>Provide accurate and complete information when creating the account</li>
          <li>Supervise their child&apos;s use of our services</li>
          <li>Be present during lessons for children under 10</li>
          <li>Be the primary contact for communications</li>
          <li>Be responsible for all payments and scheduling</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">4. Scheduling and Cancellations</h2>
        <p>
          Lessons must be booked at least 24 hours in advance, subject to availability.
          Cancellations made less than 24 hours before a scheduled lesson may incur a cancellation
          fee of 50% of the lesson cost. No-shows will be charged the full lesson fee.
        </p>
        <p>
          For lessons with students under 13, a parent or designated guardian must be present at the
          facility during the entire lesson.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Payment Terms</h2>
        <p>
          Payment is required at the time of booking. We accept major credit cards and electronic
          payments. Prices are subject to change, but changes will not affect already booked
          lessons. Refunds are available according to our cancellation policy.
        </p>
        <p>
          For recurring lessons, parents/guardians will be notified before any automatic charges are
          processed.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Student Conduct and Safety</h2>
        <p>All students (and parents of minor students) are expected to:</p>
        <ul className="list-disc pl-6">
          <li>Arrive on time for scheduled lessons</li>
          <li>Follow safety instructions and rink rules</li>
          <li>Maintain respectful communication with coaches and staff</li>
          <li>Wear appropriate skating attire, including required safety equipment</li>
          <li>Disclose any medical conditions that may affect skating activities</li>
          <li>Adhere to age-appropriate behavior expectations</li>
        </ul>
        <p>
          For young students (under 10), parents must ensure proper preparation for lessons,
          including appropriate clothing, equipment, and physical readiness.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Intellectual Property</h2>
        <p>
          All content, features, and functionality of our platform, including choreography, training
          methods, and teaching materials, are the exclusive property of YM Movement and are
          protected by copyright, trademark, and other intellectual property laws.
        </p>

        <h2 className="mt-8 text-xl font-semibold">
          8. Limitation of Liability and Assumption of Risk
        </h2>
        <p>
          Ice skating involves inherent risks. By using our services, you acknowledge these risks
          and agree that YM Movement is not liable for injuries sustained during training.
          Parents/guardians acknowledge these risks on behalf of minor children.
        </p>
        <p>
          We employ qualified coaches and maintain appropriate safety standards, but participation
          in ice dance activities carries inherent risk of injury. Parents/guardians assume this
          risk on behalf of their children.
        </p>

        <h2 className="mt-8 text-xl font-semibold">9. Media Release and Child Protection</h2>
        <p>
          We may take photographs or videos during lessons for training purposes. Any public use of
          such media featuring students under 18 requires explicit parental consent. Parents may opt
          out of media permissions at any time.
        </p>
        <p>
          We maintain strict protocols to ensure child safety and appropriate interaction between
          staff and minor students.
        </p>

        <h2 className="mt-8 text-xl font-semibold">10. Termination</h2>
        <p>
          We reserve the right to terminate or suspend any account and access to our services at our
          sole discretion, without notice, for conduct that we believe violates these Terms or is
          harmful to other users, us, or third parties, or for any other reason.
        </p>

        <h2 className="mt-8 text-xl font-semibold">11. Changes to Terms</h2>
        <p>
          We may modify these Terms at any time. We will provide notice of significant changes. Your
          continued use of our services after such modifications constitutes your acceptance of the
          updated Terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the state of California, without regard to its
          conflict of law principles. Any disputes arising from these Terms will be subject to the
          exclusive jurisdiction of the courts in Los Angeles County, California.
        </p>

        <h2 className="mt-8 text-xl font-semibold">13. Contact Information</h2>
        <p>
          If you have questions about these Terms, please contact us at:
          <br />
          Email: terms@ymicedance.com
          <br />
          Phone: (555) 123-4567
        </p>
      </div>

      <div className="mt-12 text-center">
        <Link href="/" className="text-primary hover:underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
