import type { Command, CommandFinished } from '@vercel/sandbox';

/** Detached command metadata can omit exitCode even after exit; wait populates it. */
export async function completedCommand(command: Command, timeoutMs = 1_000): Promise<CommandFinished | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await command.wait({ signal });
  } catch (error) {
    if (signal.aborted) return null;
    throw error;
  }
}
