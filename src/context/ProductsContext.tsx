import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../domain/product";
import {
  addProduct,
  createWebSocket,
  loadProducts,
  mergeProducts,
  removeProduct,
  updateProduct,
} from "../persistence/productsStorage";

type ProductsContextValue = {
  products: Product[];
  addProduct: (input: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (id: string) => void;
  mergeProductsFromImport: (incoming: Product[]) => void;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const data = await loadProducts();
        if (!cancelled) setProducts(data);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const destroy = createWebSocket((newProducts) => {
      setProducts(newProducts);
    });
    return destroy;
  }, []);

  const addProductHandler = useCallback(async (input: Omit<Product, "id">) => {
    try {
      await addProduct(input);
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  }, []);

  const updateProductHandler = useCallback(
    async (id: string, patch: Partial<Omit<Product, "id">>) => {
      try {
        await updateProduct(id, patch);
      } catch (error) {
        console.error("Failed to update product:", error);
      }
    },
    [],
  );

  const removeProductHandler = useCallback(async (id: string) => {
    try {
      await removeProduct(id);
    } catch (error) {
      console.error("Failed to remove product:", error);
    }
  }, []);

  const mergeProductsFromImportHandler = useCallback(async (incoming: Product[]) => {
    try {
      await mergeProducts(incoming);
    } catch (error) {
      console.error("Failed to merge products:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      addProduct: addProductHandler,
      updateProduct: updateProductHandler,
      removeProduct: removeProductHandler,
      mergeProductsFromImport: mergeProductsFromImportHandler,
    }),
    [products, addProductHandler, updateProductHandler, removeProductHandler, mergeProductsFromImportHandler],
  );

  if (loading) {
    return <div>加载中...</div>;
  }

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