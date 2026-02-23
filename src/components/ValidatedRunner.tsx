'use client';

import { validateUserCode } from '@/lib/codeValidator';
import { useEffect } from 'react';
import { useRunner } from 'react-runner';

const ValidatedRunner = ({ code, scope, onErrorAction }: Props) => {
    // Use useRunner hook to get error handling
    const { element, error: runtimeError } = useRunner({ code, scope });
    // Validate user code for security
    const validationResult = validateUserCode(code);

    useEffect(() => {
        if (runtimeError) {
            onErrorAction(runtimeError);
        }
    }, [runtimeError, onErrorAction]);

    // Handle validation errors in useEffect to avoid setState during render
    useEffect(() => {
        if (!validationResult.isValid) {
            let violationsBuffer = validationResult.violations.join(', ');
            if (!violationsBuffer.startsWith('Code parsing failed:')) {
                violationsBuffer = `Security violations detected:\n${violationsBuffer}`;
            }
            onErrorAction(new Error(violationsBuffer).message);
        }
    }, [validationResult.isValid, validationResult.violations, onErrorAction]);

    // Don't render anything if validation fails
    if (!validationResult.isValid) {
        return null;
    }

    return element;
};

interface Props {
    code: string;
    scope: Record<string, any>;
    onErrorAction: (error: string) => void;
}

export default ValidatedRunner;
