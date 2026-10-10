import { createContext, useContext } from 'react';
export const TavernImportContext = createContext<{ importFiles: (files: FileList | File[]) => Promise<void>; openCenter: () => void } | null>(null);
export const useTavernImport = () => useContext(TavernImportContext);
