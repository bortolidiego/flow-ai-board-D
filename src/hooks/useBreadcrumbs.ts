import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();

  return useMemo(() => {
    const pathnames = location.pathname.split('/').filter(x => x);

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/' }
    ];

    if (pathnames.length > 0) {
      pathnames.forEach((pathname, index) => {
        const href = `/${pathnames.slice(0, index + 1).join('/')}`;
        let label = pathname;

        // Customize labels based on routes
        switch (pathname) {
          case 'brain':
            label = 'Brain';
            break;
          case 'integrations':
            label = 'Integrações';
            break;
          case 'changelog':
            label = 'Changelog';
            break;
          default:
            // Capitalize first letter
            label = pathname.charAt(0).toUpperCase() + pathname.slice(1);
        }

        breadcrumbs.push({ label, href });
      });
    }

    return breadcrumbs;
  }, [location.pathname]);
}