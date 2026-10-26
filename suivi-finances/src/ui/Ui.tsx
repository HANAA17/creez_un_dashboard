import React, { createContext, useContext, useState } from 'react';

export interface AddPreset {
  type?: 'expense' | 'income' | 'transfer';
  categoryId?: string;
}

interface UiApi {
  addPreset: AddPreset | null;
  openAdd(preset?: AddPreset): void;
  closeAdd(): void;
}

const Ctx = createContext<UiApi | null>(null);

export const useUi = (): UiApi => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi doit être utilisé dans <UiProvider>');
  return v;
};

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [addPreset, setAddPreset] = useState<AddPreset | null>(null);
  return (
    <Ctx.Provider value={{ addPreset, openAdd: (p = {}) => setAddPreset(p), closeAdd: () => setAddPreset(null) }}>
      {children}
    </Ctx.Provider>
  );
}
