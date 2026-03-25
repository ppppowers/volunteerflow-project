// Shared signup form config — read by /signup page and mutated by SignupFormBuilder

export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'date' | 'image';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  options?: FormFieldOption[]; // for select fields
  halfWidth?: boolean; // render in 2-col grid alongside another half-width field
}

export interface SignupFormConfig {
  type: 'volunteer' | 'member' | 'employee';
  title: string;
  description: string;
  submitLabel: string;
  fields: FormField[];
}

const VOLUNTEER_FIELDS: FormField[] = [
  { id: 'name',              type: 'text',     label: 'Full Name',                    placeholder: 'Your full name',             required: true,  enabled: true,  halfWidth: true },
  { id: 'email',             type: 'email',    label: 'Email Address',                placeholder: 'you@example.com',            required: true,  enabled: true,  halfWidth: true },
  { id: 'phone',             type: 'tel',      label: 'Phone Number',                 placeholder: '+1 555-0000',                required: false, enabled: true,  halfWidth: true },
  { id: 'location',          type: 'text',     label: 'Location',                     placeholder: 'City, State',                required: false, enabled: true,  halfWidth: true },
  { id: 'availability',      type: 'select',   label: 'Availability',                 placeholder: undefined,                    required: false, enabled: true,  halfWidth: true,
    options: [
      { value: 'weekends',  label: 'Weekends' },
      { value: 'weekdays',  label: 'Weekdays' },
      { value: 'evenings',  label: 'Evenings' },
      { value: 'flexible',  label: 'Flexible' },
    ],
  },
  { id: 'skills',            type: 'textarea', label: 'Skills & Experience',          placeholder: 'List any relevant skills or experience…', required: false, enabled: true },
  { id: 'motivation',        type: 'textarea', label: 'Why do you want to volunteer?',placeholder: 'Tell us what motivates you…',             required: false, enabled: true },
  { id: 'emergency_contact', type: 'text',     label: 'Emergency Contact',            placeholder: 'Name and phone number',      required: false, enabled: true },
  { id: 'terms',             type: 'checkbox', label: 'I agree to the terms and conditions', placeholder: undefined,              required: true,  enabled: true },
];

const MEMBER_FIELDS: FormField[] = [
  { id: 'name',            type: 'text',     label: 'Full Name',                  placeholder: 'Your full name',  required: true,  enabled: true, halfWidth: true },
  { id: 'email',           type: 'email',    label: 'Email Address',              placeholder: 'you@example.com', required: true,  enabled: true, halfWidth: true },
  { id: 'phone',           type: 'tel',      label: 'Phone Number',               placeholder: '+1 555-0000',     required: false, enabled: true, halfWidth: true },
  { id: 'location',        type: 'text',     label: 'Location',                   placeholder: 'City, State',     required: false, enabled: true, halfWidth: true },
  { id: 'membership_type', type: 'select',   label: 'Membership Type',            placeholder: undefined,         required: true,  enabled: true, halfWidth: true,
    options: [
      { value: 'standard',  label: 'Standard'  },
      { value: 'premium',   label: 'Premium'   },
      { value: 'corporate', label: 'Corporate' },
    ],
  },
  { id: 'referral',        type: 'select',   label: 'How did you hear about us?', placeholder: undefined,         required: false, enabled: true, halfWidth: true,
    options: [
      { value: 'friend', label: 'Friend or family'  },
      { value: 'social', label: 'Social media'      },
      { value: 'search', label: 'Search engine'     },
      { value: 'event',  label: 'Community event'   },
      { value: 'other',  label: 'Other'             },
    ],
  },
  { id: 'motivation', type: 'textarea', label: 'Why do you want to join?', placeholder: 'Tell us about yourself…', required: false, enabled: true },
  { id: 'terms',      type: 'checkbox', label: 'I agree to the membership terms and conditions', placeholder: undefined, required: true, enabled: true },
];

const EMPLOYEE_FIELDS: FormField[] = [
  { id: 'name',            type: 'text',     label: 'Full Name',                    placeholder: 'Your full name',        required: true,  enabled: true, halfWidth: true },
  { id: 'email',           type: 'email',    label: 'Email Address',                placeholder: 'you@example.com',       required: true,  enabled: true, halfWidth: true },
  { id: 'phone',           type: 'tel',      label: 'Phone Number',                 placeholder: '+1 555-0000',           required: false, enabled: true, halfWidth: true },
  { id: 'location',        type: 'text',     label: 'Location',                     placeholder: 'City, State',           required: false, enabled: true, halfWidth: true },
  { id: 'department',      type: 'text',     label: 'Department',                   placeholder: 'e.g. Operations',       required: false, enabled: true, halfWidth: true },
  { id: 'position',        type: 'text',     label: 'Position Applied For',         placeholder: 'Job title',             required: false, enabled: true, halfWidth: true },
  { id: 'employment_type', type: 'select',   label: 'Employment Type',              placeholder: undefined,               required: false, enabled: true, halfWidth: true,
    options: [
      { value: 'full-time',   label: 'Full-time'  },
      { value: 'part-time',   label: 'Part-time'  },
      { value: 'contractor',  label: 'Contractor' },
    ],
  },
  { id: 'start_date',      type: 'date',     label: 'Desired Start Date',           placeholder: undefined,               required: false, enabled: true, halfWidth: true },
  { id: 'about',           type: 'textarea', label: 'About Yourself',               placeholder: 'Tell us about your background and experience…', required: false, enabled: true },
  { id: 'certifications',  type: 'textarea', label: 'Certifications & Qualifications', placeholder: 'List any relevant certifications…', required: false, enabled: true },
  { id: 'referral',        type: 'select',   label: 'How did you hear about us?',   placeholder: undefined,               required: false, enabled: true,
    options: [
      { value: 'job_board', label: 'Job board'        },
      { value: 'referral',  label: 'Employee referral'},
      { value: 'social',    label: 'Social media'     },
      { value: 'website',   label: 'Our website'      },
      { value: 'other',     label: 'Other'            },
    ],
  },
  { id: 'consent', type: 'checkbox', label: 'I confirm the information provided is accurate and I consent to background checks if required', placeholder: undefined, required: true, enabled: true },
];

// Mutable module-level configs — admin builder writes here, /signup page reads here
export const signupFormConfigs: Record<'volunteer' | 'member' | 'employee', SignupFormConfig> = {
  volunteer: {
    type: 'volunteer',
    title: 'Volunteer Application',
    description: 'Join our team of dedicated volunteers and make a difference in your community.',
    submitLabel: 'Submit Application',
    fields: VOLUNTEER_FIELDS,
  },
  member: {
    type: 'member',
    title: 'Membership Application',
    description: 'Become a member and enjoy exclusive benefits and access to our community.',
    submitLabel: 'Apply for Membership',
    fields: MEMBER_FIELDS,
  },
  employee: {
    type: 'employee',
    title: 'Employment Application',
    description: 'Apply to join our team and help us create meaningful impact.',
    submitLabel: 'Submit Application',
    fields: EMPLOYEE_FIELDS,
  },
};
