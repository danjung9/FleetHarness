import type { FleetAPI } from './types.js';

const conversationMethods = ['sendMessage', 'cancelMessage', 'answerClarification', 'applyConversationAction', 'dismissConversationAction'] as const;
type ConversationMethod = typeof conversationMethods[number];
export const conversationRestartMessage = 'Project lead needs a full app restart to load this update. Let active builds finish, then quit and reopen AppYard. Your draft is saved.';
export const reviewRestartMessage = 'Review iteration needs a full app restart to load this update. Let active builds finish, then quit and reopen AppYard. Your review draft is saved.';
export const resumeRestartMessage = 'Resuming phases needs a full app restart to load this update. Let active builds finish, then quit and reopen AppYard. Your saved work is preserved.';
export const visualReviewRestartMessage = 'Screenshot viewing needs a full app restart to load this update. Let active builds finish, then quit and reopen AppYard. Your saved evidence is preserved.';

export function hasConversationBridge(bridge: Partial<FleetAPI> | undefined): boolean {
  return !!bridge && conversationMethods.every(name => typeof bridge[name] === 'function');
}

/** Renderer hot reload does not replace Electron's preload or main process. */
export function withDesktopCompatibility(bridge: FleetAPI): FleetAPI {
  let hostSupportsConversation: boolean | undefined;
  const supportedBridge = hasConversationBridge(bridge);
  const methods = Object.fromEntries(conversationMethods.map(name => [name, async (...args: unknown[]) => {
    if (!supportedBridge || hostSupportsConversation === false) throw new Error(conversationRestartMessage);
    try { return await (bridge[name] as (...args: unknown[]) => Promise<void>)(...args); }
    catch (error) {
      if (error instanceof Error && /No handler registered for ['"]fleet:conversation:/.test(error.message)) throw new Error(conversationRestartMessage);
      throw error;
    }
  }])) as Pick<FleetAPI, ConversationMethod>;
  return {
    ...bridge, ...methods,
    async visualReviewImage(id, captureId) {
      if (typeof bridge.visualReviewImage !== 'function') throw new Error(visualReviewRestartMessage);
      try { return await bridge.visualReviewImage(id, captureId); }
      catch (error) {
        if (error instanceof Error && /No handler registered for ['"]fleet:visual-review-image/.test(error.message)) throw new Error(visualReviewRestartMessage);
        throw error;
      }
    },
    async resumeRun(id) {
      if (typeof bridge.resumeRun !== 'function') throw new Error(resumeRestartMessage);
      try { return await bridge.resumeRun(id); }
      catch (error) {
        if (error instanceof Error && /No handler registered for ['"]fleet:resume/.test(error.message)) throw new Error(resumeRestartMessage);
        throw error;
      }
    },
    async requestChanges(id, feedback) {
      if (typeof bridge.requestChanges !== 'function') throw new Error(reviewRestartMessage);
      try { return await bridge.requestChanges(id, feedback); }
      catch (error) {
        if (error instanceof Error && /No handler registered for ['"]fleet:request-changes/.test(error.message)) throw new Error(reviewRestartMessage);
        throw error;
      }
    },
    async bootstrap() {
      const data = await bridge.bootstrap();
      hostSupportsConversation = data.capabilities?.projectConversation === true;
      return { ...data, capabilities: { ...data.capabilities, projectConversation: supportedBridge && hostSupportsConversation } };
    }
  };
}
