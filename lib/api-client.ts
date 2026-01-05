/**
 * 統一的 API 客戶端工具
 * 處理認證錯誤（401）並自動清除快取、導向登入頁面
 */

/**
 * 使用認證 token 發送 API 請求
 * 當遇到 401 錯誤時，會自動清除 localStorage 中的 token 並導向登入頁面
 * 
 * @param url - API 端點 URL
 * @param options - Fetch 選項
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
  
  // 統一處理 401 錯誤：清除快取並導向登入頁面
  if (response.status === 401) {
    localStorage.removeItem('token');
    // 清除其他可能的快取資料
    localStorage.removeItem('user');
    
    // 導向登入頁面（首頁）
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
  
  return response;
}
