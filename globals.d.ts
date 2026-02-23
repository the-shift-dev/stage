import { Config } from 'tailwindcss';

declare global {
    interface Window {
        tailwind: { config: Config; }
    }
}
