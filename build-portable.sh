#!/bin/bash
export XDG_RUNTIME_DIR=/tmp/runtime-yaojiahui
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
export CSC_IDENTITY_AUTO_DISCOVERY=false
mkdir -p "$XDG_RUNTIME_DIR"
rm -rf release
npm run build && npm run build:electron && npx electron-builder --win

if [ $? -eq 0 ]; then
  OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)/release"
  echo ""
  echo "✅ 打包成功！产物目录："
  for f in "$OUTPUT_DIR"/*.zip; do
    [ -f "$f" ] && echo "   $(ls -lh "$f" | awk '{print $5, $NF}')"
  done
  echo ""
  echo "使用方式：解压 zip 后运行 产品挑选列表.exe"
fi
