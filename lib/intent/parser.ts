import chrono from 'chrono-node';
import { addMinutes, set } from 'date-fns';
import { z } from 'zod';

export type VoiceIntent =
  | { type: 'add'; title: string; start: Date; duration: number }
  | { type: 'move'; title: string; start: Date }
  | { type: 'delete'; title: string }
  | { type: 'read' };

const durationPattern = /(\d{1,3})\s?(minutes?|mins?|timer?)/i;

export function parseVoiceCommand(input: string, reference: Date, locale: string): VoiceIntent | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  if (/what('s| is) next|read (my )?(schedule|plan)/i.test(normalized)) {
    return { type: 'read' };
  }

  if (normalized.startsWith('add') || normalized.startsWith('legg til')) {
    return parseAddCommand(input, reference, locale);
  }

  if (normalized.startsWith('move') || normalized.startsWith('flytt')) {
    return parseMoveCommand(input, reference, locale);
  }

  if (normalized.startsWith('delete') || normalized.startsWith('slett')) {
    const title = input.replace(/^(delete|slett)/i, '').trim().replace(/^['"]|['"]$/g, '');
    if (!title) return null;
    return { type: 'delete', title };
  }

  return null;
}

function parseAddCommand(input: string, reference: Date, locale: string): VoiceIntent | null {
  const addSchema = z
    .object({
      title: z.string().min(1),
      time: z.date(),
      duration: z.number().min(5).max(720).optional(),
    })
    .transform((data) => ({
      ...data,
      duration: data.duration ?? 60,
    }));

  const durationMatch = input.match(durationPattern);
  const duration = durationMatch ? Number(durationMatch[1]) : undefined;
  const stripped = input.replace(durationPattern, '');
  const titleMatch = stripped.match(/add\s+['"]?(.*?)['"]?\s+at/i) ?? stripped.match(/legg til\s+['"]?(.*?)['"]?\s+kl/i);
  const title = titleMatch?.[1]?.trim();
  const timeMatch = chrono
    .parse(stripped, reference, { forwardDate: true, timezone: locale === 'no' ? 'Europe/Oslo' : undefined })
    .find(Boolean);
  if (!title || !timeMatch) return null;

  const parsed = addSchema.safeParse({
    title,
    time: timeMatch.date(),
    duration,
  });
  if (!parsed.success) return null;
  return { type: 'add', title: parsed.data.title, start: parsed.data.time, duration: parsed.data.duration };
}

function parseMoveCommand(input: string, reference: Date, locale: string): VoiceIntent | null {
  const titleMatch = input.match(/move\s+['"]?(.*?)['"]?\s+to/i) ?? input.match(/flytt\s+['"]?(.*?)['"]?\s+til/i);
  if (!titleMatch) return null;
  const timeMatch = chrono
    .parse(input, reference, { forwardDate: true, timezone: locale === 'no' ? 'Europe/Oslo' : undefined })
    .find(Boolean);
  if (!timeMatch) return null;
  return {
    type: 'move',
    title: titleMatch[1].trim(),
    start: timeMatch.date(),
  };
}

export function snapToFiveMinutes(date: Date) {
  const minutes = date.getMinutes();
  const snapped = Math.round(minutes / 5) * 5;
  return set(date, { minutes: snapped, seconds: 0, milliseconds: 0 });
}

export function withTravelBuffer(start: Date, duration: number, travelMinutes: number) {
  return addMinutes(start, duration + travelMinutes);
}
