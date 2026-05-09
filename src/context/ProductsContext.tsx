import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../domain/product";
import { loadProducts, saveProducts } from "../persistence/productsStorage";

type ProductsContextValue = {
  products: Product[];
  addProduct: (input: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (id: string) => void;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());

  const addProduct = useCallback((input: Omit<Product, "id">) => {
    const item: Product = { ...input, id: crypto.randomUUID() };
    setProducts((prev) => {
      const next = [...prev, item];
      saveProducts(next);
      return next;
    });
  }, []);

  const updateProduct = useCallback(
    (id: string, patch: Partial<Omit<Product, "id">>) => {
      setProducts((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, ...patch } : p,
        );
        saveProducts(next);
        return next;
      });
    },
    [],
  );

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProducts(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ products, addProduct, updateProduct, removeProduct }),
    [products, addProduct, updateProduct, removeProduct],
  );

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error("useProducts 必须在 ProductsProvider 内使用");
  }
  return ctx;
}
