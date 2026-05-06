import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('jarvis_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('jarvis_user')));

  const login = (token, user) => {
    localStorage.setItem('jarvis_token', token);
    localStorage.setItem('jarvis_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('jarvis_token');
    localStorage.removeItem('jarvis_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);