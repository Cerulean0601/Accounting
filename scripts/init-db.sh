#!/bin/bash

# 載入環境變數
set -a
source .env.local
set +a

# 執行資料庫初始化
echo "連接到資料庫: $POSTGRES_URL"
psql "$POSTGRES_URL" -f scripts/init-db.sql

echo "資料庫初始化完成！"
