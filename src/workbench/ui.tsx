import { useState, type ReactNode } from 'react';
import { Activity, AlertCircle, Check, Circle, Clock3, ExternalLink, ShieldCheck } from 'lucide-react';
import { isDesktop } from './api';

export type Work = (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
export const statusLabels: Record<string, string> = { draft: 'Draft request', running: 'Creating tool', stopped: 'Stopped', failed: 'Needs help', review: 'Ready to try', approved: 'Approved', delivered: 'Downloaded', queued: 'Queued', complete: 'Complete', active: 'In progress' };
export const domains: Record<string, string> = { messages: 'Documents & messages', scheduling: 'Scheduling', offline: 'Offline & edge', knowledge: 'Knowledge & search', readiness: 'Fleet readiness', cyber: 'Cyber resilience', governance: 'Governance', workflow: 'Workflows', physics: 'Engineering', fielding: 'Path to fleet' };
export const taskTitles: Record<string, string> = { '12': 'Turn messages into a daily timeline', '11': 'Make a training plan without clashes', '36': 'Complete paperwork while offline', '40': 'Keep official records in one place', '24': 'Pull tasks from message traffic', '35': 'Review cyber risks before taking action', '44': 'Keep maintenance moving offline', '14': 'Understand what affects the mission', '32': 'See readiness risks earlier', '26': 'Find a path back to mission-ready', '15': 'Search acquisition records across teams', '17': 'Check surf conditions against craft limits', '25': 'Review access rules and sign-in tools', '42': 'Coordinate events, resources, and reporting', '18': 'Turn cyber alerts into clear handoffs', '22': 'Digitize handwritten logs for review', '39': 'Find relevant lessons learned', '34': 'Build a maritime briefing from source data', '16': 'Set boundaries for shipboard agents', '46': 'Find approved tools, data, and contacts', '41': 'Track service queues and prepare documents', '19': 'Keep a traceable infrastructure risk register', '37': 'Prepare a working tool for fleet use', '33': 'Find procedures with source references', '13': 'Bring ship-system status into one view', '23': 'Test agent permissions in a simulation', '43': 'Track requirements and review changes', '48': 'Support decisions with an offline workflow', '9': 'Test how autonomous systems interact', '8': 'Draft and review casualty reports', '10': 'Plan mooring and tug resources', '20': 'Prepare a vessel brief with citations', '21': 'Find engineering casualty procedures', '45': 'Prioritize critical data when reconnecting' };
export function SourceLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const [status, setStatus] = useState('');
  return isDesktop ? <span className="wb-source-copy"><button className={className} title={href} onClick={async () => { try { await navigator.clipboard.writeText(href); setStatus('Link copied'); } catch { setStatus(href); } }}>{children}<ExternalLink size={13}/></button>{status && <span role="status">{status}</span>}</span> : <a className={className} href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13}/></a>;
}
export function Status({ value }: { value: string }) {
  const Icon = ['complete', 'approved', 'delivered'].includes(value) ? Check : value === 'review' ? ShieldCheck : value === 'failed' ? AlertCircle : ['running', 'active'].includes(value) ? Activity : value === 'queued' ? Clock3 : Circle;
  return <span className={'wb-status ' + value}><Icon size={13} aria-hidden="true"/>{statusLabels[value] || value}</span>;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wb-empty"><h2>{title}</h2><div>{children}</div></div>;
}
export function Mark() {
  return <svg width="28" height="28" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 7h26M5 18h18M5 29h26M12 7v22M24 7v22"/><circle cx="24" cy="18" r="4"/></svg>;
}
export function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
