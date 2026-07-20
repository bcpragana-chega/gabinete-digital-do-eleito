import { useState, type ReactNode } from "react";
import { GlobalSearchContext } from "@/components/search/global-search-context";
import { UniversalSearch } from "@/components/search/UniversalSearch";

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <GlobalSearchContext.Provider value={() => setOpen(true)}>
      {children}
      <UniversalSearch open={open} onOpenChange={setOpen} showTrigger={false} />
    </GlobalSearchContext.Provider>
  );
}
