import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProductsProvider } from "../context/ProductsContext";
import { ThemeProvider } from "../context/ThemeContext";
import { LoadingScreen } from "../components/LoadingScreen";

const ProductList = lazy(() =>
  import("../pages/ProductList").then((m) => ({ default: m.ProductList }))
);
const AddProduct = lazy(() =>
  import("../pages/AddProduct").then((m) => ({ default: m.AddProduct }))
);
const EditProduct = lazy(() =>
  import("../pages/EditProduct").then((m) => ({ default: m.EditProduct }))
);

function PageLoading() {
  return <LoadingScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ProductsProvider>
        <HashRouter>
          <div className="theme-toggle-wrap">
            <ThemeToggle />
          </div>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<ProductList />} />
              <Route path="/add" element={<AddProduct />} />
              <Route path="/edit/:id" element={<EditProduct />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </ProductsProvider>
    </ThemeProvider>
  );
}
