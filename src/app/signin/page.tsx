import { signIn } from '@/auth';

export default function SignInPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur p-8 shadow-2xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">CRM Pipeline Access</h1>
                    <p className="text-zinc-400 mt-2 text-sm">
                        Sign in with Google to access The Shift event pipeline dashboard.
                    </p>
                </div>

                <form
                    action={async () => {
                        'use server';
                        await signIn('google', { redirectTo: '/crm-pipeline' });
                    }}
                >
                    <button
                        className="w-full rounded-xl bg-white text-zinc-900 font-medium py-3 hover:bg-zinc-200 transition"
                        type="submit"
                    >
                        Continue with Google
                    </button>
                </form>
            </div>
        </main>
    );
}
