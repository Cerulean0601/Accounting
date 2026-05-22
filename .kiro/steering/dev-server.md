# 本地 Dev Server 啟動規範

啟動 `next dev`、`npm run dev` 等**長駐 process** 時，**不要**直接用 `&` 背景化，會讓 kiro-cli 的 Shell tool 卡住（stdout/stderr fd 繼承關係，bash -c 不會真的 detach）。

## 正確做法

用 `nohup` + `disown` 組合：

```bash
cd /mnt/c/Users/xiaoheji/Documents/GitHub/Accounting
nohup npx next dev --port 3000 > /tmp/next-dev.log 2>&1 &
disown
sleep 5
tail -20 /tmp/next-dev.log
```

兩個關鍵步驟：

1. `nohup ... > log 2>&1 &`：把 stdout / stderr 都重導到檔案，背景執行
2. `disown`：從 shell 的 job list 移除，Shell tool 不再追蹤這個 process

這樣 Shell tool 會立刻 return，不會卡住。

## 停止 dev server

```bash
# 找 process
ps aux | grep -E "next.*dev|node.*next" | grep -v grep

# 直接用 port 找（更精準）
lsof -i:3000 -t | xargs -r kill

# 或全部清掉
pkill -f "next dev"
```

## 看即時 log

```bash
tail -f /tmp/next-dev.log
```

## 禁止事項

- 禁止 `npx next dev ... &`（不加 nohup + disown 的純背景化）
- 禁止 `npx next dev ... &>/tmp/log &`（沒有 disown，會卡住 Shell tool）
- 禁止在 shell 命令裡用 `sleep N && tail` 的方式等 dev server 啟動而不先 detach
