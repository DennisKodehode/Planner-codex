import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from '@/lib/intent/parser';

describe('parseVoiceCommand', () => {
  it('parses add command', () => {
    const result = parseVoiceCommand('Add coffee with Anna at 9am for 30 minutes', new Date('2024-01-01T08:00:00Z'), 'en');
    expect(result).toMatchObject({ type: 'add', title: 'coffee with Anna', duration: 30 });
  });

  it('parses move command', () => {
    const result = parseVoiceCommand('Move standup to 10:15', new Date('2024-01-01T08:00:00Z'), 'en');
    expect(result?.type).toBe('move');
  });

  it('returns null for unsupported command', () => {
    const result = parseVoiceCommand('Remind me about lunch', new Date(), 'en');
    expect(result).toBeNull();
  });
});
