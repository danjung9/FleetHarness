export type ComponentStatus = 'planned' | 'building' | 'generated' | 'blocked';
export interface SystemComponent {
  id: string;
  label: string;
  description: string;
  kind: 'interface' | 'logic' | 'data' | 'integration';
  files: string[];
}
export interface SystemConnection { from: string; to: string; label: string }
export interface SystemDefinition {
  title: string;
  description: string;
  components: SystemComponent[];
  connections: SystemConnection[];
}
export interface ComponentProgress { status: ComponentStatus; detail: string; updatedAt: string }
export interface SystemDesign {
  definition: SystemDefinition;
  progress: Record<string, ComponentProgress>;
  updatedAt: string;
}

/** Validate model output before it reaches either the filesystem or the renderer. */
export function parseSystemDefinition(value: unknown): SystemDefinition {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected a system design object.');
    return v as Record<string, unknown>;
  };
  const text = (v: unknown, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`Design text must contain 1–${max} characters.`);
    return v.trim();
  };
  const input = object(value);
  if (!Array.isArray(input.components) || input.components.length < 1 || input.components.length > 12) throw new Error('Describe 1–12 major system components.');
  const ids = new Set<string>();
  const components = input.components.map(raw => {
    const c = object(raw), id = text(c.id, 40);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id) || ['constructor', 'prototype', '__proto__'].includes(id)) throw new Error('Component IDs must be unique lowercase identifiers.');
    ids.add(id);
    if (!['interface', 'logic', 'data', 'integration'].includes(String(c.kind))) throw new Error('Unknown component kind.');
    if (!Array.isArray(c.files) || c.files.length < 1 || c.files.length > 12) throw new Error('Map each component to 1–12 source files.');
    const files = c.files.map(rawFile => {
      const file = text(rawFile, 200);
      if (/^[./\\]|[:\\\x00-\x1f]/.test(file) || file.split('/').some(part => !part || part === '..' || part === '.' || part.startsWith('.')) || file === 'system-design.json') throw new Error('Use workspace-relative source file paths, without traversal or hidden files.');
      return file;
    });
    return { id, label: text(c.label, 64), description: text(c.description, 500), kind: c.kind as SystemComponent['kind'], files: [...new Set(files)] };
  });
  if (!Array.isArray(input.connections) || input.connections.length > 24) throw new Error('Describe up to 24 connections.');
  const pairs = new Set<string>();
  const connections = input.connections.map(raw => {
    const c = object(raw), from = text(c.from, 40), to = text(c.to, 40);
    const pair = from + ':' + to;
    if (!ids.has(from) || !ids.has(to) || from === to || pairs.has(pair)) throw new Error('Connections must join distinct, known components without duplicates.');
    pairs.add(pair);
    return { from, to, label: text(c.label, 100) };
  });
  return { title: text(input.title, 120), description: text(input.description, 800), components, connections };
}
