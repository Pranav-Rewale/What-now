import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [formState, setFormState] = useState({ open: false, idea: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const openCreateForm = () => setFormState({ open: true, idea: null });
  const openEditForm = (idea) => setFormState({ open: true, idea });
  const closeForm = () => setFormState({ open: false, idea: null });
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleIdeaSuccess = () => {
    closeForm();
    triggerRefresh();
  };

  return (
    <AppContext.Provider value={{ formState, openCreateForm, openEditForm, closeForm, refreshKey, triggerRefresh, handleIdeaSuccess }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
