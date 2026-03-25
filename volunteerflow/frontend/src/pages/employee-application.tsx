'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, CheckCircle, Loader2, Briefcase } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none';

const labelClass = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  department: string;
  position: string;
  employmentType: string;
  startDate: string;
  aboutYourself: string;
  hearAbout: string;
  certifications: string;
  consent: boolean;
}

const initialForm: FormData = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  department: '',
  position: '',
  employmentType: '',
  startDate: '',
  aboutYourself: '',
  hearAbout: '',
  certifications: '',
  consent: false,
};

export default function EmployeeApplicationPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    form.fullName.trim() !== '' &&
    form.email.trim() !== '' &&
    form.department !== '' &&
    form.position.trim() !== '' &&
    form.aboutYourself.trim() !== '' &&
    form.consent;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-neutral-900 dark:to-neutral-800 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-[560px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
            <Heart className="w-8 h-8 text-emerald-600" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Green Future Foundation
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Employment Application
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8">
          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-5">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                Application Received!
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                Thank you {form.fullName}! We&apos;ve received your application for{' '}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {form.position}
                </span>{' '}
                in{' '}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {form.department}
                </span>
                . Our HR team will review your application and contact you within 5–7 business days.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                  <Briefcase className="w-3.5 h-3.5" />
                  {form.department}
                </span>
                {form.employmentType && (
                  <span className="inline-flex items-center px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium rounded-full">
                    {form.employmentType}
                  </span>
                )}
              </div>
              <Link
                href="/"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-sm text-center block"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            /* Application form */
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Personal Information
                </h2>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Jane Smith"
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
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
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
                  type="text"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
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
                  value={form.location}
                  onChange={handleChange}
                  placeholder="San Francisco, CA"
                  className={inputClass}
                />
              </div>

              <hr className="border-neutral-100 dark:border-neutral-700" />

              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Role Details
                </h2>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className={labelClass}>
                  Department of Interest <span className="text-red-500">*</span>
                </label>
                <select
                  id="department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select a department…</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="Programs">Programs</option>
                  <option value="IT">IT</option>
                  <option value="Communications">Communications</option>
                  <option value="Events">Events</option>
                  <option value="Fundraising">Fundraising</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Position */}
              <div>
                <label htmlFor="position" className={labelClass}>
                  Position / Role Applied For <span className="text-red-500">*</span>
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={form.position}
                  onChange={handleChange}
                  placeholder="e.g. Program Coordinator"
                  className={inputClass}
                  required
                />
              </div>

              {/* Employment Type */}
              <div>
                <label htmlFor="employmentType" className={labelClass}>
                  Employment Type Preferred
                </label>
                <select
                  id="employmentType"
                  name="employmentType"
                  value={form.employmentType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select type…</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className={labelClass}>
                  Available Start Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <hr className="border-neutral-100 dark:border-neutral-700" />

              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  About You
                </h2>
              </div>

              {/* About yourself */}
              <div>
                <label htmlFor="aboutYourself" className={labelClass}>
                  Tell us about yourself and why you want to join our team{' '}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="aboutYourself"
                  name="aboutYourself"
                  rows={5}
                  value={form.aboutYourself}
                  onChange={handleChange}
                  placeholder="Share your background, experience, and what motivates you to apply…"
                  className={inputClass}
                  required
                />
              </div>

              {/* How did you hear */}
              <div>
                <label htmlFor="hearAbout" className={labelClass}>
                  How did you hear about this position?
                </label>
                <select
                  id="hearAbout"
                  name="hearAbout"
                  value={form.hearAbout}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select an option…</option>
                  <option value="Job board">Job board</option>
                  <option value="Our website">Our website</option>
                  <option value="Referral">Referral</option>
                  <option value="Social media">Social media</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Certifications */}
              <div>
                <label htmlFor="certifications" className={labelClass}>
                  Do you have relevant certifications or qualifications?{' '}
                  <span className="text-xs font-normal text-neutral-400">(optional)</span>
                </label>
                <textarea
                  id="certifications"
                  name="certifications"
                  rows={2}
                  value={form.certifications}
                  onChange={handleChange}
                  placeholder="List any relevant certifications, licenses, or qualifications…"
                  className={inputClass}
                />
              </div>

              {/* Consent */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  required
                />
                <label
                  htmlFor="consent"
                  className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer leading-snug"
                >
                  I confirm that the information provided is accurate and I agree to the application
                  terms <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
          Green Future Foundation &mdash; All rights reserved
        </p>
      </div>
    </div>
  );
}
