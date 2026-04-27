import { createContext, useContext } from 'react';

export const CourierDrawerContext = createContext({ toggleDrawer: () => {} });
export const useCourierDrawer = () => useContext(CourierDrawerContext);
