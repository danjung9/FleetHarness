import type { AppState, Project, Settings } from '../shared/types.js';
import type { Store } from './storage.js';

/** The backend needs a project repository, not ownership of the application's state.json. */
export type RunRepository = Pick<Store, 'root' | 'state' | 'project' | 'save' | 'saveProject'>;

/** A candidate's mutable execution projection never overwrites its parent project. */
export class ScopedRunStore implements RunRepository {
  readonly state: AppState;
  private writes: Promise<void> = Promise.resolve();

  constructor(public readonly root: string, project: Project, settings: Settings,
    private readonly persist: (project: Project) => Promise<void> | void) {
    this.state = { version: 1, projects: [structuredClone(project)], settings: structuredClone(settings) };
  }

  project(id: string): Project {
    const project = this.state.projects[0];
    if (project.id !== id) throw new Error('This execution cannot access another project.');
    return project;
  }

  save(): Promise<void> {
    const snapshot = structuredClone(this.state.projects[0]);
    this.writes = this.writes.catch(() => {}).then(() => this.persist(snapshot));
    return this.writes;
  }

  saveProject(next: Project): Promise<void> {
    const current = this.project(next.id), snapshot = structuredClone(next);
    this.writes = this.writes.catch(() => {}).then(async () => {
      await this.persist(snapshot);
      for (const key of Object.keys(current)) delete (current as unknown as Record<string, unknown>)[key];
      Object.assign(current, snapshot);
    });
    return this.writes;
  }
}
