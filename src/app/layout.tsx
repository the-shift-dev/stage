import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Stage',
    description: 'Secure sandbox environment for executing React components'
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
            <body className="antialiased">{children}</body>
        </html>
    );
}
