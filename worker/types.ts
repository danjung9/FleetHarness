import type { Project, Settings } from '../shared/types.js';
import type { PipelineCheckpoint } from '../electron/pi-backend.js';

export interface CheckpointPointer {
  checkpointId: string;
  completedStage: PipelineCheckpoint['completedStage'];
  metadataPath: string;
  filesPath: string;
  metadataSha256: string;
  filesSha256: string;
  sourceHash: string;
}
export interface WorkerInput {
  version: 1;
  runId: string;
  epoch: number;
  mode: 'start' | 'resume';
  project: Project;
  settings: Settings;
  providerBaseUrl: string;
  providerToken: string;
  checkpoint?: CheckpointPointer;
  retryVerification?: boolean;
  requireCheckpointAck?: boolean;
}
export interface WorkerProgress {
  version: 1;
  runId: string;
  epoch: number;
  status: 'running' | 'pausing' | 'paused' | 'failed' | 'review';
  project: Project;
  checkpoint?: CheckpointPointer;
  updatedAt: string;
  error?: string;
}
