import { hostedAuth } from './hosted-auth';
import { createHostedClient } from './hosted-client';

export const SESSION_EXPIRED_EVENT = 'fleetharness-session-expired';
export const hostedClient = createHostedClient({
  getAccess: async () => {
    if (!hostedAuth) return null;
    const { data, error } = await hostedAuth.auth.getSession();
    if (error) throw error;
    return data.session ? { token: data.session.access_token, userId: data.session.user.id } : null;
  },
  onUnauthorized: () => {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    void hostedAuth?.auth.signOut({ scope: 'local' });
  }
});
