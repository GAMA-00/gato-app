import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Global state to track the current booking step
let currentBookingStep = 1;
let bookingStepSetter: ((step: number) => void) | null = null;

export const setBookingStep = (step: number) => {
  currentBookingStep = step;
};

export const registerBookingStepSetter = (setter: (step: number) => void) => {
  bookingStepSetter = setter;
};

export const unregisterBookingStepSetter = () => {
  bookingStepSetter = null;
  currentBookingStep = 1;
};

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
    // Handle booking flow multi-step navigation
    if (currentPath.match(/^\/client\/booking\/[^/]+$/)) {
      if (currentBookingStep > 1 && bookingStepSetter) {
        // Navigate to previous step
        bookingStepSetter(currentBookingStep - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      } else {
        // If on first step, go back to categories
        navigate('/client/categories');
        return;
      }
    }

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
