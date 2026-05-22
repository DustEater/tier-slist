const fs = require("fs");
const path = require("path");

exports.default = async function (context) {
  const localesDir = path.join(context.appOutDir, "locales");
  if (!fs.existsSync(localesDir)) return;

  const keep = new Set(["zh-CN.pak", "en-US.pak"]);
  let removed = 0;
  let savedBytes = 0;

  for (const file of fs.readdirSync(localesDir)) {
    if (!keep.has(file)) {
      const filePath = path.join(localesDir, file);
      const stat = fs.statSync(filePath);
      savedBytes += stat.size;
      fs.unlinkSync(filePath);
      removed++;
    }
  }

  const savedMb = (savedBytes / 1024 / 1024).toFixed(1);
  console.log(`[afterPack] Removed ${removed} locale files, saved ${savedMb}MB`);
};