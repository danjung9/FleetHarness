const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Core=require('./core.cjs');
function ui(){
 const elements=new Map(), controls=[];
 function element(tag='div') {const e={tag,disabled:false,value:'',checked:false,textContent:'',append(...children){for(const child of children)if(child.id)elements.set(child.id,child);},replaceChildren(){},focus(){}};if(['button','input','select','textarea'].includes(tag))controls.push(e);return e;}
 const html=fs.readFileSync(__dirname+'/index.html','utf8');
 for(const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g)){const e=element(m[1]);e.id=m[2];elements.set(e.id,e);}
 const document={getElementById:id=>elements.get(id),createElement:element,querySelectorAll:selector=>controls.filter(e=>selector.split(',').map(s=>s.trim()).includes(e.tag)),body:element()};
 const context={Core,document,indexedDB:{open:()=>({})},confirm:()=>true};vm.createContext(context);
 const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
 vm.runInContext(scripts.at(-1)[1],context);
 vm.runInContext('db={};state.loaded=true;state.packet=C.extract();persist=async()=>{};render();',context);
 return {context,elements,run:code=>vm.runInContext(code,context)};
}
test('UI locks editable fields synchronously through queued transactions, then retains corrections',async()=>{
 const u=ui();let release;
 u.context.waitForStorage=new Promise(resolve=>{release=resolve;});
 const pending=u.run('enqueue(()=>change(async s=>{await waitForStorage;s.connection="demo-reconnect";}))');
 for(const id of ['training-duration','supply-quantity','correspondence-subject','task-due-choice','review-confirm','connection']) assert.equal(u.elements.get(id).disabled,true,id+' must wait for storage');
 assert.equal(u.elements.get('export-draft').disabled,false);
 await Promise.resolve();release();await pending;
 const duration=u.elements.get('training-duration');assert.equal(duration.disabled,false);
 duration.value='45';duration.oninput();await u.run('chain');
 const quantity=u.elements.get('supply-quantity');quantity.value='6';quantity.oninput();await u.run('chain');
 await u.elements.get('save-packet').onclick();
 assert.equal(u.run('state.committed.training.duration'),'45');assert.equal(u.run('state.committed.supply.quantity'),'6');
 assert.equal(duration.value,'45');assert.equal(quantity.value,'6');
});
test('UI unlocks after transaction rejection and retains the editable draft',async()=>{
 const u=ui();await u.run('enqueue(async()=>{throw Error("Storage rejected");})');
 assert.equal(u.elements.get('training-duration').disabled,false);
 assert.equal(u.elements.get('workspace-status').textContent,'Storage rejected');
 assert.equal(u.run('state.packet.training.duration'),'4?');
});
