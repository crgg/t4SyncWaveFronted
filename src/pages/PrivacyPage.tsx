import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

export default function PrivacyPage() {
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
                <Shield size={48} className="text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-light-text dark:text-dark-text">
              Privacy Policy
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
                1. Information We Collect
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed mb-3">
                We collect the following information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary ml-4">
                <li>Phone number (for authentication)</li>
                <li>Email address (optional)</li>
                <li>Display name and avatar</li>
                <li>App usage data</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                2. How We Use Information
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed mb-3">
                We use your information to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary ml-4">
                <li>Provide and operate the service</li>
                <li>Authenticate users</li>
                <li>Enable group functionality</li>
                <li>Improve the app experience</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                3. Sharing of Information
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We do not sell your personal data. We only share information when required to
                operate the service or comply with the law.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                4. Data Security
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We take reasonable measures to protect your data. However, no system is 100% secure.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                5. User Rights
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                You may request access, correction, or deletion of your data by contacting us.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                6. Data Retention
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We retain your data as long as your account is active or as required by law.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                7. Children's Privacy
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                The App is not intended for users under the age of 13.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                8. Changes to Privacy Policy
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                We may update this policy from time to time.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                9. Contact
              </h2>
              <p className="text-sm sm:text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                If you have questions about this Privacy Policy, contact us at:{' '}
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
