import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { ALLOWED_IMPORTS_SET } from './allowedImports';

const DANGEROUS_GLOBALS = new Set([
    'require',
    'eval',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'navigator',
    'document',
    'process',
    'global',
    'globalThis',
    '__dirname',
    '__filename',
    'Buffer',
    'fs',
    'path',
    'os',
    'crypto',
    'child_process'
]);

const DANGEROUS_OBJECT_PROPERTIES = new Map([
    ['window', ['eval']],
    ['global', ['eval', 'Function', 'require']],
    ['globalThis', ['eval', 'Function', 'require']],
    ['process', ['exit', 'kill', 'abort', 'chdir']]
]);

export interface ValidationResult {
    isValid: boolean;
    violations: string[];
}

export function validateUserCode(code: string): ValidationResult {
    const violations: string[] = [];

    try {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
        });

        traverse(ast, {
            // Check imports - only allow whitelisted ones
            ImportDeclaration(path) {
                const importPath = path.node.source.value;
                if (!ALLOWED_IMPORTS_SET.has(importPath)) {
                    violations.push(`Unauthorized import: ${importPath}`);
                }
            },

            // Check dynamic imports and dangerous function calls
            CallExpression(path) {
                // Block dynamic imports
                if (path.node.callee.type === 'Import') {
                    violations.push('Dynamic imports not allowed');
                }

                // Check dangerous function calls
                if (path.node.callee.type === 'Identifier' && DANGEROUS_GLOBALS.has(path.node.callee.name)) {
                    violations.push(`Dangerous function call: ${path.node.callee.name}`);
                }
            },

            // Check member expressions for dangerous globals
            MemberExpression(path) {
                if (path.node.property.type === 'Identifier') {
                    const propertyName = path.node.property.name;

                    // Check specific object properties for known dangerous globals
                    if (path.node.object.type === 'Identifier') {
                        const objectName = path.node.object.name;
                        const dangerousProps = DANGEROUS_OBJECT_PROPERTIES.get(objectName);
                        if (dangerousProps && dangerousProps.includes(propertyName)) {
                            violations.push(`Dangerous property access: ${objectName}.${propertyName}`);
                        }
                    }
                }
            },

            // Check for eval in string literals (obfuscated attacks)
            StringLiteral(path) {
                const stringValue = path.node.value.toLowerCase();
                if (stringValue.includes('eval(') || stringValue.includes('require(')) {
                    violations.push('Suspicious string literal detected');
                }
            },

            // Check template literals for dangerous patterns
            TemplateLiteral(path) {
                const templateStr = path.node.quasis
                    .map((quasi) => quasi.value.raw)
                    .join('')
                    .toLowerCase();

                if (templateStr.includes('eval(') || templateStr.includes('require(')) {
                    violations.push('Suspicious template literal detected');
                }
            }
        });
    } catch (error) {
        violations.push(`Code parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Remove duplicate violations
    const uniqueViolations = [...new Set(violations)];

    return {
        isValid: uniqueViolations.length === 0,
        violations: uniqueViolations
    };
}
