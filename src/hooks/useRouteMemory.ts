
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_ROUTE_KEY = 'lastVisitedRoute';

export const useRouteMemory = () => {
  const location = useLocation();

  useEffect(() => {
    // Gem nuværende route i localStorage
    localStorage.setItem(LAST_ROUTE_KEY, location.pathname + location.search);
  }, [location.pathname, location.search]);

  const getLastRoute = (): string => {
    return localStorage.getItem(LAST_ROUTE_KEY) || '/';
  };

  const clearLastRoute = () => {
    localStorage.removeItem(LAST_ROUTE_KEY);
  };

  return {
    getLastRoute,
    clearLastRoute
  };
};
