/** All names, observations and records in this file are invented test data. */
export const fixtures = {
  fleet_extract_messages: {
    sourceId: 'synthetic-message-001',
    text: 'EVENT/E-01/2026-11-04T09:00Z/2026-11-04T10:00Z/TEAM-ALPHA/Training briefing//\nTASK/T-01/2026-11-04T16:00Z/TEAM-BRAVO/Review training log//\nTASK/T-02/tomorrow/TEAM-ALPHA/Confirm missing date//'
  },
  fleet_solve_schedule: {
    windows: [{start: 480, end: 1020}],
    people: [
      {id: 'person-a', qualifications: ['instructor'], windows: [{start:480,end:1020}], maxMinutes:180, restMinutes:30},
      {id: 'person-b', qualifications: ['observer'], windows: [{start:480,end:1020}], maxMinutes:240, restMinutes:0}
    ],
    requests: [
      {id:'drill-a',duration:60,starts:[540,600,630],people:['person-a'],resources:['room-a'],qualifications:['instructor']},
      {id:'drill-b',duration:60,starts:[540,600,630],people:['person-a','person-b'],resources:['room-a'],qualifications:['instructor','observer']}
    ], maxNodes: 50000
  },
  fleet_reconcile_records: {
    local: [
      {id:'rev-1',recordId:'form-1',parents:[],actor:'device-a',value:'Draft'},
      {id:'rev-a',recordId:'form-1',parents:['rev-1'],actor:'device-a',value:'Local edit'}
    ],
    remote: [
      {id:'rev-1',recordId:'form-1',parents:[],actor:'device-a',value:'Draft'},
      {id:'rev-b',recordId:'form-1',parents:['rev-1'],actor:'device-b',value:'Remote edit'}
    ]
  },
  fleet_plan_uploads: {
    budgetBytes: 1000,
    items: [
      {id:'photo-1',bytes:10000,uploadedBytes:2000,priority:1,createdAt:'2026-11-04T08:00Z'},
      {id:'record-1',bytes:400,uploadedBytes:0,priority:5,createdAt:'2026-11-04T09:00Z'}
    ]
  },
  fleet_search_evidence: {
    query:'training log', asOf:'2026-11-04T12:00Z', maxAgeDays:90, limit:5,
    documents: [
      {id:'doc-1',title:'Synthetic training note',source:'fixture://training-note',text:'The training log is reviewed by the assigned instructor before the record is filed.',approved:true,updatedAt:'2026-11-01T09:00Z'},
      {id:'doc-2',title:'Excluded draft',source:'fixture://excluded',text:'Training log training log training log.',approved:false,updatedAt:'2026-11-01T09:00Z'}
    ]
  },
  fleet_analyze_dependencies: {
    deadline: 180, targets:['review'],
    nodes:[
      {id:'parts',duration:60,readyAt:0,dependencies:[],source:'fixture://parts'},
      {id:'staff',duration:30,readyAt:20,dependencies:[],source:'fixture://staff'},
      {id:'work',duration:100,readyAt:0,dependencies:['parts','staff'],source:'fixture://work'},
      {id:'review',duration:30,readyAt:0,dependencies:['work'],source:'fixture://review'}
    ]
  }
};
export type FixtureTool = keyof typeof fixtures;
