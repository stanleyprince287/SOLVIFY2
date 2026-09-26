export const Role = { CUSTOMER: 'CUSTOMER', PROFESSIONAL: 'PROFESSIONAL', ADMIN: 'ADMIN' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountStatus = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', DEACTIVATED: 'DEACTIVATED' } as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const VerificationStatus = {
  UNSUBMITTED: 'UNSUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const JobStatus = {
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REVIEWED: 'REVIEWED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** §6.11 / §13 — the only legal forward transitions. Used by the job service and its tests. */
export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['REVIEWED'],
  REVIEWED: [],
  CANCELLED: [],
};