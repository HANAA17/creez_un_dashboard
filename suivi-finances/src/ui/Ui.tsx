import React, { createContext, useContext, useState } from 'react';

export interface AddPreset {
  type?: 'expense' | 'income' | 'transfer';
  categoryId?: string;
}

interface UiApi {
  addPreset: AddPreset | null;
  settingsOpen: boolean;
  openAdd(preset?: AddPreset): void;
  closeAdd(): void;
  setSettingsOpen(open: boolean): void;
}

const Ctx = createContext<UiApi | null>(null);

export const useUi = (): UiApi => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi doit être utilisé dans <UiProvider>');
  return v;
};

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [addPreset, setAddPreset] = useState<AddPreset | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <Ctx.Provider value={{ addPreset, settingsOpen, openAdd: (p = {}) => setAddPreset(p), closeAdd: () => setAddPreset(null), setSettingsOpen }}>
      {children}
    </Ctx.Provider>
  );
}
