export function recognize(regions){
 if(!Array.isArray(regions)||!regions.length)throw Error('INVALID_INPUT');
 const fields={},uncertain=[]; const seen=new Set();
 for(const r of regions){if(!r||typeof r.field!=='string'||!r.field||seen.has(r.field)||!Array.isArray(r.candidates)||!r.candidates.length)throw Error('INVALID_INPUT');seen.add(r.field);
 const shape=p=>Array.isArray(p)&&p.length&&Array.isArray(p[0])&&p[0].length&&p.every(row=>Array.isArray(row)&&row.length===p[0].length&&row.every(v=>Number.isInteger(v)&&v>=0&&v<=255));
 if(!shape(r.pixels)||r.candidates.some(c=>!shape(c.pixels)||c.pixels.length!==r.pixels.length||c.pixels[0].length!==r.pixels[0].length))throw Error('UNSUPPORTED_IMAGE');
 let best=Infinity,value=null;const pixels=r.pixels.flat();for(const c of r.candidates){if(!['string','number'].includes(typeof c.value))throw Error('INVALID_INPUT');const cp=c.pixels.flat();const score=pixels.reduce((s,p,i)=>s+(p-cp[i])**2,0)/pixels.length/65025;if(score<best){best=score;value=c.value;}}
 if(best>0.01||pixels.reduce((s,p)=>s+255-p,0)/255/pixels.length<0.02){value=null;uncertain.push(r.field);}fields[r.field]=value;
 }return {fields,uncertain};
}
