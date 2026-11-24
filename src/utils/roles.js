// Mirrors server/src/utils/access.js
export const MANAGER_ROLES = ['admin', 'manager', 'team_lead'];

export const isManager = (user) => !!user && MANAGER_ROLES.includes(user.role);
export const isAdmin = (user) => user?.role === 'admin';

export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  team_lead: 'Team lead',
  employee: 'Employee',
};

export const roleLabel = (role) => ROLE_LABELS[role] || 'Employee';
