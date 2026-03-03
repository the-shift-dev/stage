'use client';

import { validateUserCode } from '@/lib/codeValidator';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import * as ReactExports from 'react';
import { transform } from 'sucrase';

/**
 * Compiles user TSX code and renders it as a live React component.
 * Replaces react-runner's useRunner which is broken with React 19.
 */
const ValidatedRunner = ({ code, scope, onErrorAction }: Props) => {
    const validationResult = validateUserCode(code);
    const prevCodeRef = useRef<string>('');
    const componentRef = useRef<React.ComponentType<any> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [, forceUpdate] = useState(0);

    // Compile user code into a React component
    const Component = useMemo(() => {
        if (!validationResult.isValid) return null;

        try {
            // Transform TypeScript, JSX, and imports to CommonJS
            const compiled = transform(code, {
                transforms: ['typescript', 'jsx', 'imports'],
                jsxRuntime: 'classic',
                jsxPragma: 'React.createElement',
                jsxFragmentPragma: 'React.Fragment',
            }).code;

            // Create module environment
            const exports: Record<string, any> = {};
            const moduleObj = { exports };

            // Build require function from scope
            const requireFn = (name: string) => {
                if (scope.import && scope.import[name]) return scope.import[name];
                throw new Error(`Module not found: ${name}`);
            };

            // Execute the compiled code
            const fn = new Function('exports', 'module', 'require', 'React', compiled);
            fn(exports, moduleObj, requireFn, ReactExports);

            // Get the default export
            const result = moduleObj.exports && Object.keys(moduleObj.exports).length > 0
                ? moduleObj.exports
                : exports;

            const UserComponent = result.default || result;

            if (typeof UserComponent === 'function') {
                // Return the component function directly — React will call it
                // during rendering, properly setting up hooks and fibers
                setError(null);
                return UserComponent;
            }

            // If it's already a React element, wrap it in a component
            if (UserComponent && typeof UserComponent === 'object' && UserComponent.$$typeof) {
                setError(null);
                return () => UserComponent;
            }

            setError('Entry point must default-export a React component');
            return null;
        } catch (e: any) {
            const msg = e?.message || String(e);
            setError(msg);
            return null;
        }
    }, [code, scope, validationResult.isValid]);

    // Report errors
    useEffect(() => {
        if (error) {
            onErrorAction(error);
        }
    }, [error, onErrorAction]);

    // Handle validation errors
    useEffect(() => {
        if (!validationResult.isValid) {
            let violationsBuffer = validationResult.violations.join(', ');
            if (!violationsBuffer.startsWith('Code parsing failed:')) {
                violationsBuffer = `Security violations detected:\n${violationsBuffer}`;
            }
            onErrorAction(new Error(violationsBuffer).message);
        }
    }, [validationResult.isValid, validationResult.violations, onErrorAction]);

    if (!validationResult.isValid || !Component) {
        return null;
    }

    // Render the user component directly — this creates it as a proper
    // React component in the tree with full hook/state support
    return createElement(Component);
};

interface Props {
    code: string;
    scope: Record<string, any>;
    onErrorAction: (error: string) => void;
}

export default ValidatedRunner;
