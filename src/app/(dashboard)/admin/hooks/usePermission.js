// src/hooks/usePermission.js
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';

export function usePermission() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCompany, setIsCompany] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAdmin(parsedUser?.roles?.includes('Admin') || parsedUser?.type === 'company');
          setIsCompany(parsedUser?.type === 'company');
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    window.addEventListener('erp:user-session-updated', loadUser);
    return () => window.removeEventListener('erp:user-session-updated', loadUser);
  }, []);

  // Use useCallback to memoize the function
  const hasPermission = useCallback((moduleName, action) => {
    if (!user) return false;
    
    // Admin always has access
    if (isAdmin || isCompany) return true;
    
    // Check module permissions
    const modules = user?.modules || {};
    const moduleData = modules[moduleName];
    
    if (!moduleData) return false;
    
    // If module is not selected, deny access
    if (!moduleData.selected) return false;
    
    // Check if the specific action is allowed
    const permissions = moduleData.permissions || {};
    
    // If the action exists and is true, allow access
    if (permissions[action] === true) return true;
    
    // For view permission: if module is selected but view not set, allow view by default
    if (action === 'view' && moduleData.selected) {
      if (permissions.view === false) return false;
      return true;
    }
    
    return false;
  }, [user, isAdmin, isCompany]);

  // Memoize the permission check functions
  const canView = useCallback((moduleName) => hasPermission(moduleName, 'view'), [hasPermission]);
  const canCreate = useCallback((moduleName) => hasPermission(moduleName, 'create'), [hasPermission]);
  const canEdit = useCallback((moduleName) => hasPermission(moduleName, 'edit'), [hasPermission]);
  const canDelete = useCallback((moduleName) => hasPermission(moduleName, 'delete'), [hasPermission]);
  const canApprove = useCallback((moduleName) => hasPermission(moduleName, 'approve'), [hasPermission]);
  const canReject = useCallback((moduleName) => hasPermission(moduleName, 'reject'), [hasPermission]);
  const canExport = useCallback((moduleName) => hasPermission(moduleName, 'export'), [hasPermission]);
  const canPrint = useCallback((moduleName) => hasPermission(moduleName, 'print'), [hasPermission]);

  return {
    user,
    loading,
    isAdmin,
    isCompany,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canReject,
    canExport,
    canPrint
  };
}
