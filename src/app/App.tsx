import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { ProductsProvider } from "../context/ProductsContext";
import { ThemeProvider } from "../context/ThemeContext";
import { AddProduct } from "../pages/AddProduct";
import { EditProduct } from "../pages/EditProduct";
import { ProductList } from "../pages/ProductList";

export default function App() {
  return (
    <ThemeProvider>
      <ProductsProvider>
        <BrowserRouter>
          <div className="theme-toggle-wrap">
            <ThemeToggle />
          </div>
          <Routes>
            <Route path="/" element={<ProductList />} />
            <Route path="/add" element={<AddProduct />} />
            <Route path="/edit/:id" element={<EditProduct />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ProductsProvider>
    </ThemeProvider>
  );
}
