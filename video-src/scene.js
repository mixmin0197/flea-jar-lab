
const W=1920,H=1080,FPS=30,TOTAL=197;
const cv=(typeof document!=='undefined')?document.getElementById('cv'):new OffscreenCanvas(1920,1080),ctx=cv.getContext('2d');
const C={bg:'#10171A',panel:'#18232A',line:'#2C3A40',ink:'#E6ECEE',muted:'#8FA2A9',amber:'#EE9F45',danger:'#EC6A5F',food:'#7DBB55',mesh:'#93A6AE',glass:'rgba(130,180,200,0.10)',
  eat:'#6FAE47',rest:'#5D7883',j1:'#E6B656',j2:'#DD8A35',j3:'#C05A2C'};
const ACTC=[C.eat,C.rest,C.j1,C.j2,C.j3],ACTN_ZH=['吃','休息','轻跳','中跳','全力跳'],ACTN_EN=['Eat','Rest','Light','Medium','Full'];let ACTN=ACTN_ZH;
const FONT_ZH='"PingFang SC","Hiragino Sans GB","Heiti SC",sans-serif',FONT_EN='"Avenir Next","Helvetica Neue",Helvetica,Arial,sans-serif',MONO='"SF Mono",Menlo,monospace';
let FONT=FONT_ZH,LANG='zh';const tl=(zh,en)=>LANG==='en'?en:zh;
function setLang(l){LANG=l;FONT=l==='en'?FONT_EN:FONT_ZH;ACTN=l==='en'?ACTN_EN:ACTN_ZH;}
const NM_EN={'最优策略':'Optimal','永远不跳':'Never jump','吃光再跳':'Eat all, then jump','一上来就全力跳':'Full jump at once','定时开 1 天 · 第一天就开':'Scheduled, 1 day · day 0','定时开 1 天 · 尽量晚':'Scheduled, 1 day · late','随机开 · 看得见':'Random · visible','随机开 · 看不见':'Random · hidden','成团开 3 天 · 看得见':'Bursts of 3 · visible','成团开 3 天 · 看不见':'Bursts of 3 · hidden','定时开 3 天 · 尽量晚':'Scheduled, 3 days · late','定时开 6 天 · 尽量晚':'Scheduled, 6 days · late','永远关着（参照）':'Always closed (reference)'};
const nm=x=>tl(x,NM_EN[x]||x);
let D=null;

// ---------- helpers ----------
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const fadeIO=(t,t0,t1,f=0.5)=>ease((t-t0)/f)*ease((t1-t)/f);
function font(size,weight=400,fam=FONT){ctx.font=`${weight} ${size}px ${fam}`;}
function txt(s,x,y,size,color,align='center',weight=400,alpha=1,fam=FONT){
  if(alpha<=0)return;ctx.save();ctx.globalAlpha*=alpha;font(size,weight,fam);{const w=ctx.measureText(s).width;if(w>1800){size=size*1800/w;font(size,weight,fam);}}ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);ctx.restore();}
function wrap(s,maxW,size,weight=400){font(size,weight);const lines=[];
  for(const para of s.split('\n')){let cur='';const toks=LANG==='en'?para.split(/(?<= )/):[...para];for(const ch of toks){if(ctx.measureText((cur+ch).trimEnd()).width>maxW&&cur){lines.push(cur.trimEnd());cur=ch;}else cur+=ch;}lines.push(cur.trimEnd());}return lines;}
function para(s,x,y,maxW,size,color,align='left',weight=400,alpha=1,lh=1.55){
  const ls=wrap(s,maxW,size,weight);ls.forEach((l,i)=>txt(l,x,y+i*size*lh,size,color,align,weight,alpha));return ls.length*size*lh;}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function panel(x,y,w,h,alpha=1,stroke=C.line){ctx.save();ctx.globalAlpha*=alpha;rrect(x,y,w,h,18);ctx.fillStyle=C.panel;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();ctx.restore();}
function flea(x,y,s=1,dead=false,alpha=1){
  ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(s,dead?-s:s);
  ctx.strokeStyle=dead?C.muted:C.ink;ctx.lineWidth=2.2;ctx.lineCap='round';
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*6,4);ctx.lineTo(i*8-4,15);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(8,4);ctx.lineTo(19,-5);ctx.lineTo(23,13);ctx.stroke();
  ctx.fillStyle=dead?C.muted:C.amber;ctx.beginPath();ctx.ellipse(0,0,14,10,-0.25,0,7);ctx.fill();
  ctx.fillStyle=C.bg;ctx.beginPath();ctx.arc(-11,-3,3,0,7);ctx.fill();
  ctx.restore();}
function jar(cx,base,w,h,o={}){
  const x=cx-w/2,top=base-h;
  ctx.save();ctx.globalAlpha*=(o.alpha??1);
  rrect(x,top,w,h,[6,6,34,34]);ctx.fillStyle=C.glass;ctx.fill();ctx.strokeStyle=C.mesh;ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle=C.mesh;ctx.fillRect(x-14,top-10,w+28,12);
  // shine
  ctx.strokeStyle='rgba(255,255,255,0.10)';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(x+30,top+40);ctx.lineTo(x+30,base-60);ctx.stroke();
  if(o.food){ctx.fillStyle=C.food;for(let i=0;i<o.food;i++){const fx=cx+w/2-50-((i*37)%110),fy=base-10-Math.floor(i/6)*9;ctx.beginPath();ctx.arc(fx,fy,6,0,7);ctx.fill();}}
  if(o.net!==undefined&&o.net>0){ // crosshatch net
    ctx.save();ctx.globalAlpha*=o.net;ctx.beginPath();ctx.rect(x-14,top-44,w+28,32);ctx.clip();
    ctx.strokeStyle=o.netColor||C.mesh;ctx.lineWidth=1.6;
    for(let k=x-60;k<x+w+60;k+=14){ctx.beginPath();ctx.moveTo(k,top-44);ctx.lineTo(k+32,top-12);ctx.stroke();ctx.beginPath();ctx.moveTo(k+32,top-44);ctx.lineTo(k,top-12);ctx.stroke();}
    ctx.restore();ctx.strokeStyle=o.netColor||C.mesh;ctx.lineWidth=2;ctx.globalAlpha=(o.alpha??1)*o.net;ctx.strokeRect(x-14,top-44,w+28,32);}
  if(o.ghost){ctx.globalAlpha=(o.alpha??1)*o.ghost;ctx.setLineDash([10,8]);ctx.strokeStyle=C.food;ctx.lineWidth=2;ctx.strokeRect(x-14,top-44,w+28,32);ctx.setLineDash([]);}
  ctx.restore();return top;}
function chapter(t,t0,t1,num,name){const a=fadeIO(t,t0,t1,0.6);txt(num,120,100,34,C.amber,'left',700,a,MONO);txt(name,190,100,32,C.muted,'left',500,a);}
function caption(t,t0,t1,s){const a=fadeIO(t,t0,t1,0.45);if(a<=0)return;
  let cs=46;font(cs,500);while(ctx.measureText(s).width>1720&&cs>30){cs-=2;font(cs,500);}const w=Math.min(1820,ctx.measureText(s).width+80);
  ctx.save();ctx.globalAlpha=a*0.75;rrect(W/2-w/2,955,w,84,42);ctx.fillStyle='rgba(8,12,14,0.85)';ctx.fill();ctx.restore();
  txt(s,W/2,998,cs,C.ink,'center',500,a);}
function bars(items,lt,x,y,w,rowH,maxV,{fmt=v=>v,colorOf=()=>C.mesh,start=0,stagger=0.25,labelW=520,alphaOf=()=>1}={}){
  items.forEach((it,i)=>{const p=ease((lt-start-i*stagger)/0.9),a=ease((lt-start-i*stagger)/0.4)*alphaOf(it,i);if(a<=0)return;
    const yy=y+i*rowH;txt(it.n,x,yy+rowH*0.38,34,C.ink,'left',500,a);
    ctx.save();ctx.globalAlpha=a;rrect(x+labelW,yy+rowH*0.18,w-labelW-170,rowH*0.42,8);ctx.fillStyle='#202C33';ctx.fill();
    const bw=(w-labelW-170)*clamp(it.v/maxV)*p;if(bw>1){rrect(x+labelW,yy+rowH*0.18,bw,rowH*0.42,8);ctx.fillStyle=colorOf(it,i);ctx.fill();}ctx.restore();
    txt(fmt(it.v*p),x+w,yy+rowH*0.39,36,colorOf(it,i)===C.mesh?C.ink:colorOf(it,i),'right',700,a,MONO);});}
function axes(x,y,w,h,{yTicks=[],yFmt=v=>v,xTicks=[],xFmt=v=>v,X,Y,alpha=1,xLabel='',y2Ticks=null,Y2=null,y2Fmt=null}){
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=C.line;ctx.lineWidth=1.5;
  yTicks.forEach(v=>{ctx.beginPath();ctx.moveTo(x,Y(v));ctx.lineTo(x+w,Y(v));ctx.stroke();txt(yFmt(v),x-16,Y(v),26,C.muted,'right',400,1,MONO);});
  if(y2Ticks)y2Ticks.forEach(v=>txt(y2Fmt(v),x+w+16,Y2(v),26,C.danger,'left',400,1,MONO));
  xTicks.forEach(v=>txt(xFmt(v),X(v),y+h+32,26,C.muted,'center',400,1,MONO));
  if(xLabel)txt(xLabel,x+w/2,y+h+78,30,C.muted,'center',400,1);
  ctx.restore();}
function line(pts,X,Y,color,width,p=1,dash=null){
  const n=Math.max(2,Math.ceil(pts.length*clamp(p)));ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';if(dash)ctx.setLineDash(dash);
  ctx.beginPath();pts.slice(0,n).forEach((q,i)=>i?ctx.lineTo(X(q[0]),Y(q[1])):ctx.moveTo(X(q[0]),Y(q[1])));ctx.stroke();ctx.restore();}
function bolt(x,y,s,color){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(4,-26);ctx.lineTo(-10,4);ctx.lineTo(0,4);ctx.lineTo(-4,26);ctx.lineTo(12,-6);ctx.lineTo(2,-6);ctx.closePath();ctx.fill();ctx.restore();}
function dog(x,y,s,pose='stand',color=C.ink){ // simple silhouette
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineWidth=6;
  if(pose==='lie'){ctx.beginPath();ctx.ellipse(0,10,40,13,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(-44,8,15,12,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(-50,0);ctx.lineTo(-58,18);ctx.lineTo(-44,8);ctx.fill();ctx.beginPath();ctx.moveTo(38,10);ctx.lineTo(56,16);ctx.stroke();}
  else{ctx.beginPath();ctx.ellipse(0,0,36,15,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(-40,-18,14,12,0,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(-46,-26);ctx.lineTo(-54,-8);ctx.lineTo(-40,-16);ctx.fill();
    for(const lx of [-24,-12,14,26]){ctx.beginPath();ctx.moveTo(lx,8);ctx.lineTo(lx,34);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(34,-4);ctx.lineTo(52,-20);ctx.stroke();}
  ctx.restore();}

// ---------- scenes ----------
function sTitle(t){
  const a=fadeIO(t,0,7,1.2);
  if(LANG==='en'){font(150,800);const w1=ctx.measureText('Flea ').width,w2=ctx.measureText('Jailbreak').width,x0=W/2-(w1+w2)/2;txt('Flea ',x0,430,150,C.ink,'left',800,a);txt('Jailbreak',x0+w1,430,150,C.amber,'left',800,a);}
  else{txt('跳蚤',W/2-150,430,170,C.ink,'center',800,a);txt('越狱',W/2+170,430,170,C.amber,'center',800,a);}
  txt(tl('一个寓言、一个心理学实验，和一个可以计算的决策模型','A fable, a psychology experiment, and a decision model you can compute'),W/2,590,46,C.muted,'center',400,fadeIO(t,1.2,7,1));
  const x=lerp(260,1660,clamp(t/7)),ph=(t%0.6)/0.6;flea(x,800-70*4*ph*(1-ph),1.6,false,a);
  ctx.save();ctx.globalAlpha=a*0.5;ctx.strokeStyle=C.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(200,816);ctx.lineTo(1720,816);ctx.stroke();ctx.restore();
}
// flea + lid motion for the fable: the lid only slides in after the flea has landed,
// and the flea waits on the floor until the lid is fully closed
const PER=1.05,LID_IN=6*PER,LID_DONE=7*PER;
function fableFlea(lt,cap){
  let lidX=null;
  if(lt>=LID_IN&&lt<22.5)lidX=lerp(760,0,ease((lt-LID_IN)/0.9));
  else if(lt>=22.5&&lt<24)lidX=lerp(0,-900,ease((lt-22.5)/1.2));
  let Hj=640;if(lt>=14.5)Hj=lerp(640,380,ease((lt-14.5)/5));
  const ph=(lt%PER)/PER;let hgt=Hj*4*ph*(1-ph),hit=false;
  if(lt>=LID_IN&&lt<LID_DONE)hgt=18*4*ph*(1-ph); // small nervous hops while the lid closes
  if(lidX!==null&&Math.abs(lidX)<5&&hgt>cap){hgt=cap;hit=true;}
  return {hgt,lidX,hit};
}
function sFable(t){ // 7–40
  const lt=t-7,base=860,top=jar(960,base,380,420,{alpha:1-0.6*ease((lt-29)/0.8)*(1-ease((lt-32.6)/0.4))});
  const floorY=base-12,lidY=top-24,cap=floorY-lidY-14;
  const {hgt,lidX,hit}=fableFlea(lt,cap);
  const fa=1-0.6*ease((lt-29)/0.8);
  flea(960,floorY-hgt,1.7,false,fa);
  if(lidX!==null){ctx.save();ctx.globalAlpha=fa;ctx.fillStyle=hit?C.danger:'#B7C7CE';rrect(960-215+lidX,lidY-10,430,20,8);ctx.fill();ctx.restore();
    if(hit){ctx.save();ctx.globalAlpha=fa;ctx.strokeStyle=C.danger;ctx.lineWidth=4;for(const dx of [-40,0,40]){ctx.beginPath();ctx.moveTo(960+dx,lidY+16);ctx.lineTo(960+dx*1.6,lidY+44);ctx.stroke();}ctx.restore();}}
  if(lt>22.5&&lt<29){ctx.save();ctx.globalAlpha=0.6*fadeIO(lt,24,29);ctx.setLineDash([12,10]);ctx.strokeStyle=C.amber;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(700,floorY-380-14);ctx.lineTo(1220,floorY-380-14);ctx.stroke();ctx.restore();
    txt(tl('它给自己定的“天花板”','its self-imposed ceiling'),1240,floorY-394,30,C.amber,'left',500,fadeIO(lt,24.5,29));}
  caption(lt,0.3,6,tl('跳蚤是跳高能手，轻松就能跳出罐子','Fleas are champion jumpers: getting out of a jar is easy'));
  caption(lt,6.5,14.5,tl('盖上盖子，每一跳都撞在盖子上','With a lid on, every jump hits the lid'));
  caption(lt,14.5,22.3,tl('撞多了，它把跳的高度降到了盖子下面','After enough hits, it lowers its jumps to just below the lid'));
  caption(lt,22.6,29,tl('盖子拿走了，它还是只跳这么高，再也没有出去','The lid is gone, but it still jumps this high and never gets out'));
  const ca=fadeIO(lt,29.2,33,0.6);if(ca>0){panel(300,340,1320,380,ca,C.amber);txt(tl('先说清楚','A note first'),960,420,52,C.amber,'center',700,ca);
    para(tl('这个故事流传很广，但找不到可靠的原始实验记录，更像一则寓言。\n真正研究“习得性无助”的，是另一组实验。','This story is widely told, but there is no reliable record of the original experiment. It is more of a fable.\nThe real research on “learned helplessness” is a different experiment.'),960,520,tl(1240,1280),tl(40,34),C.ink,'center',400,ca);}
}
function sSeligman(t){ // 40–68
  const lt=t-40;
  txt(tl('Seligman 与 Maier，1967','Seligman & Maier, 1967'),W/2,190,54,C.ink,'center',700,fadeIO(lt,0.2,20,0.6));
  const G=[{n:tl('组 1 · 能控制','Group 1 · Control'),d:tl('按下面板，电击就停','Pressing a panel\nstops the shock'),c:C.food,mark:'✓'},{n:tl('组 2 · 不能控制','Group 2 · No control'),d:tl('和组 1 同时挨电，\n怎么做都停不了','Same shocks as group 1,\nbut nothing stops them'),c:C.danger,mark:'✗'},{n:tl('组 3 · 对照','Group 3 · No shock'),d:tl('不挨电','No shocks'),c:C.mesh,mark:''}];
  const pa=fadeIO(lt,0.4,20,0.6);
  G.forEach((g,i)=>{const cx=480+i*480,a=pa*ease((lt-0.5-i*0.6)/0.6);if(a<=0)return;
    panel(cx-210,280,420,520,a);txt(g.n,cx,340,tl(40,34),g.c,'center',700,a);
    if(lt<12.3){ // stage 1
      para(g.d,cx,410,360,tl(32,27),C.muted,'center',400,a);
      ctx.save();ctx.globalAlpha=a;dog(cx,640,1.6,'stand',C.ink);ctx.restore();
      if(i<2){const fl=0.5+0.5*Math.sin(lt*9+i);ctx.save();ctx.globalAlpha=a*fl;bolt(cx-110,560,1.6,C.amber);bolt(cx+110,560,1.6,C.amber);ctx.restore();}
      if(g.mark)txt(g.mark,cx,740,56,g.c,'center',700,a);
    }else{ // stage 2: shuttle box
      const b=ease((lt-12.3)/0.6)*a;ctx.save();ctx.globalAlpha=b;ctx.strokeStyle=C.mesh;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-180,700);ctx.lineTo(cx+180,700);ctx.stroke();
      ctx.fillStyle=C.mesh;ctx.fillRect(cx-6,640,12,60);ctx.restore();
      const jumpT=i===0?14:i===2?14.6:99,k=ease((lt-jumpT)/1.2),dx=lerp(-95,95,k),dy=-90*4*k*(1-k);
      ctx.save();ctx.globalAlpha=b;dog(cx+dx,i===1&&lt>14.2?672:655+dy,1.1,i===1&&lt>14.2?'lie':'stand',C.ink);ctx.restore();
      const res=i===1?tl('多数趴着忍受','Most lie down'):tl('学会跳过矮栏','Learn to jump it');txt(res,cx,770,34,i===1?C.danger:C.food,'center',700,b*ease((lt-15.5)/0.6));
      txt(tl('电击时跨过矮栏就能躲开','Jump the barrier to escape'),cx,420,tl(30,28),C.muted,'center',400,b);
    }});
  caption(lt,0.6,12.2,tl('第一阶段：两组狗挨同样的电击，只有一组能自己让它停下','Stage 1: two groups get the same shocks; only one can stop them'));
  caption(lt,12.5,20,tl('第二阶段：换到能躲开的箱子，不能控制的那组多数不再尝试','Stage 2: where escape is possible, most of the no-control group stop trying'));
  const ra=fadeIO(lt,20.3,28,0.7);
  if(ra>0){txt('1967',600,300,64,C.muted,'center',700,ra,MONO);txt('→',960,300,64,C.muted,'center',400,ra);txt('2016',1320,300,64,C.amber,'center',700,ra,MONO);
    para(tl('50 年后，Maier 和 Seligman 根据神经科学证据修正了解释：','50 years later, Maier and Seligman revised the explanation, based on neuroscience:'),960,420,tl(1300,1700),40,C.muted,'center',400,ra);
    para(tl('被动不是学来的，是长期痛苦下的默认反应；\n真正需要学会的，是“我能控制”。','Passivity is not learned; it is the default response to prolonged pain.\nWhat has to be learned is “I have control.”'),960,540,tl(1400,1760),tl(56,50),C.ink,'center',700,ra);}
}
function sModel(t){ // 68–105
  const lt=t-68;
  const a1=fadeIO(lt,0,10,0.6);
  if(a1>0){ctx.save();ctx.globalAlpha=a1;const top=jar(560,860,360,420,{food:8,net:1});const ph=(lt%1.4)/1.4;flea(540,848-90*4*ph*(1-ph)*(ph<0.5?1:1),1.6);ctx.restore();
    const S=[[tl('能量','Energy'),8,20,C.amber],[tl('健康','Health'),10,10,C.danger],[tl('罐内食物','Food in jar'),12,40,C.food]];
    S.forEach(([n,v,m,c],i)=>{const a=a1*ease((lt-0.5-i*0.4)/0.5),y=300+i*92;txt(n,1000,y,36,C.ink,'left',500,a);ctx.save();ctx.globalAlpha=a;rrect(1220,y-12,420,24,12);ctx.fillStyle='#202C33';ctx.fill();rrect(1220,y-12,420*v/m,24,12);ctx.fillStyle=c;ctx.fill();ctx.restore();txt(String(v),1680,y,34,c,'left',700,a,MONO);});
    ACTN.forEach((n,i)=>{const a=a1*ease((lt-2-i*0.25)/0.4),x=1000+i*150;ctx.save();ctx.globalAlpha=a;rrect(x,560,132,60,30);ctx.fillStyle=ACTC[i];ctx.fill();ctx.restore();txt(n,x+66,590,30,'#fff','center',700,a);});
    (LANG==='en'?['Pass rate = 1 − density^(0.8 × strength)','A hit costs health and makes every later day riskier','Outside: unlimited food, but outside risk']:['穿网率 = 1 − 网密度^(0.8 × 力度)','撞网：扣血，以后每天更容易死','罐外：食物无限，但有外部风险']).forEach((s,i)=>txt(s,1000,690+i*62,34,C.muted,'left',400,a1*ease((lt-4-i*0.8)/0.5)));
    caption(lt,0.3,9.8,tl('每天，跳蚤根据能量、健康和剩余食物，选一个动作','Each day, the flea picks an action based on its energy, health and the food left'));}
  const a2=fadeIO(lt,10.2,19,0.6);
  if(a2>0){txt(tl('一个处境的价值','The value of a situation'),W/2,300,40,C.muted,'center',400,a2);
    txt(tl('V(今天) = 1 天 + 活过今天的概率 × V(明天)','V(today) = 1 day + P(survive today) × V(tomorrow)'),W/2,420,68,C.ink,'center',700,a2);
    txt(tl('每个动作都算一遍，取最大的那个','Try every action and keep the best one'),W/2,560,42,C.amber,'center',500,a2*ease((lt-12)/0.6));
    txt(tl('从最简单的处境开始倒推，得到每个处境的精确最优解（动态规划）','Working back from the simplest situations gives the exact optimum for every one (dynamic programming)'),W/2,650,36,C.muted,'center',400,a2*ease((lt-13.5)/0.6));}
  const a3=fadeIO(lt,19.2,29,0.6);
  if(a3>0){const M=D.map,cols=M[0].length,cw=56,ch=33,x0=330,y0=190;
    for(let e=1;e<=20;e++)for(let f=0;f<cols;f++){const rv=ease((lt-19.4-f*0.22)/0.5)*a3;if(rv<=0)continue;ctx.save();ctx.globalAlpha=rv;ctx.fillStyle=ACTC[M[e-1][f]];ctx.fillRect(x0+f*cw,y0+(20-e)*ch,cw-3,ch-3);ctx.restore();}
    for(const e of [5,10,15,20])txt(String(e),x0-18,y0+(20-e)*ch+ch/2,24,C.muted,'right',400,a3,MONO);
    for(const f of [0,4,8,12])txt(String(f),x0+f*cw+cw/2,y0+20*ch+26,24,C.muted,'center',400,a3,MONO);
    txt(tl('罐内剩余食物','Food left in jar'),x0+cols*cw/2,y0+20*ch+66,28,C.muted,'center',400,a3);txt(tl('能量','Energy'),x0-tl(70,120),y0+10*ch,28,C.muted,'center',400,a3);
    let thr=null;for(let e=1;e<=20;e++)if(M[e-1][cols-1]>=2){thr=e;break;}
    const ax=x0+cols*cw+30,la=a3*ease((lt-23.5)/0.6);
    ACTN.forEach((n,i)=>{ctx.save();ctx.globalAlpha=la;ctx.fillStyle=ACTC[i];ctx.fillRect(ax+40,230+i*56,30,30);ctx.restore();txt(n,ax+86,245+i*56,30,C.ink,'left',400,la);});
    para(tl(`满血时：能量攒到 ${thr} 就全力跳\n能量不够，先吃饭`,`At full health: build up ${thr} energy,\nthen jump at full strength.\nShort on energy: eat first.`),ax+40,600,760,40,C.amber,'left',700,a3*ease((lt-24.5)/0.6));
    caption(lt,19.5,29,tl('策略地图：每个格子是一种处境，颜色是那一刻的最优动作','Strategy map: each cell is a situation, colored by the best action'));}
  const a4=fadeIO(lt,29.2,37,0.6);
  if(a4>0){txt(tl('预期寿命（天）','Expected lifespan (days)'),W/2,250,40,C.muted,'center',400,a4);
    const it=D.cmp.map(c=>({n:nm(c.n),v:c.v}));
    ctx.save();ctx.globalAlpha=a4;bars(it,lt,300,340,1320,110,80,{fmt:v=>v.toFixed(1),colorOf:(x,i)=>i===0?C.amber:i===1?C.danger:C.mesh,start:29.4,stagger:0.3,labelW:380});ctx.restore();
    caption(lt,29.6,37,tl('方向选对最重要：一辈子不跳，只能活一半','Getting the direction right matters most: never jumping halves the lifespan'));}
}
function sJail(t){ // 105–128
  const lt=t-105;
  const a1=fadeIO(lt,0,6,0.6);
  if(a1>0){txt(tl('如果网会变','What if the net changes?'),W/2,280,64,C.ink,'center',700,a1);
    (LANG==='en'?['The net must open regularly (feeding, cleaning): 10% of days on average','The jailer decides when, for how long, and whether the flea can see it','The flea knows the pattern and plays for the best escape odds']:['网要定期打开（喂食、清洁），平均 10% 的天数开着','看守者决定：什么时候开、一次开多久、让不让跳蚤看见','跳蚤知道规律，用“逃出概率最高”的策略应对']).forEach((s,i)=>txt(s,W/2,420+i*90,42,i===2?C.amber:C.muted,'center',400,a1*ease((lt-0.6-i*0.8)/0.5)));}
  const a2=fadeIO(lt,6.2,23,0.6);
  if(a2>0){txt(tl('跳蚤最高逃出率','The flea’s best escape odds'),W/2,150,38,C.muted,'center',400,a2*fadeIO(lt,6.2,19,0.6));
    const it=D.jail.map(j=>({n:nm(j.n),v:j.x}));
    ctx.save();ctx.globalAlpha=a2*(1-0.75*ease((lt-19)/0.6));
    bars(it,lt,220,200,1480,80,1,{fmt:v=>(v*100).toFixed(1)+'%',colorOf:(x,i)=>i===7?C.amber:C.mesh,alphaOf:(x,i)=>i===8?0.55:1,start:6.4,stagger:0.18,labelW:560});ctx.restore();
    caption(lt,6.6,18.8,tl('同样的开网时间：跳蚤最高逃出率从 98% 到 63%','Same open time, yet the flea’s best escape odds range from 98% down to 63%'));
    const la=fadeIO(lt,19.2,23,0.5);
    if(la>0){panel(260,330,1400,360,la,C.amber);txt(tl('开得集中、开得晚：跳蚤等不起，和永远不开一样','Open in one block, and late: the flea can’t wait that long'),W/2,440,tl(44,40),C.ink,'center',700,la);txt(tl('让跳蚤看不见网开没开：它就没法挑时机','Hide whether it is open: the flea can’t pick its moment'),W/2,560,tl(44,40),C.ink,'center',700,la*ease((lt-20.2)/0.5));}}
}
function sLearn(t){ // 128–165
  const lt=t-128;
  const a1=fadeIO(lt,0,7,0.6);
  if(a1>0){txt(tl('升级版：会学习的跳蚤','Upgrade: a flea that learns'),W/2,300,64,C.ink,'center',700,a1);
    txt(tl('它不知道网有多密，只能从撞网的经历里学（贝叶斯更新）','It doesn’t know the net’s density; it learns from its own hits (Bayesian updating)'),W/2,450,42,C.muted,'center',400,a1*ease((lt-0.8)/0.5));
    txt(tl('第 8 天，网被悄悄拿走，跳蚤看不出来','On day 8 the net is quietly removed, and the flea can’t tell'),W/2,540,46,C.amber,'center',700,a1*ease((lt-2)/0.5));}
  const a2=fadeIO(lt,7.2,18,0.6);
  if(a2>0){const x=360,y=200,w=1200,h=560,X=k=>x+k/24*w,Y=p=>y+h-p*h;
    ctx.save();ctx.globalAlpha=a2*0.18;ctx.fillStyle=C.amber;ctx.fillRect(x,y,X(D.kStar)-x,h);ctx.restore();
    axes(x,y,w,h,{yTicks:[0,0.25,0.5,0.75,1],yFmt:v=>Math.round(v*100)+'%',xTicks:[0,5,10,15,20],X,Y,alpha:a2,xLabel:tl('累计撞网力度（全力跳一次记 3）','Accumulated hit strength (a full jump counts 3)')});
    txt(tl('A 估计的全力跳穿网率','A’s estimated full-jump pass rate'),x,y-40,32,C.muted,'left',400,a2);
    line(D.belief.map(b=>[b.k,b.p]),X,Y,C.amber,6,ease((lt-7.6)/3)*a2);
    const ka=a2*ease((lt-11)/0.6),pk=D.belief[D.kStar].p;
    if(ka>0){ctx.save();ctx.globalAlpha=ka;ctx.setLineDash([10,8]);ctx.strokeStyle=C.danger;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X(D.kStar),y);ctx.lineTo(X(D.kStar),y+h);ctx.stroke();ctx.restore();
      txt(tl(`在这里放弃：估计穿网率 ${Math.round(pk*100)}%`,`Gives up here: estimated pass rate ${Math.round(pk*100)}%`),X(D.kStar)+24,Y(pk)-60,34,C.danger,'left',700,ka);}
    caption(lt,7.6,18,tl('A 每撞一次，就更相信网很密；撞了约 2 次全力跳，它不再跳了','Each hit makes A believe the net is denser; after about 2 full jumps, it stops'));}
  const a3=fadeIO(lt,18.2,25,0.6);
  if(a3>0){ctx.save();ctx.globalAlpha=a3;const netA=1-ease((lt-19.5)/1);const food=Math.max(3,12-Math.floor((lt-18)*1.2));
    const top=jar(960,860,380,420,{food,net:netA,ghost:1-netA});ctx.restore();
    txt(tl('网被拿走了','Net removed'),960,top-80,34,C.food,'center',700,a3*ease((lt-20)/0.6));
    const ph=lt%2;flea(lerp(900,1010,0.5+0.5*Math.sin(lt*0.8)),848,1.7,false,a3);
    if(ph>1.2){txt('z',1000,780-(ph-1.2)*60,36,C.muted,'center',700,a3*(2-ph)/0.8,MONO);}
    const ba=a3*ease((lt-21)/0.6);if(ba>0){panel(1240,420,560,190,ba);para(tl('“穿网率大概 47%……\n再撞一次太伤，先吃存粮吧。”','“Maybe a 47% chance…\nanother hit costs too much.\nEat the stock first.”'),1270,475,520,32,C.ink,'left',400,ba);}
    caption(lt,18.5,25,tl('网已经没了，可它不再跳，所以永远不会知道','The net is gone, but it no longer jumps, so it will never find out'));}
  const a4=fadeIO(lt,25.2,37,0.6);
  if(a4>0){txt(tl('网没了以后，仍困死在罐里的比例','Still trapped after the net is gone'),W/2,190,40,C.muted,'center',400,a4);
    const N=LANG==='en'?{A:'A · “Net never changes”',B:'B · “Net may be removed”',C:'C · Probes now and then',D:'D · Quits after 2 hits',E:'E · All-knowing (ref.)'}:{A:'A · 认为网永远不会变',B:'B · 认为网可能被拿走',C:'C · 偶尔试探一下',D:'D · 撞 2 次就放弃',E:'E · 全知（参照）'};
    const it=['A','B','C','D','E'].map(k=>({n:N[k],v:D.trap[k].trap}));
    ctx.save();ctx.globalAlpha=a4;bars(it,lt,260,260,1400,112,1,{fmt:v=>Math.round(v*100)+'%',colorOf:(x,i)=>i===1?C.food:C.danger,alphaOf:(x,i)=>i===4?0.55:1,start:25.4,stagger:0.3,labelW:520});ctx.restore();
    caption(lt,25.6,37,tl('只要相信“世界可能会变”，困死率就从 63% 降到 8%','Just believing “the world may change” cuts the trapped share from 63% to 8%'));}
}
function sTip(t){ // 165–185
  const lt=t-165;
  const a1=fadeIO(lt,0,10,0.6);
  if(a1>0){txt(tl('只差一份食物','Just one portion short'),W/2,150,56,C.ink,'center',700,a1);
    const F=D.food,x=360,y=290,w=1200,h=460,bw=w/F.length,Y=v=>y+h-v/200*h;
    axes(x,y,w,h,{yTicks:[0,50,100,150,200],yFmt:v=>v,X:v=>v,Y,alpha:a1});
    F.forEach((f,i)=>{const p=ease((lt-0.4-i*0.12)/0.6)*a1;if(p<=0)return;ctx.save();ctx.globalAlpha=p;ctx.fillStyle=f.x===19?C.amber:f.x===18?C.danger:C.mesh;const hh=(y+h-Y(f.v))*p;ctx.fillRect(x+i*bw+10,y+h-hh,bw-20,hh);ctx.restore();
      txt(String(f.x),x+i*bw+bw/2,y+h+30,26,f.x===18||f.x===19?C.ink:C.muted,'center',f.x===18||f.x===19?700:400,a1,MONO);});
    txt(tl('罐内食物（份）','Food in jar (portions)'),x+w/2,y+h+76,28,C.muted,'center',400,a1);txt(tl('预期寿命（天）','Expected lifespan (days)'),x,y-30,28,C.muted,'left',400,a1);
    const i18=F.findIndex(f=>f.x===18),i19=i18+1;
    txt(`${F[i18].v.toFixed(0)}${tl(' 天',' d')}`,x+i18*bw+bw/2,Y(F[i18].v)-26,30,C.danger,'center',700,a1*ease((lt-2.5)/0.5),MONO);
    txt(`${F[i19].v.toFixed(0)}${tl(' 天',' d')}`,x+i19*bw+bw/2,Y(F[i19].v)-26,30,C.amber,'center',700,a1*ease((lt-2.8)/0.5),MONO);
    txt(tl('网第 60 天才开：18 份食物撑到那天只剩 1 点能量，连轻跳都不够；19 份还剩 4 点','The net opens on day 60. With 18 portions, 1 energy is left that day, too little to jump; with 19, 4 are left'),W/2,215,32,C.muted,'center',400,a1*ease((lt-4)/0.6));
    caption(lt,0.5,10,tl('门槛：能不能撑到开网那天，差一点和差很多一样','A threshold: falling slightly short is as bad as falling far short'));}
  const a2=fadeIO(lt,10.2,20,0.6);
  if(a2>0){txt(tl('两种做法打平的地方','Where two choices tie'),W/2,150,56,C.ink,'center',700,a2);
    const F=D.flip,x=360,y=250,w=1200,h=500,X=v=>x+(v-0.03)/0.01*w,Y=v=>y+h-v/30*h,Y2=p=>y+h-p*h;
    axes(x,y,w,h,{yTicks:[0,10,20,30],yFmt:v=>v,xTicks:[0.03,0.0325,0.035,0.0375,0.04],xFmt:v=>(v*100).toFixed(2)+'%',X,Y,alpha:a2,xLabel:tl('罐内风险（每天）','Risk inside the jar (per day)'),y2Ticks:[0,0.5,1],Y2,y2Fmt:p=>Math.round(p*100)+'%'});
    const p=ease((lt-10.6)/3);
    line(F.map(f=>[f.x,f.v]),X,Y,C.amber,6,p*a2);line(F.map(f=>[f.x,f.xe]),X,Y2,C.danger,5,p*a2,[14,10]);
    txt(tl('预期寿命（天）','Expected lifespan (days)'),x,y-30,28,C.amber,'left',700,a2);txt(tl('逃出概率','Escape chance'),x+w,y-30,28,C.danger,'right',700,a2);
    const ka=a2*ease((lt-14)/0.6);if(ka>0){ctx.save();ctx.globalAlpha=ka*0.18;ctx.fillStyle=C.mesh;ctx.fillRect(X(0.0345),y,X(0.0355)-X(0.0345),h);ctx.restore();
      txt(tl('逃出率 3% → 53%，寿命几乎没变','Escape 3% → 53%, lifespan barely moves'),X(0.0358),y+h-90,34,C.ink,'left',700,ka);}
    caption(lt,10.6,20,tl('行为整个翻转，寿命却几乎不变：只看行为会误判处境','Behavior flips completely while lifespan barely moves: behavior alone misleads'));}
}
function sEnd(t){ // 185–197
  const lt=t-185,out=1-ease((lt-10.6)/1.2);
  txt(tl('试错有代价，所以我们会停下来。','Trying has a cost, so we stop.'),W/2,360,56,C.ink,'center',500,ease((lt-0.4)/0.8)*out);
  txt(tl('可一旦停下，就再也看不见世界已经变了。','But once we stop, we can no longer see that the world has changed.'),W/2,460,56,C.ink,'center',500,ease((lt-2.8)/0.8)*out);
  txt(tl('偶尔，再跳一次。','Now and then, jump again.'),W/2,620,92,C.amber,'center',800,ease((lt-5.6)/0.8)*out);
  if(lt>5.6){const ph=clamp((lt-5.6)/2.2);flea(lerp(760,1180,ph),830-130*4*ph*(1-ph),1.8,false,out*ease((lt-5.6)/0.4));}
  txt(tl('数据来自「跳蚤越狱实验室」里的动态规划模型 · 背景音乐由程序生成','Data from the dynamic-programming model in Flea Jailbreak Lab · Music generated by code'),W/2,930,28,C.muted,'center',400,ease((lt-8)/0.8)*out);
}
function drawAt(t){
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(W/2,H/2,200,W/2,H/2,1200);g.addColorStop(0,'rgba(40,60,70,0.25)');g.addColorStop(1,'rgba(0,0,0,0.35)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(t<7)sTitle(t);
  else if(t<40){chapter(t,7.3,40,'01',tl('原版故事','The original story'));sFable(t);}
  else if(t<68){chapter(t,40.3,68,'02',tl('习得性无助的真实研究','The real research on learned helplessness'));sSeligman(t);}
  else if(t<105){chapter(t,68.3,105,'03',tl('把跳蚤写成一个决策模型','The flea as a decision model'));sModel(t);}
  else if(t<128){chapter(t,105.3,128,'04',tl('会变的网：看守者怎么开网','A changing net: how the jailer opens it'));sJail(t);}
  else if(t<165){chapter(t,128.3,165,'05',tl('升级版：习得性无助','Upgrade: learned helplessness'));sLearn(t);}
  else if(t<185){chapter(t,165.3,185,'06',tl('临界点','Tipping points'));sTip(t);}
  else sEnd(t);
  // global fade from/to black
  const fb=Math.max(1-ease(t/0.8),ease((t-(TOTAL-0.8))/0.8));if(fb>0){ctx.fillStyle=`rgba(0,0,0,${fb})`;ctx.fillRect(0,0,W,H);}
}

