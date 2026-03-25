'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, CheckCircle, Loader2 } from 'lucide-react';

const membershipOptions = [
  { value: 'standard', label: 'Standard — $75/yr' },
  { value: 'premium', label: 'Premium — $150/yr' },
  { value: 'corporate', label: 'Corporate — $500/yr' },
];

const referralOptions = [
  { value: 'word_of_mouth', label: 'Word of mouth' },
  { value: 'social_media', label: 'Social media' },
  { value: 'website', label: 'Website' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none';

const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  membershipType: string;
  referral: string;
  reason: string;
  terms: boolean;
}

const initialForm: FormData = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  membershipType: '',
  referral: '',
  reason: '',
  terms: false,
};

export default function MemberSignupPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    form.fullName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.membershipType !== '' &&
    form.terms;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  }

  const selectedMembership = membershipOptions.find((o) => o.value === form.membershipType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[520px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Green Future Foundation
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Member Application
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8">
          {submitted ? (
            /* Success State */
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-5">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                Application Submitted!
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
                Thank you{' '}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {form.fullName}
                </span>
                ! We&apos;ve received your membership application and will be in touch within 2–3
                business days.
              </p>
              {selectedMembership && (
                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full mb-8">
                  {selectedMembership.label}
                </span>
              )}
              <Link
                href="/"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm text-center block"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                Apply for Membership
              </h2>

              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={form.fullName}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className={labelClass}>
                    Location / City
                  </label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="San Francisco, CA"
                    value={form.location}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                {/* Membership Type */}
                <div>
                  <label htmlFor="membershipType" className={labelClass}>
                    Membership Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="membershipType"
                    name="membershipType"
                    value={form.membershipType}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    <option value="" disabled>
                      Select a membership tier…
                    </option>
                    {membershipOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Referral */}
                <div>
                  <label htmlFor="referral" className={labelClass}>
                    How did you hear about us?
                  </label>
                  <select
                    id="referral"
                    name="referral"
                    value={form.referral}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select an option…</option>
                    {referralOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label htmlFor="reason" className={labelClass}>
                    Why do you want to become a member?
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={4}
                    placeholder="Tell us a bit about yourself and why you'd like to join…"
                    value={form.reason}
                    onChange={handleChange}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={form.terms}
                    onChange={handleChange}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer leading-snug"
                  >
                    I agree to the membership terms and code of conduct{' '}
                    <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="mt-7">
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
          &copy; {new Date().getFullYear()} Green Future Foundation. All rights reserved.
        </p>
      </div>
    </div>
  );
}
