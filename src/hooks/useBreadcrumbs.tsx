import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const pathname = location.pathname;

  const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
    '/': [
      { label: 'Home', href: '/' },
    ],
    '/brain': [
      { label: 'Home', href: '/' },
      { label: 'Brain' },
    ],
    '/brain/new': [
      { label: 'Home', href: '/' },
      { label: 'Brain', href: '/brain' },
      { label: 'Novo Pipeline' },
    ],
  };

  return breadcrumbMap[pathname] || [{ label: 'Home', href: '/' }];
};
