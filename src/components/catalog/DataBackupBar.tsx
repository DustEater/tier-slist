import { type ChangeEvent, useRef } from "react";
import { useProducts } from "../../context/ProductsContext";
import type { Product } from "../../domain/product";
import { useDismissableNotice } from "../../hooks/useDismissableNotice";
import { backupDownloadFilename } from "../../lib/backupFilename";
import {
  parseImportedProductsJson,
  serializeProductsJson,
} from "../../persistence/productsStorage";

type Props = {
  products: Product[];
};

export function DataBackupBar({ products }: Props) {
  const { replaceProductsFromImport, saveToDisk } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notice, showNotice } = useDismissableNotice(4500);

  async function handleExport() {
    await saveToDisk();
    const json = serializeProductsJson(products);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupDownloadFilename();
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
    showNotice({
      kind: "success",
      text:
        products.length === 0
          ? "已保存到服务端并导出空列表（[]），可在新环境导入后作为起点。"
          : `已保存到服务端并导出 ${products.length} 条记录到下载目录。`,
    });
  }

  async function handleSave() {
    await saveToDisk();
    showNotice({
      kind: "success",
      text: `已保存 ${products.length} 条记录到本地文件。`,
    });
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      showNotice({ kind: "error", text: "读取文件失败，请重试。" });
      return;
    }

    const parsed = parseImportedProductsJson(text);
    if (!parsed.ok) {
      showNotice({ kind: "error", text: parsed.message });
      return;
    }

    const incoming = parsed.products;

    const ok = window.confirm(
      `将直接替换现有数据：\n\n` +
      `• 文件中 ${incoming.length} 条记录将完全替换当前 ${products.length} 条记录；\n` +
      `• 当前数据将全部丢失，建议先导出备份。\n\n` +
      `确定继续？`,
    );
    if (!ok) return;

    replaceProductsFromImport(incoming);
    showNotice({
      kind: "success",
      text: `已替换：导入 ${incoming.length} 条记录，替换原有 ${products.length} 条。`,
    });
  }

  return (
    <div className="catalog-data-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="catalog-data-file-input"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <div className="catalog-data-row">
        <p className="catalog-data-label">数据备份</p>
        <div className="catalog-data-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleSave}
          >
            保存
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
          >
            导出 JSON
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={openFilePicker}
          >
            导入 JSON
          </button>
        </div>
      </div>
      <p className="catalog-data-hint">
        导出会同时保存到服务端本地文件；导入将直接替换现有全部数据，请先导出备份。
      </p>
      {notice ? (
        <p
          className={
            notice.kind === "error"
              ? "catalog-data-notice catalog-data-notice-error"
              : "catalog-data-notice catalog-data-notice-success"
          }
          role="status"
        >
           {notice.text}
        </p>
        ) : null}
      </div>
  );
}