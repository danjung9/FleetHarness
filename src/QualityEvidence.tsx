import type { QualityReport } from '../shared/quality';
import './quality-evidence.css';
import { isHosted } from './hosted-config';

export function QualityEvidence({ report }: { report?: QualityReport }) {
  if (!report) return <p className="quality-legacy">This older report contains Node test results only. Browser journeys and requirement coverage were not recorded.</p>;
  const count = (status: string) => report.criteria.filter(criterion => criterion.status === status).length;
  return <section className="quality-evidence" aria-label="Requirement and browser evidence">
    <h2>Requirement coverage</h2>
    <p>{count('passed')} demonstrated · {count('failed')} failed · {count('unverified')} unverified. {report.requirementsMet ? 'Every recorded requirement has passing planned browser evidence.' : 'Prototype approval does not accept or complete the unverified requirements.'}</p>
    <ul className="quality-criteria">{report.criteria.map(criterion => <li key={criterion.criterionId}>
      <div><strong>{criterion.criterionId}</strong><span className={'quality-status ' + criterion.status}>{criterion.status === 'passed' ? 'Demonstrated' : criterion.status === 'failed' ? 'Failed' : 'Unverified'}</span></div>
      <p>{criterion.requirement}</p><small>{criterion.detail}</small>
    </li>)}</ul>
    <details className="quality-journeys" open={report.status === 'failed'}>
      <summary>Browser journeys · {report.journeys.filter(journey => journey.status === 'passed').length} / {report.journeys.length} passed</summary>
      {report.errors.length > 0 && <ul>{report.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      <ul>{report.journeys.map(journey => <li key={journey.id + journey.viewport}>
        <strong>{journey.title}</strong> · {journey.viewport} · {journey.status}<p>{journey.detail}</p>
        {(journey.screenshot || journey.trace) && <small>Evidence in {isHosted ? 'the source & evidence ZIP' : 'the source folder'}: {[journey.screenshot, journey.trace].filter(Boolean).join(' · ')}</small>}
      </li>)}</ul>
    </details>
  </section>;
}
