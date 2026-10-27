/* Kreska Studio 1.3 drawing runtime, extracted from the supplied source.
 * Retains its curve rendering, draw-on arc lengths, stepped/smooth boil,
 * transforms, camera, opacity, pressure ink and skeletal skinning.
 * Website playback draws once, then holds the picture while boil continues.
 */
(() => {
'use strict';
const canvas = document.querySelector('#header-animation');
if (!canvas) return;
const context = canvas.getContext('2d');
if (!context) return;
const TAU = Math.PI * 2;
let renderScene;
let frame = 0, playing = true, exportEvaluating = true;
let loopBypass = 0, loopSourceEditingId = null, dirty = false;
const imageCache = new Map();
const toast = message => console.warn(message);


// Kreska Studio 1.3 source, lines 85–89
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,d=0)=>Number.isFinite(+x)?+x:d;
const clone=o=>JSON.parse(JSON.stringify(o));
const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,lerp=(a,b,t)=>a+(b-a)*t;
function wrapAngle(a){return Math.atan2(Math.sin(a),Math.cos(a))}

// Kreska Studio 1.3 source, lines 91–91
const sorted=o=>Object.keys(o||{}).map(Number).sort((a,b)=>a-b);

// Kreska Studio 1.3 source, lines 93–95
function emptyRig(){return{bones:[],bound:false,mode:'soft',base:{angles:{},roots:{}},keys:{}}}
function defaultReveal(){return{enabled:false,start:0,duration:3,order:'sequential',restart:false}}
function defaultBoil(){return{enabled:true,amount:.8,step:3,mode:'stepped',period:1.8}}

// Kreska Studio 1.3 source, lines 98–99
let strokeMetricCache=new WeakMap();
let project=null;

// Kreska Studio 1.3 source, lines 121–123
function bracket(track,f){const keys=sorted(track);if(!keys.length)return null;let a=keys[0],b=keys[keys.length-1];if(f<=a)return{a:track[a],b:track[a],t:0};if(f>=b)return{a:track[b],b:track[b],t:0};for(let i=0;i<keys.length-1;i++)if(f>=keys[i]&&f<keys[i+1])return{a:track[keys[i]],b:track[keys[i+1]],t:(f-keys[i])/(keys[i+1]-keys[i])};return null}
function eased(t,mode){return mode==='hold'?0:mode==='smooth'?t*t*(3-2*t):t}
function transformAt(l,f){const q=bracket(l.keys,f);if(!q)return{...l.base};const t=eased(q.t,l.ease),out={};for(const k of ['x','y','r','sx','sy'])out[k]=lerp(q.a[k],q.b[k],t);return out}

// Kreska Studio 1.3 source, lines 127–127
function celAt(l,f){let key=-1;for(const k of sorted(l.cels))if(k<=f)key=k;else break;return key<0?{key:-1,cel:null}:{key,cel:l.cels[key]}}

// Kreska Studio 1.3 source, lines 130–130
function poseAt(l,f){const q=bracket(l.rig.keys,f);if(!q)return clone(l.rig.base);const t=eased(q.t,l.ease),p={angles:{},roots:{}};for(const b of l.rig.bones){const a=q.a.angles[b.id]||0,z=q.b.angles[b.id]||0;p.angles[b.id]=a+wrapAngle(z-a)*t;if(!b.parent){const pa=q.a.roots[b.id]||{x:0,y:0},pb=q.b.roots[b.id]||{x:0,y:0};p.roots[b.id]={x:lerp(pa.x,pb.x,t),y:lerp(pa.y,pb.y,t)}}}return p}

// Kreska Studio 1.3 source, lines 133–135
function boneMap(l){return new Map(l.rig.bones.map(b=>[b.id,b]))}
function restAngle(b,map){if(!b.parent)return 0;const p=map.get(b.parent);return Math.atan2(b.y-p.y,b.x-p.x)}
function fk(l,pose){const map=boneMap(l),out=new Map(),visiting=new Set();function visit(b){if(out.has(b.id))return out.get(b.id);if(visiting.has(b.id))return{x:b.x,y:b.y,r:0};visiting.add(b.id);let p;if(!b.parent||!map.has(b.parent)){const offset=pose.roots[b.id]||{x:0,y:0};p={x:b.x+offset.x,y:b.y+offset.y,r:pose.angles[b.id]||0}}else{const parent=map.get(b.parent),q=visit(parent),length=Math.hypot(b.x-parent.x,b.y-parent.y),r=q.r+restAngle(b,map)-restAngle(parent,map)+(pose.angles[b.id]||0);p={x:q.x+Math.cos(r)*length,y:q.y+Math.sin(r)*length,r}}visiting.delete(b.id);out.set(b.id,p);return p}for(const b of l.rig.bones)visit(b);return out}

// Kreska Studio 1.3 source, lines 144–144
function skinMatrices(l,pose){const map=boneMap(l),pos=fk(l,pose),out=new Map();for(const b of l.rig.bones){const rp=b.parent?map.get(b.parent):b,pp=pos.get(b.parent||b.id),r=pos.get(b.id).r-restAngle(b,map),a=Math.cos(r),v=Math.sin(r);out.set(b.id,{a,b:v,c:-v,d:a,e:pp.x-a*rp.x+v*rp.y,f:pp.y-v*rp.x-a*rp.y})}return out}

// Kreska Studio 1.3 source, lines 146–147
function blendedMatrix(weights,mats){const o={a:0,b:0,c:0,d:0,e:0,f:0};let sum=0;for(const[id,w]of weights||[]){const m=mats.get(id);if(!m)continue;sum+=w;for(const k in o)o[k]+=m[k]*w}if(sum<.0001)return{a:1,b:0,c:0,d:1,e:0,f:0};if(Math.abs(sum-1)>.0001)for(const k in o)o[k]/=sum;return o}
function skinPoint(p,mats){if(!mats||!p.w?.length)return{x:p.x,y:p.y,p:p.p};const m=blendedMatrix(p.w,mats);return{x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f,p:p.p}}

// Kreska Studio 1.3 source, lines 151–238
function noise(n){const x=Math.sin(n*127.1+311.7)*43758.5453123;return(x-Math.floor(x))*2-1}
function stringHash(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))|0;return h}
function evaluatedPoints(s,mats,boil,f){
 const seed=stringHash(s.id)%10000,strength=boil.enabled?boil.amount:0;
 const time=Math.floor(f/Math.max(1,boil.step||3));
 const a=noise(seed+time*19.17),b=noise(seed+time*8.3+33),d=noise(seed+time*14.7+73);
 const phase=f/project.fps*TAU/Math.max(.2,boil.period||1.8),offset=seed*.017;
 return s.points.map(p=>{const q=skinPoint(p,mats);
  if(strength){
   if(boil.mode==='smooth'){
    const x=q.x*.028,y=q.y*.028;
    q.x+=strength*(Math.sin(y*1.6+x*.4+phase+offset)+.22*Math.sin(y*3.1-phase+offset*.7));
    q.y+=strength*(Math.sin(x*1.5-y*.3-phase+offset+1.1)+.22*Math.cos(x*3.3+phase+offset*.7));
   }else{const x=q.x*.033,y=q.y*.033;
    q.x+=strength*(Math.sin(x*1.7+y*1.3+a*4)+.28*Math.sin(y*7+b*5));
    q.y+=strength*(Math.cos(x*1.2-y*1.8+b*4)+.28*Math.sin(x*6+d*5));
   }
  }return q;
 });
}
function tracePath(c,points,closed){if(!points.length)return;c.beginPath();c.moveTo(points[0].x,points[0].y);if(points.length===1){c.lineTo(points[0].x+.01,points[0].y+.01);return}if(points.length===2){c.lineTo(points[1].x,points[1].y);return}for(let i=1;i<points.length-1;i++){const next=points[i+1];c.quadraticCurveTo(points[i].x,points[i].y,(points[i].x+next.x)/2,(points[i].y+next.y)/2)}const last=points[points.length-1];c.lineTo(last.x,last.y);if(closed)c.closePath()}
function drawStroke(c,s,points,tint=null){if(!points.length)return;traceStrokePath(c,s,points);if(s.fill&&s.closed){c.fillStyle=tint||s.fill;c.fill(s.bucket?'evenodd':'nonzero')}if(s.size>0){c.strokeStyle=tint||s.color;c.lineWidth=s.size;c.lineCap='round';c.lineJoin='round';c.stroke()}}
// Nondestructive draw-on. Arc-length lookup chooses a curve parameter;
// de Casteljau subdivision preserves the exact shape of the visible prefix.
function strokeSegments(points,closed){
 const segments=[];if(points.length<2)return segments;
 let from=points[0];
 const addLine=to=>{segments.push({a:from,b:to,q:false});from=to};
 if(points.length===2){addLine(points[1]);return segments}
 for(let i=1;i<points.length-1;i++){
  const control=points[i],next=points[i+1],to={x:(control.x+next.x)/2,y:(control.y+next.y)/2,p:((control.p??1)+(next.p??1))/2};
  segments.push({a:from,b:control,c:to,q:true});from=to;
 }
 addLine(points[points.length-1]);if(closed)addLine(points[0]);return segments;
}
function segmentPoint(seg,t){
 if(!seg.q)return{x:lerp(seg.a.x,seg.b.x,t),y:lerp(seg.a.y,seg.b.y,t)};
 const u=1-t;return{x:u*u*seg.a.x+2*u*t*seg.b.x+t*t*seg.c.x,y:u*u*seg.a.y+2*u*t*seg.b.y+t*t*seg.c.y};
}
function measureStroke(s){
 const cached=strokeMetricCache.get(s);
 if(cached&&cached.points===s.points&&cached.count===s.points.length)return cached;
 const segments=strokeSegments(s.points,s.closed);let total=0;
 const lengths=segments.map(seg=>{
  const bound=Math.hypot(seg.b.x-seg.a.x,seg.b.y-seg.a.y)+(seg.q?Math.hypot(seg.c.x-seg.b.x,seg.c.y-seg.b.y):0);
  const steps=seg.q?clamp(Math.ceil(bound/5),8,64):1;
  const lut=[0];let last=seg.a,sum=0;
  for(let i=1;i<=steps;i++){const p=segmentPoint(seg,i/steps);sum+=Math.hypot(p.x-last.x,p.y-last.y);lut.push(sum);last=p}
  total+=sum;return{length:sum,lut,steps};
 });
 const out={points:s.points,count:s.points.length,lengths,total,weight:Math.max(total,s.points.length?Math.max(s.size||1,1):0)};
 strokeMetricCache.set(s,out);return out;
}
function parameterAtLength(metric,distance){
 if(distance<=0)return 0;if(distance>=metric.length)return 1;
 let i=1;while(i<metric.lut.length-1&&metric.lut[i]<distance)i++;
 const lo=metric.lut[i-1],hi=metric.lut[i];
 return(i-1+(distance-lo)/(hi-lo||1))/metric.steps;
}
function drawRevealedStroke(c,s,points,progress,tint=null){
 if(progress<=0||!points.length)return;
 if(progress>=1){drawStroke(c,s,points,tint);return}
 const metric=measureStroke(s);
 if(metric.total<.01||s.size<=0){
  // Dots and fill-only shapes have no useful outline; fade them in instead.
  c.save();c.globalAlpha*=progress;drawStroke(c,s,points,tint);c.restore();return;
 }
 const segments=strokeSegments(points,s.closed);let budget=metric.total*progress;
 c.beginPath();c.moveTo(points[0].x,points[0].y);
 for(let i=0;i<segments.length;i++){
  const seg=segments[i],m=metric.lengths[i];
  if(budget>=m.length){
   if(seg.q)c.quadraticCurveTo(seg.b.x,seg.b.y,seg.c.x,seg.c.y);else c.lineTo(seg.b.x,seg.b.y);
   budget-=m.length;
  }else{
   const t=parameterAtLength(m,budget),end=segmentPoint(seg,t);
   if(seg.q)c.quadraticCurveTo(lerp(seg.a.x,seg.b.x,t),lerp(seg.a.y,seg.b.y,t),end.x,end.y);else c.lineTo(end.x,end.y);
   break;
  }
 }
 // An unfinished contour stays open and unfilled: no diagonal closing chord.
 c.strokeStyle=tint||s.color;c.lineWidth=s.size;c.lineCap='round';c.lineJoin='round';c.stroke();
}
function revealProgress(l,f,celKey){
 const r=l.reveal;if(!r?.enabled)return 1;
 const start=r.restart?Math.max(r.start,celKey):r.start;
 return clamp((f-start)/Math.max(1,r.duration*project.fps),0,1);
}

// Kreska Studio 1.3 source, lines 240–252
function renderCel(c,l,cel,f,mats,opt,celKey){
 const r=l.reveal||defaultReveal();
 const amount=opt.ignoreReveal||opt.rest||opt.tint?1:revealProgress(l,f,celKey);
 if(amount<=0)return;
 if(amount>=1){for(const s of cel.strokes)drawStroke(c,s,evaluatedPoints(s,mats,l.boil,f),opt.tint);return}
 let weights=null,budget=0;
 if(r.order!=='parallel'){weights=cel.strokes.map(s=>measureStroke(s).weight);budget=weights.reduce((sum,w)=>sum+w,0)*amount}
 for(let i=0;i<cel.strokes.length;i++){
  const s=cel.strokes[i],fraction=weights?clamp(budget/Math.max(.001,weights[i]),0,1):amount;
  if(fraction>0)drawRevealedStroke(c,s,evaluatedPoints(s,mats,l.boil,f),fraction,opt.tint);
  if(weights){budget-=weights[i];if(budget<=0)break}
 }
}

// Kreska Studio 1.3 source, lines 254–255
function getImage(src){if(!imageCache.has(src)){const image=new Image();image.onload=()=>{dirty=true};image.onerror=()=>toast('Nie udało się wczytać bitmapy.');image.src=src;imageCache.set(src,image)}return imageCache.get(src)}
function renderLayer(c,l,f,opt={}){if(!l.visible&&!opt.force)return;const t=transformAt(l,f),held=celAt(l,f),cel=opt.cel||held.cel,rest=opt.rest||false,mats=l.rig.bound&&!rest?skinMatrices(l,poseAt(l,f)):null;c.save();c.translate(t.x,t.y);c.rotate(t.r);c.scale(t.sx,t.sy);if(opt.alpha!==undefined)c.globalAlpha*=opt.alpha;if(l.image&&!opt.tint){const image=getImage(l.image.src);if(image.complete&&image.naturalWidth)c.drawImage(image,l.image.x,l.image.y,l.image.width,l.image.height)}if(cel)renderCel(c,l,cel,f,mats,opt,held.key);c.restore()}

// Kreska Studio 1.3 source, lines 441–442
const CAMERA_ID='__kreska_camera__';
const layerCompositeCanvas=document.createElement('canvas');

// Kreska Studio 1.3 source, lines 444–451
function normalizeCamera(raw,w,h){
 const t=a=>({x:clamp(finite(a?.x,w/2),-100000,100000),y:clamp(finite(a?.y,h/2),-100000,100000),r:clamp(finite(a?.r,0),-100000,100000),sx:clamp(Math.abs(finite(a?.sx,1)),.05,20),sy:clamp(Math.abs(finite(a?.sx,1)),.05,20)});
 const cam={id:CAMERA_ID,kind:'camera',name:'Kamera',enabled:raw?.enabled!==false,visible:true,locked:!!raw?.locked,base:t(raw?.base),keys:{},ease:['linear','hold','smooth'].includes(raw?.ease)?raw.ease:'smooth',cels:{},rig:emptyRig(),boil:{...defaultBoil(),enabled:false},reveal:defaultReveal(),image:null,opacity:1,opacityKeys:{},opacityEase:'smooth'};
 for(const[k,v]of Object.entries(raw?.keys||{}).slice(0,10000))if(/^\d+$/.test(k)&&+k<100000)cam.keys[k]=t(v);
 return cam;
}
function ensureCamera(){if(!project.camera)project.camera=normalizeCamera(null,project.width,project.height);return project.camera}
function isCamera(l=active()){return l?.kind==='camera'||l?.id===CAMERA_ID}

// Kreska Studio 1.3 source, lines 453–453
function cameraAt(f=frame){return transformAt(ensureCamera(),f)}

// Kreska Studio 1.3 source, lines 457–457
function applyCamera(c,f){if(!ensureCamera().enabled)return;const t=cameraAt(f);c.translate(project.width/2,project.height/2);c.scale(1/t.sx,1/t.sy);c.rotate(-t.r);c.translate(-t.x,-t.y)}

// Kreska Studio 1.3 source, lines 480–480
function opacityAt(l,f){if(isCamera(l))return 1;const q=bracket(l.opacityKeys||{},f);return clamp(q?lerp(q.a,q.b,eased(q.t,l.opacityEase||'smooth')):finite(l.opacity,1),0,1)}

// Kreska Studio 1.3 source, lines 487–514
function traceStrokePath(c,s,points){
 if(!s.polygon){tracePath(c,points,s.closed);return}
 c.beginPath();if(!points.length)return;c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);if(s.closed)c.closePath();
}
const originalRenderCel=renderCel;
renderCel=function(c,l,cel,f,mats,opt,celKey){
 const fills=cel.strokes.filter(s=>s.bucket),ink=cel.strokes.filter(s=>!s.bucket);
 if(!fills.length){originalRenderCel(c,l,cel,f,mats,opt,celKey);return}
 const amount=opt.ignoreReveal||opt.rest||opt.tint?1:revealProgress(l,f,celKey);
 // Fill patches do not change the timing/order of the original ink strokes.
 if(amount>.88){c.save();c.globalAlpha*=clamp((amount-.88)/.12,0,1);for(const s of fills)drawStroke(c,s,evaluatedPoints(s,mats,l.boil,f),opt.tint);c.restore()}
 originalRenderCel(c,l,{strokes:ink},f,mats,opt,celKey);
};
const originalRenderLayer=renderLayer;
renderLayer=function(c,l,f,opt={}){
 if(isCamera(l)||(!l.visible&&!opt.force))return;
 const a=opt.ignoreOpacity?1:opacityAt(l,f);if(a<=0)return;
 if(a>=.99999){originalRenderLayer(c,l,f,opt);return}
 // Composite the whole layer once: intersections do not become darker during a fade.
 const off=layerCompositeCanvas;if(off.width!==c.canvas.width)off.width=c.canvas.width;if(off.height!==c.canvas.height)off.height=c.canvas.height;
 const oc=off.getContext('2d');oc.setTransform(1,0,0,1,0,0);oc.clearRect(0,0,off.width,off.height);oc.setTransform(c.getTransform());oc.globalAlpha=1;
 originalRenderLayer(oc,l,f,opt);
 c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha*=a;c.drawImage(off,0,0);c.restore();
};
renderScene=function(c,f,opt={}){
 c.save();c.clearRect(0,0,project.width,project.height);c.beginPath();c.rect(0,0,project.width,project.height);c.clip();
 if(!project.transparent||opt.video||opt.preview){c.fillStyle=project.bg;c.fillRect(0,0,project.width,project.height)}
 applyCamera(c,f);for(const l of project.layers)renderLayer(c,l,f);c.restore();
};

// Kreska Studio 1.3 source, lines 880–885
function loopFrame(l,f,type){if(loopBypass||(!playing&&!exportEvaluating&&loopSourceEditingId===l?.id))return f;const q=l?.loop;if(!q?.enabled||!q[type]||f<q.start||isCamera(l))return f;const n=q.end-q.start+1,cycle=Math.max(1,Math.round(q.period*project.fps));let t=((f-q.start)%cycle+cycle)%cycle/cycle;if(q.mode==='pingpong')t=1-Math.abs(2*t-1);return q.start+Math.min(n-1,t*n)}
const transformAt12=transformAt,celAt12=celAt,poseAt12=poseAt,opacityAt12=opacityAt;
transformAt=function(l,f){return transformAt12(l,loopFrame(l,f,'transform'))};
celAt=function(l,f){return celAt12(l,Math.floor(loopFrame(l,f,'cels')+1e-7))};
poseAt=function(l,f){return poseAt12(l,loopFrame(l,f,'pose'))};
opacityAt=function(l,f){return opacityAt12(l,loopFrame(l,f,'opacity'))};

// Kreska Studio 1.3 source, lines 897–902
function pressureValue(s,p){return s.size*(clamp(finite(s.pressureMin,.12),0,1)+(1-clamp(finite(s.pressureMin,.12),0,1))*Math.pow(clamp(finite(p,1),0,1),clamp(finite(s.pressureGamma,.8),.2,3)))}
function pressureSamples(s,points,progress=1){if(points.length<2)return points;const segs=strokeSegments(points,s.closed),metrics=measureStroke(s);let budget=metrics.total*progress;const out=[{...points[0],p:points[0].p??1}];for(let i=0;i<segs.length;i++){const a=segs[i],m=metrics.lengths[i];if(budget<=0)break;const end=budget>=m.length?1:parameterAtLength(m,budget),steps=Math.max(1,Math.ceil(m.length*end/1.5));for(let j=1;j<=steps;j++){const t=end*j/steps,u=1-t,p=segmentPoint(a,t);p.p=a.q?u*u*(a.a.p??1)+2*u*t*(a.b.p??1)+t*t*(a.c.p??1):lerp(a.a.p??1,a.b.p??1,t);out.push(p)}budget-=m.length}return out}
function drawPressureInk(c,s,points,tint,progress=1){const ps=pressureSamples(s,points,progress);if(!ps.length)return;c.beginPath();for(let i=0;i<ps.length;i++){const p=ps[i],r=pressureValue(s,p.p)/2;if(r<.005)continue;c.moveTo(p.x+r,p.y);c.arc(p.x,p.y,r,0,TAU);if(i){const a=ps[i-1],ra=pressureValue(s,a.p)/2,dx=p.x-a.x,dy=p.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;c.moveTo(a.x+nx*ra,a.y+ny*ra);c.lineTo(a.x-nx*ra,a.y-ny*ra);c.lineTo(p.x-nx*r,p.y-ny*r);c.lineTo(p.x+nx*r,p.y+ny*r);c.closePath()}}c.fillStyle=tint||s.color;c.fill()}
const drawStroke12=drawStroke,drawRevealedStroke12=drawRevealedStroke;
drawStroke=function(c,s,points,tint=null){if(!s.pressure||s.pixel||s.size<=0){drawStroke12(c,s,points,tint);return}if(s.closed&&s.fill){traceStrokePath(c,s,points);c.fillStyle=tint||s.fill;c.fill()}drawPressureInk(c,s,points,tint)};
drawRevealedStroke=function(c,s,points,progress,tint=null){if(s.pressure&&s.size>0&&progress>0&&progress<1){drawPressureInk(c,s,points,tint,progress);return}drawRevealedStroke12(c,s,points,progress,tint)};


// Crop only the unused stage margins; preserve the authored stroke coordinates.
const crop = {x: 0, y: 150, width: 960, height: 244};
let lastFrame = -1, animation = 0, elapsed = 0, lastTime = null;
let onScreen = true;
const heading = canvas.closest('h1');
function drawFrame(f) {
  frame = f;
  const scale = canvas.width / crop.width;
  context.setTransform(scale, 0, 0, scale, -crop.x * scale, -crop.y * scale);
  // Keep the completed drawing, while boil still receives the advancing frame.
  renderScene(context, frame);
  lastFrame = frame;
  canvas.dataset.frame = String(frame);
}
function resize() {
  if (!project) return;
  const cssWidth = canvas.getBoundingClientRect().width || crop.width;
  const scale = Math.min(2, window.devicePixelRatio || 1) * cssWidth / crop.width;
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  drawFrame(Math.max(0, lastFrame));
}
function tick(now) {
  animation = 0;
  if (lastTime !== null) elapsed += Math.max(0, now - lastTime);
  lastTime = now;
  const next = Math.floor(elapsed * project.fps / 1000);
  if (next !== lastFrame) drawFrame(next);
  animation = requestAnimationFrame(tick);
}
function syncPlayback() {
  cancelAnimationFrame(animation);
  animation = 0;
  lastTime = null;
  if (project && !document.hidden && onScreen) animation = requestAnimationFrame(tick);
}
async function loadHeader() {
  try {
    const response = await fetch('kacperks_for_websiteloop.kreska.project.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const book = await response.json();
    project = book.scenes ? book.scenes[0] : book;
    if (!project || !Array.isArray(project.layers) || !Number.isFinite(project.fps)) throw new Error('Invalid Kreska scene');
    // The paper color is an editor setting, not part of the header artwork.
    project.transparent = true;
    canvas.hidden = false;
    heading.classList.add('animation-ready');
    resize();
    syncPlayback();
  } catch (error) {
    console.error('Could not load the Kreska header:', error);
    canvas.hidden = true;
    heading.classList.remove('animation-ready');
  }
}
document.addEventListener('visibilitychange', syncPlayback);
window.addEventListener('resize', resize);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    onScreen = entries[0].isIntersecting;
    syncPlayback();
  }).observe(canvas);
}
loadHeader();
})();
