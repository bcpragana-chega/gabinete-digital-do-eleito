import { createContext, useContext } from "react";

export const GlobalSearchContext = createContext<(() => void) | null>(null);

export function useGlobalSearch() {
  const openSearch = useContext(GlobalSearchContext);

  if (!openSearch) {
    throw new Error("useGlobalSearch deve ser usado dentro de GlobalSearchProvider.");
  }

  return openSearch;
}
