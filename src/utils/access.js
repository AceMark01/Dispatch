// Page-access control. Each user (managed in Setting) has a pageAccess list;
// they only see/enter the pages assigned to them. Admin role sees everything.

export const PAGES = [
  { key: 'Dashboard',     path: '/dashboard', label: 'Dashboard' },
  { key: 'Upload',        path: '/upload',    label: 'Upload Report' },
  { key: 'Confirm order', path: '/approval',  label: 'Confirm order' },
  { key: 'Approved',      path: '/approved',  label: 'Approved' },
  { key: 'Setting',       path: '/setting',   label: 'Setting' },
];

export const PAGE_KEYS = PAGES.map(p => p.key);

const isAdmin = (user) => (user?.role || '').toString().toUpperCase() === 'ADMIN';

// The list of page keys a user is allowed to see
export const allowedKeys = (user) => {
  if (isAdmin(user)) return PAGE_KEYS;
  const raw = user?.pageAccess ?? '';
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map(s => s.trim()).filter(Boolean);
};

// Can this user open a given page?
export const canAccess = (user, key) => isAdmin(user) || allowedKeys(user).includes(key);

// First page the user is allowed to open (used for redirects). null if none.
export const firstAllowedPath = (user) => {
  const keys = allowedKeys(user);
  const page = PAGES.find(p => keys.includes(p.key));
  return page ? page.path : null;
};
