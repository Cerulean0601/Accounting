import { NextRequest } from 'next/server';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  endpoint?: string;
  method?: string;
  params?: any;
  userId?: string;
}

class Logger {
  private formatTime(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: any) {
    const timestamp = this.formatTime();
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      message,
      endpoint: context?.endpoint,
      method: context?.method,
      params: context?.params,
      userId: context?.userId,
      error: error?.message || error
    };

    // 過濾掉 undefined 的欄位
    const cleanLogData = Object.fromEntries(
      Object.entries(logData).filter(([_, value]) => value !== undefined)
    );

    const logString = JSON.stringify(cleanLogData, null, 2);

    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'debug':
        console.debug(logString);
        break;
    }
  }

  error(message: string, context?: LogContext, error?: any) {
    this.log('error', message, context, error);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  // 從 NextRequest 提取上下文資訊
  getRequestContext(request: NextRequest, params?: any): LogContext {
    const url = new URL(request.url);
    return {
      endpoint: url.pathname,
      method: request.method,
      params: params
    };
  }
}

export const logger = new Logger();
