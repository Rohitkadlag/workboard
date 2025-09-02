export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

export const TASK_STATUS = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE'
};

export const LEAVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED'
};

export const TICKET_TYPES = {
  BUG: 'BUG',
  REQUEST: 'REQUEST',
  ACCESS: 'ACCESS',
  OTHER: 'OTHER'
};

export const TICKET_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

export const ROLES_ARRAY = Object.values(ROLES);
export const TASK_STATUS_ARRAY = Object.values(TASK_STATUS);
export const LEAVE_STATUS_ARRAY = Object.values(LEAVE_STATUS);
export const TICKET_TYPES_ARRAY = Object.values(TICKET_TYPES);
export const TICKET_PRIORITY_ARRAY = Object.values(TICKET_PRIORITY);
export const TICKET_STATUS_ARRAY = Object.values(TICKET_STATUS);