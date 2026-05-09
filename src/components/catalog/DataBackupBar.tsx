import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useProducts } from "../../context/ProductsContext";
import type { Product } from "../../domain/product";
import { backupDownloadFilename } from "../../lib/backupFilename";
import { mergeProductsById } from "../../domain/mergeProductsById";
import {
  parseImportedProductsJson,
  serializeProductsJson,
} from "../../persistence/productsStorage";

type Props = {
  products: Product[];
};

export function DataBackupBar({ products }: Props) {
  const { mergeProductsFromImport } = useProducts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  function dismissNoticeLater(ms: number) {
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNotice(null);
    }, ms);
  }

  function handleExport() {
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
    setNotice({
      kind: "success",
      text:
        products.length === 0
          ? "已导出空列表（[]），可在新环境导入后作为起点。"
          : `已导出 ${products.length} 条记录到下载目录。`,
    });
    dismissNoticeLater(4500);
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
      setNotice({ kind: "error", text: "读取文件失败，请重试。" });
      return;
    }

    const parsed = parseImportedProductsJson(text);
    if (!parsed.ok) {
      setNotice({ kind: "error", text: parsed.message });
      return;
    }

    const incoming = parsed.products;
    const nextCount = incoming.length;
    const currentIds = new Set(products.map((p) => p.id));
    let updateCount = 0;
    let addCount = 0;
    for (const p of incoming) {
      if (currentIds.has(p.id)) updateCount += 1;
      else addCount += 1;
    }
    const fileIds = new Set(incoming.map((p) => p.id));
    const keptCount = products.filter((p) => !fileIds.has(p.id)).length;
    const merged = mergeProductsById(products, incoming);
    const totalAfter = merged.length;

    const ok = window.confirm(
      `将按 id 合并导入（写入 localStorage）：\n\n` +
      `• 文件中 ${nextCount} 条：约 ${updateCount} 条覆盖本地同 id，约 ${addCount} 条为新增；\n` +
      `• 本地约 ${keptCount} 条在文件中未出现，将原样保留；\n` +
      `• 合并后预计共 ${totalAfter} 条。\n\n` +
      `同 id 以文件内容为准。建议先导出备份。确定继续？`,
    );
    if (!ok) return;

    mergeProductsFromImport(incoming);
    setNotice({
      kind: "success",
      text: `已合并：覆盖/更新 ${updateCount} 条、新增 ${addCount} 条，保留本地独有 ${keptCount} 条；当前共 ${totalAfter} 条。`,
    });
    dismissNoticeLater(5000);
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
        导出文件与浏览器内存储格式一致；导入按 id 合并（同 id 以文件为准，文件中未出现的本地记录保留），请先导出备份。
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
