import type { StageEvent } from './agent-runner.js';

/** Report review activity without exposing model prose, sealed inputs or tool payloads. */
export function createPlanningReviewProgress(log: (message: string) => void): (event: StageEvent) => void {
  let lastMessage = '', reads = 0, reportedReads = 0;
  const emit = (message: string) => {
    if (message === lastMessage) return;
    lastMessage = message;
    log(message);
  };
  const reportReads = () => {
    if (reads === reportedReads) return;
    reportedReads = reads;
    emit(`Planning review completed ${reads} input ${reads === 1 ? 'read' : 'reads'}.`);
  };
  const waiting = () => emit('Planning review is waiting for the model.');
  const responding = () => emit('Planning review is receiving a model response.');
  return event => {
    switch (event.type) {
      case 'turn_start':
      case 'turn_end':
        waiting(); break;
      case 'message_update':
        responding(); break;
      case 'tool_execution_update':
        // Codex reports reasoning activity with no tool fields. Never inspect its content.
        if (!event.toolName) responding();
        break;
      case 'message_end':
        if (event.message.role !== 'assistant') break;
        if (event.message.stopReason === 'error') emit('Planning review model request failed.');
        else if (event.message.stopReason === 'aborted') emit('Planning review model response was interrupted.');
        else if (event.message.stopReason === 'length') emit('Planning review model response reached its output limit.');
        else waiting();
        break;
      case 'tool_execution_start':
        if (event.toolName === 'fleet_submit_planning_review') {
          reportReads();
          emit('Planning review is submitting its verdict.');
        }
        break;
      case 'tool_execution_end':
        if (event.isError) {
          emit(event.toolName === 'fleet_read_planning_artifact' ? 'Planning review input read failed.'
            : event.toolName === 'fleet_submit_planning_review' ? 'Planning review verdict submission failed.'
            : 'Planning review operation failed.');
        } else if (event.toolName === 'fleet_read_planning_artifact') {
          reads++;
          // A large snapshot can require many pages. Retain counts without logging every page.
          if (reads === 1 || reads % 5 === 0) reportReads();
        } else if (event.toolName === 'fleet_submit_planning_review') {
          reportReads();
          emit('Planning review submitted its verdict.');
        }
        break;
      case 'auto_retry_start':
        emit('Planning review provider is retrying the model request.'); break;
      case 'auto_retry_end':
        emit(event.success ? 'Planning review provider retry recovered.' : 'Planning review provider retries were exhausted.'); break;
      case 'compaction_start':
        emit('Planning review is compacting its context.'); break;
      case 'compaction_end':
        if (event.aborted) emit('Planning review context compaction was interrupted.');
        else waiting();
        break;
    }
  };
}
