import type { Project } from '../shared/types';
import { challenges } from '../harness/catalog';
import { recipes } from '../harness/recipes';
import { globalAgentTools, phasesForRecipe, type PhaseContract } from '../harness/phases';
import './phases.css';

export function projectPhases(project: Project) {
  return project.phasePlan ?? phasesForRecipe(recipes[project.sourceChallenge?.recipe ?? challenges.find(c => c.id === project.challengeId)?.recipe ?? 'workflow']);
}

export function PhaseDetails({ phase, globalTools = globalAgentTools, legacy = false, showGate = true }: { phase: PhaseContract; globalTools?: string[]; legacy?: boolean; showGate?: boolean }) {
  return <div className="phase-details">
    {legacy && <p className="phase-note">Assignments below apply to the next run. This earlier run did not record phase assignments.</p>}
    <section><h3>{phase.owner === 'agent' ? 'Assigned skills' : 'Review guidance'}</h3>
      <ul className="phase-resources">{phase.skills.map(skill => <li key={skill}><code>{skill}</code></li>)}</ul>
    </section>
    {phase.owner === 'agent' && <section className="phase-global"><h3>Global tools</h3><p>Inherited by every agent phase.</p><ul className="phase-resources">{globalTools.map(tool => <li key={tool}><code>{tool}</code></li>)}</ul></section>}
    <section><h3>Phase-specific tools</h3>{phase.tools.length ? <><p>Added for this phase.</p><ul className="phase-resources">{phase.tools.map(tool => <li key={tool}><code>{tool}</code></li>)}</ul></> : <p>No agent session. {phase.owner === 'human' ? 'You make the approval decision.' : 'The host exports after your approval.'}</p>}</section>
    {phase.hostTools.length > 0 && <section><h3>{phase.owner === 'human' ? 'Review controls' : 'Harness tools'}</h3><ul>{phase.hostTools.map(tool => <li key={tool}>{tool}</li>)}</ul></section>}
    <section><h3>Inputs</h3><ul>{phase.inputs.map(input => <li key={input}>{input}</li>)}</ul></section>
    <section><h3>Outputs</h3><ul>{phase.outputs.map(output => <li key={output}>{output}</li>)}</ul></section>
    {showGate && <section className="phase-gate"><h3>Ready to advance when</h3><p>{phase.exit}</p></section>}
  </div>;
}
