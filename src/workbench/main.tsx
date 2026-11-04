import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import Workbench from './Workbench';
import './workbench.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Workbench /></React.StrictMode>);
