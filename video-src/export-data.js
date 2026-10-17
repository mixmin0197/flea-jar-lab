const EMAX=20, HMAX=10, BB=41;
const ACT=[{k:'eat',n:'吃',c:'--a-eat'},{k:'rest',n:'休息',c:'--a-rest'},{k:'j1',n:'轻跳',c:'--a-j1'},{k:'j2',n:'中跳',c:'--a-j2'},{k:'j3',n:'全力跳',c:'--a-j3'}];
const DEF={d:0.6,F0:12,e0:8,g:3,m:1,jc:1,dmg:2,h0:0.01,k:0.008,rho:0.002,rin:0.006,r:0.15,
  obj:'life',sched:'const',dOpen:0,tau:0.1,L:1,off:20,vis:'yes',lhT:8,lhMu:0.5,lhQ:0.05};
const SCHED=[['const','固定不变'],['once','某天打开一次'],['periodic','定时打开'],['random','随机打开'],['burst','成团打开']];
const pct=v=>Math.round(v*100)+'%';
const CTL=[
  {grp:'跳蚤的目标'},
  {id:'obj',n:'追求',type:'sel',opts:[['life','活得最久'],['escape','逃出去的概率最高']]},
  {grp:'罐子'},
  {id:'d',n:'网密度',min:0,max:0.95,step:0.05,fmt:pct},
  {id:'dmg',n:'撞网伤害',min:1,max:5,step:1,fmt:v=>v+' 点'},
  {id:'F0',n:'罐内食物',min:0,max:40,step:1,fmt:v=>v+' 份'},
  {id:'g',n:'每份能量',min:1,max:6,step:1,fmt:v=>'+'+v},
  {grp:'网的变化'},
  {id:'sched',n:'变化方式',type:'sel',opts:SCHED},
  {id:'dOpen',n:'开网时密度',min:0,max:0.9,step:0.05,fmt:v=>v===0?'没网':pct(v),show:s=>s!=='const'},
  {id:'tau',n:'开网天数占比',min:0.05,max:0.5,step:0.05,fmt:pct,show:s=>['periodic','random','burst'].includes(s)},
  {id:'L',n:'每次开几天',min:1,max:6,step:1,fmt:v=>v+' 天',show:s=>['once','periodic','burst'].includes(s)},
  {id:'off',n:'第一次开网',min:0,max:60,step:1,fmt:v=>'第 '+v+' 天',show:s=>['once','periodic'].includes(s)},
  {id:'vis',n:'看得见网吗',type:'sel',opts:[['yes','看得见'],['no','看不见']],show:s=>['random','burst'].includes(s)},
  {grp:'跳蚤'},
  {id:'e0',n:'初始能量',min:1,max:20,step:1,fmt:v=>v},
  {id:'m',n:'每日代谢',min:1,max:3,step:1,fmt:v=>'−'+v},
  {id:'jc',n:'跳跃耗能',min:1,max:3,step:1,fmt:v=>'×'+v},
  {id:'r',n:'休息回血率',min:0,max:0.5,step:0.05,fmt:pct},
  {grp:'死亡风险（每天）'},
  {id:'h0',n:'基础死亡率',min:0.002,max:0.04,step:0.002,fmt:v=>(v*100).toFixed(1)+'%'},
  {id:'k',n:'伤病系数',min:0,max:0.03,step:0.002,fmt:v=>(v*100).toFixed(1)+'%'},
  {id:'rin',n:'罐内风险',min:0,max:0.05,step:0.002,fmt:v=>(v*100).toFixed(1)+'%'},
  {id:'rho',n:'罐外风险',min:0,max:0.08,step:0.005,fmt:v=>(v*100).toFixed(1)+'%'},
];
const PRESETS=[
  {n:'默认',p:{}},
  {n:'稀疏网',p:{d:0.2}},
  {n:'密网 + 粮多',p:{d:0.9,F0:40,dmg:3}},
  {n:'外面很危险',p:{rho:0.03,F0:30}},
  {n:'罐里闷热',p:{rin:0.025,d:0.75}},
  {n:'钢丝网',p:{d:0.7,dmg:5,k:0.02}},
  {n:'某天突然没网',p:{sched:'once',off:25,L:1,d:0.9,dmg:3}},
  {n:'定时开网',p:{sched:'periodic',tau:0.1,L:1,off:9,d:0.85,obj:'escape'}},
  {n:'随机开网',p:{sched:'random',tau:0.1,d:0.85,obj:'escape'}},
  {n:'随机开网 · 看不见',p:{sched:'random',tau:0.1,d:0.85,vis:'no',obj:'escape'}},
  {n:'成团开网',p:{sched:'burst',tau:0.1,L:4,d:0.85,obj:'escape'}},
];
let P={...DEF};

const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const passD=(d,a)=>1-Math.pow(d,0.8*a);
const dmgA=a=>[0,P.dmg,Math.ceil(1.5*P.dmg),2*P.dmg][a];
const hz=h=>Math.min(1,P.h0+P.k*(HMAX-h));
const periodT=()=>Math.max(P.L+1,Math.round(P.L/P.tau));

// ---------- the net as a process ----------
// every net exposes: n states, init, pp(i,j) pass prob, tr(i,j) next-state distribution
// (j = jump strength that just failed, 0 = no new information), open(i) = P(open today), label/short
function buildNet(){
  const pc=P.d,po=P.dOpen,L=P.L,s=P.sched;
  const det=(isOpen,next,init,label,short,extra)=>Object.assign({n:isOpen.length,blind:false,init,
    pp:(i,j)=>passD(isOpen[i]?po:pc,j),tr:i=>next[i],open:i=>isOpen[i],label,short},extra||{});
  if(s==='once'){
    const off=P.off,n=off+L+1,isOpen=[],next=[];
    for(let i=0;i<n;i++){isOpen.push(i>=off&&i<off+L?1:0);next.push([[1,Math.min(i+1,n-1)]]);}
    return det(isOpen,next,0,
      i=>i<off?`网关着，还有 ${off-i} 天开网`:i<off+L?`网开着（第 ${i-off+1}/${L} 天）`:'网已经关回去，不会再开',
      i=>i<off?`${off-i}天后开`:i<off+L?'开':'永久关',{off});
  }
  if(s==='periodic'){
    const T=periodT(),off=Math.min(P.off,T-L),isOpen=[],next=[];
    for(let c=0;c<T;c++){isOpen.push(c<L?1:0);next.push([[1,(c+1)%T]]);}
    return det(isOpen,next,off===0?0:T-off,
      c=>c<L?`网开着（第 ${c+1}/${L} 天）`:`网关着，还有 ${T-c} 天开网`,
      c=>c<L?'开':`${T-c}天后开`,{T,off});
  }
  if(s==='random'||s==='burst'){
    const tau=P.tau,a=s==='random'?tau:1-1/L,bco=s==='random'?tau:Math.min(1,tau/(L*(1-tau)));
    const markov={a,bco};
    if(P.vis==='yes')return det([0,1],[[[1-bco,0],[bco,1]],[[1-a,0],[a,1]]],0,
      i=>i?'网开着':'网关着',i=>i?'开':'关',{markov});
    // blind flea: state = belief that the net is open today, on a grid of BB points
    const interp=b=>{const x=Math.max(0,Math.min(1,b))*(BB-1),i0=Math.min(BB-2,Math.floor(x)),w=x-i0;
      return w<1e-9?[[1,i0]]:w>1-1e-9?[[1,i0+1]]:[[1-w,i0],[w,i0+1]];};
    const TR=[0,1,2,3].map(j=>Array.from({length:BB},(_,i)=>{
      let b=i/(BB-1);
      if(j){const fo=1-passD(po,j),fc=1-passD(pc,j),den=b*fo+(1-b)*fc;if(den>1e-12)b=b*fo/den;}
      return interp(b*a+(1-b)*bco);}));
    return {n:BB,blind:true,init:0,markov,
      pp:(i,j)=>{const b=i/(BB-1);return b*passD(po,j)+(1-b)*passD(pc,j);},
      tr:(i,j)=>TR[j][i],open:i=>i/(BB-1),
      label:i=>`跳蚤估计今天网开着的概率是 ${pct(i/(BB-1))}`,short:i=>`估${pct(i/(BB-1))}开`};
  }
  return det([0],[[[1,0]]],0,()=>'网一直不变',()=>'',{});
}

// exact DP over (f, e, h, n); allow(a,e,f,h,n,net) restricts actions for baseline strategies
function solve(F0,allow,net){
  const NN=net.n,SE=(HMAX+2)*NN,SF=(EMAX+1)*SE,N=(F0+1)*SF;
  const V=new Float32Array(N),X=new Float32Array(N),A=new Int8Array(N);
  const id=(e,f,h,n)=>f*SF+e*SE+h*NN+n;
  const Vo=new Float64Array(HMAX+2);
  for(let h=HMAX;h>=1;h--){const q=Math.min(1,hz(h)+P.rho),up=h===HMAX?0:P.r;
    Vo[h]=(1+(1-q)*up*(h===HMAX?0:Vo[h+1]))/(1-(1-q)*(1-up));}
  const EV=(arr,e,f,h,lst)=>{if(e<=0||h<=0)return 0;const b=f*SF+e*SE+h*NN;let s=0;for(let i=0;i<lst.length;i++)s+=lst[i][0]*arr[b+lst[i][1]];return s;};
  const esc=P.obj==='escape',r=P.r;
  for(let f=0;f<=F0;f++)for(let e=1;e<=EMAX;e++)for(let h=1;h<=HMAX;h++){
    const s=1-Math.min(1,hz(h)+P.rin);
    for(let n=0;n<NN;n++){
      const t0=net.tr(n,0);let bk=-1,bk2=-1,ba=-1,bv=1,bx=0;
      for(let a=0;a<5;a++){
        if(allow&&!allow(a,e,f,h,n,net))continue;
        let v,x;
        if(a===0){if(f<=0)continue;const e2=Math.min(EMAX,e-P.m+P.g);v=1+s*EV(V,e2,f-1,h,t0);x=s*EV(X,e2,f-1,h,t0);}
        else if(a===1){const e2=e-P.m,h2=Math.min(HMAX,h+1);
          v=1+s*(r*EV(V,e2,f,h2,t0)+(1-r)*EV(V,e2,f,h,t0));x=s*(r*EV(X,e2,f,h2,t0)+(1-r)*EV(X,e2,f,h,t0));}
        else{const j=a-1,e2=e-P.m-P.jc*j;if(e2<0)continue;const p=net.pp(n,j),tj=net.tr(n,j),h2=h-dmgA(j);
          v=1+s*(p*Vo[h]+(1-p)*EV(V,e2,f,h2,tj));x=s*(p+(1-p)*EV(X,e2,f,h2,tj));}
        const k1=esc?x:v,k2=esc?v:x,eps=esc?1e-6:1e-4;
        if(k1>bk+eps||(Math.abs(k1-bk)<=eps&&k2>bk2)){bk=k1;bk2=k2;ba=a;bv=v;bx=x;}
      }
      if(ba<0){ba=1;bv=1;bx=0;}
      const i=id(e,f,h,n);V[i]=bv;X[i]=bx;A[i]=ba;
    }
  }
  return {V,X,A,Vo,id,F0,net};
}

let NET=null,SOL=null;
const STRATS=[
  {n:'最优策略',allow:null},
  {n:'永远不跳',allow:a=>a<2},
  {n:'吃光再跳',allow:(a,e,f)=>a<2||f===0},
  {n:'一上来就全力跳',allow:(a,e,f)=>{const can=e-P.m-3*P.jc>=0;return can?a===4:a<2;}},
  {n:'只在网开时跳',allow:(a,e,f,h,n,net)=>a<2||net.open(n)>=0.5,netOnly:true},
];


// ---------- learned helplessness: a flea that has to learn the net from its own failures ----------
const KMAX=24,WMAX=30,DG=Array.from({length:20},(_,i)=>0.025+i*0.05);
// prior over the unknown density: Beta-shaped weights on a grid, mean = lhMu
function priorW(){const c=4,a=P.lhMu*c,b=(1-P.lhMu)*c;const w=DG.map(d=>Math.pow(d,a-1)*Math.pow(1-d,b-1));const s=w.reduce((x,y)=>x+y,0);return w.map(x=>x/s);}
function outsideV(){const Vo=new Float64Array(HMAX+2);
  for(let h=HMAX;h>=1;h--){const q=Math.min(1,hz(h)+P.rho),up=h===HMAX?0:P.r;Vo[h]=(1+(1-q)*up*(h===HMAX?0:Vo[h+1]))/(1-(1-q)*(1-up));}return Vo;}
// state (f, e, h, k, w): k = summed strength of failed jumps (sufficient statistic: a failure at strength j
// has likelihood d^(0.8j)), w = days since the last failure (only matters if the flea thinks the net may be removed)
function solveLearn(q,W){
  const pw=priorW(),KK=KMAX+1,WW=W+1,SH=KK*WW,SE=(HMAX+2)*SH,SF=(EMAX+1)*SE,N=(P.F0+1)*SF;
  const Ep=[0,1,2,3].map(j=>Array.from({length:KK},(_,k)=>{let z=0,s=0;DG.forEach((d,i)=>{const l=pw[i]*Math.pow(d,0.8*k);z+=l;s+=l*(1-Math.pow(d,0.8*j));});return s/z;}));
  const Prem=Array.from({length:WW},(_,w)=>1-Math.pow(1-q,w));
  const pp=(k,w,j)=>{const r=Prem[Math.min(w,W)];return r+(1-r)*Ep[j][Math.min(k,KMAX)];};
  const V=new Float32Array(N),X=new Float32Array(N),A=new Int8Array(N),Vo=outsideV();
  const id=(e,f,h,k,w)=>f*SF+e*SE+h*SH+k*WW+w;
  const gv=(arr,e,f,h,k,w)=>(e<=0||h<=0)?0:arr[id(e,f,h,k,w)];
  const esc=P.obj==='escape',r=P.r;
  for(let f=0;f<=P.F0;f++)for(let e=1;e<=EMAX;e++)for(let h=1;h<=HMAX;h++){
    const s=1-Math.min(1,hz(h)+P.rin),h2r=Math.min(HMAX,h+1);
    for(let k=0;k<KK;k++)for(let w=0;w<WW;w++){
      const w1=Math.min(W,w+1);let bk=-1,bk2=-1,ba=-1,bv=1,bx=0;
      for(let a=0;a<5;a++){
        let v,x;
        if(a===0){if(f<=0)continue;const e2=Math.min(EMAX,e-P.m+P.g);v=1+s*gv(V,e2,f-1,h,k,w1);x=s*gv(X,e2,f-1,h,k,w1);}
        else if(a===1){const e2=e-P.m;v=1+s*(r*gv(V,e2,f,h2r,k,w1)+(1-r)*gv(V,e2,f,h,k,w1));x=s*(r*gv(X,e2,f,h2r,k,w1)+(1-r)*gv(X,e2,f,h,k,w1));}
        else{const j=a-1,e2=e-P.m-P.jc*j;if(e2<0)continue;const p=pp(k,w,j),h2=h-dmgA(j),k2=Math.min(KMAX,k+j);
          v=1+s*(p*Vo[h]+(1-p)*gv(V,e2,f,h2,k2,0));x=s*(p+(1-p)*gv(X,e2,f,h2,k2,0));}
        const k1=esc?x:v,k2=esc?v:x,eps=esc?1e-6:1e-4;
        if(k1>bk+eps||(Math.abs(k1-bk)<=eps&&k2>bk2)){bk=k1;bk2=k2;ba=a;bv=v;bx=x;}
      }
      if(ba<0){ba=1;bv=1;bx=0;}
      const i=id(e,f,h,k,w);V[i]=bv;X[i]=bx;A[i]=ba;
    }
  }
  return {V,X,A,id,W,pp,q};
}
// a net that disappears on day T and never comes back (for the all-knowing reference flea)
function goneNet(T){return {n:T+1,blind:false,init:0,pp:(i,j)=>i>=T?1:passD(P.d,j),tr:i=>[[1,Math.min(i+1,T)]],open:i=>i>=T?1:0,label:()=>'',short:()=>''};}
function newLearnFlea(){return {e:P.e0,f:P.F0,h:HMAX,day:0,alive:true,out:false,hits:0,escDay:0,k:0,w:0,sinceJump:0,lastJump:0,atRem:false,remSeen:false};}
function stepLearn(s,pol,T){
  if(!s.alive)return null;
  if(s.out){const q=Math.min(1,hz(s.h)+P.rho);s.day++;
    if(Math.random()<q){s.alive=false;return {t:'dieOut'};}
    if(s.h<HMAX&&Math.random()<P.r){s.h++;return {t:'outHeal'};}
    return {t:'outLive'};}
  s.day++;
  const gone=s.day-1>=T;
  if(gone&&!s.remSeen){s.remSeen=true;s.atRem=true;}
  if(Math.random()<hz(s.h)+P.rin){s.alive=false;return {t:'die',open:gone};}
  const a=pol(s);
  if(a<2){s.w++;s.sinceJump++;}
  if(a===0){s.e=Math.min(EMAX,s.e-P.m+P.g);s.f--;return {t:'eat',open:gone};}
  if(a===1){s.e-=P.m;let healed=false;if(s.h<HMAX&&Math.random()<P.r){s.h++;healed=true;}
    if(s.e<=0){s.alive=false;return {t:'starve',open:gone};}return {t:'rest',healed,open:gone};}
  const j=a-1;s.e=s.e-P.m-P.jc*j;s.sinceJump=0;s.lastJump=s.day;
  if(gone||Math.random()<passD(P.d,j)){s.out=true;s.escDay=s.day;return {t:'escape',j,open:gone};}
  s.h-=dmgA(j);s.hits++;s.k=Math.min(KMAX,s.k+j);s.w=0;
  if(s.h<=0){s.alive=false;return {t:'hitDie',j,open:gone};}
  if(s.e<=0){s.alive=false;return {t:'hitStarve',j,open:gone};}
  return {t:'hit',j,open:gone};
}
function learnMC(pol,n){
  const T=P.lhT;let esc=0,atRem=0,trapped=0,hits=0,last=0,lastN=0;
  for(let i=0;i<n;i++){const s=newLearnFlea();let g=0;while(s.alive&&g++<5000)stepLearn(s,pol,T);
    if(s.out)esc++;if(s.atRem){atRem++;if(!s.out)trapped++;}hits+=s.hits;if(s.lastJump){last+=s.lastJump;lastN++;}}
  return {esc:esc/n,atRem:atRem/n,trap:atRem?trapped/atRem:NaN,hits:hits/n,last:lastN?last/lastN:0};
}
let LS=null,LDEMO=null,learnJob=0;
const LTYPES=[
  {key:'A',n:'A · 学习型，认为网永远不会变'},
  {key:'B',n:'B · 学习型，认为网可能被拿走'},
  {key:'C',n:'C · 偶尔试探：A 的做法，再加上每 7 天轻跳一次'},
  {key:'D',n:'D · 撞 2 次就放弃'},
  {key:'E',n:'E · 全知：知道网的真实密度和哪天被拿走',ref:true},
];


const out={};
const V0=(so)=>so.V[so.id(P.e0,P.F0,HMAX,so.net.init)], X0=(so)=>so.X[so.id(P.e0,P.F0,HMAX,so.net.init)];
// 1. default comparison + policy map
P={...DEF};let net=buildNet(),so=solve(P.F0,null,net);
out.cmp=STRATS.slice(0,4).map(st=>({n:st.n,v:V0(st.allow?solve(P.F0,st.allow,net):so)}));
out.map=[];for(let e=1;e<=EMAX;e++){const row=[];for(let f=0;f<=P.F0;f++)row.push(so.A[so.id(e,f,HMAX,0)]);out.map.push(row);}
// 2. jailer ranking (d .85, tau .1, escape objective)
const tau=0.1,Tof=L=>Math.max(L+1,Math.round(L/tau));
const C=[['定时开 1 天 · 第一天就开',{sched:'periodic',L:1,off:0}],['定时开 1 天 · 尽量晚',{sched:'periodic',L:1,off:Tof(1)-1}],['随机开 · 看得见',{sched:'random',vis:'yes'}],['随机开 · 看不见',{sched:'random',vis:'no'}],
 ['成团开 3 天 · 看得见',{sched:'burst',L:3,vis:'yes'}],['成团开 3 天 · 看不见',{sched:'burst',L:3,vis:'no'}],['定时开 3 天 · 尽量晚',{sched:'periodic',L:3,off:Tof(3)-3}],['定时开 6 天 · 尽量晚',{sched:'periodic',L:6,off:Tof(6)-6}],['永远关着（参照）',{sched:'const'}]];
out.jail=C.map(([n,o])=>{P={...DEF,d:0.85,tau,obj:'escape',...o};const nt=buildNet(),s2=solve(P.F0,null,nt);return {n,x:X0(s2)};});
// 3. learning flea (classic setup)
P={...DEF,d:0.9,dmg:2,F0:20,lhT:8,lhMu:0.5,lhQ:0.05};
const LA=solveLearn(0,0),LB=solveLearn(P.lhQ,WMAX);
out.belief=[];let kStar=null;for(let k=0;k<=KMAX;k++){const on=LA.A[LA.id(EMAX,10,HMAX,k,0)]>=2;out.belief.push({k,p:LA.pp(k,0,3),on});if(!on&&kStar===null)kStar=k;}
out.kStar=kStar;
out.retry=[];for(let w=0;w<=WMAX;w++)out.retry.push({w,p:LB.pp(kStar,w,3),on:LB.A[LB.id(EMAX,10,HMAX,kStar,w)]>=2});
const T=P.lhT,O=solve(P.F0,null,goneNet(T));const polA=s=>LA.A[LA.id(s.e,s.f,s.h,s.k,0)];
const pols={A:polA,B:s=>LB.A[LB.id(s.e,s.f,s.h,s.k,Math.min(LB.W,s.w))],C:s=>{const a=polA(s);return a<2&&s.sinceJump>=7&&s.e-P.m-P.jc>=1?2:a;},
 D:s=>s.hits<2&&s.e-P.m-3*P.jc>=3?4:(s.f>0&&s.e<=EMAX-P.g+P.m?0:1),E:s=>O.A[O.id(s.e,s.f,s.h,Math.min(s.day-1,T))]};
out.trap={};for(const [k,p] of Object.entries(pols)){const r=learnMC(p,6000);out.trap[k]={trap:r.trap,esc:r.esc};}
// one illustrative A-flea trajectory that ends trapped (seeded search)
// 4. cliffs: user's once settings food sweep and window sweep
const U={d:0.95,dmg:4,e0:7,h0:0.002,rin:0.006,rho:0.002,sched:'once',dOpen:0.45,L:4,off:60};
out.food=[];for(let F0=14;F0<=24;F0++){P={...DEF,...U,F0};const nt=buildNet(),s2=solve(F0,null,nt);out.food.push({x:F0,v:V0(s2),xe:X0(s2)});}
const U2={d:0.95,dmg:4,e0:7,h0:0.002,rin:0,rho:0.08,F0:19,sched:'once',dOpen:0.45,L:3};
out.win=[];for(let off=30;off<=66;off++){P={...DEF,...U2,off};const nt=buildNet(),s2=solve(P.F0,null,nt);out.win.push({x:off,v:V0(s2)});}
// 5. behaviour flip: rin sweep in 外面危险
out.flip=[];for(let i=0;i<=40;i++){const rin=0.03+i*0.00025;P={...DEF,rho:0.03,F0:30,rin};const nt=buildNet(),s2=solve(P.F0,null,nt);out.flip.push({x:rin,v:V0(s2),xe:X0(s2)});}
require('fs').writeFileSync(process.argv[2]+'/data.json',JSON.stringify(out));
console.log(JSON.stringify({cmp:out.cmp,jail:out.jail.map(j=>j.n+' '+(j.x*100).toFixed(1)),kStar,trap:out.trap,food:out.food.map(f=>f.x+':'+f.v.toFixed(1)),flipX:out.flip.filter((_,i)=>i%5==0).map(f=>(f.x*100).toFixed(2)+':'+f.v.toFixed(1)+'/'+(f.xe*100).toFixed(0))},null,0));

