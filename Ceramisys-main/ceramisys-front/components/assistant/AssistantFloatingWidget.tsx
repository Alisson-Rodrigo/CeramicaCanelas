'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { AssistantWorkspace } from './AssistantWorkspace';

const allowedRoles = new Set(['Admin', 'Viewer', 'Financial', 'Almoxarifado', 'Sales']);

export function AssistantFloatingWidget() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      try {
        const token = Cookies.get('auth_token');
        if (!token) { setAllowed(false); return; }
        const claims = jwtDecode<{ exp?: number; role?: string | string[] }>(token);
        const roles = Array.isArray(claims.role) ? claims.role : [claims.role];
        setAllowed(Boolean(claims.exp && claims.exp * 1000 > Date.now() && roles.some(role => role && allowedRoles.has(role))));
      } catch { setAllowed(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [pathname]);

  return allowed && pathname?.startsWith('/dashboard') ? <AssistantWorkspace /> : null;
}
