import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Load persisted user data on startup
    const loadStorageData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@auth_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, []);

  const login = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
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
      setIsAuthenticated(false);
      await AsyncStorage.removeItem('@auth_user');
      if (isManual) {
        await AsyncStorage.removeItem('@auto_logout_redirect');
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
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, updateUser, isSellerDeactivated, canSell, canChat }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
