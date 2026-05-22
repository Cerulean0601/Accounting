import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const auth = {
  /** 從 NextAuth session 取得用戶 */
  getUser: async (): Promise<{ userId: string } | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return { userId: (session.user as any).userId };
  },
};
