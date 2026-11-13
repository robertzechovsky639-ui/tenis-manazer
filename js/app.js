// ---------- safe storage (iOS private mode / file:// / in-app viewers may block or limit localStorage) ----------
const STORE=(function(){const mem={};let ls=null;try{const t='__tm_t';window.localStorage.setItem(t,'1');window.localStorage.removeItem(t);ls=window.localStorage;}catch(e){ls=null;}
 return {ok:!!ls,get(k){try{if(ls){const v=ls.getItem(k);if(v!=null)return v;}}catch(e){}return mem[k]==null?null:mem[k];},
  set(k,v){mem[k]=v;if(!ls)return false;try{ls.setItem(k,v);return true;}catch(e){try{ls.removeItem(k);ls.setItem(k,v);return true;}catch(e2){return false;}}},
  del(k){delete mem[k];try{if(ls)ls.removeItem(k);}catch(e){}}};})();
// ===================== ENGINE =====================
const SAVE_KEY='tenisManazer_save_v2';
const GAME_VER=6;
let RNG=Math.random;
const rnd=(a,b)=>a+RNG()*(b-a), rint=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(RNG()*a.length)];
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const gauss=()=>(RNG()+RNG()+RNG()+RNG()-2)*1.22;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(RNG()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function hashStr(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const fmtMoney=v=>(v<0?'-':'')+'$'+Math.round(Math.abs(v)).toLocaleString('cs-CZ');
const fmtNum=v=>Math.round(v).toLocaleString('cs-CZ');

const STYLE_OFF={BIG:{fh:1,bh:-3,srv:9,ret:-5,kon:-2,men:0},ATK:{fh:5,bh:0,srv:3,ret:-2,kon:-3,men:-2},BASE:{fh:2,bh:3,srv:-3,ret:3,kon:1,men:0},CTR:{fh:-3,bh:1,srv:-6,ret:6,kon:6,men:1},CLAY:{fh:4,bh:0,srv:-5,ret:2,kon:5,men:0},ALL:{fh:0,bh:0,srv:0,ret:0,kon:0,men:1}};
const STYLE_NAMES={BIG:'Servis-volej / velký servis',ATK:'Útočný hráč',BASE:'Baseliner',CTR:'Obranář',CLAY:'Antukář',ALL:'Všestranný'};
function overallOf(st){let o=0;for(const k of STAT_KEYS)o+=st[k]*STAT_W[k];return o;}
function genStats(ov,style){const off=STYLE_OFF[style]||STYLE_OFF.ALL;const st={};for(const k of STAT_KEYS)st[k]=ov+off[k]+gauss()*2.2;const d=ov-overallOf(st);for(const k of STAT_KEYS)st[k]=clamp(st[k]+d,20,99);return st;}
function parseSurf(s){const o={H:0,C:0,G:0,I:0};(s||'').replace(/([HCGI])(-?\d+)/g,(m,k,v)=>{o[k]=+v;});return o;}
const ovFromPts=pts=>{pts=Math.max(pts,1);return pts>=600?40+12.5*Math.log10(pts):74.73-9*Math.log10(600/pts);};

// ---------- popularity ----------
const STAR={'Carlos Alcaraz':7,'Novak Djokovic':9,'Jannik Sinner':5,'Ben Shelton':4,'Frances Tiafoe':5,'João Fonseca':6,'Stefanos Tsitsipas':4,'Alexander Bublik':4,'Matteo Berrettini':3,'Daniil Medvedev':2,'Jakub Menšík':3,'Jiří Lehečka':2,'Denis Shapovalov':3,'Taylor Fritz':2,'Kei Nišikori':4,'Marin Čilić':2,'Lorenzo Musetti':2,'Arthur Fils':2};
const POP_TF={M15:.5,M25:.6,C50:.8,C75:.9,C100:1,C125:1.1,A250:1.5,A500:1.9,M1000:2.4,GS:3.2,FIN:3};
const POP_TITLE={M15:1,M25:1.5,C50:2,C75:2.5,C100:3,C125:3.5,A250:5,A500:7,M1000:10,GS:16,FIN:13};
const SPONSORS=[
 {id:'s1',th:8,name:'Sportovní obchod U Kurtu',icon:'🏪',pay:250,desc:'Místní obchod se sportovním vybavením'},
 {id:'s2',th:18,name:'SmashPro rakety',icon:'🎾',pay:800,desc:'Výrobce raket a výpletů'},
 {id:'s3',th:30,name:'AquaVolt iontový nápoj',icon:'🥤',pay:2200,desc:'Energetické nápoje pro sportovce'},
 {id:'s4',th:45,name:'Northline Sport oblečení',icon:'👕',pay:5500,desc:'Oblečení a obuv – kolekce s tvým jménem'},
 {id:'s5',th:60,name:'Chronex hodinky',icon:'⌚',pay:12000,desc:'Luxusní švýcarské hodinky'},
 {id:'s6',th:75,name:'Veloce Motors',icon:'🚗',pay:26000,desc:'Automobilka – ambasador značky'},
 {id:'s7',th:90,name:'Orbit Global',icon:'🌐',pay:55000,desc:'Globální technologická značka'}
];
const MEDIA={
 social:{name:'Sociální sítě',icon:'📱',en:3,cost:0,pop:0.5,min:0,desc:'Video z tréninku a Q&A s fanoušky'},
 interview:{name:'Rozhovor & podcast',icon:'🎙️',en:5,cost:0,pop:1.0,min:12,desc:'Rozhovor pro sportovní média'},
 fans:{name:'Autogramiáda',icon:'✍️',en:9,cost:600,pop:1.6,min:20,desc:'Setkání s fanoušky v klubu'},
 charity:{name:'Charitativní exhibice',icon:'💙',en:18,cost:0,pop:2.5,min:40,money:5000,desc:'Exhibice pro dobrou věc (+$5 000 od pořadatele)'}
};
function popOf(p){if(!p)return 0;if(p.isMe)return p.pop||0;const r=p.rank||900;return clamp(100-11*Math.log(r)+(p.real?5:-5)+(STAR[p.n]||0),1,99);}
function followers(pop){return Math.round(300*Math.pow(10,pop/25));}
function fmtFans(n){if(n>=1e6)return (n/1e6).toLocaleString('cs-CZ',{maximumFractionDigits:1})+' mil.';if(n>=1e3)return (n/1e3).toLocaleString('cs-CZ',{maximumFractionDigits:1})+' tis.';return String(n);}
function addPop(x){const me=ME();if(!me)return 0;const before=me.pop||0;me.pop=clamp(before+(x>0?x*Math.pow(Math.max(0,1-before/108),1.4):x),0,100);return me.pop-before;}
function sponsorPay(me){return SPONSORS.filter(s=>me.spons&&me.spons[s.id]).reduce((a,s)=>a+s.pay,0);}
function updateSponsors(me,silent){me.spons=me.spons||{};for(const sp of SPONSORS){if(!me.spons[sp.id]&&me.pop>=sp.th){me.spons[sp.id]={s:S.season,w:S.week};if(!silent)S.news.unshift({w:S.week,s:S.season,t:`✍️ Nová sponzorská smlouva: ${sp.icon} ${sp.name} (+${fmtMoney(sp.pay)}/týden)`});}
 else if(me.spons[sp.id]&&me.pop<sp.th-6){delete me.spons[sp.id];if(!silent)S.news.unshift({w:S.week,s:S.season,t:`📉 ${sp.name} ukončil smlouvu – klesla ti popularita.`});}}}
function media(kind){const me=ME();const m=MEDIA[kind];
 if(S.cur&&S.cur.status==='alive')return {ok:false,msg:'Během turnaje se soustřeď na tenis.'};
 if(me.slots<=0)return {ok:false,msg:'Tento týden už nemáš volné bloky.'};
 if((me.pop||0)<m.min)return {ok:false,msg:`Potřebuješ popularitu alespoň ${m.min}.`};
 if(me.energy<m.en)return {ok:false,msg:'Nedostatek energie.'};
 if(me.money<m.cost)return {ok:false,msg:'Nedostatek peněz.'};
 me.mediaW=me.mediaW||{};if(me.mediaW[kind]===S.season*100+S.week)return {ok:false,msg:'Tuto aktivitu už jsi tento týden dělal.'};
 me.mediaW[kind]=S.season*100+S.week;me.slots--;me.energy-=m.en;me.money-=m.cost;if(m.money)me.money+=m.money;
 const g=addPop(m.pop*rnd(0.8,1.25));updateSponsors(me);saveGame();checkAchievements();
 return {ok:true,msg:`${m.icon} ${m.name}: popularita +${g.toFixed(1)} · fanoušci ${fmtFans(followers(me.pop))}`};}

// ---------- state ----------
let S=null, PM={};
function rebuildIndex(){PM={};for(const p of S.players)PM[p.id]=p;}
const P=id=>PM[id];
const ME=()=>PM.me;
const totalPts=p=>{const a=p.pw.filter(v=>v>0);if(a.length<=19)return a.reduce((x,y)=>x+y,0);a.sort((x,y)=>y-x);let t=0;for(let i=0;i<19;i++)t+=a[i];return t;};

function makeGenPlayer(i,ptsTarget,season,young){
 const cc=pick(NAME_WEIGHTS);const pool=NAME_POOLS[cc]||NAME_POOLS.USA;
 let n,tries=0;do{n=pick(pool[0])+' '+pick(pool[1]);tries++;}while(S&&S._names&&S._names[n]&&tries<20);
 if(S&&S._names)S._names[n]=1;
 const style=pick(['BIG','ATK','BASE','CTR','CLAY','ALL','ALL','BASE']);
 const age=young?rint(17,19):rint(18,31);
 const ov=young?rnd(47,61):clamp(ovFromPts(ptsTarget)+gauss()*1.5,38,80);
 const sf={H:0,C:0,G:0,I:0};sf[pick(['H','C','G','I','C'])]=rint(1,3);if(style==='CLAY'){sf.C=rint(2,4);sf.G=-rint(1,3);}
 const pot=young?clamp(0.7+Math.pow(RNG(),2.2)*1.5,0.6,2.2):1;
 return {pot,id:'g'+i+'_'+Math.floor(RNG()*1e6).toString(36),n,cc,by:season-age,hand:RNG()<0.13?'L':'R',bh1:RNG()<0.12,hcm:rint(176,198),injury:0,load:0,gen:true,st:genStats(ov,style),sf,style,pw:new Array(52).fill(0),form:0,real:false,titles:0,sw:0,sl:0,rank:null,prev:null,best:null,init:ptsTarget};
}

function newGame(opts){
 RNG=Math.random;
 S={v:GAME_VER,season:2027,week:1,players:[],events:[],weekStarted:false,plan:null,cur:null,news:[],results:{},daily:null,lastResults:{},_names:{},lastWeek:null,created:Date.now()};
 setCalendar(S.season);
 REAL_PLAYERS_DATA.forEach((d,i)=>{const n=d.n;let st;
  if(STAT_OVERRIDES[n]){const a=STAT_OVERRIDES[n];st={fh:a[0],bh:a[1],srv:a[2],ret:a[3],kon:a[4],men:a[5]};}
  else st={fh:d.st[0],bh:d.st[1],srv:d.st[2],ret:d.st[3],kon:d.st[4],men:d.st[5]};
  S._names[n]=1;
  S.players.push({id:'r'+i,n,cc:d.cc,by:d.by,bd:d.bd,hand:d.hand||'R',bh1:d.bh===1,hcm:d.h||0,st,sf:Object.assign({H:0,C:0,G:0,I:0},d.sf),style:d.style,pw:new Array(52).fill(0),form:0,real:true,titles:0,sw:0,sl:0,rank:null,prev:null,best:null,init:d.pts,ctit:d.ti||0,chr:d.chr||0,pro:d.pro||0,sv:d.sv||null,injury:0,load:0,
   pot:(S.season-d.by)<=21?clamp(1+(d.pts>300?0.5:0.15)+RNG()*0.5,0.8,2.2):1});
 });
 // the human player
 const sts={fh:57,bh:55,srv:56,ret:55,kon:58,men:55};
 const sb={ATK:{fh:4,srv:2,kon:-2,men:-1},BIG:{srv:6,ret:-2,bh:-1},BASE:{bh:3,ret:2,srv:-2},CTR:{ret:3,kon:4,srv:-3,fh:-1},ALL:{men:1}}[opts.style||'ALL'];
 for(const k in sb)sts[k]+=sb[k];
 const me={id:'me',isMe:true,n:opts.name||'Hráč',cc:opts.cc||'CZE',by:S.season-17,hand:opts.hand||'R',bh1:!!opts.bh1,hcm:185,load:0,injT:null,injH:[],tac:Object.assign({},TAC_DEF),st:sts,sf:{H:0,C:0,G:0,I:0},style:opts.style||'ALL',pw:new Array(52).fill(0),form:0,real:false,titles:0,sw:0,sl:0,rank:null,prev:null,best:null,
  xp:{fh:0,bh:0,srv:0,ret:0,kon:0,men:0},energy:100,money:20000,coach:1,fyzio:0,physio:0,fitness:0,manager:0,mental:0,gear:{raketa:0,boty:0,vyplet:0},eq:{raketa:'all',boty:'all',vyplet:'all'},tactic:'bal',injury:0,slots:3,dpw:new Array(52).fill(0),intg:{rep:70,fixes:0,reports:0,flags:0,cool:0,off:null,jobs:[],banned:null},sponsOff:[],
  look:opts.look||{skin:'#e8b896',hair:'#3a2a1a',shirt:'#2f7bff'},
  car:{w:0,l:0,surf:{H:[0,0],C:[0,0],G:[0,0],I:[0,0]},aces:0,df:0,titleList:[],finals:0,prize:0,best:null,streak:0,bestStreak:0,top10:0,longest:0,tb:[0,0],matches:0,davis:{p:0,w:0,l:0,title:0},dtitles:0},
  hist:[],seasons:[],ach:{},h2h:{},trainLog:[],pop:2,spons:{},popHist:[],season0:{w:0,l:0,titles:0,prize:0}};
 S.players.unshift(me);
 rebuildIndex();
 bootstrapRankings();
 S.news.unshift({w:1,s:S.season,t:`Vítej na okruhu! ${me.n} (${COUNTRIES[me.cc][1]}) začíná profesionální kariéru v sezóně ${S.season}. Začni na turnajích ITF, využij domácí turnaje a probojuj se do Challengerů.`});
 saveGame();
 return S;
}

// Distribute each player's real ranking points across the calendar by running a silent "previous season" and rescaling
function bootstrapRankings(){
 for(const p of S.players){p.pw.fill(0);if(!p.isMe)p.pw[0]=p.init;}
 computeRanks();
 const saveWeek=S.week,saveSeason=S.season;S._silent=true;
 setCalendar(saveSeason-1);
 for(let w=1;w<=52;w++){S.week=w;S.weekStarted=false;startWeek(true);endWeek(true);}
 S.week=saveWeek;S.season=saveSeason;S._silent=false;setCalendar(saveSeason);S.events=[];S.news=[];for(const k in S.results)S.results[k].season=S.season-1;
 for(const p of S.players){if(p.isMe){p.pw.fill(0);continue;}
  const sum=totalPts(p);
  if(sum>0){const f=p.init/sum;p.pw=p.pw.map(v=>Math.round(v*f));}
  else{p.pw.fill(0);const n=Math.max(1,Math.min(6,Math.round(p.init/30)));for(let k=0;k<n;k++)p.pw[rint(0,51)]+=Math.round(p.init/n);}
  p.titles=0;p.sw=0;p.sl=0;p.form=0;
 }
 for(const p of S.players){p.prev=null;p.best=null;}
 computeRanks();for(const p of S.players){p.prev=p.rank;p.best=p.rank;}
 S.week=1;S.weekStarted=false;
}

function computeRanks(){
 const arr=S.players.filter(p=>!p.retired);
 for(const p of arr)p._t=totalPts(p);
 arr.sort((a,b)=>b._t-a._t||overallOf(b.st)-overallOf(a.st));
 let r=0;for(const p of arr){if(p._t>0){r++;p.rank=r;}else p.rank=null;if(p.rank&&(!p.best||p.rank<p.best))p.best=p.rank;}
 S.order=arr.map(p=>p.id);
 return arr;
}
const rankOf=p=>p.rank||Infinity;

// ---------- effective stats & ratings ----------
function meBonus(p){if(!p.isMe)return null;const g=p.gear;return {fh:g.raketa,bh:g.raketa,srv:g.vyplet,ret:g.vyplet,kon:g.boty,men:p.mental*2};}
function effStatsBase(p){const st={};const b=meBonus(p);for(const k of STAT_KEYS)st[k]=p.st[k]+(b?b[k]:0);return st;}
function ovr(p){return overallOf(p.st);}
function rating(p,surf){const st=effStatsBase(p);let r=overallOf(st)+(p.sf[surf]||0)*0.9+(p.form||0);if(p.isMe&&p.energy<55)r-=(55-p.energy)*0.14;return r;}

// ---------- quick match sim (AI vs AI) ----------
const QK=8.4;
function setWinP(d){const x=d+gauss()*4.2;const Q=8.4+Math.abs(x)*0.28;return 1/(1+Math.exp(-x/Q));}
function quickMatch(a,b,surf,bo,cc){
 const d=rating(a,surf)-rating(b,surf)+(cc?((a.cc===cc?0.7:0)-(b.cc===cc?0.7:0)):0);
 const ps=setWinP(d);
 const need=Math.ceil(bo/2);const w=[0,0];const sets=[];
 while(w[0]<need&&w[1]<need){
  const sw=RNG()<ps?0:1;w[sw]++;
  const close=1-Math.abs(ps-.5)*1.6;
  const r=RNG();let lg;
  const weights=[0.25*(1.4-close),0.6*(1.3-close*0.6),1.5,2.2,2.2,1.2*close+0.4,1.4*close+0.4];
  let tot=weights.reduce((x,y)=>x+y,0),acc=0;lg=6;for(let i=0;i<7;i++){acc+=weights[i]/tot;if(r<acc){lg=i;break;}}
  let s;if(lg<=4)s=[6,lg];else if(lg===5)s=[7,5];else s=[7,6,rint(0,9)];
  sets.push(sw===0?[s[0],s[1],s[2]]:[s[1],s[0],s[2]]);
 }
 return {w:w[0]>w[1]?a.id:b.id,sets};
}
function scoreTxtM(m){if(m.wo)return 'b.b. (skreč před zápasem)';const t=m.sets&&m.sets.length?scoreStr(m.sets,true,m.a===m.w):'';return m.ret?t+' skr.':t;}
function scoreStr(sets,winnerFirst,aIsWinner){
 return sets.map(s=>{let x=aIsWinner?[s[0],s[1]]:[s[1],s[0]];let t='';if(s[2]!=null&&Math.max(s[0],s[1])===7&&Math.min(s[0],s[1])===6)t=`(${s[2]})`;return x[0]+':'+x[1]+t;}).join(' ');
}


// ---------- injuries ----------
// [Czech name, body area icon, weight, min weeks, max weeks, mid-match retirement probability, context flags m=match t=training w=week]
const INJ_TYPES=[
 ['Křeče a vyčerpání','💧',9,0,0,.75,'m'],
 ['Puchýře na chodidle','🦶',7,0,1,.35,'m'],
 ['Viróza s horečkou','🤒',7,1,2,.6,'w'],
 ['Žaludeční potíže','🤢',4,0,1,.6,'w'],
 ['Natažený sval na stehně','🦵',12,1,3,.6,'mt'],
 ['Natržený břišní sval','🩻',6,3,6,.85,'mt'],
 ['Výron kotníku','🦶',9,1,4,.8,'m'],
 ['Bolesti zad (bederní páteř)','🔙',7,1,4,.65,'mtw'],
 ['Zranění zápěstí','✋',6,2,8,.8,'mt'],
 ['Tenisový loket','💪',4,3,8,.5,'t'],
 ['Zranění ramene','💪',5,3,10,.7,'mt'],
 ['Zánět patelární šlachy (koleno)','🦵',6,2,7,.55,'mtw'],
 ['Zranění třísel','🦵',5,2,5,.75,'m'],
 ['Natržený lýtkový sval','🦵',4,3,6,.85,'m'],
 ['Zranění Achillovy šlachy','🦶',1.2,6,16,.9,'m'],
 ['Únavová zlomenina nártu','🦴',1.2,8,14,.9,'t'],
 ['Operace zápěstí','🏥',0.9,12,26,.95,'mt'],
 ['Přetržený zkřížený vaz v koleni','🏥',0.45,26,40,1,'m']
];
const INJ_SURF={H:1.08,C:.9,G:1.08,I:.95};
const ageInjF=a=>a<22?.8:a<26?.95:a<30?1.08:a<33?1.3:1.6;
function injName(p){const t=INJ_TYPES[p.injT];return t?t[0]:'zranění';}
function injIcon(p){const t=INJ_TYPES[p.injT];return t?t[1]:'🩹';}
function injWeeksTxt(p){const w=Math.ceil(p.injury||0);return w<=0?'do konce týdne':w===1?'1 týden':w<5?w+' týdny':w+' týdnů';}
// probability that a player gets hurt during one match (real ATP: ~1.4 % of tour matches end in retirement, ~0.6 % walkovers)
function matchInjP(p,t,bo){const age=S.season-p.by;let r=0.0115*ageInjF(age)*(INJ_SURF[t.surf]||1)*(bo===5?1.35:1)*(1.22-(p.st.kon||70)/100*0.45)*(1+Math.max(0,(p.load||0)-6)*0.07);
 if(p.isMe){const e=p.energy??100;r*=e<20?2.4:e<35?1.6:e<50?1.15:0.9;r*=(1-0.13*(p.fyzio||0));}
 return r;}
function pickInj(ctx){const c=INJ_TYPES.map((t,i)=>[t,i]).filter(([t])=>t[6].includes(ctx));let tot=c.reduce((a,[t])=>a+t[2],0),x=RNG()*tot;for(const [t,i] of c){x-=t[2];if(x<=0)return i;}return c[0][1];}
function injWeeksFor(i,p){const t=INJ_TYPES[i];let w=t[3]+(t[4]-t[3])*Math.pow(RNG(),1.15);if(p&&p.isMe)w*=(1-0.09*(p.fyzio||0));return Math.max(0,Math.round(w*2)/2);}
function injNotable(p){return p.isMe||(p.rank&&p.rank<=60)||(p.cc===(ME()&&ME().cc)&&p.rank&&p.rank<=300);}
function applyInjury(p,i,weeks,ctxTxt){p.injury=Math.max(p.injury||0,weeks);p.injT=i;p.injTot=weeks;p.injS=[S.season,S.week];
 p.injH=p.injH||[];p.injH.unshift({s:S.season,w:S.week,t:i,wk:weeks});if(p.injH.length>8)p.injH.length=8;
 if(S._silent)return;
 S.injNews=S.injNews||[];
 const mc=ME()?ME().cc:'';if(p.isMe||(p.rank&&p.rank<=250)||(p.cc===mc&&p.rank&&p.rank<=800)){S.injNews.unshift({s:S.season,w:S.week,id:p.id,n:p.n,cc:p.cc,rk:p.rank,t:i,wk:weeks,c:ctxTxt||''});if(S.injNews.length>80)S.injNews.length=80;}
 if(!p.isMe&&injNotable(p)&&(weeks>=2||(p.rank&&p.rank<=20)))S.news.unshift({w:S.week,s:S.season,inj:1,t:`🩹 ${p.n} ${flag(p.cc)} (${p.rank||'-'}.) – ${INJ_TYPES[i][0].toLowerCase()}${weeks>0?`, pauza ~${injWeeksTxt(p)}`:''}${ctxTxt?' · '+ctxTxt:''}`});}
// AI mid-match injury (quick sim). Returns {ret:true} if the player retired.
function matchInjury(p,t,allowRet,bo){if(!p||p.isMe)return null;p.load=(p.load||0)+1;if(RNG()>=matchInjP(p,t,bo||3))return null;
 const i=pickInj('m');const w=injWeeksFor(i,p);const ret=allowRet&&RNG()<INJ_TYPES[i][5];
 applyInjury(p,i,Math.max(w,ret?0:0),ret?`skreč v zápase (${t.name})`:`zranil se v zápase (${t.name})`);return {ret,i,w};}

// ---------- events ----------
function seedOrder(n){let o=[1,2];while(o.length<n){const m=o.length*2;const r=[];for(const x of o){r.push(x);r.push(m+1-x);}o=r;}return o;}
const roundName=(remain)=>remain===2?'Finále':remain===4?'Semifinále':remain===8?'Čtvrtfinále':null;
function evRoundName(ev,ri){if(ev.tier==='DC')return ev.phase==='fin'?'Finále Davis Cupu':'Baráž Davis Cupu';if(ev.tier==='FIN')return ['1. kolo skupiny','2. kolo skupiny','3. kolo skupiny','Semifinále','Finále'][ri];const size=ev.size>>ri;return roundName(size)||`${ri+1}. kolo`;}
function resultName(ev,res){if(ev.tier==='DC')return ev.champ==='me'||res>=(ev.nr||1)?'Výhra':'Prohra';if(ev.tier==='FIN'){return res==='W'?'Vítěz':res==='F'?'Finále':res==='SF'?'Semifinále':'Skupina';}const tr=ev.nr;if(res>=tr)return 'Vítěz';const remain=ev.size>>res;return {2:'Finále',4:'Semifinále',8:'Čtvrtfinále'}[remain]||('R'+remain);}

function createEvent(t,entrants){
 const tier=TIERS[t.tier];
 const ev={id:t.id+'_'+S.season,tid:t.id,name:t.name,city:t.city,cc:t.cc,tier:t.tier,surf:t.surf,week:S.week,end:S.week+t.len-1,len:t.len,bo:tier.bo,rounds:[],cur:0,res:{},done:false,human:false,extra:{},champ:null,ent:entrants.slice()};
 if(t.tier==='FIN'){
  const e=entrants.slice(0,8);ev.size=8;ev.nr=5;
  const g=[[e[0],e[3],e[4],e[7]],[e[1],e[2],e[5],e[6]]].map(x=>x.filter(Boolean));
  ev.groups=g;ev.rr={};for(const id of e)ev.rr[id]={w:0,l:0,sw:0,sl:0,gw:0,gl:0};
  ev.rounds=[rrRound(ev,0)];
  return ev;
 }
 const D=t.draw||32;const B=pow2(D);ev.size=B;ev.draw=D;ev.nr=Math.round(Math.log2(B));ev.pm=t.pm||0;
 const ents=entrants.slice(0,D);const SN=Math.min(SEEDS_N(D),ents.length);
 const seeds=ents.slice(0,SN);const rest=shuffle(ents.slice(SN));
 const list=seeds.concat(rest);while(list.length<B)list.push(null);
 const ord=seedOrder(B);const slots=ord.map(n=>list[n-1]);
 const r0=[];for(let i=0;i<B;i+=2)r0.push({a:slots[i],b:slots[i+1],w:null,sets:null});
 ev.byes={};for(const m of r0){if(m.a&&!m.b)ev.byes[m.a]=1;else if(m.b&&!m.a)ev.byes[m.b]=1;}
 ev.rounds.push(r0);ev.seeds={};seeds.forEach((id,i)=>{if(id)ev.seeds[id]=i+1;});
 return ev;
}
function rrRound(ev,k){const pairs=[[0,3,1,2],[0,2,1,3],[0,1,2,3]][k];const m=[];for(const g of ev.groups){if(g.length<4){continue;}m.push({a:g[pairs[0]],b:g[pairs[1]],w:null,sets:null,grp:ev.groups.indexOf(g)});m.push({a:g[pairs[2]],b:g[pairs[3]],w:null,sets:null,grp:ev.groups.indexOf(g)});}return m;}
function rrStandings(ev,gi){const g=ev.groups[gi];return g.slice().sort((x,y)=>{const a=ev.rr[x],b=ev.rr[y];return b.w-a.w||((b.sw-b.sl)-(a.sw-a.sl))||((b.gw-b.gl)-(a.gw-a.gl))||rankOf(P(x))-rankOf(P(y));});}

function applyResult(ev,m,winId,sets){
 m.w=winId;m.sets=sets;const loser=m.a===winId?m.b:m.a;
 if(ev.tier==='FIN'&&ev.cur<3){const W=ev.rr[winId],L=ev.rr[loser];W.w++;L.l++;for(const s of sets){const wa=m.a===winId;const gw=wa?s[0]:s[1],gl=wa?s[1]:s[0];W.gw+=gw;W.gl+=gl;L.gw+=gl;L.gl+=gw;if(gw>gl){W.sw++;L.sl++;}else{W.sl++;L.sw++;}}}
 else if(loser){ev.res[loser]=ev.cur;}
 const wp=P(winId),lp=P(loser);if(wp&&lp){wp.sw++;lp.sl++;}
}
function simMatchAI(ev,m){
 if(m.w||m.void)return;
 if(!m.a&&!m.b){m.void=true;return;}
 if(!m.b){m.w=m.a;return;} if(!m.a){m.w=m.b;return;}
 const A=P(m.a),B=P(m.b);
 // walkover: a player who got hurt earlier this week withdraws
 for(const [x,y] of [[A,B],[B,A]]){if(!x.isMe&&x.injury>=1&&x.injEv===ev.id&&RNG()<0.85){m.wo=true;applyResult(ev,m,y.id,[]);if(!S._silent&&injNotable(x))S.news.unshift({w:S.week,s:S.season,inj:1,t:`🚑 ${x.n} odstoupil před zápasem (${ev.name}) – ${injName(x).toLowerCase()}. ${y.n} postupuje bez boje.`});if(y.isMe)humanMatchRecorded(ev,m,true,{wo:1});return;}}
 const q=quickMatch(A,B,ev.surf,ev.bo,ev.cc);
 let w=q.w,sets=q.sets;
 const tt=CAL_BY_ID[ev.tid]||{surf:ev.surf,name:ev.name};
 const ia=matchInjury(A,tt,true,ev.bo),ib=matchInjury(B,tt,true,ev.bo);if(ia)A.injEv=ev.id;if(ib)B.injEv=ev.id;
 const retA=ia&&ia.ret,retB=ib&&ib.ret;
 if(retA||retB){const loser=retA&&retB?(RNG()<.5?A:B):(retA?A:B);w=loser===A?B.id:A.id;
  const keep=Math.max(1,rint(1,sets.length));sets=sets.slice(0,keep);const last=sets[sets.length-1];
  if(last){const lw=last[0]>last[1]?0:1;const hi=Math.max(last[0],last[1]);if(hi===6||hi===7){const k2=rint(0,5);sets[sets.length-1]=lw===0?[Math.min(5,last[0]),k2]:[k2,Math.min(5,last[1])];}}
  m.ret=loser.id;}
 else if(typeof retireHazard==='function'){const games=sets.reduce((n,s)=>n+(s[0]||0)+(s[1]||0),0);const long=games>=20||sets.length>=3;
  const cands=[[A,B],[B,A]].filter(([x])=>x&&!x.isMe);for(const [x,y] of cands){if(RNG()<retireHazard(x,{surf:ev.surf,week:S.week,bo:ev.bo,long})){w=y.id;m.ret=x.id;sets=typeof truncateSetsForRetire==='function'?truncateSetsForRetire(sets,x===A):sets;if(!S._silent&&injNotable(x))S.news.unshift({w:S.week,s:S.season,inj:1,t:`🚑 ${x.n} ${flag(x.cc)} skrečoval v zápase s ${y.n} (${ev.name}) – ${scoreTxtM({sets,ret:x.id,a:A.id,w:y.id})}.`});break;}}}
 applyResult(ev,m,w,sets);
 if(m.a==='me'||m.b==='me')humanMatchRecorded(ev,m,w==='me',null);
}
function roundComplete(ev){return ev.rounds[ev.cur].every(m=>m.w||m.void);}
function advanceRound(ev){
 const r=ev.rounds[ev.cur];
 if(ev.tier==='FIN'){
  if(ev.cur<2){ev.cur++;ev.rounds.push(rrRound(ev,ev.cur));return;}
  if(ev.cur===2){const A=rrStandings(ev,0),B=rrStandings(ev,1);for(const id of A.slice(2).concat(B.slice(2)))ev.res[id]='RR';ev.cur=3;ev.rounds.push([{a:A[0],b:B[1],w:null},{a:B[0],b:A[1],w:null}]);return;}
  if(ev.cur===3){for(const m of r){const l=m.a===m.w?m.b:m.a;ev.res[l]='SF';}ev.cur=4;ev.rounds.push([{a:r[0].w,b:r[1].w,w:null}]);return;}
  if(ev.cur===4){const m=r[0];ev.res[m.a===m.w?m.b:m.a]='F';ev.res[m.w]='W';ev.champ=m.w;ev.done=true;return;}
 }
 if(r.length===1){if(r[0].w)ev.res[r[0].w]=ev.nr;ev.champ=r[0].w;ev.done=true;return;}
 const nx=[];for(let i=0;i<r.length;i+=2)nx.push({a:r[i].w,b:r[i+1].w,w:null,sets:null});
 ev.cur++;ev.rounds.push(nx);
}
function simRoundAI(ev){for(const m of ev.rounds[ev.cur])if(!m.w)simMatchAI(ev,m);}
function finalizeEvent(ev,earned){
 let guard=0;while(!ev.done&&guard++<20){simRoundAI(ev);if(roundComplete(ev))advanceRound(ev);}
 const tier=TIERS[ev.tier];
 const award=(id,pts,prize)=>{earned[id]=(earned[id]||0)+pts;if(id==='me'){ME().money+=prize;ME().car.prize+=prize;ME().season0.prize+=prize;ev.myPrize=(ev.myPrize||0)+prize;ev.myPts=(ev.myPts||0)+pts;}};
 if(ev.tier==='FIN'){
  // ATP Finals: participation + per RR win + SF + final; 200/400/500 points. Prize money inflates with the season.
  const infl=prizeInfl(S.season),F=FIN_PRIZE_2026;
  for(const id in ev.rr){const r=ev.rr[id];let pts=r.w*200,prize=Math.round((F.entry+r.w*F.rr)*infl);const res=ev.res[id];if(res==='F'||res==='W'){pts+=400;prize+=Math.round(F.sf*infl);}if(res==='W'){pts+=500;prize+=Math.round(F.w*infl);}award(id,pts,prize);}
 } else {
  const tt=CAL_BY_ID[ev.tid]||{tier:ev.tier,draw:ev.draw,pm:ev.pm};const tab=tierTab(tt);
  for(const id in ev.res){const res=ev.res[id];let idx=ev.nr-res;if(res===1&&ev.byes&&ev.byes[id])idx=ev.nr;if(res===0&&ev.byes&&ev.byes[id])idx=ev.nr;award(id,tab.pts[idx]||0,evPrize(tt,idx));}
 }
 for(const id in ev.extra){const x=ev.extra[id];award(id,x.pts||0,x.prize||0);}
 const champ=P(ev.champ);if(champ){champ.titles++;}
 const fin=ev.rounds[ev.rounds.length-1][0];
 const ruId=fin?(fin.a===fin.w?fin.b:fin.a):null;const ru=ruId?P(ruId):null;
 S.results[ev.tid]={season:S.season,champ:ev.champ,champN:champ?champ.n:'?',champCC:champ?champ.cc:'',ru:ruId,ruN:ru?ru.n:'',score:fin?scoreTxtM(fin):''};
 if(!S._silent&&['GS','M1000','A500','FIN'].includes(ev.tier)&&champ){S.news.unshift({w:S.week,s:S.season,t:`🏆 ${champ.n} ${flag(champ.cc)} vyhrál ${ev.name}${ru?' – ve finále porazil '+ru.n:''} ${S.results[ev.tid].score}`});}
 if(ev.human)humanEventFinished(ev);
}

// ---------- weekly entries ----------
function activeBusy(){const b=new Set();for(const ev of S.events){if(!ev.done&&ev.end>=S.week)for(const id of ev.ent)if(id)b.add(id);}return b;}
function eventsThisWeek(){return CAL.filter(t=>t.week===S.week);}
function eligibility(t,p){
 p=p||ME();const tier=TIERS[t.tier];const r=p.rank||2500;const MAIN=evMain(t),QUAL=evQual(t);
 if(p.injury>0)return {mode:null,txt:'Jsi zraněný – nemůžeš startovat.'};
 if(t.tier==='FIN'){return r<=8?{mode:'main',txt:'Kvalifikován do Finále'}:{mode:null,txt:'Pouze top 8 žebříčku'};}
 if((t.tier==='M15'||t.tier==='M25')&&p.rank&&p.rank<=100)return {mode:null,txt:'Hráči z top 100 nesmí startovat na turnajích ITF'};
 if(t.tier[0]==='C'&&p.rank&&p.rank<=10)return {mode:null,txt:'Hráči z top 10 nesmí startovat na Challengerech'};
 if(r<=MAIN)return {mode:'main',txt:'Přímý postup do hlavní soutěže'};
 const home=t.cc===p.cc;
 if(home&&t.tier[0]==='C'){const lim=t.tier==='C50'||t.tier==='C75'?2400:t.tier==='C100'?1600:MAIN*2.8;if(!p.rank||r<=lim)return {mode:'wc',txt:'Divoká karta pro domácího hráče'};}
 if(home&&(t.tier==='M15'||t.tier==='M25'))return {mode:'main',txt:'Domácí turnaj ITF – hlavní soutěž'};
 if(home&&(t.tier==='A250')&&r<=400)return {mode:'wc',txt:'Divoká karta pro domácího hráče'};
 const pop=p.pop||0;const WCP={A250:[35,400],A500:[50,260],M1000:[60,240],GS:[72,300],C175:[30,500],C125:[25,700],C100:[20,800],C75:[15,900],C50:[12,1200]}[t.tier];
 if(WCP&&pop>=WCP[0]-(home?10:0)&&r<=WCP[1]&&r>MAIN)return {mode:'wc',txt:`Divoká karta díky popularitě (❤️ ${Math.round(pop)})`};
 if(tier.qr>0&&r<=QUAL)return {mode:'qual',txt:`Kvalifikace (${tier.qr} kola)`};
 return {mode:null,txt:`Potřebuješ žebříček do ${QUAL<9999?QUAL:MAIN}. místa (kvalifikace) / ${MAIN}. (hlavní soutěž)`};
}
function travelCost(t,p){p=p||ME();const c=COUNTRIES[p.cc];const d=distKm(c[2],c[3],t.lat,t.lon);let cost=180+d*0.11;if(['GS','M1000','FIN'].includes(t.tier))cost*=0.65;if(t.tier==='M15'||t.tier==='M25')cost*=0.48;if(t.tier[0]==='C')cost*=0.75;if(t.cc===p.cc)cost*=0.5;if(t.tier==='FIN'||t.tier==='DC')cost=0;return Math.round(Math.min(cost,2600)/10)*10;}
function distKm(a,b,c,d){const R=6371,toR=Math.PI/180;const x=Math.sin((c-a)*toR/2)**2+Math.cos(a*toR)*Math.cos(c*toR)*Math.sin((d-b)*toR/2)**2;return 2*R*Math.asin(Math.sqrt(x));}

function aiWants(p,t,r){
 const tier=t.tier;const age=S.season-p.by;let skip=0.12;
 if(tier==='GS')skip=0.015;else if(tier==='M1000')skip=0.04;
 else if(tier==='A500')skip=r<=10?0.35:0.15;
 else if(tier==='A250')skip=r<=10?0.8:r<=30?0.35:0.12;
 else if(tier[0]==='C')skip=r<=50?0.75:r<=100?0.3:0.14;
 else skip=0.22;
 if(r>150&&tier[0]!=='M')skip=Math.max(skip,0.18);
 if(age>=34)skip+=0.15;
 if((p.load||0)>9)skip+=0.25;
 return RNG()>skip;
}
// number of qualifiers in the main draw (approximate real formats)
function nQualifiers(t){const d=t.draw;if(t.tier==='GS')return 16;if(t.tier==='M1000')return d>=96?12:7;if(t.tier==='A500')return d>=48?8:4;if(t.tier==='A250')return d>=48?8:4;if(t.tier[0]==='C')return 4;if(t.tier==='M25')return 6;return 0;}
function evCapacity(t){const d=t.draw||32;const q=nQualifiers(t);const qr=TIERS[t.tier].qr;return d+(q&&qr?q*((1<<qr)-1):0);}
const minRankFor=t=>({C175:25,C125:40,C100:60,C75:85,C50:110}[t.tier]||0);
function startWeek(silent){
 if(S.weekStarted)return;
 const busy=activeBusy();
 const ts=eventsThisWeek();
 const order=S.order.map(P).filter(p=>p&&!p.retired);
 const ent={};for(const t of ts)ent[t.id]=[];
 const me=ME();let humanEv=null;
 for(const p of order)if(p.injury>0&&!p.isMe)busy.add(p.id);
 // ATP Finals: top 8 healthy players
 const fin=ts.find(t=>t.tier==='FIN');
 if(fin){let top=order.filter(p=>!busy.has(p.id)&&p.rank&&!(p.injury>0)).slice(0,9);if(me.injury>0)top=top.filter(p=>!p.isMe);
  top=top.slice(0,8);ent[fin.id]=top.map(p=>p.id);top.forEach(p=>busy.add(p.id));if(ent[fin.id].includes('me')){S.plan={tid:fin.id,mode:'main'};}
  if(!silent){const miss=order.slice(0,8).filter(p=>p.injury>0&&!p.isMe);for(const p of miss)S.news.unshift({w:S.week,s:S.season,t:`🩹 ${p.n} ${flag(p.cc)} kvůli zranění (${injName(p)}) vynechá ATP Finals.`});}}
 if(!silent&&S.plan&&me.injury<=0&&S.plan.tid!==(fin&&fin.id)){
  const t=CAL_BY_ID[S.plan.tid];if(t&&t.week===S.week){ent[t.id].push('me');busy.add('me');humanEv=t.id;me.money-=travelCost(t);}
 } else if(fin&&ent[fin.id].includes('me'))humanEv=fin.id;
 busy.add('me');
 const tsSorted=ts.filter(t=>t.tier!=='FIN').sort((a,b)=>TIERS[b.tier].rankOrd-TIERS[a.tier].rankOrd||(b.pm||0)-(a.pm||0));
 const isITF=t=>t.tier==='M15'||t.tier==='M25';
 const tryEnter=(p,r,itf)=>{
  const cands=[];
  for(const t of tsSorted){if(isITF(t)!==itf)continue;if(ent[t.id].length>=evCapacity(t))continue;
   const Q=evQual(t),M=evMain(t);
   if(t.tier[0]==='C'){if(r>Q*1.15||r<minRankFor(t))continue;}
   else if(t.tier==='M25'){if(r<190)continue;}
   else if(t.tier==='M15'){if(r<300)continue;}
   else if(r>(TIERS[t.tier].qr?Q*1.1:M*1.15+8))continue;
   cands.push(t);}
  if(!cands.length)return false;
  const top=TIERS[cands[0].tier].rankOrd;const best=cands.filter(t=>TIERS[t.tier].rankOrd===top);
  const t=best.find(x=>x.cc===p.cc)||pick(best);
  if(!aiWants(p,t,r))return true;
  ent[t.id].push(p.id);busy.add(p.id);return true;};
 const left=[];let ri=0;
 for(const p of order){ri++;if(busy.has(p.id))continue;const r=p.rank||ri;if(!tryEnter(p,r,false))left.push([p,r]);}
 shuffle(left);for(const [p,r] of left){if(!busy.has(p.id))tryEnter(p,r,true);}
 for(const t of ts){
  if(t.tier==='FIN'){if(ent[t.id].length===8){const ev=createEvent(t,ent[t.id]);S.events.push(ev);if(humanEv===t.id){ev.human=true;S.cur={ev:ev.id,stage:'main',status:'alive',qual:null,last:-1};}}continue;}
  if(ent[t.id].length<4)continue;
  let list=ent[t.id].slice();
  const isHuman=humanEv===t.id;
  if(isHuman){list=list.filter(id=>id!=='me');}
  list.sort((a,b)=>rankOf(P(a))-rankOf(P(b))||ovr(P(b))-ovr(P(a)));
  const D=t.draw||32;const tier=TIERS[t.tier];
  // AI qualifying: next-ranked players play qualifying rounds for the qualifier spots
  let nQ=Math.min(nQualifiers(t),Math.max(0,list.length-D+nQualifiers(t)));const qres={};
  if(isHuman&&S.plan.mode==='qual')nQ=Math.max(0,nQ-1);
  let direct=list.slice(0,D-(tier.qr?nQualifiers(t):0)-(isHuman?1:0));
  let qpool=tier.qr?list.slice(direct.length,direct.length+nQ*(1<<tier.qr)):[];
  const qualifiers=[];
  if(qpool.length>=2&&nQ>0){
   const per=Math.max(1,Math.floor(qpool.length/nQ));
   for(let g=0;g<nQ;g++){let grp=qpool.slice(g*per,(g+1)*per);if(g===nQ-1)grp=qpool.slice(g*per);
    let k=0;while(grp.length>1&&k<tier.qr){const nx=[];for(let i=0;i<grp.length;i+=2){if(i+1>=grp.length){nx.push(grp[i]);continue;}const a=P(grp[i]),b=P(grp[i+1]);const q=quickMatch(a,b,t.surf,3,t.cc);const l=q.w===a.id?b.id:a.id;qres[l]=k;nx.push(q.w);matchInjury(q.w===a.id?b:a,t,false);}grp=nx;k++;}
    if(grp[0])qualifiers.push(grp[0]);}
  } else direct=list.slice(0,D-(isHuman?1:0));
  let mainList=direct.concat(qualifiers);
  if(mainList.length<D){const extra=list.filter(id=>!mainList.includes(id)&&qres[id]==null).slice(0,D-mainList.length-(isHuman?1:0));mainList=mainList.concat(extra);}
  if(isHuman){mainList=mainList.slice(0,D-1);mainList.push('me');if(S.plan.mode==='main'||S.plan.mode==='wc'){mainList.sort((a,b)=>rankOf(P(a))-rankOf(P(b))||ovr(P(b))-ovr(P(a)));}}
  const ev=createEvent(t,mainList);
  ev.ent=mainList.concat(Object.keys(qres));
  const tab=tierTab(t);
  for(const id in qres){const k=qres[id];ev.extra[id]={pts:tab.qpts[tier.qr-k]||0,prize:evQPrize(t,tier.qr-1-k)};}
  for(const id of qualifiers)ev.extra[id]={pts:tab.qpts[0]||0,prize:0,q:1};
  S.events.push(ev);
  if(isHuman){ev.human=true;
   const mode=S.plan.mode;S.cur={ev:ev.id,stage:'main',status:'alive',qual:null,mode,last:-1};
   if(mode==='qual'){const free=order.filter(p=>!busy.has(p.id)&&p.rank&&!p.isMe&&!(p.injury>0));
    const maxR=free.reduce((a,p)=>Math.max(a,p.rank),0);const target=Math.min(evMain(t)*1.35+10,maxR-20);
    const poolQ=free.slice().sort((a,b)=>Math.abs(a.rank-target)-Math.abs(b.rank-target)).slice(0,14);
    const opps=shuffle(poolQ).slice(0,tier.qr).sort((a,b)=>rankOf(b)-rankOf(a)).map(p=>p.id);
    opps.forEach(id=>busy.add(id));
    S.cur.stage='qual';S.cur.qual={opps,i:0};ev.ent.push(...opps);}
  }
 }
 S.weekStarted=true;
}

function humanEvent(){if(!S.cur)return null;return S.events.find(e=>e.id===S.cur.ev)||null;}
// next opponent for human, or null
function humanNextMatch(){
 const ev=humanEvent();if(!ev||S.cur.status!=='alive')return null;
 if(S.cur.stage==='qual'){return {qual:true,opp:S.cur.qual.opps[S.cur.qual.i],round:'Kvalifikace '+(S.cur.qual.i+1)+'. kolo'};}
 const m=ev.rounds[ev.cur].find(m=>(m.a==='me'||m.b==='me')&&!m.w);
 if(!m){return null;}
 const opp=m.a==='me'?m.b:m.a;
 if(!opp){return {bye:true,m,round:evRoundName(ev,ev.cur)};}
 return {m,opp,round:evRoundName(ev,ev.cur)};
}
// process the human's match result (from live match or quick sim)
function humanQualResult(won,matchInfo){
 const ev=humanEvent();const q=S.cur.qual;const tier=TIERS[ev.tier];const tt=CAL_BY_ID[ev.tid];const tab=tierTab(tt);const opp=q.opps[q.i];
 recordHumanMatch(ev,opp,won,matchInfo,true);
 if(won){q.i++;if(q.i>=tier.qr){S.cur.stage='main';ev.extra.me={pts:tab.qpts[0]||0,prize:0};S.news.unshift({w:S.week,s:S.season,t:`✅ Prošel jsi kvalifikací turnaje ${ev.name}!`});}}
 else{
  const k=q.i;const pts=tab.qpts[tier.qr-k]||0;const prize=evQPrize(tt,tier.qr-1-k);
  ev.extra.me={pts,prize};
  // the opponent who beat the human takes the spot in the main draw
  for(const m of ev.rounds[0]){if(m.a==='me')m.a=opp;if(m.b==='me')m.b=opp;}
  ev.ent=ev.ent.map(x=>x==='me'?opp:x);ev.ent.push('me');
  S.cur.status='out';S.cur.lostAt='Q'+(k+1);ev.myLostAt='Q'+(k+1);
 }
}
function humanMainResult(won,setsMe,matchInfo){
 const ev=humanEvent();const nm=humanNextMatch();if(!nm||!nm.m)return;
 const m=nm.m;const winId=won?'me':nm.opp;
 const sets=m.a==='me'?setsMe:setsMe.map(s=>[s[1],s[0],s[2]]);
 const wasRR=ev.tier==='FIN'&&ev.cur<3;
 applyResult(ev,m,winId,sets);
 recordHumanMatch(ev,nm.opp,won,matchInfo,false);
 S.cur.last=ev.cur;
 // finish remaining matches of the round
 simRoundAI(ev);
 if(roundComplete(ev))advanceRound(ev);
 if(ev.done&&ev.champ==='me')S.cur.status='champ';
 else if(wasRR){if(ev.res.me==='RR')S.cur.status='out';}
 else if(!won)S.cur.status='out';
 // energy recovery between rounds
 const me=ME();me.energy=clamp(me.energy+10+(me.physio!=null?me.physio:me.fyzio)*4+(me.fitness||0)*3,0,100);
}
function humanByeAdvance(){const ev=humanEvent();const nm=humanNextMatch();if(nm&&nm.bye){nm.m.w='me';simRoundAI(ev);if(roundComplete(ev))advanceRound(ev);}}
function humanMatchRecorded(ev,m,won,info){/* used if a human match is auto-simmed at finalize */ const opp=m.a==='me'?m.b:m.a;recordHumanMatch(ev,opp,won,info,false);}
function recordHumanMatch(ev,oppId,won,info,isQual){
 const me=ME();const c=me.car;const o=P(oppId);
 c.matches++;if(won){c.w++;me.season0.w++;c.streak++;c.bestStreak=Math.max(c.bestStreak,c.streak);c.surf[ev.surf][0]++;if(o&&o.rank&&o.rank<=10)c.top10++;}
 else{c.l++;me.season0.l++;c.streak=0;c.surf[ev.surf][1]++;}
 me.h2h[oppId]=me.h2h[oppId]||[0,0];me.h2h[oppId][won?0:1]++;
 if(info){c.aces+=info.aces||0;c.df+=info.df||0;c.longest=Math.max(c.longest,info.longest||0);c.tb[0]+=info.tbw||0;c.tb[1]+=info.tbl||0;}
 const xpBase={M15:8,M25:9,C50:10,C75:11,C100:12,C125:13,A250:15,A500:17,M1000:19,GS:22,FIN:24}[ev.tier]||10;
 const mult=won?0.4:0.15;for(const k of STAT_KEYS)addXp(k,xpBase*mult,true);
 {const tf=POP_TF[ev.tier]||1;const home=ev.cc===me.cc?1.5:1;const mr=me.rank||1500,or=o&&o.rank?o.rank:1500;
  if(won){let g=0.15*tf;if(or<mr)g+=Math.min(2,Math.log2(mr/or))*0.35*tf;if(or<=10)g+=1.5;addPop(g*home);}
  else{let l=0.25+(or>mr*2?0.3:0);addPop(-l);}}
 me.lastMatch={ev:ev.name,opp:o?o.n:'?',won,score:info&&info.score,round:isQual?'Kval.':evRoundName(ev,ev.cur)};
 checkAchievements();
}
function humanEventFinished(ev){
 const me=ME();let res=ev.res.me;let name;
 if(ev.tier==='FIN')name=resultName(ev,res||'RR');
 else if(res==null){name=ev.myLostAt?'Kvalifikace ('+ev.myLostAt+')':'—';}
 else name=resultName(ev,res);
 if(ev.champ==='me'&&ev.tier!=='DC'&&!ev.dbl){me.car.titleList.push({s:S.season,tid:ev.tid,name:ev.name,tier:ev.tier,surf:ev.surf});me.season0.titles++;}
 {const tb=POP_TITLE[ev.tier]||1;const home=ev.cc===me.cc?1.6:1;let g=0;
  if(ev.champ==='me')g=tb;else if((ev.tier!=='FIN'&&res===ev.nr-1)||res==='F')g=tb*0.4;else if((ev.tier!=='FIN'&&res===ev.nr-2&&TIERS[ev.tier].rankOrd>=2)||res==='SF')g=tb*0.2;
  if(g>0){const d=addPop(g*home);ev.myPop=d;}}
 if(ev.tier!=='FIN'&&res===ev.nr-1)me.car.finals++;
 if(ev.tier==='FIN'&&res==='F')me.car.finals++;
 me.hist.unshift({s:S.season,w:ev.week,name:ev.name,tier:ev.tier,surf:ev.surf,res:name,pts:ev.myPts||0,prize:ev.myPrize||0});
 if(me.hist.length>300)me.hist.length=300;
 if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:ev.champ==='me'?`🏆 TITUL! ${me.n} vyhrál ${ev.name}! +${ev.myPts} bodů, ${fmtMoney(ev.myPrize||0)}`:`${ev.name}: ${name} · +${ev.myPts||0} bodů · ${fmtMoney(ev.myPrize||0)}`});
 checkAchievements();
}
// How many weeks the calendar moves on after the human's tournament run ends
function weeksToAdvance(){const ev=humanEvent();if(!ev)return 1;if(ev.len<2)return 1;const last=S.cur.stage==='qual'||S.cur.last<0?0:S.cur.last;const split=ev.tier==='FIN'?99:3;if(S.cur.status==='champ'||last>=split)return Math.max(1,ev.end-S.week+1);return 1;}

function sponsorIncome(r){if(!r)return 250;return r<=1?30000:r<=5?18000:r<=10?11000:r<=20?6000:r<=50?3000:r<=100?1500:r<=200?700:r<=400?400:300;}
const COACH_SAL=[0,250,700,1800,4200,8500],FYZIO_SAL=[0,300,900,2400],MENT_SAL=[0,250,800,2000];
function weeklyCosts(me){return COACH_SAL[me.coach]+FYZIO_SAL[me.fyzio]+MENT_SAL[me.mental];}

function endWeek(silent){
 if(!S.weekStarted)startWeek(silent);
 const earned={};
 const me=ME();const played=S.cur&&S.events.some(e=>e.id===S.cur.ev);
 for(const ev of S.events.slice()){if(!ev.done&&ev.end===S.week)finalizeEvent(ev,earned);else if(ev.done&&ev.end===S.week)finalizeEvent(ev,earned);}
 S.events=S.events.filter(e=>e.end>S.week);
 const wi=S.week-1;
 for(const p of S.players)p.pw[wi]=earned[p.id]||0;
 for(const p of S.players)p.prev=p.rank;
 computeRanks();
 if(!silent){
  // human weekly upkeep
  if(me.pop==null){me.pop=2;me.spons={};}
  addPop((played?-0.12:-0.4)-(me.pop||0)*0.004);updateSponsors(me);
  const spn=sponsorPay(me);const inc=sponsorIncome(me.rank)+spn,cost=weeklyCosts(me);
  me.money+=inc-cost;
  me.popHist=me.popHist||[];me.popHist.push(Math.round(me.pop*10)/10);if(me.popHist.length>52)me.popHist.shift();
  S.lastWeek={inc,spn,cost,earned:earned.me||0,rank:me.rank,prev:me.prev};
  me.energy=clamp(me.energy+(played?34:50)+me.fyzio*8,0,100);me.wkStreak=played?(me.wkStreak||0)+1:0;
  me.slots=3+(me.coach>=3?1:0)+(me.coach>=5?1:0);
  if(me.money<-5000){if(me.coach>1||me.fyzio||me.mental){me.coach=1;me.fyzio=0;me.mental=0;S.news.unshift({w:S.week,s:S.season,t:'💸 Došly peníze — tým jsi musel propustit.'});}}
  if(S.cur&&S.cur.status!=='alive'){const ev=humanEvent();if(!ev||ev.end<=S.week)S.cur=null;}
  if(S.cur&&!S.events.find(e=>e.id===S.cur.ev))S.cur=null;
  S.plan=null;
  if(me.rank&&me.prev!==me.rank&&me.rank<=100&&(!me.prev||me.prev>100))S.news.unshift({w:S.week,s:S.season,t:`📈 Jsi v TOP 100 žebříčku ATP! (${me.rank}.)`});
 }
 for(const p of S.players){if(!p.isMe)p.form=clamp(p.form*0.72+gauss()*1.35,-5.5,5.5);}
 weeklyInjuries(silent);
 S.weekStarted=false;
 S.week++;
 if(S.week>52)seasonEnd(silent);
 if(!silent){checkAchievements();if(S.news.length>80)S.news.length=80;saveGame();}
}
function weeklyInjuries(silent){
 const me=ME();
 for(const p of S.players){if(p.retired)continue;
  p.load=(p.load||0)*0.62;
  if(p.injury>0){p.injury=Math.max(0,p.injury-(p.isMe?1+0.1*(p.fyzio||0):1));
   if(p.injury<=0){p.injury=0;if(!silent&&!S._silent){if(p.isMe)S.news.unshift({w:S.week,s:S.season,inj:1,t:`💪 Jsi zdravý! Zranění (${injName(p).toLowerCase()}) je vyléčené.`});else if(p.rank&&p.rank<=40&&(p.injTot||0)>=4)S.news.unshift({w:S.week,s:S.season,inj:1,t:`✅ ${p.n} ${flag(p.cc)} se po ${Math.round(p.injTot)} týdnech vrací po zranění.`});}}
   continue;}
  const age=S.season-p.by;let r=0.0021*ageInjF(age);
  if(p.isMe){const streak=me.wkStreak||0;r=0.0016*ageInjF(age)*(1+Math.max(0,streak-3)*0.35)*(me.energy<30?1.8:1)*(1-0.12*(me.fyzio||0));if(silent)r=0;}
  if(RNG()<r){const i=pickInj('w');const w=Math.max(1,injWeeksFor(i,p));applyInjury(p,i,w,p.isMe?'mimo kurt':'');if(p.isMe&&!silent){S.news.unshift({w:S.week,s:S.season,inj:1,t:`🤒 ${INJ_TYPES[i][0]} – musíš vynechat ${injWeeksTxt(p)}.`});S.injAlert={i,w,ctx:'week'};}}
 }
}
function seasonEnd(silent){
 const me=ME();
 const rec={s:S.season,rank:me.rank,w:me.season0.w,l:me.season0.l,titles:me.season0.titles,prize:me.season0.prize,ov:Math.round(ovr(me)),best:me.best,pts:totalPts(me)};
 if(!silent){me.seasons.unshift(rec);me.season0={w:0,l:0,titles:0,prize:0};S.seasonRecap=rec;}
 S.season++;S.week=1;
 setCalendar(S.season);
 if(silent)return;
 // AI development, retirement, newcomers
 let gi=0;
 for(const p of S.players){if(p.isMe||p.retired)continue;const age=S.season-p.by;
  let d=age<=19?rnd(1.2,3.6):age<=22?rnd(0.4,2.4):age<=26?rnd(-0.3,1.1):age<=29?rnd(-0.6,0.5):age<=32?rnd(-1.4,0.1):rnd(-2.8,-0.7);
  if(age<=25&&d>0)d*=(p.pot||1);
  {const o=ovr(p);if(d>0&&o>=86)d*=0.35;else if(d>0&&o>=82)d*=0.7;}
  for(const k of STAT_KEYS){let dd=d+gauss()*0.5;if(k==='kon'&&age>30)dd-=0.6;if(k==='men'&&age>24)dd+=0.3;p.st[k]=clamp(p.st[k]+dd,20,99);}
  let ret=age>=41?1:age>=38?0.6:age>=35?0.3:(age>=30&&(!p.rank||p.rank>350))?0.25:0;
  if(RNG()<ret){p.retired=true;if((p.best&&p.best<=60)||(p.rank&&p.rank<=150)||(p.cc===me.cc&&p.rank&&p.rank<=600)||STAR[p.n])S.news.unshift({w:1,s:S.season,t:`👋 ${p.n} ${flag(p.cc)} ukončil kariéru (${age} let).`});}
  p.sw=0;p.sl=0;
 }
 const retiredN=S.players.filter(p=>p.retired).length;
 S.players=S.players.filter(p=>!p.retired||false);
 for(let i=0;i<retiredN+12;i++)S.players.push(makeGenPlayer(9000+i+S.season*50,0,S.season,true));
 rebuildIndex();computeRanks();
 S.news.unshift({w:1,s:S.season,t:`🎆 Začíná sezóna ${S.season}! Kalendář se posunul na nové termíny, prize money stouply o 3,5 %. Je ti ${S.season-me.by} let.`});
}

// ---------- training & team ----------
const TRAIN_TYPES={
 lehky:{name:'Lehký trénink',en:6,cost:80,xp:15,icon:'🎾'},
 tvrdy:{name:'Intenzivní trénink',en:14,cost:260,xp:30,icon:'💪'},
 kemp:{name:'Kemp s expertem',en:24,cost:1400,xp:70,icon:'⭐'}
};
const xpNeed=v=>16+v*0.72+Math.max(0,v-58)**2*0.065;
const ageMult=a=>a<=21?1.32:a<=25?1.08:a<=28?0.88:a<=31?0.62:0.42;
const COACH_MULT=[0,1,1.2,1.4,1.6,1.85];
function addXp(k,amount,raw){const me=ME();const age=S.season-me.by;let g=amount*(raw?1:COACH_MULT[me.coach])*ageMult(age);me.xp[k]+=g;let ups=0;while(me.xp[k]>=xpNeed(me.st[k])&&me.st[k]<99){me.xp[k]-=xpNeed(me.st[k]);me.st[k]=Math.min(99,Math.round(me.st[k])+1);ups++;}return {g,ups};}
function train(k,type){const me=ME();const t=TRAIN_TYPES[type];
 if(me.injury>0)return {ok:false,msg:'Jsi zraněný, trénink není možný.'};
 if(S.cur&&S.cur.status==='alive')return {ok:false,msg:'Během turnaje můžeš jen hrát.'};
 if(me.slots<=0)return {ok:false,msg:'Tento týden už nemáš volné tréninkové bloky.'};
 if(me.energy<t.en)return {ok:false,msg:'Nedostatek energie.'};
 if(me.money<t.cost)return {ok:false,msg:'Nedostatek peněz.'};
 me.energy-=t.en;me.money-=t.cost;me.slots--;
 const r=addXp(k,t.xp*(me.energy<25?0.6:1)*rnd(0.9,1.15));
 let inj='';{const age=S.season-me.by;const base={lehky:0.0008,tvrdy:0.0045,kemp:0.01}[type]||0.002;const r=base*ageInjF(age)*(me.energy<15?3:me.energy<30?2:1)*(1-0.12*(me.fyzio||0));
  if(RNG()<r){const i=pickInj('t');const w=Math.max(1,injWeeksFor(i,me));applyInjury(me,i,w,'při tréninku');inj=` 🤕 Zranění při tréninku: ${INJ_TYPES[i][0]} (${injWeeksTxt(me)})!`;S.news.unshift({w:S.week,s:S.season,inj:1,t:`🤕 Zranění při tréninku – ${INJ_TYPES[i][0].toLowerCase()}, pauza ${injWeeksTxt(me)}.`});S.injAlert={i,w,ctx:'train'};}}
 saveGame();
 return {ok:true,msg:`${STAT_NAMES[k]}: +${Math.round(r.g)} XP`+(r.ups?` · ⬆️ úroveň ${Math.round(me.st[k])}!`:'')+inj,ups:r.ups};
}
function rest(kind){const me=ME();if(me.slots<=0)return {ok:false,msg:'Žádné volné bloky tento týden.'};
 if(kind==='spa'){if(me.money<450)return {ok:false,msg:'Nedostatek peněz.'};me.money-=450;me.energy=clamp(me.energy+40+(me.physio!=null?me.physio:me.fyzio)*5+(me.fitness||0)*4,0,100);}
 else me.energy=clamp(me.energy+22+(me.physio!=null?me.physio:me.fyzio)*4+(me.fitness||0)*3,0,100);
 me.slots--;saveGame();return {ok:true,msg:'Energie doplněna.'};}
const SHOP={
 coach:{name:'Trenér',icon:'🧢',max:5,cost:[0,0,9000,35000,130000,420000],desc:l=>`Úroveň ${l}: trénink ×${COACH_MULT[l]}, odemyká karty, ${fmtMoney(COACH_SAL[l])}/týden`},
 fyzio:{name:'Kondiční trenér & fyzio',icon:'🩺',max:3,cost:[0,6000,28000,95000],desc:l=>`Regenerace +${l*8}/týden, riziko zranění −${l*13} %, rychlejší léčba, ${fmtMoney(FYZIO_SAL[l])}/týden`},
 mental:{name:'Mentální kouč',icon:'🧠',max:3,cost:[0,7000,32000,110000],desc:l=>`Mentalita +${l*2} v zápasech, ${fmtMoney(MENT_SAL[l])}/týden`},
 raketa:{name:'Raketa',icon:'🏸',max:3,cost:[0,1500,6500,22000],desc:l=>`Forhend a bekhend +${l}`,gear:true},
 boty:{name:'Boty',icon:'👟',max:3,cost:[0,800,3600,12000],desc:l=>`Kondice +${l}, menší únava`,gear:true},
 vyplet:{name:'Výplet',icon:'🧵',max:3,cost:[0,600,3000,10000],desc:l=>`Podání a return +${l}`,gear:true}
};
function shopLevel(k){const me=ME();return SHOP[k].gear?me.gear[k]:me[k];}
function buy(k){const me=ME();const it=SHOP[k];const l=shopLevel(k);if(l>=it.max)return {ok:false,msg:'Maximum.'};const c=it.cost[l+1];if(me.money<c)return {ok:false,msg:'Nedostatek peněz.'};me.money-=c;if(it.gear)me.gear[k]++;else me[k]++;saveGame();checkAchievements();return {ok:true,msg:`${it.name} vylepšen na úroveň ${l+1}.`};}

// ---------- achievements ----------
const ACH={
 first_win:['První výhra','Vyhraj první profesionální zápas','🎾'],
 first_title:['První titul','Vyhraj jakýkoli turnaj','🏆'],
 ch_title:['Challenger šampion','Vyhraj Challenger','🥉'],
 atp_title:['ATP titul','Vyhraj turnaj ATP 250/500','🥈'],
 m1000:['Masters','Vyhraj turnaj Masters 1000','👑'],
 gs:['Grandslamový vítěz','Vyhraj Grand Slam','💎'],
 finals:['Turínský mistr','Vyhraj ATP Finals','🌟'],
 top500:['Top 500','Pronikni do top 500','📊'],
 top100:['Top 100','Pronikni do top 100','💯'],
 top10:['Top 10','Pronikni do top 10','🔟'],
 no1:['Světová jednička','Staň se č. 1 na světě','🥇'],
 beat10:['Skalp','Poraz hráče z top 10','⚔️'],
 streak10:['Neporazitelný','Vyhraj 10 zápasů v řadě','🔥'],
 million:['Milionář','Vydělej $1 000 000 na prize money','💰'],
 coach5:['Hvězdný tým','Trenér na maximální úrovni','🧢'],
 rally30:['Maraton','Odehraj výměnu o 30+ úderech','♾️'],
 pop50:['Miláček publika','Dosáhni popularity 50','❤️'],
 pop90:['Superstar','Dosáhni popularity 90','🌟'],
 career_slam:['Kariérní Grand Slam','Vyhraj všechny 4 grandslamy','🌍']
};
function checkAchievements(){const me=ME();if(!me)return;const a=me.ach;const c=me.car;const tl=c.titleList;const got=k=>{if(!a[k]){a[k]={s:S.season,w:S.week};if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:`🏅 Úspěch: ${ACH[k][0]}`});}};
 if(c.w>0)got('first_win');if(tl.length)got('first_title');if(tl.some(t=>t.tier[0]==='C'))got('ch_title');if(tl.some(t=>t.tier==='A250'||t.tier==='A500'))got('atp_title');
 if(tl.some(t=>t.tier==='M1000'))got('m1000');if(tl.some(t=>t.tier==='GS'))got('gs');if(tl.some(t=>t.tier==='FIN'))got('finals');
 const r=me.rank;if(r&&r<=500)got('top500');if(r&&r<=100)got('top100');if(r&&r<=10)got('top10');if(r===1)got('no1');
 if(c.top10>0)got('beat10');if(c.bestStreak>=10)got('streak10');if(c.prize>=1e6)got('million');if(me.coach>=5)got('coach5');if(c.longest>=30)got('rally30');if((me.pop||0)>=50)got('pop50');if((me.pop||0)>=90)got('pop90');
 if(['t580','t520','t540','t560'].every(id=>tl.some(t=>t.tid===id)))got('career_slam');}

// ---------- daily challenge ----------
function dailyFor(dateStr){
 const rng=mulberry32(hashStr(dateStr));const top=S.order.map(P).filter(p=>p&&!p.isMe&&p.rank&&p.rank<=60);
 const opp=top[Math.floor(rng()*top.length)];const surf=['H','C','G','I'][Math.floor(rng()*4)];
 const types=[['games',()=>{const n=2+Math.floor(rng()*3);return {n,txt:`Uhraj v jednom setu alespoň ${n} gamy`};}],['aces',()=>{const n=2+Math.floor(rng()*2);return {n,txt:`Zahraj alespoň ${n} esa`};}],['rally',()=>{const n=10+Math.floor(rng()*6);return {n,txt:`Vyhraj výměnu o délce alespoň ${n} úderů`};}],['break',()=>({n:1,txt:'Prolom soupeři alespoň jednou podání'})],['set',()=>({n:1,txt:'Vyhraj set!'})]];
 const ty=types[Math.floor(rng()*types.length)];const g=ty[1]();
 const stat=STAT_KEYS[Math.floor(rng()*6)];
 return {date:dateStr,opp:opp?opp.id:null,surf,type:ty[0],n:g.n,txt:g.txt,reward:{money:1500+Math.floor(rng()*6)*500,stat,xp:35},done:false};
}
function todayStr(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function getDaily(){const t=todayStr();if(!S.daily||S.daily.date!==t)S.daily=dailyFor(t);if(!S.daily.opp||!P(S.daily.opp))S.daily=dailyFor(t+'x');return S.daily;}
function dailyCheck(m){const d=S.daily;const st=m.st[0];switch(d.type){case 'games':return m.totalGames(0)>=d.n;case 'aces':return st.aces>=d.n;case 'rally':return st.longestWon>=d.n;case 'break':return st.bpW>=1;case 'set':return m.setsW[0]>=1;}return false;}

// ---------- point-by-point match engine ----------
// Calibrated to real ATP tour-level averages 2013–2026 (atptour.com stats, players with 50+ service games per surface):
// hard 1st in 62 %, 1st won 73 %, 2nd won 51 %, hold 81 %, 0.57 aces/game · clay 63/69/51/77 %, 0.35 aces · grass 63/74.5/52/84 %, 0.61 aces
const SURF_P={ // fi, p1 (1st-serve point won), p2c (2nd serve point won if in), ace per 1st-in, unreturned per 1st-in, df per 2nd, rally mean extra shots
 H:{fi:.635,p1:.735,p2:.562,ace:.112,un:.17,df:.093,rl:2.9},
 C:{fi:.626,p1:.722,p2:.54,ace:.083,un:.13,df:.086,rl:3.0},
 G:{fi:.645,p1:.765,p2:.568,ace:.122,un:.2,df:.092,rl:2.4},
 I:{fi:.64,p1:.75,p2:.565,ace:.118,un:.19,df:.09,rl:2.6}};
const RALLY_ADJ={H:0,C:0,G:0,I:0};
let EDGE_K=0.00095;
const SURF_W={H:[.5,.3,.2],C:[.38,.37,.25],G:[.58,.27,.15],I:[.55,.28,.17]};
const TACTICS={bal:{name:'Neutrálně',icon:'⚖️'},atk:{name:'Agresivně',icon:'⚔️'},def:{name:'Defenzivně',icon:'🛡️'}};
const ATK_F={G:1.6,I:1.3,H:1,C:.5},DEF_F={C:1.6,H:1,I:.7,G:.5};
const NET_F={G:1.6,I:1.1,H:1,C:.5},DROP_F={C:1.4,H:1,I:.9,G:.8};
const TAC_DEF={srvDir:'mix',srvRisk:1,retPos:'norm',rally:'bal',dir:'mix',net:0,drop:0,target:'none',pace:'norm'};
const TAC_OPTS={
 rally:{name:'Styl výměn',icon:'⚔️',o:[['def','🛡️ Obrana'],['bal','⚖️ Neutrál'],['atk','⚔️ Útok']]},
 dir:{name:'Směr úderů',icon:'↗️',o:[['cross','↘️ Křižně'],['mix','🔀 Mix'],['line','⬆️ Po lajně']]},
 target:{name:'Cílit na',icon:'🎯',o:[['none','— nic'],['fh','Forhend'],['bh','Bekhend']]},
 net:{name:'Nálety na síť',icon:'🏃',o:[[0,'Málo'],[1,'Občas'],[2,'Často']]},
 drop:{name:'Kraťasy a slajs',icon:'🪶',o:[[0,'Málo'],[1,'Občas'],[2,'Často']]},
 pace:{name:'Tempo hry',icon:'⏱️',o:[['slow','🐢 Pomalé'],['norm','Normální'],['fast','⚡ Rychlé']]},
 srvDir:{name:'Umístění podání',icon:'🎾',o:[['mix','🔀 Mix'],['wide','↔️ Do strany'],['body','🎯 Na tělo'],['T','⬆️ Na T']]},
 srvRisk:{name:'Riziko 1. podání',icon:'🚀',o:[[0,'Jistota'],[1,'Normální'],[2,'Riziko']]},
 retPos:{name:'Pozice na returnu',icon:'📍',o:[['close','U čáry'],['norm','Normálně'],['deep','Hluboko']]}
};
function newMStats(){return {pts:0,aces:0,df:0,fsIn:0,fsTot:0,fsWon:0,ssTot:0,ssWon:0,winners:0,ue:0,fe:0,bpW:0,bpT:0,longest:0,longestWon:0,maxSpd:0,srvGames:0,srvHeld:0,
 netT:0,netW:0,dropT:0,dropW:0,ueF:0,ueB:0,winF:0,winB:0,retPts:0,retWon:0,shortT:0,shortW:0,midT:0,midW:0,longT:0,longW:0,dirS:{wide:[0,0],body:[0,0],T:[0,0]},rallyShots:0,rallyPts:0};}
const wingAvg=st=>(st.fh+st.bh)/2;
function weakWing(p){const st=p.st;return st.bh<=st.fh?'bh':'fh';}
// AI coach: picks a sensible game plan from the player's style, the opponent's profile and the surface
function aiTactics(p,o,surf){const t=Object.assign({},TAC_DEF);const s=p.style;const st=p.st,os=o.st;
 t.rally=(s==='BIG'||s==='ATK')?(surf==='C'?'bal':'atk'):(s==='CTR'||s==='CLAY')?(surf==='G'?'bal':'def'):'bal';
 const savvy=clamp(0.35+(st.men-55)/50,0.25,0.95);const gap=Math.abs(os.fh-os.bh);
 if(gap>=4&&RNG()<savvy)t.target=os.bh<os.fh?'bh':'fh';
 t.net=(s==='BIG'||s==='ATK')?(surf==='G'?2:surf==='C'?0:1):(surf==='G'&&s==='ALL'?1:0);
 t.drop=(s==='CLAY'&&surf==='C')?2:(surf==='C'&&(s==='ATK'||s==='ALL'||s==='BASE'))?1:(p.bh1?1:0);
 t.retPos=os.srv>=86?'deep':(surf==='C'?'deep':os.srv<=68?'close':'norm');
 t.srvRisk=st.srv>=86&&surf!=='C'?2:1;
 t.dir=Math.max(st.fh,st.bh)>=84&&RNG()<0.4?'line':'mix';
 return t;}
class Match{
 constructor(A,B,o){
  this.p=[A,B];this.o=o;this.surf=o.surf;this.bo=o.bo||3;this.need=Math.ceil(this.bo/2);
  this.sets=[];this.g=[0,0];this.pt=[0,0];this.tb=false;this.tbT=7;this.setsW=[0,0];this.tbFirst=0;
  this.server=RNG()<.5?0:1;this.done=false;this.winner=null;this.ret=null;
  this.en=[A.isMe?A.energy:100,B.isMe?B.energy:100];
  this.st=[newMStats(),newMStats()];this.active=[{},{}];this.cd=[{},{}];
  this.tac=[A.isMe?Object.assign({},TAC_DEF,A.tac||{}):aiTactics(A,B,o.surf),B.isMe?Object.assign({},TAC_DEF,B.tac||{}):aiTactics(B,A,o.surf)];
  this.read=[{d:null,n:0},{d:null,n:0}];this.dayF=[0,1].map(i=>gauss()*(5.4+Math.max(0,82-ovr(this.p[i]))*0.12));
  this.streak=[0,0];this.history=[];this.points=0;this.log=[];this.hurt=[0,0];this.injEv=[null,null];
  const cc=o.cc;this.crowd=[0,0];if(o.ev||o.cc){for(let i=0;i<2;i++){const p=this.p[i];this.crowd[i]=(p.cc===cc?0.012:0)+popOf(p)*0.00011;}const mn=Math.min(...this.crowd);this.crowd=this.crowd.map(x=>x-mn);}
  // pre-roll a possible injury for each player (point index at which it strikes)
  if(!o.noInj){const t={surf:o.surf,name:o.title||''};for(let i=0;i<2;i++){const p=this.p[i];if(RNG()<matchInjP(p,t,this.bo)){const ty=pickInj('m');this.injEv[i]={at:rint(12,this.bo===5?260:170),t:ty,w:injWeeksFor(ty,p),fired:false};}}}
 }
 get tactic(){return [this.tac[0].rally,this.tac[1].rally];}
 eff(i){const p=this.p[i];const st=effStatsBase(p);const sm=(p.sf[this.surf]||0)*0.9+(p.form||0);const e=this.en[i];const fat=e<55?(55-e)*0.17:0;
  const a=this.active[i];const zb=a.zona?6:0;const hurt=this.hurt[i]?9:0;
  for(const k of STAT_KEYS)st[k]=st[k]+sm-fat+zb-hurt;if(a.nervy)st.men+=20;return st;}
 isBreakPoint(){if(this.tb)return false;const s=this.server,r=1-s;return this.pt[r]>=3&&this.pt[r]>this.pt[s];}
 isPressure(){if(this.isBreakPoint())return true;if(this.tb)return Math.max(...this.pt)>=this.tbT-2;return (this.g[0]>=5||this.g[1]>=5)&&Math.max(...this.pt)>=3;}
 side(){return (this.pt[0]+this.pt[1])%2===0?'deuce':'ad';}
 cardBonus(i,serving){const a=this.active[i];let b=0;const me=this.eff(i),op=this.eff(1-i);let rally=1,win=1,ace=1;
  if(a.zed){b+=0.012+(me.kon-op.kon)*0.0015;rally*=1.6;win*=0.8;}
  if(a.delo&&serving){b+=0.045;ace*=1.9;}
  if(a.risk){b+=0.03;rally*=0.6;win*=1.5;}
  if(a.ret&&!serving){b+=0.05;}
  if(a.sit){b+=0.03*NET_F[this.surf];rally*=0.5;}
  if(a.kratas){b+=0.05*DROP_F[this.surf];}
  if(a.zona){b+=0.04;}
  if(a.nervy){b+=0.008;}
  b+=(this.crowd?this.crowd[i]:0)*(this.isPressure()?1.6:1);
  return {b,rally,win,ace};}
 // rally-phase tactical edge of player i against j (probability delta for i), plus shape multipliers
 rallyTac(i,M,O){const t=this.tac[i],u=this.tac[1-i];const s=this.surf;let d=0,len=1,win=1,ue=1;
  if(t.rally==='atk'){d+=0.016*ATK_F[s]-0.009-0.0007*(O.kon-75)+0.0004*(Math.max(M.fh,M.bh)-80);len*=0.78;win*=1.35;ue*=1.25;}
  else if(t.rally==='def'){d+=0.015*DEF_F[s]+(M.kon-O.kon)*0.0011-0.009;len*=1.3;win*=0.75;ue*=0.8;}
  const ga=wingAvg(M);
  if(t.dir==='line'){d+=0.0009*(ga-76)-0.002;win*=1.25;ue*=1.2;len*=0.9;}
  else if(t.dir==='cross'){d+=0.004-0.0005*(ga-72);win*=0.85;ue*=0.85;len*=1.1;}
  if(t.target!=='none'){const tg=O[t.target],oth=O[t.target==='fh'?'bh':'fh'];const gap=oth-tg;d+=clamp(gap*0.0014,-0.025,0.026)-0.002;}
  if(t.pace==='fast'){d+=(M.kon-O.kon)*0.0005+0.001;len*=0.92;}else if(t.pace==='slow'){d-=0.002;len*=1.05;}
  if(t.drop>0&&(s==='G'||s==='I'))d+=t.drop*0.0015*Math.max(0,O.fh-O.bh)/5;
  if(t.drop>0)len*=1+0.05*t.drop;
  return {d,len,win,ue};}
 serveSetup(s,r,A,B){const ts=this.tac[s],tr=this.tac[r];const sp=SURF_P[this.surf];
  let dir=ts.srvDir;if(dir==='mix'){const x=RNG();dir=x<0.42?'wide':x<0.84?'T':'body';}
  const side=this.side();const rLefty=this.p[r].hand==='L';let wing=dir==='body'?(RNG()<0.5?'fh':'bh'):((side==='deuce')===(dir==='wide')?'fh':'bh');if(rLefty&&dir!=='body')wing=wing==='fh'?'bh':'fh';
  let aceM=dir==='body'?0.35:dir==='T'?1.22:1.12,unM=dir==='body'?1.25:1,d=0;
  if(dir!=='body')d+=clamp((wingAvg(B)-B[wing])*0.0012,-0.015,0.015);else d+=0.004+0.0004*(B.ret-78);
  if(this.p[s].hand==='L'&&side==='ad'&&dir==='wide'){aceM*=1.18;unM*=1.1;d+=0.004;}
  // predictability: the returner reads a serve placement that is repeated
  const rd=this.read[s];if(ts.srvDir!=='mix'){if(rd.d===ts.srvDir)rd.n++;else{rd.d=ts.srvDir;rd.n=1;}const pen=Math.max(0,rd.n-6)*0.0011;d-=Math.min(0.028,pen);aceM*=Math.max(0.6,1-Math.max(0,rd.n-6)*0.015);}else{rd.n=Math.max(0,rd.n-1);}
  let fi=sp.fi+(A.srv-75)*0.0009+[0.07,0,-0.085][ts.srvRisk]+(dir==='body'?0.012:dir==='T'?-0.006:0);
  let p1d=[-0.05,0,0.036][ts.srvRisk],aceR=[0.65,1,1.38][ts.srvRisk];
  let dfM=[0.72,1,1.3][ts.srvRisk],p2d=[-0.015,0,0.014][ts.srvRisk];
  // return position
  let rAce=1,rUn=1,r1=0,r2=0;
  if(tr.retPos==='close'){rAce=1.15;rUn=1.18;r1=0.004-0.0009*(A.srv-78);r2=0.028;}
  else if(tr.retPos==='deep'){rAce=0.8;rUn=0.82;r1=0.006+0.0008*(A.srv-78);r2=-0.022;}
  return {dir,wing,aceM:aceM*aceR*rAce,unM:unM*rUn,d,fi:clamp(fi,0.45,0.82),p1d:p1d-r1,p2d:p2d-r2,dfM};}
 useCard(i,id){const c=CARDS[id];if(this.done)return false;if(this.cd[i][id]>0||this.active[i][id])return false;if(this.en[i]<c.cost)return false;
  this.en[i]-=c.cost;if(id==='dech'){this.en[i]=Math.min(100,this.en[i]+18);this.cd[i][id]=c.cd;this.log.push({card:id,i});return true;}
  this.active[i][id]=c.dur;this.cd[i][id]=c.cd;this.log.push({card:id,i});return true;}
 aiCards(){for(let i=0;i<2;i++){if(this.p[i].isMe)continue;const st=this.eff(i);const sv=this.server===i;
   if(this.isPressure()&&st.men>72&&RNG()<0.45&&this.useCard(i,'nervy'))return {i,id:'nervy'};
   if(sv&&st.srv>82&&RNG()<0.035&&this.useCard(i,'delo'))return {i,id:'delo'};
   if(!sv&&this.isBreakPoint()===false&&RNG()<0.02&&this.useCard(i,'ret'))return {i,id:'ret'};
   if(this.en[i]<35&&RNG()<0.2&&this.useCard(i,'dech'))return {i,id:'dech'};
   if(st.kon>80&&this.surf==='C'&&RNG()<0.02&&this.useCard(i,'zed'))return {i,id:'zed'};}
  return null;}
 aiAdapt(){// AI coach re-evaluates the plan at set breaks
  for(let i=0;i<2;i++){if(this.p[i].isMe)continue;const me=this.p[i],o=this.p[1-i];const st=this.st[i];const t=this.tac[i];
   if(st.netT>=6&&st.netW/st.netT<0.5)t.net=Math.max(0,t.net-1);
   if(st.dropT>=5&&st.dropW/st.dropT<0.45)t.drop=Math.max(0,t.drop-1);
   if(this.en[i]<40)t.pace='slow';
   const os=this.st[1-i];if(os.ueB+os.ueF>=8&&t.target==='none'){t.target=os.ueB>=os.ueF?'bh':'fh';}
   if(this.setsW[1-i]>this.setsW[i]&&t.rally==='bal'&&RNG()<0.5)t.rally=me.style==='CTR'?'def':'atk';}}
 baseEdge(s,r,A,B){const w=SURF_W[this.surf];
  const gA=(A.fh*0.6+A.bh*0.4),gB=(B.fh*0.5+B.bh*0.5);
  const sA=w[0]*A.srv+w[1]*gA+w[2]*A.kon, rB=w[0]*B.ret+w[1]*gB+w[2]*B.kon;
  let d=(sA-rB)*EDGE_K-0.003+(this.dayF[s]-this.dayF[r])*0.0082;
  d=Math.tanh(d/0.07)*0.07;
  if(this.isPressure())d+=(A.men-B.men)*0.00115;
  const bs=this.cardBonus(s,true),br=this.cardBonus(r,false);d+=bs.b-br.b;
  return {d,bs,br};}
 playPoint(){
  if(this.done)return null;
  const aiCard=this.aiCards();
  const s=this.server,r=1-s;const bp=this.isBreakPoint();const pressure=this.isPressure();
  const A=this.eff(s),B=this.eff(r);const sp=SURF_P[this.surf];
  const {d,bs,br}=this.baseEdge(s,r,A,B);
  const sv=this.serveSetup(s,r,A,B);
  const tS=this.rallyTac(s,A,B),tR=this.rallyTac(r,B,A);
  const st=this.st;const res={server:s,winner:null,type:'',len:1,bp,pressure,aiCard,spd:0,second:false,dir:sv.dir,wing:sv.wing,shot:''};
  st[s].fsTot++;
  const aceBase=k=>clamp(sp.ace*Math.exp((A.srv-75)*0.032-(B.ret-75)*0.016)*sv.aceM*bs.ace*k,0.005,0.45);
  const rallyWin=(serverEdge,isFirst)=>{ // server win prob in the rally phase
   const b1=(sp.p1-sp.ace-sp.un*(1-sp.ace))/(1-sp.ace-sp.un*(1-sp.ace)),b2=(sp.p2-sp.ace*0.09-0.075)/(1-sp.ace*0.09-0.075);
   let pr=clamp((isFirst?b1:b2)+RALLY_ADJ[this.surf]+serverEdge*1.25+(tS.d-tR.d),0.08,0.92);
   // special plays: net approaches and drop shots change the odds
   const ev=this.special(s,r,A,B);
   if(ev){res.special=ev;return ev.p;}
   return pr;};
  let first;
  if(RNG()<sv.fi){first=true;st[s].fsIn++;
   res.spd=Math.round(clamp(178+(A.srv-50)*0.95+gauss()*7+(this.tac[s].srvRisk-1)*6,150,238));
   const aceP=aceBase(1),unP=clamp(sp.un*Math.exp((A.srv-75)*0.03-(B.ret-75)*0.03)*sv.unM,0.03,0.42);
   const u=RNG();
   if(u<aceP){res.type='ace';res.winner=s;st[s].aces++;}
   else if(u<aceP+unP*(1-aceP)){res.type='svw';res.winner=s;}
   else{const p1=sp.p1+d+sv.d+sv.p1d;const pr=rallyWin(p1-sp.p1+0,true);this.rallyOutcome(res,s,r,A,B,pr,tS,tR);}
  } else {res.second=true;st[s].ssTot++;
   const dfp=clamp(sp.df*Math.exp((72-A.srv)*0.025)*sv.dfM*(pressure?1.18:1)*(this.p[s].isMe&&this.en[s]<25?1.25:1),0.015,0.25);
   res.spd=Math.round(clamp(150+(A.srv-50)*0.6+gauss()*6,120,195));
   if(RNG()<dfp){res.winner=r;res.type='df';st[s].df++;res.len=0;}
   else{const aceP=aceBase(0.09),unP=clamp(0.075*Math.exp((A.srv-75)*0.025)*sv.unM,0.02,0.2);const u=RNG();
    if(u<aceP){res.type='ace';res.winner=s;st[s].aces++;}
    else if(u<aceP+unP){res.type='svw';res.winner=s;}
    else{const p2=sp.p2+d+sv.d*0.5+sv.p2d;const pr=rallyWin(p2-sp.p2,false);this.rallyOutcome(res,s,r,A,B,pr,tS,tR);}}
  }
  const w=res.winner;
  if(!res.second){if(w===s)st[s].fsWon++;}else if(w===s)st[s].ssWon++;
  if(res.dir&&res.type!=='df'&&st[s].dirS[res.dir]){st[s].dirS[res.dir][0]++;if(w===s)st[s].dirS[res.dir][1]++;}
  st[r].retPts++;if(w===r)st[r].retWon++;
  if(res.type!=='df'){res.spd=res.spd||0;}
  st[s].maxSpd=Math.max(st[s].maxSpd,res.spd);
  st[w].pts++;
  if(res.len>st[0].longest){st[0].longest=st[1].longest=res.len;}
  if(res.len>st[w].longestWon)st[w].longestWon=res.len;
  if(res.len>=2){const b=res.len<=4?'short':res.len<=8?'mid':'long';for(let i=0;i<2;i++){st[i][b+'T']++;if(w===i)st[i][b+'W']++;}st[0].rallyShots+=res.len;st[0].rallyPts++;}
  if(bp){st[r].bpT++;if(w===r)st[r].bpW++;}
  // energy
  for(let i=0;i<2;i++){const e=i===s?A:B;const t=this.tac[i];let dr=(0.1+res.len*0.024)*(1.25-e.kon/100*0.6)*(t.rally==='atk'?0.9:t.rally==='def'?1.15:1);
   const ot=this.tac[1-i];if(ot.pace==='fast')dr*=1.1;if(t.pace==='fast')dr*=1.06;if(t.pace==='slow')dr*=0.84;
   if(this.p[i].isMe)dr*=(1-this.p[i].gear.boty*0.05);this.en[i]=clamp(this.en[i]-dr+(t.pace==='slow'?0.05:0),0,100);}
  for(let i=0;i<2;i++){for(const id in this.active[i]){const c=CARDS[id];const sv2=s===i;if(c.scope==='srv'&&!sv2)continue;if(c.scope==='ret'&&sv2)continue;this.active[i][id]--;if(this.active[i][id]<=0)delete this.active[i][id];}for(const id in this.cd[i]){if(this.cd[i][id]>0)this.cd[i][id]--;}}
  this.points++;
  const ev=this.score(w);
  res.event=ev;res.wasTb=ev&&ev.tb;
  if(ev.set!=null&&!this.done)this.aiAdapt();
  this.history.push(w);if(this.history.length>16)this.history.shift();
  // injuries
  if(!this.done){for(let i=0;i<2;i++){const ie=this.injEv[i];
   if(!ie&&this.p[i].isMe&&this.en[i]<14&&RNG()<0.0009*(1-0.13*(this.p[i].fyzio||0))){const ty=pickInj('m');this.injEv[i]={at:this.points,t:ty,w:injWeeksFor(ty,this.p[i]),fired:false};}
   const ie2=this.injEv[i];if(ie2&&!ie2.fired&&this.points>=ie2.at){ie2.fired=true;res.injury={i,t:ie2.t,w:ie2.w};
    if(!this.p[i].isMe){const retire=RNG()<INJ_TYPES[ie2.t][5];if(retire){this.retire(i);res.event=Object.assign(res.event||{},{match:1-i,ret:i});}else this.hurt[i]=1;}
    else if(this.o.autoInj){if(ie2.w>=3||INJ_TYPES[ie2.t][5]>0.8){this.retire(i);res.event=Object.assign(res.event||{},{match:1-i,ret:i});}else{this.hurt[i]=1;ie2.played=true;}}
    break;}}}
   if(!this.done&&!this.o.noInj){for(let i=0;i<2;i++){if(this.p[i].isMe||this.points<8)continue;const games=(this.setsW[0]+this.setsW[1])*6+(this.g[0]+this.g[1]);
    const h=typeof retireHazard==='function'?retireHazard(this.p[i],{surf:this.surf,week:typeof S!=='undefined'?S.week:1,bo:this.bo,long:games>=20||this.sets.length>=2,hurt:this.hurt[i],en:this.en[i]}):0;
    if(h&&RNG()<h/(this.bo===5?260:180)){const ty=0;if(!this.injEv[i]||!this.injEv[i].fired){this.injEv[i]={at:this.points,t:ty,w:0,fired:true};res.injury={i,t:ty,w:0};}this.retire(i);res.event=Object.assign(res.event||{},{match:1-i,ret:i});break;}}}
  return res;
 }
 retire(i){this.done=true;this.winner=1-i;this.ret=i;if(this.g[0]+this.g[1]>0||this.pt[0]+this.pt[1]>0||!this.sets.length)this.sets.push([this.g[0],this.g[1],null]);this.partial=true;}
 special(s,r,A,B){const sf=this.surf;
  for(const i of (RNG()<0.5?[s,r]:[r,s])){const t=this.tac[i];const M=i===s?A:B,O=i===s?B:A;
   const aN=[0.035,0.12,0.24][t.net]*(t.rally==='atk'?1.25:t.rally==='def'?0.7:1)*Math.sqrt(NET_F[sf])*(i===s?1.15:0.8)*(this.active[i].sit?3:1);
   if(RNG()<aN){const vol=(M.fh+M.srv+M.men)/3,pas=(O.fh+O.bh)/2*0.55+O.ret*0.45;
    let q=0.632+0.005*(vol-pas)+(sf==='G'?0.045:sf==='C'?-0.055:sf==='I'?0.015:0)-0.05*Math.max(0,t.net-1)+(i===s?0.02:-0.03)+(this.active[i].sit?0.06:0);
    q=clamp(q,0.3,0.86);this.st[i].netT++;const win=RNG()<q;if(win)this.st[i].netW++;return {k:'net',i,p:i===s?(win?1:0):(win?0:1)};}
   const aD=[0.012,0.05,0.1][t.drop]*(sf==='C'?1.3:sf==='G'?0.8:1)*(this.active[i].kratas?3:1);
   if(RNG()<aD){let q=0.53+0.006*(72-O.kon)+0.004*(M.fh-72)*0.5+(sf==='C'?0.07:sf==='G'?0.02:sf==='I'?-0.03:0)-0.035*Math.max(0,t.drop-1)+(this.tac[1-i].retPos==='deep'?0.04:0)+(this.active[i].kratas?0.08:0);
    q=clamp(q,0.25,0.85);this.st[i].dropT++;const win=RNG()<q;if(win)this.st[i].dropW++;return {k:'drop',i,p:i===s?(win?1:0):(win?0:1)};}
  }
  return null;}
 rallyOutcome(res,s,r,A,B,pr,tS,tR){const sp=SURF_P[this.surf];const sw=RNG()<pr?s:r;res.winner=sw;const l=1-sw;const tW=sw===s?tS:tR,tL=sw===s?tR:tS;
  const W=sw===s?A:B,L=sw===s?B:A;const bw=sw===s?res.bsW:null;
  const mean=sp.rl*tS.len*tR.len*(0.9+((A.kon+B.kon)/2-72)*0.012)*(this.active[0].zed||this.active[1].zed?1.5:1)*(this.active[0].risk||this.active[1].risk?0.65:1);
  let len=2+Math.floor(-Math.log(1-RNG()*0.999)*mean);
  const sp2=res.special;
  if(sp2&&sp2.k==='net')len=Math.min(len,2+rint(1,4));
  if(sp2&&sp2.k==='drop')len=Math.max(3,Math.min(len,3+rint(0,6)));
  const hitter=k=>k%2===1?s:r;
  let winnerShare=clamp(0.33+(Math.max(W.fh,W.bh)-75)*0.006,0.15,0.6)*tW.win/Math.sqrt(tL.ue);
  if(len>=9)winnerShare*=0.8;
  let kind=RNG()<winnerShare?'win':'err';
  if(sp2&&sp2.k==='net'){kind=sp2.i===sw?(RNG()<0.75?'win':'err'):(RNG()<0.6?'win':'err');}
  if(kind==='win'&&hitter(len)!==sw)len++;
  if(kind==='err'&&hitter(len)!==l)len++;
  res.len=len;
  if(kind==='win'){res.type=len===2?'retw':'win';this.st[sw].winners++;
   const tgt=this.tac[sw].target;let pF=0.6+(W.fh-W.bh)*0.012;res.shot=RNG()<clamp(pF,0.25,0.85)?'forhend':'bekhend';
   if(sp2&&sp2.k==='net')res.shot=sp2.i===sw?(RNG()<0.25?'smeč':'volej'):'prohoz';
   else if(sp2&&sp2.k==='drop'&&sp2.i===sw)res.shot='kraťas';
   if(res.shot==='forhend')this.st[sw].winF++;else if(res.shot==='bekhend')this.st[sw].winB++;}
  else{let unf=RNG()<clamp(0.5*tL.ue/Math.sqrt(tW.win),0.25,0.8);res.type=unf?'ue':'fe';if(unf)this.st[l].ue++;else this.st[l].fe++;
   const tg=this.tac[sw].target;let pB=clamp(0.42+(L.fh-L.bh)*0.014+(tg==='bh'?0.2:tg==='fh'?-0.2:0),0.1,0.9);
   res.shot=RNG()<pB?'bekhend':'forhend';if(sp2&&sp2.k==='drop'&&sp2.i===sw)res.shot='kraťas';if(sp2&&sp2.k==='net'&&sp2.i===l)res.shot='volej';
   if(unf){if(res.shot==='bekhend')this.st[l].ueB++;else if(res.shot==='forhend')this.st[l].ueF++;}
   if(len===2)res.type='reterr';}
 }
 score(w){const l=1-w;let ev={};
  if(this.tb){this.pt[w]++;const tot=this.pt[0]+this.pt[1];
   if(this.pt[w]>=this.tbT&&this.pt[w]-this.pt[l]>=2){ev.tb=true;ev.tbScore=this.pt.slice();this.st[w].tbw++;this.st[l].tbl++;this.g[w]++;this.pt=[0,0];this.tb=false;ev.game=w;this.endSet(w,ev,Math.min(ev.tbScore[0],ev.tbScore[1]));this.server=1-this.tbFirst;return ev;}
   if(tot%2===1)this.server=1-this.server;return ev;}
  this.pt[w]++;
  if(this.pt[w]>=4&&this.pt[w]-this.pt[l]>=2){const sv=this.server;this.st[sv].srvGames++;if(w===sv)this.st[sv].srvHeld++;else ev.brk=w;
   this.g[w]++;this.pt=[0,0];ev.game=w;this.server=1-this.server;
   const gw=this.g[w],gl=this.g[l];
   if((gw>=6&&gw-gl>=2)||gw===7){this.endSet(w,ev,null);}
   else if(gw===6&&gl===6){this.tb=true;const final=this.setsW[0]+this.setsW[1]===this.bo-1;this.tbT=(final&&this.o.tb10)?10:7;this.tbFirst=this.server;ev.tbStart=true;}
  }
  return ev;}
 endSet(w,ev,tbl){this.sets.push([this.g[0],this.g[1],tbl]);this.setsW[w]++;this.g=[0,0];ev.set=w;if(this.setsW[w]>=this.need){this.done=true;this.winner=w;ev.match=w;}}
 totalGames(i){return this.sets.reduce((a,s)=>a+s[i],0)+(this.partial?0:this.g[i]);}
 pointLabel(i){if(this.tb)return String(this.pt[i]);const a=this.pt[i],b=this.pt[1-i];if(a>=3&&b>=3){if(a===b)return '40';return a>b?'AD':'40';}return ['0','15','30','40'][Math.min(a,3)];}
 simToEnd(){let g=0;while(!this.done&&g++<3000)this.playPoint();}
 info(){const s=this.st[0];return {aces:s.aces,df:s.df,longest:s.longest,tbw:s.tbw,tbl:s.tbl,score:this.scoreText(0)+(this.ret!=null?' skr.':''),ret:this.ret};}
 scoreText(i){return this.sets.map(s=>{const a=s[i],b=s[1-i];return a+':'+b+((s[2]!=null&&Math.max(a,b)===7&&Math.min(a,b)===6)?`(${s[2]})`:'');}).join(' ');}
 // serialisation for mid-match save
 toJSON(){const o={};for(const k in this){if(k==='p'||k==='o')continue;o[k]=this[k];}o.pid=[this.p[0].id,this.p[1].id];o.oo=Object.assign({},this.o,{ev:undefined});return o;}
 static restore(d){const m=Object.create(Match.prototype);Object.assign(m,d);m.p=[P(d.pid[0]),P(d.pid[1])];m.o=d.oo;delete m.pid;delete m.oo;return m;}
}
function commentary(m,r){const sv=m.p[r.server].n.split(' ').slice(-1)[0];const wn=m.p[r.winner].n.split(' ').slice(-1)[0];const ln=m.p[1-r.winner].n.split(' ').slice(-1)[0];
 const dirT={wide:'do strany',T:'na střed',body:'na tělo'}[r.dir]||'';
 if(r.special&&r.special.k==='net'){if(r.special.i===r.winner)return r.type==='win'?`${wn} nabíhá na síť a zakončuje ${r.shot==='smeč'?'smečí':'volejem'}!`:`${wn} na síti vynutil chybu soupeře`;return r.type==='win'?`Skvělý prohoz! ${wn} trestá nálet na síť`:`${ln} na síti chyboval`;}
 if(r.special&&r.special.k==='drop'){if(r.special.i===r.winner)return `Kraťas ${wn}! ${ln} nedobíhá`;return `${ln} zkouší kraťas, ale ${wn} ho doběhl`;}
 switch(r.type){case 'ace':return `ESO ${dirT}! ${sv} – ${r.spd} km/h`;case 'svw':return `Nechytatelný servis ${dirT} – ${sv} (${r.spd} km/h)`;case 'df':return `Dvojchyba ${sv}`;
 case 'retw':return `Vítězný return ${wn}!`;case 'reterr':return `${ln} nezvládl return (${r.shot})`;case 'win':return `Vítězný ${r.shot} ${wn} po ${r.len} úderech`;
 case 'ue':return `Nevynucená chyba ${ln} – ${r.shot}, výměna ${r.len} úderů`;case 'fe':return `${wn} vynutil chybu (${r.shot}) po ${r.len} úderech`;}return '';}

// ---------- save / load ----------
function migrateSave(s){if(!s||typeof s!=='object')return s;
 s.v=s.v||1;
 if(s.players)for(const p of s.players){if(p.prev===undefined)p.prev=p.rank;if(p.injH==null)p.injH=[];if(p.load==null)p.load=0;if(p.isMe){if(p.pop==null){p.pop=2;p.spons={};p.popHist=[];}if(!p.tac)p.tac=Object.assign({},TAC_DEF);if(!p.season0)p.season0={w:0,l:0,titles:0,prize:0};if(!p.xp)p.xp={fh:0,bh:0,srv:0,ret:0,kon:0,men:0};}}
 if(!s.injNews)s.injNews=[];
 if(!s.news)s.news=[];
 if(s.v<6){s.v=GAME_VER;}
 return s;}
function saveGame(){if(!S||S._silent)return;try{S.v=GAME_VER;const c=Object.assign({},S);delete c.order;delete c._silent;const RP=(k,v)=>typeof v==='number'&&v%1!==0?Math.round(v*1000)/1000:v;let js=JSON.stringify(c,RP);
 if(!STORE.set(SAVE_KEY,js)){// quota exceeded: trim history and retry
  c.news=(c.news||[]).slice(0,40);c.injNews=(c.injNews||[]).slice(0,30);c.results={};js=JSON.stringify(c,RP);if(!STORE.set(SAVE_KEY,js)&&!S._warnedSave){S._warnedSave=1;if(typeof toast==='function')toast('⚠️ Hru nelze uložit do prohlížeče (soukromý režim?). Použij Export.');}}}catch(e){console.warn('save failed',e);}}
function loadGame(){try{const raw=STORE.get(SAVE_KEY);if(!raw)return false;S=migrateSave(JSON.parse(raw));if(!S.players||!S.season)throw new Error('poškošený save');rebuildIndex();setCalendar(S.season);computeRanks();return true;}catch(e){console.warn(e);S=null;return false;}}
function resetGame(){STORE.del(SAVE_KEY);S=null;}

// ===================== V6: tým, vybavení, sponzoři, čtyřhra, Davis Cup, kurzy, integrita =====================
const IJT='Integritní jednotka tenisu';

function staffLvl(me,k){if(!me)return 0;if(k==='physio')return me.physio!=null?me.physio:(me.fyzio||0);if(k==='fitness')return me.fitness!=null?me.fitness:(me.fyzio||0);return me[k]||0;}
const STAFF={
 coach:{name:'Trenér',icon:'🧢',max:5,min:1,sal:[0,250,700,1800,4200,8500],cost:[0,0,9000,35000,130000,420000],
  desc:l=>l<=0?'Bez trenéra':`Úr. ${l}: trénink ×${(COACH_MULT[l]||1).toFixed(2)}, karty dovedností, ${fmtMoney(COACH_SAL[l]||0)}/týd.`},
 fitness:{name:'Kondiční trenér',icon:'💪',max:3,min:0,sal:[0,280,850,2300],cost:[0,5500,24000,82000],
  desc:l=>l<=0?'Nemáš kondičního trenéra':`Úr. ${l}: +${6+l*6} energie/týden, odolnější trénink, ${fmtMoney([0,280,850,2300][l])}/týd.`},
 physio:{name:'Fyzioterapeut',icon:'🩺',max:3,min:0,sal:[0,300,900,2400],cost:[0,6000,28000,95000],
  desc:l=>l<=0?'Bez fyzioterapeuta':`Úr. ${l}: riziko zranění −${l*13} %, rychlejší léčba, ${fmtMoney(FYZIO_SAL[l])}/týd.`},
 mental:{name:'Mentální kouč',icon:'🧠',max:3,min:0,sal:[0,250,800,2000],cost:[0,7000,32000,110000],
  desc:l=>l<=0?'Bez mentálního kouče':`Úr. ${l}: mentalita +${l*2} v zápasech, ${fmtMoney(MENT_SAL[l])}/týd.`},
 manager:{name:'Manažer',icon:'💼',max:3,min:0,sal:[0,400,1200,3500],cost:[0,8000,36000,125000],
  desc:l=>l<=0?'Sám si řešíš smlouvy':`Úr. ${l}: lepší sponzorské nabídky (+${l*12} %), pomalejší úbytek popularity, ${fmtMoney([0,400,1200,3500][l])}/týd.`}
};
function weeklyCosts(me){if(!me)return 0;return (STAFF.coach.sal[staffLvl(me,'coach')]||0)+(STAFF.fitness.sal[staffLvl(me,'fitness')]||0)+(STAFF.physio.sal[staffLvl(me,'physio')]||0)+(STAFF.mental.sal[staffLvl(me,'mental')]||0)+(STAFF.manager.sal[staffLvl(me,'manager')]||0);}
function hireStaff(k){const me=ME();const it=STAFF[k];if(!it)return {ok:false,msg:'Neznámá role.'};const l=staffLvl(me,k);if(l>=it.max)return {ok:false,msg:'Maximum.'};const c=it.cost[l+1];if(me.money<c)return {ok:false,msg:'Nedostatek peněz.'};me.money-=c;me[k]=l+1;if(k==='physio')me.fyzio=me.physio;saveGame();checkAchievements();return {ok:true,msg:`${it.icon} ${it.name} úr. ${l+1} je v týmu.`};}
function fireStaff(k){const me=ME();const it=STAFF[k];if(!it)return {ok:false,msg:'Neznámá role.'};const l=staffLvl(me,k);if(l<=(it.min||0))return {ok:false,msg:it.min?`${it.name} nejde úplně propustit.`:'Nemáš koho propustit.'};me[k]=l-1;if(k==='physio')me.fyzio=me.physio;const sev=Math.round((it.sal[l]||0)*2);me.money-=sev;saveGame();return {ok:true,msg:`${it.name} úr. ${l} končí. Odstupné ${fmtMoney(sev)}.`};}

const GEAR_MODELS={
 raketa:[
  {id:'all',n:'All-court Comp',d:'Vyvážená raketa bez slabin',b:{fh:.4,bh:.4}},
  {id:'pwr',n:'Power Frame',d:'Těžší hlava, razance z forhendu a servisu',b:{fh:1,srv:.9,ret:-.3}},
  {id:'ctl',n:'Control Pro',d:'Přesnost a jistotnější bekhend',b:{bh:1,fh:.3,men:.4,srv:-.2}}
 ],
 boty:[
  {id:'all',n:'All-court Run',d:'Univerzální tlumení',b:{kon:.4}},
  {id:'hrd',n:'Hard Court Grip',d:'Lepší pohyb na tvrdém (± na antuce)',surf:'H',b:{kon:.3}},
  {id:'cly',n:'Clay Slider',d:'Širší podrážka na antuku',surf:'C',b:{kon:.3}},
  {id:'grs',n:'Grass Fast',d:'Lehká bota na trávu a halu',surf:'G',b:{kon:.3}}
 ],
 vyplet:[
  {id:'poly',n:'Polyester Spin',d:'Více rotace a razance na podání',b:{srv:1,fh:.3,ret:-.2}},
  {id:'hyb',n:'Hybrid Control',d:'Kompromis kontroly a citu',b:{fh:.5,bh:.5}},
  {id:'gut',n:'Natural Gut',d:'Cit v ruce, jistější return',b:{ret:1,men:.3,srv:-.2}}
 ]
};
function gearModel(me,k){const list=GEAR_MODELS[k];const id=(me.eq&&me.eq[k])||'all';return list.find(x=>x.id===id)||list[0];}
function setGearModel(k,id){const me=ME();me.eq=me.eq||{raketa:'all',boty:'all',vyplet:'all'};if(!GEAR_MODELS[k].some(x=>x.id===id))return {ok:false,msg:'Neznámý model.'};me.eq[k]=id;saveGame();return {ok:true,msg:`Zvoleno: ${gearModel(me,k).n}`};}
function meBonus(p){if(!p||!p.isMe)return null;const g=p.gear||{};const out={fh:g.raketa||0,bh:g.raketa||0,srv:g.vyplet||0,ret:g.vyplet||0,kon:g.boty||0,men:staffLvl(p,'mental')*2};
 const q=1+(Math.max(g.raketa||0,g.boty||0,g.vyplet||0))*0.12;
 for(const k of ['raketa','boty','vyplet']){const m=gearModel(p,k);if(!m||!m.b)continue;for(const s in m.b)out[s]=(out[s]||0)+m.b[s]*q;}
 return out;}
function gearSurfBonus(p,surf){if(!p||!p.isMe)return 0;let b=0;for(const k of ['boty']){const m=gearModel(p,k);if(m.surf)b+=m.surf===surf?1.2:(m.surf==='G'&&surf==='I'?0.6:-0.5);}return b;}

// --- sponsors with bonuses & offers ---
const SPONSORS_V6=[
 {id:'s1',th:8,rank:null,name:'Sportovní obchod U Kurtu',icon:'🏪',pay:250,sign:400,win:80,title:400,desc:'Místní obchod se sportovním vybavením'},
 {id:'s2',th:18,rank:900,name:'SmashPro rakety',icon:'🎾',pay:800,sign:1200,win:220,title:1500,desc:'Výrobce raket a výpletů'},
 {id:'s3',th:30,rank:500,name:'AquaVolt iontový nápoj',icon:'🥤',pay:2200,sign:4000,win:500,title:4000,desc:'Energetické nápoje pro sportovce'},
 {id:'s4',th:45,rank:250,name:'Northline Sport oblečení',icon:'👕',pay:5500,sign:9000,win:1200,title:12000,desc:'Oblečení a obuv – kolekce s tvým jménem'},
 {id:'s5',th:60,rank:120,name:'Chronex hodinky',icon:'⌚',pay:12000,sign:20000,win:2500,title:25000,desc:'Luxusní švýcarské hodinky'},
 {id:'s6',th:75,rank:50,name:'Veloce Motors',icon:'🚗',pay:26000,sign:45000,win:6000,title:60000,desc:'Automobilka – ambasador značky'},
 {id:'s7',th:90,rank:20,name:'Orbit Global',icon:'🌐',pay:55000,sign:90000,win:12000,title:140000,desc:'Globální technologická značka'}
];
function sponsorPayMul(me){return 1+0.12*staffLvl(me,'manager');}
function sponsorPay(me){if(!me||!me.spons)return 0;const mul=sponsorPayMul(me);return SPONSORS_V6.filter(s=>me.spons[s.id]&&me.spons[s.id].on!==false).reduce((a,s)=>a+Math.round((me.spons[s.id].pay||s.pay)*mul),0);}
function sponsorEligible(sp,me){if((me.pop||0)<sp.th)return false;if(sp.rank&&me.rank&&me.rank>sp.rank)return false;if(sp.rank&&!me.rank)return false;return true;}
function updateSponsors(me,silent){me.spons=me.spons||{};me.sponsOff=me.sponsOff||[];
 for(const sp of SPONSORS_V6){const has=me.spons[sp.id]&&me.spons[sp.id].on!==false;
  if(!has&&sponsorEligible(sp,me)&&!me.sponsOff.some(o=>o.id===sp.id)&&!(me.spons[sp.id]&&me.spons[sp.id].declined)){
   me.sponsOff.push({id:sp.id,s:S.season,w:S.week});
   if(!silent)S.news.unshift({w:S.week,s:S.season,t:`✍️ Nová sponzorská nabídka: ${sp.icon} ${sp.name}`});}
  else if(has&&((me.pop||0)<sp.th-8||(sp.rank&&me.rank&&me.rank>sp.rank*1.8))){me.spons[sp.id].on=false;if(!silent)S.news.unshift({w:S.week,s:S.season,t:`📉 ${sp.name} ukončil smlouvu.`});}}
}
function acceptSponsor(id){const me=ME();const sp=SPONSORS_V6.find(s=>s.id===id);if(!sp)return {ok:false,msg:'Neznámý sponzor.'};if(!sponsorEligible(sp,me))return {ok:false,msg:'Nesplňuješ podmínky nabídky.'};const mul=sponsorPayMul(me);const sign=Math.round(sp.sign*mul);me.spons[id]={s:S.season,w:S.week,on:true,pay:sp.pay};me.sponsOff=(me.sponsOff||[]).filter(o=>o.id!==id);me.money+=sign;saveGame();checkAchievements();return {ok:true,msg:`Smlouva s ${sp.name}! Podpisové ${fmtMoney(sign)}.`};}
function declineSponsor(id){const me=ME();me.spons=me.spons||{};me.spons[id]={declined:1,s:S.season,w:S.week,on:false};me.sponsOff=(me.sponsOff||[]).filter(o=>o.id!==id);saveGame();return {ok:true,msg:'Nabídka odmítnuta.'};}
function paySponsorBonuses(ev,wonTitle){const me=ME();if(!me||!me.spons)return 0;const mul=sponsorPayMul(me);let tot=0;
 for(const sp of SPONSORS_V6){const c=me.spons[sp.id];if(!c||c.on===false)continue;let add=0;if(wonTitle)add=sp.title;else if(ev&&((ev.myPts||0)>0)){const deep=ev.champ==='me'||(ev.res&&(ev.res.me===ev.nr-1||ev.res.me==='F'||ev.res.me==='SF'||ev.res.me===ev.nr-2));if(deep)add=sp.win;}
  if(add){add=Math.round(add*mul);tot+=add;}}
 if(tot){me.money+=tot;me.car.prize=(me.car.prize||0)+tot;if(me.season0)me.season0.prize=(me.season0.prize||0)+tot;if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:`💼 Sponzorské bonusy za výsledek: ${fmtMoney(tot)}`});}
 return tot;}

// --- rivalries ---
function isRival(id){const me=ME();const h=me&&me.h2h&&me.h2h[id];return !!(h&&h[0]+h[1]>=3);}
function rivalryList(){const me=ME();if(!me||!me.h2h)return [];return Object.entries(me.h2h).map(([id,v])=>{const p=P(id);return p&&v[0]+v[1]>=3?{id,p,w:v[0],l:v[1],n:v[0]+v[1]}:null;}).filter(Boolean).sort((a,b)=>b.n-a.n);}
function noteRivalry(oppId,won){const me=ME();const h=me.h2h[oppId];if(!h||h[0]+h[1]!==3||S._silent)return;const p=P(oppId);if(!p)return;S.news.unshift({w:S.week,s:S.season,t:`⚔️ Rivalita! ${me.n} vs ${p.n} – po třetím vzájemném zápase je z toho série (${h[0]}:${h[1]}).`});}

// --- doubles ranking ---
function totalDPts(p){const a=(p.dpw||[]).filter(v=>v>0);if(!a.length)return 0;if(a.length<=19)return a.reduce((x,y)=>x+y,0);a.sort((x,y)=>y-x);let t=0;for(let i=0;i<19;i++)t+=a[i];return t;}
function computeDRanks(){const arr=S.players.filter(p=>!p.retired);for(const p of arr)p._dt=totalDPts(p);arr.sort((a,b)=>b._dt-a._dt||overallOf(b.st)-overallOf(a.st));let r=0;for(const p of arr){if(p._dt>0){r++;p.dRank=r;}else p.dRank=null;if(p.dRank&&(!p.dBest||p.dRank<p.dBest))p.dBest=p.dRank;}}
function initDoublesPoints(){for(const p of S.players){if(p.dpw&&p.dpw.length===52)continue;p.dpw=new Array(52).fill(0);p.dsw=0;p.dsl=0;const t=p.isMe?0:totalPts(p);if(t>0){const n=Math.max(2,Math.min(8,Math.round(t/400)+2));for(let i=0;i<n;i++)p.dpw[rint(0,51)]+=Math.max(0,Math.round(t*0.18/n*(0.4+RNG())));}}computeDRanks();}
function doublesAllowed(t){if(!t||t.tier==='FIN'||t.tier==='DC'||t.tier==='M15')return false;return true;}
const DBL_PTS={GS:[2000,1200,720,360,180,90,0],M1000:[1000,600,360,180,90,0],A500:[500,300,180,90,0],A250:[250,150,90,45,0],C175:[100,60,35,15,0],C125:[80,50,25,10,0],C100:[60,36,20,8,0],C75:[40,24,12,5,0],C50:[25,14,7,0],M25:[15,8,4,0]};
function dblPtsFor(tier,idx){const t=DBL_PTS[tier]||DBL_PTS.C50;return t[idx]||0;}
function partnerCandidates(t){const me=ME();const busy=activeBusy();const pool=S.order.map(P).filter(p=>p&&!p.isMe&&!p.retired&&!(p.injury>0)&&!busy.has(p.id));
 const home=pool.filter(p=>p.cc===me.cc);const rest=pool.filter(p=>p.cc!==me.cc);
 const score=p=>{const dr=p.dRank||p.rank||900;const close=Math.abs((me.dRank||me.rank||800)-dr);return (p.cc===me.cc?-80:0)+close-(p.style===me.style?10:0);};
 return home.concat(rest).sort((a,b)=>score(a)-score(b)).slice(0,10);}
function pairChem(a,b){let c=0;if(a.cc===b.cc)c+=2;if(a.style!==b.style)c+=1;if((a.style==='BIG'&&(b.style==='CTR'||b.style==='BASE'))||(b.style==='BIG'&&(a.style==='CTR'||a.style==='BASE')))c+=1.4;return c;}
function makePair(a,b){const ch=pairChem(a,b);const st={};for(const k of STAT_KEYS)st[k]=(a.st[k]*0.62+b.st[k]*0.38)+ch*0.35;const sf={};for(const k of ['H','C','G','I'])sf[k]=((a.sf[k]||0)+(b.sf[k]||0))/2;
 return {id:a.id,isMe:a.isMe,n:shortPairName(a)+' / '+shortPairName(b),cc:a.cc,st,sf,style:a.style,form:((a.form||0)+(b.form||0))/2,energy:a.isMe?a.energy:100,hand:a.hand,bh1:a.bh1,rank:a.dRank||a.rank,gear:a.gear,mental:a.mental,fyzio:a.fyzio,physio:a.physio,fitness:a.fitness,eq:a.eq,tac:a.tac,pop:a.pop,partner:b.id,pair:true};}
function shortPairName(p){if(!p)return '?';const parts=String(p.n).split(' ');return parts.length>1?parts[parts.length-1]:p.n;}
function createDoublesEvent(t,pairMe,opps){const D=16;const list=[pairMe].concat(opps).slice(0,D);while(list.length<D)list.push(null);
 const ev={id:t.id+'_dbl_'+S.season,tid:t.id,name:t.name+' – čtyřhra',city:t.city,cc:t.cc,tier:t.tier,surf:t.surf,week:S.week,end:S.week+t.len-1,len:t.len,bo:3,rounds:[],cur:0,res:{},done:false,human:true,extra:{},champ:null,ent:list.filter(Boolean).map(x=>x.id||x),dbl:true,size:D,draw:D,nr:4,pm:0};
 const r0=[];for(let i=0;i<D;i+=2){const A=list[i],B=list[i+1];r0.push({a:A&&(A.id||A),b:B&&(B.id||B),ap:A&&A.pair?A:null,bp:B&&B.pair?B:null,w:null,sets:null});}
 ev.rounds.push(r0);return ev;}

// --- Davis Cup ---
const DC_WEEKS={qual:37,fin:48};
function isDcWeek(w){return w===DC_WEEKS.qual||w===DC_WEEKS.fin;}
function countryStrength(cc){const top=S.order.map(P).filter(p=>p&&p.cc===cc&&!p.retired).slice(0,3);if(!top.length)return 9999;return top.reduce((a,p)=>a+(p.rank||1200),0)/top.length;}
function countryRoster(cc,n){return S.order.map(P).filter(p=>p&&p.cc===cc&&!p.retired&&!(p.injury>0)).slice(0,n||4);}
function ensureDavis(){S.davis=S.davis||{season:S.season,qual:null,fin:null,nom:null};if(S.davis.season!==S.season)S.davis={season:S.season,qual:null,fin:null,nom:null};return S.davis;}
function maybeNominateDavis(){if(S._silent||!isDcWeek(S.week))return;const me=ME();if(!me||me.banned)return;const d=ensureDavis();if(d.nom&&d.nom.week===S.week&&d.nom.season===S.season)return;
 const roster=countryRoster(me.cc,6);const idx=roster.findIndex(p=>p.isMe);const phase=S.week===DC_WEEKS.fin?'fin':'qual';
 if(phase==='fin'&&d.qual&&d.qual.champ&&d.qual.champ!==me.cc&&!(d.qual.finalists||[]).includes(me.cc))return;
 if(idx<0||idx>3||me.injury>0){d.nom={season:S.season,week:S.week,phase,ok:false,reason:me.injury>0?'zranění':'mimo nominaci'};return;}
 const nations=[...new Set(S.players.filter(p=>!p.retired).map(p=>p.cc))].filter(c=>c&&c!==me.cc);
 nations.sort((a,b)=>Math.abs(countryStrength(a)-countryStrength(me.cc))-Math.abs(countryStrength(b)-countryStrength(me.cc)));
 const opp=nations[0]||'ITA';const surf=S.week===DC_WEEKS.fin?'I':(COUNTRIES[me.cc]&&COUNTRIES[me.cc][2]>40?'I':'C');
 d.nom={season:S.season,week:S.week,phase,ok:true,accepted:null,opp,surf,idx,teammates:roster.filter(p=>!p.isMe).slice(0,3).map(p=>p.id)};
 S.davisAlert=true;}
function acceptDavis(yes){const d=ensureDavis();if(!d.nom||!d.nom.ok)return {ok:false,msg:'Žádná nominace.'};d.nom.accepted=!!yes;saveGame();return {ok:true,msg:yes?'Nominaci přijímáš. Tento týden hraješ za zemi.':'Nominaci odmítáš. Tým hraje bez tebe.'};}
function setupDavisEvent(){const me=ME();const d=ensureDavis();if(!d.nom||!d.nom.ok||d.nom.accepted!==true||d.nom.week!==S.week)return null;
 if(S.events.some(e=>e.tier==='DC'&&e.week===S.week))return S.events.find(e=>e.tier==='DC'&&e.week===S.week);
 const oppC=d.nom.opp;const them=countryRoster(oppC,4);const opp=them[0]||S.players.find(p=>!p.isMe&&!p.retired);
 const ev={id:'dc_'+S.season+'_'+S.week,tid:'dc',name:`Davis Cup · ${COUNTRIES[me.cc]?COUNTRIES[me.cc][1]:me.cc} vs ${COUNTRIES[oppC]?COUNTRIES[oppC][1]:oppC}`,city:COUNTRIES[me.cc]?['Praha','Bratislava','Vídeň','Paříž'][0]:'—',cc:me.cc,tier:'DC',surf:d.nom.surf||'I',week:S.week,end:S.week,len:1,bo:3,rounds:[[{a:'me',b:opp.id,w:null,sets:null}]],cur:0,res:{},done:false,human:true,extra:{},champ:null,ent:['me',opp.id],size:2,draw:2,nr:1,dc:true,phase:d.nom.phase,oppC,teammates:d.nom.teammates};
 S.events.push(ev);S.cur={ev:ev.id,stage:'main',status:'alive',qual:null,last:-1,mode:'main'};S.plan={tid:'dc',mode:'main'};return ev;}
function resolveDavisTie(ev,humanWon){if(ev&&ev._dcPaid)return;if(ev)ev._dcPaid=1;const d=ensureDavis();const me=ME();const mates=(ev.teammates||[]).map(P).filter(Boolean);const them=countryRoster(ev.oppC,3);
 let us=humanWon?1:0,themS=humanWon?0:1;
 if(mates[0]&&them[1]){const q=quickMatch(mates[0],them[1],ev.surf,3,ev.cc);if(q.w===mates[0].id)us++;else themS++;}
 const dblWon=mates[1]&&them[2]?quickMatch(mates[1],them[2],ev.surf,3,ev.cc).w===mates[1].id:RNG()<0.5;if(dblWon)us++;else themS++;
 const win=us>themS;ev.dcScore=[us,themS];ev.done=true;ev.champ=win?'me':null;
 const prize=ev.phase==='fin'?(win?80000:25000):(win?28000:8000);
 ev.myPrize=(ev.myPrize||0)+prize;ev.myPts=ev.myPts||0;
 if(!S._silent){me.money+=prize;me.car.prize=(me.car.prize||0)+prize;addPop(win?(ev.phase==='fin'?8:4):(ev.phase==='fin'?1:0.4));
  S.news.unshift({w:S.week,s:S.season,t:`🏳️ Davis Cup: ${COUNTRIES[me.cc][1]} ${us}:${themS} ${COUNTRIES[ev.oppC]?COUNTRIES[ev.oppC][1]:ev.oppC}${win?' — výhra!':'.'} ${fmtMoney(prize)} od svazu.`});}
 me.car.davis=me.car.davis||{p:0,w:0,l:0};me.car.davis.p++;if(win)me.car.davis.w++;else me.car.davis.l++;
 if(ev.phase==='qual'){d.qual=d.qual||{finalists:[]};if(win){d.qual.finalists=d.qual.finalists||[];d.qual.finalists.push(me.cc);d.qual.champ=d.qual.champ||me.cc;}}
 if(ev.phase==='fin'&&win){d.fin={champ:me.cc};me.car.davis.title=(me.car.davis.title||0)+1;}
 checkAchievements();}

// --- betting market (in-game currency only) ---
function fairMatchP(a,b,surf,bo){if(!a||!b)return 0.5;let d=rating(a,surf)-rating(b,surf);const h=(ME()&&a.id==='me'&&ME().h2h[b.id])?ME().h2h[b.id]:null;
 if(h&&h[0]+h[1]>=2)d+=(h[0]-h[1])*0.7;d+=((a.form||0)-(b.form||0))*0.5;
 const Q=8.4+Math.abs(d)*0.28;const ps=1/(1+Math.exp(-d/Q));
 const need=Math.ceil((bo||3)/2);
 if(need===2)return clamp(ps*ps*(3-2*ps),0.07,0.93);
 // bo5
 let p=0;const bin=(n,k)=>{let c=1;for(let i=0;i<k;i++)c=c*(n-i)/(i+1);return c;};
 for(let k=3;k<=5;k++)for(let lost=0;lost<=k-3&&lost<3;lost++){if(lost+3!==k)continue;p+=bin(k-1,2)*Math.pow(ps,3)*Math.pow(1-ps,lost);}
 return clamp(p||ps,0.07,0.93);}
function oddsFromP(p,ov){ov=ov||1.06;p=clamp(p,0.02,0.98);const a=clamp(1/(p*ov),1.01,51),b=clamp(1/((1-p)*ov),1.01,51);return {a:Math.round(a*100)/100,b:Math.round(b*100)/100};}
function fmtOdds(x){return Number(x).toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2});}
function betVolume(t,a,b){const base={GS:1800000,M1000:700000,A500:280000,A250:120000,FIN:900000,C175:35000,C125:25000,C100:18000,C75:12000,C50:8000,M25:3500,M15:1800,DC:60000}[t.tier]||8000;
 const pop=popOf(a)+popOf(b);return Math.round(base*(0.7+pop/80)*(0.85+RNG()*0.3));}
function applyMarket(p,shareA){return clamp(p*0.72+shareA*0.28,0.07,0.93);}
function buildBettingBoard(){if(S._silent)return;const board=[];const seen=new Set();
 const evs=(S.events||[]).filter(e=>!e.dbl&&!e.dc).concat([]);
 // also pre-event markets from calendar if week not started draws... after startWeek events exist
 for(const ev of (S.events||[])){if(ev.dbl||ev.done)continue;const rnd=ev.rounds&&ev.rounds[ev.cur];if(!rnd)continue;
  const cands=rnd.filter(m=>m.a&&m.b&&!m.w&&!m.void).map(m=>({ev,m,A:P(m.a),B:P(m.b)})).filter(x=>x.A&&x.B);
  cands.sort((x,y)=>{const own=(x.A.isMe||x.B.isMe)?-1:(y.A.isMe||y.B.isMe)?1:0;if(own)return own;return Math.min(rankOf(x.A),rankOf(x.B))-Math.min(rankOf(y.A),rankOf(y.B))||TIERS[y.ev.tier].rankOrd-TIERS[x.ev.tier].rankOrd;});
  const nTake=ev.tier==='GS'||ev.tier==='M1000'?3:(ev.human?Math.max(2,cands.some(x=>x.A.isMe||x.B.isMe)?2:2):1);
  for(const c of cands.slice(0,nTake)){
   const id=ev.id+'__'+(c.m.a)+'_'+(c.m.b);if(seen.has(id))continue;seen.add(id);
   const p0=fairMatchP(c.A,c.B,ev.surf,ev.bo);let vol=betVolume(ev,c.A,c.B);if(c.A.isMe||c.B.isMe)vol=Math.max(vol,ev.tier[0]==='M'?6500:ev.tier[0]==='C'?14000:28000);
   let fan=0;if(c.A.isMe||c.B.isMe){const me=ME();fan=clamp(0.12+(me.pop||0)/220,0.08,0.45);}
   let share=clamp((p0>0.5?0.52+ (p0-0.5)*0.7:0.48-(0.5-p0)*0.7)+gauss()*0.06+(c.A.isMe?fan:c.B.isMe?-fan:0),0.18,0.86);
   const pubA=Math.round(vol*share),pubB=vol-pubA;
   const p=applyMarket(p0,share);const od=oddsFromP(p);
   const bettors=Math.max(40,Math.round(vol/18*(0.8+RNG()*0.5)));
   const it={id,eid:ev.id,tid:ev.tid,name:ev.name,tier:ev.tier,surf:ev.surf,bo:ev.bo,a:c.A.id,b:c.B.id,aN:c.A.n,bN:c.B.n,aCC:c.A.cc,bCC:c.B.cc,p0,p,oddsA:od.a,oddsB:od.b,openA:od.a,openB:od.b,vol,pubA,pubB,bettors,pctA:Math.round(share*100),own:c.A.isMe||c.B.isMe,done:false,w:null,openVol:vol,openPubA:pubA,openPubB:pubB,openBettors:bettors};
   board.push(it);
  }
  if(board.length>=10)break;}
 if(S.cur&&S.cur.stage==='qual'&&S.cur.qual&&S.cur.qual.opps){const ev=humanEvent();const oppId=S.cur.qual.opps[S.cur.qual.i];const A=ME(),B=P(oppId);if(ev&&A&&B){const id=ev.id+'__me_'+oppId;if(!seen.has(id)){seen.add(id);const p0=fairMatchP(A,B,ev.surf,ev.bo);let vol=Math.max(betVolume(ev,A,B),ev.tier[0]==='M'?6500:ev.tier[0]==='C'?14000:28000);let fan=clamp(0.12+(A.pop||0)/220,0.08,0.45);let share=clamp((p0>0.5?0.52+(p0-0.5)*0.7:0.48-(0.5-p0)*0.7)+fan+gauss()*0.06,0.18,0.86);const pubA=Math.round(vol*share),pubB=vol-pubA;const p=applyMarket(p0,share);const od=oddsFromP(p);const bettors=Math.max(80,Math.round(vol/16));board.unshift({id,eid:ev.id,tid:ev.tid,name:ev.name,tier:ev.tier,surf:ev.surf,bo:ev.bo,a:'me',b:B.id,aN:A.n,bN:B.n,aCC:A.cc,bCC:B.cc,p0,p,oddsA:od.a,oddsB:od.b,openA:od.a,openB:od.b,vol,pubA,pubB,bettors,pctA:Math.round(share*100),own:true,done:false,w:null,openVol:vol,openPubA:pubA,openPubB:pubB,openBettors:bettors});}}}
 S.market={week:S.week,season:S.season,items:board};S.bets=S.bets||[];
 for(const it of board){ensureLiveState(it);if(!it.own&&RNG()<0.75){const g=rint(0,4);for(let i=0;i<g&&!it.liveSt.done;i++)playLiveGame(it);}}
}
function findMarket(id){return S.market&&S.market.items?S.market.items.find(x=>x.id===id):null;}
function maxBetStake(me){return Math.max(0,Math.min(8000,Math.round((me.money||0)*0.22),me.money>0?me.money:0));}
function placeBet(mid,side,stake,market){const me=ME();const it=findMarket(mid);market=market||'match';if(!it)return {ok:false,msg:'Trh už není k dispozici.'};if(it.own)return {ok:false,msg:'Na vlastní zápas sázet nesmíš – Integritní jednotka tenisu to hlídá.'};if(it.susp&&it.susp.until>Date.now())return {ok:false,msg:'Trh je teď pozastavený.'};if(it.done||(it.liveSt&&it.liveSt.done))return {ok:false,msg:'Zápas už skončil.'};if(market!=='match')ensureLiveState(it);if(market==='set'&&(!it.setM||it.liveSt&&it.liveSt.done))return {ok:false,msg:'Trh na set už není.'};if(market==='game'&&(!it.gameM||it.liveSt&&it.liveSt.done))return {ok:false,msg:'Trh na game už není.'};stake=Math.round(+stake||0);if(stake<50)return {ok:false,msg:'Minimální sázka je $50.'};if(stake>maxBetStake(me))return {ok:false,msg:'Tolik teď vsadit nemůžeš.'};if((S.bets||[]).some(b=>b.mid===mid&&(b.market||'match')===market&&!b.settled))return {ok:false,msg:'Na tento trh už sázku máš.'};
 const odds=oddsForBet(it,market,side);me.money-=stake;S.bets=S.bets||[];S.bets.push({mid,side,stake,odds,market,week:S.week,season:S.season,settled:false,a:it.a,b:it.b,name:it.name});
 const bag=market==='set'?it.setM:market==='game'?it.gameM:it;if(side==='a')bag.pubA+=stake;else bag.pubB+=stake;bag.vol=bag.pubA+bag.pubB;bag.pctA=Math.round(bag.pubA/bag.vol*100);if(market==='match'){const p=applyMarket(it.p0||liveWinP(it),it.pubA/it.vol);const od=oddsFromP(p);it.oddsA=od.a;it.oddsB=od.b;it.p=p;}else refreshLiveMarkets(it);
 saveGame();const lab=market==='set'?'na další set':market==='game'?'na další game':'na vítěze zápasu';return {ok:true,msg:`Live sázka ${fmtMoney(stake)} ${lab} v kurzu ${fmtOdds(odds)} je podaná. Pouze herní peníze.`};}
function findBoardMatch(ev,it){if(!ev||!ev.rounds||!it)return null;
 for(const rnd of ev.rounds){for(const m of rnd||[]){if(!m||!m.w)continue;
  const ids=[m.a,m.b];if(ids.includes(it.a)&&ids.includes(it.b))return m;
  if(it.own&&ids.includes('me')&&(ids.includes(it.b)||ids.includes(it.a)))return m;}}
 return null;}
function setCompleted(s){if(!s)return false;const a=s[0],b=s[1];return (Math.max(a,b)>=6&&Math.abs(a-b)>=2)||Math.max(a,b)>=7;}
function firstSetDone(sets,st){if(st&&((st.sa||0)+(st.sb||0))>=1)return true;if(sets&&sets.some(setCompleted))return true;return false;}
function voidBet(b,me){if(!b||b.settled)return;b.settled=true;b.result='void';b.payout=b.stake;if(me)me.money+=b.stake;}
function settleBetsForEvent(ev){if(!S.market||!S.market.items)return;const me=ME();
 for(const it of S.market.items){if(it.eid!==ev.id||it.done)continue;
  const mm=findBoardMatch(ev,it);const last=ev.rounds&&ev.rounds[ev.rounds.length-1]&&ev.rounds[ev.rounds.length-1][0];
  let w=(mm&&mm.w)||(it.liveSt&&it.liveSt.w)||ev.champ||(last&&last.w)||null;if(!w)continue;it.done=true;it.w=w;
  if(mm&&mm.ret)it.ret=mm.ret;if(mm&&mm.sets)it.sets=mm.sets;
  const fav=it.p0>=0.5?it.a:it.b;const long=it.p0>=0.5?it.b:it.a;const longOdds=it.p0>=0.5?it.openB:it.openA;
  if(!it.ret&&w===long&&(it.pctA>=62&&long===it.b||it.pctA<=38&&long===it.a||longOdds>=2.8)){
   const wn=P(w),ln=P(w===it.a?it.b:it.a);if(wn&&ln&&!S._silent)S.news.unshift({w:S.week,s:S.season,t:`📢 Sázkaři v šoku: ${wn.n} obrátil kurz ${fmtOdds(longOdds)} a vyřadil ${ln.n} (${it.name}). Veřejnost byla na favorita.`});}
  if(it.own&&w==='me'){const under= (it.a==='me'?it.openA:it.openB)>=2.4;if(under)addPop(1.2);}
 }
 for(const b of (S.bets||[])){if(b.settled||b.mid.indexOf(ev.id+'__')!==0)continue;const it=findMarket(b.mid);if(!it||!it.done)continue;
  const ret=it.ret||(it.liveSt&&it.liveSt.ret);const sets=it.sets||(it.liveSt&&it.liveSt.sets);
  if(b.market==='set'||b.market==='game'){voidBet(b,me);continue;}
  if(ret&&!firstSetDone(sets,it.liveSt)){voidBet(b,me);if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:`🎲 Sázka ${fmtMoney(b.stake)} vrácena – skreč před koncem prvního setu (${it.name}).`});continue;}
  b.settled=true;const win=(b.side==='a'&&it.w===it.a)||(b.side==='b'&&it.w===it.b);
  if(win){const pay=Math.round(b.stake*b.odds);b.payout=pay;me.money+=pay;b.result='win';if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:`🎲 Vyhraná sázka: ${fmtMoney(pay)} (kurz ${fmtOdds(b.odds)}) na zápase ${it.name}.`});}
  else{b.payout=0;b.result='lose';}}
}

// --- in-play Markov odds (point → game → tiebreak → set → match) ---
function smoothP(prev,next,w){if(prev==null||isNaN(prev))return next;w=w==null?0.62:w;return prev*(1-w)+next*w;}
function applyPublicSkew(p,share){if(share==null||isNaN(share))return p;return clamp(p+clamp(share-0.5,-0.4,0.4)*0.06,0.02,0.98);}
function servePointP(srv,ret,surf,ctx){if(!srv||!ret)return 0.64;let d=rating(srv,surf)-rating(ret,surf);let p=0.645+d*0.0028;
 if(ctx){if(ctx.enS!=null&&ctx.enS<50)p-=(50-ctx.enS)*0.0007;if(ctx.enR!=null&&ctx.enR<50)p+=(50-ctx.enR)*0.0004;if(ctx.hurtS)p-=0.035;if(ctx.hurtR)p+=0.025;if(ctx.mom)p+=ctx.mom*0.01;}
 return clamp(p,0.48,0.80);}
const _gMemo=new Map();
function pWinGame(p,a,b){if(a>=4&&a-b>=2)return 1;if(b>=4&&b-a>=2)return 0;const q=1-p;if(a>=3&&b>=3){const d=(p*p)/((p*p)+(q*q));if(a===b)return d;return a>b?(p+q*d):(p*d);}const k=(p*10000|0)+'_'+a+'_'+b;if(_gMemo.has(k))return _gMemo.get(k);const v=p*pWinGame(p,a+1,b)+q*pWinGame(p,a,b+1);_gMemo.set(k,v);return v;}
function tbServer(first,tot){if(tot===0)return first;const block=Math.floor((tot-1)/2);return (block%2===0)?(1-first):first;}
const _tbMemo=new Map();
function pWinTB(pA,pB,a0,b0,need,first){need=need||7;if(a0>=need&&a0-b0>=2)return 1;if(b0>=need&&b0-a0>=2)return 0;
 const ck=(pA*1000|0)+'_'+(pB*1000|0)+'_'+a0+'_'+b0+'_'+need+'_'+first;if(_tbMemo.has(ck))return _tbMemo.get(ck);
 const N=need+6;const dp=Array.from({length:N+1},()=>Array(N+1).fill(0.5));
 for(let iter=0;iter<36;iter++){for(let a=0;a<=N;a++){for(let b=0;b<=N;b++){
  if(a>=need&&a-b>=2){dp[a][b]=1;continue;}if(b>=need&&b-a>=2){dp[a][b]=0;continue;}
  const p=tbServer(first,a+b)===0?pA:(1-pB);
  const wa=a+1<=N?dp[a+1][b]:(a+1-b>=2?1:dp[N][b]);
  const wb=b+1<=N?dp[a][b+1]:(b+1-a>=2?0:dp[a][N]);
  dp[a][b]=p*wa+(1-p)*wb;}}}
 const v=dp[Math.min(a0,N)][Math.min(b0,N)];_tbMemo.set(ck,v);return v;}
function pWinSet(pA,pB,gA,gB,server,opts){opts=opts||{};const tbT=opts.tbT||7;const memo=new Map();
 function rec(ga,gb,srv){if(ga>=6&&ga-gb>=2)return 1;if(gb>=6&&gb-ga>=2)return 0;if(ga>=6&&gb>=6)return pWinTB(pA,pB,0,0,tbT,srv,null);
  const k=ga+','+gb+','+srv;if(memo.has(k))return memo.get(k);const pG=srv===0?pWinGame(pA,0,0):1-pWinGame(pB,0,0);const v=pG*rec(ga+1,gb,1-srv)+(1-pG)*rec(ga,gb+1,1-srv);memo.set(k,v);return v;}
 if(opts.tb)return pWinTB(pA,pB,opts.ptA||0,opts.ptB||0,opts.tbT||tbT,opts.tbFirst!=null?opts.tbFirst:server,null);
 if((opts.ptA||0)+(opts.ptB||0)>0){const pG=server===0?pWinGame(pA,opts.ptA||0,opts.ptB||0):1-pWinGame(pB,opts.ptB||0,opts.ptA||0);return pG*rec(gA+1,gB,1-server)+(1-pG)*rec(gA,gB+1,1-server);}
 return rec(gA,gB,server);}
function pWinMatch(pA,pB,sA,sB,need,gA,gB,server,opts){need=need||2;opts=opts||{};if(sA>=need)return 1;if(sB>=need)return 0;
 const pFull0=pWinSet(pA,pB,0,0,0,{tbT:7}),pFull1=pWinSet(pA,pB,0,0,1,{tbT:7}),pAvg=(pFull0+pFull1)/2;
 const memo=new Map();function rec(sa,sb){if(sa>=need)return 1;if(sb>=need)return 0;const k=sa+','+sb;if(memo.has(k))return memo.get(k);const v=pAvg*rec(sa+1,sb)+(1-pAvg)*rec(sa,sb+1);memo.set(k,v);return v;}
 const last=sA+sB===need*2-2;const setOpts=Object.assign({},opts,{tbT:(last&&opts.tb10)?10:(opts.tbT||7)});
 const pS=pWinSet(pA,pB,gA||0,gB||0,server||0,setOpts);return pS*rec(sA+1,sB)+(1-pS)*rec(sA,sB+1);}
function matchServePs(m){const mom=clamp(((m.streak&&m.streak[0])||0)-((m.streak&&m.streak[1])||0),-5,5)/5;
 const pA=servePointP(m.p[0],m.p[1],m.surf,{enS:m.en&&m.en[0],enR:m.en&&m.en[1],hurtS:m.hurt&&m.hurt[0],hurtR:m.hurt&&m.hurt[1],mom});
 const pB=servePointP(m.p[1],m.p[0],m.surf,{enS:m.en&&m.en[1],enR:m.en&&m.en[0],hurtS:m.hurt&&m.hurt[1],hurtR:m.hurt&&m.hurt[0],mom:-mom});
 return [pA,pB];}
function inPlayWinPFromMatch(m){if(!m||!m.p)return 0.5;if(m.done)return m.winner===0?0.999:0.001;const ps=matchServePs(m);return pWinMatch(ps[0],ps[1],m.setsW[0],m.setsW[1],m.need,m.g[0],m.g[1],m.server,{ptA:m.pt[0],ptB:m.pt[1],tb:m.tb,tbT:m.tbT,tbFirst:m.tbFirst,tb10:m.o&&m.o.tb10});}
function inPlayWinPFromSt(it){const st=it.liveSt,A=P(it.a),B=P(it.b);if(!A||!B)return it.p0||0.5;if(st&&st.done)return st.w===it.a?0.999:0.001;
 const pA=servePointP(A,B,it.surf,null),pB=servePointP(B,A,it.surf,null);const need=st&&st.need||Math.ceil((it.bo||3)/2);
 if(!st)return pWinMatch(pA,pB,0,0,need,0,0,0,{});
 return pWinMatch(pA,pB,st.sa||0,st.sb||0,need,st.ga||0,st.gb||0,st.server||0,{ptA:st.pa||0,ptB:st.pb||0,tb:!!st.tb,tbT:st.tbT||7,tbFirst:st.tbFirst!=null?st.tbFirst:st.server});}
function gamePointOf(m,i){if(!m||m.tb)return false;return m.pt[i]>=3&&m.pt[i]>m.pt[1-i];}
function isSetPointM(m){if(!m||m.done)return false;if(m.tb){const a=m.pt[0],b=m.pt[1],n=m.tbT||7;return (a>=n-1&&a-b>=1)||(b>=n-1&&b-a>=1);}
 for(const i of [0,1]){if(!gamePointOf(m,i))continue;const ga=m.g[i]+1,gb=m.g[1-i];if((ga>=6&&ga-gb>=2)||ga>=7||(m.g[0]===6&&m.g[1]===6))return true;}return false;}
function isMatchPointM(m){if(!isSetPointM(m))return false;for(const i of [0,1]){const setNow=m.tb?(m.pt[i]>=(m.tbT||7)-1&&m.pt[i]-m.pt[1-i]>=1):gamePointOf(m,i)&&((m.g[i]+1>=6&&m.g[i]+1-m.g[1-i]>=2)||m.g[i]+1>=7);if(setNow&&m.setsW[i]+1>=m.need)return true;}return false;}
function marketSuspendWhy(m,med){if(med)return 'lékařský timeout';if(!m||m.done)return null;if(isMatchPointM(m))return 'mečbol';if(isSetPointM(m))return 'setbol';if(m.isBreakPoint&&m.isBreakPoint())return 'brejkbol';return null;}
function oddsSparkSVG(hist,w,h){if(!hist||hist.length<2)return '';w=w||148;h=h||22;const lo=0.06,hi=0.94,n=hist.length;
 const pts=hist.map((p,i)=>((i/(n-1))*w).toFixed(1)+','+((1-(clamp(p,lo,hi)-lo)/(hi-lo))*h).toFixed(1)).join(' ');
 return `<svg class="lov-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="#ffd34d" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg>`;}

// --- mid-match retirement (skreč) ---
function matchHeatFactor(surf,week){if(surf==='I')return 0;week=week!=null?week:(typeof S!=='undefined'?S.week:1);if(week<=8||(week>=18&&week<=37))return (week<=5||(week>=24&&week<=33))?1:0.55;return 0.12;}
function retireHazard(p,o){if(!p)return 0;o=o||{};const age=(typeof S!=='undefined'&&S.season)?S.season-p.by:27;let r=0.0065*ageInjF(age);
 r*=1+matchHeatFactor(o.surf||'H',o.week)*0.85;if((o.bo||3)===5)r*=1.35;if(o.long)r*=1.4;if((p.st&&p.st.kon||70)<68)r*=1.25;if((p.load||0)>8)r*=1.2;if(p.injury>0||o.hurt)r*=2.4;if(o.en!=null&&o.en<28)r*=1.8;return clamp(r,0.003,0.22);}
function truncateSetsForRetire(sets,loserIsA){if(!sets||!sets.length)return [[loserIsA?2:3,loserIsA?3:2,null]];
 const keep=sets.map(s=>s.slice());const last=keep[keep.length-1];const hi=Math.max(last[0],last[1]);
 if(hi>=6&&Math.abs(last[0]-last[1])>=2||hi>=7){keep.push([loserIsA?1:3,loserIsA?3:1,null]);}
 else{const lw=loserIsA?0:1;if(last[lw]>=6)last[lw]=Math.min(5,last[lw]);}
 return keep;}

function liveOddsForMatch(m,ev){if(!m||!m.p)return null;
 const it=typeof ensureOwnMatchMarket==='function'?ensureOwnMatchMarket(m,ev):(S.market&&S.market.items&&S.market.items.find(x=>x.own&&(x.a==='me'||x.b==='me')&&(!ev||x.eid===ev.id)));
 const raw=inPlayWinPFromMatch(m);
 const share=it&&it.vol?((it.a==='me'||it.a===m.p[0].id)?it.pubA:it.pubB)/it.vol:0.5;
 let p=applyPublicSkew(raw,share);
 const why=marketSuspendWhy(m,it&&it.susp&&it.susp.med);
 if(why){if(it){if(!it.susp||it.susp.until<Date.now())it.susp={why,until:Date.now()+1600};it.pFrozen=it.pSmooth!=null?it.pSmooth:p;}}
 else if(it&&it.susp&&!it.susp.med&&it.susp.until<=Date.now())it.susp=null;
 const frozen=it&&it.susp&&it.susp.until>Date.now();
 if(!frozen){p=smoothP(it&&it.pSmooth,p,0.62);if(it){it.pSmooth=p;it.pRaw=raw;it.p=p;}}
 else p=it.pFrozen!=null?it.pFrozen:(it.pSmooth!=null?it.pSmooth:p);
 const od=oddsFromP(p,1.075);
 if(it){const meIsA=it.a==='me'||it.a===m.p[0].id;it.oddsA=meIsA?od.a:od.b;it.oddsB=meIsA?od.b:od.a;it.live=true;
  if(!frozen){it.histP=it.histP||[];const last=it.histP[it.histP.length-1];if(last==null||Math.abs(last-p)>0.001||it.histP.length<2){it.histP.push(p);if(it.histP.length>48)it.histP.shift();}}}
 return {p,me:od.a,opp:od.b,it,susp:frozen,why:frozen&&it&&it.susp&&it.susp.why};}

// --- settings (player figures in match view) ---
function gameSettings(){S.set=S.set||{showPl:false};if(S.set.showPl==null)S.set.showPl=false;return S.set;}
function showPlayersOn(){return !!gameSettings().showPl;}
function setShowPlayers(on){gameSettings().showPl=!!on;if(typeof saveGame==='function')saveGame();if(typeof applyShowPlayers==='function')applyShowPlayers();return gameSettings().showPl;}

// --- live / in-play betting ---
function holdP(srv,ret,surf){return pWinGame(servePointP(srv,ret,surf,null),0,0);}
function freshLiveSt(it){return {sa:0,sb:0,ga:0,gb:0,sets:[],server:RNG()<0.5?0:1,need:Math.ceil((it.bo||3)/2),done:false,w:null};}
function ensureLiveState(it){if(!it)return null;if(!it.liveSt)it.liveSt=freshLiveSt(it);refreshLiveMarkets(it);return it.liveSt;}
function liveScoreTxt(st){if(!st)return '0:0';const done=(st.sets||[]).map(s=>s[0]+'–'+s[1]);if(!st.done)done.push((st.ga||0)+'–'+(st.gb||0));const t=done.join(' ')||'0–0';return st.ret?t+' skr.':t;}
function liveWinP(it){return inPlayWinPFromSt(it);}
function liveSetP(it){const st=it.liveSt,A=P(it.a),B=P(it.b);if(!A||!B)return 0.5;const pA=servePointP(A,B,it.surf,null),pB=servePointP(B,A,it.surf,null);if(!st||st.done)return pWinSet(pA,pB,0,0,0,{});return pWinSet(pA,pB,st.ga||0,st.gb||0,st.server||0,{ptA:st.pa||0,ptB:st.pb||0,tb:!!st.tb,tbT:st.tbT||7,tbFirst:st.tbFirst!=null?st.tbFirst:st.server});}
function liveGameP(it){const st=it.liveSt;if(!st||st.done)return 0.5;const A=P(it.a),B=P(it.b);if(!A||!B)return 0.5;const pS=st.server===0?servePointP(A,B,it.surf,null):servePointP(B,A,it.surf,null);const hold=pWinGame(pS,st.server===0?(st.pa||0):(st.pb||0),st.server===0?(st.pb||0):(st.pa||0));return st.server===0?hold:(1-hold);}
function setLiveOdds(bag,p,ov){const od=oddsFromP(clamp(p,0.02,0.98),ov||1.075);bag.p=p;bag.oddsA=od.a;bag.oddsB=od.b;return bag;}
function refreshLiveMarkets(it){if(!it)return;const st=it.liveSt;const raw=liveWinP(it);const skewed=applyPublicSkew(raw,it.vol?it.pubA/it.vol:0.5);it.pRaw=raw;it.pSmooth=smoothP(it.pSmooth,skewed,0.62);const frozen=it.susp&&it.susp.until>Date.now();if(!frozen)setLiveOdds(it,it.pSmooth,1.075);it.pctA=it.vol?Math.round(it.pubA/it.vol*100):50;
 const sp=liveSetP(it);it.setM=it.setM||{pubA:Math.round((it.vol||1000)*0.08),pubB:0,vol:0,bettors:Math.max(12,Math.round((it.bettors||40)*0.2))};it.setM.pubB=it.setM.pubB||Math.max(80,Math.round(it.setM.pubA*((1-sp)/Math.max(sp,0.08))));it.setM.vol=it.setM.pubA+it.setM.pubB;it.setM.pctA=Math.round(it.setM.pubA/it.setM.vol*100);it.setM.n=(st?st.sa+st.sb:0)+1;setLiveOdds(it.setM,applyMarket(sp,it.setM.pubA/it.setM.vol));
 const gp=liveGameP(it);it.gameM=it.gameM||{pubA:Math.round((it.vol||1000)*0.04),pubB:0,vol:0,bettors:Math.max(8,Math.round((it.bettors||40)*0.12))};it.gameM.pubB=it.gameM.pubB||Math.max(50,Math.round(it.gameM.pubA*((1-gp)/Math.max(gp,0.08))));it.gameM.vol=it.gameM.pubA+it.gameM.pubB;it.gameM.pctA=Math.round(it.gameM.pubA/it.gameM.vol*100);it.gameM.srv=st?st.server:0;setLiveOdds(it.gameM,applyMarket(gp,it.gameM.pubA/it.gameM.vol));}
function steamBag(bag,side,base,kind){const mul=kind==='set'?1.4:kind==='break'?1.15:1;const add=Math.max(40,Math.round(base*mul*(0.7+RNG()*0.7)));const w=kind==='set'?0.72:kind==='break'?0.68:0.58;const aw=Math.round(add*w),al=add-aw;if(side===0){bag.pubA=(bag.pubA||0)+aw;bag.pubB=(bag.pubB||0)+al;}else{bag.pubB=(bag.pubB||0)+aw;bag.pubA=(bag.pubA||0)+al;}bag.vol=(bag.pubA||0)+(bag.pubB||0);bag.bettors=(bag.bettors||0)+rint(4,24);bag.pctA=bag.vol?Math.round(bag.pubA/bag.vol*100):50;}
function steamLive(it,ev){if(!it||it.done)return;const kind=ev&&ev.match?'set':(ev&&ev.set!=null?'set':(ev&&ev.brk?'break':'game'));const side=ev&&(ev.set!=null?ev.set:ev.game);if(side==null)return;
 steamBag(it,side,Math.max(200,it.vol*0.045),kind);
 if(it.setM&&ev.set==null&&!it.liveSt.done)steamBag(it.setM,side,Math.max(80,it.setM.vol*0.1),'game');
 if(it.shady&&it.own){const against=it.a==='me'?1:0;const extra=Math.round(it.vol*0.03);if(against===0)it.pubA+=extra;else it.pubB+=extra;it.vol=it.pubA+it.pubB;it.pctA=Math.round(it.pubA/it.vol*100);}
 refreshLiveMarkets(it);}
function resetUnitMarket(it,which){const vol=which==='set'?(it.vol||2000)*0.08:(it.vol||2000)*0.04;const bag={pubA:Math.round(vol*(0.45+RNG()*0.1)),pubB:0,vol:0,bettors:rint(8,30)};bag.pubB=Math.max(40,Math.round(bag.pubA*(0.7+RNG()*0.6)));bag.vol=bag.pubA+bag.pubB;if(which==='set')it.setM=bag;else it.gameM=bag;refreshLiveMarkets(it);}
function settleLiveUnits(it,ev){if(!it)return;const me=ME();
 const pay=(b,win)=>{if(b.settled)return;b.settled=true;if(win){const ret=Math.round(b.stake*b.odds);b.payout=ret;b.result='win';if(me)me.money+=ret;}else{b.payout=0;b.result='lose';}};
 const retiring=ev&&(ev.ret!=null||it.ret||(it.liveSt&&it.liveSt.ret!=null));
 if(ev&&ev.game!=null&&!(retiring&&ev.match)){for(const b of (S.bets||[])){if(b.settled||b.mid!==it.id||b.market!=='game')continue;pay(b,(b.side==='a'&&ev.game===0)||(b.side==='b'&&ev.game===1));}if(!it.liveSt.done)resetUnitMarket(it,'game');}
 if(ev&&ev.set!=null&&!(retiring&&ev.match&&ev.set==null)){for(const b of (S.bets||[])){if(b.settled||b.mid!==it.id||b.market!=='set')continue;pay(b,(b.side==='a'&&ev.set===0)||(b.side==='b'&&ev.set===1));}if(!it.liveSt.done)resetUnitMarket(it,'set');}
 if(ev&&(ev.match||(it.liveSt&&it.liveSt.done))){it.done=true;it.w=(it.liveSt&&it.liveSt.w)||it.w;if(ev.ret!=null){it.ret=it.ret||(it.liveSt&&(ev.ret===0?it.a:it.b));if(it.liveSt)it.liveSt.ret=it.ret;}
  const sets=ev.sets||(it.liveSt&&it.liveSt.sets);const setOk=firstSetDone(sets,it.liveSt)||((ev.sa||0)+(ev.sb||0)>=1);
  for(const b of (S.bets||[])){if(b.settled||b.mid!==it.id)continue;
   if(b.market==='set'||b.market==='game'){voidBet(b,me);continue;}
   if(retiring&&!setOk){voidBet(b,me);continue;}
   if(b.market==='match'||!b.market)pay(b,(b.side==='a'&&it.w===it.a)||(b.side==='b'&&it.w===it.b));
   else voidBet(b,me);}}
}
function playLiveGame(it){const st=ensureLiveState(it);if(!st||st.done)return null;const A=P(it.a),B=P(it.b);if(!A||!B){st.done=true;return null;}
 let won,tb=st.ga>=6&&st.gb>=6;
 if(tb){const p=clamp(0.5+(rating(A,it.surf)-rating(B,it.surf))*0.012,0.2,0.8);won=RNG()<p?0:1;st.ga=won===0?7:6;st.gb=won===1?7:6;}
 else{const held=RNG()<holdP(st.server===0?A:B,st.server===0?B:A,it.surf);won=held?st.server:(1-st.server);if(won===0)st.ga++;else st.gb++;}
 const brk=!tb&&won!==st.server;
 let setW=null,match=false;
 if((st.ga>=6&&st.ga-st.gb>=2)||(st.gb>=6&&st.gb-st.ga>=2)||st.ga===7||st.gb===7){setW=st.ga>st.gb?0:1;st.sets.push([st.ga,st.gb]);if(setW===0)st.sa++;else st.sb++;st.ga=0;st.gb=0;if(st.sa>=st.need||st.sb>=st.need){st.done=true;st.w=st.sa>st.sb?it.a:it.b;it.done=true;it.w=st.w;match=true;}}
 st.server=1-st.server;const ev={game:won,brk,set:setW,match};
 if(!st.done&&!it.own){const cand=RNG()<0.5?0:1;const pl=P(cand===0?it.a:it.b);const long=(st.sa+st.sb>=1)||((st.ga||0)+(st.gb||0)>=8);
  if(pl&&!pl.isMe&&typeof retireHazard==='function'&&RNG()<retireHazard(pl,{surf:it.surf,week:S.week,bo:it.bo,long})/16){st.done=true;st.w=cand===0?it.b:it.a;st.ret=cand===0?it.a:it.b;it.done=true;it.w=st.w;it.ret=st.ret;ev.match=true;ev.ret=cand;}}
 steamLive(it,ev);settleLiveUnits(it,ev);return ev;}
function tickLiveMarkets(n){if(S._silent||!S.market||!S.market.items)return;n=n||1;
 for(const it of S.market.items){if(it.own||it.done)continue;ensureLiveState(it);const k=n+(RNG()<0.3?1:0);for(let i=0;i<k&&!it.liveSt.done;i++)playLiveGame(it);}}
function topUpBettingBoard(){if(S._silent||!S.market)return;S.market.items=S.market.items||[];
 for(const ev of (S.events||[])){if(ev.dbl||ev.done)continue;const rnd=ev.rounds&&ev.rounds[ev.cur];if(!rnd)continue;
  for(const m of rnd){if(!m.a||!m.b||m.w||m.void)continue;const A=P(m.a),B=P(m.b);if(!A||!B)continue;
   const id=ev.id+'__'+m.a+'_'+m.b;if(S.market.items.some(x=>x.id===id))continue;
   if(S.market.items.filter(x=>!x.done).length>=12)return;
   const p0=fairMatchP(A,B,ev.surf,ev.bo);let vol=Math.round(betVolume(ev,A,B)*0.55);let share=clamp(p0*0.85+0.08+gauss()*0.05,0.18,0.86);
   const pubA=Math.round(vol*share),pubB=vol-pubA;const p=applyMarket(p0,share);const od=oddsFromP(p);
   const it={id,eid:ev.id,tid:ev.tid,name:ev.name,tier:ev.tier,surf:ev.surf,bo:ev.bo,a:A.id,b:B.id,aN:A.n,bN:B.n,aCC:A.cc,bCC:B.cc,p0,p,oddsA:od.a,oddsB:od.b,openA:od.a,openB:od.b,vol,pubA,pubB,bettors:Math.max(30,Math.round(vol/20)),pctA:Math.round(share*100),own:A.isMe||B.isMe,done:false,w:null,openVol:vol,openPubA:pubA,openPubB:pubB,openBettors:Math.max(30,Math.round(vol/20))};
   stampOpenVol(it);ensureLiveState(it);if(!it.own&&RNG()<0.7){const g=rint(0,3);for(let i=0;i<g&&!it.liveSt.done;i++)playLiveGame(it);}
   S.market.items.push(it);}}}
function oddsForBet(it,market,side){const bag=market==='set'?it.setM:market==='game'?it.gameM:it;return side==='a'?bag.oddsA:bag.oddsB;}

function stampOpenVol(it){if(!it||it.openVol!=null)return it;it.openVol=it.vol||0;it.openPubA=it.pubA||0;it.openPubB=it.pubB||0;it.openBettors=it.bettors||0;return it;}
function ensureOwnMatchMarket(m,ev){if(!m||!m.p||!m.p[0])return null;
 const meP=m.p[0].isMe?m.p[0]:m.p.find(p=>p&&p.isMe);const opp=m.p[0].isMe?m.p[1]:m.p[0];
 if(!meP||!meP.isMe)return null;
 ev=ev||(typeof MS!=='undefined'&&MS.o&&MS.o.ev)||(typeof humanEvent==='function'?humanEvent():null);
 S.market=S.market||{week:S.week,season:S.season,items:[]};S.market.items=S.market.items||[];
 let it=S.market.items.find(x=>x.own&&!x.done&&opp&&(x.a===opp.id||x.b===opp.id)&&(!ev||x.eid===ev.id));
 if(!it)it=S.market.items.find(x=>x.own&&(x.a==='me'||x.b==='me')&&(!ev||x.eid===ev.id)&&!x.done);
 if(!it&&opp){
  const tier=(ev&&ev.tier)||(typeof MS!=='undefined'&&MS.o&&MS.o.tier)||'M25';
  const surf=m.surf||(ev&&ev.surf)||'H';const bo=m.bo||(ev&&ev.bo)||3;
  const p0=fairMatchP(meP,opp,surf,bo);let vol=betVolume({tier},meP,opp);
  // own matches always get a readable live book, even at ITF
  vol=Math.max(vol,tier[0]==='M'?6500:tier[0]==='C'?14000:28000);
  let fan=clamp(0.12+(meP.pop||0)/220,0.08,0.45);
  let share=clamp((p0>0.5?0.45+(p0-0.5)*0.5:0.55-(0.5-p0)*0.5)+fan*0.25+gauss()*0.04,0.22,0.78);
  const pubA=Math.round(vol*share),pubB=vol-pubA;const p=applyMarket(p0,share);const od=oddsFromP(p);
  const eid=(ev&&ev.id)||('own_'+S.season+'_'+S.week);
  it={id:eid+'__me_'+(opp.id),eid,tid:ev&&ev.tid,name:(ev&&ev.name)||(typeof MS!=='undefined'&&MS.o&&(MS.o.tour||MS.o.title))||'Zápas',tier,surf,bo,a:'me',b:opp.id,aN:meP.n,bN:opp.n,aCC:meP.cc,bCC:opp.cc,p0,p,oddsA:od.a,oddsB:od.b,openA:od.a,openB:od.b,vol,pubA,pubB,bettors:Math.max(80,Math.round(vol/16)),pctA:Math.round(share*100),own:true,done:false,w:null};
  stampOpenVol(it);S.market.items.unshift(it);ensureLiveState(it);
 }
 stampOpenVol(it);return it;}
function steamLivePoint(it,side,kind){if(!it||it.done)return;stampOpenVol(it);
 const frac={point:0.014,game:0.045,break:0.09,set:0.13,match:0.1}[kind]||0.014;
 const floor={point:90,game:220,break:400,set:700,match:500}[kind]||90;
 const base=Math.max(floor,Math.round((it.openVol||it.vol||2000)*frac));
 steamBag(it,side,base,kind==='point'?'game':kind);
 it.liveAdded=Math.max(0,it.vol-(it.openVol||0));
 it._spike=kind;it._spikeAt=Date.now();
 if(typeof refreshLiveMarkets==='function')refreshLiveMarkets(it);}
function onHumanLiveKey(m,r){if(!m||S._silent)return;
 const evObj=(typeof MS!=='undefined'&&MS.o&&MS.o.ev)||(typeof humanEvent==='function'?humanEvent():null);
 const it=ensureOwnMatchMarket(m,evObj);if(!it)return;
 ensureLiveState(it);const meIsA=it.a==='me'||it.a===m.p[0].id;const map=i=>((i===0)===meIsA)?0:1;
 if(r){const ev=r.event||{};let kind='point',side=map(r.winner!=null?r.winner:0);
  if(m.done||ev.match!=null)kind='match';
  else if(ev.set!=null){kind='set';side=map(ev.set);}
  else if(ev.game!=null){const oldSrv=1-m.server;kind=(ev.game!==oldSrv)?'break':'game';side=map(ev.game);}
  steamLivePoint(it,side,kind);
  const st=it.liveSt;if(st){st.sa=m.setsW[0];st.sb=m.setsW[1];st.ga=m.g[0];st.gb=m.g[1];st.sets=m.sets.map(s=>meIsA?s:[s[1],s[0],s[2]]);st.server=m.server;if(m.done){st.done=true;st.w=m.winner===0?it.a:it.b;it.w=st.w;}}
  if(ev.game!=null||ev.set!=null)tickLiveMarkets(ev.set!=null?2:1);
  if(m.done){if(m.ret!=null){it.ret=m.ret===0?it.a:it.b;if(it.liveSt){it.liveSt.ret=it.ret;it.liveSt.sets=m.sets;it.liveSt.sa=m.setsW[0];it.liveSt.sb=m.setsW[1];it.liveSt.w=m.winner===0?it.a:it.b;it.w=it.liveSt.w;}}settleLiveUnits(it,{match:true,ret:m.ret,sets:m.sets,sa:m.setsW[0],sb:m.setsW[1]});}}
 if(typeof updateLiveOddsUI==='function')updateLiveOddsUI();}


function ensureIntegrity(me){me=me||ME();if(!me)return null;me.intg=me.intg||{rep:70,fixes:0,reports:0,flags:0,cool:0,off:null,jobs:[],banned:null};return me.intg;}
function isBanned(me){const b=(me||ME())&& (me||ME()).intg&& (me||ME()).intg.banned;if(!b)return false;if(b.life)return true;const now=S.season*52+S.week;return now<b.until;}
function banWeeksLeft(me){const b=me.intg&&me.intg.banned;if(!b)return 0;if(b.life)return 9999;return Math.max(0,b.until-(S.season*52+S.week));}
function fixOfferChance(ev,me){const t=ev&&ev.tier;const base={M15:.09,M25:.07,C50:.05,C75:.035,C100:.022,C125:.012,C175:.01,A250:.004}[t]||0;if(!base)return 0;
 let r=base;if((me.money||0)<8000)r*=1.55;else if(me.money<25000)r*=1.15;else r*=0.65;
 if(!me.rank||me.rank>400)r*=1.25;else if(me.rank>200)r*=1;else r*=0.45;
 const ig=ensureIntegrity(me);if(ig.reports>0)r*=0.28;if(ig.cool>S.season*52+S.week)r*=0;if(ig.off&&ig.off.s===S.season&&ig.off.w===S.week)r=0;return r;}
function maybeCreateFixOffer(ev,opp){const me=ME();if(!me||S._silent||!ev||ev.dc||ev.dbl)return null;if(isBanned(me))return null;const ig=ensureIntegrity(me);
 if(ig.off&&ig.off.open)return ig.off;if(RNG()>=fixOfferChance(ev,me))return null;
 const typ=RNG()<0.45?'set':(RNG()<0.55?'game':'match');
 const amt0={M15:1200,M25:1800,C50:3200,C75:4500,C100:7000,C125:9000,C175:11000,A250:18000}[ev.tier]||2000;
 const mul=typ==='match'?1.6:typ==='set'?1:0.6;const amt=Math.round(amt0*mul*(0.85+RNG()*0.4)/50)*50;
 const txt={set:'prohrál první set',game:'ztratil jednu servisovou hru',match:'zápas nedotáhl do výhry'}[typ];
 ig.off={open:1,typ,amt,txt,eid:ev.id,opp:opp&&opp.id,oppN:opp&&opp.n,tier:ev.tier,name:ev.name,s:S.season,w:S.week};S.fixAlert=true;return ig.off;}
function respondFix(choice){const me=ME();const ig=ensureIntegrity(me);const o=ig.off;if(!o||!o.open)return {ok:false,msg:'Nabídka už neplatí.'};o.open=0;o.choice=choice;ig.cool=S.season*52+S.week+8;
 if(choice==='refuse'){ig.rep=clamp(ig.rep+2,0,100);saveGame();return {ok:true,msg:'Nabídku odmítáš. Žádné peníze, žádný dluh.'};}
 if(choice==='report'){ig.rep=clamp(ig.rep+14,0,100);ig.reports++;ig.cool=S.season*52+S.week+24;addPop(2.2);const caught=RNG()<0.55;
  S.news.unshift({w:S.week,s:S.season,t:caught?`🛡️ ${IJT} děkuje za oznámení. Anonymní síť u ${o.name} se podařilo narušit.`:`🛡️ Nahlásil jsi pokus o ovlivnění zápasu ${IJT}. Případ se vyšetřuje.`});
  checkAchievements();saveGame();return {ok:true,msg:caught?`Nahlášeno. ${IJT} případ bere vážně a část sítě zasáhla.`:`Nahlášeno. ${IJT} má tvé svědectví.`};}
 if(choice==='accept'){ig.fixes++;ig.rep=clamp(ig.rep-18,0,100);const half=Math.round(o.amt*0.45);me.money+=half;o.paid=half;o.active=1;S.fixJob={typ:o.typ,amt:o.amt,eid:o.eid,opp:o.opp,half};
  S.news.unshift({w:S.week,s:S.season,t:'📩 Přišly herní peníze z anonymního zdroje. Na sázkovém trhu se začínají dít divné věci.'});
  tiltMarketForFix(o);saveGame();return {ok:true,msg:`Přijímáš. Záloha ${fmtMoney(half)} je na účtu. Druhá část přijde, jen když „splníš“ úkol – a riskuješ zákaz startu i konec kariéry.`};}
 return {ok:false,msg:'Neplatná volba'};}
function tiltMarketForFix(o){if(!S.market||!S.market.items||!o)return;const it=S.market.items.find(x=>x.own&&x.eid===o.eid)||S.market.items.find(x=>x.own);
 if(!it)return;const shady=Math.round(it.vol*(0.35+RNG()*0.35));
 if(it.a==='me'){it.pubB+=shady;}else{it.pubA+=shady;}it.vol=it.pubA+it.pubB;it.pctA=Math.round(it.pubA/it.vol*100);it.shady=1;
 const p=applyMarket(it.p0,it.pubA/it.vol);const od=oddsFromP(p);it.oddsA=od.a;it.oddsB=od.b;it.p=p;}
function fixFulfilled(m,job){if(!m||!job)return false;if(job.typ==='match')return m.winner!==0;if(job.typ==='set')return (m.setsW[1]||0)>=1||m.winner!==0;if(job.typ==='game')return (m.st[0].srvGames||0)>(m.st[0].srvHeld||0)||m.winner!==0;return false;}
function resolveFixJob(m){const me=ME();const ig=ensureIntegrity(me);const job=S.fixJob;if(!job||!ig.off)return;const ok=fixFulfilled(m,job);
 if(ok){const rest=job.amt- (ig.off.paid||0);if(rest>0)me.money+=rest;ig.off.active=0;ig.off.done='ok';ig.flags++;S.news.unshift({w:S.week,s:S.season,t:'💸 Došla druhá část anonymní částky. Na trhu se tohle bude pamatovat.'});}
 else{ig.off.done='fail';ig.off.active=0;ig.flags+=2;S.news.unshift({w:S.week,s:S.season,t:'📩 Anonymní kontakt je nespokojený – úkol nebyl splněný. Podezření ale zůstává.'});}
 S.fixJob=null;saveGame();}
function integrityTick(){if(S._silent)return;const me=ME();if(!me)return;const ig=ensureIntegrity(me);if(isBanned(me)){if(!ig.banned.life&&banWeeksLeft(me)<=0){ig.banned=null;S.news.unshift({w:S.week,s:S.season,t:'✅ Zákaz startu vypršel. Můžeš se vrátit na okruh – pod dohledem.'});}return;}
 if(ig.fixes<=0&&ig.flags<=0)return;const p=clamp(0.04*ig.fixes+0.035*ig.flags+(ig.off&&ig.off.done==='ok'?0.05:0)-ig.reports*0.01,0,0.55);
 if(RNG()>p)return;startInvestigation();}
function startInvestigation(){const me=ME();const ig=ensureIntegrity(me);const ev=1*ig.fixes+0.6*ig.flags-0.4*ig.reports;let kind='fine',weeks=0,fine=0,life=false;
 if(ev>=4.5||ig.fixes>=3){kind='life';life=true;}
 else if(ev>=2.8||ig.fixes>=2){kind='long';weeks=rint(26,78);}
 else if(ev>=1.4){kind='short';weeks=rint(6,18);fine=Math.max(4000,Math.round(me.money*0.25));}
 else{kind='fine';fine=Math.max(2000,Math.round(1500+ig.fixes*4000));}
 if(fine){me.money-=fine;if(me.money<-2000)me.money=-2000;}
 if(life||weeks){for(const sp of Object.keys(me.spons||{}))if(me.spons[sp])me.spons[sp].on=false;}
 addPop(life?-35:(weeks>=26?-22:(weeks? -12:-6)));
 ig.banned=life?{life:true,reason:'Ovlivňování zápasů',s:S.season,w:S.week}:{life:false,until:S.season*52+S.week+weeks,weeks,reason:'Ovlivňování zápasů',s:S.season,w:S.week};
 ig.fixes=0;ig.flags=0;me.retired=!!life;
 const msg=life?`🚫 ${IJT} ti za ovlivňování zápasů uděluje doživotní zákaz. Kariéra na okruhu končí.`:weeks?`🚫 ${IJT} ti zakazuje start na ${weeks} týdnů${fine?' a ukládá pokutu '+fmtMoney(fine):''}. Sponzoři odcházejí.`:`⚠️ ${IJT} ti uděluje pokutu ${fmtMoney(fine)} a důtku. Další pochybení by skončilo zákazem.`;
 S.news.unshift({w:S.week,s:S.season,t:msg});S.invAlert={kind,weeks,fine,life,msg};saveGame();checkAchievements();}

// wrap Match edge for tanking + rivalry nerves
(function(){if(typeof Match==='undefined')return;const _be=Match.prototype.baseEdge;Match.prototype.baseEdge=function(s,r,A,B){const out=_be.call(this,s,r,A,B);
  const job=this.o&&this.o.fixJob;if(job&&this.p[0]&&this.p[0].isMe&&!this.fixDone){let need=false;if(job.typ==='match')need=true;else if(job.typ==='set'&&(this.setsW[1]||0)<1)need=true;else if(job.typ==='game'&&!this.fixGameDone)need=true;
   if(need){const hum=s===0;out.d+=(hum?-0.085:0.085);}
  }
  if(this.p[0]&&this.p[0].isMe&&this.p[1]&&isRival(this.p[1].id)){out.d+= (s===0?0.006:-0.006);}
  if(this.p[0]&&this.p[0].isMe){const sb=gearSurfBonus(this.p[0],this.surf);if(sb)out.d+=(s===0?sb:-sb)*0.002;}
  return out;};
 const _sc=Match.prototype.score;Match.prototype.score=function(w){const ev=_sc.call(this,w);const job=this.o&&this.o.fixJob;if(job&&job.typ==='game'&&ev&&ev.game!=null&&ev.game===1)this.fixGameDone=1;return ev;};
})();

function v6EnsurePlayer(p){if(!p||!p.isMe)return;p.fitness=p.fitness!=null?p.fitness:(p.fyzio||0);p.physio=p.physio!=null?p.physio:(p.fyzio||0);p.manager=p.manager||0;p.eq=p.eq||{raketa:'all',boty:'all',vyplet:'all'};p.dpw=p.dpw||new Array(52).fill(0);p.intg=p.intg||{rep:70,fixes:0,reports:0,flags:0,cool:0,off:null,jobs:[],banned:null};p.sponsOff=p.sponsOff||[];if(p.car&&!p.car.davis)p.car.davis={p:0,w:0,l:0,title:0};}
function v6Migrate(s){if(!s)return s;if(s.players){for(const p of s.players){if(!p.dpw)p.dpw=new Array(52).fill(0);if(p.isMe)v6EnsurePlayer(p);}}
 s.bets=s.bets||[];s.market=s.market||null;s.davis=s.davis||null;s.set=s.set||{showPl:false};if(s.set.showPl==null)s.set.showPl=false;if(s.v<6)s.v=6;return s;}
function v6AfterNewGame(){const me=ME();v6EnsurePlayer(me);initDoublesPoints();S.bets=[];S.market=null;S.davis={season:S.season,qual:null,fin:null,nom:null};S.set={showPl:false};}
function v6AfterStartWeek(silent){if(silent||S._silent)return;setupDavisEvent();buildBettingBoard();const ev=humanEvent();if(ev&&S.plan&&S.plan.dbl)startHumanDoubles(ev);}
function startHumanDoubles(sing){const t=CAL_BY_ID[sing.tid];const me=ME();if(!t||!S.plan||!S.plan.dbl)return;const part=P(S.plan.dbl);if(!part)return;
 const pair=makePair(me,part);const opps=[];const pool=S.order.map(P).filter(p=>p&&!p.isMe&&p.id!==part.id&&!p.retired&&!(p.injury>0)).slice(0,40);
 for(let i=0;i<15;i+=2){const a=pool[i],b=pool[i+1]||pool[0];if(a&&b)opps.push(makePair(a,b));}
 const ev=createDoublesEvent(t,pair,opps);S.events.push(ev);S.curDbl={ev:ev.id,partner:part.id,status:'alive'};}

function v6FinalizeDoubles(ev,earned){if(!ev.dbl)return;let g=0;while(!ev.done&&g++<20){for(const m of ev.rounds[ev.cur]){if(m.w||m.void)continue;if(!m.a||!m.b){m.w=m.a||m.b;continue;}
  if((m.a==='me'||m.b==='me')&&S.curDbl&&S.curDbl.status==='alive'&&!S._silent){/* wait for human, but at week end auto-sim remaining */}
  const A=m.ap||P(m.a),B=m.bp||P(m.b);if(!A||!B){m.w=m.a||m.b;continue;}const q=quickMatch(A,B,ev.surf,3,ev.cc);m.w=q.w;m.sets=q.sets;}
 if(ev.rounds[ev.cur].every(m=>m.w||m.void)){if(ev.rounds[ev.cur].length===1){ev.champ=ev.rounds[ev.cur][0].w;ev.done=true;ev.res[ev.champ]=ev.nr;}
  else{const r=ev.rounds[ev.cur];const nx=[];for(let i=0;i<r.length;i+=2)nx.push({a:r[i].w,b:r[i+1].w,w:null,sets:null});ev.cur++;ev.rounds.push(nx);}}
 }
 const week=S.week-1>=0?S.week-1:0;
 for(const id in ev.res){const res=ev.res[id];const idx=Math.max(0,ev.nr-res);const pts=dblPtsFor(ev.tier,idx);const p=P(id);if(p){p.dpw=p.dpw||new Array(52).fill(0);p.dpw[week]=(p.dpw[week]||0)+pts;}}
 if(ev.champ){const w=P(ev.champ);if(w){w.dsw=(w.dsw||0)+1;if(w.isMe){ME().car.dtitles=(ME().car.dtitles||0)+1;ME().car.dblTitleList=ME().car.dblTitleList||[];ME().car.dblTitleList.push({s:S.season,name:ev.name,tier:ev.tier});if(!S._silent)S.news.unshift({w:S.week,s:S.season,t:`🤝 Titul ve čtyřhře! ${ev.name}`});}}}
 computeDRanks();checkAchievements();}

function v6AfterEndWeek(silent,earned){if(silent||S._silent)return;
 for(const ev of (S._endedNow||[])){settleBetsForEvent(ev);if(ev.dbl)v6FinalizeDoubles(ev,earned);if(ev.dc&&ev.human&&ev.done){/* score already resolved */}}
 integrityTick();updateSponsors(ME());computeDRanks();
 const me=ME();if(me&&me.money<-5000){let fired=false;for(const k of ['manager','mental','fitness','physio']){if(staffLvl(me,k)>0){me[k]=0;if(k==='physio')me.fyzio=0;fired=true;}}if(me.coach>1){me.coach=1;fired=true;}if(fired)S.news.unshift({w:S.week,s:S.season,t:'💸 Došly peníze — část týmu jsi musel propustit.'});}
}

function v6OnHumanMatch(ev,oppId,won){noteRivalry(oppId,won);}
function v6OnEventFinished(ev){if(!ev.dc)paySponsorBonuses(ev,ev.champ==='me');if(ev.dc&&!ev._dcResolved)resolveDavisTie(ev,ev.champ==='me');}

// energy helpers used by endWeek override bits
function v6EnergyGain(me,played){const fit=staffLvl(me,'fitness'),ph=staffLvl(me,'physio');return (played?34:50)+ph*5+fit*6;}

// --- achievements & engine hooks (v6 loads after engine.js) ---
Object.assign(ACH,{
 dbl_title:['Titul ve čtyřhře','Vyhraj turnaj ve čtyřhře','🤝'],
 davis:['Reprezentace','Zahraj za zemi v Davis Cupu','🏳️'],
 davis_win:['Pohár národa','Vyhraj baráž nebo finále Davis Cupu','🏅'],
 staff_full:['Kompletní tým','Měj trenéra, kondici, fyzio, mentálního kouče i manažera','🧑‍🤝‍🧑'],
 sponsor3:['Ambassadorská smlouva','Měj tři aktivní sponzory','💼'],
 clean:['Čistý štít','Nahlas pokus o ovlivnění zápasu Integritní jednotce tenisu','🛡️']
});
const _checkAch=checkAchievements;
checkAchievements=function(){_checkAch();const me=ME();if(!me||S._silent)return;const a=me.ach;const got=k=>{if(!a[k]){a[k]={s:S.season,w:S.week};S.news.unshift({w:S.week,s:S.season,t:`🏅 Úspěch: ${ACH[k][0]}`});}};
 if((me.car.dtitles||0)>0||(me.car.dblTitleList||[]).length)got('dbl_title');
 if(me.car.davis&&me.car.davis.p>0)got('davis');if(me.car.davis&&(me.car.davis.w>0||me.car.davis.title))got('davis_win');
 if(staffLvl(me,'coach')>=1&&staffLvl(me,'fitness')>=1&&staffLvl(me,'physio')>=1&&staffLvl(me,'mental')>=1&&staffLvl(me,'manager')>=1)got('staff_full');
 if(SPONSORS_V6.filter(s=>me.spons&&me.spons[s.id]&&me.spons[s.id].on!==false).length>=3)got('sponsor3');
 const ig=me.intg;if(ig&&ig.reports>0)got('clean');};

POP_TF.DC=2.2;POP_TITLE.DC=6;

const _startWeek=startWeek;
startWeek=function(silent){const me=ME();if(me&&isBanned(me)&&S.plan&&S.plan.tid!=='dc')S.plan=null;
 _startWeek(silent);v6AfterStartWeek(silent);};

const _finalizeEvent=finalizeEvent;
finalizeEvent=function(ev,earned){
 if(ev&&ev.dbl){v6FinalizeDoubles(ev,earned);settleBetsForEvent(ev);return;}
 if(ev&&ev.dc){if(!ev.done){let g=0;while(!ev.done&&g++<8){simRoundAI(ev);if(roundComplete(ev))advanceRound(ev);}}if(ev.champ==='me'||ev.champ){ev.res=ev.res||{};if(ev.champ==='me')ev.res.me=ev.nr||1;}resolveDavisTie(ev,ev.champ==='me');ev._dcResolved=1;if(ev.human)humanEventFinished(ev);settleBetsForEvent(ev);return;}
 _finalizeEvent(ev,earned);settleBetsForEvent(ev);};

const _recordHumanMatch=recordHumanMatch;
recordHumanMatch=function(ev,oppId,won,info,isQual){_recordHumanMatch(ev,oppId,won,info,isQual);v6OnHumanMatch(ev,oppId,won);};

const _humanEventFinished=humanEventFinished;
humanEventFinished=function(ev){_humanEventFinished(ev);v6OnEventFinished(ev);};

const _migrateSave=migrateSave;
migrateSave=function(s){s=_migrateSave(s);return v6Migrate(s);};

const _loadGame=loadGame;
loadGame=function(){const ok=_loadGame();if(ok){const me=ME();if(me)v6EnsurePlayer(me);initDoublesPoints();computeDRanks();maybeNominateDavis();}return ok;};

const _newGame=newGame;
newGame=function(opts){const r=_newGame(opts);v6AfterNewGame();saveGame();return r;};

const _eligibility=eligibility;
eligibility=function(t,p){p=p||ME();if(p&&isBanned(p)){const left=banWeeksLeft(p);return {mode:null,txt:p.intg&&p.intg.banned&&p.intg.banned.life?('Doživotní zákaz startu od '+IJT+'.'):(`Zákaz startu od ${IJT} — zbývá ${left} týd.`)};}
 if(t&&t.tier==='DC'){const d=S.davis&&S.davis.nom;if(d&&d.ok&&d.accepted&&d.week===S.week)return {mode:'main',txt:'Nominace do Davis Cupu'};return {mode:null,txt:'Do Davis Cupu se postupuje nominací svazu.'};}
 return _eligibility(t,p);};

const _endWeek=endWeek;
endWeek=function(silent){
 if(!silent){const me=ME();if(me){const _add=me.energy;}}
 // intercept energy/pop after original by adjusting once it returns? Original already applied fyzio energy.
 // Run original, then integrity (week already incremented). To keep investigation on the finishing week, tick BEFORE original week++.
 // We reimplement the late hooks by wrapping weeklyInjuries? Simpler: tick after, news week is next week — acceptable.
 _endWeek(silent);
 v6AfterEndWeek(silent);
 if(!silent){const me=ME();if(me){me.energy=clamp(me.energy+staffLvl(me,'fitness')*6,0,100);const mg=staffLvl(me,'manager');if(mg&&me.pop)me.pop=clamp(me.pop+mg*0.04,0,100);}}
};

const _simMatchAI=simMatchAI;
simMatchAI=function(ev,m){if(m.w||m.void)return _simMatchAI(ev,m);
 const it=S.market&&S.market.items&&S.market.items.find(x=>x.eid===ev.id&&((x.a===m.a&&x.b===m.b)||(x.a===m.b&&x.b===m.a)));
 if(it&&it.liveSt){ensureLiveState(it);while(!it.liveSt.done)playLiveGame(it);const w=it.liveSt.w;if(!w){return _simMatchAI(ev,m);}
  const flip=it.a!==m.a;const sets=(it.liveSt.sets||[]).map(s=>flip?[s[1],s[0]]:s);applyResult(ev,m,w,sets);return;}
 _simMatchAI(ev,m);};

// ===================== UI: core, create, home =====================
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UI={tab:'home',mapWeek:null,zoom:'world',rf:'top',rs:'',tt:'tvrdy',speed:4,create:{style:'ALL',hand:'R',bh1:false,look:{skin:'#e8b896',hair:'#3a2a1a',shirt:'#2f7bff'}}};
const TIER_ICON={GS:'💎',M1000:'👑',A500:'🥈',A250:'🥉',C175:'🏅',C125:'🎾',C100:'🎾',C75:'🎾',C50:'🎾',M25:'🌱',M15:'🌱',FIN:'🌟',DC:'🏳️'};
function toast(m){const d=document.createElement('div');d.className='toast';d.innerHTML=m;document.body.appendChild(d);setTimeout(()=>d.remove(),2700);}
function modal(html,lock){closeModal();const bg=document.createElement('div');bg.className='modal-bg';bg.id='mbg';if(lock)bg.dataset.lock=1;bg.innerHTML=`<div class="modal">${html}</div>`;bg.addEventListener('click',e=>{if(e.target===bg&&!bg.dataset.lock)closeModal();});document.body.appendChild(bg);return bg;}
function closeModal(){const m=$('#mbg');if(m)m.remove();}
function confirmBox(title,text,okTxt,fn){modal(`<h2>${title}</h2><p class="mut">${text}</p><div class="row" style="margin-top:14px"><button class="btn ghost" style="flex:1" onclick="closeModal()">Zpět</button><button class="btn" style="flex:1" id="cfok">${okTxt}</button></div>`);$('#cfok').onclick=()=>{closeModal();fn();};}
function confetti(){const c=document.createElement('div');c.className='confetti';const cols=['#ffd34d','#36d1ff','#3ee68a','#ff5d73','#c9a2ff','#fff'];for(let i=0;i<90;i++){const e=document.createElement('i');e.style.left=Math.random()*100+'%';e.style.background=cols[i%cols.length];e.style.animationDuration=(1.8+Math.random()*2.2)+'s';e.style.animationDelay=Math.random()*0.6+'s';e.style.transform=`rotate(${Math.random()*360}deg)`;c.appendChild(e);}document.body.appendChild(c);setTimeout(()=>c.remove(),5000);}
const SKINS=['#f5d0b0','#e8b896','#d29b72','#a8714a','#7a4b2e','#5a3420'];
const HAIRS=['#1b1410','#3a2a1a','#6b4423','#a86b32','#d9b26a','#e9e1d0','#b23a1e'];
const SHIRTS=['#2f7bff','#ff4d6d','#22c55e','#f59e0b','#a855f7','#ffffff','#111827','#06b6d4','#ef4444'];
function lookFor(p){if(p.look)return p.look;const h=hashStr(p.id+p.n);return {skin:SKINS[h%6],hair:HAIRS[(h>>3)%7],shirt:SHIRTS[(h>>6)%9],band:(h>>9)%3===0};}
function avatarSVG(p,size){const l=lookFor(p);const band=l.band||p.isMe;return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64"><path d="M8 66 C10 49 21 44 32 44 C43 44 54 49 56 66Z" fill="${l.shirt}"/><path d="M25 44.5 L32 52 L39 44.5" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2.2" stroke-linejoin="round"/><rect x="27" y="35" width="10" height="10" rx="3" fill="${l.skin}"/><ellipse cx="20.3" cy="28.5" rx="2.2" ry="3.2" fill="${l.skin}"/><ellipse cx="43.7" cy="28.5" rx="2.2" ry="3.2" fill="${l.skin}"/><ellipse cx="32" cy="27" rx="12" ry="13.5" fill="${l.skin}"/><path d="M19.6 26 C18.5 13 26.5 9.5 33 9.5 C41 9.5 46.5 14.5 44.4 26 C42.5 19 37 16.8 31.5 17.5 C26 18 22 21 19.6 26Z" fill="${l.hair}"/>${band?`<rect x="19.6" y="19.6" width="24.8" height="4" rx="2" fill="${l.shirt}" stroke="rgba(0,0,0,.15)"/>`:''}<circle cx="27.5" cy="28.5" r="1.5" fill="#15151a"/><circle cx="36.5" cy="28.5" r="1.5" fill="#15151a"/><path d="M27.5 34 Q32 37.3 36.5 34" stroke="#80402e" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;}
const tierBadge=t=>`<span class="tier" style="background:${TIERS[t].color}">${TIERS[t].short}</span>`;
const surfChip=s=>`<span class="surf" style="background:${SURF[s].color}">${SURF[s].name}</span>`;
const rankTxt=p=>p&&p.rank?p.rank+'.':'—';
function pName(id){const p=P(id);return p?p.n:'?';}
function shortName(p){if(!p)return '?';const parts=p.n.split(' ');return parts.length>1?parts[0][0]+'. '+parts.slice(1).join(' '):p.n;}
function moveTag(p){if(!p.rank||!p.prev)return p.rank&&!p.prev?'<span class="mv good">NOVÝ</span>':'';const d=p.prev-p.rank;if(d>0)return `<span class="mv good">▲${d}</span>`;if(d<0)return `<span class="mv bad">▼${-d}</span>`;return '<span class="mv mut">•</span>';}
function ovRing(v,size,label){size=size||86;const pct=clamp((v-30)/70,0,1)*100;return `<div class="ov" style="width:${size}px;height:${size}px;background:conic-gradient(#ffd34d ${pct*0.5}%,#36d1ff ${pct}%,rgba(255,255,255,.08) ${pct}%)"><div style="position:absolute;inset:6px;border-radius:50%;background:radial-gradient(circle at 50% 30%,#1b3d93,#0b1a42)"></div><div style="position:relative"><b style="font-size:${size*0.34}px">${Math.round(v)}</b><small>${label||'úroveň'}</small></div></div>`;}
function segBar(v){const n=20,on=Math.round(v/5);let h='';for(let i=0;i<n;i++)h+=`<span class="${i<on?(i>=16?'hi':'on'):''}"></span>`;return `<div class="seg">${h}</div>`;}
function statRows(p,withXp){const st=p.st;const b=meBonus(p);return STAT_KEYS.map(k=>{const v=st[k];const bonus=b&&b[k]?`<span class="gold tiny"> +${b[k]}</span>`:'';const xp=withXp?`<div class="bar xp"><i style="width:${clamp(p.xp[k]/xpNeed(v)*100,0,100)}%"></i></div>`:'';return `<div class="lvl"><div class="nm">${STAT_NAMES[k]}</div><div>${segBar(v)}${xp}</div><div class="v">${Math.round(v)}${bonus}</div></div>`;}).join('');}

function renderTop(){const me=ME();const en=Math.round(me.energy);
 return `<div class="top"><div class="wk">Týden ${S.week} · ${S.season}<small>${weekLabel(S.season,S.week)}</small></div><div class="sp"></div>
 <span class="pill gold">💰 ${fmtMoney(me.money)}</span><span class="pill" title="Energie">⚡ <span class="${en<30?'bad':en<60?'warn':'good'}">${en}</span></span><span class="pill cy">🏅 ${rankTxt(me)}</span></div>`;}
function renderNav(){const t=[['home','🏠','Domů'],['tour','🗺️','Turnaje'],['train','💪','Trénink'],['rank','📊','Žebříček'],['career','🏆','Kariéra']];const cur=UI.tab==='event'?'home':UI.tab;
 return `<nav class="nav">${t.map(x=>`<button class="${cur===x[0]?'on':''}" onclick="go('${x[0]}')"><span class="i">${x[1]}</span>${x[2]}</button>`).join('')}</nav>`;}
function go(tab){UI.tab=tab;if(tab==='tour'&&UI.mapWeek==null)UI.mapWeek=S.week;render();window.scrollTo(0,0);}
function render(){
 const app=$('#app');
 if(!S){app.innerHTML=renderCreate();return;}
 let v='';
 switch(UI.tab){case 'home':v=renderHome();break;case 'tour':v=renderTour();break;case 'train':v=renderTrain();break;case 'rank':v=renderRank();break;case 'career':v=renderCareer();break;case 'event':v=renderEvent();break;}
 app.innerHTML=renderTop()+`<div class="view">${v}</div>`+renderNav();
 if(UI.tab==='tour')afterTour();
 if(typeof v6RenderModals==='function')v6RenderModals();
 if(S.injAlert&&!document.getElementById('mbg')&&!document.getElementById('mv'))injAlertModal();
 if(S.seasonRecap&&!document.getElementById('mbg')&&!document.getElementById('mv'))seasonRecapModal();
 if(S.live&&!UI.resumeAsked&&!document.getElementById('mv')){UI.resumeAsked=true;setTimeout(resumePrompt,60);}
}

// ---------- create player ----------
function renderCreate(){const c=UI.create;const cc=Object.keys(COUNTRIES).filter(k=>k!=='NEU').sort((a,b)=>COUNTRIES[a][1].localeCompare(COUNTRIES[b][1],'cs'));
 const styles=[['ALL','Všestranný','Vyvážené dovednosti bez slabin'],['ATK','Útočník','Silný forhend, hraje na vítězné údery'],['BIG','Dělovač','Mocný servis, kratší výměny'],['BASE','Baseliner','Jistota ze základní čáry, return'],['CTR','Obránce','Kondice a return, dlouhé výměny']];
 const fake={id:'me',n:'x',isMe:true,look:c.look};
 return `<div class="view" style="padding-top:26px">
 <div class="c" style="margin-bottom:18px">${ballSVG(70)}<div class="logo" style="margin-top:8px">TENIS<br>MANAŽER<small>KARIÉRA</small></div></div>
 <div class="card"><h3>👤 Nový hráč</h3>
 <div class="row" style="align-items:flex-start;gap:14px"><div id="cav">${avatarSVG(fake,84)}</div><div class="col" style="flex:1">
 <label class="tiny mut">Jméno a příjmení</label><input id="cname" maxlength="26" placeholder="např. Jan Novák" value="${esc(c.name||'')}" oninput="UI.create.name=this.value">
 <label class="tiny mut">Země</label><select id="ccc" onchange="UI.create.cc=this.value">${cc.map(k=>`<option value="${k}" ${k===(c.cc||'CZE')?'selected':''}>${flag(k)} ${COUNTRIES[k][1]}</option>`).join('')}</select></div></div>
 <div class="tiny mut" style="margin:12px 0 6px">Vzhled</div>
 <div class="row" style="gap:6px;flex-wrap:wrap">${SKINS.map(s=>`<button class="sw ${c.look.skin===s?'on':''}" style="background:${s}" onclick="UI.create.look.skin='${s}';render()"></button>`).join('')}</div>
 <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${HAIRS.map(s=>`<button class="sw ${c.look.hair===s?'on':''}" style="background:${s}" onclick="UI.create.look.hair='${s}';render()"></button>`).join('')}</div>
 <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${SHIRTS.map(s=>`<button class="sw ${c.look.shirt===s?'on':''}" style="background:${s}" onclick="UI.create.look.shirt='${s}';render()"></button>`).join('')}</div>
 </div>
 <div class="card"><h3>✋ Ruka a bekhend</h3><div class="grid2"><button class="opt ${c.hand==='R'?'on':''}" onclick="UI.create.hand='R';render()"><b>Pravák</b><div class="tiny mut">87 % hráčů okruhu</div></button><button class="opt ${c.hand==='L'?'on':''}" onclick="UI.create.hand='L';render()"><b>Levák</b><div class="tiny mut">Nepříjemný slajs do bekhendu na výhodách</div></button>
 <button class="opt ${!c.bh1?'on':''}" onclick="UI.create.bh1=false;render()"><b>Obouruční bekhend</b><div class="tiny mut">Jistota a return</div></button><button class="opt ${c.bh1?'on':''}" onclick="UI.create.bh1=true;render()"><b>Jednoruční bekhend</b><div class="tiny mut">Lepší slajs a kraťasy</div></button></div></div>
 <div class="card"><h3>🎾 Herní styl</h3><div class="col">${styles.map(s=>`<button class="opt ${c.style===s[0]?'on':''}" onclick="UI.create.style='${s[0]}';render()"><b>${s[1]}</b><div class="small mut">${s[2]}</div></button>`).join('')}</div></div>
 <div class="card small mut">Je ti 17 let a začínáš bez žebříčku jako nadějný junior. Hraj turnaje ITF (hlavně domácí), sbírej body, trénuj a probojuj se přes Challengery až na Grand Slamy. Žebříček 2 296 hráčů ATP (k 9. 11. 2026) je ze skutečných dat; kalendář se každou sezónu posune na reálné termíny daného roku a prize money rostou.</div>
 <button class="btn big gold" onclick="uiCreate()">Začít kariéru ▶</button></div>`;}
function ballSVG(s){return `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><defs><radialGradient id="bg1" cx="35%" cy="30%"><stop offset="0" stop-color="#f6ff9a"/><stop offset="1" stop-color="#b9d60f"/></radialGradient></defs><circle cx="50" cy="50" r="44" fill="url(#bg1)" stroke="#88a000" stroke-width="2"/><path d="M14 30 C40 40 40 60 14 72" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M86 28 C60 40 60 60 86 72" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;}
function uiCreate(){const c=UI.create;const name=(c.name||'').trim();if(name.length<2){toast('Zadej jméno hráče');return;}
 newGame({name,cc:c.cc||'CZE',style:c.style,look:c.look,hand:c.hand,bh1:c.bh1});UI.tab='home';render();window.scrollTo(0,0);
 modal(`<h2>Vítej na okruhu! 🎾</h2><p>Jsi <b>${esc(name)}</b>, ${flag(c.cc||'CZE')} 17letý talent. Startuješ bez bodů a s rozpočtem <b>${fmtMoney(20000)}</b>.</p>
 <ul class="small" style="line-height:1.6;padding-left:18px"><li>Každý týden si v záložce <b>Turnaje</b> vyber turnaj a pak ho zahaj na <b>Domů</b>.</li><li>Před turnajem můžeš <b>trénovat</b> (3 bloky týdně) – stojí energii a peníze.</li><li>V zápase nastav <b>taktiku</b> (podání, return, výměny, nálety, kraťasy, cílení na slabší stranu) a používej <b>karty dovedností</b>. Trenér ti v pauze poradí.</li><li>Hlídej <b>energii a zátěž</b> – únava, mnoho zápasů za sebou a tvrdý trénink zvyšují riziko <b>zranění</b>. Fyzioterapeut riziko snižuje.</li><li>Body se počítají za 52 týdnů (19 nejlepších výsledků) jako u ATP.</li></ul><button class="btn big" onclick="closeModal()">Jdeme na to!</button>`);}

// ---------- home ----------
function renderHome(){const me=ME();const age=S.season-me.by;
 let h=`<div class="hero"><div class="row" style="align-items:center">${avatarSVG(me,64)}<div style="flex:1;min-width:0"><div class="b" style="font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(me.n)}</div><div class="small mut">${flag(me.cc)} ${COUNTRIES[me.cc][1]} · ${age} let · ${STYLE_NAMES[me.style]}</div><div class="small" style="margin-top:3px"><span class="gold b">${fmtNum(totalPts(me))}</span> <span class="mut">bodů ATP</span> ${moveTag(me)}</div>${me.injury>0?`<div class="small bad b" style="margin-top:2px;cursor:pointer" onclick="injModal()">${injIcon(me)} ${esc(injName(me))} · ${injWeeksTxt(me)}</div>`:''}<div class="small" style="margin-top:2px;cursor:pointer" onclick="popModal()">❤️ <b>${Math.round(me.pop||0)}</b> <span class="mut">popularita · ${fmtFans(followers(me.pop||0))} fanoušků</span></div></div><div class="rankbadge"><span>Žebříček</span><b>${me.rank||'—'}</b><span>nejl. ${me.best||'—'}</span></div></div>
 <div class="row" style="margin-top:14px;align-items:center;gap:14px">${ovRing(ovr(me),92,'tenis. úroveň')}<div style="flex:1">${statRows(me,true)}</div></div>
 <div style="margin-top:8px"><div class="row small"><span class="mut">Energie</span><span class="sp"></span><b>${Math.round(me.energy)}/100</b></div><div class="bar en" style="margin-top:4px"><i style="width:${me.energy}%"></i></div></div></div>`;
 h+=weekCard();
 if(typeof v6HomeCards==='function')h+=v6HomeCards();
 h+=dailyCard();
 if(S.lastWeek){const lw=S.lastWeek;const spn=lw.spn||0;h+=`<div class="card"><h3>📒 Minulý týden</h3><div class="grid2"><div class="tile"><b class="good">+${fmtMoney(spn)}</b><span>Sponzoři (${Object.keys(me.spons||{}).length})</span></div><div class="tile"><b class="good">+${fmtMoney(lw.inc-spn)}</b><span>Bonusy za žebříček</span></div><div class="tile"><b class="bad">-${fmtMoney(lw.cost)}</b><span>Tým</span></div><div class="tile"><b class="gold">+${lw.earned}</b><span>Body ATP</span></div></div></div>`;}
 const nf=UI.newsF||'all';const items=nf==='inj'?S.news.filter(n=>n.inj):S.news;
 h+=`<div class="card"><h3>📰 Zprávy z okruhu<span class="sp"></span><span class="seg-t" style="text-transform:none;letter-spacing:0"><button class="${nf==='all'?'on':''}" onclick="UI.newsF='all';render()">Vše</button><button class="${nf==='inj'?'on':''}" onclick="UI.newsF='inj';render()">🩹 Zranění</button></span></h3>${items.slice(0,12).map(n=>`<div class="news ${n.inj?'injn':''}"><small>T${n.w}/${n.s}</small>${esc(n.t)}</div>`).join('')||'<div class="mut small">Zatím nic.</div>'}${nf==='inj'?`<button class="btn ghost sm" style="width:100%;margin-top:8px" onclick="UI.rf='inj';go('rank')">🏥 Marodka – všichni zranění hráči</button>`:''}</div>`;
 return h;}
function weekCard(){const me=ME();const ev=humanEvent();
 if(typeof isBanned==='function'&&isBanned(me)&&(!ev||S.cur&&S.cur.status!=='alive')){const b=me.intg&&me.intg.banned;const life=b&&b.life;return `<div class="card" style="border-color:rgba(255,80,90,.55)"><h3>🚫 Zákaz startu</h3><div class="small">${life?'Doživotní zákaz od Integritní jednotky tenisu. Kariéra na okruhu skončila.':'Integritní jednotka tenisu ti zakázala start. Zbývá <b>'+banWeeksLeft(me)+' týdnů</b>.'}</div>${life?`<button class="btn red" style="margin-top:10px" onclick="confirmBox('Nová hra?','Současná kariéra skončila. Můžeš si prohlédnout statistiky, nebo začít znovu.','Nová kariéra',()=>{resetGame();UI.tab='home';render();})">Začít novou kariéru</button>`:`<button class="btn big" style="margin-top:10px" onclick="uiStartWeek()">Odehrát týden bez turnaje ▶</button>`}</div>`;}
 if(S.cur&&ev&&S.cur.status==='alive'){const nm=humanNextMatch();const o=nm&&nm.opp?P(nm.opp):null;
  return `<div class="card" style="border-color:rgba(255,211,77,.5)"><h3>🎾 Probíhá turnaj<span class="sp"></span>${tierBadge(ev.tier)}</h3><div class="b" style="font-size:17px">${esc(ev.name)}</div><div class="small mut">${flag(ev.cc)} ${esc(ev.city)} · ${SURF[ev.surf].name}</div>
  ${nm?`<div class="row" style="margin:10px 0"><span class="small mut">${nm.round}:</span>${o?`<b>${flag(o.cc)} ${esc(o.n)}</b> <span class="small mut">(${rankTxt(o)})</span>`:'<b>volný los</b>'}</div>`:''}
  <button class="btn big gold" onclick="go('event')">Na turnaj ▶</button></div>`;}
 if(S.cur&&ev&&S.cur.status!=='alive'){return `<div class="card"><h3>🏁 Turnaj skončil</h3><div class="b">${esc(ev.name)}</div><div class="small mut" style="margin:4px 0 10px">${S.cur.status==='champ'?'🏆 Jsi šampion!':'Tvoje cesta turnajem skončila.'}</div><button class="btn big" onclick="uiAdvance()">Pokračovat ▶</button></div>`;}
 let h=`<div class="card"><h3>📅 Tento týden<span class="sp"></span><span class="small" style="text-transform:none;letter-spacing:0">${weekLabel(S.season,S.week)}</span></h3>`;
 if(me.injury>0)h+=`<div class="injbox" onclick="injModal()"><div class="ii">${injIcon(me)}</div><div style="flex:1"><b>${esc(injName(me))}</b><div class="small">Zbývá ${injWeeksTxt(me)} léčby · bez zápasů a tréninku${me.fyzio?` · fyzio úr. ${me.fyzio} urychluje léčbu`:''}</div>${injProgress(me)}</div></div>`;
 const fin=CAL.find(t=>t.week===S.week&&t.tier==='FIN');
 if(fin&&me.rank&&me.rank<=8&&me.injury<=0)h+=`<div class="gold b" style="margin-bottom:8px">🌟 Kvalifikoval ses na ATP Finals v Turíně!</div>`;
 const pl=S.plan&&CAL_BY_ID[S.plan.tid];
 if(pl){const md={main:'hlavní soutěž',qual:'kvalifikace',wc:'divoká karta'}[S.plan.mode];
  h+=`<div class="ev sel"><div class="ic">${tierEmblem(pl.tier,44)}</div><div class="t"><b>${esc(pl.name)}</b><div class="chips">${tierBadge(pl.tier)}${surfChip(pl.surf)}<span class="tiny mut">${md} · cesta ${fmtMoney(travelCost(pl))}</span></div></div><button class="btn ghost sm" onclick="S.plan=null;render()">✕</button></div>`;}
 else if(!(fin&&me.rank&&me.rank<=8)){const list=eventsThisWeek().filter(t=>eligibility(t).mode).sort((a,b)=>TIERS[b.tier].rankOrd-TIERS[a.tier].rankOrd).slice(0,3);
  h+=list.length?`<div class="small mut" style="margin-bottom:6px">Turnaje, kam se dostaneš:</div>`+list.map(t=>evRow(t,true)).join(''):`<div class="small mut">Tento týden pro tebe není vhodný turnaj. Trénuj a odpočívej.</div>`;
  h+=`<button class="btn ghost sm" style="width:100%;margin:2px 0 8px" onclick="UI.mapWeek=S.week;go('tour')">🗺️ Všechny turnaje týdne</button>`;}
 h+=`<div class="small mut" style="margin:4px 0 10px">Tréninkové bloky: <b class="cy">${'●'.repeat(me.slots)}${'○'.repeat(Math.max(0,3-me.slots))}</b> · <a class="cy" onclick="go('train')" style="cursor:pointer">trénovat →</a></div>`;
 h+=(pl||(fin&&me.rank&&me.rank<=8&&me.injury<=0))?`<button class="btn big gold" onclick="uiStartWeek()">Zahájit turnaj ▶</button>`:`<button class="btn big" onclick="uiStartWeek()">Odehrát týden bez turnaje ▶</button>`;
 return h+'</div>';}
function evRow(t,compact){const e=eligibility(t);const sel=S.plan&&S.plan.tid===t.id;const tier=TIERS[t.tier];const canAct=t.week===S.week&&!S.weekStarted&&!S.cur;
 const md={main:'Hlavní soutěž',qual:'Kvalifikace',wc:'Divoká karta'}[e.mode]||'';
 let btn='';if(canAct&&t.tier!=='FIN'){btn=e.mode?(sel?`<button class="btn sm green" onclick="event.stopPropagation();S.plan=null;render()">✓</button>`:`<button class="btn sm" onclick="event.stopPropagation();uiPlan('${t.id}')">Přihlásit</button>`):`<span class="tiny mut c" style="width:58px">🔒</span>`;}
 const last=S.results[t.id];
 return `<div class="ev ${sel?'sel':''}" style="--tc:${tier.color}" onclick="evInfo('${t.id}')"><div class="ic">${tierEmblem(t.tier,44)}</div><div class="t"><b>${esc(t.name)}</b><div class="small mut">${flag(t.cc)} ${esc(t.city)}${t.len>1?' · 2 týdny':''}</div><div class="chips">${tierBadge(t.tier)}${surfChip(t.surf)}${t.tier!=='FIN'?`<span class="tiny mut">${tierTab(t).pts[0]} b. · ${fmtMoney(evPrize(t,0))} · ${t.draw}</span>`:'<span class="tiny mut">až 1500 b.</span>'}</div>${!compact&&last?`<div class="tiny mut" style="margin-top:3px">Poslední vítěz: ${esc(last.champN)} (${last.season})</div>`:''}${canAct&&md?`<div class="tiny cy" style="margin-top:2px">${md}</div>`:''}</div>${btn}</div>`;}
function uiPlan(tid){const t=CAL_BY_ID[tid];const e=eligibility(t);const me=ME();if(me.injury>0){toast('Jsi zraněný.');return;}if(!e.mode){toast(e.txt);return;}if(typeof isBanned==='function'&&isBanned(me)){toast(e.txt||'Máš zákaz startu.');return;}const c=travelCost(t);if(me.money-c<-5000){toast('Na cestu nemáš peníze.');return;}S.plan={tid,mode:e.mode};saveGame();closeModal();if(typeof doublesAllowed==='function'&&doublesAllowed(t)){showDoublesOptIn(t);return;}toast(`Přihlášen: ${t.name}`);render();}
function evInfo(tid){const t=CAL_BY_ID[tid];const tier=TIERS[t.tier];const e=eligibility(t);const last=S.results[t.id];const tab=tierTab(t);
 const rounds=[];if(t.tier==='FIN'){rounds.push(['Výhra ve skupině','200 b.','$396 000'],['Výhra v semifinále','+400 b.','$1 183 000'],['Výhra ve finále','+500 b.','$2 370 000'],['Účast','—','$331 000']);}
 else{const B=pow2(t.draw);const nr=Math.log2(B);for(let i=0;i<=nr;i++){const remain=i===0?1:(1<<i);const nm=i===0?'Vítěz':remain===2?'Finále':remain===4?'Semifinále':remain===8?'Čtvrtfinále':remain===B?'1. kolo':'Kolo '+remain;rounds.push([nm,(tab.pts[i]||0)+' b.',fmtMoney(evPrize(t,i))]);}
  if(tier.qr&&tab.qpts&&tab.qpts.length)rounds.push(['Postup z kvalifikace','+'+tab.qpts[0]+' b.','—']);}
 const surfTxt={H:'Vyvážený povrch, odměňuje kompletní hru (ATP průměr: 81 % udržených podání, 0,57 es na hru).',C:'Pomalá antuka: delší výměny, méně es, kraťasy a kondice (77 % udržených podání).',G:'Rychlá tráva: dominuje servis a hra na síti (84 % udržených podání).',I:'Rychlá hala bez větru: servis a agresivita.'}[t.surf];
 const canAct=t.week===S.week&&!S.weekStarted&&!S.cur;const MAIN=evMain(t),QUAL=evQual(t);
 modal(`<div class="row"><div class="ic">${tierEmblem(t.tier,52)}</div><div style="flex:1"><h2 style="margin:0">${esc(t.name)}</h2><div class="small mut">${flag(t.cc)} ${esc(t.city)} · týden ${t.week}${t.len>1?'–'+(t.week+t.len-1):''} · ${weekLabel(S.season,t.week,t.len)}</div></div></div>
 <div class="chips" style="margin:10px 0">${tierBadge(t.tier)}${surfChip(t.surf)}<span class="pill">Pavouk ${t.draw}</span><span class="pill">${tier.bo===5?'Na 3 vítězné sety':'Na 2 vítězné sety'}</span>${(evDotace(t)||t.pm)?`<span class="pill gold">Dotace ${fmtMoney(evDotace(t)||t.pm)}</span>`:''}</div>
 <div class="small mut" style="margin-bottom:8px">${surfTxt}</div>
 <table class="stt">${rounds.map(r=>`<tr><td style="text-align:left;font-weight:700">${r[0]}</td><td>${r[1]}</td><td style="text-align:right">${r[2]}</td></tr>`).join('')}</table>
 <div class="small" style="margin-top:10px">${t.tier!=='FIN'?`Hlavní soutěž do ~${MAIN>=99999?'∞':MAIN+'.'} místa${tier.qr?` · kvalifikace do ~${QUAL>=9999?'∞':QUAL+'.'} místa`:''}`:'Nejlepších 8 zdravých hráčů žebříčku'}</div>
 <div class="small ${e.mode?'good':'bad'}" style="margin-top:4px">${e.mode?'✓ ':'✕ '}${e.txt}</div>
 <div class="small mut" style="margin-top:4px">Cestovní náklady: ${fmtMoney(travelCost(t))}${last?` · Poslední vítěz: <b>${esc(last.champN)}</b> ${last.score?'('+esc(last.score)+')':''}`:''}</div>
 <div class="row" style="margin-top:14px"><button class="btn ghost" style="flex:1" onclick="closeModal()">Zavřít</button>${canAct&&e.mode&&t.tier!=='FIN'?`<button class="btn gold" style="flex:1" onclick="uiPlan('${t.id}')">Přihlásit se</button>`:''}</div>`);}
// ---------- injuries UI ----------
function injProgress(p){const tot=Math.max(1,p.injTot||1);const done=clamp(1-(p.injury||0)/tot,0,1);return `<div class="bar" style="height:6px;margin-top:5px"><i style="width:${done*100}%;background:linear-gradient(90deg,#ff5d73,#3ee68a)"></i></div>`;}
function injModal(){const me=ME();if(!(me.injury>0)){toast('Jsi zdravý 💪');return;}const t=INJ_TYPES[me.injT]||INJ_TYPES[0];
 modal(`<div class="c"><div style="font-size:52px">${t[1]}</div><h2 style="margin:4px 0">${esc(t[0])}</h2><div class="small mut">Zraněn od týdne ${me.injS?me.injS[1]+'/'+me.injS[0]:'—'}</div></div>${injProgress(me)}
 <div class="grid2" style="margin-top:12px"><div class="tile"><b class="bad">${injWeeksTxt(me)}</b><span>Zbývá léčby</span></div><div class="tile"><b>${me.fyzio?'úr. '+me.fyzio:'—'}</b><span>Fyzioterapeut</span></div></div>
 <div class="small mut" style="margin-top:10px;line-height:1.5">Během léčby nemůžeš hrát turnaje ani trénovat. Energie se doplňuje. ${me.fyzio<3?'Lepší fyzioterapeut (Trénink → Tým) zkrátí léčbu a sníží riziko dalších zranění.':'Máš nejlepší péči, léčba probíhá rychleji.'}</div>
 ${(me.injH||[]).length?`<div class="small b" style="margin-top:10px">Historie zranění</div>${me.injH.map(h=>`<div class="news"><small>T${h.w}/${h.s}</small>${INJ_TYPES[h.t][1]} ${esc(INJ_TYPES[h.t][0])} · ${h.wk} týd.</div>`).join('')}`:''}
 <button class="btn big" style="margin-top:12px" onclick="closeModal()">OK</button>`);}
function injAlertModal(){const a=S.injAlert;S.injAlert=null;saveGame();if(!a)return;const t=INJ_TYPES[a.i];const me=ME();
 modal(`<div class="c"><div class="injpulse">${t[1]}</div><h2 style="margin:6px 0;color:#ff8a9a">Zranění!</h2><div class="b" style="font-size:18px">${esc(t[0])}</div><div class="small mut" style="margin-top:4px">${a.ctx==='train'?'Přetížení při tréninku.':a.ctx==='match'?'Zranil ses v zápase.':'Mimo kurt.'} Odhad léčby: <b>${injWeeksTxt(me)}</b>.</div></div>
 <div class="small mut" style="margin-top:10px">Riziko zranění roste s nízkou energií, mnoha turnaji za sebou, tvrdým tréninkem a věkem. Fyzioterapeut ho snižuje.</div><button class="btn big" style="margin-top:12px" onclick="closeModal()">Rozumím</button>`);}
function snapshot(){const me=ME();return {rank:me.rank,money:me.money,news:S.news.length?S.news[0]:null,pts:totalPts(me),week:S.week,season:S.season};}
function weekSummary(before){const me=ME();const idx=before.news?S.news.indexOf(before.news):-1;const fresh=(idx<0?S.news.slice(0,6):S.news.slice(0,idx)).slice(0,8);
 const dr=(before.rank||9999)-(me.rank||9999);
 modal(`<h2>📆 Týden ${before.week}${S.week-before.week>1?'–'+(S.week-1):''} skončil</h2>
 <div class="grid3"><div class="tile"><b>${me.rank||'—'}</b><span>Žebříček ${dr>0?`<span class="good">▲${dr}</span>`:dr<0?`<span class="bad">▼${-dr}</span>`:''}</span></div><div class="tile"><b class="gold">${fmtNum(totalPts(me))}</b><span>Body (${totalPts(me)-before.pts>=0?'+':''}${totalPts(me)-before.pts})</span></div><div class="tile"><b class="${me.money-before.money>=0?'good':'bad'}">${me.money-before.money>=0?'+':''}${fmtMoney(me.money-before.money)}</b><span>Finance</span></div></div>
 <div style="margin-top:10px">${fresh.map(n=>`<div class="news">${esc(n.t)}</div>`).join('')}</div>
 ${typeof weekBetSummary==='function'?weekBetSummary(before):''}
 <button class="btn big" style="margin-top:12px" onclick="closeModal()">Pokračovat</button>`);}
function seasonRecapModal(){const r=S.seasonRecap;if(!r)return;S.seasonRecap=null;saveGame();
 const rec=r.w+r.l?Math.round(r.w/(r.w+r.l)*100):0;
 modal(`<div class="c"><div style="font-size:44px">🎆</div><h2 style="margin:4px 0">Sezóna ${r.s} skončila</h2><div class="small mut">Začíná rok ${r.s+1} · kalendář a prize money jsou nové</div></div>
 <div class="grid3" style="margin-top:12px"><div class="tile"><b>${r.rank||'—'}</b><span>Žebříček</span></div><div class="tile"><b>${r.w}-${r.l}</b><span>Zápasy · ${rec} %</span></div><div class="tile"><b class="gold">${r.titles}</b><span>Tituly</span></div>
 <div class="tile"><b>${fmtNum(r.pts||0)}</b><span>Body ATP</span></div><div class="tile"><b>${r.ov}</b><span>Úroveň</span></div><div class="tile"><b class="good" style="font-size:15px">${fmtMoney(r.prize||0)}</b><span>Prize money</span></div></div>
 <div class="small mut" style="margin-top:10px">Nejlepší žebříček v kariéře: <b>${r.best||'—'}</b>. V novém roce se termíny turnajů posunuly a odměny vzrostly o 3,5 %.</div>
 <button class="btn big gold" style="margin-top:14px" onclick="closeModal()">Do nové sezóny ▶</button>`);}
function uiStartWeek(){const me=ME();
 if(typeof maybeNominateDavis==='function')maybeNominateDavis();
 if(S.davisAlert||(S.davis&&S.davis.nom&&S.davis.nom.ok&&S.davis.nom.accepted==null&&S.davis.nom.week===S.week)){showDavisModal();return;}
 if(typeof isBanned==='function'&&isBanned(me)&&me.intg.banned&&me.intg.banned.life){toast('Kariéra na okruhu skončila.');return;}
 const fin=CAL.find(t=>t.week===S.week&&t.tier==='FIN');const finMe=fin&&me.rank&&me.rank<=8&&me.injury<=0;
 const dc=S.davis&&S.davis.nom&&S.davis.nom.accepted===true&&S.davis.nom.week===S.week;
 if(S.plan||finMe||dc){const b=snapshot();startWeek();if(S.cur){UI.tab='event';render();return;}weekRun(b);return;}
 confirmBox('Týden bez turnaje?',`Zbývající tréninkové bloky: ${me.slots}. Energie se během týdne doplní.`,'Pokračovat',()=>{const b=snapshot();startWeek();endWeek();weekRun(b,true);});}
function weekRun(b,done){if(!done)endWeek();UI.tab='home';render();weekSummary(b);}
function uiAdvance(){const b=snapshot();const n=weeksToAdvance();for(let i=0;i<n;i++)endWeek();S.cur=null;saveGame();UI.tab='home';render();weekSummary(b);}

// ---------- daily challenge ----------
function dailyCard(){const d=getDaily();const o=P(d.opp);if(!o)return '';
 return `<div class="card" style="background:linear-gradient(150deg,rgba(255,182,72,.22),rgba(20,40,95,.55))"><h3>⭐ Denní výzva<span class="sp"></span>${d.done===true?'<span class="good">Splněno ✓</span>':d.done==='fail'?'<span class="bad">Nesplněno</span>':`<span>pokusy ${3-(d.tries||0)}/3</span>`}</h3>
 <div class="row">${avatarSVG(o,46)}<div style="flex:1"><div class="b">${d.txt}</div><div class="small mut">Exhibice na 1 set proti: ${flag(o.cc)} ${esc(o.n)} (${rankTxt(o)}) · ${SURF[d.surf].name}</div><div class="small gold">Odměna: ${fmtMoney(d.reward.money)} + ${d.reward.xp} XP (${STAT_NAMES[d.reward.stat]})</div></div></div>
 ${d.done?'':`<button class="btn gold" style="width:100%;margin-top:10px" onclick="startDaily()">Přijmout výzvu</button>`}</div>`;}
function startDaily(){const d=getDaily();if(d.done)return;if(UI.busy)return;if(ME().injury>0){toast('🩹 Jsi zraněný – exhibici si zahraješ až po uzdravení.');return;}if(S.cur&&S.cur.status==='alive'){toast('Nejdřív dohraj turnaj.');return;}const me=ME();const o=P(d.opp);
 const saveEn=me.energy;me.energy=100;
 openMatch({opp:o,surf:d.surf,bo:1,title:'Denní výzva · Exhibice',sub:d.txt,daily:true,onEnd:(m)=>{me.energy=saveEn;const ok=dailyCheck(m);d.tries=(d.tries||0)+1;if(ok){d.done=true;me.money+=d.reward.money;const r=addXp(d.reward.stat,d.reward.xp,true);saveGame();return `<div class="good b" style="font-size:17px">⭐ Výzva splněna! +${fmtMoney(d.reward.money)}, +${d.reward.xp} XP ${STAT_NAMES[d.reward.stat]}${r.ups?' ⬆️':''}</div>`;}if(d.tries>=3)d.done='fail';saveGame();return `<div class="bad b">Výzva nesplněna${d.done==='fail'?' – dnešní pokusy vyčerpány.':` – zbývá ${3-d.tries} pokusů.`}</div>`;}});}

function popBar(v){return `<div class="bar" style="height:9px"><i style="width:${v}%;background:linear-gradient(90deg,#ff5d9e,#ffb648)"></i></div>`;}
function sponsorList(me){const list=typeof SPONSORS_V6!=='undefined'?SPONSORS_V6:SPONSORS;const mul=typeof sponsorPayMul==='function'?sponsorPayMul(me):1;return list.map(sp=>{const c=me.spons&&me.spons[sp.id];const on=c&&c.on!==false&&!c.declined;const pay=Math.round((c&&c.pay||sp.pay)*mul);const elig=typeof sponsorEligible==='function'?sponsorEligible(sp,me):(me.pop||0)>=sp.th;const pending=(me.sponsOff||[]).some(o=>o.id===sp.id);return `<div class="shop" style="${on?'border-color:rgba(62,230,138,.5)':pending?'border-color:rgba(255,211,77,.45)':'opacity:.55'}"><div class="si">${sp.icon}</div><div style="flex:1"><b class="small">${sp.name}</b><div class="tiny mut">${sp.desc}${sp.win?` · bonus za postup ${fmtMoney(sp.win)}`:''}</div><div class="tiny ${on?'good':pending?'gold':'mut'}">${on?'✓ Aktivní smlouva':pending?'✍️ Čeká na podpis':elig?'Nabídka je na stole':'🔒 od popularity '+sp.th+(sp.rank?' a žebř. ≤ '+sp.rank:'')}</div></div><div class="c">${pending?`<button class="btn sm gold" onclick="uiAcceptSponsor('${sp.id}')">Přijmout</button><button class="btn sm ghost" onclick="uiDeclineSponsor('${sp.id}')">Ne</button>`:''}<b class="small ${on?'good':'mut'}">${fmtMoney(pay)}<span class="tiny">/týd.</span></b></div></div>`;}).join('');}
function popCard(me){const v=me.pop||0;const next=SPONSORS.find(s=>!(me.spons&&me.spons[s.id]));const ph=me.popHist||[];const mx=Math.max(10,...ph);
 return `<div class="card"><h3>❤️ Popularita<span class="sp"></span><span style="text-transform:none;letter-spacing:0">${fmtFans(followers(v))} fanoušků</span></h3>
 <div class="row"><b style="font-size:30px">${Math.round(v)}</b><div style="flex:1">${popBar(v)}<div class="tiny mut" style="margin-top:4px">${next?`Další sponzor (${next.icon} ${next.name}) při popularitě ${next.th}`:'Máš všechny sponzory!'}</div></div></div>
 ${ph.length>1?`<div class="chart" style="height:36px;margin-top:8px">${ph.map(x=>`<i style="height:${x/mx*100}%;background:linear-gradient(0deg,#ff5d9e,#ffb648)"></i>`).join('')}</div>`:''}
 <div class="tiny mut" style="margin-top:8px;line-height:1.5">Roste s výhrami, skalpy výše postavených hráčů, tituly (víc na velkých a domácích turnajích) a mediálními aktivitami. Bez hraní a po porážkách pomalu klesá. Přináší sponzory, divoké karty a podporu publika.</div></div>`;}
function popModal(){const me=ME();modal(`<h2>❤️ Popularita & sponzoři</h2>${popCard(me)}<div class="small b" style="margin:6px 0">Sponzorské smlouvy · ${fmtMoney(sponsorPay(me))}/týden</div>${sponsorList(me)}<button class="btn big" style="margin-top:10px" onclick="closeModal();go('train')">📱 Mediální aktivity</button>`);}

// ===================== UI: tournaments/map, training, rankings, career =====================
const LAND=[
[[-168,65],[-160,71],[-140,70],[-120,72],[-95,72],[-80,73],[-70,66],[-62,60],[-56,52],[-66,45],[-71,41],[-75,38],[-80,32],[-81,25],[-83,29],[-89,30],[-97,27],[-97,21],[-91,19],[-87,21],[-88,15],[-83,10],[-78,8],[-80,7],[-86,12],[-92,15],[-105,20],[-110,24],[-112,30],[-117,32],[-121,35],[-124,40],[-124,48],[-131,54],[-138,59],[-150,61],[-158,58],[-165,60],[-168,65]],
[[-52,60],[-42,60],[-22,70],[-18,77],[-30,83],[-60,82],[-72,77],[-58,70]],
[[-78,8],[-72,12],[-62,10],[-52,5],[-50,0],[-44,-3],[-35,-6],[-37,-12],[-40,-21],[-48,-26],[-53,-34],[-58,-38],[-63,-41],[-65,-46],[-68,-52],[-71,-54],[-74,-50],[-73,-40],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0],[-77,4]],
[[-5.6,36],[-6.3,36.8],[-7.4,37.2],[-8.9,37],[-8.8,38.7],[-9.5,39.4],[-8.7,41.2],[-8.9,42.5],[-9.3,43],[-8,43.7],[-5.8,43.6],[-3.8,43.4],[-1.8,43.4],[-1.2,44.6],[-1.2,46.2],[-2.2,47.1],[-4.5,47.9],[-4.7,48.6],[-3,48.8],[-1.6,48.7],[-1.4,49.7],[0.2,49.5],[1.5,50.2],[1.6,51],[3.2,51.4],[4.2,52],[4.7,52.9],[5.9,53.4],[7,53.6],[8.5,53.6],[8.7,54.9],[8.1,55.6],[8.6,57.1],[10.6,57.7],[10.4,56.3],[10.9,54.4],[12,54.2],[13.8,54.1],[14.6,53.9],[16.6,54.5],[18.6,54.7],[19.9,54.5],[21.1,55.3],[21,56.8],[22,57.6],[23.9,57],[24.4,58.3],[23.5,59.2],[28,59.5],[30.3,60],[35,61],[45,62],[60,62],[60,50],[50,46.5],[47,43.5],[41.5,41.5],[39,44.2],[37.5,44.8],[36.6,45.3],[33.5,44.5],[33,45.4],[31,46.6],[30.2,45.8],[29.6,45.2],[28.6,44],[27.9,42.6],[28.1,41.6],[29,41.1],[26.1,40.6],[24,40.8],[22.6,40.5],[22.9,39.4],[24,38.2],[23.1,37.4],[22.4,36.4],[21.7,36.8],[21.1,37.8],[21.4,38.4],[20.7,39.1],[20,39.7],[19.4,40.4],[19.5,41.8],[18.5,42.4],[17,43.3],[15.9,43.7],[15.2,44.3],[14.3,45.2],[13.6,45.1],[13.7,45.7],[12.4,45.4],[12.3,44.6],[13.5,43.6],[14.5,42.2],[16,41.4],[18.5,40.2],[17.2,40.5],[16.6,39.6],[17.1,39],[16.1,38],[15.6,38.3],[15.8,39.5],[15,40.2],[14.2,40.8],[12.6,41.5],[11.2,42.4],[10.5,43],[10.2,43.9],[8.8,44.4],[7.5,43.8],[6.2,43.1],[4.8,43.4],[3.2,43.1],[3.1,42.4],[2.2,41.4],[0.9,41],[-0.3,39.5],[0.2,38.8],[-0.7,37.6],[-2.1,36.7],[-4.4,36.7]],
[[7,58],[5.6,58.9],[5,60.5],[5.2,62],[8,63.4],[10.5,64.5],[13,66.5],[15.5,68.3],[18,69.6],[21,70.2],[25,71.1],[29,70.6],[31,70],[30,69],[28.8,67.2],[30,64],[29.5,62],[28,60.6],[25,60.2],[22.9,59.9],[21.4,60.8],[21.6,62.8],[25.2,65],[23.5,65.8],[22,65.6],[21,64.6],[19,63.5],[17.5,62.3],[17.1,61],[18.6,60.2],[19,59.5],[16.7,57.8],[16.4,56.6],[14.3,55.5],[12.9,55.6],[12.3,56.6],[11.7,58],[11.2,59.1],[10.5,59.8],[9.6,59],[8,58.1]],
[[11,55.3],[12.6,55.6],[12.2,56.1],[11.2,55.9]],[[8.6,41.4],[9.4,41.4],[9.5,43],[8.6,42.6]],
[[-5.5,50.1],[1.3,51.1],[1.7,52.7],[0,53.5],[-1.6,55.6],[-2,57.6],[-3.2,58.6],[-5,58.6],[-6.2,56.5],[-5,54.8],[-3,54],[-4.5,53.3],[-4.3,51.7],[-5.5,51.7]],
[[-10,51.7],[-6,52.1],[-6,54.2],[-7.5,55.2],[-10,54.2]],
[[-17,21],[-16,28],[-10,30],[-9.5,33],[-6,35.8],[3,36.8],[10,37.2],[11,33.5],[20,31],[25,31.8],[32,31.3],[34,28],[39,21],[43,12.5],[51,11.8],[48,5],[42,-1],[40,-10],[40.5,-15],[35,-24],[32.5,-28.5],[27,-33.8],[20,-34.8],[18,-32],[15,-27],[12,-18],[13.5,-11],[12,-5],[9,-1],[9.5,3.5],[6,4.3],[-2,4.8],[-8,4.4],[-13,8],[-17,14.5]],
[[44,-25],[47.5,-24.5],[50.3,-15.5],[49.3,-12],[44.3,-16.5]],
[[26.5,40.3],[36,36.5],[35.5,33],[34.5,29.5],[39,21.5],[43,13],[52,15.5],[57.5,22.5],[56,26],[51.5,24.5],[50,27],[48,29.5],[51,32],[56.5,27],[61.5,25.2],[66.5,25.4],[70,21],[73,16],[77,8],[80,13],[80,15.5],[87,21.5],[91.5,22.5],[94,18],[98,16],[98.5,10],[100.5,7],[103.5,1.4],[101,6.5],[100.5,13.5],[104,10.5],[106.5,9],[109,11.5],[108,16],[106.5,20],[109,21.5],[114,22.3],[119.5,25.5],[121.8,31],[120.3,34.3],[122.3,37],[121.5,40.5],[125,40],[126.5,37],[126.5,34.5],[129.4,35.3],[129.5,37.5],[128,39],[130,42.5],[135,43.5],[141,48.5],[140.5,53],[136,54.5],[143,59.4],[155,59.3],[163,62],[160.5,61],[163,59.5],[156,51],[162,57.5],[173,61.5],[180,65],[180,69],[170,70],[160,69.5],[150,71.5],[140,72.5],[128,73],[113,73.5],[105,77.5],[95,76],[80,73.5],[70,73],[66,69.5],[60,69],[56,50],[50,46.5],[47,43.5],[41,41.5],[37,45],[29.5,45]],
[[130,31],[131.5,33.8],[135,33.6],[136.8,34.7],[140,35.2],[141,37.5],[142,40],[141.3,41.4],[139.8,40.6],[139.5,38],[137,37],[133,35.5]],
[[141,41.6],[145.5,43.3],[144,44.4],[141.7,45.4],[140,42.5]],
[[114,-22],[114,-26],[115,-34],[118,-35],[123.5,-33.8],[129,-31.6],[131.5,-31.5],[135.6,-34.8],[138,-35.6],[140,-37.8],[146,-39],[150,-37.5],[153,-31],[153.5,-25],[150.5,-22.4],[146.3,-19],[145.3,-15],[142.5,-10.7],[141.5,-13],[141.5,-17],[139.5,-17.5],[136.5,-15.5],[137,-12.2],[132.5,-11.3],[130,-13],[126,-14.2],[122.3,-17.2],[118.8,-20.3]],
[[145,-40.8],[148.3,-40.9],[148,-43.2],[146.3,-43.6]],
[[172.7,-34.4],[175,-36.5],[178.4,-37.6],[176.8,-39.5],[175,-41.5],[173.5,-40.5],[172.7,-38]],
[[172.5,-40.6],[174.3,-41.4],[171.3,-44.4],[169,-46.6],[166.5,-46],[168,-44]],
[[95.3,5.6],[98.6,3.6],[101.6,1.7],[104.2,-2],[106,-5.9],[104.5,-5.6],[101.5,-3],[98.6,0]],
[[105.5,-6.8],[110,-6.9],[114.5,-7.7],[114.4,-8.6],[109,-7.8],[106,-7.4]],
[[109,1.9],[111,1.6],[113,3.2],[115.5,5.3],[117.3,6.7],[119,5],[117.7,1.3],[116.5,-1.5],[116,-3.7],[114,-4],[111.5,-2.9],[110,-1.6]],
[[119.4,-5.4],[120.8,-2.6],[121.3,1],[124.8,1.4],[123.5,0.6],[120.5,0.5],[121,-2.4],[122,-4.8],[120.4,-5.7]],
[[131,-1.3],[134.2,-1],[138.1,-1.7],[141,-2.6],[145.5,-5.3],[147.5,-6.2],[147,-8.3],[143.5,-9.2],[142,-9.2],[137.7,-5],[132,-2.7]],
[[120.8,18.5],[122.3,18.4],[122,16.2],[121.4,14],[124,12.6],[125.5,10],[126.4,7.5],[125.5,6],[122.5,7.5],[123,10],[120.9,13.9],[119.9,16]],
[[-24,64],[-22,66.4],[-16,66.5],[-13.6,65.1],[-15,64.3],[-18.7,63.4],[-22.5,63.8]],
[[120.2,22.5],[121.9,25],[121.5,23.5],[120.8,21.9]],
[[79.8,6],[81.8,7.4],[81.3,9.3],[80,9.8]],
[[-74.2,20],[-77.5,18.4],[-82.3,22.7],[-84.9,21.9],[-80.5,23.2],[-75.6,21]],
[[8.5,39],[9.8,39.2],[9.8,41],[8.2,41],[8.4,40]],[[12.4,38.1],[15.6,38.3],[15.1,37],[12.5,37.6]],[[23.5,35.3],[26.3,35.3],[24.3,34.9]],[[32.3,34.7],[34.6,35.6],[33.9,34.9]]
];
const proj=(lon,lat)=>[(lon+180),(90-lat)];
function landPaths(){return LAND.map(poly=>'<path class="land" d="M'+poly.map(p=>proj(p[0],p[1]).map(v=>v.toFixed(1)).join(',')).join('L')+'Z"/>').join('');}
let LAND_SVG=null;
function mapSVG(week){LAND_SVG=LAND_SVG||landPaths();const z=UI.zoom;const vb=z==='eu'?'166 24 54 27':z==='am'?'40 15 160 80':'0 12 360 140';const rr=z==='eu'?0.75:z==='am'?1.4:2.3;
 const evs=CAL.filter(t=>t.week<=week&&t.week+t.len-1>=week);
 let grid='';for(let x=0;x<=360;x+=30)grid+=`<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="rgba(120,170,255,.08)" stroke-width="${rr*0.12}"/>`;for(let y=0;y<=180;y+=30)grid+=`<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="rgba(120,170,255,.08)" stroke-width="${rr*0.12}"/>`;
 const dots=evs.sort((a,b)=>TIERS[a.tier].rankOrd-TIERS[b.tier].rankOrd).map(t=>{const [x,y]=proj(t.lon,t.lat);const c=TIERS[t.tier].color;const big=TIERS[t.tier].rankOrd>=6;const r=rr*(big?1:0.65);const sel=S.plan&&S.plan.tid===t.id;
  return `<g onclick="evInfo('${t.id}')" style="cursor:pointer">${big||sel?`<circle class="pulse" cx="${x}" cy="${y}" r="${r}" fill="${sel?'#fff':c}"/>`:''}<circle class="dot" cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${sel?'#fff':'#06102a'}" stroke-width="${r*0.3}"/>${big&&z!=='world'?`<text x="${x+r*1.6}" y="${y+r*0.5}" font-size="${rr*1.5}" fill="#fff" font-weight="700">${esc(t.city)}</text>`:''}</g>`;}).join('');
 const me=ME();const hc=COUNTRIES[me.cc];const [hx,hy]=proj(hc[3],hc[2]);
 return `<svg class="map" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${grid}${LAND_SVG}<g><circle cx="${hx}" cy="${hy}" r="${rr*0.55}" fill="none" stroke="#3ee68a" stroke-width="${rr*0.25}"/></g>${dots}</svg>`;}
function renderTour(){const w=UI.mapWeek||S.week;
 let strip='';for(let i=1;i<=52;i++){const evs=CAL.filter(t=>t.week===i);const top=evs.reduce((a,t)=>Math.max(a,TIERS[t.tier].rankOrd),-1);const tt=evs.find(t=>TIERS[t.tier].rankOrd===top);const col=tt?TIERS[tt.tier].color:'transparent';
  strip+=`<button id="wk${i}" class="${i===w?'on':''} ${i===S.week?'now':''}" onclick="UI.mapWeek=${i};render()">${i}<i style="background:${col}"></i></button>`;}
 const evs=CAL.filter(t=>t.week===w).sort((a,b)=>TIERS[b.tier].rankOrd-TIERS[a.tier].rankOrd);
 const cont=CAL.filter(t=>t.week<w&&t.week+t.len-1>=w);
 let h=`<div class="card" style="padding:10px"><div class="row" style="margin-bottom:6px"><b>🗺️ Kalendář ${S.season}</b><span class="sp"></span><div class="seg-t">${[['world','Svět'],['eu','Evropa'],['am','Amerika']].map(z=>`<button class="${UI.zoom===z[0]?'on':''}" onclick="UI.zoom='${z[0]}';render()">${z[1]}</button>`).join('')}</div></div>
 <div class="wkstrip" id="wkstrip">${strip}</div>${mapSVG(w)}
 <div class="row tiny mut" style="margin-top:6px;flex-wrap:wrap;gap:8px">${['GS','M1000','A500','A250','C125','M25'].map(t=>`<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${TIERS[t].color}"></span> ${TIERS[t].short==='CH125'?'Challenger':TIERS[t].short==='M25'?'ITF':TIERS[t].name}</span>`).join('')}<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;border:2px solid #3ee68a"></span> domov</span></div></div>`;
 h+=`<div class="row" style="margin:4px 2px 10px"><button class="btn ghost sm" onclick="UI.mapWeek=Math.max(1,${w}-1);render()">◀</button><div class="sp c"><b>Týden ${w}</b><div class="tiny mut">${weekLabel(S.season,w)}${w===S.week?' · aktuální':w<S.week?' · proběhlo':''}</div></div><button class="btn ghost sm" onclick="UI.mapWeek=Math.min(52,${w}+1);render()">▶</button></div>`;
 if(w===S.week&&(S.weekStarted||S.cur))h+=`<div class="small mut" style="margin-bottom:8px">Týden už běží – přihlášky jsou uzavřené.</div>`;
 h+=evs.map(t=>evRow(t,false)).join('')||'<div class="card small mut">V tomto týdnu se nehraje (mimo sezónu / Davis Cup).</div>';
 if(cont.length)h+=`<div class="small mut" style="margin:10px 2px 6px">Pokračuje z minulého týdne:</div>`+cont.map(t=>`<div class="ev" onclick="evInfo('${t.id}')" style="opacity:.7"><div class="ic">${tierEmblem(t.tier,40)}</div><div class="t"><b>${esc(t.name)}</b><div class="chips">${tierBadge(t.tier)}${surfChip(t.surf)}<span class="tiny mut">2. týden</span></div></div></div>`).join('');
 return h;}
function afterTour(){const el=$('#wk'+(UI.mapWeek||S.week));if(el){const st=$('#wkstrip');st.scrollLeft=el.offsetLeft-st.clientWidth/2;}}

// ---------- training ----------
function renderTrain(){const me=ME();const tt=TRAIN_TYPES[UI.tt];const busy=S.cur&&S.cur.status==='alive';
 let h=`<div class="card"><h3>💪 Tréninkové centrum</h3><div class="row"><div style="flex:1"><div class="row small"><span class="mut">Energie</span><span class="sp"></span><b>${Math.round(me.energy)}</b></div><div class="bar en" style="margin-top:4px"><i style="width:${me.energy}%"></i></div></div><div class="c" style="min-width:90px"><div class="tiny mut">Bloky tento týden</div><div class="b cy" style="font-size:18px;letter-spacing:2px">${'●'.repeat(me.slots)}<span class="mut">${'○'.repeat(Math.max(0,3+(me.coach>=3?1:0)+(me.coach>=5?1:0)-me.slots))}</span></div></div></div>
 ${me.injury>0?`<div class="injbox" style="margin-top:8px" onclick="injModal()"><div class="ii">${injIcon(me)}</div><div style="flex:1"><b>${esc(injName(me))}</b><div class="small">Léčba ještě ${injWeeksTxt(me)}</div></div></div>`:''}<div class="tiny mut" style="margin-top:6px">Riziko zranění při tréninku: lehký ${injRiskTxt('lehky')} · intenzivní ${injRiskTxt('tvrdy')} · kemp ${injRiskTxt('kemp')}</div>${busy?'<div class="warn small" style="margin-top:8px">Probíhá turnaj – trénovat můžeš až po něm.</div>':''}
 <div class="small mut" style="margin-top:8px">Trenér úr. ${me.coach} (×${COACH_MULT[me.coach]}) · věkový faktor ×${ageMult(S.season-me.by)}</div></div>`;
 h+=`<div class="tabs">${Object.entries(TRAIN_TYPES).map(([k,t])=>`<button class="${UI.tt===k?'on':''}" onclick="UI.tt='${k}';render()">${t.icon} ${t.name.split(' ')[0]}<div class="tiny" style="opacity:.8">⚡${t.en} · ${fmtMoney(t.cost)}</div></button>`).join('')}</div>`;
 h+=`<div class="card"><h3>${tt.icon} ${tt.name}<span class="sp"></span><span style="text-transform:none;letter-spacing:0" class="small">+${tt.xp} XP základ</span></h3>${STAT_KEYS.map(k=>{const v=me.st[k];return `<div class="trow"><div><div class="row"><b style="width:80px">${STAT_NAMES[k]}</b><span class="b" style="font-size:18px">${Math.round(v)}</span></div><div class="bar xp" style="height:6px"><i style="width:${clamp(me.xp[k]/xpNeed(v)*100,0,100)}%"></i></div><div class="tiny mut">${Math.round(me.xp[k])}/${Math.round(xpNeed(v))} XP</div></div><button class="btn sm" ${me.slots<=0||busy||me.injury>0?'disabled':''} onclick="uiTrain('${k}')">Trénovat</button></div>`;}).join('')}</div>`;
 h+=`<div class="card"><h3>😴 Regenerace</h3><div class="grid2"><button class="opt" onclick="uiRest('rest')"><b>🛌 Odpočinek</b><div class="small mut">+${22+(me.physio!=null?me.physio:me.fyzio)*4+(me.fitness||0)*3} energie · zdarma · 1 blok</div></button><button class="opt" onclick="uiRest('spa')"><b>🧖 Wellness & fyzio</b><div class="small mut">+${40+(me.physio!=null?me.physio:me.fyzio)*5+(me.fitness||0)*4} energie · $450 · 1 blok</div></button></div></div>`;
 h+=`<div class="card"><h3>📣 Média a fanoušci<span class="sp"></span><span style="text-transform:none;letter-spacing:0">❤️ ${Math.round(me.pop||0)}</span></h3><div class="small mut" style="margin-bottom:8px">Každá aktivita stojí 1 tréninkový blok (jednou týdně). Zvyšuje popularitu → sponzoři, divoké karty a publikum.</div><div class="grid2">${Object.entries(MEDIA).map(([k,m])=>{const lock=(me.pop||0)<m.min;const done=me.mediaW&&me.mediaW[k]===S.season*100+S.week;return `<button class="opt" style="${lock||done?'opacity:.5':''}" onclick="uiMedia('${k}')"><b>${m.icon} ${m.name}</b><div class="tiny mut">${m.desc}</div><div class="tiny cy">⚡${m.en}${m.cost?' · '+fmtMoney(m.cost):''} · ❤️ +${m.pop}${lock?' · 🔒 pop. '+m.min:''}${done?' · ✓ hotovo':''}</div></button>`;}).join('')}</div></div>`;
 h+=typeof v6TeamCard==='function'?v6TeamCard(me):`<div class="card"><h3>🧑‍🤝‍🧑 Tým a vybavení</h3></div>`;
 h+=`<div class="card"><h3>🃏 Karty dovedností</h3><div class="small mut" style="margin-bottom:8px">Karty používáš během zápasu. Stojí energii a mají cooldown (v bodech). Další odemkneš lepším trenérem.</div><div class="grid2">${Object.entries(CARDS).map(([k,c])=>{const ok=me.coach>=c.lvl;return `<div class="shop" style="margin:0;${ok?'':'opacity:.45'}"><div class="si" style="font-size:24px;width:30px">${c.icon}</div><div style="flex:1"><b class="small">${c.name}</b><div class="tiny mut">${c.desc}</div><div class="tiny cy">⚡${c.cost} · ⏳${c.cd}${ok?'':' · 🔒 trenér '+c.lvl}</div></div></div>`;}).join('')}</div></div>`;
 return h;}
function uiMedia(k){const r=media(k);toast(r.msg);render();}
function uiTrain(k){const r=train(k,UI.tt);toast(r.msg);render();}
function uiRest(k){const r=rest(k);toast(r.msg);render();}
function uiBuy(k){const r=buy(k);toast(r.msg);render();}

// ---------- rankings ----------
function renderRank(){const me=ME();let list=S.order.map(P).filter(Boolean);
 const f=UI.rf;if(f==='top')list=list.filter(p=>p.rank&&p.rank<=100);else if(f==='inj')list=list.filter(p=>p.injury>0&&p.rank).sort((a,b)=>a.rank-b.rank);else if(f==='near'){const i=list.indexOf(me);list=list.slice(Math.max(0,i-25),i+26);}else if(f==='home')list=list.filter(p=>p.cc===me.cc);
 const q=UI.rs.trim().toLowerCase();if(q)list=list.filter(p=>p.n.toLowerCase().includes(q));
 const rows=list.slice(0,300).map(p=>`<tr class="${p.isMe?'me':''}" onclick="playerModal('${p.id}')"><td class="b" style="width:34px">${p.rank||'—'}</td><td style="width:30px">${moveTag(p)}</td><td><div class="row" style="gap:6px"><span>${flag(p.cc)}</span><div style="min-width:0"><div class="b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px">${esc(p.n)}</div><div class="tiny mut">${S.season-p.by} let · úr. ${Math.round(ovr(p))}${p.hand==='L'?' · levák':''}${p.injury>0?` · <span class="bad b">${injIcon(p)} ${esc(injName(p).split(' (')[0].toLowerCase())}, ${injWeeksTxt(p)}</span>`:''}</div></div>${p.injury>0?'<span class="injtag" title="Zraněný">🩹</span>':''}</div></td><td class="r tiny" style="color:#ff8fb8;width:38px">❤️${Math.round(popOf(p))}</td><td class="r b gold">${fmtNum(totalPts(p))}</td></tr>`).join('');
 return `<div class="card" style="padding:10px"><div class="row" style="margin-bottom:8px"><b>📊 Žebříček ATP</b><span class="sp"></span><span class="tiny mut">52 týdnů · 19 nejlepších výsledků</span></div>
 <div class="tabs" style="margin-bottom:8px">${[['top','Top 100'],['all','Vše'],['near','Okolí'],['home',flag(me.cc)+' '+COUNTRIES[me.cc][1].slice(0,8)],['inj','🏥 Marodka']].map(x=>`<button class="${f===x[0]?'on':''}" onclick="UI.rf='${x[0]}';render()">${x[1]}</button>`).join('')}</div>
 <input placeholder="🔍 Hledat hráče…" value="${esc(UI.rs)}" oninput="UI.rs=this.value;clearTimeout(window._rs);window._rs=setTimeout(()=>{render();const i=document.querySelector('.view input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250)">
 ${f==='inj'?`<div class="small mut" style="margin-top:8px">Aktuálně zranění hráči (${list.length}). Zranění hráči vynechávají turnaje a přicházejí o body.</div>`:''}<table class="rk" style="margin-top:8px">${rows||'<tr><td class="mut">Nic nenalezeno.</td></tr>'}</table>
 ${f==='inj'&&(S.injNews||[]).length?`<div class="small b" style="margin:12px 0 6px">📰 Poslední zranění na okruhu</div>${S.injNews.slice(0,25).map(n=>`<div class="news injn" onclick="playerModal('${n.id}')"><small>T${n.w}/${n.s}</small>${INJ_TYPES[n.t][1]} <b>${esc(n.n)}</b> ${flag(n.cc)} ${n.rk?'('+n.rk+'.)':''} – ${esc(INJ_TYPES[n.t][0].toLowerCase())}${n.wk>0?' · '+n.wk+' týd.':''}${n.c?' · '+esc(n.c):''}</div>`).join('')}`:''}</div>`;}
function playerModal(id){const p=P(id);if(!p)return;const me=ME();const h2h=me.h2h[id];const maxW=Math.max(1,...p.pw);const age=S.season-p.by;
 const bars=p.pw.map((v,i)=>`<i style="height:${v/maxW*100}%;${i===S.week-2?'background:#ffd34d':''}" title="T${i+1}: ${v}"></i>`).join('');
 const titles=p.isMe?me.car.titleList.length:p.titles;
 modal(`<div class="row">${avatarSVG(p,64)}<div style="flex:1;min-width:0"><h2 style="margin:0">${esc(p.n)}</h2><div class="small mut">${flag(p.cc)} ${COUNTRIES[p.cc]?COUNTRIES[p.cc][1]:''} · ${age} let · ${STYLE_NAMES[p.style]||''}</div><div class="tiny mut">${p.hand==='L'?'Levák':'Pravák'}, ${p.bh1?'jednoruční':'obouruční'} bekhend${p.hcm?' · '+p.hcm+' cm':''}${p.pro?' · profi od '+p.pro:''}</div><div class="small">${p.real?'<span class="cy">skutečný hráč ATP</span>'+(p.ctit?` · <span class="mut">${p.ctit} titulů ATP v kariéře${p.chr?', max. '+p.chr+'.':''}</span>`:''):p.isMe?'<span class="gold">ty</span>':'<span class="mut">nováček na okruhu</span>'}</div></div>${ovRing(ovr(p),70)}</div>
 <div class="grid3" style="margin:12px 0"><div class="tile"><b>${p.rank||'—'}</b><span>Žebříček</span></div><div class="tile"><b class="gold">${fmtNum(totalPts(p))}</b><span>Body</span></div><div class="tile"><b>${p.best||'—'}</b><span>Nejlepší</span></div><div class="tile"><b>${p.sw}-${p.sl}</b><span>Sezóna V-P</span></div><div class="tile"><b>${titles}</b><span>Tituly (hra)</span></div><div class="tile"><b>${h2h?h2h[0]+'-'+h2h[1]:'—'}</b><span>H2H s tebou</span></div></div><div class="row small" style="margin:-4px 0 10px">❤️ Popularita <b style="margin-left:4px">${Math.round(popOf(p))}</b><span class="mut" style="margin-left:6px">· ${fmtFans(followers(popOf(p)))} fanoušků</span></div>
 ${p.injury>0?`<div class="injbox"><div class="ii">${injIcon(p)}</div><div style="flex:1"><b>${esc(injName(p))}</b><div class="small">Mimo hru ještě ${injWeeksTxt(p)}</div>${injProgress(p)}</div></div>`:''}
 ${p.sv?`<div class="tiny mut" style="margin:-2px 0 8px">Statistiky ATP (kariéra): body na podání ${p.sv[0]} % · na returnu ${p.sv[1]} % · ${p.sv[2]} es/hru · 1. podání ${p.sv[3]} %</div>`:''}
 ${statRows(p,false)}
 <div class="chips" style="margin:10px 0">${['H','C','G','I'].map(s=>{const v=p.sf[s]||0;return `<span class="surf" style="background:${SURF[s].color}">${SURF[s].name} ${v>0?'+'+v:v<0?v:'±0'}</span>`;}).join('')}</div>
 <div class="tiny mut" style="margin-bottom:4px">Body podle týdnů kalendáře</div><div class="chart">${bars}</div>
 <button class="btn big ghost" style="margin-top:12px" onclick="closeModal()">Zavřít</button>`);}

// ---------- career ----------
function trophySVG(color,size){return `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="tg${color.slice(1)}" x1="0" x2="1"><stop offset="0" stop-color="${color}"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><path d="M18 8h28v10c0 10-6 17-14 17S18 28 18 18z" fill="url(#tg${color.slice(1)})" stroke="rgba(0,0,0,.3)"/><path d="M18 12H9c0 9 5 13 10 13M46 12h9c0 9-5 13-10 13" fill="none" stroke="${color}" stroke-width="3"/><rect x="29" y="34" width="6" height="11" fill="${color}"/><rect x="20" y="45" width="24" height="5" rx="2" fill="${color}"/><rect x="16" y="50" width="32" height="7" rx="2" fill="#3a2a1a"/></svg>`;}
function renderCareer(){const me=ME();const c=me.car;const pct=c.matches?Math.round(c.w/(c.w+c.l)*100):0;
 let h=`<div class="card"><h3>📈 Kariéra · ${esc(me.n)}</h3><div class="grid3">
 <div class="tile"><b>${c.w}-${c.l}</b><span>Zápasy V-P</span></div><div class="tile"><b>${pct}%</b><span>Úspěšnost</span></div><div class="tile"><b class="gold">${c.titleList.length}</b><span>Tituly</span></div>
 <div class="tile"><b>${c.finals+c.titleList.length}</b><span>Finále</span></div><div class="tile"><b>${me.best||'—'}</b><span>Nejlepší žebř.</span></div><div class="tile"><b class="good" style="font-size:15px">${fmtMoney(c.prize)}</b><span>Prize money</span></div>
 <div class="tile"><b>${c.aces}</b><span>Esa</span></div><div class="tile"><b>${c.longest}</b><span>Nejdelší výměna</span></div><div class="tile"><b>${c.bestStreak}</b><span>Série výher</span></div>
 <div class="tile"><b>${c.tb[0]}-${c.tb[1]}</b><span>Tiebreaky</span></div><div class="tile"><b>${c.top10}</b><span>Výhry nad top 10</span></div><div class="tile"><b>${c.df}</b><span>Dvojchyby</span></div>
 <div class="tile"><b>${me.dRank||'—'}</b><span>Žebř. čtyřhra</span></div><div class="tile"><b>${(c.davis&&c.davis.w)||0}-${(c.davis&&c.davis.l)||0}</b><span>Davis Cup</span></div><div class="tile"><b>${c.dtitles||0}</b><span>Tituly čtyřhra</span></div></div>
 <div style="margin-top:12px">${['H','C','G','I'].map(s=>{const [w,l]=c.surf[s];const p=w+l?w/(w+l)*100:0;return `<div class="row small" style="margin:5px 0"><span style="width:58px">${SURF[s].name}</span><div class="bar" style="flex:1"><i style="width:${p}%;background:${SURF[s].color}"></i></div><b style="width:52px;text-align:right">${w}-${l}</b></div>`;}).join('')}</div></div>`;
 h+=popCard(me)+`<div class="card"><h3>💼 Sponzoři<span class="sp"></span><span style="text-transform:none;letter-spacing:0">${fmtMoney(sponsorPay(me))}/týden</span></h3>${sponsorList(me)}</div>`;
 if(typeof v6CareerExtra==='function')h+=v6CareerExtra(me);
 h+=`<div class="card"><h3>🏆 Vitrína trofejí</h3>${c.titleList.length?`<div class="grid3">${c.titleList.slice().reverse().map(t=>`<div class="trophy"><div class="tw">${trophySVG(TIERS[t.tier].color,44)}</div><b>${esc(t.name)}</b><span class="mut">${t.s} · ${TIERS[t.tier].short}</span></div>`).join('')}</div>`:'<div class="small mut">Zatím žádný titul. První trofej čeká!</div>'}</div>`;
 h+=`<div class="card"><h3>🏅 Úspěchy<span class="sp"></span><span>${Object.keys(me.ach).length}/${Object.keys(ACH).length}</span></h3>${Object.entries(ACH).map(([k,a])=>`<div class="ach ${me.ach[k]?'':'lock'}"><div class="ai">${a[2]}</div><div style="flex:1"><b class="small">${a[0]}</b><div class="tiny mut">${a[1]}</div></div>${me.ach[k]?`<span class="tiny gold">${me.ach[k].s}</span>`:''}</div>`).join('')}</div>`;
 if(me.seasons.length)h+=`<div class="card"><h3>📅 Sezóny</h3><table class="stt"><tr class="tiny mut"><td style="text-align:left">Rok</td><td>Žebř.</td><td>V-P</td><td>Tituly</td><td style="text-align:right">Výdělek</td></tr>${me.seasons.map(s=>`<tr><td style="text-align:left">${s.s}</td><td>${s.rank||'—'}</td><td>${s.w}-${s.l}</td><td>${s.titles}</td><td style="text-align:right">${fmtMoney(s.prize)}</td></tr>`).join('')}</table></div>`;
 h+=`<div class="card"><h3>🗂️ Historie turnajů</h3>${me.hist.slice(0,40).map(x=>`<div class="row small" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)">${tierBadge(x.tier)}<div style="flex:1;min-width:0"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${esc(x.name)}</b><span class="tiny mut">${x.s} · T${x.w} · ${SURF[x.surf].name}</span></div><div class="r"><b class="${x.res==='Vítěz'?'gold':''}">${x.res}</b><div class="tiny mut">+${x.pts} b. · ${fmtMoney(x.prize)}</div></div></div>`).join('')||'<div class="small mut">Ještě jsi nehrál turnaj.</div>'}</div>`;
 h+=`<div class="card"><h3>⚙️ Hra · v${GAME_VER}</h3><div class="grid2"><button class="btn ghost" onclick="saveGame();toast('Uloženo ✓')">💾 Uložit</button><button class="btn ghost" onclick="exportSave()">📤 Export</button><label class="btn ghost" style="cursor:pointer">📥 Import<input type="file" accept=".json" style="display:none" onchange="importSave(this)"></label><button class="btn red" onclick="confirmBox('Nová hra?','Současná kariéra bude smazána.','Smazat',()=>{resetGame();UI.tab='home';render();})">🗑️ Nová hra</button></div><div class="tiny mut" style="margin-top:8px">Hra se ukládá automaticky do prohlížeče (localStorage) po každém týdnu i akci.</div></div>`;
 return h;}
function exportSave(){saveGame();const blob=new Blob([STORE.get(SAVE_KEY)||''],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tenis-manazer-${S.season}-t${S.week}.json`;a.click();}
function importSave(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.players||!d.season)throw 0;STORE.set(SAVE_KEY,r.result);loadGame();UI.tab='home';render();toast('Hra načtena ✓');}catch(e){toast('Neplatný soubor');}};r.readAsText(f);}

function injRiskTxt(type){const me=ME();const age=S.season-me.by;const base={lehky:0.0008,tvrdy:0.0045,kemp:0.01}[type];const r=base*ageInjF(age)*(me.energy<15?3:me.energy<30?2:1)*(1-0.12*(me.fyzio||0));return (r*100).toFixed(r<0.01?2:1).replace('.',',')+' %';}

// ===================== UI: tournament & live match =====================
function seedTag(ev,id){return ev.seeds&&ev.seeds[id]?`<span class="tiny cy">[${ev.seeds[id]}]</span>`:'';}
function matchLine(ev,m){const nm=id=>id==='me'&&S.cur&&S.cur.ev===ev.id&&S.cur.stage==='qual'&&S.cur.status==='alive'?'<span class="cy">Q (kvalifikant)</span>':id?`${flag(P(id)?P(id).cc:'')} ${esc(shortName(P(id)))} ${seedTag(ev,id)}`:'<span class="mut">volný los</span>';const me=m.a==='me'||m.b==='me';
 const sc=(m.sets&&m.sets.length)||m.wo?scoreTxtM(m):'';
 return `<div class="bm ${me?'me':''}"><div><span class="${m.w?(m.w===m.a?'w':'l'):''}">${nm(m.a)}</span>${m.w===m.a&&sc?`<span class="tiny gold">${sc}</span>`:''}</div><div><span class="${m.w?(m.w===m.b?'w':'l'):''}">${nm(m.b)}</span>${m.w===m.b&&m.b&&sc?`<span class="tiny gold">${sc}</span>`:''}</div></div>`;}
function renderEvent(){const ev=humanEvent();if(!ev){UI.tab='home';return renderHome();}
 const me=ME();const tier=TIERS[ev.tier];const nm=humanNextMatch();const st=S.cur.status;
 let h=`<div class="hero" style="padding:14px"><div class="row"><div class="ic emb-ic">${tierEmblem(ev.tier,52)}</div><div style="flex:1;min-width:0"><div class="b" style="font-size:18px">${esc(ev.name)}</div><div class="small mut">${flag(ev.cc)} ${esc(ev.city)} · ${weekLabel(S.season,ev.week,ev.len)}</div><div class="chips">${tierBadge(ev.tier)}${surfChip(ev.surf)}<span class="pill" style="padding:2px 7px">${tier.bo===5?'Bo5':'Bo3'}</span>${S.cur.mode==='wc'?'<span class="pill gold" style="padding:2px 7px">WC</span>':''}</div></div></div></div>`;
 if(st==='alive'&&nm){
  if(nm.bye){h+=`<div class="card"><h3>${nm.round}</h3><div class="b">Volný los – postupuješ bez boje.</div><button class="btn big" style="margin-top:10px" onclick="humanByeAdvance();saveGame();render()">Postoupit ▶</button></div>`;}
  else{const o=P(nm.opp);const h2=me.h2h[o.id];
   const row=(lab,a,b)=>`<div class="vs"><div class="l"><b>${Math.round(a)}</b><div class="bar"><i style="width:${a}%;${a>=b?'':'opacity:.5'}"></i></div></div><div class="m">${lab}</div><div class="rr"><div class="bar"><i style="width:${b}%;background:linear-gradient(90deg,#ff7b8d,#ff5d73);${b>=a?'':'opacity:.5'}"></i></div><b>${Math.round(b)}</b></div></div>`;
   const ms=effStatsBase(me);
   h+=`<div class="card"><h3>🎾 ${nm.round}<span class="sp"></span>${h2?`<span>H2H ${h2[0]}-${h2[1]}</span>`:''}</h3>
   <div class="row" style="justify-content:space-between;margin-bottom:10px"><div class="c" style="width:42%">${avatarSVG(me,56)}<div class="b small">${esc(shortName(me))}</div><div class="tiny mut">${rankTxt(me)} · úr. ${Math.round(ovr(me))}</div></div><div class="b gold" style="font-size:22px">VS</div><div class="c" style="width:42%">${avatarSVG(o,56)}<div class="b small">${flag(o.cc)} ${esc(shortName(o))} ${seedTag(ev,o.id)}</div><div class="tiny mut">${rankTxt(o)} · úr. ${Math.round(ovr(o))} · ${S.season-o.by} let</div></div></div>
   ${row('Úroveň',ovr(me),ovr(o))}${STAT_KEYS.map(k=>row(STAT_NAMES[k],ms[k],o.st[k])).join('')}${row(SURF[ev.surf].name,50+(me.sf[ev.surf]||0)*8,50+(o.sf[ev.surf]||0)*8)}
   ${crowdBox(me,o,ev)}<div class="small mut" style="margin:8px 0">Styl soupeře: ${STYLE_NAMES[o.style]||'—'}${me.energy<45?` · <span class="warn">tvá energie je nízká (${Math.round(me.energy)})</span>`:''}</div>
   ${typeof matchOddsLine==='function'?matchOddsLine(ev,me,o):''}
   <button class="btn big gold" onclick="preMatch(true)">▶ Hrát zápas</button>
   <div class="grid2" style="margin-top:8px"><button class="btn ghost" onclick="preMatch(false)">⚡ Rychlá simulace</button>${ev.dc||ev.dbl?'':`<button class="btn ghost" onclick="simWholeEvent()">⏩ Simulovat turnaj</button>`}</div></div>`;}
 } else if(st!=='alive'){
  const res=ev.done&&ev.champ==='me'?'🏆 ŠAMPION!':(S.cur.path&&S.cur.path.length?'Vypadl jsi: '+S.cur.path[S.cur.path.length-1].round:'Konec');
  h+=`<div class="card c" style="${st==='champ'?'border-color:#ffd34d;background:linear-gradient(160deg,rgba(255,211,77,.25),rgba(20,40,95,.6))':''}">${st==='champ'?`<div>${trophySVG(tier.color,90)}</div>`:''}<div class="b" style="font-size:22px">${res}</div><div class="small mut" style="margin:6px 0 12px">Body a prize money budou připsány na konci turnaje.</div><button class="btn big" onclick="uiAdvance()">Pokračovat ▶</button></div>`;
 }
 if(S.cur.path&&S.cur.path.length)h+=`<div class="card"><h3>🧭 Tvoje cesta</h3>${S.cur.path.map(p=>`<div class="row small" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)"><span style="width:96px" class="mut">${p.round}</span><span style="flex:1">${flag(p.cc)} ${esc(p.opp)}</span><b class="${p.won?'good':'bad'}">${p.won?'V':'P'} ${p.score}</b></div>`).join('')}</div>`;
 if(ev.tier==='FIN'){h+=`<div class="card"><h3>🌟 Skupiny</h3>${ev.groups.map((g,gi)=>`<div class="small b" style="margin:6px 0">Skupina ${gi?'B':'A'}</div><table class="stt">${rrStandings(ev,gi).map(id=>{const r=ev.rr[id];return `<tr style="${id==='me'?'background:rgba(255,211,77,.12)':''}"><td style="text-align:left">${flag(P(id).cc)} ${esc(shortName(P(id)))}</td><td>${r.w}-${r.l}</td><td style="text-align:right" class="tiny mut">sety ${r.sw}-${r.sl}</td></tr>`;}).join('')}</table>`).join('')}</div>`;}
 const rr=ev.rounds;const show=[];for(let i=rr.length-1;i>=0&&show.length<2;i--)show.push(i);
 h+=`<div class="card bracket"><h3>🕸️ Pavouk</h3>${show.map((i,k)=>`<details ${k===0?'open':''}><summary class="b small" style="margin:6px 0;cursor:pointer">${evRoundName(ev,i)} (${rr[i].length})</summary>${rr[i].slice().sort((a,b)=>((b.a==='me'||b.b==='me')?1:0)-((a.a==='me'||a.b==='me')?1:0)).map(m=>matchLine(ev,m)).join('')}</details>`).join('')}</div>`;
 return h;}
// ---------- scouting & tactics ----------
function profileTxt(p){const st=p.st;const out=[];const wk=weakWing(p);const gap=Math.abs(st.fh-st.bh);
 if(gap>=4)out.push(`slabší ${wk==='bh'?'bekhend':'forhend'} (${Math.round(st[wk])} vs ${Math.round(st[wk==='bh'?'fh':'bh'])})`);
 if(st.srv>=86)out.push('velký servis');else if(st.srv<=Math.min(st.fh,st.bh)-4)out.push('slabší podání');
 if(st.ret>=86)out.push('výborný return');if(st.kon<=Math.min(st.fh,st.srv)-5)out.push('slabší kondice');else if(st.kon>=88)out.push('skvělá kondice');
 if(st.men>=88)out.push('silná psychika');else if(st.men<=Math.min(st.fh,st.srv)-5)out.push('nervózní v koncovkách');
 if(p.hand==='L')out.push('levák');if(p.bh1)out.push('jednoruční bekhend');
 return out;}
function coachPlan(me,o,surf){// recommended tactic for the human
 const t=Object.assign({},TAC_DEF);const ms=effStatsBase(me),os=o.st;
 const gap=Math.abs(os.fh-os.bh);if(gap>=4)t.target=os.bh<os.fh?'bh':'fh';
 t.rally=(surf==='G'||surf==='I')&&Math.max(ms.fh,ms.srv)>=os.kon-2?'atk':surf==='C'&&ms.kon>=os.kon?'def':'bal';
 const vol=(ms.fh+ms.srv+ms.men)/3,pas=(os.fh+os.bh)/2*0.55+os.ret*0.45;
 t.net=surf==='G'&&vol>=pas-3?2:(surf!=='C'&&vol>=pas+2)?1:0;
 t.drop=surf==='C'&&os.kon<=ms.kon?(os.kon<72?2:1):0;
 t.retPos=os.srv>=ms.ret+6?'deep':os.srv<=ms.ret-6?'close':'norm';
 t.srvRisk=ms.srv>=os.ret+6&&surf!=='C'?2:ms.srv<=os.ret-6?0:1;
 t.dir=Math.max(ms.fh,ms.bh)>=os.kon+4?'line':Math.max(ms.fh,ms.bh)<=os.kon-4?'cross':'mix';
 t.pace=ms.kon>=os.kon+5?'fast':'norm';
 return t;}
function tacEditor(t,cb){return Object.entries(TAC_OPTS).map(([k,o])=>`<div class="tacrow"><div class="tl">${o.icon} ${o.name}</div><div class="seg-t tseg">${o.o.map(([v,l])=>`<button class="${String(t[k])===String(v)?'on':''}" onclick="${cb}('${k}','${v}')">${l}</button>`).join('')}</div></div>`).join('');}
function tacSummary(t){const o=k=>{const x=TAC_OPTS[k].o.find(z=>String(z[0])===String(t[k]));return x?x[1]:'';};return [o('rally'),t.target!=='none'?'🎯 '+o('target'):'',t.net?'🏃 síť: '+o('net'):'',t.drop?'🪶 '+o('drop'):'',o('srvDir'),'return: '+o('retPos')].filter(Boolean).join(' · ');}
function preMatch(live){const me=ME();const nm=humanNextMatch();const ev=humanEvent();if(!nm||!nm.opp)return;const o=P(nm.opp);
 me.tac=Object.assign({},TAC_DEF,me.tac||{});
 if(typeof maybeCreateFixOffer==='function'&&maybeCreateFixOffer(ev,o)){showFixOfferModal(!!live);return;}
 if(!live){runEventMatch(false);return;}
 const pr=profileTxt(o);const rec=coachPlan(me,o,ev.surf);
 const h2=me.h2h[o.id];const riv=typeof isRival==='function'&&isRival(o.id);
 modal(`<h2>📋 Příprava na zápas</h2>
 <div class="scout"><div class="row">${avatarSVG(o,48)}<div style="flex:1"><b>${flag(o.cc)} ${esc(o.n)}</b><div class="tiny mut">${rankTxt(o)} žebříčku · ${S.season-o.by} let · ${STYLE_NAMES[o.style]||''}${riv?' · <span class="gold">rival</span>':''}</div></div></div>
 <div class="small" style="margin-top:8px">🔎 <b>Scouting:</b> ${pr.length?pr.join(', '):'vyrovnaný hráč bez výrazných slabin'}.${o.sf[ev.surf]?` Na povrchu ${SURF[ev.surf].name.toLowerCase()} ${o.sf[ev.surf]>0?'<span class="bad">se mu daří</span>':'<span class="good">se mu nedaří</span>'}.`:''}${o.sv?` <span class="mut">ATP: ${o.sv[2]} es/hru, ${o.sv[1]} % bodů na returnu.</span>`:''}${h2?` Vzájemná bilance <b>${h2[0]}:${h2[1]}</b>.`: ' Ještě jste proti sobě nehráli.'}${riv?' Tohle už je rivalita – na kurtě to bude i o hlavě.':''}</div>
 ${typeof preMatchOddsBlock==='function'?preMatchOddsBlock(ev,me,o):''}
 <div class="small" style="margin-top:6px">🧑‍🏫 <b>Trenér doporučuje:</b> ${tacSummary(rec)}</div><button class="btn sm gold" style="margin-top:8px" onclick="ME().tac=coachPlan(ME(),P('${o.id}'),'${ev.surf}');preMatch(true)">Použít plán trenéra</button></div>
 <div id="tacEd">${tacEditor(me.tac,'preTac')}</div>
 <div class="tiny mut" style="margin:8px 0">Taktiku i karty můžeš měnit kdykoli během zápasu (📋). Taktika působí podle profilu soupeře a povrchu.</div>
 <button class="btn big gold" onclick="closeModal();runEventMatch(true)">Na kurt ▶</button>`);}
function preTac(k,v){const me=ME();me.tac[k]=isNaN(+v)?v:+v;$('#tacEd').innerHTML=tacEditor(me.tac,'preTac');}
// ---------- human match results & injuries ----------
function finishEventMatch(m,nm){const me=ME();const won=m.winner===0;me.energy=m.en[0];const o=P(nm.opp);
 if(typeof resolveFixJob==='function')resolveFixJob(m);
 S.live=null;
 S.cur.path=S.cur.path||[];S.cur.path.push({round:nm.round,opp:o.n,cc:o.cc,won,score:m.scoreText(0)+(m.ret!=null?' skr.':'')});
 const ev=humanEvent();
 if(nm.qual)humanQualResult(won,m.info());else{humanMainResult(won,m.sets,m.info());if(m.ret!=null&&nm.m)nm.m.ret=m.ret===0?'me':nm.opp;}
 // opponent injury
 const oi=m.injEv[1];if(oi&&oi.fired){applyInjury(o,oi.t,m.ret===1?oi.w:Math.max(0,oi.w*0.7),m.ret===1?`skreč v zápase s tebou (${ev.name})`:`zranil se v zápase s tebou`);if(ev)o.injEv=ev.id;}
 // my injury
 let inj=false;const mi=m.injEv[0];
 if(mi&&mi.fired){let w=mi.w*(mi.played?1.6:1);applyInjury(me,mi.t,Math.round(w*2)/2,'v zápase');S.injAlert={i:mi.t,w,ctx:'match'};
  S.news.unshift({w:S.week,s:S.season,inj:1,t:`🤕 ${m.ret===0?'Skreč! ':''}Zranění v zápase (${INJ_TYPES[mi.t][0].toLowerCase()}) – pauza ${injWeeksTxt(me)}.`});
  if(S.cur.status==='alive'&&me.injury>=1){inj=true;humanWithdraw();}}
 if(m.ret!=null&&ev){const scr=m.scoreText(0)+' skr.';if(m.ret===0)S.news.unshift({w:S.week,s:S.season,t:`🏳️ ${me.n} skrečoval proti ${o.n} (${scr}) – ${ev.name}.`});else S.news.unshift({w:S.week,s:S.season,inj:1,t:`🚑 ${o.n} skrečoval v zápase proti ${me.n} (${scr}) – ${ev.name}.`});}
 saveGame();return inj;}
function humanWithdraw(){const ev=humanEvent();const nm=humanNextMatch();if(!nm)return;
 if(nm.qual){humanQualResult(false,null);}
 else if(nm.m){const opp=nm.opp;if(opp){nm.m.wo=true;applyResult(ev,nm.m,opp,[]);}else nm.m.w='me';simRoundAI(ev);if(roundComplete(ev))advanceRound(ev);}
 S.cur.status='out';S.cur.path.push({round:nm.round,opp:nm.opp?P(nm.opp).n:'—',cc:nm.opp?P(nm.opp).cc:'',won:false,score:'odstoupil (zranění)'});
 S.news.unshift({w:S.week,s:S.season,inj:1,t:`🚑 ${ME().n} odstoupil z turnaje ${ev.name} kvůli zranění (${injWeeksTxt(ME())} pauza).`});}
function runEventMatch(live,restore){const nm=humanNextMatch();const ev=humanEvent();const o=P(nm.opp);const me=ME();
 const opts={surf:ev.surf,bo:nm.qual?3:ev.bo,tb10:ev.tier==='GS'&&!nm.qual,cc:ev.cc,title:ev.name};if(S.fixJob)opts.fixJob=S.fixJob;
 if(!live){const m=new Match(me,o,Object.assign({autoInj:true},opts));m.simToEnd();const won=m.winner===0;const inj=finishEventMatch(m,nm);
  toast(`${won?'✅ Výhra':'❌ Prohra'} ${m.scoreText(0)}${m.ret!=null?' skr.':''} vs ${shortName(o)}${inj?' · 🤕 zranění!':''}`);if(S.cur.status==='champ')celebrate(ev);render();return;}
 openMatch({opp:o,surf:ev.surf,bo:opts.bo,tb10:opts.tb10,cc:ev.cc,title:`${ev.name} · ${nm.round}`,tour:ev.name,round:nm.round,tier:ev.tier,ev,restore,kind:'event',fixJob:opts.fixJob,onEnd:(m)=>{const inj=finishEventMatch(m,nm);let x='';
  if(S.cur.status==='champ'){x=`<div class="gold b" style="font-size:18px">🏆 Vyhrál jsi turnaj ${esc(ev.name)}!</div>`;setTimeout(()=>celebrate(ev),350);}
  else if(inj)x=`<div class="bad b">🤕 Zranění – musíš z turnaje odstoupit (${injWeeksTxt(ME())}).</div>`;
  else if(m.ret===1)x=`<div class="warn b">🚑 Soupeř skrečoval – postupuješ.</div>`;
  if(!inj&&m.winner===0&&S.cur.status==='alive'){const n2=humanNextMatch();x+=n2&&n2.opp?`<div class="small">Další kolo: <b>${n2.round}</b> proti ${flag(P(n2.opp).cc)} ${esc(P(n2.opp).n)}</div>`:'';}
  return x;},after:()=>{UI.tab='event';render();}});}
function simWholeEvent(){let g=0;while(S.cur&&S.cur.status==='alive'&&g++<12){const nm=humanNextMatch();if(!nm)break;if(nm.bye){humanByeAdvance();continue;}const ev=humanEvent();const m=new Match(ME(),P(nm.opp),{surf:ev.surf,bo:nm.qual?3:ev.bo,tb10:ev.tier==='GS'&&!nm.qual,cc:ev.cc,autoInj:true,title:ev.name});m.simToEnd();finishEventMatch(m,nm);}
 const ev=humanEvent();if(S.cur&&S.cur.status==='champ')celebrate(ev);render();}
function resumePrompt(){const L=S.live;if(!L)return;const nm=humanNextMatch();
 if(L.kind!=='event'||!nm||!nm.opp||!L.m||L.m.pid[1]!==nm.opp){S.live=null;saveGame();return;}
 const o=P(nm.opp);const sc=L.m.sets.map(s=>s[0]+':'+s[1]).concat([L.m.g[0]+':'+L.m.g[1]]).join(' ');
 modal(`<h2>⏸️ Rozehraný zápas</h2><p class="small">Máš rozehraný zápas proti <b>${flag(o.cc)} ${esc(o.n)}</b> (${esc(L.title||'')}). Stav: <b>${sc}</b>.</p><div class="grid2"><button class="btn ghost" onclick="closeModal();resumeSim()">⏩ Dosimulovat</button><button class="btn gold" onclick="closeModal();resumeLive()">▶ Pokračovat</button></div>`,true);}
function resumeLive(){const L=S.live;if(!L)return;UI.tab='event';render();runEventMatch(true,L.m);}
function resumeSim(){const L=S.live;if(!L)return;const nm=humanNextMatch();const m=Match.restore(L.m);m.o.autoInj=true;m.simToEnd();finishEventMatch(m,nm);UI.tab='event';render();toast(`${m.winner===0?'✅ Výhra':'❌ Prohra'} ${m.scoreText(0)}`);}

// ---------- live match view ----------
const MS={};
// broadcast camera: world x (lateral, 0 = centre, doubles ±83), y (0 far baseline … 360 near baseline), z height; 15.1 units = 1 m
const PJ={F:949,h:394.5,Dc:474,H0:-360,cx:180};
function pj(x,y,z){const D=PJ.Dc+(400-y);return [PJ.cx+PJ.F*x/D,PJ.H0+PJ.F*(PJ.h-(z||0))/D,PJ.F/D];}
const ptsStr=a=>a.map(p=>{const q=pj(p[0],p[1],p[2]||0);return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ');
const COURT_COL={H:{in:'#2f6fd0',out:'#2c8a5a',line:'#f4f8ff',dark:'#0d2c56'},C:{in:'#c8612f',out:'#b4552a',line:'#fff6ee',dark:'#5a2410'},G:{in:'#4ea24a',out:'#3f8f3c',line:'#fbfff7',dark:'#1d4a1c'},I:{in:'#3b5bd6',out:'#26265e',line:'#f3f1ff',dark:'#0f0f2e'}};
function seededR(seed){let s=seed;return ()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};}
function crowdSVG(surf,seed){const r=seededR(seed||7);let h='';const cols=['#e8eef8','#ff5d73','#36d1ff','#ffd34d','#3ee68a','#c9a2ff','#ff9f5a','#f5d0b0','#1b1b2a','#ffffff'];
 // far stand rows (behind far baseline)
 for(let row=0;row<6;row++){const y=4+row*8.2;const n=46+row*2;for(let i=0;i<n;i++){const x=6+i*(348/n)+r()*3;const c=cols[Math.floor(r()*cols.length)];h+=`<g class="fan" style="animation-delay:${(r()*0.6).toFixed(2)}s"><rect x="${(x-2.2).toFixed(1)}" y="${(y+2.6).toFixed(1)}" width="4.4" height="4.2" rx="1.4" fill="${c}" opacity=".9"/><circle cx="${x.toFixed(1)}" cy="${(y+1.2).toFixed(1)}" r="1.7" fill="${['#f5d0b0','#d29b72','#a8714a','#7a4b2e'][Math.floor(r()*4)]}"/></g>`;}}
 // side stands (left & right), perspective rows
 for(const sd of [-1,1]){for(let row=0;row<4;row++){for(let k=0;k<16;k++){const yw=-20+k*26;const xw=sd*(150+row*14);const q=pj(xw,yw,10+row*9);if(q[0]<-4||q[0]>364)continue;const sc=q[2]*1.25;const c=cols[Math.floor(r()*cols.length)];h+=`<g class="fan" style="animation-delay:${(r()*0.6).toFixed(2)}s"><rect x="${(q[0]-2.4*sc).toFixed(1)}" y="${(q[1]).toFixed(1)}" width="${(4.8*sc).toFixed(1)}" height="${(4.6*sc).toFixed(1)}" rx="1.4" fill="${c}" opacity=".85"/><circle cx="${q[0].toFixed(1)}" cy="${(q[1]-1.6*sc).toFixed(1)}" r="${(1.9*sc).toFixed(1)}" fill="#e0b48e"/></g>`;}}}
 return h;}
function courtSVG(surf){const c=COURT_COL[surf];const L=c.line;
 const quad=(x0,y0,x1,y1)=>ptsStr([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
 const line=(x0,y0,x1,y1,w)=>{const a=pj(x0,y0),b=pj(x1,y1);return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${L}" stroke-width="${(w||1.6)*(a[2]+b[2])/2*1.05}" stroke-linecap="round"/>`;};
 let stripes='';if(surf==='G'){for(let i=0;i<12;i++){const y0=-45+i*37.5;stripes+=`<polygon points="${quad(-135,y0,135,y0+18.75)}" fill="rgba(255,255,255,.07)"/>`;}}
 if(surf==='C'){for(let i=0;i<8;i++){const y0=-45+i*56;stripes+=`<polygon points="${quad(-135,y0,135,y0+28)}" fill="rgba(80,20,0,.05)"/>`;}}
 const boards=[[-135,-44,135,-44],[-135,404,135,404]];
 const bd=(y)=>{const a=pj(-135,y,0),b=pj(135,y,0),a2=pj(-135,y,14),b2=pj(135,y,14);return `<polygon points="${a[0]},${a[1]} ${b[0]},${b[1]} ${b2[0]},${b2[1]} ${a2[0]},${a2[1]}" fill="url(#adg)"/>`;};
 const adTxt=(y,t)=>{const q=pj(0,y,4.5);return `<text x="${q[0]}" y="${q[1]}" text-anchor="middle" font-size="${(9*q[2]).toFixed(1)}" font-weight="900" fill="rgba(255,255,255,.85)" letter-spacing="2">${t}</text>`;};
 // net
 const nL=pj(-92,180,0),nR=pj(92,180,0),tL=pj(-92,180,16.2),tR=pj(92,180,16.2),tC=pj(0,180,13.8);
 const chair=pj(-108,180,0),chT=pj(-108,180,36);
 return `<svg class="court" id="court" viewBox="0 0 360 440" preserveAspectRatio="xMidYMid meet"><defs>
 <linearGradient id="arena" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${surf==='I'?'#05051a':'#0a1430'}"/><stop offset=".25" stop-color="${surf==='I'?'#14123c':'#1b2b55'}"/><stop offset="1" stop-color="#081022"/></linearGradient>
 <linearGradient id="adg" x1="0" x2="1"><stop offset="0" stop-color="#0b2a6e"/><stop offset=".5" stop-color="#1b4fd0"/><stop offset="1" stop-color="#0b2a6e"/></linearGradient>
 <radialGradient id="light" cx="50%" cy="55%" r="65%"><stop offset="0" stop-color="#fff" stop-opacity="${surf==='I'?'.16':'.10'}"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
 <radialGradient id="ballg" cx="35%" cy="35%"><stop offset="0" stop-color="#fbffb8"/><stop offset=".7" stop-color="#d4ec1a"/><stop offset="1" stop-color="#9bb000"/></radialGradient>
 <pattern id="mesh" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0L3 3M3 0L0 3" stroke="rgba(255,255,255,.35)" stroke-width=".35"/></pattern>
 <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${surf==='C'?'.9':surf==='G'?'.35 1.4':'1.2'}" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 ${surf==='C'?'.3':'1'}  0 0 0 0 ${surf==='C'?'.1':'1'}  0 0 0 0 ${surf==='C'?'.02':'1'}  0 0 0 ${surf==='C'?'.22':'.07'} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
 <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
 <clipPath id="courtClip"><polygon points="${quad(-135,-45,135,405)}"/></clipPath>
 </defs>
 <rect width="360" height="440" fill="url(#arena)"/>
 <g id="crowd">${crowdSVG(surf,surf.charCodeAt(0)*31)}</g>
 <polygon points="${quad(-135,-45,135,405)}" fill="${c.out}"/>
 <polygon points="${quad(-83.1,0,83.1,360)}" fill="${c.in}"/>
 <g clip-path="url(#courtClip)">${stripes}<polygon points="${quad(-135,-45,135,405)}" fill="#fff" filter="url(#grain)"/></g>
 ${bd(-44)}${adTxt(-44,'TENIS MANAŽER · AQUAVOLT · SMASHPRO')}${bd(404)}${adTxt(404,'NORTHLINE SPORT · CHRONEX · VELOCE')}
 <g opacity=".96">${line(-83.1,0,83.1,0,2.2)}${line(-83.1,360,83.1,360,2.2)}${line(-83.1,0,-83.1,360)}${line(83.1,0,83.1,360)}${line(-62.3,0,-62.3,360)}${line(62.3,0,62.3,360)}${line(-62.3,83.1,62.3,83.1)}${line(-62.3,276.9,62.3,276.9)}${line(0,83.1,0,276.9)}${line(0,0,0,5)}${line(0,355,0,360)}</g>
 <polygon points="${quad(-135,-45,135,405)}" fill="url(#light)"/>
 <g id="shadows"></g>
 <g id="pl1"></g>
 <polygon points="${nL[0]},${nL[1]} ${nR[0]},${nR[1]} ${tR[0]},${tR[1]} ${tC[0]},${tC[1]} ${tL[0]},${tL[1]}" fill="rgba(10,14,30,.55)"/>
 <polygon points="${nL[0]},${nL[1]} ${nR[0]},${nR[1]} ${tR[0]},${tR[1]} ${tC[0]},${tC[1]} ${tL[0]},${tL[1]}" fill="url(#mesh)"/>
 <polyline points="${tL[0]},${tL[1]} ${tC[0]},${tC[1]} ${tR[0]},${tR[1]}" fill="none" stroke="#fff" stroke-width="2"/>
 <line x1="${nL[0]}" y1="${nL[1]}" x2="${tL[0]}" y2="${tL[1]}" stroke="#d8dde8" stroke-width="2.4"/><line x1="${nR[0]}" y1="${nR[1]}" x2="${tR[0]}" y2="${tR[1]}" stroke="#d8dde8" stroke-width="2.4"/>
 <g><line x1="${chair[0]}" y1="${chair[1]}" x2="${chT[0]}" y2="${chT[1]}" stroke="#d0d6e4" stroke-width="2"/><rect x="${chT[0]-6}" y="${chT[1]-8}" width="12" height="9" rx="2" fill="#1d2b55" stroke="#9fb3e6" stroke-width=".8"/><circle cx="${chT[0]}" cy="${chT[1]-11}" r="3" fill="#e0b48e"/></g>
 <path id="trail" d="" fill="none" stroke="rgba(230,255,120,.55)" stroke-linecap="round" stroke-linejoin="round"/>
 <ellipse id="bsh" cx="0" cy="0" rx="2" ry="1" fill="rgba(0,0,0,.38)"/>
 <g id="pl0"></g>
 <circle id="ball" cx="-20" cy="-20" r="2.8" fill="url(#ballg)" stroke="#7f9000" stroke-width=".35"/>
 <g id="fx"></g></svg>`;}
// articulated player figure (feet at 0,0, ~100 units tall)
function figureSVG(p,back){const l=lookFor(p);const lefty=p.hand==='L';const skin=l.skin,hair=l.hair,shirt=l.shirt;const shorts=shirt==='#ffffff'?'#1c2340':'#f4f6fb';
 return `<g class="figw"><g class="fig">
 <ellipse class="fsh" cx="0" cy="0" rx="20" ry="6" fill="rgba(0,0,0,.35)"/>
 <g class="legL"><path d="M-5 -46 L-9 -22 L-8 -2" stroke="${skin}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-13 -1 h10" stroke="#f2f2f2" stroke-width="6" stroke-linecap="round"/></g>
 <g class="legR"><path d="M5 -46 L9 -22 L8 -2" stroke="${skin}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 -1 h10" stroke="#f2f2f2" stroke-width="6" stroke-linecap="round"/></g>
 <path d="M-12 -52 h24 l2 12 h-28z" fill="${shorts}"/>
 <path d="M-13 -80 Q0 -86 13 -80 L12 -50 L-12 -50Z" fill="${shirt}" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
 <path d="M-12 -79 L-20 -62 L-17 -54" stroke="${skin}" stroke-width="5.5" fill="none" stroke-linecap="round" class="armOff"/>
 <g class="arm"><path d="M12 -79 L22 -66 L28 -58" stroke="${skin}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M28 -58 L36 -47" stroke="#22262e" stroke-width="3" stroke-linecap="round"/><ellipse cx="42" cy="-38" rx="7" ry="10" transform="rotate(-36 42 -38)" fill="rgba(255,255,255,.12)" stroke="#1b1f2a" stroke-width="2.4"/></g>
 <rect x="-3.5" y="-88" width="7" height="8" rx="2" fill="${skin}"/>
 <circle cx="0" cy="-94" r="9.5" fill="${skin}"/>
 ${back?`<path d="M-9.6 -93 A9.6 9.6 0 1 1 9.6 -93 L9 -88 Q0 -84 -9 -88Z" fill="${hair}"/>`:`<path d="M-9.5 -95 C-9 -106 9 -106 9.5 -95 C6 -100 -6 -100 -9.5 -95Z" fill="${hair}"/><circle cx="-3.2" cy="-94" r="1.3" fill="#141414"/><circle cx="3.2" cy="-94" r="1.3" fill="#141414"/>`}
 ${l.band||p.isMe?`<rect x="-9.8" y="-101" width="19.6" height="3.4" rx="1.6" fill="${shirt}" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>`:''}
 </g></g>`;}
function openMatch(o){const me=o.me||ME();let m;
 if(o.restore){m=Match.restore(o.restore);}else m=new Match(me,o.opp,{surf:o.surf,bo:o.bo,tb10:o.tb10,cc:o.cc,title:o.tour||o.title,noInj:!!o.daily,fixJob:o.fixJob});
 Object.assign(MS,{m,o,paused:false,abort:false,skip:false,speed:UI.speed,pos:[[30,380],[-30,-18]],ended:false,trail:[],coachShown:0});
 const wrap=document.createElement('div');wrap.className='mv-wrap';wrap.id='mv';
 wrap.innerHTML=`<div class="mview s-${o.surf}">
 <div class="tvsb" id="sb"></div>
 ${crowdLine(m)}
 <div class="court-wrap">${courtSVG(o.surf)}<div class="callout" id="callout"></div><div class="spdbox" id="spdbox"></div><div class="hawk" id="hawk"></div><div class="rally">VÝMĚNA<b id="rallyN">0</b></div><div class="lower3" id="l3"></div></div>
 <div class="comm" id="comm">🎾 Zápas začíná. Podává ${esc(m.p[m.server].n)}.</div>
 <div class="mom" title="Momentum"><i id="momI" style="left:50%"></i></div>
 <div class="liveodds" id="liveodds"></div>
 <div class="matchopts"><button class="btn ghost sm plvis" id="plVis" onclick="toggleShowPlayers()" title="Zobrazit hráče">Zobrazit hráče <b id="plVisT">vypnuto</b></button>${typeof showLiveMarkets==='function'?`<button class="btn ghost sm" onclick="showLiveMarkets()">📡 Živé sázky</button>`:''}</div>
 <div class="mbars"><div>⚡ ${esc(shortName(me))} <b id="enMeT"></b><div class="bar en"><i id="enMe"></i></div></div><div>⚡ ${esc(shortName(m.p[1]))} <b id="enOpT"></b><div class="bar en"><i id="enOp"></i></div></div></div>
 <div class="cards" id="cards"></div>
 <div class="mctrl">
 <div class="mctrl-row"><div class="seg-t" id="tac">${Object.entries(TACTICS).map(([k,t])=>`<button data-k="${k}" onclick="setTactic('${k}')" title="${t.name}">${t.icon}</button>`).join('')}</div>
 <button class="btn ghost sm" onclick="openTacSheet()" title="Taktika">📋</button><button class="btn ghost sm" onclick="openTacSheet(true)" title="Trenér">🧑‍🏫</button><button class="btn ghost sm retb" id="retB" onclick="confirmPlayerRetire()" title="Skrečovat zápas">🏳️</button></div>
 <div class="mctrl-row"><div class="seg-t" id="spd">${[[1,'1×'],[2,'2×'],[4,'4×'],[8,'8×'],[99,'⚡']].map(s=>`<button data-s="${s[0]}" onclick="setSpeed(${s[0]})">${s[1]}</button>`).join('')}</div>
 <button class="btn ghost sm" id="pauseB" onclick="togglePause()">⏸</button><button class="btn ghost sm" onclick="skipMatch()" title="Dosimulovat">⏭</button><button class="btn ghost sm" onclick="statsPopup()">📊</button></div></div>
 <div class="sheet" id="sheet"></div></div>`;
 document.body.appendChild(wrap);
 fitCourt();$('#pl0').innerHTML=figureSVG(me,true);$('#pl1').innerHTML=figureSVG(m.p[1],false);
 placePlayers(0);if(typeof applyShowPlayers==='function')applyShowPlayers();if(typeof ensureOwnMatchMarket==='function')ensureOwnMatchMarket(m,o.ev);updateScore();updateBars();renderCards();setTactic(m.tac[0].rally,true);setSpeed(MS.speed,true);placeBallAtServer();
 if(o.restore)setComm('▶ Pokračuješ v rozehraném zápase.');
 setTimeout(matchLoop,700);}
function setTactic(k,silent){MS.m.tac[0].rally=k;const me=ME();me.tac=me.tac||{};me.tac.rally=k;document.querySelectorAll('#tac button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));if(!silent)setComm(`📋 Styl výměn: <b>${TACTICS[k].name}</b>`);}
function setSpeed(s,silent){MS.speed=s;UI.speed=s;document.querySelectorAll('#spd button').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));}
function togglePause(){MS.paused=!MS.paused;$('#pauseB').textContent=MS.paused?'▶':'⏸';if(MS.paused)openTacSheet(true);else closeSheet();}
function skipMatch(){MS.skip=true;MS.paused=false;closeSheet();}
function confirmPlayerRetire(){if(!MS.m||MS.m.done)return;MS.paused=true;const pb=$('#pauseB');if(pb)pb.textContent='▶';
 const hurt=MS.m.hurt[0]||(MS.m.injEv[0]&&MS.m.injEv[0].fired);
 modal(`<h2>🏳️ Skrečovat zápas?</h2><div class="small">Zápas prohraješ a ve výsledku bude skreč.${hurt?' Pokud tě něco bolí, snížíš riziko, že se zranění zhorší.':''} Popularita trochu klesne.</div>
  <div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn ghost" onclick="cancelPlayerRetire()">Zůstat na kurtu</button><button class="btn gold" onclick="doPlayerRetire()">Skrečovat</button></div>`);}
function cancelPlayerRetire(){closeModal();if(MS.m&&!MS.m.done){MS.paused=false;const pb=$('#pauseB');if(pb)pb.textContent='⏸';}}
function doPlayerRetire(){closeModal();const m=MS.m;if(!m||m.done)return;if(m.injEv[0]&&m.injEv[0].fired)m.injEv[0].played=false;m.retWhy='voluntary';if(typeof addPop==='function')addPop(-0.6);m.retire(0);MS.paused=false;MS.skip=false;setComm('🏳️ Skrečoval jsi zápas.');if(typeof callout==='function')callout('SKREČ','#ffb648');if(typeof onHumanLiveKey==='function')onHumanLiveKey(m,{winner:1,event:{match:1,ret:0}});}
function setComm(t){const c=$('#comm');if(c)c.innerHTML=t;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// ----- tactics sheet & coach -----
function openTacSheet(coach){const sh=$('#sheet');if(!sh)return;MS.wasPaused=MS.paused;MS.paused=true;$('#pauseB').textContent='▶';
 const m=MS.m;const tips=coachTips(m);
 sh.innerHTML=`<div class="sh-in"><div class="row"><b>${coach?'🧑‍🏫 Trenér':'📋 Taktika'}</b><span class="sp"></span><div class="seg-t"><button class="${coach?'on':''}" onclick="openTacSheet(true)">Trenér</button><button class="${coach?'':'on'}" onclick="openTacSheet(false)">Taktika</button></div><button class="btn sm" style="margin-left:6px" onclick="closeSheet(true)">▶ Hrát</button></div>
 ${coach?`<div class="tips">${tips.map((t,i)=>`<div class="tip"><div class="ti">${t.i}</div><div style="flex:1"><div class="small">${t.t}</div>${t.set?`<button class="btn sm gold" style="margin-top:5px" onclick="applyTip(${i})">${t.btn||'Použít'}</button>`:''}</div></div>`).join('')||'<div class="small mut">Zatím málo dat – sleduj pár gamů.</div>'}</div>${liveStatsMini(m)}`:
 `<div class="presets"><button class="btn ghost sm" onclick="presetTac('atk')">⚔️ Útočná</button><button class="btn ghost sm" onclick="presetTac('bal')">⚖️ Vyvážená</button><button class="btn ghost sm" onclick="presetTac('def')">🛡️ Obranná</button><button class="btn ghost sm gold" onclick="presetTac('coach')">🧑‍🏫 Plán trenéra</button></div><div id="tacEdL">${tacEditor(m.tac[0],'liveTac')}</div>`}</div>`;
 MS.tips=tips;sh.classList.add('open');}
function closeSheet(resume){const sh=$('#sheet');if(sh)sh.classList.remove('open');if(resume){MS.paused=false;const b=$('#pauseB');if(b)b.textContent='⏸';}}
function liveTac(k,v){const m=MS.m;m.tac[0][k]=isNaN(+v)?v:+v;ME().tac=Object.assign({},m.tac[0]);$('#tacEdL').innerHTML=tacEditor(m.tac[0],'liveTac');if(k==='rally')setTactic(m.tac[0].rally,true);}
function presetTac(k){const m=MS.m;const t=m.tac[0];if(k==='coach'){Object.assign(t,coachPlan(ME(),m.p[1],m.surf));}else{t.rally=k;t.dir=k==='atk'?'line':k==='def'?'cross':'mix';t.net=k==='atk'?(m.surf==='C'?0:1):0;t.srvRisk=k==='atk'?2:k==='def'?0:1;t.retPos=k==='atk'?'close':k==='def'?'deep':'norm';t.pace=k==='def'?'slow':'norm';}
 ME().tac=Object.assign({},t);setTactic(t.rally,true);openTacSheet(false);setComm(`📋 Nová taktika: <b>${esc(tacSummary(t))}</b>`);}
function applyTip(i){const t=MS.tips&&MS.tips[i];if(!t||!t.set)return;Object.assign(MS.m.tac[0],t.set);ME().tac=Object.assign({},MS.m.tac[0]);setTactic(MS.m.tac[0].rally,true);toast('✅ '+(t.done||'Taktika upravena'));openTacSheet(true);}
function pct(a,b){return b?Math.round(a/b*100):0;}
function coachTips(m){const me=m.p[0],o=m.p[1];const A=m.st[0],B=m.st[1];const t=m.tac[0];const tips=[];const os=o.st;const ms=effStatsBase(me);
 const ue=B.ueB+B.ueF;
 if(ue>=5){const w=B.ueB>=B.ueF?'bh':'fh';const n=w==='bh'?B.ueB:B.ueF;if(n/ue>=0.6&&t.target!==w)tips.push({i:'🎯',t:`Soupeř kazí hlavně ${w==='bh'?'bekhendy':'forhendy'} (${n} z ${ue} nevynucených chyb). Hraj mu na ${w==='bh'?'bekhend':'forhend'}!`,set:{target:w},btn:'Cílit na '+(w==='bh'?'bekhend':'forhend')});}
 else{const gap=os.fh-os.bh;if(Math.abs(gap)>=4&&t.target==='none')tips.push({i:'🔎',t:`Scouting: soupeřův ${gap>0?'bekhend':'forhend'} je slabší (${Math.round(Math.min(os.fh,os.bh))} vs ${Math.round(Math.max(os.fh,os.bh))}).`,set:{target:gap>0?'bh':'fh'},btn:'Hrát na slabší stranu'});}
 if(A.fsTot>=12&&pct(A.fsIn,A.fsTot)<55&&t.srvRisk>0)tips.push({i:'🚀',t:`Dáváš jen ${pct(A.fsIn,A.fsTot)} % prvních podání. Uber riziko.`,set:{srvRisk:t.srvRisk-1},btn:'Méně riskovat'});
 if(A.df>=4&&t.srvRisk>0)tips.push({i:'⚠️',t:`Už ${A.df} dvojchyb – zahraj první podání jistěji.`,set:{srvRisk:0},btn:'Jisté podání'});
 if(B.ssTot>=8&&pct(B.ssWon,B.ssTot)<47&&t.retPos!=='close')tips.push({i:'📍',t:`Soupeř vyhrává jen ${pct(B.ssWon,B.ssTot)} % bodů po druhém podání. Postav se na returnu blíž a útoč.`,set:{retPos:'close'},btn:'Return u čáry'});
 if(B.fsIn>=10&&(B.aces>=4||pct(B.fsWon,B.fsIn)>=78)&&t.retPos!=='deep')tips.push({i:'🛡️',t:`Soupeřův první servis je drtivý (${B.aces} es, ${pct(B.fsWon,B.fsIn)} % bodů). Ustup na returnu hlouběji.`,set:{retPos:'deep'},btn:'Return hluboko'});
 if(A.netT>=5){const p=pct(A.netW,A.netT);if(p<50&&t.net>0)tips.push({i:'🏃',t:`Na síti uhraješ jen ${p} % bodů (${A.netW}/${A.netT}). Soupeř dobře prohazuje.`,set:{net:Math.max(0,t.net-1)},btn:'Méně náletů'});else if(p>=70&&t.net<2)tips.push({i:'🏃',t:`Síť ti jde (${A.netW}/${A.netT}). Choď dopředu častěji.`,set:{net:t.net+1},btn:'Víc náletů'});}
 else if(m.surf==='G'&&t.net===0)tips.push({i:'🌱',t:'Na trávě se vyplácí chodit na síť – míče nízko skáčou a prohozy jsou těžké.',set:{net:1},btn:'Občas na síť'});
 if(A.dropT>=4){const p=pct(A.dropW,A.dropT);if(p<45&&t.drop>0)tips.push({i:'🪶',t:`Kraťasy nevycházejí (${A.dropW}/${A.dropT}).`,set:{drop:Math.max(0,t.drop-1)},btn:'Méně kraťasů'});}
 else if(m.surf==='C'&&os.kon<ms.kon-2&&t.drop===0)tips.push({i:'🪶',t:`Soupeř je pomalejší (kondice ${Math.round(os.kon)}). Na antuce ho rozběhej kraťasy.`,set:{drop:1},btn:'Občas kraťas'});
 if(A.ue>=10&&A.ue>A.winners*1.5&&(t.rally==='atk'||t.dir==='line'))tips.push({i:'🧘',t:`Moc chyb (${A.ue} nevynucených, ${A.winners} winnerů). Hraj bezpečněji křižně.`,set:{rally:'bal',dir:'cross'},btn:'Bezpečněji'});
 const lw=A.longT>=4?pct(A.longW,A.longT):null,sw=A.shortT>=10?pct(A.shortW,A.shortT):null;
 if(lw!=null&&sw!=null){if(lw>=sw+15&&t.rally!=='def')tips.push({i:'♾️',t:`Dlouhé výměny vyhráváš (${lw} %), krátké méně (${sw} %). Prodlužuj výměny.`,set:{rally:'def',pace:'norm'},btn:'Defenzivně'});else if(sw>=lw+15&&t.rally!=='atk')tips.push({i:'⚔️',t:`Krátké výměny jsou tvoje (${sw} %). Zkracuj hru.`,set:{rally:'atk'},btn:'Agresivně'});}
 if(m.en[1]<45&&m.en[0]>m.en[1]+12&&t.pace!=='fast')tips.push({i:'⚡',t:`Soupeř ztrácí síly (energie ${Math.round(m.en[1])}). Zrychli tempo.`,set:{pace:'fast'},btn:'Rychlé tempo'});
 if(m.en[0]<35&&t.pace!=='slow')tips.push({i:'🐢',t:`Tvoje energie je nízko (${Math.round(m.en[0])}). Zpomal tempo mezi výměnami – a pozor na zranění.`,set:{pace:'slow'},btn:'Pomalé tempo'});
 const ds=A.dirS;const best=Object.entries(ds).filter(([k,v])=>v[0]>=6).sort((a,b)=>b[1][1]/b[1][0]-a[1][1]/a[1][0]);if(best.length>=2){const [bk,bv]=best[0];const [wk,wv]=best[best.length-1];if(bv[1]/bv[0]-wv[1]/wv[0]>0.18)tips.push({i:'🎾',t:`Podání ${({wide:'do strany',body:'na tělo',T:'na T'})[bk]} vyhrává ${pct(bv[1],bv[0])} % bodů, ${({wide:'do strany',body:'na tělo',T:'na T'})[wk]} jen ${pct(wv[1],wv[0])} %. Pozor – stejné umístění soupeř časem přečte.`,set:{srvDir:bk},btn:'Podávat '+({wide:'do strany',body:'na tělo',T:'na T'})[bk]});}
 if(m.p[1].hand==='L')tips.push({i:'✋',t:'Soupeř je levák – jeho slajsované podání na výhodách jde do tvého bekhendu.'});
 return tips.slice(0,5);}
function liveStatsMini(m){const A=m.st[0],B=m.st[1];const r=(l,a,b)=>`<tr><td>${a}</td><td class="mut">${l}</td><td>${b}</td></tr>`;
 return `<table class="stt mini" style="margin-top:8px"><tr class="tiny mut"><td>Ty</td><td></td><td>${esc(shortName(m.p[1]))}</td></tr>${r('1. podání',pct(A.fsIn,A.fsTot)+' %',pct(B.fsIn,B.fsTot)+' %')}${r('Body po 1./2. podání',pct(A.fsWon,A.fsIn)+'/'+pct(A.ssWon,A.ssTot)+' %',pct(B.fsWon,B.fsIn)+'/'+pct(B.ssWon,B.ssTot)+' %')}${r('Nevyn. chyby FH/BH',A.ueF+'/'+A.ueB,B.ueF+'/'+B.ueB)}${r('Winnery',A.winners,B.winners)}${r('Síť',A.netW+'/'+A.netT,B.netW+'/'+B.netT)}${r('Kraťasy',A.dropW+'/'+A.dropT,B.dropW+'/'+B.dropT)}${r('Výměny 0–4 / 5–8 / 9+',pct(A.shortW,A.shortT)+'/'+pct(A.midW,A.midT)+'/'+pct(A.longW,A.longT)+' %','')}</table>`;}
// ----- animation -----
function placePlayers(dur){for(let i=0;i<2;i++){const g=$('#pl'+i);if(!g)continue;const [x,y]=MS.pos[i];const q=pj(x,y,0);const k=q[2]*0.29;g.style.transition=`transform ${dur||0}ms cubic-bezier(.3,.7,.4,1)`;g.style.transform=`translate(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px) scale(${k.toFixed(3)})`;
  const f=g.querySelector('.fig');if(f){f.classList.toggle('run',dur>120);clearTimeout(f._rt);f._rt=setTimeout(()=>f.classList.remove('run'),dur||0);}}}
function swing(i,kind,mirror){const g=$('#pl'+i);if(!g)return;const f=g.querySelector('.fig'),w=g.querySelector('.figw');if(!f)return;f.classList.remove('swF','swB','srv');f.getBoundingClientRect();const lefty=MS.m&&MS.m.p[i].hand==='L';const mx=(kind==='srv'?lefty:(!!mirror!==lefty))?-1:1;w.setAttribute('transform',`scale(${mx},1)`);f.classList.add(kind);clearTimeout(f._st);f._st=setTimeout(()=>f.classList.remove(kind),420);}
function setBall(x,y,z){const b=$('#ball'),s=$('#bsh'),tr=$('#trail');if(!b)return;const q=pj(x,y,z),g=pj(x,y,0);b.setAttribute('cx',q[0].toFixed(1));b.setAttribute('cy',q[1].toFixed(1));b.setAttribute('r',(2.6*q[2]*1.25).toFixed(2));
 s.setAttribute('cx',g[0].toFixed(1));s.setAttribute('cy',g[1].toFixed(1));const sz=Math.max(0.5,2.6-z*0.02)*g[2];s.setAttribute('rx',(sz*1.4).toFixed(2));s.setAttribute('ry',(sz*0.55).toFixed(2));s.setAttribute('opacity',Math.max(0.15,0.5-z*0.006).toFixed(2));
 const T=MS.trail;T.push([q[0],q[1]]);if(T.length>7)T.shift();tr.setAttribute('d',T.length>1?'M'+T.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L'):'');tr.setAttribute('stroke-width',(2.2*q[2]).toFixed(2));}
function clearTrail(){MS.trail=[];const tr=$('#trail');if(tr)tr.setAttribute('d','');}
function placeBallAtServer(){const m=MS.m;const s=m.server;const side=serveSide(m);const bottom=s===0;const x=(bottom?1:-1)*side*24;const y=bottom?372:-12;MS.pos[s]=[x,y];const r=1-s;MS.pos[r]=[(bottom?-1:1)*side*44,bottom?-20:384];placePlayers(250);clearTrail();setBall(x+(bottom?6:-6),y,40);}
function serveSide(m){const t=m.pt[0]+m.pt[1];return t%2===0?1:-1;}
function tween(dur,fn){return new Promise(res=>{if(dur<=0){fn(1);res();return;}const t0=performance.now();const step=now=>{if(MS.abort||MS.skip){fn(1);res();return;}const t=Math.min(1,(now-t0)/dur);fn(t);if(t<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});}
async function flyBall(x0,y0,z0,x1,y1,z1,dur,H){await tween(dur,t=>{const x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;const z=z0*(1-t)+z1*t+4*H*t*(1-t);setBall(x,y,z);});}
const rnd2=(a,b)=>a+Math.random()*(b-a);
function halfTarget(toBottom,deep){const x=rnd2(-56,56);const y=toBottom?rnd2(deep?300:215,350):rnd2(10,deep?60:145);return [x,y];}
async function animatePoint(r,m,snap){const s=r.server;const base=430/MS.speed;const bottomServes=s===0;
 const side=snap.side;const sx=(bottomServes?1:-1)*side*24, sy=bottomServes?372:-12;
 MS.pos[s]=[sx,sy];const rcv=1-s;MS.pos[rcv]=[(bottomServes?-1:1)*side*44,bottomServes?-20:384];placePlayers(base*0.5);clearTrail();
 await sleep(base*0.3);
 const dirX=d=>{const sgn=(bottomServes?-1:1)*side;return d==='wide'?sgn*rnd2(48,60):d==='T'?sgn*rnd2(3,12):sgn*rnd2(22,34);};
 const boxY=()=>bottomServes?rnd2(95,172):rnd2(188,265);
 const hitter0=s;const mir=i=>{const p=MS.pos[i];return i===0?(p[0]>0):(p[0]<0);};
 swing(s,'srv',false);await sleep(base*0.18);
 if(r.second){const fx=dirX(r.dir||'T'),fy=bottomServes?178:182;await flyBall(sx,sy,44,fx,fy,9,base*0.55,6);flash('Chyba',.5);await sleep(base*0.45);clearTrail();setBall(sx,sy,40);swing(s,'srv',false);await sleep(base*0.25);}
 if(r.type==='df'){const fx=dirX(r.dir||'T')+rnd2(-10,10),fy=bottomServes?rnd2(60,80):rnd2(280,300);await flyBall(sx,sy,44,fx,fy,0,base*0.55,6);flash('Dvojchyba',.55);return;}
 let tx=dirX(r.dir||'T'),ty=boxY();
 if(r.type==='ace'||r.type==='svw'){MS.pos[rcv]=[tx+(tx>0?-16:16)*(r.type==='ace'?1.6:1),MS.pos[rcv][1]];placePlayers(base*0.6);await flyBall(sx,sy,44,tx,ty,0,base*0.5,6);if(r.type==='svw')swing(rcv,Math.random()<.5?'swF':'swB',mir(rcv));const ex=tx+(tx-sx)*0.45,ey=bottomServes?-40:400;await flyBall(tx,ty,0,ex,ey,r.type==='ace'?14:30,base*0.4,10);return;}
 let hitter=s,fromX=sx,fromY=sy,fromZ=44;const missT=['ue','fe','reterr'].includes(r.type);const lastH=missT?1-r.winner:r.winner;let total=Math.max(1,r.len);if(((total-1)%2===0?s:1-s)!==lastH)total++;
 for(let k=1;k<=total;k++){
  const last=k===total;const toBottom=hitter===1;const other=1-hitter;
  if(k>1){[tx,ty]=halfTarget(toBottom,Math.random()<0.6);}
  if(r.special&&r.special.k==='drop'&&k===total-1&&r.special.i===hitter){ty=toBottom?rnd2(190,215):rnd2(145,170);}
  let endX=tx,endY=ty,miss=false,netShot=false;
  if(last){
   if(r.type==='ue'||r.type==='fe'||r.type==='reterr'){if(Math.random()<0.42){endY=toBottom?184:176;endX=rnd2(-60,60);netShot=true;}else{if(Math.random()<0.5){endX=(Math.random()<0.5?-1:1)*rnd2(66,90);}else{endY=toBottom?rnd2(364,384):rnd2(-24,-4);}}miss=true;}
   else{endX=(Math.random()<0.5?-1:1)*rnd2(38,60);endY=toBottom?rnd2(300,352):rnd2(8,60);}
  }
  // net approach: the attacker moves forward
  if(r.special&&r.special.k==='net'&&k===Math.max(2,total-2)){const i=r.special.i;MS.pos[i]=[clamp(MS.pos[i][0]*0.4,-40,40),i===0?232:128];placePlayers(base*0.9);}
  const hitY=toBottom?clamp(endY+rnd2(12,30),300,392):clamp(endY-rnd2(12,30),-32,60);
  if(!last||!miss){const atNet=r.special&&r.special.k==='net'&&r.special.i===other&&k>=Math.max(2,total-2);MS.pos[other]=[clamp(endX+(toBottom?10:-10),-95,95)+(last?(endX>0?-26:26):0),last?MS.pos[other][1]:(atNet?MS.pos[other][1]:hitY)];placePlayers(base*0.8);}
  const d=Math.hypot(endX-fromX,endY-fromY);const dur=base*(0.5+d/720);
  const fh=Math.random()<0.6;if(k>1)swing(hitter,fh?'swF':'swB',fh?mir(hitter):!mir(hitter));
  await flyBall(fromX,fromY,fromZ,endX,endY,netShot?10:0,dur,k===1?6:(r.special&&r.special.k==='drop'&&last?22:rnd2(14,26)));
  if(last){if(!miss){await flyBall(endX,endY,0,endX+(endX-fromX)*0.25,toBottom?410:-50,10,base*0.35,10);}else flash(netShot?'Síť':'Aut',.6);break;}
  const hx=MS.pos[other][0]+(toBottom?-6:6),hy=MS.pos[other][1]+(toBottom?-4:4);
  await flyBall(endX,endY,0,hx,hy,14,base*0.26,12);
  fromX=hx;fromY=hy;fromZ=14;hitter=other;$('#rallyN').textContent=k+1;
 }}
function flash(t,size){const fx=$('#fx');if(!fx)return;const b=$('#ball');const x=+b.getAttribute('cx'),y=+b.getAttribute('cy');fx.innerHTML=`<text x="${x}" y="${y-8}" text-anchor="middle" font-size="${10*(size||1)+5}" font-weight="900" fill="#fff" stroke="#000" stroke-width=".7" paint-order="stroke">${t}</text>`;setTimeout(()=>{if(fx)fx.innerHTML='';},700);}
function callout(t,color){const c=$('#callout');if(!c)return;c.textContent=t;c.style.color=color||'#fff';c.classList.remove('show');void c.offsetWidth;c.classList.add('show');}
function cheer(big){const c=$('#crowd');if(!c)return;c.classList.remove('cheer','cheer2');c.getBoundingClientRect();c.classList.add(big?'cheer2':'cheer');clearTimeout(c._t);c._t=setTimeout(()=>c.classList.remove('cheer','cheer2'),1300);}
function updateScore(popI){const m=MS.m;const sb=$('#sb');if(!sb)return;const cols=m.bo;const o=MS.o;
 const row=i=>{const p=m.p[i];let cells='';for(let k=0;k<cols;k++){let v='',cls='st';if(k<m.sets.length){const s=m.sets[k];v=s[i];if(s[i]>s[1-i])cls+=' w';if(s[2]!=null&&s[i]===6&&s[1-i]===7)v+=`<sup>${s[2]}</sup>`;}else if(k===m.sets.length&&!m.done){v=m.g[i];cls+=' cur';}cells+=`<div class="${cls}">${v}</div>`;}
  const seed=o.ev&&o.ev.seeds&&o.ev.seeds[p.id]?`<em>[${o.ev.seeds[p.id]}]</em>`:'';
  return `<div class="pl ${m.done&&m.winner===i?'won':''}" style="grid-template-columns:12px 1fr repeat(${cols},22px) 38px"><div class="srvdot ${m.server===i&&!m.done?'on':''}"></div><div class="nm">${flag(p.cc)} ${esc(shortName(p).toUpperCase())}${seed}<small>${p.rank?p.rank+'.':''}</small>${m.hurt[i]?' <span title="zraněný">🩹</span>':''}</div>${cells}<div class="pt ${popI===i?'pop':''}">${m.done?(m.winner===i?'✓':m.ret===i?'skr.':''):m.pointLabel(i)}</div></div>`;};
 const bp=!m.done&&m.isBreakPoint();const sp=!m.done&&isSetPoint(m);
 sb.innerHTML=`<div class="tvh"><span class="tvlogo">${o.tier?tierEmblem(o.tier,22):'🎾'}</span><span class="tvt">${esc((o.tour||o.title||'').toUpperCase())}</span>${o.round?`<span class="tvr">${esc(o.round)}</span>`:''}<span class="sp"></span>${surfChip(m.surf)}</div>`+row(1)+row(0)+(bp||sp?`<div class="tvflag ${bp?'bp':'sp'}">${bp?'BREJKBOL':sp}</div>`:'');}
function isSetPoint(m){// returns label if someone has set/match point
 for(let i=0;i<2;i++){const j=1-i;let gp=false;if(m.tb)gp=m.pt[i]>=m.tbT-1&&m.pt[i]>m.pt[j];else gp=m.pt[i]>=3&&m.pt[i]>m.pt[j];if(!gp)continue;const g=m.g[i]+1,gj=m.g[j];const setWin=m.tb||(g>=6&&g-gj>=2)||g===7;if(!setWin)continue;return m.setsW[i]+1>=m.need?'MEČBOL':'SETBOL';}
 return '';}
function updateBars(){const m=MS.m;const a=$('#enMe'),b=$('#enOp');if(!a)return;a.style.width=m.en[0]+'%';b.style.width=m.en[1]+'%';$('#enMeT').textContent=Math.round(m.en[0]);$('#enOpT').textContent=Math.round(m.en[1]);
 const h=m.history;const v=h.length?h.reduce((x,y)=>x+(y===0?1:-1),0)/16:0;const mi=$('#momI');if(mi)mi.style.left=clamp(50+v*45,3,97)+'%';if(typeof updateLiveOddsUI==='function')updateLiveOddsUI();}
function renderCards(){const m=MS.m;const me=ME();const el=$('#cards');if(!el)return;
 el.innerHTML=Object.entries(CARDS).filter(([k,c])=>me.coach>=c.lvl).map(([k,c])=>{const act=m.active[0][k];const cd=m.cd[0][k]||0;const no=m.en[0]<c.cost;const cdp=cd?Math.round(cd/c.cd*100):0;
  return `<button class="kc lv${c.lvl} ${act?'act':''} ${no&&!act&&!cd?'no':''}" onclick="playCard('${k}')"><span class="kco">⚡${c.cost}</span><span class="kring"><span class="ki">${c.icon}</span></span><span class="kn">${c.name}</span>${act?`<span class="kact">aktivní ${act}</span>`:''}${cd&&!act?`<div class="cdv" style="--p:${cdp}%"><b>${cd}</b></div>`:''}</button>`;}).join('');}
function playCard(k){const m=MS.m;if(m.done)return;const c=CARDS[k];if(m.active[0][k]){toast('Karta už je aktivní');return;}if(m.cd[0][k]>0){toast(`Cooldown: ${m.cd[0][k]} bodů`);return;}if(m.en[0]<c.cost){toast('Málo energie');return;}
 if(m.useCard(0,k)){setComm(`🃏 Použil jsi kartu <b>${c.icon} ${c.name}</b>`);callout(c.icon+' '+c.name.toUpperCase(),'#ffd34d');renderCards();updateBars();}}
function saveLive(){const m=MS.m;if(!MS.o||MS.o.kind!=='event'||m.done)return;S.live={kind:'event',title:MS.o.title,m:JSON.parse(JSON.stringify(m))};saveGame();}
async function matchLoop(){const m=MS.m;let sinceSave=0;
 while(!m.done){
  if(MS.abort)return;
  while(MS.paused&&!MS.skip&&!MS.abort)await sleep(120);
  if(m.done)break;
  if(MS.skip){m.o.autoInj=true;m.simToEnd();if(typeof onHumanLiveKey==='function')onHumanLiveKey(m,{winner:m.winner,event:{match:m.winner,set:m.winner,game:m.winner}});break;}
  const snap={side:serveSide(m)};
  const bpBefore=m.isBreakPoint();
  const r=m.playPoint();
  if(r.aiCard){const c=CARDS[r.aiCard.id];setComm(`🃏 Soupeř použil kartu <b>${c.icon} ${c.name}</b>`);callout(c.icon+' '+c.name,'#ff8a9a');await sleep(700/Math.min(MS.speed,4));}
  $('#rallyN').textContent=r.len>1?1:0;
  if(MS.speed<99&&!MS.skip)await animatePoint(r,m,snap);
  if(MS.abort)return;
  $('#rallyN').textContent=Math.max(r.len,0);
  if(typeof onHumanLiveKey==='function')onHumanLiveKey(m,r);
  pointUI(r,bpBefore);
  if(r.injury){await injuryUI(r);if(MS.abort)return;}
  if(m.done)break;
  sinceSave++;if((r.event&&r.event.game!=null)||sinceSave>=8){sinceSave=0;saveLive();}
  if(r.event&&r.event.game!=null&&(m.g[0]+m.g[1])%2===1&&MS.speed<99)showLower3();
  if(r.event&&r.event.set!=null&&!m.done&&MS.speed<99){MS.coachShown=(MS.coachShown||0)+1;setTimeout(()=>{if(MS.ended||m.done)return;if(MS.speed<=2){setComm('🧑‍🏫 Konec setu – trenér si bere slovo.');openTacSheet(true);}else setComm('🧑‍🏫 Konec setu – trenér má pro tebe rady (tlačítko 🧑‍🏫).');},300);}
  if(MS.speed<99&&!MS.skip)placeBallAtServer();
  await sleep(MS.speed>=99?45:Math.max(170,760/MS.speed));
 }
 if(!MS.abort)endMatchUI();}
async function injuryUI(r){const m=MS.m;const i=r.injury.i;const t=INJ_TYPES[r.injury.t];if(typeof ensureOwnMatchMarket==='function'){const it=ensureOwnMatchMarket(m,MS.o&&MS.o.ev);if(it)it.susp={why:'lékařský timeout',until:Date.now()+8000,med:true};if(typeof updateLiveOddsUI==='function')updateLiveOddsUI();}
 if(i===1){if(m.done&&m.ret===1){setComm(`🚑 <b>${esc(m.p[1].n)}</b> skrečoval – ${esc(t[0].toLowerCase())}.`);callout('SKREČ','#ffb648');}else{setComm(`🩹 Soupeř si bere lékařský time-out (${esc(t[0].toLowerCase())}) a hraje se zraněním.`);callout('MEDICAL TIME-OUT','#ffb648');}await sleep(1200/Math.min(MS.speed,4));const it=typeof ensureOwnMatchMarket==='function'&&ensureOwnMatchMarket(m,MS.o&&MS.o.ev);if(it&&it.susp)it.susp=null;return;}
 if(m.done)return;
 MS.paused=true;
 await new Promise(res=>{const bg=modal(`<div class="c"><div class="injpulse">${t[1]}</div><h2 style="margin:6px 0;color:#ff8a9a">Lékařský time-out</h2><div class="b">${esc(t[0])}</div><div class="small mut" style="margin-top:6px">Odhad: ${r.injury.w>0?'pauza ~'+r.injury.w+' týd':'bez dlouhodobých následků'}. Pokud budeš hrát dál, budeš hrát s omezením (−9 ke všem dovednostem) a zranění se může zhoršit (×1,6).</div></div>
  <div class="grid2" style="margin-top:12px"><button class="btn red" id="injR">🏳️ Skrečovat</button><button class="btn" id="injP">💪 Hrát dál</button></div>`,true);bg.style.zIndex=130;
  $('#injR').onclick=()=>{closeModal();m.retire(0);m.injEv[0].played=false;res();};
  $('#injP').onclick=()=>{closeModal();m.hurt[0]=1;m.injEv[0].played=true;setComm('🩹 Hraješ dál přes bolest…');const it=typeof ensureOwnMatchMarket==='function'&&ensureOwnMatchMarket(m,MS.o&&MS.o.ev);if(it)it.susp=null;res();};});
 MS.paused=false;updateScore();}
function showLower3(){const m=MS.m;const el=$('#l3');if(!el)return;const A=m.st[0],B=m.st[1];const items=[['ESA',A.aces,B.aces],['1. PODÁNÍ',pct(A.fsIn,A.fsTot)+'%',pct(B.fsIn,B.fsTot)+'%'],['WINNERY',A.winners,B.winners],['NEVYN. CHYBY',A.ue,B.ue],['BODY NA SÍTI',A.netW+'/'+A.netT,B.netW+'/'+B.netT],['BREJKBOLY',A.bpW+'/'+A.bpT,B.bpW+'/'+B.bpT]];const it=items[Math.floor(m.points/7)%items.length];
 el.innerHTML=`<span>${esc(shortName(m.p[0]))}</span><b>${it[1]}</b><em>${it[0]}</em><b>${it[2]}</b><span>${esc(shortName(m.p[1]))}</span>`;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function pointUI(r,bp){const m=MS.m;const ev=r.event||{};const meWon=r.winner===0;showSpeed(r);if((r.type==='ue'||r.type==='fe')&&!ev.match&&Math.random()<0.1)setTimeout(hawkEye,250);
 let t=commentary(m,r);if(bp)t=(r.winner!==r.server?'💥 Brejk! ':'🛡️ Brejkbol odvrácen. ')+t;
 const nb=!m.done&&m.isBreakPoint()?` <span class="warn b">· Brejkbol pro ${esc(shortName(m.p[1-m.server]))}!</span>`:'';
 setComm(`<span class="${meWon?'good':'bad'}">●</span> ${esc(t)}${nb}`);
 updateScore(r.winner);updateBars();renderCards();
 if(ev.match!=null){callout(ev.ret!=null?'SKREČ':ev.match===0?'VÍTĚZSTVÍ!':'PROHRA',ev.match===0?'#3ee68a':'#ff5d73');cheer(true);}
 else if(ev.set!=null){callout(`SET ${esc(shortName(m.p[ev.set]).split(' ').pop().toUpperCase())}`,'#ffd34d');cheer(true);}
 else if(ev.brk!=null){callout('BREJK!',ev.brk===0?'#3ee68a':'#ff5d73');cheer(ev.brk===0||m.crowd[1]>m.crowd[0]);}
 else if(ev.tbStart)callout('TIEBREAK','#36d1ff');
 else if(r.type==='ace')callout('ESO!',r.server===0?'#e8ff3a':'#ff8a9a');
 else if(r.type==='df')callout('DVOJCHYBA','#ff8a9a');
 else if(r.len>=20){callout(`${r.len} ÚDERŮ!`,'#36d1ff');cheer(true);}
 else if(r.special&&r.special.k==='drop'&&r.special.i===r.winner&&MS.speed<99)callout('KRAŤAS!','#c9a2ff');
 else if(r.type==='win'&&meWon&&MS.speed<99){callout(r.shot==='prohoz'?'PROHOZ!':r.shot==='volej'||r.shot==='smeč'?r.shot.toUpperCase()+'!':'WINNER!','#3ee68a');if(r.len>=8)cheer(false);}}
function statsTable(m){const a=m.st[0],b=m.st[1];const pc=(x,y)=>y?Math.round(x/y*100)+'%':'—';
 const rows=[['Esa',a.aces,b.aces],['Dvojchyby',a.df,b.df],['1. podání',pc(a.fsIn,a.fsTot),pc(b.fsIn,b.fsTot)],['Body po 1. podání',pc(a.fsWon,a.fsIn),pc(b.fsWon,b.fsIn)],['Body po 2. podání',pc(a.ssWon,a.ssTot),pc(b.ssWon,b.ssTot)],['Udržená podání',`${a.srvHeld}/${a.srvGames}`,`${b.srvHeld}/${b.srvGames}`],['Body na returnu',pc(a.retWon,a.retPts),pc(b.retWon,b.retPts)],['Vítězné údery',a.winners,b.winners],['Nevynucené chyby',a.ue,b.ue],['  – forhend / bekhend',`${a.ueF}/${a.ueB}`,`${b.ueF}/${b.ueB}`],['Body na síti',`${a.netW}/${a.netT}`,`${b.netW}/${b.netT}`],['Kraťasy',`${a.dropW}/${a.dropT}`,`${b.dropW}/${b.dropT}`],['Brejkboly',`${a.bpW}/${a.bpT}`,`${b.bpW}/${b.bpT}`],['Nejrychlejší podání',a.maxSpd+' km/h',b.maxSpd+' km/h'],['Nejdelší výměna',a.longest,''],['Body celkem',a.pts,b.pts]];
 return `<table class="stt"><tr class="tiny mut"><td>${esc(shortName(m.p[0]))}</td><td></td><td>${esc(shortName(m.p[1]))}</td></tr>${rows.map(r=>`<tr><td>${r[1]}</td><td>${r[0]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;}
function statsPopup(){const m=MS.m;const was=MS.paused;MS.paused=true;const bg=modal(`<h2>📊 Statistiky zápasu</h2>${statsTable(m)}<button class="btn big" style="margin-top:12px" id="stc">Zpět do zápasu</button>`);bg.style.zIndex=120;$('#stc').onclick=()=>{closeModal();MS.paused=was;};}
function tacReview(m){const a=m.st[0],tips=[],pct=(x,y)=>y?Math.round(x/y*100):0;
 const ds=a.dirS||{};const entries=Object.entries(ds).filter(([,v])=>v[0]>=5).sort((x,y)=>y[1][1]/Math.max(1,y[1][0])-x[1][1]/Math.max(1,x[1][0]));
 const dirN={wide:'do strany',body:'na tělo',T:'na T'};
 if(entries.length>=2){const [bk,bv]=entries[0];tips.push(`Podání ${dirN[bk]} ti vycházelo nejlépe (${pct(bv[1],bv[0])} %).`);}
 if(a.netT>=4){const p=pct(a.netW,a.netT);tips.push(p>=60?`Síť ti seděla (${a.netW}/${a.netT}).`:p<45?`Na síti jsi ztrácel (${a.netW}/${a.netT}) – méně náletů, nebo lépe vybírej míče.`:`Síť: ${a.netW}/${a.netT}.`);}
 if(a.dropT>=3)tips.push(`Kraťasy: ${a.dropW}/${a.dropT} úspěšných.`);
 if(a.srvGames>=4)tips.push(`Udržel jsi ${pct(a.srvHeld,a.srvGames)} % servisových her.`);
 if(a.ue>=(a.winners||0)+6)tips.push('Hodně nevynucených chyb – zkus klidnější výměny.');
 else if((a.winners||0)>=a.ue+4)tips.push('Výborný poměr vítězných úderů a chyb.');
 if(m.tac&&m.tac[0]&&m.tac[0].target!=='none'&&(a.ueB+a.ueF)>=3){const tg=m.tac[0].target;tips.push(tg==='bh'?'Cílení na bekhend soupeře bylo součástí plánu.':'Cílení na forhend soupeře bylo součástí plánu.');}
 if(!tips.length)return '';
 return `<div class="small" style="text-align:left;background:rgba(10,22,55,.45);border:1px solid rgba(120,170,255,.18);border-radius:12px;padding:10px 12px;margin:8px 0"><b>📋 Zpětná vazba k taktice</b><div class="mut" style="margin-top:4px">${tips.join(' ')}</div></div>`;}
function endMatchUI(){if(MS.ended)return;MS.ended=true;const m=MS.m;updateScore();updateBars();closeSheet();const won=m.winner===0;
 let extra='';try{extra=MS.o.onEnd?MS.o.onEnd(m)||'':'';}catch(e){console.error(e);}
 const retTxt=m.ret!=null?`<div class="small warn">${m.ret===0?'Skrečoval jsi':'Soupeř skrečoval'}</div>`:'';
 const bg=modal(`<div class="c"><div style="font-size:44px">${won?'🏆':'😤'}</div><h2 style="margin:4px 0;color:${won?'#3ee68a':'#ff5d73'}">${won?'VÍTĚZSTVÍ':'PROHRA'}</h2><div class="b" style="font-size:20px;letter-spacing:.04em">${m.scoreText(0)}${m.ret!=null?' skr.':''}</div>${retTxt}<div class="small mut">vs ${flag(m.p[1].cc)} ${esc(m.p[1].n)}</div></div><div style="margin:10px 0">${extra}</div>${tacReview(m)}${statsTable(m)}<button class="btn big gold" style="margin-top:14px" id="endc">Pokračovat</button>`,true);
 bg.style.zIndex=120;$('#endc').onclick=()=>{closeModal();closeMatch();};}
function closeMatch(){MS.abort=true;const w=$('#mv');if(w)w.remove();const after=MS.o&&MS.o.after;if(after)after();else render();}
function crowdLine(m){if(!m.crowd)return '';const c=m.crowd;if(c[0]===c[1])return '';const mine=c[0]>c[1];return `<div class="tiny ${mine?'good':'warn'}" style="padding:2px 12px 0">📣 Publikum fandí ${mine?'tobě':esc(shortName(m.p[1]))}${m.p[mine?0:1].cc===m.o.cc?' (domácí kurt)':''}</div>`;}
function crowdBox(me,o,ev){const a=(me.cc===ev.cc?0.012:0)+popOf(me)*0.00011,b=(o.cc===ev.cc?0.012:0)+popOf(o)*0.00011;const mine=a>=b;
 return `<div class="row small" style="margin-top:8px;gap:8px"><span>📣</span><span style="flex:1">Publikum: ${Math.abs(a-b)<0.002?'vyrovnané':mine?'<b class="good">fandí tobě</b>':`<b class="warn">fandí soupeři</b>`}${me.cc===ev.cc?' · 🏠 domácí turnaj':''}</span><span class="tiny mut">❤️ ${Math.round(popOf(me))} vs ${Math.round(popOf(o))}</span></div>`;}
// ---------- title celebration ----------
function celebrate(ev){if(!ev)return;const tier=TIERS[ev.tier];const big=['GS','M1000','FIN'].includes(ev.tier);
 const d=document.createElement('div');d.className='celebr';d.innerHTML=`<canvas id="fw"></canvas><div class="cbox"><div class="rays"></div><div class="tw">${trophySVG(tier.color,big?150:120)}</div><div class="ct">ŠAMPION!</div><div class="cn">${esc(ev.name)}</div><div class="small mut">${esc(ME().n)} · ${S.season}</div><button class="btn gold" style="margin-top:14px" onclick="this.closest('.celebr').remove()">Paráda! ▶</button></div>`;
 document.body.appendChild(d);confetti();fireworks($('#fw'),big?4200:2600);}
function fireworks(cv,dur){if(!cv)return;const W=cv.width=innerWidth,H=cv.height=innerHeight;const ctx=cv.getContext('2d');const parts=[];const cols=['#ffd34d','#36d1ff','#3ee68a','#ff5d73','#c9a2ff','#ffffff'];let t0=performance.now(),last=0;
 const burst=()=>{const x=W*(0.2+Math.random()*0.6),y=H*(0.15+Math.random()*0.35);const c=cols[Math.floor(Math.random()*cols.length)];for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*3.6;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,c});}};
 const step=now=>{if(!cv.isConnected)return;const el=now-t0;if(el<dur&&now-last>380){burst();last=now;}ctx.fillStyle='rgba(3,8,23,.22)';ctx.fillRect(0,0,W,H);
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=0.045;p.vx*=0.985;p.l-=0.012;if(p.l>0){ctx.globalAlpha=p.l;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,7);ctx.fill();}}ctx.globalAlpha=1;
  for(let i=parts.length-1;i>=0;i--)if(parts[i].l<=0)parts.splice(i,1);
  if(el<dur+2500)requestAnimationFrame(step);else ctx.clearRect(0,0,W,H);};requestAnimationFrame(step);}

// ===================== GFX v4 – premium visuals (overrides earlier render helpers) =====================
let _gid=0;const gid=p=>p+(++_gid);
// ---------- icons ----------
const ICO={
 home:'<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
 tour:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/>',
 train:'<path d="M2.5 12h19M5 8v8M8 6.5v11M16 6.5v11M19 8v8"/>',
 rank:'<path d="M4 20V13M9.3 20V8M14.6 20v-9M20 20V4"/>',
 career:'<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8 21h8l-1-3.5H9z"/>',
 coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.8c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.9.9-2.9 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.3-3.1 2.3-1.3 0-2.4-.5-3-1.4M12 6v12"/>',
 bolt:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
 medal:'<path d="M8 3h8l-2 6h-4zM12 9.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/><path d="m12 12.3.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z"/>'};
function ico(k,cls){return `<svg class="ico ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg>`;}
// ---------- tournament emblems ----------
function tierEmblem(t,size){size=size||40;const T=TIERS[t]||{color:'#888',short:t};const c=T.color;const id=gid('te');
 const lab=t==='GS'?'GS':t==='FIN'?'★':t==='M1000'?'1000':t==='A500'?'500':t==='A250'?'250':t[0]==='C'?t.slice(1):t;
 const sub=t==='GS'?'SLAM':t==='FIN'?'FINALS':t==='M1000'?'MASTERS':t[0]==='A'?'ATP':t[0]==='C'?'CHALL.':'ITF';
 let shape;
 if(t==='GS')shape=`<circle cx="24" cy="24" r="21" fill="url(#${id})" stroke="#ffe9a8" stroke-width="2"/><path d="M10 30c2 6 7 10 14 10s12-4 14-10" fill="none" stroke="#fff6cf" stroke-width="1.6" stroke-dasharray="2.5 2"/>`;
 else if(t==='FIN')shape=`<path d="M24 2l5.6 11.6 12.6 1.8-9.1 8.9 2.2 12.6L24 31l-11.3 5.9 2.2-12.6-9.1-8.9 12.6-1.8z" fill="url(#${id})" stroke="#fff1b8" stroke-width="1.6" stroke-linejoin="round"/>`;
 else if(t[0]==='M'&&t!=='M1000')shape=`<rect x="5" y="5" width="38" height="38" rx="11" fill="url(#${id})" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>`;
 else if(t[0]==='C')shape=`<path d="M24 3l18 10.5v21L24 45 6 34.5v-21z" fill="url(#${id})" stroke="rgba(255,255,255,.6)" stroke-width="1.5"/>`;
 else shape=`<path d="M24 3l17 6v13c0 11-7.5 18.5-17 23C14.5 40.5 7 33 7 22V9z" fill="url(#${id})" stroke="rgba(255,255,255,.65)" stroke-width="1.6"/>`;
 const fs=lab.length>=4?11.5:lab.length===3?13.5:15;
 return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 48 48"><defs><linearGradient id="${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".18" stop-color="${c}"/><stop offset=".75" stop-color="${shade(c,-38)}"/><stop offset="1" stop-color="${shade(c,-60)}"/></linearGradient></defs>${shape}
 <text x="24" y="${t==='FIN'?27:25.5}" text-anchor="middle" font-family="TMSport,system-ui" font-weight="800" font-style="italic" font-size="${t==='FIN'?14:fs}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width=".6" paint-order="stroke">${lab}</text>
 <text x="24" y="${t==='FIN'?44:34}" text-anchor="middle" font-family="TMSport,system-ui" font-weight="800" font-size="${t==='FIN'?6.5:5.8}" letter-spacing=".6" fill="rgba(255,255,255,.92)">${sub}</text></svg>`;}
function shade(hex,p){let c=hex.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');const n=parseInt(c,16);let r=n>>16,g=(n>>8)&255,b=n&255;const f=p/100;const m=v=>Math.round(f<0?v*(1+f):v+(255-v)*f);return '#'+[m(r),m(g),m(b)].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');}
// ---------- portrait ----------
function hairStyle(p){if(p.look&&p.look.hs!=null)return p.look.hs;return hashStr((p.id||'')+(p.n||''))%5;}
function avatarSVG(p,size){const l=lookFor(p);const band=l.band||p.isMe;const id=gid('av');const hs=hairStyle(p);const sk=l.skin,hr=l.hair,sh=l.shirt;
 const hair=[`<path d="M19.5 27C18 13 26 8.6 32.4 8.6 40.5 8.6 46.6 13.6 44.5 27c-1.2-6.4-4.6-10-12.3-10.2C25 16.8 21 20 19.5 27z" fill="${hr}"/>`,
  `<path d="M20 25c-.4-9.5 5.4-14.4 12-14.4S44.4 15.5 44 25c-2.5-5-6.4-7-12-7s-9.5 2-12 7z" fill="${hr}"/>`,
  `<path d="M18.6 28c-2.4-13 6-19.6 13.6-19.6 8.6 0 15.2 6.6 12.8 19.6-.8-3.4-2-6-3.4-7.8.4 2-.4 3.4-1.6 3.6-1-3.6-4.4-6.2-8-6.2s-6.6 2.2-8 5.6c-1.4-.4-2-1.6-1.6-3.4-2 2-3 4.4-3.8 8.2z" fill="${hr}"/>`,
  `<path d="M18.8 30C16.5 14 25 8.5 32.4 8.5S48 14 45.2 30c-.6-2.6-1-5.2-2.6-8.4-2-4.2-6-6-10.2-6s-8.2 1.8-10.4 6c-1.6 3.2-2.4 5.8-3.2 8.4zM19 30c-.5 4 0 8 1.6 11l2-1c-1.4-3.4-1.8-6.6-1.4-10zM45 30c.5 4 0 8-1.6 11l-2-1c1.4-3.4 1.8-6.6 1.4-10z" fill="${hr}"/>`,
  `<path d="M17 24.5c0-9 6.6-14.5 15-14.5s15 5.5 15 14.5zM45 23.5c4 .4 7.6 1.6 9 3.6-3.4.6-6.8.4-9.6-.6z" fill="${sh}"/><path d="M17 24.5h30" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><circle cx="32" cy="17" r="2.2" fill="rgba(255,255,255,.75)"/>`][hs];
 return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64"><defs>
 <radialGradient id="${id}b" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="${shade(sh,35)}"/><stop offset=".6" stop-color="${shade(sh,-35)}"/><stop offset="1" stop-color="${shade(sh,-70)}"/></radialGradient>
 <radialGradient id="${id}s" cx="42%" cy="36%" r="70%"><stop offset="0" stop-color="${shade(sk,18)}"/><stop offset=".7" stop-color="${sk}"/><stop offset="1" stop-color="${shade(sk,-28)}"/></radialGradient>
 <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="${shade(sh,22)}"/><stop offset=".55" stop-color="${sh}"/><stop offset="1" stop-color="${shade(sh,-40)}"/></linearGradient></defs>
 <rect width="64" height="64" fill="url(#${id}b)"/><circle cx="32" cy="14" r="26" fill="rgba(255,255,255,.08)"/>
 <path d="M6 66C8 50 19 44.5 32 44.5S56 50 58 66z" fill="url(#${id}t)"/><path d="M24.5 45 32 53l7.5-8" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 54c3-3 6-4.5 9-5.4M50 54c-3-3-6-4.5-9-5.4" stroke="rgba(255,255,255,.18)" stroke-width="1.4" fill="none"/>
 <path d="M27 36h10v9.5c-1.6 2-8.4 2-10 0z" fill="${shade(sk,-18)}"/>
 <ellipse cx="20.2" cy="29" rx="2.4" ry="3.4" fill="${shade(sk,-10)}"/><ellipse cx="43.8" cy="29" rx="2.4" ry="3.4" fill="${shade(sk,-10)}"/>
 <ellipse cx="32" cy="27.6" rx="12.2" ry="13.8" fill="url(#${id}s)"/>
 ${hair}${band&&hs!==4?`<path d="M19.8 21.5c7.6-2.6 16.8-2.6 24.4 0v3.6c-7.6-2.4-16.8-2.4-24.4 0z" fill="#fff"/><path d="M19.8 23.3c7.6-2.4 16.8-2.4 24.4 0" stroke="${sh}" stroke-width="1.1" fill="none"/>`:''}
 <path d="M25 26.2q2.6-1.4 5 0M34 26.2q2.6-1.4 5 0" stroke="${shade(hr,-20)}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
 <ellipse cx="27.6" cy="29.6" rx="1.9" ry="1.5" fill="#fff"/><ellipse cx="36.4" cy="29.6" rx="1.9" ry="1.5" fill="#fff"/><circle cx="27.9" cy="29.7" r="1.15" fill="#1b1b22"/><circle cx="36.7" cy="29.7" r="1.15" fill="#1b1b22"/>
 <path d="M32 30.5l-1.6 4.6h2.6" fill="none" stroke="${shade(sk,-30)}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
 <path d="M28.4 37.2q3.6 2.3 7.2 0" stroke="#8a3f2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
 <ellipse cx="25" cy="34" rx="2.4" ry="1.3" fill="#ff7a7a" opacity=".16"/><ellipse cx="39" cy="34" rx="2.4" ry="1.3" fill="#ff7a7a" opacity=".16"/></svg>`;}
// ---------- top bar & nav ----------
function renderTop(){const me=ME();const en=Math.round(me.energy);
 return `<div class="top"><div class="wk"><span class="wkn">T${S.week}</span><div>${S.season}<small>${weekLabel(S.season,S.week)}</small></div></div><div class="sp"></div>
 <span class="pill gold">${ico('coin')}${fmtMoney(me.money)}</span><span class="pill en ${en<30?'low':''}" title="Energie">${ico('bolt')}<span>${en}</span></span><span class="pill cy" onclick="go('rank')">${ico('medal')}${rankTxt(me)}</span></div>`;}
function renderNav(){const t=[['home','home','Domů'],['tour','tour','Turnaje'],['train','train','Trénink'],['rank','rank','Žebříček'],['career','career','Kariéra']];const cur=UI.tab==='event'?'home':UI.tab;
 return `<nav class="nav"><div class="navin">${t.map(x=>`<button class="${cur===x[0]?'on':''}" onclick="go('${x[0]}')"><span class="i">${ico(x[1])}</span><span class="nl">${x[2]}</span></button>`).join('')}</div></nav>`;}
// ---------- arena rendering (canvas → cached images) ----------
const ARENA={};const AX=120,AY=130,AW=600,AH=570;
function arenaMode(surf){return surf==='I'?'arena':surf==='H'?'night':'day';}
function arenaImgs(surf){const k=surf;if(ARENA[k])return ARENA[k];const S2=Math.min(2.4,Math.max(1.6,(window.devicePixelRatio||2)*0.8));
 const mk=()=>{const c=document.createElement('canvas');c.width=AW*S2;c.height=AH*S2;const x=c.getContext('2d');x.scale(S2,S2);x.translate(AX,AY);return [c,x];};
 const R=seededR(surf.charCodeAt(0)*977+13);const mode=arenaMode(surf);const col=COURT_COL[surf];
 const P2=(x,y,z)=>{const q=pj(x,y,z||0);return [q[0],q[1],q[2]];};
 const poly=(x,pts,fill)=>{x.beginPath();pts.forEach((p,i)=>{const q=P2(p[0],p[1],p[2]);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]);});x.closePath();if(fill){x.fillStyle=fill;x.fill();}};
 // ---- stands ----
 const [cs,s]=mk();
 const bg=s.createLinearGradient(0,-AY,0,440);
 if(mode==='day'){bg.addColorStop(0,'#7fb6ea');bg.addColorStop(.06,'#a9cff0');bg.addColorStop(.12,'#56606e');bg.addColorStop(1,'#2a2f38');}
 else if(mode==='night'){bg.addColorStop(0,'#03050e');bg.addColorStop(.1,'#0a1430');bg.addColorStop(1,'#060a18');}
 else{bg.addColorStop(0,'#020208');bg.addColorStop(.12,'#0c0b22');bg.addColorStop(1,'#05040f');}
 s.fillStyle=bg;s.fillRect(-AX,-AY,AW,AH);
 const shirts=mode==='day'?['#ffffff','#f4f4f4','#e9e2d0','#ffd34d','#7cc3ff','#ff8a8a','#2f7bff','#22c55e','#f59e0b','#1f2937','#d8b4fe','#fca5a5','#bae6fd']:['#e5e7eb','#93c5fd','#f87171','#fbbf24','#34d399','#a78bfa','#1f2937','#374151','#f9a8d4','#60a5fa','#fde68a'];
 const skins=['#f5d0b0','#e8b896','#d29b72','#a8714a','#7a4b2e'];
 const person=(x,y,sc,haze)=>{if(R()<0.06)return;const c=shirts[Math.floor(R()*shirts.length)];
  s.fillStyle=c;s.beginPath();s.ellipse(x,y+2.9*sc,2.7*sc,2.6*sc,0,Math.PI,0);s.rect(x-2.7*sc,y+2.9*sc,5.4*sc,2.4*sc);s.fill();
  s.fillStyle=skins[Math.floor(R()*skins.length)];s.beginPath();s.arc(x,y,1.75*sc,0,7);s.fill();
  const hr=R();if(mode==='day'&&hr<0.22){s.fillStyle=R()<.5?'#fff':'#f5e6b8';s.beginPath();s.ellipse(x,y-0.9*sc,2.6*sc,0.9*sc,0,0,7);s.fill();s.beginPath();s.arc(x,y-1*sc,1.6*sc,Math.PI,0);s.fill();}
  else{s.fillStyle=['#1b1410','#3a2a1a','#6b4423','#d9b26a','#9ca3af'][Math.floor(hr*5)];s.beginPath();s.arc(x,y-0.45*sc,1.8*sc,Math.PI*1.05,Math.PI*1.95);s.fill();}
  if(R()<0.03){s.fillStyle=c;s.fillRect(x+1.6*sc,y-3.5*sc,1*sc,4*sc);}
  if(haze){s.fillStyle=haze;s.fillRect(x-3*sc,y-2.2*sc,6*sc,7.6*sc);}};
 // far stand rows (behind far baseline wall), from back to front
 const farRows=14;for(let r=farRows-1;r>=0;r--){const yw=-52-r*11,zw=18+r*13;const a=P2(-260,yw,zw),b=P2(260,yw,zw),a2=P2(-260,yw-11,zw+13);if(a[1]<-AY-12)continue;
  // tier riser
  s.fillStyle=mode==='day'?(r%2?'#3d4654':'#465061'):(r%2?'#141a30':'#19203a');s.fillRect(-AX,a2[1],AW,a[1]-a2[1]+1.2);
  const sc=a[2]*1.05;const n=Math.floor(AW/(6.2*sc));for(let i=0;i<n;i++){const xx=-AX+(i+0.5+(R()-.5)*.3)*(AW/n);person(xx,a[1]-5.6*sc,sc,null);}
  s.fillStyle='rgba(0,0,0,.25)';s.fillRect(-AX,a[1]-0.6,AW,1.2);}
 // side stands
 for(const sd of [-1,1]){for(let r=16;r>=0;r--){const xw=sd*(146+r*12),zw=18+r*12;
   // riser band
   s.beginPath();const pA=P2(xw,-60,zw),pB=P2(xw,420,zw),pC=P2(xw+sd*12,420,zw+12),pD=P2(xw+sd*12,-60,zw+12);s.moveTo(pA[0],pA[1]);s.lineTo(pB[0],pB[1]);s.lineTo(pC[0],pC[1]);s.lineTo(pD[0],pD[1]);s.closePath();s.fillStyle=mode==='day'?(r%2?'#3b4351':'#444d5c'):(r%2?'#121830':'#171e38');s.fill();
   for(let k=0;k<44;k++){const yw=-56+k*10.5+R()*2;const q=P2(xw+sd*5,yw,zw+3);if(q[0]<-AX-6||q[0]>AW-AX+6||q[1]>450||q[1]<-AY-6)continue;const sc=q[2]*1.05;person(q[0],q[1]-4.4*sc,sc,null);}}}
 // aisles / stairs
 s.strokeStyle=mode==='day'?'rgba(230,230,230,.35)':'rgba(140,160,220,.18)';s.lineWidth=1.6;
 for(const sd of [-1,1])for(const yw of [40,180,320]){const a=P2(sd*146,yw,18),b=P2(sd*240,yw,114);s.beginPath();s.moveTo(a[0],a[1]);s.lineTo(b[0],b[1]);s.stroke();}
 // atmosphere: day = sun shading on one stand, night/arena = floodlights & haze
 if(mode==='day'){const g=s.createLinearGradient(-AX,0,AW-AX,0);g.addColorStop(0,'rgba(10,20,40,.38)');g.addColorStop(.45,'rgba(10,20,40,.1)');g.addColorStop(1,'rgba(255,240,200,.06)');s.fillStyle=g;s.fillRect(-AX,-AY,AW,AH);}
 else{for(const fx of [-60,40,140,220,320,420]){const g=s.createRadialGradient(fx,-AY+14,0,fx,-AY+14,70);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.06,'rgba(200,220,255,.5)');g.addColorStop(.4,'rgba(120,160,255,.08)');g.addColorStop(1,'rgba(0,0,0,0)');s.fillStyle=g;s.fillRect(fx-70,-AY,140,90);}
  const hz=s.createLinearGradient(0,-AY,0,120);hz.addColorStop(0,'rgba(120,150,255,.12)');hz.addColorStop(1,'rgba(0,0,0,0)');s.fillStyle=hz;s.fillRect(-AX,-AY,AW,AY+120);}
 // ---- court & walls ----
 const [cc2,c]=mk();
 // floor surround
 poly(c,[[-150,-46],[150,-46],[150,410],[-150,410]],col.out);
 // texture over whole floor
 const tex=(n,cols,rmin,rmax,area)=>{for(let i=0;i<n;i++){const xw=area[0]+R()*(area[2]-area[0]),yw=area[1]+R()*(area[3]-area[1]);const q=P2(xw,yw,0);c.fillStyle=cols[Math.floor(R()*cols.length)];const rr=(rmin+R()*(rmax-rmin))*q[2];c.fillRect(q[0],q[1],rr*1.6,rr*0.8);}};
 if(surf==='C'){poly(c,[[-150,-46],[150,-46],[150,410],[-150,410]],'#c45f30');
  tex(26000,['rgba(255,190,140,.18)','rgba(120,40,10,.16)','rgba(255,220,180,.12)','rgba(90,30,8,.14)'],0.35,0.9,[-150,-46,150,410]);
  // sweep arcs (brushed clay)
  c.strokeStyle='rgba(255,210,170,.07)';c.lineWidth=1;for(let i=0;i<30;i++){const yw=-40+i*15;c.beginPath();for(let xw=-150;xw<=150;xw+=10){const q=P2(xw,yw+Math.sin(xw/24+i)*3,0);xw===-150?c.moveTo(q[0],q[1]):c.lineTo(q[0],q[1]);}c.stroke();}
  // worn baseline zones + slide marks
  for(const yb of [-6,366]){for(let i=0;i<60;i++){const xw=(R()-.5)*90,yw=yb+(R()-.5)*22;const q=P2(xw,yw,0);c.fillStyle=R()<.5?'rgba(255,200,160,.10)':'rgba(110,40,10,.12)';c.beginPath();c.ellipse(q[0],q[1],(4+R()*8)*q[2],(1+R()*1.5)*q[2],0,0,7);c.fill();}}
 } else if(surf==='G'){
  poly(c,[[-150,-46],[150,-46],[150,410],[-150,410]],'#3d8a3a');
  for(let i=0;i<14;i++){const y0=-46+i*32.6;poly(c,[[-150,y0],[150,y0],[150,y0+16.3],[-150,y0+16.3]],'rgba(255,255,255,.075)');}
  tex(14000,['rgba(20,60,10,.18)','rgba(180,230,120,.1)','rgba(10,40,5,.15)'],0.3,0.8,[-150,-46,150,410]);
  // wear: baseline boxes and serve T worn to dirt
  const wear=(cx,cy,rx,ry,a)=>{for(let i=0;i<220;i++){const ang=R()*6.28,rr=Math.sqrt(R());const q=P2(cx+Math.cos(ang)*rx*rr,cy+Math.sin(ang)*ry*rr,0);c.fillStyle=`rgba(${150+R()*40|0},${130+R()*30|0},${70+R()*20|0},${a*(1-rr*0.7)})`;c.beginPath();c.ellipse(q[0],q[1],2.6*q[2],1*q[2],0,0,7);c.fill();}};
  wear(0,-4,46,12,.35);wear(0,364,48,13,.38);wear(0,90,18,6,.12);wear(0,270,18,6,.12);
 } else {
  // hard / indoor: acrylic with subtle grain
  tex(9000,['rgba(255,255,255,.05)','rgba(0,0,0,.07)'],0.3,0.7,[-150,-46,150,410]);
 }
 // inner court
 if(surf==='H'||surf==='I'){poly(c,[[-83.1,0],[83.1,0],[83.1,360],[-83.1,360]],col.in);tex(7000,['rgba(255,255,255,.05)','rgba(0,0,30,.08)'],0.3,0.7,[-83,0,83,360]);
  // ring around court (USO style accent)
  c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=1;}
 // lines as projected quads with real widths (5 cm side lines, 10 cm baselines)
 const lineQ=(x0,y0,x1,y1,w)=>{const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy);const nx=-dy/L*w/2,ny=dx/L*w/2;poly(c,[[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]],surf==='C'?'rgba(255,250,240,.88)':'#f7fbff');};
 const LW=0.9,BW=1.6;
 lineQ(-83.1,0,83.1,0,BW);lineQ(-83.1,360,83.1,360,BW);lineQ(-83.1,0,-83.1,360,LW);lineQ(83.1,0,83.1,360,LW);lineQ(-62.3,0,-62.3,360,LW);lineQ(62.3,0,62.3,360,LW);
 lineQ(-62.3,83.1,62.3,83.1,LW);lineQ(-62.3,276.9,62.3,276.9,LW);lineQ(0,83.1,0,276.9,LW);lineQ(0,0,0,5,LW);lineQ(0,355,0,360,LW);
 // court gloss / lighting
 const gl=c.createRadialGradient(180,260,10,180,260,300);
 if(mode==='day'){gl.addColorStop(0,'rgba(255,245,220,.10)');gl.addColorStop(1,'rgba(0,0,0,.22)');}
 else{gl.addColorStop(0,'rgba(220,235,255,.16)');gl.addColorStop(.6,'rgba(0,0,0,.05)');gl.addColorStop(1,'rgba(0,0,0,.42)');}
 c.save();poly(c,[[-150,-46],[150,-46],[150,410],[-150,410]]);c.clip();c.fillStyle=gl;c.fillRect(-AX,-AY,AW,AH);
 if(mode==='day'){// shadow cast by the left stand
  poly(c,[[-150,-46],[-112,-46],[-150,140]],'rgba(10,20,40,.22)');}
 if(mode==='arena'){for(const sp of [[-50,90],[50,90],[-50,270],[50,270]]){const q=P2(sp[0],sp[1]);const g=c.createRadialGradient(q[0],q[1],0,q[0],q[1],80*q[2]);g.addColorStop(0,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,360,440);}}
 c.restore();
 // walls with LED boards
 const wallH=15;const led=(x0,y0,x1,y1,txt,seed)=>{const a=P2(x0,y0,0),b=P2(x1,y1,0),a2=P2(x0,y0,wallH),b2=P2(x1,y1,wallH);
  c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(b2[0],b2[1]);c.lineTo(a2[0],a2[1]);c.closePath();
  const g=c.createLinearGradient(0,a2[1],0,a[1]);g.addColorStop(0,'#0f2a78');g.addColorStop(.5,'#1b4fd0');g.addColorStop(1,'#0a1d55');c.fillStyle=g;c.fill();
  c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=.6;c.stroke();};
 // far wall
 led(-150,-46,150,-46);
 const ft=P2(0,-46,wallH*0.42);c.fillStyle='rgba(255,255,255,.92)';c.font=`italic 800 ${(9.5*ft[2]).toFixed(1)}px TMSport,system-ui`;c.textAlign='center';c.textBaseline='middle';
 c.fillText('TENIS MANAŽER  ·  AQUAVOLT  ·  SMASHPRO  ·  CHRONEX',ft[0],ft[1]);
 // side walls
 for(const sd of [-1,1]){const a=P2(sd*150,-46,0),b=P2(sd*150,420,0),a2=P2(sd*150,-46,wallH),b2=P2(sd*150,420,wallH);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(b2[0],b2[1]);c.lineTo(a2[0],a2[1]);c.closePath();const g=c.createLinearGradient(a[0],0,b[0],0);g.addColorStop(0,'#123082');g.addColorStop(1,'#0a1d55');c.fillStyle=g;c.fill();c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=.6;c.stroke();
  // logos along side
}
 // near wall (bottom, in front)
 led(-150,406,150,406);const nt=P2(0,406,wallH*0.42);c.font=`italic 800 ${(9*nt[2]).toFixed(1)}px TMSport,system-ui`;c.fillStyle='rgba(255,255,255,.92)';c.fillText('NORTHLINE SPORT  ·  VELOCE  ·  CHRONEX',nt[0],nt[1]);
 // line judges (far corners) and chairs
 const judge=(xw,yw,front)=>{const q=P2(xw,yw,0),sc=q[2]*0.24;c.save();c.translate(q[0],q[1]);c.scale(sc,sc);c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(0,0,16,5,0,0,7);c.fill();c.fillStyle='#1d2a4a';c.fillRect(-9,-30,18,30);c.fillStyle='#0b1a3c';c.fillRect(-11,-62,22,34);c.fillStyle='#e8b896';c.beginPath();c.arc(0,-72,8,0,7);c.fill();c.fillStyle='#f2f2f2';c.fillRect(-11,-78,22,5);c.restore();};
 judge(-118,-30);judge(118,-30);judge(-100,90);
 // ---- net layer ----
 const [cn,n]=mk();
 const nL=P2(-92,180,0),nR=P2(92,180,0),tL=P2(-92,180,16.2),tR=P2(92,180,16.2),tC=P2(0,180,13.8);
 // net shadow on court
 n.beginPath();const sL=P2(-92,186,0),sR=P2(92,186,0);n.moveTo(nL[0],nL[1]);n.lineTo(nR[0],nR[1]);n.lineTo(sR[0],sR[1]);n.lineTo(sL[0],sL[1]);n.closePath();n.fillStyle='rgba(0,0,0,.18)';n.fill();
 // mesh
 n.save();n.beginPath();n.moveTo(nL[0],nL[1]);n.lineTo(nR[0],nR[1]);n.lineTo(tR[0],tR[1]);n.lineTo(tC[0],tC[1]);n.lineTo(tL[0],tL[1]);n.closePath();n.fillStyle='rgba(8,10,20,.42)';n.fill();n.clip();
 n.strokeStyle='rgba(255,255,255,.28)';n.lineWidth=.35;for(let xw=-92;xw<=92;xw+=2.2){const a=P2(xw,180,0),b=P2(xw,180,17);n.beginPath();n.moveTo(a[0],a[1]);n.lineTo(b[0],b[1]);n.stroke();}
 for(let zw=0;zw<=17;zw+=2.2){const a=P2(-92,180,zw),b=P2(92,180,zw);n.beginPath();n.moveTo(a[0],a[1]);n.lineTo(b[0],b[1]);n.stroke();}
 n.restore();
 // tape, centre strap, posts
 n.strokeStyle='#fff';n.lineWidth=2.4;n.beginPath();n.moveTo(tL[0],tL[1]);n.lineTo(tC[0],tC[1]);n.lineTo(tR[0],tR[1]);n.stroke();
 const cs0=P2(0,180,0);n.lineWidth=1.6;n.beginPath();n.moveTo(cs0[0],cs0[1]);n.lineTo(tC[0],tC[1]);n.stroke();
 for(const p of [[nL,tL],[nR,tR]]){const g=n.createLinearGradient(p[0][0]-2,0,p[0][0]+2,0);g.addColorStop(0,'#9aa3b5');g.addColorStop(.5,'#f4f6fb');g.addColorStop(1,'#7c8598');n.fillStyle=g;n.fillRect(p[0][0]-1.6,p[1][1]-2,3.2,p[0][1]-p[1][1]+2);n.fillStyle='#e9edf5';n.fillRect(p[0][0]-2.2,p[1][1]-3,4.4,2);}
 // umpire chair
 const ch=P2(-112,180,0),chT=P2(-112,180,38),sc=ch[2];
 n.strokeStyle='#cfd6e6';n.lineWidth=1.6;n.beginPath();n.moveTo(ch[0]-4*sc,ch[1]);n.lineTo(chT[0]-2*sc,chT[1]);n.moveTo(ch[0]+4*sc,ch[1]);n.lineTo(chT[0]+2*sc,chT[1]);n.stroke();
 n.fillStyle='#14306e';n.fillRect(chT[0]-7*sc,chT[1]-9*sc,14*sc,9*sc);n.fillStyle='#0b1a3c';n.fillRect(chT[0]-5*sc,chT[1]-22*sc,10*sc,13*sc);n.fillStyle='#e0b48e';n.beginPath();n.arc(chT[0],chT[1]-26*sc,3.6*sc,0,7);n.fill();
 // ball kids crouching at the net posts
 for(const sd of [-1,1]){const q=P2(sd*100,183,0),k=q[2]*0.22;n.save();n.translate(q[0],q[1]);n.scale(k,k);n.fillStyle='rgba(0,0,0,.3)';n.beginPath();n.ellipse(0,0,14,4,0,0,7);n.fill();n.fillStyle='#24408f';n.beginPath();n.ellipse(0,-18,11,14,0,0,7);n.fill();n.fillStyle='#e8b896';n.beginPath();n.arc(0,-38,7,0,7);n.fill();n.fillStyle='#111';n.fillRect(-7,-46,14,4);n.restore();}
 const out={stands:cs.toDataURL('image/jpeg',.86),court:cc2.toDataURL('image/png'),net:cn.toDataURL('image/png')};
 ARENA[k]=out;return out;}
// ---------- court SVG (images + dynamic layers) ----------
function courtSVG(surf){const A=arenaImgs(surf);
 return `<svg class="court" id="court" viewBox="0 0 360 440" preserveAspectRatio="xMidYMax meet"><defs>
 <radialGradient id="ballg" cx="35%" cy="32%"><stop offset="0" stop-color="#fbffc8"/><stop offset=".55" stop-color="#dff23a"/><stop offset="1" stop-color="#93a800"/></radialGradient>
 <radialGradient id="shg"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".6" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
 <radialGradient id="vign" cx="50%" cy="58%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
 <radialGradient id="dust"><stop offset="0" stop-color="${surf==='C'?'#f2b083':surf==='G'?'#d8f0b0':'#ffffff'}" stop-opacity=".75"/><stop offset="1" stop-color="${surf==='C'?'#e08a55':'#fff'}" stop-opacity="0"/></radialGradient>
 <pattern id="strings" width="2.2" height="2.2" patternUnits="userSpaceOnUse"><path d="M0 0H2.2M0 0V2.2" stroke="rgba(255,255,255,.55)" stroke-width=".5"/></pattern>
 </defs>
 <g id="crowd"><image href="${A.stands}" x="-120" y="-130" width="600" height="570" preserveAspectRatio="none"/><g id="flashes"></g></g>
 <image href="${A.court}" x="-120" y="-130" width="600" height="570" preserveAspectRatio="none"/>
 <g id="marks"></g><g id="shadows"></g>
 <g id="pl1"></g>
 <image href="${A.net}" x="-120" y="-130" width="600" height="570" preserveAspectRatio="none"/>
 <g id="dustL"></g>
 <g id="trail"></g>
 <ellipse id="bsh" cx="0" cy="0" rx="2" ry="1" fill="rgba(0,0,0,.4)"/>
 <g id="pl0"></g>
 <circle id="ball" cx="-20" cy="-20" r="2.8" fill="url(#ballg)"/>
 <rect id="vignR" x="-120" y="-130" width="600" height="570" fill="url(#vign)" pointer-events="none"/>
 <g id="fx"></g></svg>`;}
// ---------- player figure ----------
function figureSVG(p,back){const l=lookFor(p);const sk=l.skin,hr=l.hair,sh=l.shirt;const shorts=['#ffffff','#f4f4f4'].includes(sh)?'#1c2340':(hashStr(p.n||'')%3===0?shade(sh,-45):'#f4f6fb');
 const id=gid('fg');const hs=hairStyle(p);const shoe=['#ffffff','#f5f5f5','#1d1d24','#ff5d73','#36d1ff'][hashStr((p.n||'')+'s')%5];const frame=['#1b1f2a','#d32f2f','#f5f5f5','#ffd34d','#2f7bff','#22c55e'][hashStr((p.n||'')+'r')%6];
 const leg=(sx)=>`<g class="${sx<0?'legL':'legR'}"><path d="M${sx*3} -52 L${sx*11} -52 L${sx*10} -27 L${sx*9} -9 L${sx*4.4} -9 L${sx*3.6} -27 Z" fill="url(#${id}k)"/><rect x="${sx<0?-9.6:4}" y="-12" width="5.6" height="5" rx="1" fill="#fafafa"/><path d="M${sx<0?-13:3.2} -2.2 q0 -5 4.6 -5 h3.6 q4.2 0 4.8 5 z" fill="${shoe}"/><path d="M${sx<0?-13.2:3} -1.6 h13.4" stroke="rgba(0,0,0,.45)" stroke-width="1.6" stroke-linecap="round"/></g>`;
 const face=back?`<path d="M-8.9 -97 C-9 -108 9 -108 8.9 -97 C9 -91 7 -88 0 -87.5 C-7 -88 -9 -91 -8.9 -97Z" fill="${hr}"/>`:
  `<path d="M-4.6 -97.5 h2.4 M2.2 -97.5 h2.4" stroke="${shade(hr,-10)}" stroke-width="1" stroke-linecap="round"/><circle cx="-3.2" cy="-95.6" r="1.1" fill="#141418"/><circle cx="3.2" cy="-95.6" r="1.1" fill="#141418"/><path d="M-2 -90.6 q2 1.2 4 0" stroke="#7a3a2a" stroke-width="1" fill="none" stroke-linecap="round"/>`+
  [`<path d="M-8.8 -97 C-9.4 -108 9.4 -108 8.8 -97 C6 -102 -6 -102 -8.8 -97Z" fill="${hr}"/>`,`<path d="M-8.6 -98 C-8 -106 8 -106 8.6 -98 C5 -101 -5 -101 -8.6 -98Z" fill="${hr}"/>`,`<path d="M-9.4 -96 C-11 -110 11 -110 9.4 -96 C8 -100 5 -102 0 -102 C-5 -102 -8 -100 -9.4 -96Z" fill="${hr}"/>`,`<path d="M-9.2 -94 C-10 -109 10 -109 9.2 -94 C8 -99 5 -101.5 0 -101.5 C-5 -101.5 -8 -99 -9.2 -94Z M-9.3 -95 c-.6 4 0 7 1.4 9 M9.3 -95 c.6 4 0 7 -1.4 9" fill="${hr}" stroke="${hr}" stroke-width="1.6"/>`,`<path d="M-9.6 -98.5 C-9.6 -107 9.6 -107 9.6 -98.5Z M-2 -99 h14 q-1 2.4 -4 2.6 h-10z" fill="${sh}" stroke="rgba(0,0,0,.2)" stroke-width=".5"/>`][hs];
 const band=(l.band||p.isMe)&&hs!==4?`<path d="M-9.4 -101.2 q9.4 -2.6 18.8 0 v3 q-9.4 -2.4 -18.8 0z" fill="#fff"/>`:'';
 return `<g class="figw"><g class="fig"><defs>
 <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="${shade(sh,25)}"/><stop offset=".5" stop-color="${sh}"/><stop offset="1" stop-color="${shade(sh,-42)}"/></linearGradient>
 <linearGradient id="${id}k" x1="0" x2="1"><stop offset="0" stop-color="${shade(sk,14)}"/><stop offset="1" stop-color="${shade(sk,-26)}"/></linearGradient>
 <radialGradient id="${id}h" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="${shade(sk,16)}"/><stop offset="1" stop-color="${shade(sk,-24)}"/></radialGradient>
 <linearGradient id="${id}s" x1="0" x2="1"><stop offset="0" stop-color="${shade(shorts,10)}"/><stop offset="1" stop-color="${shade(shorts,-30)}"/></linearGradient></defs>
 <ellipse class="fsh" cx="9" cy="0" rx="26" ry="7" fill="url(#shg)"/>
 <g class="body">
 ${leg(-1)}${leg(1)}
 <path d="M-13 -60 h26 l2.4 15 q-7.4 3.2 -13.8 -.4 q-6.6 3.6 -14 .4z" fill="url(#${id}s)"/>
 <path d="M-14.5 -86 Q0 -92 14.5 -86 L16 -72 L13.6 -58 L-13.6 -58 L-16 -72Z" fill="url(#${id}t)"/>
 <path d="M-4.6 -88.6 L0 -82.6 L4.6 -88.6" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.4"/><path d="M-13.6 -66 L13.6 -66" stroke="rgba(255,255,255,.22)" stroke-width="1.6"/>
 <g class="armOff"><circle cx="-14" cy="-84" r="4.4" fill="url(#${id}t)"/><path d="M-15 -82 L-21 -69 L-17 -58" stroke="url(#${id}k)" stroke-width="5.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
 <path d="M-3.6 -90 h7.2 v5 q-3.6 2 -7.2 0z" fill="${shade(sk,-20)}"/>
 <ellipse cx="0" cy="-96.4" rx="8.6" ry="10" fill="url(#${id}h)"/>${back?'':`<ellipse cx="-8.6" cy="-95.5" rx="1.6" ry="2.4" fill="${shade(sk,-12)}"/><ellipse cx="8.6" cy="-95.5" rx="1.6" ry="2.4" fill="${shade(sk,-12)}"/>`}
 ${face}${band}
 <g class="arm"><circle cx="14" cy="-84" r="4.4" fill="url(#${id}t)"/><path d="M15 -82 L22 -70 L28 -61" stroke="url(#${id}k)" stroke-width="5.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 -63.6 l3.8 2.4" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  <path d="M28.6 -59.6 L35 -49.6" stroke="#1c1c22" stroke-width="3.2" stroke-linecap="round"/><path d="M35 -49.6 l2.2 -2.8 M35 -49.6 l3.4 .6" stroke="${frame}" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="42.4" cy="-39.4" rx="7.6" ry="10.6" transform="rotate(-36 42.4 -39.4)" fill="url(#strings)" stroke="${frame}" stroke-width="2.4"/><ellipse cx="42.4" cy="-39.4" rx="7.6" ry="10.6" transform="rotate(-36 42.4 -39.4)" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".6"/></g>
 </g></g></g>`;}
// player placement: bigger, with shadow direction from the lights
function placePlayers(dur){for(let i=0;i<2;i++){const g=$('#pl'+i);if(!g)continue;const [x,y]=MS.pos[i];const q=pj(x,y,0);const k=q[2]*0.34;g.style.transition=`transform ${dur||0}ms cubic-bezier(.3,.7,.4,1)`;g.style.transform=`translate(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px) scale(${k.toFixed(3)})`;
  const f=g.querySelector('.fig');if(f){f.classList.toggle('run',dur>120);clearTimeout(f._rt);f._rt=setTimeout(()=>f.classList.remove('run'),dur||0);}}}
// ball with tapered glowing trail
function setBall(x,y,z){const b=$('#ball'),s=$('#bsh'),tr=$('#trail');if(!b)return;const q=pj(x,y,z),g=pj(x,y,0);const r=2.5*q[2]*1.3;b.setAttribute('cx',q[0].toFixed(1));b.setAttribute('cy',q[1].toFixed(1));b.setAttribute('r',r.toFixed(2));
 s.setAttribute('cx',(g[0]+z*0.05).toFixed(1));s.setAttribute('cy',g[1].toFixed(1));const sz=Math.max(0.6,2.6-z*0.02)*g[2];s.setAttribute('rx',(sz*1.5).toFixed(2));s.setAttribute('ry',(sz*0.55).toFixed(2));s.setAttribute('opacity',Math.max(0.12,0.55-z*0.007).toFixed(2));
 const T=MS.trail;T.push([q[0],q[1],r]);if(T.length>9)T.shift();
 let h='';for(let i=0;i<T.length-1;i++){const a=(i+1)/T.length;h+=`<circle cx="${T[i][0].toFixed(1)}" cy="${T[i][1].toFixed(1)}" r="${(T[i][2]*a*0.95).toFixed(2)}" fill="rgba(235,255,120,${(a*0.42).toFixed(2)})"/>`;}tr.innerHTML=h;}
function clearTrail(){MS.trail=[];const tr=$('#trail');if(tr)tr.innerHTML='';}
async function flyBall(x0,y0,z0,x1,y1,z1,dur,H){await tween(dur,t=>{const x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;const z=z0*(1-t)+z1*t+4*H*t*(1-t);setBall(x,y,z);});if(z1===0&&!MS.skip&&!MS.abort)bounceFx(x1,y1);}
function bounceFx(x,y){const m=MS.m;if(!m)return;const q=pj(x,y,0);const surf=m.surf;const d=$('#dustL');
 if(d){const e=document.createElementNS('http://www.w3.org/2000/svg','ellipse');e.setAttribute('cx',q[0]);e.setAttribute('cy',q[1]);e.setAttribute('rx',3*q[2]);e.setAttribute('ry',1.2*q[2]);e.setAttribute('fill','url(#dust)');d.appendChild(e);const rx0=3*q[2],ry0=1.2*q[2],t0=performance.now(),big=surf==='C'?1.4:1;const st=now=>{const t=Math.min(1,(now-t0)/650);e.setAttribute('rx',(rx0*(0.6+2.6*t*big)).toFixed(2));e.setAttribute('ry',(ry0*(0.6+1.8*t*big)).toFixed(2));e.setAttribute('opacity',(0.95*(1-t)).toFixed(2));if(t<1&&e.isConnected)requestAnimationFrame(st);else e.remove();};requestAnimationFrame(st);}
 if(surf==='C'||surf==='G'){const mk=$('#marks');if(mk){const e=document.createElementNS('http://www.w3.org/2000/svg','ellipse');e.setAttribute('cx',q[0]);e.setAttribute('cy',q[1]);e.setAttribute('rx',(2.6*q[2]).toFixed(2));e.setAttribute('ry',(0.9*q[2]).toFixed(2));e.setAttribute('fill',surf==='C'?'rgba(120,40,12,.45)':'rgba(30,70,20,.35)');mk.appendChild(e);while(mk.childNodes.length>14)mk.removeChild(mk.firstChild);}}}
// crowd reaction: jump + camera flashes
function cheer(big){const c=$('#crowd');if(!c)return;c.classList.remove('cheer','cheer2');c.getBoundingClientRect();c.classList.add(big?'cheer2':'cheer');clearTimeout(c._t);c._t=setTimeout(()=>c.classList.remove('cheer','cheer2'),1300);
 if(big){const f=$('#flashes');if(!f)return;let h='';for(let i=0;i<14;i++){const side=Math.random();let x,y;if(side<0.5){x=Math.random()*360;y=4+Math.random()*26;}else{const l=Math.random()<.5;y=10+Math.random()*120;x=l?Math.random()*Math.max(4,40-y*0.3):360-Math.random()*Math.max(4,40-y*0.3);}h+=`<circle class="flash" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1+Math.random()*1.4).toFixed(1)}" style="animation-delay:${(Math.random()*0.9).toFixed(2)}s"/>`;}f.innerHTML=h;setTimeout(()=>{if(f)f.innerHTML='';},1900);}}
// TV-style serve speed & Hawk-Eye
function showSpeed(r){if(!r||!r.spd||r.type==='df'||MS.speed>=8)return;const el=$('#spdbox');if(!el)return;el.innerHTML=`<em>${r.second?'2.':'1.'} PODÁNÍ</em><b>${r.spd}</b><span>km/h</span>`;el.classList.remove('show');el.getBoundingClientRect();el.classList.add('show');}
function hawkEye(){if(MS.speed>4)return;const el=$('#hawk');if(!el)return;const mm=1+Math.floor(Math.random()*18);el.innerHTML=`<div class="hk-t">HAWK-EYE · AUT</div><svg viewBox="0 0 120 60" width="150" height="75"><rect width="120" height="60" rx="6" fill="#0d3a8a"/><rect x="0" y="30" width="120" height="30" fill="#1f5fd0"/><rect x="0" y="27" width="120" height="6" fill="#f7fbff"/><ellipse cx="60" cy="${21-mm*0.35}" rx="12" ry="5" fill="#d9ef2a" stroke="#7f9000"/><text x="60" y="54" text-anchor="middle" fill="#fff" font-family="TMSport,system-ui" font-weight="800" font-size="12">${mm} mm</text></svg>`;el.classList.remove('show');el.getBoundingClientRect();el.classList.add('show');}
// ---------- splash removal / boot error display ----------
function bootDone(){const s=document.getElementById('splash');if(s){s.classList.add('gone');setTimeout(()=>s.remove(),600);}}
function lookFor(p){if(p.look&&p.look.skin)return p.look;const h=Math.abs(hashStr((p.id||'')+(p.n||'')))>>>0;return {skin:SKINS[h%SKINS.length],hair:HAIRS[(h>>>3)%HAIRS.length],shirt:SHIRTS[(h>>>6)%SHIRTS.length],band:((h>>>9)%3)===0};}
function hairStyle(p){if(p.look&&p.look.hs!=null)return p.look.hs;return (Math.abs(hashStr((p.id||'')+(p.n||'')))>>>12)%5;}

// fit the broadcast camera to the available box: whole court always visible, extra room shows more stands
function fitCourt(){const sv=$('#court');if(!sv)return;const w=sv.clientWidth||sv.parentNode.clientWidth,h=sv.clientHeight||sv.parentNode.clientHeight;if(!w||!h)return;
 const needW=330,needH=405;const s=Math.min(w/needW,h/needH);let vw=w/s,vh=h/s;vw=Math.min(vw,600);vh=Math.min(vh,570);
 const x0=180-vw/2,y0=Math.max(-130,438-vh);sv.setAttribute('viewBox',`${x0.toFixed(1)} ${y0.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);}
window.addEventListener('resize',()=>{if($('#court'))fitCourt();});

// ===================== V6 UI: sázky, integrita, tým, čtyřhra, Davis Cup =====================
function v6RenderModals(){if(document.getElementById('mbg')||document.getElementById('mv'))return;
 if(S.invAlert){showInvModal();return;}
 if(S.fixAlert){const ev=humanEvent();const nm=ev&&humanNextMatch();showFixOfferModal(true);return;}
 if(S.davisAlert){showDavisModal();return;}
 const me=ME();if(me&&(me.sponsOff||[]).length&&!S._sponsShown){S._sponsShown=1;/* keep quiet, card is on home */}}
function v6HomeCards(){const me=ME();let h='';
 if(typeof maybeNominateDavis==='function')maybeNominateDavis();
 const d=S.davis&&S.davis.nom;if(d&&d.ok&&d.week===S.week&&!S.weekStarted)h+=davisHomeCard(d);
 if((me.sponsOff||[]).length)h+=sponsorOfferCard(me);
 h+=bettingBoardCard();
 const evd=S.events&&S.events.find(e=>e.dbl&&e.human&&!e.done);if(evd)h+=doublesHomeCard(evd);
 return h;}

function davisHomeCard(d){const opp=COUNTRIES[d.opp]?COUNTRIES[d.opp][1]:d.opp;const phase=d.phase==='fin'?'finále':'baráž';
 const st=d.accepted===true?'<span class="good">Nominaci máš přijatou</span>':d.accepted===false?'<span class="mut">Nominaci jsi odmítl</span>':'<span class="gold">Čeká na tvé rozhodnutí</span>';
 return `<div class="card" style="border-color:rgba(91,140,255,.5)"><h3>🏳️ Davis Cup · ${phase}</h3>
 <div class="small">Svaz tě nominoval proti <b>${flag(d.opp)} ${esc(opp)}</b> na povrchu ${SURF[d.surf]?SURF[d.surf].name:'hala'}.</div>
 <div class="small" style="margin:6px 0">${st}</div>
 ${d.accepted==null?`<div class="grid2"><button class="btn gold" onclick="uiDavis(true)">Přijmout</button><button class="btn ghost" onclick="uiDavis(false)">Odmítnout</button></div>`:''}</div>`;}
function showDavisModal(){S.davisAlert=null;const d=S.davis&&S.davis.nom;if(!d||!d.ok){saveGame();return;}
 const opp=COUNTRIES[d.opp]?COUNTRIES[d.opp][1]:d.opp;const phase=d.phase==='fin'?'finále':'baráž (kvalifikace)';
 modal(`<h2>🏳️ Nominace do Davis Cupu</h2>
 <p class="small">Národní svaz tě povolal do týmu na <b>${phase}</b> proti <b>${flag(d.opp)} ${esc(opp)}</b>. Hraje se na 2 vítězné sety, venku na tebe čeká i čtyřhra spoluhráčů. Za start je odměna od svazu a popularita, žádné body ATP.</p>
 <div class="small mut">Pokud odmítneš, tým nastoupí bez tebe.</div>
 <div class="row" style="margin-top:14px"><button class="btn ghost" style="flex:1" onclick="uiDavis(false)">Odmítnout</button><button class="btn gold" style="flex:1" onclick="uiDavis(true)">Přijmout nominaci</button></div>`);}
function uiDavis(yes){const r=acceptDavis(yes);closeModal();toast(r.msg);render();}

function sponsorOfferCard(me){const off=me.sponsOff||[];if(!off.length)return '';
 return `<div class="card"><h3>✍️ Sponzorské nabídky</h3>${off.map(o=>{const sp=SPONSORS_V6.find(s=>s.id===o.id);if(!sp)return '';const mul=sponsorPayMul(me);return `<div class="shop"><div class="si">${sp.icon}</div><div style="flex:1"><b>${esc(sp.name)}</b><div class="tiny mut">${esc(sp.desc)} · ${fmtMoney(Math.round(sp.pay*mul))}/týd. · podpisové ${fmtMoney(Math.round(sp.sign*mul))}</div></div><button class="btn sm gold" onclick="uiAcceptSponsor('${sp.id}')">Přijmout</button><button class="btn sm ghost" onclick="uiDeclineSponsor('${sp.id}')">Ne</button></div>`;}).join('')}</div>`;}
function uiAcceptSponsor(id){const r=acceptSponsor(id);toast(r.msg);render();}
function uiDeclineSponsor(id){const r=declineSponsor(id);toast(r.msg);render();}

function bettingBoardCard(){const mk=S.market;if(!mk||!mk.items||!mk.items.length)return '';
 const me=ME();const open=mk.items.filter(x=>!x.done);
 if(!open.length&&!(S.bets||[]).some(b=>!b.settled&&b.week===S.week))return '';
 if(S.weekStarted&&S.market)topUpBettingBoard();
 let h=`<div class="card betcard"><h3>🎲 Sázková nabídka<span class="sp"></span><span class="tiny" style="text-transform:none;letter-spacing:0">jen herní $</span></h3>
 <div class="tiny mut" style="margin-bottom:8px">Kurzy z žebříčku, formy, povrchu a vzájemných zápasů. Veřejnost sází i během zápasu — po gamu, brejku a setu se hýbou procenta, objem i kurz. Na vlastní zápas sázet nesmíš (${esc(IJT)}).</div>
 ${S.weekStarted?`<button class="btn gold" style="width:100%;margin-bottom:8px" onclick="showLiveMarkets()">📡 Živé kurzy</button>`:''}`;
 for(const it of open.slice(0,8)){
  const pa=P(it.a),pb=P(it.b);
  const own=it.own?' <span class="tiny gold">tvůj zápas · nelze vsadit</span>':'';
  const shady=it.shady?' <span class="tiny warn">neobvyklý pohyb na trhu</span>':'';
  const live=it.liveSt&&!it.done?`<span class="tiny cy"> · live ${esc(liveScoreTxt(it.liveSt))}</span>`:(it.done?`<span class="tiny mut"> · konec</span>`:'');
  h+=`<div class="betrow ${it.own?'own':''}"><div class="tiny mut">${esc(it.name)} · ${SURF[it.surf]?SURF[it.surf].name:''}${own}${shady}${live}</div>
   <div class="row" style="align-items:center;gap:8px;margin-top:4px">
    <div style="flex:1;min-width:0"><b class="small">${flag(it.aCC)} ${esc(shortName(pa)||it.aN)}</b><div class="tiny mut">${it.pctA} % sázek · ${fmtMoney(it.pubA)}</div></div>
    <div class="c"><b class="gold">${fmtOdds(it.oddsA)}</b>${it.own?'':`<button class="btn sm" onclick="uiBet('${it.id}','a')">Vsadit</button>`}</div>
   </div>
   <div class="row" style="align-items:center;gap:8px;margin-top:4px">
    <div style="flex:1;min-width:0"><b class="small">${flag(it.bCC)} ${esc(shortName(pb)||it.bN)}</b><div class="tiny mut">${100-it.pctA} % sázek · ${fmtMoney(it.pubB)}</div></div>
    <div class="c"><b class="gold">${fmtOdds(it.oddsB)}</b>${it.own?'':`<button class="btn sm" onclick="uiBet('${it.id}','b')">Vsadit</button>`}</div>
   </div>
   <div class="pubbar" title="Rozdělení sázek"><i style="width:${it.pctA}%"></i></div>
   <div class="tiny mut">${fmtNum(it.bettors)} sázkařů · objem ${fmtMoney(it.vol)}</div></div>`;}
 const mine=(S.bets||[]).filter(b=>b.week===S.week&&b.season===S.season);
 if(mine.length)h+=`<div class="tiny b" style="margin-top:8px">Tvoje sázky</div>`+mine.map(b=>`<div class="tiny">${esc(b.name)} · ${fmtMoney(b.stake)} @ ${fmtOdds(b.odds)} ${b.settled?(b.result==='win'?'<span class="good">výhra '+fmtMoney(b.payout)+'</span>':'<span class="bad">prohra</span>'):'<span class="mut">živě</span>'}</div>`).join('');
 return h+'</div>';}
function uiBet(mid,side,market){const it=findMarket(mid);if(!it){toast('Trh už není.');return;}if(it.own){toast('Na vlastní zápas sázet nesmíš – '+IJT+' to hlídá.');return;}const me=ME();const max=maxBetStake(me);if(max<50){toast('Nemáš dost herních peněz na sázku.');return;}
 market=market||'match';if(market!=='match')ensureLiveState(it);
 const nm=side==='a'?it.aN:it.bN;const od=oddsForBet(it,market,side);
 const lab=market==='set'?'další set':market==='game'?'další game':'vítěze zápasu';
 const keepLive=!!document.getElementById('livemkt');
 modal(`<h2>🎲 ${market!=='match'?'Live sázka':'Sázka'} (herní peníze)</h2>
 <p class="small">Sázíš na <b>${esc(nm)}</b> – trh na <b>${lab}</b> v zápase <b>${esc(it.name)}</b>${it.liveSt?` (stav ${esc(liveScoreTxt(it.liveSt))})`:''} v kurzu <b>${fmtOdds(od)}</b>. Jsou to jen herní dolary.</p>
 <label class="tiny mut">Částka (min. $50, max. ${fmtMoney(max)})</label>
 <input id="betAmt" type="number" inputmode="numeric" min="50" max="${max}" value="${Math.min(200,max)}">
 <div class="row" style="margin-top:14px"><button class="btn ghost" style="flex:1" onclick="${keepLive?'showLiveMarkets()':'closeModal()'}">Zpět</button><button class="btn gold" style="flex:1" onclick="uiPlaceBet('${mid}','${side}','${market}',${keepLive?1:0})">Podat sázku</button></div>`);}
function uiPlaceBet(mid,side,market,backLive){const inp=$('#betAmt');const r=placeBet(mid,side,inp?inp.value:0,market||'match');toast(r.msg);if(r.ok){if(backLive)showLiveMarkets();else{closeModal();render();}}else if(backLive)showLiveMarkets();}
function weekBetSummary(before){const list=(S.bets||[]).filter(b=>b.settled&&b.week===before.week&&b.season===before.season);if(!list.length)return '';
 const w=list.filter(b=>b.result==='win'),l=list.filter(b=>b.result==='lose');const net=list.reduce((a,b)=>a+(b.payout||0)-b.stake,0);
 return `<div class="small" style="margin-top:8px">🎲 Sázky: ${w.length} výher / ${l.length} proher · <b class="${net>=0?'good':'bad'}">${net>=0?'+':''}${fmtMoney(net)}</b> (jen herní $)</div>`;}

function matchOddsLine(ev,me,o){const p=fairMatchP(me,o,ev.surf,ev.bo);const od=oddsFromP(p,1.05);
 const it=S.market&&S.market.items&&S.market.items.find(x=>x.own&&x.eid===ev.id);
 const pct=it?it.pctA:Math.round((me.id==='me'?(p):1-p)*100);
 const vol=it?it.vol:null;const my=it&&it.a==='me'?it.oddsA:od.a;const yo=it&&it.a==='me'?it.oddsB:od.b;
 return `<div class="oddsline"><span>Kurzy: ty <b>${fmtOdds(my)}</b> · soupeř <b>${fmtOdds(yo)}</b></span><span class="tiny mut">${it?it.pctA+' % sázek na tebe · objem '+fmtMoney(it.vol):'otevírací kurz podle formy a žebříčku'}</span></div>`;}
function preMatchOddsBlock(ev,me,o){return `<div style="margin-top:8px">${matchOddsLine(ev,me,o)}</div>`;}
function updateLiveOddsUI(){const el=$('#liveodds');if(!el||!MS.m)return;const ev=MS.o&&MS.o.ev;
 const it=typeof ensureOwnMatchMarket==='function'?ensureOwnMatchMarket(MS.m,ev):null;
 const lo=liveOddsForMatch(MS.m,ev);if(!lo){el.innerHTML='';return;}
 if(!it){el.innerHTML=`<div class="lov"><div class="lov-odds">Kurzy živě <span>ty <b>${fmtOdds(lo.me)}</b></span><span>soupeř <b>${fmtOdds(lo.opp)}</b></span></div></div>`;return;}
 stampOpenVol(it);
 const meIsA=it.a==='me'||it.a===MS.m.p[0].id;
 const myM=meIsA?it.pubA:it.pubB, opM=meIsA?it.pubB:it.pubA;
 const myPct=it.vol?Math.round(myM/it.vol*100):50;
 const openV=it.openVol||it.vol, liveV=it.vol||0, added=Math.max(0,liveV-openV);
 const spike=it._spike&&it._spikeAt&&(Date.now()-it._spikeAt<1600)?it._spike:null;
 const spikeTxt=spike==='set'?'po setu':spike==='break'?'po brejku':spike==='game'?'po gamu':spike==='match'?'po zápase':spike==='point'?'živě':'';
 const shady=it.shady?'<span class="warn"> neobvyklý pohyb</span>':'';
 const susp=lo.susp&&lo.why;
 const spark=typeof oddsSparkSVG==='function'?oddsSparkSVG(it.histP):'';
 el.innerHTML=`<div class="lov ${spike?'spike':''} ${susp?'paused':''}">
  <div class="lov-odds"><span>Kurzy živě</span><span>ty <b>${fmtOdds(lo.me)}</b></span><span>soupeř <b>${fmtOdds(lo.opp)}</b></span></div>
  ${susp?`<div class="lov-susp">Trh pozastaven · ${esc(lo.why)}</div>`:''}
  ${spark?`<div class="lov-spark-w">${spark}</div>`:''}
  <div class="lov-vol">Live objem <b>${fmtMoney(liveV)}</b>${added?`<span class="add">+${fmtMoney(added)}</span>`:''}${spikeTxt?`<span class="spk">${spikeTxt}</span>`:''}</div>
  <div class="pubbar lov-bar"><i style="width:${myPct}%"></i></div>
  <div class="lov-split"><span>Ty ${fmtMoney(myM)} · ${myPct} %</span><span>Soupeř ${fmtMoney(opM)} · ${100-myPct} %</span></div>
  <div class="lov-pre">Před zápasem ${fmtMoney(openV)} · teď live ${fmtMoney(liveV)} · ${fmtNum(it.bettors||0)} sázkařů${shady}</div>
 </div>`;
}

function liveMarketsHTML(){topUpBettingBoard();const items=(S.market&&S.market.items||[]).filter(x=>!x.done||(x.liveSt&&!x.liveSt.done));
 if(!items.length)return '<div class="small mut">Teď neběží žádný živý trh.</div>';
 let h='';for(const it of items){ensureLiveState(it);const pa=P(it.a),pb=P(it.b);const own=it.own;
  h+=`<div class="betrow live ${own?'own':''}"><div class="tiny mut">${esc(it.name)} · ${SURF[it.surf]?SURF[it.surf].name:''}${own?' · <span class="gold">tvůj zápas</span>':''}</div>
  <div class="b small" style="margin:3px 0">${flag(it.aCC)} ${esc(shortName(pa)||it.aN)} <span class="cy">${esc(liveScoreTxt(it.liveSt))}</span> ${flag(it.bCC)} ${esc(shortName(pb)||it.bN)}</div>
  <div class="pubbar"><i style="width:${it.pctA}%"></i></div>
  <div class="tiny mut">${it.pctA} % / ${100-it.pctA} % · objem ${fmtMoney(it.vol)} · ${fmtNum(it.bettors||0)} sázkařů${it.shady?' · <span class="warn">neobvyklý pohyb</span>':''}</div>
  <div class="livemkts">
   <div class="lm"><div class="tiny b">Zápas</div><div class="row"><span class="small">${esc(shortName(pa)||it.aN)} <b class="gold">${fmtOdds(it.oddsA)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','a','match')">Vsadit</button>`}</div>
    <div class="row"><span class="small">${esc(shortName(pb)||it.bN)} <b class="gold">${fmtOdds(it.oddsB)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','b','match')">Vsadit</button>`}</div></div>
   ${it.liveSt&&!it.liveSt.done&&it.setM?`<div class="lm"><div class="tiny b">${it.setM.n||''}. set</div><div class="row"><span class="small">${esc(shortName(pa)||it.aN)} <b class="gold">${fmtOdds(it.setM.oddsA)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','a','set')">Vsadit</button>`}</div>
    <div class="row"><span class="small">${esc(shortName(pb)||it.bN)} <b class="gold">${fmtOdds(it.setM.oddsB)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','b','set')">Vsadit</button>`}</div></div>`:''}
   ${it.liveSt&&!it.liveSt.done&&it.gameM?`<div class="lm"><div class="tiny b">Další game${it.liveSt?` · podává ${esc(shortName(it.liveSt.server===0?pa:pb))}`:''}</div><div class="row"><span class="small">${esc(shortName(pa)||it.aN)} <b class="gold">${fmtOdds(it.gameM.oddsA)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','a','game')">Vsadit</button>`}</div>
    <div class="row"><span class="small">${esc(shortName(pb)||it.bN)} <b class="gold">${fmtOdds(it.gameM.oddsB)}</b></span>${own?'':`<button class="btn sm" onclick="uiBet('${it.id}','b','game')">Vsadit</button>`}</div></div>`:''}
  </div>
  ${own?'<div class="tiny mut">Na tento zápas sázet nesmíš.</div>':''}
  </div>`;}
 return h;}
function showLiveMarkets(){if(typeof tickLiveMarkets==='function')tickLiveMarkets(1);topUpBettingBoard();
 if(MS&&MS.m&&!MS.ended){MS.paused=true;const b=$('#pauseB');if(b)b.textContent='▶';}
 modal(`<h2>📡 Živé sázky</h2>
 <div class="tiny mut" style="margin-bottom:8px">Simulovaní sázkaři sázejí v průběhu zápasu. Trhy: vítěz, další set, další game. Pouze herní dolary. Na vlastní zápas sázet nesmíš.</div>
 <div id="livemkt">${liveMarketsHTML()}</div>
 <div class="row" style="margin-top:10px"><button class="btn ghost" style="flex:1" onclick="tickLiveMarkets(1);refreshLiveMkt()">Obnovit</button><button class="btn" style="flex:1" onclick="closeModal()">Zavřít</button></div>`);}
function refreshLiveMkt(){const el=$('#livemkt');if(el)el.innerHTML=liveMarketsHTML();}

function applyShowPlayers(){const on=showPlayersOn();const mv=document.querySelector('#mv .mview')||document.querySelector('.mview');if(mv)mv.classList.toggle('hidepl',!on);
 const btn=$('#plVis');if(btn){btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',on?'true':'false');}const lab=$('#plVisT');if(lab)lab.textContent=on?'zapnuto':'vypnuto';}
function toggleShowPlayers(fromSet){const on=setShowPlayers(!showPlayersOn());toast(on?'Hráči na kurtu jsou vidět.':'Hráči jsou schovaní — zůstává míček, stopy a tabule.');applyShowPlayers();if(fromSet&&typeof render==='function'&&!document.getElementById('mv'))render();}


// --- integrity ---
function showFixOfferModal(liveAfter){S.fixAlert=null;const me=ME();const ig=ensureIntegrity(me);const o=ig.off;if(!o||!o.open)return;
 UI._fixLive=!!liveAfter;
 modal(`<h2>📩 Zpráva ze skrytého čísla</h2>
 <p class="small">Někdo, kdo se nepředstavil, nabízí <b>${fmtMoney(o.amt)}</b> v hotovosti (herní peníze), když v zápase na turnaji <b>${esc(o.name)}</b> „neuděláš všechno, co bys mohl“. Chce, abys <b>${esc(o.txt)}</b>${o.oppN?' proti '+esc(o.oppN):''}.</p>
 <p class="small mut">Takové věci se na nižších okruzích občas stávají. ${IJT} stíhá ovlivňování zápasů: od pokuty přes zákaz na měsíce a roky až po doživotní zákaz, ztrátu sponzorů a konec kariéry. Podezřelé sázky na trhu to mohou prozradit.</p>
 <div class="col" style="gap:8px;margin-top:12px">
  <button class="btn" onclick="uiFix('refuse')">Odmítnout</button>
  <button class="btn gold" onclick="uiFix('report')">Nahlásit ${IJT}</button>
  <button class="btn red" onclick="uiFix('accept')">Přijmout nabídku</button>
 </div>
 <button class="btn ghost" style="width:100%;margin-top:8px" onclick="closeModal();">Rozhodnu se později</button>`,true);}
function uiFix(choice){if(choice==='accept'){confirmBox('Opravdu přijmout?','Porušíš pravidla hry. Peníze dostaneš, ale musíš v zápase záměrně zvolnit. Riskuješ pokutu, zákaz startu, ztrátu sponzorů i konec kariéry. Sázkový trh se může začít chovat podezřele.','Přijmout',()=>{doFix('accept');});return;}
 doFix(choice);}
function doFix(choice){const r=respondFix(choice);closeModal();toast(r.msg);if(choice!=='accept'&&choice!=='refuse'&&choice!=='report')return;
 const live=UI._fixLive!==false;if(humanNextMatch()&&humanNextMatch().opp){if(live)preMatch(true);else runEventMatch(false);}else render();}
function showInvModal(){const a=S.invAlert;S.invAlert=null;saveGame();if(!a)return;
 modal(`<div class="c"><div style="font-size:44px">${a.life?'🚫':'⚠️'}</div><h2 style="margin:4px 0">${IJT}</h2></div>
 <p class="small">${esc(a.msg)}</p>
 ${a.life?`<div class="small mut">Můžeš si prohlédnout kariéru, exportovat uložení, nebo začít znovu.</div><button class="btn big" style="margin-top:12px" onclick="closeModal();go('career')">Kariéra</button>`:`<button class="btn big" style="margin-top:12px" onclick="closeModal()">Rozumím</button>`}`,true);}

// --- staff & gear ---
function v6TeamCard(me){let h=`<div class="card"><h3>🧑‍🤝‍🧑 Tým<span class="sp"></span><span class="small" style="text-transform:none;letter-spacing:0">týdně ${fmtMoney(weeklyCosts(me))}</span></h3>
 <div class="tiny mut" style="margin-bottom:8px">Každého člena můžeš najmout na vyšší úroveň, nebo ho propustit a ušetřit na platu (platíš odstupné).</div>`;
 for(const k of ['coach','fitness','physio','mental','manager']){const it=STAFF[k];const l=staffLvl(me,k);const mx=l>=it.max;const mn=l<=(it.min||0);const c=it.cost[l+1];
  h+=`<div class="shop"><div class="si">${it.icon}</div><div style="flex:1"><b>${it.name}</b> <span class="stars">${'★'.repeat(l)}${'☆'.repeat(it.max-l)}</span><div class="tiny mut">${it.desc(l)}</div>${!mx?`<div class="tiny cy">Další: ${it.desc(l+1)}</div>`:''}</div><div class="col" style="gap:4px">${mx?'<span class="tiny gold b">MAX</span>':`<button class="btn sm ${me.money>=c?'gold':''}" ${me.money<c?'disabled':''} onclick="uiHire('${k}')">${fmtMoney(c)}</button>`}${mn?'':`<button class="btn sm ghost" onclick="uiFire('${k}')">Propustit</button>`}</div></div>`;}
 h+=`</div><div class="card"><h3>🎒 Vybavení</h3><div class="tiny mut" style="margin-bottom:8px">Úroveň kvality zůstává. Navíc si vybereš model – drobné specializace (síla vs. kontrola, povrch bot, typ výpletu).</div>`;
 for(const k of ['raketa','boty','vyplet']){const it=SHOP[k];const l=shopLevel(k);const mx=l>=it.max;const c=it.cost[l+1];const cur=gearModel(me,k);
  h+=`<div class="shop"><div class="si">${it.icon}</div><div style="flex:1"><b>${it.name}</b> <span class="stars">${'★'.repeat(l)}${'☆'.repeat(it.max-l)}</span><div class="tiny mut">${it.desc(l)} · model: <b>${esc(cur.n)}</b> — ${esc(cur.d)}</div>
  <div class="seg-t" style="margin-top:6px;flex-wrap:wrap">${GEAR_MODELS[k].map(m=>`<button class="${cur.id===m.id?'on':''}" onclick="uiGear('${k}','${m.id}')">${m.n}</button>`).join('')}</div></div>${mx?'<span class="tiny gold b">MAX</span>':`<button class="btn sm ${me.money>=c?'gold':''}" ${me.money<c?'disabled':''} onclick="uiBuy('${k}')">${fmtMoney(c)}</button>`}</div>`;}
 return h+'</div>';}
function uiHire(k){const r=hireStaff(k);toast(r.msg);render();}
function uiFire(k){const it=STAFF[k];const l=staffLvl(ME(),k);const sev=Math.round((it.sal[l]||0)*2);
 confirmBox('Propustit '+it.name+'?',`Klesneš o úroveň. Odstupné ${fmtMoney(sev)} se strhne teď, od příštího týdne platíš nižší plat.`,'Propustit',()=>{const r=fireStaff(k);toast(r.msg);render();});}
function uiGear(k,id){const r=setGearModel(k,id);toast(r.msg);render();}

// --- doubles ---
function showDoublesOptIn(t){const me=ME();const cands=partnerCandidates(t);
 modal(`<h2>🤝 Čtyřhra</h2>
 <p class="small">Jsi přihlášen do dvouhry na turnaji <b>${esc(t.name)}</b>. Chceš přidat i čtyřhru? Stojí to energii navíc, body jdou na samostatný žebříček čtyřhry. Partnera ti nabídneme z hráčů, kteří jsou volní.</p>
 ${cands.length?`<label class="tiny mut">Partner</label><select id="dblP">${cands.map(p=>`<option value="${p.id}">${flag(p.cc)} ${esc(p.n)} · čtyřhra ${p.dRank||'—'} · ${STYLE_NAMES[p.style]||''}</option>`).join('')}</select>
 <div class="row" style="margin-top:14px"><button class="btn ghost" style="flex:1" onclick="closeModal();toast('Přihlášen jen do dvouhry: ${esc(t.name)}');render()">Jen dvouhra</button><button class="btn gold" style="flex:1" onclick="uiJoinDoubles()">I čtyřhru</button></div>`:`<div class="small mut">Teď se nenašel volný partner. Zůstáváš v dvouhře.</div><button class="btn big" style="margin-top:12px" onclick="closeModal();render()">OK</button>`}`);}
function uiJoinDoubles(){const sel=$('#dblP');if(!sel){closeModal();render();return;}S.plan=S.plan||{};S.plan.dbl=sel.value;saveGame();closeModal();const p=P(sel.value);toast('Přihlášen do dvouhry i čtyřhry'+(p?' s '+p.n:''));render();}
function doublesHomeCard(ev){const st=S.curDbl;if(!st)return '';
 const rnd=ev.rounds[ev.cur]||[];const m=rnd.find(x=>(x.a==='me'||x.b==='me')&&!x.w);
 if(!m)return ev.done?`<div class="card"><h3>🤝 Čtyřhra skončila</h3><div class="small">${ev.champ==='me'?'Titul!': 'Konec čtyřhry.'}</div></div>`:'';
 const opp=m.a==='me'?m.b:m.a;const op=m.a==='me'?(m.bp||P(opp)):(m.ap||P(opp));
 const part=P(st.partner);
 return `<div class="card"><h3>🤝 Čtyřhra · ${esc(ev.name)}</h3>
 <div class="small">${part?'S '+esc(part.n)+' proti ':'Proti '}<b>${esc(op&&op.n||'?')}</b> · ${evRoundName(ev,ev.cur)}</div>
 <div class="grid2" style="margin-top:8px"><button class="btn gold" onclick="uiPlayDoubles(true)">Hrát čtyřhru</button><button class="btn ghost" onclick="uiPlayDoubles(false)">Simulovat</button></div></div>`;}
function uiPlayDoubles(live){const ev=S.events.find(e=>e.dbl&&e.human&&!e.done);if(!ev||!S.curDbl){toast('Čtyřhra už není.');return;}
 const rnd=ev.rounds[ev.cur]||[];const m=rnd.find(x=>(x.a==='me'||x.b==='me')&&!x.w);if(!m){toast('Teď nemáš zápas.');return;}
 const me=ME();const part=P(S.curDbl.partner);const pair=makePair(me,part);
 const oppP=m.a==='me'?(m.bp||makePair(P(m.b),P(m.b))):(m.ap||makePair(P(m.a),P(m.a)));
 const opts={surf:ev.surf,bo:3,cc:ev.cc,title:ev.name,noInj:true};
 const finish=mm=>{const won=mm.winner===0;applyResult(ev,m,won?'me':(m.a==='me'?m.b:m.a),mm.sets);
  if(won){me.dsw=(me.dsw||0)+1;if(part)part.dsw=(part.dsw||0)+1;}else{me.dsl=(me.dsl||0)+1;}
  simRoundAIDbl(ev);if(roundComplete(ev))advanceRound(ev);
  me.energy=clamp(me.energy-8,0,100);saveGame();
  toast(won?'✅ Výhra ve čtyřhře '+mm.scoreText(0):'❌ Prohra ve čtyřhře '+mm.scoreText(0));
  if(ev.done&&ev.champ==='me')toast('🏆 Titul ve čtyřhře!');render();};
 if(!live){const mm=new Match(pair,oppP,opts);mm.simToEnd();finish(mm);return;}
 openMatch({opp:oppP,surf:ev.surf,bo:3,cc:ev.cc,title:ev.name+' · čtyřhra',tour:ev.name,round:evRoundName(ev,ev.cur),tier:ev.tier,ev,kind:'dbl',onEnd:(mm)=>{finish(mm);return ev.champ==='me'?`<div class="gold b">🏆 Titul ve čtyřhře!</div>`:'';},after:()=>{UI.tab='home';render();}});}
function simRoundAIDbl(ev){for(const m of ev.rounds[ev.cur]){if(m.w||m.void)continue;if(m.a==='me'||m.b==='me')continue;if(!m.a||!m.b){m.w=m.a||m.b;continue;}const A=m.ap||P(m.a),B=m.bp||P(m.b);const q=quickMatch(A,B,ev.surf,3,ev.cc);m.w=q.w;m.sets=q.sets;}}

// --- career extras ---
function v6SettingsCard(){const on=showPlayersOn();return `<div class="card"><h3>⚙️ Nastavení zápasu</h3><div class="shop"><div class="si">👤</div><div style="flex:1"><b>Zobrazit hráče</b><div class="tiny mut">Když je vypnuto, na kurtu uvidíš jen míček, stopy odrazu, výsledkovou tabuli, statistiky a živé kurzy. Postavy tenistů zůstanou schované.</div></div><button class="btn sm ${on?'gold':''}" onclick="toggleShowPlayers(true)">${on?'Zapnuto':'Vypnuto'}</button></div></div>`;}
function v6CareerExtra(me){let h=v6SettingsCard();const riv=rivalryList();
 if(riv.length)h+=`<div class="card"><h3>⚔️ Rivalové</h3>${riv.slice(0,8).map(r=>`<div class="row small" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)" onclick="playerModal('${r.id}')">${flag(r.p.cc)} <b style="flex:1">${esc(r.p.n)}</b><span>${r.w}–${r.l}</span> <span class="tiny mut">(${r.n} zápasů)</span></div>`).join('')}</div>`;
 const ig=ensureIntegrity(me);if(ig){const st=isBanned(me)?(ig.banned.life?'doživotní zákaz':'zákaz na '+banWeeksLeft(me)+' týd.'):ig.reports?'spolupracuješ s '+IJT:ig.fixes?'pod dohledem':'čistý štít';
  h+=`<div class="card"><h3>🛡️ Integrita</h3><div class="small">Pověst u ${IJT}: <b>${Math.round(ig.rep)}</b>/100 · ${st}</div><div class="tiny mut" style="margin-top:6px">Ovlivňování zápasů je ve hře volba s vážnými následky. Nahlášení pokusu pomáhá vyšetřování a zlepší ti pověst.</div></div>`;}
 if((me.car.dblTitleList||[]).length)h+=`<div class="card"><h3>🤝 Trofeje ze čtyřhry</h3>${me.car.dblTitleList.slice().reverse().map(t=>`<div class="tiny">${t.s} · ${esc(t.name)}</div>`).join('')}</div>`;
 return h;}

// week card plan line for doubles
(function(){const _weekCard=weekCard;weekCard=function(){let h=_weekCard();if(S.plan&&S.plan.dbl){const p=P(S.plan.dbl);if(p)h=h.replace('</div></div><button class="btn ghost sm" onclick="S.plan=null;render()">✕</button>','</div><div class="tiny cy">+ čtyřhra s '+esc(p.n)+'</div></div><button class="btn ghost sm" onclick="S.plan=null;render()">✕</button>');}
 return h;};})();


// ---------- boot ----------
(function(){try{if(document.fonts&&document.fonts.load){document.fonts.load('800 12px TMSport');document.fonts.load('italic 800 12px TMSport');}}catch(e){}
 try{if(!loadGame())S=null;render();bootDone();}catch(e){window.__bootErr(e);}})();
