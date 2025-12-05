export const splitName = (fullName: string): { firstName: string; lastName: string | null } => {
    const trimmed = fullName.trim();
    if (!trimmed) return { firstName: '', lastName: null };

    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
        return { firstName: parts[0], lastName: null };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
};
