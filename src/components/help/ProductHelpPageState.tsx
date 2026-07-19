import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ProductHelpPageState } from "@/lib/ai/product-help";

type ProductHelpPageStateContextValue = {
  pageState?: ProductHelpPageState;
  setPageState: (pageState?: ProductHelpPageState) => void;
};

const ProductHelpPageStateContext = createContext<ProductHelpPageStateContextValue | undefined>(
  undefined,
);

export function ProductHelpPageStateProvider({ children }: { children: ReactNode }) {
  const [pageState, setPageState] = useState<ProductHelpPageState>();
  const value = useMemo(() => ({ pageState, setPageState }), [pageState]);

  return (
    <ProductHelpPageStateContext.Provider value={value}>
      {children}
    </ProductHelpPageStateContext.Provider>
  );
}

export function useProductHelpPageState(pageState?: ProductHelpPageState) {
  const context = useContext(ProductHelpPageStateContext);
  const setPageState = context?.setPageState;
  const serializedState = JSON.stringify(pageState);

  useEffect(() => {
    if (!setPageState) return;

    const publishedState = serializedState
      ? (JSON.parse(serializedState) as ProductHelpPageState)
      : undefined;
    setPageState(publishedState);

    return () => setPageState(undefined);
  }, [serializedState, setPageState]);
}

export function useCurrentProductHelpPageState() {
  return useContext(ProductHelpPageStateContext)?.pageState;
}
