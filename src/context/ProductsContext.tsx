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
  removeProduct,
  replaceProducts,
  saveProductsToFile,
  updateProduct,
} from "../persistence/productsStorage";
import { LoadingScreen } from "../components/LoadingScreen";

type ProductsContextValue = {
  products: Product[];
  addProduct: (input: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id">>) => void;
  removeProduct: (id: string) => void;
  replaceProductsFromImport: (incoming: Product[]) => void;
  saveToDisk: () => Promise<void>;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

function createErrorHandler(action: string) {
  return (error: unknown) => {
    console.error(`Failed to ${action}:`, error);
  };
}

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
        createErrorHandler("load products")(error);
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
      createErrorHandler("add product")(error);
    }
  }, []);

  const updateProductHandler = useCallback(
    async (id: string, patch: Partial<Omit<Product, "id">>) => {
      try {
        await updateProduct(id, patch);
      } catch (error) {
        createErrorHandler("update product")(error);
      }
    },
    [],
  );

  const removeProductHandler = useCallback(async (id: string) => {
    try {
      await removeProduct(id);
    } catch (error) {
      createErrorHandler("remove product")(error);
    }
  }, []);

  const replaceProductsFromImportHandler = useCallback(async (incoming: Product[]) => {
    try {
      await replaceProducts(incoming);
    } catch (error) {
      createErrorHandler("replace products")(error);
    }
  }, []);

  const saveToDiskHandler = useCallback(async () => {
    try {
      await saveProductsToFile();
    } catch (error) {
      createErrorHandler("save products to file")(error);
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      addProduct: addProductHandler,
      updateProduct: updateProductHandler,
      removeProduct: removeProductHandler,
      replaceProductsFromImport: replaceProductsFromImportHandler,
      saveToDisk: saveToDiskHandler,
    }),
    [products, addProductHandler, updateProductHandler, removeProductHandler, replaceProductsFromImportHandler, saveToDiskHandler],
  );

  if (loading) {
    return <LoadingScreen />;
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