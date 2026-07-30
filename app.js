const storageKey = 'joye_life_personalized_v1';
const defaultState = {
  profile: null,
  tasks: [],
  money: { paycheck: 0, essentials: 0, debt: 0, savings: 0, buffer: 200 },
  milestones: [],
  goals: [],
  lastRecommendation: null
};
const clone = value => JSON.parse(JSON.stringify(value));
let state;
try { state = { ...clone(defaultState), ...(JSON.parse(localStorage.getItem(storageKey)) || {}) }; }
catch { state = clone(defaultState); }
const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function seedFromProfile() {
  if (state.tasks.length || state.milestones.length || state.goals.length) return;
  const focus = state.profile.primaryFocus;
  const seeds = {
    money: ['List every bill due before the next payday','Choose one realistic extra debt payment'],
    career: ['Document one measurable work win','Spend 30 minutes on the next career skill'],
    health: ['Schedule the next workout','Plan one easy high-protein meal'],
    organization: ['Choose the three outcomes that matter this week','Clear one source of recurring clutter'],
    business: ['Define the one problem your first customer has','Create one piece of useful content']
  };
  state.tasks = (seeds[focus] || seeds.organization).map((title,i)=>({id:Date.now()+i,title,area:focus[0].toUpperCase()+focus.slice(1),done:false}));
  if (state.profile.careerGoal) state.milestones = [
    {id:Date.now()+10,title:`Define requirements for ${state.profile.careerGoal}`,done:false},
    {id:Date.now()+11,title:'Document five measurable work wins',done:false},
    {id:Date.now()+12,title:'Complete one proof-of-skill project',done:false}
  ];
  if (state.profile.ninetyDayGoal) state.goals = [{id:Date.now()+20,name:state.profile.ninetyDayGoal,current:0,target:100,deadline:''}];
  if (state.profile.paycheck) state.money.paycheck = Number(state.profile.paycheck);
}

function buildLocalRecommendation(question='') {
  const p = state.profile || {};
  const openTasks = state.tasks.filter(t=>!t.done);
  const flexibleBeforeBuffer = state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings;
  const flexible = flexibleBeforeBuffer-state.money.buffer;
  const urgentGoal = state.goals.filter(g=>g.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline))[0];
  const lowTime = Number(p.availableTime||60) <= 30;
  const lowEnergy = p.energyLevel === 'low';
  let headline, action, reasons = [], confidence='High';
  const q = question.toLowerCase();

  if (q.includes('afford') || q.includes('spend') || p.primaryFocus === 'money' && flexible < 0) {
    headline = flexible < 0 ? 'Protect the essentials before adding spending' : 'Keep the buffer intact first';
    action = flexible < 0
      ? `Reduce planned allocations or spending by about ${currency.format(Math.abs(flexible))} before making a nonessential purchase.`
      : `You have about ${currency.format(Math.max(0,flexible))} beyond your stated safety buffer. Keep upcoming obligations covered before using it.`;
    reasons = [`Your plan reserves ${currency.format(state.money.buffer)} as a safety buffer.`, `${currency.format(state.money.essentials)} is marked for essentials before the next payday.`, state.money.debt ? `${currency.format(state.money.debt)} is already committed to debt.` : 'No debt payment is currently planned.'];
  } else if (q.includes('career') || p.primaryFocus === 'career') {
    const nextMilestone = state.milestones.find(m=>!m.done);
    headline = p.careerGoal ? `Create proof that you are ready for ${p.careerGoal}` : 'Turn career effort into visible evidence';
    action = nextMilestone ? `Spend ${Math.min(Number(p.availableTime||60),45)} minutes on “${nextMilestone.title}.”` : 'Add one specific career milestone that can be finished this month.';
    reasons = [p.currentRole ? `You are moving from ${p.currentRole}${p.careerGoal?` toward ${p.careerGoal}`:''}.` : 'Your career direction needs a clear next milestone.', `${state.milestones.filter(m=>m.done).length} of ${state.milestones.length} career milestones are complete.`, 'Completed evidence is more useful than vague studying.'];
  } else {
    const task = openTasks[0];
    headline = task ? `Make one realistic win in ${task.area}` : 'Choose one action that reduces tomorrow’s stress';
    action = task ? `${lowEnergy?'Start with just 10 minutes of':`Use ${Math.min(Number(p.availableTime||60),60)} minutes for`} “${task.title}.”` : 'Add one priority that can be completed in the time you actually have.';
    reasons = [p.stressPoint ? `You said your biggest pressure is: ${p.stressPoint}` : 'Your stress point has not been added yet.', lowTime ? 'Your available time is limited, so the recommendation is intentionally small.' : `You usually have about ${p.availableTime||60} minutes available.`, urgentGoal ? `“${urgentGoal.name}” has the nearest saved deadline.` : 'No deadline is currently creating extra urgency.'];
  }
  if (!p.name) confidence='Needs context';
  return { headline, action, reasons: reasons.filter(Boolean).slice(0,3), confidence, taskTitle: action.replace(/^Use \d+ minutes for |^Spend \d+ minutes on /,'').replace(/[“”]/g,'').replace(/\.$/,'') };
}

async function requestRecommendation(question='') {
  const local = buildLocalRecommendation(question);
  setRecommendation({...local, loading:true});
  try {
    const response = await fetch('/api/coach', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,profile:state.profile,money:state.money,tasks:state.tasks,goals:state.goals,milestones:state.milestones})});
    if (!response.ok) throw new Error('AI unavailable');
    const data = await response.json();
    if (data?.headline && data?.action) { setRecommendation({...data,taskTitle:data.taskTitle||data.action,source:'AI-assisted recommendation'}); return data; }
  } catch (_) {}
  setRecommendation({...local,source:'Personalized recommendation engine'});
  return local;
}

function setRecommendation(rec) {
  if (!rec.loading) { state.lastRecommendation=rec; save(); }
  document.querySelector('#next-move-headline').textContent=rec.headline;
  document.querySelector('#next-move-action').textContent=rec.action;
  document.querySelector('#recommendation-confidence').textContent=rec.loading?'Thinking…':`${rec.confidence||'Medium'} confidence`;
  document.querySelector('#next-move-reasons').innerHTML=(rec.reasons||[]).map(r=>`<div class="reason-item">${esc(r)}</div>`).join('');
  document.querySelector('#recommendation-source').textContent=rec.source||'Uses your saved priorities and plans.';
}

function renderAll(){renderTasks();renderMoney();renderMilestones();renderGoals();renderSummary();renderProfile();renderIdentity();if(state.lastRecommendation)setRecommendation(state.lastRecommendation)}
function renderIdentity(){const name=state.profile?.name||'Your';document.querySelector('#sidebar-name').textContent=state.profile?.name||'Your dashboard';document.querySelector('#avatar').textContent=(state.profile?.name||'JL').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();document.querySelector('#view-title').textContent=state.profile?`Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${name}.`:'Your next move.';document.querySelector('#career-roadmap-title').textContent=state.profile?.careerGoal?`${state.profile.careerGoal} roadmap`:'Career roadmap'}
function renderSummary(){const done=state.tasks.filter(t=>t.done).length,pct=state.tasks.length?Math.round(done/state.tasks.length*100):0;document.querySelector('#progress-value').textContent=`${pct}%`;document.querySelector('#progress-bar').style.width=`${pct}%`;const f=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;document.querySelector('#available-value').textContent=currency.format(Math.max(f,0));document.querySelector('#available-note').textContent=f>=0?'after plans and your safety buffer':'plan exceeds available paycheck';const completed=state.milestones.filter(m=>m.done).length;document.querySelector('#career-value').textContent=`${completed}/${state.milestones.length}`}
function renderTasks(){const list=document.querySelector('#task-list');list.innerHTML='';document.querySelector('#empty-tasks').hidden=state.tasks.length>0;state.tasks.forEach(task=>{const row=document.createElement('div');row.className=`app-task ${task.done?'done':''}`;row.innerHTML=`<label><input type="checkbox" ${task.done?'checked':''}><span><strong>${esc(task.title)}</strong><small>${esc(task.area)}</small></span></label><button aria-label="Delete priority">×</button>`;row.querySelector('input').onchange=e=>{task.done=e.target.checked;save();renderAll();requestRecommendation()};row.querySelector('button').onclick=()=>{state.tasks=state.tasks.filter(t=>t.id!==task.id);save();renderAll();requestRecommendation()};list.appendChild(row)})}
function renderMoney(){['paycheck','essentials','debt','savings','buffer'].forEach(id=>document.querySelector(`#${id}`).value=state.money[id]||0);const flexible=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;document.querySelector('#flexible-result').textContent=currency.format(flexible);const w=document.querySelector('#allocation-warning');w.textContent=flexible<0?`Your plan is short by ${currency.format(Math.abs(flexible))}. Lower flexible allocations before adding spending.`:`${currency.format(flexible)} remains after your stated safety buffer.`;w.className=flexible<0?'warning':''}
function renderMilestones(){const list=document.querySelector('#milestone-list');list.innerHTML='';state.milestones.forEach(item=>{const row=document.createElement('label');row.className=`milestone ${item.done?'done':''}`;row.innerHTML=`<input type="checkbox" ${item.done?'checked':''}><span>${esc(item.title)}</span><button type="button">×</button>`;row.querySelector('input').onchange=e=>{item.done=e.target.checked;save();renderAll();requestRecommendation()};row.querySelector('button').onclick=()=>{state.milestones=state.milestones.filter(m=>m.id!==item.id);save();renderAll()};list.appendChild(row)})}
function renderGoals(){const list=document.querySelector('#goal-list');list.innerHTML='';state.goals.forEach(goal=>{const pct=Math.min(100,Math.max(0,Number(goal.current)/Number(goal.target)*100));const card=document.createElement('article');card.className='goal-card';card.innerHTML=`<div><strong>${esc(goal.name)}</strong><button>×</button></div><p>${esc(goal.current)} of ${esc(goal.target)}${goal.deadline?` · due ${new Date(goal.deadline+'T12:00:00').toLocaleDateString()}`:''}</p><div class="progress-track"><i style="width:${pct}%"></i></div>`;card.querySelector('button').onclick=()=>{state.goals=state.goals.filter(g=>g.id!==goal.id);save();renderAll()};list.appendChild(card)})}
function renderProfile(){const p=state.profile;if(!p){document.querySelector('#profile-summary').innerHTML='<p>Complete setup to build your personal plan.</p>';return}const facts=[['Primary focus',p.primaryFocus],['Biggest pressure',p.stressPoint||'Not entered'],['Weekday time',`${p.availableTime} minutes`],['After-work energy',p.energyLevel],['Current role',p.currentRole||'Not entered'],['Career goal',p.careerGoal||'Not entered'],['90-day outcome',p.ninetyDayGoal||'Not entered'],['Pay frequency',p.payFrequency]];document.querySelector('#profile-summary').innerHTML=facts.map(([k,v])=>`<div class="profile-fact"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}

const modal=document.querySelector('#task-modal');document.querySelector('#open-task-modal').onclick=()=>modal.showModal();document.querySelector('#close-task-modal').onclick=()=>modal.close();document.querySelector('#task-form').onsubmit=e=>{e.preventDefault();const title=document.querySelector('#task-title').value.trim();if(!title)return;state.tasks.push({id:Date.now(),title,area:document.querySelector('#task-area').value,done:false});e.target.reset();modal.close();save();renderAll();requestRecommendation()};
document.querySelector('#money-form').onsubmit=e=>{e.preventDefault();['paycheck','essentials','debt','savings','buffer'].forEach(id=>state.money[id]=Number(document.querySelector(`#${id}`).value||0));save();renderAll();requestRecommendation('Can I afford a nonessential purchase?')};
document.querySelector('#add-milestone').onclick=()=>{const title=prompt('Milestone name');if(title?.trim()){state.milestones.push({id:Date.now(),title:title.trim(),done:false});save();renderAll();requestRecommendation()}};
document.querySelector('#goal-form').onsubmit=e=>{e.preventDefault();state.goals.push({id:Date.now(),name:document.querySelector('#goal-name').value.trim(),current:Number(document.querySelector('#goal-current').value),target:Number(document.querySelector('#goal-target').value),deadline:document.querySelector('#goal-deadline').value});e.target.reset();save();renderAll();requestRecommendation()};
document.querySelectorAll('.nav-item').forEach(button=>button.onclick=()=>{document.querySelectorAll('.nav-item,.view').forEach(el=>el.classList.remove('active'));button.classList.add('active');document.querySelector(`#view-${button.dataset.view}`).classList.add('active')});
document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{document.querySelector('#coach-question').value=b.dataset.question;document.querySelector('#ask-coach').click()});
document.querySelector('#ask-coach').onclick=async()=>{const q=document.querySelector('#coach-question').value.trim();if(!q)return;const box=document.querySelector('#coach-response');box.textContent='Reviewing your plan…';const rec=await requestRecommendation(q);box.innerHTML=`<strong>${esc(rec.headline)}</strong><br>${esc(rec.action)}<br><small>${(rec.reasons||[]).map(esc).join(' · ')}</small>`};
document.querySelector('#refresh-recommendation').onclick=()=>requestRecommendation();document.querySelector('#accept-next-move').onclick=()=>{const r=state.lastRecommendation||buildLocalRecommendation();const title=(r.taskTitle||r.action).slice(0,100);if(!state.tasks.some(t=>t.title===title))state.tasks.unshift({id:Date.now(),title,area:state.profile?.primaryFocus||'Personal',done:false});save();renderAll()};
document.querySelector('#reset-demo').onclick=()=>{if(confirm('Reset your local Joye Life prototype data?')){state=clone(defaultState);save();location.reload()}};

document.querySelector('#today-date').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
const onboarding=document.querySelector('#onboarding-modal');let step=1;function showStep(n){step=n;document.querySelectorAll('.onboarding-step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));document.querySelector('#step-label').textContent=`Step ${n} of 4`;document.querySelector('#onboarding-progress-bar').style.width=`${n*25}%`;document.querySelector('#onboarding-back').hidden=n===1;document.querySelector('#onboarding-next').hidden=n===4;document.querySelector('#onboarding-finish').hidden=n!==4}
function openOnboarding(){const p=state.profile||{};document.querySelector('#profile-name').value=p.name||'';document.querySelector('#primary-focus').value=p.primaryFocus||'money';document.querySelector('#stress-point').value=p.stressPoint||'';document.querySelector('#available-time').value=p.availableTime||'60';document.querySelector('#energy-level').value=p.energyLevel||'medium';document.querySelector('#profile-paycheck').value=p.paycheck||state.money.paycheck||'';document.querySelector('#pay-frequency').value=p.payFrequency||'biweekly';document.querySelector('#current-role').value=p.currentRole||'';document.querySelector('#career-goal').value=p.careerGoal||'';document.querySelector('#ninety-day-goal').value=p.ninetyDayGoal||'';document.querySelector('#explain-recommendations').checked=p.explainRecommendations!==false;showStep(1);onboarding.showModal()}
document.querySelector('#onboarding-next').onclick=()=>{if(step===1&&!document.querySelector('#profile-name').value.trim()){document.querySelector('#profile-name').reportValidity();return}showStep(Math.min(4,step+1))};document.querySelector('#onboarding-back').onclick=()=>showStep(Math.max(1,step-1));document.querySelector('#edit-profile').onclick=openOnboarding;document.querySelector('#onboarding-form').onsubmit=e=>{e.preventDefault();state.profile={name:document.querySelector('#profile-name').value.trim(),primaryFocus:document.querySelector('#primary-focus').value,stressPoint:document.querySelector('#stress-point').value.trim(),availableTime:Number(document.querySelector('#available-time').value),energyLevel:document.querySelector('#energy-level').value,paycheck:Number(document.querySelector('#profile-paycheck').value||0),payFrequency:document.querySelector('#pay-frequency').value,currentRole:document.querySelector('#current-role').value.trim(),careerGoal:document.querySelector('#career-goal').value.trim(),ninetyDayGoal:document.querySelector('#ninety-day-goal').value.trim(),explainRecommendations:document.querySelector('#explain-recommendations').checked};seedFromProfile();save();onboarding.close();renderAll();requestRecommendation()};
renderAll();if(!state.profile)openOnboarding();else requestRecommendation();
