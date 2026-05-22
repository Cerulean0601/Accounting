import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await db.query`
          SELECT user_id, email, name, password_hash
          FROM users WHERE email = ${credentials.email}
        `;
        const user = result.rows[0];
        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.user_id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existing = await db.query`
          SELECT user_id FROM users
          WHERE provider = 'google' AND provider_account_id = ${account.providerAccountId}
        `;
        if (existing.rows.length === 0) {
          const emailCheck = await db.query`
            SELECT user_id FROM users WHERE email = ${user.email} AND provider = 'credentials'
          `;
          if (emailCheck.rows.length > 0) return false;

          const newUser = await db.query`
            INSERT INTO users (user_id, email, name, provider, provider_account_id)
            VALUES (gen_random_uuid(), ${user.email}, ${user.name}, 'google', ${account.providerAccountId})
            RETURNING user_id
          `;
          const userId = newUser.rows[0].user_id;
          user.id = userId;
          await initUserDefaults(userId);
        } else {
          user.id = existing.rows[0].user_id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).userId = token.userId;
      return session;
    },
  },
  pages: { signIn: '/' },
  session: { strategy: 'jwt' },
};

async function initUserDefaults(userId: string) {
  await db.query`
    INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
    VALUES
      (gen_random_uuid(), ${userId}, '現金', 'cash', 0, 0, 'TWD', true),
      (gen_random_uuid(), ${userId}, '銀行帳戶', 'bank', 0, 0, 'TWD', false),
      (gen_random_uuid(), ${userId}, '信用卡', 'credit_card', 0, 0, 'TWD', false)
  `;

  const cats = await db.query`
    INSERT INTO categories (category_id, user_id, name, type, color)
    VALUES
      (gen_random_uuid(), ${userId}, '餐飲', 'expense', '#FF6384'),
      (gen_random_uuid(), ${userId}, '交通', 'expense', '#36A2EB'),
      (gen_random_uuid(), ${userId}, '購物', 'expense', '#FFCE56'),
      (gen_random_uuid(), ${userId}, '娛樂', 'expense', '#4BC0C0'),
      (gen_random_uuid(), ${userId}, '薪資', 'income', '#4BC0C0'),
      (gen_random_uuid(), ${userId}, '獎金', 'income', '#36A2EB')
    RETURNING category_id, name
  `;

  for (const cat of cats.rows) {
    if (cat.name === '餐飲') {
      await db.query`
        INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
        VALUES (gen_random_uuid(), ${cat.category_id}, '早餐', 0),
               (gen_random_uuid(), ${cat.category_id}, '午餐', 1),
               (gen_random_uuid(), ${cat.category_id}, '晚餐', 2)
      `;
    } else if (cat.name === '薪資' || cat.name === '獎金') {
      await db.query`
        INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
        VALUES (gen_random_uuid(), ${cat.category_id}, ${cat.name}, 0)
      `;
    } else {
      await db.query`
        INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
        VALUES (gen_random_uuid(), ${cat.category_id}, '其他', 0)
      `;
    }
  }
}
