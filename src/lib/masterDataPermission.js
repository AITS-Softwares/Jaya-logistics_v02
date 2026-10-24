import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import { MASTER_PERMISSION_REGISTRY, canUseMasterPermission } from '@/lib/masterPermissionRegistry';

const MASTER_DATA_MODULE = 'Master Data';

/**
 * Authoritative permission check shared by Master Data APIs.  Master records
 * action checks are keyed by master resource; transactional modules can request
 * read-only lookup access without receiving permission to manage the master.
 */
export async function validateMasterDataRequest(req, action = 'view', resourceKey = 'Master Data', { allowLookup = false } = {}) {
  const token = getTokenFromHeader(req);
  if (!token) return { user: null, error: 'Authentication required. Please login.', status: 401 };

  const tokenUser = verifyJWT(token);
  if (!tokenUser) return { user: null, error: 'Authentication failed. Please login again.', status: 401 };
  if (tokenUser.type === 'company') return { user: tokenUser, error: null, status: 200 };

  // Permission updates must take effect immediately instead of waiting for the
  // seven-day JWT to expire. Use the signed token for identity/session data,
  // but always authorize against current roles and modules in the database.
  await dbConnect();
  const currentUser = await CompanyUser.findById(tokenUser.id)
    .select('modules roles type companyId isActive')
    .lean();
  if (!currentUser) return { user: null, error: 'User no longer exists.', status: 401 };
  if (currentUser.isActive === false) return { user: null, error: 'This user account is inactive.', status: 401 };

  const rawModules = currentUser.modules;
  const modules = rawModules instanceof Map
    ? Object.fromEntries(rawModules.entries())
    : rawModules?.toObject?.() || rawModules || {};
  const user = {
    ...tokenUser,
    type: currentUser.type || tokenUser.type,
    roles: currentUser.roles || [],
    companyId: currentUser.companyId || tokenUser.companyId,
    modules,
  };

  const isCompanyAdmin = user.type === 'company' || user.roles?.includes('Admin');
  if (isCompanyAdmin) return { user, error: null, status: 200 };

  if (resourceKey !== MASTER_DATA_MODULE && canUseMasterPermission(user, resourceKey, action)) {
    return { user, error: null, status: 200, access: 'master' };
  }

  const resource = MASTER_PERMISSION_REGISTRY.find((item) => item.key === resourceKey);
  if (allowLookup && action === 'view' && resource?.lookupModules?.some((moduleName) => {
    const module = user.modules?.[moduleName];
    return module?.selected === true && ['view', 'create', 'edit', 'approve'].some((permission) => module.permissions?.[permission] === true);
  })) {
    return { user, error: null, status: 200, access: 'lookup' };
  }

  const moduleData = user.modules?.[resourceKey];
  if (resourceKey === MASTER_DATA_MODULE && moduleData?.selected === true) {
    const allowed = action === 'view'
      ? moduleData.permissions?.view !== false
      : moduleData.permissions?.[action] === true;
    if (allowed) return { user, error: null, status: 200, access: 'master' };
  }
  const message = resourceKey === MASTER_DATA_MODULE
    ? 'You do not have permission to access Master Data.'
    : `You do not have permission to ${action} ${resourceKey}.`;
  return { user: null, error: message, status: 403 };
}

export const MASTER_DATA_MODULE_NAME = MASTER_DATA_MODULE;
