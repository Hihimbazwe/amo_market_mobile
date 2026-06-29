import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationRefContext } from './NavigationRefContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigationRef = useContext(NavigationRefContext);


  useEffect(() => {
    let isMounted = true;

    // Load persisted user data on startup
    const loadStorageData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        const storedToken = await AsyncStorage.getItem('@auth_token');
        if (!isMounted) return;
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setAuthToken(storedToken);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStorageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (userData) => {
    try {
      const nextUser = userData?.user || userData;
      const nextToken = userData?.token || null;
      setUser(nextUser);
      setAuthToken(nextToken);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(nextUser));
      await AsyncStorage.setItem('@last_active_time', Date.now().toString());
      if (nextToken) {
        await AsyncStorage.setItem('@auth_token', nextToken);
      } else {
        await AsyncStorage.removeItem('@auth_token');
      }
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
  };

  /**
   * updateUser — merges partial updates into the current user object and
   * persists the result to AsyncStorage.  Use this whenever the account
   * status changes (e.g. deactivation) so we don't have to log the user out.
   */
  const updateUser = async (partialUpdate) => {
    try {
      const updated = { ...user, ...partialUpdate };
      setUser(updated);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update user state', e);
    }
  };

  const logout = async (isManual = true) => {
    try {
      setUser(null);
      setAuthToken(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('@auth_user');
      await AsyncStorage.removeItem('@auth_token');
      if (isManual) {
        await AsyncStorage.removeItem('@auto_logout_redirect');
        // Navigate to home screen only on manual logout
        if (navigationRef?.current) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
          });
        }
      }
    } catch (e) {
      console.error('Failed to clear auth state', e);
    }
  };

  // Derived helpers consumed by seller screens
  const isSellerDeactivated = !!(user?.accountStatus && user.accountStatus !== 'ACTIVE');
  const canSell = !isSellerDeactivated && !user?.sellingDisabled;
  const canChat = !isSellerDeactivated && !user?.chatDisabled;

  return (
    <AuthContext.Provider value={{ user, authToken, isAuthenticated, loading, login, logout, updateUser, isSellerDeactivated, canSell, canChat }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
