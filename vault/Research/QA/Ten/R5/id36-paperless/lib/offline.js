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
            throw new Error('ID_COLLISION');
        union.set(r.id, r);
    }
    for (const r of union.values()) for (const p of r.parents) if (!union.has(p)) throw new Error('MISSING_PARENT');
    for (const r of union.values()) for (const p of r.parents) if (union.get(p).recordId !== r.recordId) throw new Error('CROSS_RECORD_PARENT');
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
        throw new Error('CYCLE');
    const operations = [...union.values()].sort((a, b) => compareText(a.id, b.id));
    const records = [...new Set(operations.map(r => r.recordId))].sort().map(recordId => {
        const heads = operations.filter(r => r.recordId === recordId && !(children.get(r.id)?.length));
        return { recordId, status: heads.length > 1 ? 'conflict' : heads[0].value === null ? 'deleted' : 'resolved', heads: heads.map(h=>h.id),
            value: heads.length === 1 ? heads[0].value : null };
    });
    return { operations, records, conflicts: records.filter(r => r.status === 'conflict').length };
}

export function planUploads(data) {
 const budget=integer(data.budgetBytes,'budgetBytes',0,Number.MAX_SAFE_INTEGER);
 const ack=data.acknowledge===undefined?false:data.acknowledge, stopped=data.stopped===undefined?false:data.stopped;
 if(typeof ack!=='boolean'||typeof stopped!=='boolean')throw Error('INVALID_INPUT');
 const items=unique(array(data.items,'items',2000).map(v=>{object(v);const size=integer(v.sizeBytes,'sizeBytes',1,Number.MAX_SAFE_INTEGER);if(!timestamp(v.createdAt))throw Error('INVALID_INPUT');return {id:text(v.id,'id',200),sizeBytes:size,acknowledgedOffset:integer(v.acknowledgedOffset,'offset',0,size),priority:integer(v.priority,'priority',0,5),createdAt:v.createdAt}}),'items').sort((a,b)=>a.priority-b.priority||Date.parse(a.createdAt)-Date.parse(b.createdAt)||compareText(a.id,b.id));
 let remaining=budget;const chunks=[];
 if(!stopped)for(const i of items){const bytes=Math.min(remaining,i.sizeBytes-i.acknowledgedOffset);if(bytes){chunks.push({id:i.id,offset:i.acknowledgedOffset,bytes});remaining-=bytes;if(ack)i.acknowledgedOffset+=bytes}}
 return {chunks,usedBytes:budget-remaining,remainingBudgetBytes:remaining,offsets:[...items].sort((a,b)=>compareText(a.id,b.id)).map(i=>({id:i.id,acknowledgedOffset:i.acknowledgedOffset})),pendingIds:items.filter(i=>i.acknowledgedOffset<i.sizeBytes).map(i=>i.id)};
}
