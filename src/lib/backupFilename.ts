/** 导出备份文件名：`tier-slist-backup-YYYY-MM-DD.json` */
export function backupDownloadFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `tier-slist-backup-${y}-${m}-${day}.json`;
}
