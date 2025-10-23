# 記帳應用 PWA 功能說明

## 已實現的 PWA 功能

### 1. 應用安裝
- 支援「添加到主畫面」功能
- 自動顯示安裝提示
- 支援 Android 和 iOS 設備

### 2. 離線功能
- 離線時可以繼續使用應用
- 離線記帳資料會暫存在本地
- 重新連線時自動同步資料
- 顯示網路狀態指示器

### 3. 快取策略
- 靜態資源快取（HTML、CSS、JS）
- API 資料快取
- 離線優先策略

### 4. 原生應用體驗
- 全螢幕顯示（無瀏覽器地址欄）
- 自定義啟動畫面
- 應用圖標和名稱
- 快捷方式支援

## 安裝步驟

### Android Chrome
1. 開啟應用網址
2. 點擊瀏覽器選單中的「安裝應用程式」
3. 或等待自動彈出的安裝提示

### iOS Safari
1. 開啟應用網址
2. 點擊分享按鈕
3. 選擇「加入主畫面」
4. 確認安裝

### 桌面瀏覽器
1. 開啟應用網址
2. 點擊地址欄右側的安裝圖標
3. 或使用瀏覽器選單中的安裝選項

## 離線使用

1. **記帳功能**：離線時仍可新增交易記錄
2. **資料查看**：已快取的資料可離線查看
3. **自動同步**：重新連線時自動上傳離線資料

## 技術特性

- **Service Worker**：處理快取和離線功能
- **Web App Manifest**：定義應用外觀和行為
- **IndexedDB**：離線資料儲存
- **Background Sync**：背景資料同步
- **Push Notifications**：（可擴展功能）

## 瀏覽器支援

- Chrome 67+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## 開發說明

### 檔案結構
```
public/
├── manifest.json          # PWA 配置
├── sw.js                 # Service Worker
├── icon-192.png          # 應用圖標 192x192
├── icon-512.png          # 應用圖標 512x512
└── favicon.ico           # 網站圖標

components/
├── InstallPrompt.tsx     # 安裝提示組件
└── OfflineIndicator.tsx  # 離線狀態指示器
```

### 自定義配置

1. **修改應用資訊**：編輯 `public/manifest.json`
2. **更新圖標**：替換 `public/icon-*.png` 檔案
3. **調整快取策略**：修改 `public/sw.js`
4. **自定義安裝提示**：編輯 `components/InstallPrompt.tsx`

### 測試 PWA 功能

1. 使用 Chrome DevTools 的 Application 面板
2. 檢查 Service Worker 註冊狀態
3. 測試離線功能
4. 驗證快取策略
5. 檢查 Manifest 配置

## 注意事項

1. **HTTPS 要求**：PWA 需要在 HTTPS 環境下運行
2. **圖標準備**：需要準備不同尺寸的應用圖標
3. **測試重要**：在不同設備和瀏覽器上測試
4. **更新策略**：考慮 Service Worker 的更新機制

## 未來擴展

- [ ] Push 通知
- [ ] 背景同步優化
- [ ] 更多離線功能
- [ ] 應用更新提示
- [ ] 分享功能
