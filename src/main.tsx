import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HostedAuthBoundary } from './HostedAuth';
import { isHosted } from './hosted-config';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles.css';
import './activity.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isHosted ? <HostedAuthBoundary>{(user, signOut) => <App key={user.id} accountEmail={user.email} signOut={signOut}/>}</HostedAuthBoundary> : <App/>}</React.StrictMode>
);
