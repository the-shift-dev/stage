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
                            border: 'hsl(var(--border))',
                            input: 'hsl(var(--input))',
                            ring: 'hsl(var(--ring))',
                            background: 'hsl(var(--background))',
                            foreground: 'hsl(var(--foreground))',
                            primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                            },
                            secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                            },
                            destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                            },
                            muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                            },
                            accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                            },
                            popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                            },
                            card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
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
