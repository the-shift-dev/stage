'use client';

import { type RefObject, useEffect, useState } from 'react';
import { type FeedbackAnnotation } from '@/lib/feedback';
import { generateSelector } from '@/lib/selectorGenerator';

function normalizeText(value: string | null | undefined) {
    if (!value) return undefined;
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 160) : undefined;
}

function toAnnotation(target: Element): FeedbackAnnotation {
    const rect = target.getBoundingClientRect();

    return {
        elementSelector: generateSelector(target, target.ownerDocument.body),
        elementTag: target.tagName.toLowerCase(),
        elementText: normalizeText(target.textContent),
        boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    };
}

export function useElementSelector(iframeRef: RefObject<HTMLIFrameElement | null>) {
    const [annotations, setAnnotations] = useState<FeedbackAnnotation[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        if (!isSelecting) return;

        const iframe = iframeRef.current;
        const doc = iframe?.contentDocument;
        const win = iframe?.contentWindow;

        if (!iframe || !doc || !win || !doc.body) {
            setIsSelecting(false);
            return;
        }

        const overlay = doc.createElement('div');
        overlay.setAttribute('data-stage-feedback-overlay', 'true');
        Object.assign(overlay.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: '2147483647',
            border: '2px solid #2563eb',
            borderRadius: '8px',
            background: 'rgba(37, 99, 235, 0.10)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.20) inset',
            display: 'none'
        });
        doc.body.appendChild(overlay);

        const previousCursor = doc.body.style.cursor;
        doc.body.style.cursor = 'crosshair';
        const frameElement = doc.defaultView?.Element;

        const updateOverlay = (target: EventTarget | null) => {
            if (!frameElement || !(target instanceof frameElement)) {
                overlay.style.display = 'none';
                return;
            }

            const rect = target.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                overlay.style.display = 'none';
                return;
            }

            overlay.style.display = 'block';
            overlay.style.left = `${rect.left}px`;
            overlay.style.top = `${rect.top}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;
        };

        const handleMouseMove = (event: MouseEvent) => {
            updateOverlay(event.target);
        };

        const handleMouseLeave = () => {
            overlay.style.display = 'none';
        };

        const handleClick = (event: MouseEvent) => {
            if (!frameElement || !(event.target instanceof frameElement)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const annotation = toAnnotation(event.target);
            setAnnotations((current) => {
                if (current.some((entry) => entry.elementSelector === annotation.elementSelector)) {
                    return current;
                }
                return [...current, annotation];
            });
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            setIsSelecting(false);
        };

        doc.addEventListener('mousemove', handleMouseMove, true);
        doc.addEventListener('mouseleave', handleMouseLeave, true);
        doc.addEventListener('click', handleClick, true);
        win.addEventListener('keydown', handleKeyDown, true);

        return () => {
            doc.removeEventListener('mousemove', handleMouseMove, true);
            doc.removeEventListener('mouseleave', handleMouseLeave, true);
            doc.removeEventListener('click', handleClick, true);
            win.removeEventListener('keydown', handleKeyDown, true);
            doc.body.style.cursor = previousCursor;
            overlay.remove();
        };
    }, [iframeRef, isSelecting]);

    return {
        annotations,
        isSelecting,
        startSelecting: () => setIsSelecting(true),
        stopSelecting: () => setIsSelecting(false),
        removeAnnotation: (index: number) => {
            setAnnotations((current) => current.filter((_, currentIndex) => currentIndex !== index));
        },
        clearAnnotations: () => setAnnotations([])
    };
}
