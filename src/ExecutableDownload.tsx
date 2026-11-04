import { Download, LoaderCircle } from 'lucide-react';
import type { FleetAPI, Project } from '../shared/types';
import './executable-download.css';

export function ExecutableDownload({ project, api, busy, action, buttonClassName }: {
  project: Project; api: FleetAPI; busy: boolean; buttonClassName: string;
  action: (task: () => Promise<unknown>) => Promise<unknown>;
}) {
  const download = project.executable, packaging = download?.status === 'packaging';
  return <div className="executable-download">
    <button className={buttonClassName} disabled={busy || packaging || !project.approvedAt || project.status === 'running'}
      onClick={() => void action(() => api.downloadExecutable(project.id))}>
      {packaging ? <LoaderCircle size={16} className="executable-spinner"/> : <Download size={16}/>}
      {packaging ? 'Packaging app…' : download?.status === 'failed' ? 'Retry app download' : 'Download app'}
    </button>
    <p>{project.approvedAt ? 'Standalone app for this computer. Unzip the download to open it. No developer tools or AI account needed.' : 'Approve this build to download a standalone app.'}</p>
    {packaging && <p role="status">Preparing your download. The first package may take a few minutes to download the app runtime.</p>}
    {download?.status === 'failed' && <p role="alert">{download.error}</p>}
    {download?.status === 'ready' && download.savedTo && <p role="status">App saved to <span className="executable-path">{download.savedTo}</span></p>}
  </div>;
}
