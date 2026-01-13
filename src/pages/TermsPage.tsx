import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              to={paths.AUTH}
              className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back</span>
            </Link>
          </div>

          {/* Title */}
          <div className="text-center space-y-4 mb-12">
            <div className="flex justify-center">
              <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                <FileText size={48} className="text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text">
              Terms of Service
            </h1>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Last updated: January 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-hover dark:border-dark-hover p-6 sm:p-8 space-y-8">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                1. Acceptance of Terms
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                By accessing or using T4SyncWave ("the App"), you agree to be bound by these Terms
                of Service. If you do not agree, do not use the App.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                2. Description of Service
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                T4SyncWave allows users to synchronize music playback experiences within private
                groups. Users may join groups, listen together, and interact in real time.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                3. User Accounts
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                You may create an account using a phone number (OTP authentication) or email and
                password. You are responsible for maintaining the security of your account.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                4. User Content
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                Users may upload or share audio content within private groups. You retain ownership
                of your content. You represent that you have the rights to any content you share.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                5. Prohibited Conduct
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary ml-4">
                <li>Use the App for illegal purposes</li>
                <li>Upload content you do not have rights to</li>
                <li>Harass or abuse other users</li>
                <li>Attempt to disrupt the service</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                6. Termination
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We may suspend or terminate access if you violate these Terms.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                7. Disclaimer
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                The App is provided "as is" without warranties of any kind. We do not guarantee
                uninterrupted or error-free service.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                8. Limitation of Liability
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                To the maximum extent permitted by law, T4SyncWave is not liable for indirect or
                incidental damages.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                9. Changes to Terms
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We may update these Terms from time to time. Continued use of the App means
                acceptance of the new Terms.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                10. Contact
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                If you have questions about these Terms, contact us at:{' '}
                <a
                  href="mailto:support@t4syncwave.com"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  support@t4syncwave.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
