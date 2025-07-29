// src/contexts/BulkOperationsContext.tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BulkOperation = {
  timestamp: number;
  count: number;
  slotIds: string[];
  operation: "create" | "delete";
};

type BulkOperationsContextType = {
  lastBulkCreation: BulkOperation | null;
  setLastBulkCreation: (operation: BulkOperation | null) => void;
  clearLastBulkCreation: () => void;
};

const BulkOperationsContext = createContext<BulkOperationsContextType | undefined>(undefined);

export function BulkOperationsProvider({ children }: { children: React.ReactNode }) {
  const [lastBulkCreation, setLastBulkCreation] = useState<BulkOperation | null>(null);

  const clearLastBulkCreation = useCallback(() => {
    setLastBulkCreation(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      lastBulkCreation,
      setLastBulkCreation,
      clearLastBulkCreation,
    }),
    [lastBulkCreation, clearLastBulkCreation],
  );

  return (
    <BulkOperationsContext.Provider value={contextValue}>{children}</BulkOperationsContext.Provider>
  );
}

export function useBulkOperations() {
  const context = useContext(BulkOperationsContext);
  if (context === undefined) {
    throw new Error("useBulkOperations must be used within a BulkOperationsProvider");
  }
  return context;
}
