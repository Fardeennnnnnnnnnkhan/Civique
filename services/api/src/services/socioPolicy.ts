export const SOCIO_VERSION = 'm22-locality-relevance-recency-v1';
export function redactSocioText(value: string | null | undefined): string { return (value || 'Civic issue reported by a resident.').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[contact hidden]').replace(/\+?\d[\d\s-]{7,}\d/g, '[contact hidden]').slice(0, 600); }
export function generalizedCoordinate(value: number): number { return Math.round(value * 100) / 100; }
export function decodeSocioCursor(cursor: string): { date: Date; id: string } | null { try { const [date, id] = Buffer.from(cursor, 'base64url').toString().split('|'); const parsed = new Date(date); return id && !Number.isNaN(parsed.getTime()) ? { date: parsed, id } : null; } catch { return null; } }
