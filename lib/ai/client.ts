import Anthropic from '@anthropic-ai/sdk';

/** The Claude model used for all AI features. Update here to change it everywhere. */
export const CLAUDE_MODEL = 'claude-sonnet-5';

export function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({ apiKey });
}
