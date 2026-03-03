// Centralized configuration for allowed imports
// This ensures DynamicComponent and codeValidator stay in sync

export const ALLOWED_IMPORT_PATHS = [
    'react',
    'lucide-react',
    'lodash',
    'papaparse',
    'recharts',
    '@/components/ui/accordion',
    '@/components/ui/alert',
    '@/components/ui/alert-dialog',
    '@/components/ui/aspect-ratio',
    '@/components/ui/avatar',
    '@/components/ui/badge',
    '@/components/ui/breadcrumb',
    '@/components/ui/button',
    '@/components/ui/calendar',
    '@/components/ui/card',
    '@/components/ui/carousel',
    '@/components/ui/checkbox',
    '@/components/ui/collapsible',
    '@/components/ui/command',
    '@/components/ui/context-menu',
    '@/components/ui/dialog',
    '@/components/ui/drawer',
    '@/components/ui/dropdown-menu',
    '@/components/ui/form',
    '@/components/ui/hover-card',
    '@/components/ui/input',
    '@/components/ui/label',
    '@/components/ui/menubar',
    '@/components/ui/navigation-menu',
    '@/components/ui/popover',
    '@/components/ui/progress',
    '@/components/ui/radio-group',
    '@/components/ui/resizable',
    '@/components/ui/scroll-area',
    '@/components/ui/select',
    '@/components/ui/separator',
    '@/components/ui/sheet',
    '@/components/ui/skeleton',
    '@/components/ui/slider',
    '@/components/ui/switch',
    '@/components/ui/table',
    '@/components/ui/tabs',
    '@/components/ui/textarea',
    '@/components/ui/toggle',
    '@/components/ui/toggle-group',
    '@/components/ui/tooltip',
    '@stage/kv',
    '@stage/db',
    '@stage/convex',
    '@stage/google'
] as const;

export const ALLOWED_IMPORTS_SET = new Set(ALLOWED_IMPORT_PATHS as readonly string[]);

// Helper function to validate if an import path is allowed
export function isImportAllowed(importPath: string): boolean {
    // Allow relative imports (for multi-file sessions)
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return true;
    }
    // Allow absolute paths to session files (e.g., /app/Button)
    if (importPath.startsWith('/app/') || importPath.startsWith('/app.')) {
        return true;
    }
    return ALLOWED_IMPORTS_SET.has(importPath);
}

// Helper to get the UI component paths only
export const UI_COMPONENT_PATHS = ALLOWED_IMPORT_PATHS.filter((path) => path.startsWith('@/components/ui/'));
