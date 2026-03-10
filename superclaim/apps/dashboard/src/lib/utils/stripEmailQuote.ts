/**
 * Strips quoted email threads, signatures, and metadata from email body.
 * Keeps only the actual reply text.
 */
export function stripEmailQuote(body: string): string {
    if (!body) return '';

    const lines = body.split('\n');
    const cleanLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Stop at common quote markers
        // Gmail: "On [date] [person] wrote:"
        if (/^On .+ wrote:$/i.test(trimmed)) break;
        if (/^Den .+ skrev .+:$/i.test(trimmed)) break; // Swedish Gmail

        // Outlook: "From: ... Sent: ..."
        if (/^From:\s/.test(trimmed) && lines.some(l => /^Sent:\s/.test(l.trim()))) break;
        if (/^Från:\s/.test(trimmed) && lines.some(l => /^Skickat:\s/.test(l.trim()))) break; // Swedish Outlook

        // Generic "wrote:" on a line
        if (/wrote:\s*>?\s*$/i.test(trimmed)) break;
        if (/skrev:\s*>?\s*$/i.test(trimmed)) break;

        // Quoted lines starting with >
        if (/^>/.test(trimmed)) break;

        // Separator lines (--- or ___)
        if (/^[-_]{3,}\s*(Forwarded|Original|Ursprungligt)?/i.test(trimmed)) break;
        if (/^[-_]{3,}\s*(Vidarebefordrat)?/i.test(trimmed)) break;

        // Signature marker (standard "-- ")
        if (trimmed === '--' || trimmed === '-- ') break;

        cleanLines.push(line);
    }

    // Trim trailing empty lines
    while (cleanLines.length > 0 && cleanLines[cleanLines.length - 1].trim() === '') {
        cleanLines.pop();
    }

    const result = cleanLines.join('\n').trim();

    // If we stripped everything, return original (safety fallback)
    if (!result) return body.trim();

    return result;
}
