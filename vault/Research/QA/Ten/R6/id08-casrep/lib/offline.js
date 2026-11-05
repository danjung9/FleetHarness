import { array, canonical, compareText, integer, object, strings, text, timestamp, unique } from './validation.js';
export function reconcileRecords(input) {
    const data = object(input);
    const revisions = (value, label) => array(value, label, 5000).map(x => {
        const r = object(x, label);
        if (r.value !== null && (typeof r.value !== 'string' || r.value.length > 50_000))
            throw new Error('Revision value must be a string of at most 50,000 characters, or null (tombstone).');
        return { id: text(r.id, 'revision.id', 200), recordId: text(r.recordId, 'recordId', 200),
            parents: strings(r.parents, 'parents', 100).sort(), actor: text(r.actor, 'actor', 200), value: r.value };
    });
    const union = new Map();
    for (const r of [...revisions(data.local, 'local'), ...revisions(data.remote, 'remote')]) {
        if (union.has(r.id) && canonical(union.get(r.id)) !== canonical(r))
            throw new Error(`Revision ID collision: ${r.id}. Content is immutable.`);
        union.set(r.id, r);
    }
    for (const r of union.values())
        for (const parent of r.parents) {
            if (!union.has(parent))
                throw new Error(`Missing parent ${parent}; fetch missing history before reconciliation.`);
            if (union.get(parent).recordId !== r.recordId)
                throw new Error('A revision cannot parent a different record.');
        }
    // Iterative Kahn traversal avoids stack overflow with long offline histories.
    const indegree = new Map([...union.values()].map(r => [r.id, r.parents.length]));
    const children = new Map();
    for (const r of union.values())
        for (const p of r.parents)
            children.set(p, [...(children.get(p) ?? []), r.id]);
    const queue = [...union.keys()].filter(id => indegree.get(id) === 0);
    let visited = 0;
    for (let i = 0; i < queue.length; i++) {
        visited++;
        for (const child of children.get(queue[i]) ?? []) {
            indegree.set(child, indegree.get(child) - 1);
            if (!indegree.get(child))
                queue.push(child);
        }
    }
    if (visited !== union.size)
        throw new Error('Revision history contains a cycle.');
    const operations = [...union.values()].sort((a, b) => compareText(a.id, b.id));
    const records = [...new Set(operations.map(r => r.recordId))].sort().map(recordId => {
        const heads = operations.filter(r => r.recordId === recordId && !(children.get(r.id)?.length));
        return { recordId, status: heads.length > 1 ? 'conflict' : heads[0].value === null ? 'deleted' : 'resolved', heads,
            value: heads.length === 1 ? heads[0].value : null };
    });
    return { operations, records, conflicts: records.filter(r => r.status === 'conflict').length,
        note: 'Transport-neutral reconciliation. Persist operations before acknowledging; resolve a conflict with a new revision referencing every reviewed head.' };
}
export function planUploads(input) {
    const data = object(input);
    const budget = integer(data.budgetBytes, 'budgetBytes');
    const items = unique(array(data.items, 'items', 2000).map(x => {
        const v = object(x);
        const bytes = integer(v.bytes, 'bytes', 1);
        const createdAt = timestamp(v.createdAt);
        if (!createdAt)
            throw new Error('createdAt must be a valid timestamp with timezone.');
        return { id: text(v.id, 'id', 200), bytes, uploadedBytes: integer(v.uploadedBytes, 'uploadedBytes', 0, bytes),
            priority: integer(v.priority, 'priority', 0, 5), createdAt };
    }), 'items').sort((a, b) => b.priority - a.priority || compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id));
    let remaining = budget;
    const transfers = [];
    for (const item of items) {
        const bytes = Math.min(remaining, item.bytes - item.uploadedBytes);
        if (bytes > 0) {
            transfers.push({ id: item.id, offset: item.uploadedBytes, bytes, completeAfterAck: item.uploadedBytes + bytes === item.bytes });
            remaining -= bytes;
        }
    }
    return { transfers, usedBytes: budget - remaining, remainingBudgetBytes: remaining,
        pendingIds: items.filter(i => i.uploadedBytes + (transfers.find(t => t.id === i.id)?.bytes ?? 0) < i.bytes).map(i => i.id),
        note: 'Advance uploadedBytes only after a receiver acknowledgement. Priority is caller-supplied; this tool performs no transmission.' };
}
