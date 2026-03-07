'use client';

import { ReactNode, useEffect } from 'react';

const TailwindProvider = ({ children }: Props) => {
    useEffect(() => {
        // Check if Tailwind CSS is already loaded
        if (window.tailwind) {
            return;
        }

        // Create script element for Tailwind CSS CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.tailwindcss.com';
        script.async = true;

        // Configure Tailwind after it loads
        script.onload = () => {
            // Configure Tailwind to match your app's theme
            window.tailwind.config = {
                content: ['./src/**/*.{js,ts,jsx,tsx}'],
                theme: {
                    extend: {
                        colors: {
                            border: 'var(--border)',
                            input: 'var(--input)',
                            ring: 'var(--ring)',
                            background: 'var(--background)',
                            foreground: 'var(--foreground)',
                            primary: {
                                DEFAULT: 'var(--primary)',
                                foreground: 'var(--primary-foreground)'
                            },
                            secondary: {
                                DEFAULT: 'var(--secondary)',
                                foreground: 'var(--secondary-foreground)'
                            },
                            destructive: {
                                DEFAULT: 'var(--destructive)',
                                foreground: 'var(--destructive-foreground)'
                            },
                            muted: {
                                DEFAULT: 'var(--muted)',
                                foreground: 'var(--muted-foreground)'
                            },
                            accent: {
                                DEFAULT: 'var(--accent)',
                                foreground: 'var(--accent-foreground)'
                            },
                            popover: {
                                DEFAULT: 'var(--popover)',
                                foreground: 'var(--popover-foreground)'
                            },
                            card: {
                                DEFAULT: 'var(--card)',
                                foreground: 'var(--card-foreground)'
                            }
                        },
                        borderRadius: {
                            lg: 'var(--radius)',
                            md: 'calc(var(--radius) - 2px)',
                            sm: 'calc(var(--radius) - 4px)'
                        }
                    }
                }
            };
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup if component unmounts
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    return children;
};

interface Props {
    children: ReactNode;
}

export default TailwindProvider;
