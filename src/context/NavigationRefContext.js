import React from 'react';

export const NavigationRefContext = React.createContext(null);

/** Shared ref set by NavigationContainer — usable outside the provider tree (e.g. AppLockOverlay). */
export const rootNavigationRef = { current: null };
