import type { QualityReport } from '../shared/quality';
import './quality-evidence.css';

export function QualityEvidence({ report }: { report?: QualityReport }) {
  if (!report) return <p className="quality-legacy">This older report contains Node test results only. Browser journeys and requirement coverage were not recorded.</p>;
  const count = (status: string) => report.criteria.filter(criterion => criterion.status === status).length;
  return <section className="quality-evidence" aria-label="Requirement and browser evidence">
    <h2>Requirement coverage</h2>
    <p>{count('passed')} demonstrated · {count('failed')} failed · {count('unverified')} unverified. {report.requirementsMet ? 'Every recorded requirement has its required evidence.' : 'Prototype approval does not accept or complete the unverified requirements.'}</p>
    {report.schemaVersion === 2 && <>
      <h3>Computational capabilities</h3>
      <p>{report.package?.status === 'passed' ? 'The declared package ran in a fresh environment.' : 'The delivered runtime has not passed its clean-start check.'} {report.package?.detail}</p>
      {report.solutionEvaluation && <ul className="quality-criteria">{report.solutionEvaluation.evaluations.map(result => <li key={result.id}>
        <div><strong>{result.id}</strong><span className={'quality-status ' + result.status}>{result.status === 'passed' ? 'Passed' : 'Failed'}</span></div>
        <p>{result.metric}: {result.actual.toFixed(3)} · required {result.threshold.toFixed(3)}{result.baseline !== undefined ? ` · baseline ${result.baseline.toFixed(3)}` : ''}</p>
        <small>{result.dataset.name} · version {result.dataset.version} · {result.dataset.provenance} · {result.cases.length} trial results</small>
        {result.cases.some(item => !item.passed) && <details><summary>Failed cases</summary><ul>{result.cases.filter(item => !item.passed).map(item => <li key={item.id + ':' + item.trial}>{item.id}, trial {item.trial}: {item.detail}</li>)}</ul></details>}
      </li>)}</ul>}
    </>}
    <ul className="quality-criteria">{report.criteria.map(criterion => <li key={criterion.criterionId}>
      <div><strong>{criterion.criterionId}</strong><span className={'quality-status ' + criterion.status}>{criterion.status === 'passed' ? 'Demonstrated' : criterion.status === 'failed' ? 'Failed' : 'Unverified'}</span></div>
      <p>{criterion.requirement}</p><small>{criterion.detail}</small>
    </li>)}</ul>
    <details className="quality-journeys" open={report.status === 'failed'}>
      <summary>Browser journeys · {report.journeys.filter(journey => journey.status === 'passed').length} / {report.journeys.length} passed</summary>
      {report.errors.length > 0 && <ul>{report.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      <ul>{report.journeys.map(journey => <li key={journey.id + journey.viewport}>
        <strong>{journey.title}</strong> · {journey.viewport} · {journey.status}<p>{journey.detail}</p>
        {(journey.screenshot || journey.trace) && <small>Evidence in the source folder: {[journey.screenshot, journey.trace].filter(Boolean).join(' · ')}</small>}
      </li>)}</ul>
    </details>
  </section>;
}
