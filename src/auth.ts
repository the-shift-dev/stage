import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        })
    ],
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/signin'
    },
    callbacks: {
        async signIn({ profile }) {
            const email = profile?.email?.toLowerCase() || '';
            // Restrict dashboard access to company identities.
            return email.endsWith('@the-shift.dev') || email.endsWith('@gmail.com');
        },
        authorized({ request, auth }) {
            const { pathname } = request.nextUrl;
            if (pathname.startsWith('/crm-pipeline')) {
                return !!auth;
            }
            return true;
        }
    }
});
