import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem('cyberguard_api_key') || 'change-me-secret'
  );
  const [isConfigured, setIsConfigured] = useState(!!localStorage.getItem('cyberguard_api_key'));

  useEffect(() => {
    localStorage.setItem('cyberguard_api_key', apiKey);
    setIsConfigured(!!apiKey);
  }, [apiKey]);

  const updateApiKey = (newKey) => {
    setApiKey(newKey);
  };

  return (
    <AuthContext.Provider value={{ apiKey, isConfigured, updateApiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}