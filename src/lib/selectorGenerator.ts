function fallbackEscape(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function cssEscape(value: string) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }
    return fallbackEscape(value);
}

function validateSelector(root: ParentNode, selector: string, target: Element) {
    try {
        return root.querySelector(selector) === target;
    } catch {
        return false;
    }
}

function buildSegment(element: Element) {
    const tagName = element.tagName.toLowerCase();
    const classes = Array.from(element.classList)
        .slice(0, 2)
        .map((className) => `.${cssEscape(className)}`)
        .join('');

    let segment = `${tagName}${classes}`;

    const parent = element.parentElement;
    if (!parent) {
        return segment;
    }

    const siblings = Array.from(parent.children).filter((child) => child.tagName === element.tagName);

    if (siblings.length > 1) {
        const position = siblings.indexOf(element) + 1;
        segment += `:nth-of-type(${position})`;
    }

    return segment;
}

export function generateSelector(element: Element, root?: ParentNode) {
    const searchRoot = root ?? element.ownerDocument;

    if (element.id) {
        const byId = `#${cssEscape(element.id)}`;
        if (validateSelector(searchRoot, byId, element)) {
            return byId;
        }
    }

    const segments: string[] = [];
    const boundary = root instanceof Element ? root : null;
    let current: Element | null = element;

    while (current && current !== boundary) {
        segments.unshift(buildSegment(current));
        const selector = segments.join(' > ');
        if (validateSelector(searchRoot, selector, element)) {
            return selector;
        }
        current = current.parentElement;
    }

    return segments.join(' > ') || buildSegment(element);
}
