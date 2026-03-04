'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { createKV, type StageKV } from '@/lib/kv';
import type { GoogleClient } from '@/lib/googleClient';
import { createPulseClient } from '@/lib/pulseClient';
import { createLedgerClient } from '@/lib/ledgerClient';
import ValidatedRunner from './ValidatedRunner';
import { createVirtualModuleSystem } from '@/lib/moduleResolver';
import { processCssImport } from '@/lib/cssProcessor';

// Import all libraries that should be available in execution scope
import _ from 'lodash';
import * as LucideIcons from 'lucide-react';
import Papa from 'papaparse';
import * as ReactExports from 'react';

// Import all shadcn/ui components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut
} from '@/components/ui/command';
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger
} from '@/components/ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger
} from '@/components/ui/menubar';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuIndicator,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuViewport
} from '@/components/ui/navigation-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Lazy load Recharts components once
let RechartsComponents: Record<string, any> = {};
if (typeof window !== 'undefined') {
    try {
        const recharts = require('recharts');
        RechartsComponents = {
            ResponsiveContainer: recharts.ResponsiveContainer,
            LineChart: recharts.LineChart,
            AreaChart: recharts.AreaChart,
            BarChart: recharts.BarChart,
            RadialBarChart: recharts.RadialBarChart,
            RadialBar: recharts.RadialBar,
            PieChart: recharts.PieChart,
            ScatterChart: recharts.ScatterChart,
            ComposedChart: recharts.ComposedChart,
            Line: recharts.Line,
            Area: recharts.Area,
            Bar: recharts.Bar,
            Pie: recharts.Pie,
            Scatter: recharts.Scatter,
            XAxis: recharts.XAxis,
            YAxis: recharts.YAxis,
            ZAxis: recharts.ZAxis,
            CartesianGrid: recharts.CartesianGrid,
            Tooltip: recharts.Tooltip,
            Legend: recharts.Legend,
            Cell: recharts.Cell,
            Radar: recharts.Radar,
            RadarChart: recharts.RadarChart,
            PolarGrid: recharts.PolarGrid,
            PolarAngleAxis: recharts.PolarAngleAxis,
            PolarRadiusAxis: recharts.PolarRadiusAxis,
            ReferenceLine: recharts.ReferenceLine,
            ReferenceArea: recharts.ReferenceArea,
            ReferenceDot: recharts.ReferenceDot,
            Brush: recharts.Brush
        };
    } catch {
        // Recharts loading failed — continue without it
    }
}

interface ConvexContext {
    liveData: any;
    messages: any[] | undefined;
    sendMessage: (text: string, sender: string) => Promise<any>;
    setLiveData: (data: any) => Promise<any>;
    reportError?: (error: string) => Promise<any>;
}

interface StageAppInfo {
    sid: string;
    authorEmail?: string;
}

interface DynamicComponentProps {
    code: string;
    files?: Record<string, string>; // All session files
    entryPath?: string; // Entry point path
    sessionId: string | null;
    convexContext?: ConvexContext;
    googleClient?: GoogleClient;
    stageApp?: StageAppInfo | null;
}


export default function DynamicComponent({ code, files, entryPath, sessionId, convexContext, googleClient, stageApp }: DynamicComponentProps) {
    const [error, setError] = useState<string | null>(null);
    const kvRef = useRef<StageKV | null>(null);
    const cssStyleNodesRef = useRef<Map<string, HTMLStyleElement>>(new Map());
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [, setFrameTick] = useState(0);

    const scopeId = sessionId || 'default';
    if (!kvRef.current) {
        kvRef.current = createKV(scopeId);
    }

    const frameDocument = iframeRef.current?.contentDocument ?? null;
    const frameWindow = iframeRef.current?.contentWindow ?? null;

    const applyCssImport = ({
        filePath,
        files: allFiles,
    }: {
        filePath: string;
        cssContent: string;
        files: Record<string, string>;
    }): Record<string, string> => {
        const processed = processCssImport({ filePath, files: allFiles });

        const targetDocument = frameDocument ?? (typeof document !== 'undefined' ? document : null);
        if (!targetDocument) {
            return processed.exports;
        }

        const existing = cssStyleNodesRef.current.get(filePath);
        if (existing) {
            existing.textContent = processed.css;
            return processed.exports;
        }

        const style = targetDocument.createElement('style');
        style.setAttribute('data-stage-css', filePath);
        style.textContent = processed.css;
        targetDocument.head.appendChild(style);
        cssStyleNodesRef.current.set(filePath, style);

        return processed.exports;
    };

    const resetCssImports = () => {
        for (const styleNode of cssStyleNodesRef.current.values()) {
            styleNode.remove();
        }
        cssStyleNodesRef.current.clear();
    };

    const scope = useMemo(() => {
        const baseScope = {
            import: {
                react: ReactExports,
                'react-dom/client': ReactDOMClient,
                'lucide-react': LucideIcons,
                lodash: _,
                papaparse: Papa,
                recharts: RechartsComponents,
                '@/components/ui/accordion': { Accordion, AccordionContent, AccordionItem, AccordionTrigger },
                '@/components/ui/alert': { Alert, AlertDescription, AlertTitle },
                '@/components/ui/alert-dialog': {
                    AlertDialog,
                    AlertDialogAction,
                    AlertDialogCancel,
                    AlertDialogContent,
                    AlertDialogDescription,
                    AlertDialogFooter,
                    AlertDialogHeader,
                    AlertDialogTitle,
                    AlertDialogTrigger
                },
                '@/components/ui/aspect-ratio': { AspectRatio },
                '@/components/ui/avatar': { Avatar, AvatarFallback, AvatarImage },
                '@/components/ui/badge': { Badge },
                '@/components/ui/breadcrumb': {
                    Breadcrumb,
                    BreadcrumbItem,
                    BreadcrumbLink,
                    BreadcrumbList,
                    BreadcrumbPage,
                    BreadcrumbSeparator
                },
                '@/components/ui/button': { Button, buttonVariants },
                '@/components/ui/calendar': { Calendar },
                '@/components/ui/card': { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle },
                '@/components/ui/carousel': { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious },
                '@/components/ui/checkbox': { Checkbox },
                '@/components/ui/collapsible': { Collapsible, CollapsibleContent, CollapsibleTrigger },
                '@/components/ui/command': {
                    Command,
                    CommandDialog,
                    CommandEmpty,
                    CommandGroup,
                    CommandInput,
                    CommandItem,
                    CommandList,
                    CommandSeparator,
                    CommandShortcut
                },
                '@/components/ui/context-menu': {
                    ContextMenu,
                    ContextMenuCheckboxItem,
                    ContextMenuContent,
                    ContextMenuItem,
                    ContextMenuLabel,
                    ContextMenuRadioGroup,
                    ContextMenuRadioItem,
                    ContextMenuSeparator,
                    ContextMenuShortcut,
                    ContextMenuSub,
                    ContextMenuSubContent,
                    ContextMenuSubTrigger,
                    ContextMenuTrigger
                },
                '@/components/ui/dialog': {
                    Dialog,
                    DialogContent,
                    DialogDescription,
                    DialogHeader,
                    DialogTitle,
                    DialogTrigger,
                    DialogFooter
                },
                '@/components/ui/drawer': {
                    Drawer,
                    DrawerClose,
                    DrawerContent,
                    DrawerDescription,
                    DrawerFooter,
                    DrawerHeader,
                    DrawerTitle,
                    DrawerTrigger
                },
                '@/components/ui/dropdown-menu': {
                    DropdownMenu,
                    DropdownMenuCheckboxItem,
                    DropdownMenuContent,
                    DropdownMenuGroup,
                    DropdownMenuItem,
                    DropdownMenuLabel,
                    DropdownMenuPortal,
                    DropdownMenuRadioGroup,
                    DropdownMenuRadioItem,
                    DropdownMenuSeparator,
                    DropdownMenuShortcut,
                    DropdownMenuSub,
                    DropdownMenuSubContent,
                    DropdownMenuSubTrigger,
                    DropdownMenuTrigger
                },
                '@/components/ui/form': {
                    Form,
                    FormControl,
                    FormDescription,
                    FormField,
                    FormItem,
                    FormLabel,
                    FormMessage
                },
                '@/components/ui/hover-card': { HoverCard, HoverCardContent, HoverCardTrigger },
                '@/components/ui/input': { Input },
                '@/components/ui/label': { Label },
                '@/components/ui/menubar': {
                    Menubar,
                    MenubarCheckboxItem,
                    MenubarContent,
                    MenubarItem,
                    MenubarMenu,
                    MenubarRadioGroup,
                    MenubarRadioItem,
                    MenubarSeparator,
                    MenubarShortcut,
                    MenubarSub,
                    MenubarSubContent,
                    MenubarSubTrigger,
                    MenubarTrigger
                },
                '@/components/ui/navigation-menu': {
                    NavigationMenu,
                    NavigationMenuContent,
                    NavigationMenuIndicator,
                    NavigationMenuItem,
                    NavigationMenuLink,
                    NavigationMenuList,
                    NavigationMenuTrigger,
                    NavigationMenuViewport
                },
                '@/components/ui/popover': { Popover, PopoverContent, PopoverTrigger },
                '@/components/ui/progress': { Progress },
                '@/components/ui/radio-group': { RadioGroup, RadioGroupItem },
                '@/components/ui/resizable': { ResizableHandle, ResizablePanel, ResizablePanelGroup },
                '@/components/ui/scroll-area': { ScrollArea, ScrollBar },
                '@/components/ui/select': { Select, SelectContent, SelectItem, SelectTrigger, SelectValue },
                '@/components/ui/separator': { Separator },
                '@/components/ui/sheet': {
                    Sheet,
                    SheetClose,
                    SheetContent,
                    SheetDescription,
                    SheetFooter,
                    SheetHeader,
                    SheetTitle,
                    SheetTrigger
                },
                '@/components/ui/skeleton': { Skeleton },
                '@/components/ui/slider': { Slider },
                '@/components/ui/switch': { Switch },
                '@/components/ui/table': {
                    Table,
                    TableBody,
                    TableCaption,
                    TableCell,
                    TableFooter,
                    TableHead,
                    TableHeader,
                    TableRow
                },
                '@/components/ui/tabs': { Tabs, TabsContent, TabsList, TabsTrigger },
                '@/components/ui/textarea': { Textarea },
                '@/components/ui/toggle': { Toggle },
                '@/components/ui/toggle-group': { ToggleGroup, ToggleGroupItem },
                '@/components/ui/tooltip': { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
            } as Record<string, any>
        };

        if (kvRef.current) {
            (baseScope as any).stage = { kv: kvRef.current };
            baseScope.import['@stage/kv'] = { kv: kvRef.current };
        }

        // Add Convex context for live data access
        if (convexContext) {
            (baseScope as any).convex = convexContext;
            baseScope.import['@stage/convex'] = convexContext;
        }

        // Add Google client for end-user Google API access
        if (googleClient) {
            (baseScope as any).google = googleClient;
            baseScope.import['@stage/google'] = { google: googleClient, default: googleClient };
        }

        // Pulse telemetry
        const appContext = stageApp ? { stageAppId: stageApp.sid, authorEmail: stageApp.authorEmail } : undefined;
        const pulseClient = createPulseClient(scopeId, scopeId, appContext);
        baseScope.import['@stage/pulse'] = { pulse: pulseClient, default: pulseClient };

        // Ledger audit
        const ledgerClient = createLedgerClient(scopeId, scopeId, googleClient?.user?.email, appContext);
        baseScope.import['@stage/ledger'] = { ledger: ledgerClient, default: ledgerClient };

        // Add virtual module resolver for session files (supports nested relative imports)
        if (entryPath) {
            const moduleFiles: Record<string, string> = { ...(files || {}) };
            if (!moduleFiles[entryPath]) {
                moduleFiles[entryPath] = code;
            }

            const moduleSystem = createVirtualModuleSystem({
                files: moduleFiles,
                externals: baseScope.import,
                react: ReactExports,
                onCssImport: applyCssImport,
                runtimeGlobals: {
                    window: frameWindow,
                    document: frameDocument,
                    globalThis: frameWindow,
                    navigator: frameWindow?.navigator,
                    fetch: frameWindow?.fetch?.bind(frameWindow),
                    XMLHttpRequest: (frameWindow as any)?.XMLHttpRequest,
                },
            });

            (baseScope as any).__stageRequire = moduleSystem.requireFor(entryPath);
            (baseScope as any).__stageCssReset = resetCssImports;
            (baseScope as any).__stageRuntimeGlobals = {
                window: frameWindow,
                document: frameDocument,
                globalThis: frameWindow,
                navigator: frameWindow?.navigator,
                fetch: frameWindow?.fetch?.bind(frameWindow),
                XMLHttpRequest: (frameWindow as any)?.XMLHttpRequest,
            };
        }

        return baseScope;
    }, [convexContext, googleClient, stageApp, scopeId, files, entryPath, code, frameWindow, frameDocument]);

    useEffect(() => {
        return () => {
            resetCssImports();
        };
    }, []);

    const handleError = useCallback(
        (err: string) => {
            setError(err);
            // Report error to Convex so CLI can see it
            if (convexContext?.reportError) {
                convexContext.reportError(err).catch(() => {
                    // Ignore error reporting failures
                });
            }
        },
        [convexContext]
    );

    if (!code) {
        return null;
    }

    const frameRoot = frameDocument?.getElementById('__stage-root') || frameDocument?.body || null;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', position: 'relative' }}>
            <iframe
                ref={iframeRef}
                data-stage-app="true"
                title="Stage App"
                onLoad={() => setFrameTick((v) => v + 1)}
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
                srcDoc="<!doctype html><html><head><meta charset='utf-8'/><style>html,body,#__stage-root{margin:0;padding:0;width:100%;height:100%;background:transparent;}</style></head><body><div id='__stage-root'></div></body></html>"
            />

            {frameRoot && frameWindow && !error &&
                createPortal(<ValidatedRunner code={code} scope={scope} onErrorAction={handleError} />, frameRoot)}

            {error && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        padding: 24,
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 13,
                        color: '#ef4444',
                        background: '#0a0a0f',
                        overflow: 'auto'
                    }}
                >
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
                </div>
            )}
        </div>
    );
}
