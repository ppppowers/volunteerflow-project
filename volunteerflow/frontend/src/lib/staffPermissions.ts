export const PERMISSIONS = {
  ORGS_VIEW:            'orgs.view',
  ORGS_VIEW_SENSITIVE:  'orgs.view_sensitive',
  ORGS_EDIT_BASIC:      'orgs.edit_basic',
  ORGS_EDIT_CONTACT:    'orgs.edit_contact',
  ORGS_EDIT_PLAN:       'orgs.edit_plan',
  ORGS_EDIT_STATUS:     'orgs.edit_status',
  ORGS_EDIT_BILLING:    'orgs.edit_billing',
  ORGS_ASSIGN_REP:      'orgs.assign_rep',
  NOTES_VIEW:           'notes.view',
  NOTES_CREATE:         'notes.create',
  NOTES_EDIT_OWN:       'notes.edit_own',
  NOTES_EDIT_ANY:       'notes.edit_any',
  NOTES_DELETE:         'notes.delete',
  AUDIT_VIEW_ORG:       'audit.view_org',
  AUDIT_VIEW_ALL:       'audit.view_all',
  AUDIT_EXPORT:         'audit.export',
  SUPPORT_VIEW_MODE:    'support.view_mode',
  SUPPORT_IMPERSONATION:'support.impersonation',
  EMPLOYEES_VIEW:       'employees.view',
  EMPLOYEES_CREATE:     'employees.create',
  EMPLOYEES_EDIT:       'employees.edit',
  EMPLOYEES_DISABLE:    'employees.disable',
  ROLES_VIEW:           'roles.view',
  ROLES_MANAGE:         'roles.manage',
  FEATURE_FLAGS_MANAGE: 'feature_flags.manage',
  DASHBOARD_MGMT:       'dashboard.view_management_metrics',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function canDo(permissions: string[], perm: Permission): boolean {
  return permissions.includes(perm);
}
