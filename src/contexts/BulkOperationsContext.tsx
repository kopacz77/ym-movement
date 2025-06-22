// src/contexts/BulkOperationsContext.tsx
"use client";

import { createContext, useContext, useState } from "react";

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

  const clearLastBulkCreation = () => {
    setLastBulkCreation(null);
  };

  return (
    <BulkOperationsContext.Provider
      value={{
        lastBulkCreation,
        setLastBulkCreation,
        clearLastBulkCreation,
      }}
    >
      {children}
    </BulkOperationsContext.Provider>
  );
}

export function useBulkOperations() {
  const context = useContext(BulkOperationsContext);
  if (context === undefined) {
    throw new Error("useBulkOperations must be used within a BulkOperationsProvider");
  }
  return context;
}
