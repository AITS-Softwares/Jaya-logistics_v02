import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

const MASTER_DATA_MODULE = 'Master Data';

/**
 * Authoritative permission check shared by Master Data APIs.  Master records
 * deliberately have no user-level delete action: only a company administrator
 * may perform a deletion where an older API still supports one.
 */
export async function validateMasterDataRequest(req, action = 'view') {
  const token = getTokenFromHeader(req);
  if (!token) return { user: null, error: 'Authentication required. Please login.', status: 401 };

  const user = verifyJWT(token);
  if (!user) return { user: null, error: 'Authentication failed. Please login again.', status: 401 };

  const isCompanyAdmin = user.type === 'company' || user.roles?.includes('Admin');
  if (isCompanyAdmin) return { user, error: null, status: 200 };

  const moduleData = user.modules?.[MASTER_DATA_MODULE];
  if (!moduleData?.selected || moduleData.permissions?.view === false) {
    return { user: null, error: 'You do not have permission to access Master Data.', status: 403 };
  }

  if (action === 'view') return { user, error: null, status: 200 };
  if (action === 'delete') {
    return { user: null, error: 'You do not have permission to delete Master Data.', status: 403 };
  }
  if (moduleData.permissions?.[action] !== true) {
    return { user: null, error: `You do not have permission to ${action} Master Data.`, status: 403 };
  }

  return { user, error: null, status: 200 };
}

export const MASTER_DATA_MODULE_NAME = MASTER_DATA_MODULE;
