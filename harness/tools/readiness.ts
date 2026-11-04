import { array, compareText, integer, object, strings, text, unique } from './validation.js';

export function analyzeDependencies(input: unknown) {
  const data = object(input), deadline = integer(data.deadline, 'deadline');
  const nodes = unique(array(data.nodes, 'nodes', 200).map(x => {
    const n = object(x);
    return { id: text(n.id, 'node.id', 200), dependencies: strings(n.dependencies, 'dependencies'),
      duration: n.duration === null ? null : integer(n.duration, 'duration'), readyAt: integer(n.readyAt, 'readyAt'),
      source: text(n.source, 'source', 2000) };
  }), 'nodes');
  const graph = new Map(nodes.map(n => [n.id, n]));
  const targets = strings(data.targets, 'targets');
  if (!targets.length) throw new Error('At least one target is required.');
  for (const id of [...targets, ...nodes.flatMap(n => n.dependencies)]) if (!graph.has(id)) throw new Error(`Unknown dependency or target: ${id}`);
  type Result = {id: string; finish: number | null; lowerBound: number; path: string[]; unknowns: string[]; source: string};
  const done = new Map<string, Result>(), visiting = new Set<string>();
  function visit(id: string): Result {
    if (visiting.has(id)) throw new Error('Dependency graph contains a cycle.');
    if (done.has(id)) return done.get(id)!;
    visiting.add(id);
    const node = graph.get(id)!, dependencies = node.dependencies.map(visit);
    const controlling = [...dependencies].sort((a,b) => b.lowerBound-a.lowerBound || compareText(a.id,b.id))[0];
    const unknowns = [...new Set([...dependencies.flatMap(d => d.unknowns), ...(node.duration === null ? [id] : [])])];
    const start = Math.max(node.readyAt, controlling?.lowerBound ?? 0);
    const lowerBound = start + (node.duration ?? 0);
    const result: Result = {id, finish: unknowns.length ? null : lowerBound, lowerBound,
      path: [...(controlling && controlling.lowerBound >= node.readyAt ? controlling.path : []), id], unknowns, source: node.source};
    visiting.delete(id); done.set(id,result); return result;
  }
  // Validate disconnected nodes too so a latent cycle cannot silently enter the model.
  nodes.forEach(n => visit(n.id));
  const outputs = targets.map(id => {const r = visit(id); return {...r, margin: r.finish === null ? null : deadline-r.finish,
    status: r.finish === null ? 'unknown' : r.finish > deadline ? 'late' : 'within_deadline'};});
  return {deadline, targets: outputs, note: 'Deterministic DAG timing over supplied estimates; shared-resource constraints and operational readiness are not modeled. Paths with unknown estimates are lower-bound paths, not proven critical paths.'};
}
