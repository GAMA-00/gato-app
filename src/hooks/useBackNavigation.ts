import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const useBackNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentPath = location.pathname;

  // Main navigation routes that should NOT show back button
  const mainRoutes = [
    '/client/categories',
    '/client/bookings',
    '/client/invoices',
    '/dashboard',
    '/calendar',
    '/services',
    '/achievements',
    '/'
  ];

  // Check if current route is a main route
  const isMainRoute = mainRoutes.some(route => currentPath === route);

  if (isMainRoute) {
    return {
      shouldShowBackButton: false,
      handleBack: () => {},
      backLabel: 'Volver'
    };
  }

  // Define navigation logic for specific routes
  const handleBack = () => {
    // Client category details -> categories list
    if (currentPath.match(/^\/client\/category\/[^/]+$/)) {
      navigate('/client/categories');
      return;
    }

    // Booking summary -> categories
    if (currentPath === '/client/booking-summary') {
      navigate('/client/categories');
      return;
    }

    // Payment status -> dashboard or categories based on role
    if (currentPath.match(/^\/payment-status\/[^/]+$/)) {
      if (user?.role === 'provider') {
        navigate('/dashboard');
      } else {
        navigate('/client/categories');
      }
      return;
    }

    // Booking confirmations -> bookings list
    if (currentPath.match(/^\/recurring-booking-confirmation\/[^/]+$/)) {
      navigate('/client/bookings');
      return;
    }

    if (currentPath.match(/^\/booking-confirmation\/[^/]+$/)) {
      navigate('/client/bookings');
      return;
    }

    // For all other routes, go back in history
    navigate(-1);
  };

  return {
    shouldShowBackButton: true,
    handleBack,
    backLabel: 'Volver'
  };
};
