// src/app/privacy/page.tsx
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <p className="text-muted-foreground">Last Updated: March 10, 2025</p>
        
        <h2 className="mt-8 text-xl font-semibold">1. Introduction</h2>
        <p>
          YM Movement (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
        </p>
        
        <h2 className="mt-8 text-xl font-semibold">2. Information We Collect</h2>
        <p>We collect information that you provide directly to us, including:</p>
        <ul className="list-disc pl-6">
          <li>Personal identification information (name, email address, phone number)</li>
          <li>For minor students, parent/guardian contact information</li>
          <li>Student&apos;s age, skating level and experience</li>
          <li>Schedule preferences and availability</li>
          <li>Payment information (processed through secure third-party providers)</li>
          <li>Progress notes and assessment data</li>
          <li>Communications between you and our coaches</li>
          <li>Emergency contact information</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6">
          <li>Provide, maintain, and improve our services</li>
          <li>Process payments and manage scheduling</li>
          <li>Communicate with parents/guardians about lessons, events, and progress</li>
          <li>Track and assess student development</li>
          <li>Personalize coaching experiences</li>
          <li>Ensure student safety and appropriate coaching approaches</li>
          <li>Comply with legal obligations</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">4. Sharing of Information</h2>
        <p>
          We do not sell or rent personal information to third parties. We may share information with:
        </p>
        <ul className="list-disc pl-6">
          <li>Coaches and staff who need access to provide services</li>
          <li>Service providers who assist with our business operations (payment processing, scheduling, etc.)</li>
          <li>Legal authorities when required by law</li>
          <li>Emergency contacts in case of emergency</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">5. Data Security</h2>
        <p>
          We implement appropriate security measures to protect personal information, including that of children. However, no internet transmission is completely secure, and we cannot guarantee the security of information transmitted through our platform.
        </p>
        
        <h2 className="mt-8 text-xl font-semibold">6. Your Rights</h2>
        <p>Parents/guardians and adult users have the right to:</p>
        <ul className="list-disc pl-6">
          <li>Access the personal information we hold about you or your child</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your or your child&apos;s data (subject to legal requirements)</li>
          <li>Opt out of certain communications</li>
          <li>Review your child&apos;s progress information</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">7. Children&apos;s Privacy</h2>
        <p>
          <strong>We take children&apos;s privacy very seriously:</strong>
        </p>
        <ul className="list-disc pl-6">
          <li>Accounts for children under 13 must be created and managed by parents or legal guardians</li>
          <li>We collect only the information necessary to provide coaching services</li>
          <li>Parents/guardians have the right to review information collected about their child</li>
          <li>Parents/guardians may request deletion of their child&apos;s information (where not required for legitimate business purposes)</li>
          <li>We do not allow children under 13 to independently create accounts or provide personal information</li>
          <li>We do not knowingly collect more information than necessary from children</li>
          <li>All communications regarding children under 13 are directed to their parents/guardians</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">8. Parental Consent</h2>
        <p>
          For students under 13, we require verifiable parental consent before collecting any personal information. Parents/guardians must:
        </p>
        <ul className="list-disc pl-6">
          <li>Create and manage the account on behalf of their child</li>
          <li>Provide explicit consent during registration</li>
          <li>Serve as the primary contact for all communications</li>
          <li>Be responsible for updating and maintaining accurate information</li>
        </ul>
        
        <h2 className="mt-8 text-xl font-semibold">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. We will notify parents/guardians of any material changes by posting the new policy on this page and updating the &ldquo;Last Updated&rdquo; date.
        </p>
        
        <h2 className="mt-8 text-xl font-semibold">10. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or your child&apos;s information, please contact us at:
          <br />
          Email: privacy@ymicedance.com
          <br />
          Phone: (555) 123-4567
        </p>
      </div>
      
      <div className="mt-12 text-center">
        <Link href="/" className="text-primary hover:underline">Return to Home</Link>
      </div>
    </div>
  );
}