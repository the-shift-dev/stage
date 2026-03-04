'use client';

/**
 * AuthGate — shown when a Stage session requires Google OAuth scopes
 * and the end-user hasn't yet authorized.
 *
 * Displays the required scopes in human-readable form and provides
 * a "Connect with Google" button that initiates the OAuth flow.
 */

/** Map Google scope URLs to human-readable descriptions. */
const SCOPE_LABELS: Record<string, string> = {
    'https://www.googleapis.com/auth/drive.readonly': 'View your Google Drive files',
    'https://www.googleapis.com/auth/drive': 'View and manage your Google Drive files',
    'https://www.googleapis.com/auth/drive.file': 'View and manage files created by this app',
    'https://www.googleapis.com/auth/spreadsheets.readonly': 'View your Google Sheets',
    'https://www.googleapis.com/auth/spreadsheets': 'View and edit your Google Sheets',
    'https://www.googleapis.com/auth/calendar.readonly': 'View your Google Calendar',
    'https://www.googleapis.com/auth/calendar': 'View and manage your Google Calendar',
    'https://www.googleapis.com/auth/calendar.events': 'View and manage calendar events',
    'https://www.googleapis.com/auth/gmail.readonly': 'View your Gmail messages',
    'https://www.googleapis.com/auth/gmail.send': 'Send email on your behalf',
    'https://www.googleapis.com/auth/documents.readonly': 'View your Google Docs',
    'https://www.googleapis.com/auth/documents': 'View and manage your Google Docs',
    'https://www.googleapis.com/auth/presentations.readonly': 'View your Google Slides',
    'https://www.googleapis.com/auth/presentations': 'View and manage your Google Slides',
};

function getScopeLabel(scope: string): string {
    return SCOPE_LABELS[scope] ?? scope;
}

interface AuthGateProps {
    sessionId: string;
    scopes: string[];
}

export default function AuthGate({ sessionId, scopes }: AuthGateProps) {
    const handleConnect = () => {
        window.location.href = `/auth/stage/google?session=${encodeURIComponent(sessionId)}`;
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'hsl(var(--muted))',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            <div
                style={{
                    maxWidth: 440,
                    width: '100%',
                    padding: 32,
                    background: 'hsl(var(--card))',
                    borderRadius: 12,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                    textAlign: 'center'
                }}
            >
                {/* Google logo */}
                <div style={{ marginBottom: 20 }}>
                    <svg width="40" height="40" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'hsl(var(--foreground))', margin: '0 0 8px' }}>
                    Sign in with Google
                </h2>

                <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', margin: '0 0 24px', lineHeight: 1.5 }}>
                    This app needs access to your Google account to work.
                    You&apos;ll be asked to grant these permissions:
                </p>

                {/* Scope list */}
                <div
                    style={{
                        textAlign: 'left',
                        background: 'hsl(var(--secondary))',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 24
                    }}
                >
                    {scopes.map((scope) => (
                        <div
                            key={scope}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 0',
                                fontSize: 13,
                                color: 'hsl(var(--foreground))'
                            }}
                        >
                            <span style={{ color: '#22c55e', fontSize: 16 }}>&#10003;</span>
                            {getScopeLabel(scope)}
                        </div>
                    ))}
                </div>

                {/* Connect button */}
                <button
                    onClick={handleConnect}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 24px',
                        fontSize: 15,
                        fontWeight: 500,
                        color: '#fff',
                        background: '#4285F4',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        width: '100%',
                        justifyContent: 'center'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#3367d6')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#4285F4')}
                >
                    Connect with Google
                </button>

                <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 16, lineHeight: 1.4 }}>
                    Your credentials are handled securely. This app never sees your password.
                </p>
            </div>
        </div>
    );
}
