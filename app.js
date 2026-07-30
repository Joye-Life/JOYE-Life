const storageKey = 'joye_life_personalized_v2';
const defaultState = {
  profile: null,
  tasks: [],
  money: { paycheck: 0, essentials: 0, debt: 0, savings: 0, buffer: 200 },
  milestones: [],
  goals: [],
  lastRecommendation: null,
  coachHistory: [],
  dailyCheckIn: { minutes: 60, energy: 'medium', date: '' },
  weeklyPlan: { outcomes: ['', '', ''], avoid: '', notes: '' }
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
  state.tasks = (seeds[focus] || seeds.organization).map((title,i)=>({id:Date.now()+i,title,area:focus[0].toUpperCase()+focus.slice(1),done:false,minutes:30,importance:2,due:''}));
  if (state.profile.careerGoal) state.milestones = [
    {id:Date.now()+10,title:`Define requirements for ${state.profile.careerGoal}`,done:false},
    {id:Date.now()+11,title:'Document five measurable work wins',done:false},
    {id:Date.now()+12,title:'Complete one proof-of-skill project',done:false}
  ];
  if (state.profile.ninetyDayGoal) state.goals = [{id:Date.now()+20,name:state.profile.ninetyDayGoal,current:0,target:100,deadline:''}];
  if (state.profile.paycheck) state.money.paycheck = Number(state.profile.paycheck);
}


function getRankedTasks() {
  const today = new Date();
  today.setHours(0,0,0,0);
  return state.tasks.filter(t=>!t.done).map(task=>{
    let score=Number(task.importance||2)*20;
    if(task.area?.toLowerCase()===state.profile?.primaryFocus) score+=15;
    if(task.due){
      const due=new Date(task.due+'T12:00:00');
      const days=Math.ceil((due-today)/86400000);
      if(days<=0) score+=60; else if(days<=2) score+=40; else if(days<=7) score+=20;
    }
    const capacity=Number(state.dailyCheckIn?.minutes||state.profile?.availableTime||60);
    if(Number(task.minutes||30)<=capacity) score+=12; else score-=12;
    if(state.dailyCheckIn?.energy==='low' && Number(task.minutes||30)<=20) score+=10;
    return {...task,score};
  }).sort((a,b)=>b.score-a.score);
}

function buildLocalRecommendation(question='') {
  const p = state.profile || {};
  const openTasks = getRankedTasks();
  const flexibleBeforeBuffer = state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings;
  const flexible = flexibleBeforeBuffer-state.money.buffer;
  const urgentGoal = state.goals.filter(g=>g.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline))[0];
  const todayMinutes = Number(state.dailyCheckIn?.minutes||p.availableTime||60);
  const todayEnergy = state.dailyCheckIn?.energy||p.energyLevel||'medium';
  const lowTime = todayMinutes <= 30;
  const lowEnergy = todayEnergy === 'low';
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
    action = task ? `${lowEnergy?'Start with just 10 minutes of':`Use ${Math.min(Number(task.minutes||todayMinutes),todayMinutes)} minutes for`} “${task.title}.”` : 'Add one priority that can be completed in the time you actually have.';
    reasons = [p.stressPoint ? `You said your biggest pressure is: ${p.stressPoint}` : 'Your stress point has not been added yet.', lowTime ? 'Your available time is limited, so the recommendation is intentionally small.' : `Today you said you have about ${todayMinutes} minutes available.`, urgentGoal ? `“${urgentGoal.name}” has the nearest saved deadline.` : 'No deadline is currently creating extra urgency.'];
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

function renderAll(){renderTasks();renderMoney();renderMilestones();renderGoals();renderSummary();renderProfile();renderIdentity();renderCheckIn();renderWeeklyPlan();renderTodayBrief();renderSectionIntelligence();if(state.lastRecommendation)setRecommendation(state.lastRecommendation)}
function renderIdentity(){const name=state.profile?.name||'Your';document.querySelector('#sidebar-name').textContent=state.profile?.name||'Your dashboard';document.querySelector('#avatar').textContent=(state.profile?.name||'JL').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();document.querySelector('#view-title').textContent=state.profile?`Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${name}.`:'Your next move.';document.querySelector('#career-roadmap-title').textContent=state.profile?.careerGoal?`${state.profile.careerGoal} roadmap`:'Career roadmap'}
function renderSummary(){const done=state.tasks.filter(t=>t.done).length,pct=state.tasks.length?Math.round(done/state.tasks.length*100):0;document.querySelector('#progress-value').textContent=`${pct}%`;document.querySelector('#progress-bar').style.width=`${pct}%`;const f=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;document.querySelector('#available-value').textContent=currency.format(Math.max(f,0));document.querySelector('#available-note').textContent=f>=0?'after plans and your safety buffer':'plan exceeds available paycheck';const completed=state.milestones.filter(m=>m.done).length;document.querySelector('#career-value').textContent=`${completed}/${state.milestones.length}`}
function renderTasks(){const list=document.querySelector('#task-list');list.innerHTML='';document.querySelector('#empty-tasks').hidden=state.tasks.length>0;state.tasks.forEach(task=>{const row=document.createElement('div');row.className=`app-task ${task.done?'done':''}`;row.innerHTML=`<label><input type="checkbox" ${task.done?'checked':''}><span><strong>${esc(task.title)}</strong><small>${esc(task.area)} · ${Number(task.minutes||30)} min${task.due?` · due ${new Date(task.due+'T12:00:00').toLocaleDateString()}`:''}</small></span></label><button aria-label="Delete priority">×</button>`;row.querySelector('input').onchange=e=>{task.done=e.target.checked;save();renderAll();requestRecommendation()};row.querySelector('button').onclick=()=>{state.tasks=state.tasks.filter(t=>t.id!==task.id);save();renderAll();requestRecommendation()};list.appendChild(row)})}
function renderMoney(){['paycheck','essentials','debt','savings','buffer'].forEach(id=>document.querySelector(`#${id}`).value=state.money[id]||0);const flexible=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;document.querySelector('#flexible-result').textContent=currency.format(flexible);const w=document.querySelector('#allocation-warning');w.textContent=flexible<0?`Your plan is short by ${currency.format(Math.abs(flexible))}. Lower flexible allocations before adding spending.`:`${currency.format(flexible)} remains after your stated safety buffer.`;w.className=flexible<0?'warning':''}
function renderMilestones(){const list=document.querySelector('#milestone-list');list.innerHTML='';state.milestones.forEach(item=>{const row=document.createElement('label');row.className=`milestone ${item.done?'done':''}`;row.innerHTML=`<input type="checkbox" ${item.done?'checked':''}><span>${esc(item.title)}</span><button type="button">×</button>`;row.querySelector('input').onchange=e=>{item.done=e.target.checked;save();renderAll();requestRecommendation()};row.querySelector('button').onclick=()=>{state.milestones=state.milestones.filter(m=>m.id!==item.id);save();renderAll()};list.appendChild(row)})}
function renderGoals(){const list=document.querySelector('#goal-list');list.innerHTML='';state.goals.forEach(goal=>{const pct=Math.min(100,Math.max(0,Number(goal.current)/Number(goal.target)*100));const card=document.createElement('article');card.className='goal-card';card.innerHTML=`<div><strong>${esc(goal.name)}</strong><button>×</button></div><p>${esc(goal.current)} of ${esc(goal.target)}${goal.deadline?` · due ${new Date(goal.deadline+'T12:00:00').toLocaleDateString()}`:''}</p><div class="progress-track"><i style="width:${pct}%"></i></div>`;card.querySelector('button').onclick=()=>{state.goals=state.goals.filter(g=>g.id!==goal.id);save();renderAll()};list.appendChild(card)})}
function renderProfile(){const p=state.profile;if(!p){document.querySelector('#profile-summary').innerHTML='<p>Complete setup to build your personal plan.</p>';return}const facts=[['Primary focus',p.primaryFocus],['Biggest pressure',p.stressPoint||'Not entered'],['Weekday time',`${p.availableTime} minutes`],['After-work energy',p.energyLevel],['Current role',p.currentRole||'Not entered'],['Career goal',p.careerGoal||'Not entered'],['90-day outcome',p.ninetyDayGoal||'Not entered'],['Pay frequency',p.payFrequency]];document.querySelector('#profile-summary').innerHTML=facts.map(([k,v])=>`<div class="profile-fact"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}
function renderCheckIn(){
  const check=state.dailyCheckIn||{minutes:60,energy:'medium'};
  document.querySelector('#today-minutes').value=String(check.minutes||60);
  document.querySelector('#today-energy').value=check.energy||'medium';
  const ranked=getRankedTasks().slice(0,3);
  const queue=document.querySelector('#focus-queue');
  queue.innerHTML=ranked.length?`<small>Best fit for today</small>${ranked.map((task,i)=>`<button type="button" data-focus-id="${task.id}"><b>${i+1}</b><span><strong>${esc(task.title)}</strong><small>${Number(task.minutes||30)} min · ${esc(task.area)}</small></span></button>`).join('')}`:'<small>Add priorities to build a focus queue.</small>';
  queue.querySelectorAll('[data-focus-id]').forEach(button=>button.onclick=()=>{const task=state.tasks.find(t=>String(t.id)===button.dataset.focusId);if(task){document.querySelectorAll('.nav-item,.view').forEach(el=>el.classList.remove('active'));document.querySelector('[data-view="today"]').classList.add('active');document.querySelector('#view-today').classList.add('active');document.querySelector('#task-list').scrollIntoView({behavior:'smooth',block:'center'})}});
}
function renderWeeklyPlan(){
  const week=state.weeklyPlan||{outcomes:['','',''],avoid:'',notes:''};
  week.outcomes=(week.outcomes||['','','']).concat(['','','']).slice(0,3);
  week.outcomes.forEach((value,i)=>document.querySelector(`#week-outcome-${i+1}`).value=value||'');
  document.querySelector('#week-avoid').value=week.avoid||'';document.querySelector('#week-notes').value=week.notes||'';
  const completed=week.outcomes.filter(Boolean);
  document.querySelector('#weekly-summary').innerHTML=completed.length?`<span class="eyebrow">THIS WEEK</span><h3>${completed.length} focused outcome${completed.length===1?'':'s'}</h3><ol>${completed.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${week.avoid?`<p><strong>Protect the week from:</strong> ${esc(week.avoid)}</p>`:''}`:'<p>Your weekly plan will appear here after you save it.</p>';
}


function daysUntil(dateValue){
  if(!dateValue)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const target=new Date(dateValue+'T12:00:00');
  return Math.ceil((target-today)/86400000);
}
function renderTodayBrief(){
  const open=getRankedTasks();
  const overdue=open.filter(t=>t.due&&daysUntil(t.due)<0);
  const dueSoon=open.filter(t=>t.due&&daysUntil(t.due)>=0&&daysUntil(t.due)<=3);
  const flexible=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;
  const goalsDue=state.goals.filter(g=>g.deadline&&daysUntil(g.deadline)<=14).sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline));
  const completedToday=state.tasks.filter(t=>t.done).length;
  const signals=[
    {label:'Time available',value:`${Number(state.dailyCheckIn?.minutes||state.profile?.availableTime||60)} min`,tone:'neutral'},
    {label:'Urgent items',value:String(overdue.length+dueSoon.length),tone:overdue.length?'alert':dueSoon.length?'watch':'good'},
    {label:'Money buffer',value:currency.format(Math.max(flexible,0)),tone:flexible<0?'alert':flexible<state.money.buffer*.5?'watch':'good'},
    {label:'Completed',value:String(completedToday),tone:completedToday?'good':'neutral'}
  ];
  document.querySelector('#today-signals').innerHTML=signals.map(s=>`<article class="signal ${s.tone}"><small>${esc(s.label)}</small><strong>${esc(s.value)}</strong></article>`).join('');
  let copy='Your plan is balanced. Focus on the highest-ranked task that fits your energy and available time.';
  if(overdue.length) copy=`${overdue.length} overdue ${overdue.length===1?'item needs':'items need'} attention. Start with “${overdue[0].title}” before adding new work.`;
  else if(flexible<0) copy=`Your paycheck plan is short by ${currency.format(Math.abs(flexible))}. Rebalance the Money section before making optional spending decisions.`;
  else if(dueSoon.length) copy=`“${dueSoon[0].title}” is due ${daysUntil(dueSoon[0].due)===0?'today':`in ${daysUntil(dueSoon[0].due)} day${daysUntil(dueSoon[0].due)===1?'':'s'}`}. It is the strongest time-sensitive signal in your plan.`;
  else if(goalsDue.length) copy=`“${goalsDue[0].name}” has the nearest goal deadline. Reserve part of today's capacity for one measurable step.`;
  document.querySelector('#today-brief-copy').innerHTML=`<p>${esc(copy)}</p><small>Updated from your latest check-in, tasks, goals, career plan, and paycheck plan.</small>`;
  document.querySelector('#brief-freshness').textContent=`Updated ${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date())}`;
}
function sectionCard(title,body,steps,question){
  return `<article class="insight-card"><div><span class="eyebrow">JOYE INSIGHT</span><h3>${esc(title)}</h3><p>${esc(body)}</p></div><div class="insight-actions">${steps.map(x=>`<span>→ ${esc(x)}</span>`).join('')}</div><button class="secondary-button section-ask" data-section-question="${esc(question)}">Ask Joye about this</button></article>`;
}
function renderSectionIntelligence(){
  const flexible=state.money.paycheck-state.money.essentials-state.money.debt-state.money.savings-state.money.buffer;
  const moneyTitle=flexible<0?'Your plan needs rebalancing':flexible<state.money.buffer?'Your margin is getting tight':'Your paycheck plan has breathing room';
  const moneyBody=flexible<0?`Planned allocations exceed the paycheck by ${currency.format(Math.abs(flexible))}.`:`You have ${currency.format(flexible)} after the safety buffer and planned allocations.`;
  document.querySelector('#money-intelligence').innerHTML=sectionCard(moneyTitle,moneyBody,flexible<0?['Lower one flexible allocation','Protect essentials and minimum payments']:['Keep the buffer untouched','Decide intentionally where remaining money goes'],'Review my paycheck plan and tell me what to adjust first.');
  const nextMilestone=state.milestones.find(m=>!m.done); const done=state.milestones.filter(m=>m.done).length;
  document.querySelector('#career-intelligence').innerHTML=sectionCard(nextMilestone?'Your next proof point is clear':'Your career plan needs one concrete milestone',nextMilestone?`${done} milestones are complete. “${nextMilestone.title}” is the next visible step.`:'Add a milestone that creates evidence of readiness for your next role.',nextMilestone?['Block a short work session','Define what “done” looks like']:['Add a 30-day milestone','Choose a proof-of-skill output'],'Based on my career goal and milestones, what should I do next?');
  const nearest=state.goals.filter(g=>g.deadline).sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline))[0];
  document.querySelector('#goals-intelligence').innerHTML=sectionCard(nearest?`${nearest.name} needs the clearest next checkpoint`:'Give one goal a real deadline',nearest?`${Math.max(0,daysUntil(nearest.deadline))} days remain until the nearest saved deadline.`:'Goals become easier to prioritize when Joye Life can compare time remaining and progress.',nearest?['Update current progress','Choose the next measurable checkpoint']:['Add a deadline','Define a measurable target'],'Review my goals and identify the one that deserves attention first.');
  const outcomes=(state.weeklyPlan?.outcomes||[]).filter(Boolean);
  document.querySelector('#week-intelligence').innerHTML=sectionCard(outcomes.length===3?'Your week has a clear shape':`Your week has ${outcomes.length} of 3 outcomes`,outcomes.length?`Joye Life will use these outcomes to rank daily work and flag distractions.`:'Add a few outcomes so Today can distinguish important work from noise.',outcomes.length<3?['Add only meaningful outcomes','Keep each outcome finishable']:['Check today against the week','Remove work that does not support an outcome'],'Look at my weekly plan and tell me what is missing or unrealistic.');
  document.querySelectorAll('.section-ask').forEach(button=>button.onclick=()=>{document.querySelectorAll('.nav-item,.view').forEach(el=>el.classList.remove('active'));document.querySelector('[data-view="today"]').classList.add('active');document.querySelector('#view-today').classList.add('active');document.querySelector('#coach-question').value=button.dataset.sectionQuestion;document.querySelector('#coach-question').focus();document.querySelector('.coach-card').scrollIntoView({behavior:'smooth',block:'center'});});
}
function updateCoachForSection(section){
  const prompts={today:['What should I focus on today?','What can I realistically finish with my current energy?','What should I postpone?'],money:['What should I adjust in my paycheck plan?','Can I afford a nonessential purchase?','How can I protect my buffer?'],career:['What is my strongest next career move?','Which milestone should come first?','How can I create proof of my skills?'],goals:['Which goal needs attention first?','Is this deadline realistic?','What is the next measurable checkpoint?'],week:['Is my weekly plan realistic?','What should I remove from this week?','How should I divide these outcomes across the week?']};
  const values=prompts[section]||prompts.today;
  document.querySelectorAll('.coach-actions button').forEach((button,i)=>{button.dataset.question=values[i];button.textContent=values[i]});
  document.querySelector('#coach-question').placeholder=values[0];
}

const modal=document.querySelector('#task-modal');document.querySelector('#open-task-modal').onclick=()=>modal.showModal();document.querySelector('#close-task-modal').onclick=()=>modal.close();document.querySelector('#task-form').onsubmit=e=>{e.preventDefault();const title=document.querySelector('#task-title').value.trim();if(!title)return;state.tasks.push({id:Date.now(),title,area:document.querySelector('#task-area').value,done:false,minutes:Number(document.querySelector('#task-minutes').value||30),importance:Number(document.querySelector('#task-importance').value||2),due:document.querySelector('#task-due').value});e.target.reset();modal.close();save();renderAll();requestRecommendation()};
document.querySelector('#money-form').onsubmit=e=>{e.preventDefault();['paycheck','essentials','debt','savings','buffer'].forEach(id=>state.money[id]=Number(document.querySelector(`#${id}`).value||0));save();renderAll();requestRecommendation('Can I afford a nonessential purchase?')};
document.querySelector('#add-milestone').onclick=()=>{const title=prompt('Milestone name');if(title?.trim()){state.milestones.push({id:Date.now(),title:title.trim(),done:false});save();renderAll();requestRecommendation()}};
document.querySelector('#goal-form').onsubmit=e=>{e.preventDefault();state.goals.push({id:Date.now(),name:document.querySelector('#goal-name').value.trim(),current:Number(document.querySelector('#goal-current').value),target:Number(document.querySelector('#goal-target').value),deadline:document.querySelector('#goal-deadline').value});e.target.reset();save();renderAll();requestRecommendation()};
document.querySelectorAll('.nav-item').forEach(button=>button.onclick=()=>{document.querySelectorAll('.nav-item,.view').forEach(el=>el.classList.remove('active'));button.classList.add('active');document.querySelector(`#view-${button.dataset.view}`).classList.add('active');updateCoachForSection(button.dataset.view)});
document.querySelector('#checkin-form').onsubmit=e=>{e.preventDefault();state.dailyCheckIn={minutes:Number(document.querySelector('#today-minutes').value),energy:document.querySelector('#today-energy').value,date:new Date().toISOString().slice(0,10)};save();renderAll();requestRecommendation()};
document.querySelector('#weekly-form').onsubmit=e=>{e.preventDefault();state.weeklyPlan={outcomes:[1,2,3].map(i=>document.querySelector(`#week-outcome-${i}`).value.trim()),avoid:document.querySelector('#week-avoid').value.trim(),notes:document.querySelector('#week-notes').value.trim()};save();renderWeeklyPlan();requestRecommendation()};
function renderCoachAnswer(data) {
  const box=document.querySelector('#coach-response');
  const answer=esc(data.answer||'');
  const steps=(data.nextSteps||[]).map(step=>`<li>${esc(step)}</li>`).join('');
  const context=(data.usedContext||[]).map(item=>`<span>${esc(item)}</span>`).join('');
  const follow=data.followUpQuestion?`<button class="coach-followup" type="button">${esc(data.followUpQuestion)}</button>`:'';
  box.innerHTML=`<div class="coach-answer-text">${answer.replace(/\n/g,'<br>')}</div>${steps?`<ol class="coach-next-steps">${steps}</ol>`:''}${context?`<div class="coach-context"><small>Used from your plan</small>${context}</div>`:''}${follow}`;
  const followButton=box.querySelector('.coach-followup');
  if(followButton) followButton.onclick=()=>{document.querySelector('#coach-question').value=data.followUpQuestion;document.querySelector('#coach-question').focus()};
}

async function askJoye(question) {
  const box=document.querySelector('#coach-response');
  const button=document.querySelector('#ask-coach');
  button.disabled=true;
  box.innerHTML='<div class="coach-thinking">Joye is reading your plan and thinking about your question…</div>';
  try {
    const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,profile:state.profile,money:state.money,tasks:state.tasks,goals:state.goals,milestones:state.milestones,history:state.coachHistory||[]})});
    const data=await response.json().catch(()=>({error:'Ask Joye returned an unreadable response.'}));
    if(!response.ok) throw new Error(data.error||'Ask Joye is unavailable.');
    state.coachHistory=[...(state.coachHistory||[]),{role:'user',content:question},{role:'assistant',content:data.answer}].slice(-10);
    save();
    renderCoachAnswer(data);
  } catch(error) {
    box.innerHTML=`<div class="coach-error"><strong>Ask Joye is currently limited.</strong><br>This response could not be generated right now. Please try again later.<br><small>Your personalized Next Move, focus queue, money plan, goals, and weekly plan are still available.</small></div>`;
  } finally { button.disabled=false; }
}

document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{document.querySelector('#coach-question').value=b.dataset.question;document.querySelector('#ask-coach').click()});
document.querySelector('#ask-coach').onclick=()=>{const input=document.querySelector('#coach-question');const q=input.value.trim();if(!q)return;askJoye(q)};
document.querySelector('#coach-question').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')document.querySelector('#ask-coach').click()});
document.querySelector('#refresh-recommendation').onclick=()=>requestRecommendation();document.querySelector('#accept-next-move').onclick=()=>{const r=state.lastRecommendation||buildLocalRecommendation();const title=(r.taskTitle||r.action).slice(0,100);if(!state.tasks.some(t=>t.title===title))state.tasks.unshift({id:Date.now(),title,area:state.profile?.primaryFocus||'Personal',done:false,minutes:Math.min(Number(state.dailyCheckIn?.minutes||30),60),importance:3,due:''});save();renderAll()};
document.querySelector('#reset-demo').onclick=()=>{if(confirm('Reset your local Joye Life prototype data?')){state=clone(defaultState);save();location.reload()}};



const feedbackForm=document.querySelector('#feedback-form');
if(feedbackForm){
  feedbackForm.onsubmit=async e=>{
    e.preventDefault();
    const button=document.querySelector('#feedback-submit');
    const status=document.querySelector('#feedback-status');
    const message=document.querySelector('#feedback-message').value.trim();
    if(!message){document.querySelector('#feedback-message').reportValidity();return}
    button.disabled=true;button.textContent='Sending…';status.className='feedback-status';status.textContent='';
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        type:document.querySelector('#feedback-type').value,
        rating:Number(document.querySelector('#feedback-rating').value),
        message,
        email:document.querySelector('#feedback-email').value.trim(),
        mayContact:document.querySelector('#feedback-contact').checked,
        company:document.querySelector('#feedback-company').value,
        profileName:state.profile?.name||'',
        page:location.pathname,
        source:'dashboard'
      })});
      const data=await response.json().catch(()=>({error:'Feedback service returned an unreadable response.'}));
      if(!response.ok)throw new Error(data.error||'Unable to send feedback.');
      feedbackForm.reset();document.querySelector('#feedback-rating').value='3';
      status.className='feedback-status success';status.textContent=data.message||'Thank you. Your feedback was sent.';
    }catch(error){status.className='feedback-status error';status.textContent=error.message||'Unable to send feedback right now.'}
    finally{button.disabled=false;button.textContent='Send feedback'}
  };
}

document.querySelector('#today-date').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();
const onboarding=document.querySelector('#onboarding-modal');let step=1;function showStep(n){step=n;document.querySelectorAll('.onboarding-step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));document.querySelector('#step-label').textContent=`Step ${n} of 4`;document.querySelector('#onboarding-progress-bar').style.width=`${n*25}%`;document.querySelector('#onboarding-back').hidden=n===1;document.querySelector('#onboarding-next').hidden=n===4;document.querySelector('#onboarding-finish').hidden=n!==4}
function openOnboarding(){const p=state.profile||{};document.querySelector('#profile-name').value=p.name||'';document.querySelector('#primary-focus').value=p.primaryFocus||'money';document.querySelector('#stress-point').value=p.stressPoint||'';document.querySelector('#available-time').value=p.availableTime||'60';document.querySelector('#energy-level').value=p.energyLevel||'medium';document.querySelector('#profile-paycheck').value=p.paycheck||state.money.paycheck||'';document.querySelector('#pay-frequency').value=p.payFrequency||'biweekly';document.querySelector('#current-role').value=p.currentRole||'';document.querySelector('#career-goal').value=p.careerGoal||'';document.querySelector('#ninety-day-goal').value=p.ninetyDayGoal||'';document.querySelector('#explain-recommendations').checked=p.explainRecommendations!==false;showStep(1);onboarding.showModal()}
document.querySelector('#onboarding-next').onclick=()=>{if(step===1&&!document.querySelector('#profile-name').value.trim()){document.querySelector('#profile-name').reportValidity();return}showStep(Math.min(4,step+1))};document.querySelector('#onboarding-back').onclick=()=>showStep(Math.max(1,step-1));document.querySelector('#edit-profile').onclick=openOnboarding;document.querySelector('#onboarding-form').onsubmit=e=>{e.preventDefault();state.profile={name:document.querySelector('#profile-name').value.trim(),primaryFocus:document.querySelector('#primary-focus').value,stressPoint:document.querySelector('#stress-point').value.trim(),availableTime:Number(document.querySelector('#available-time').value),energyLevel:document.querySelector('#energy-level').value,paycheck:Number(document.querySelector('#profile-paycheck').value||0),payFrequency:document.querySelector('#pay-frequency').value,currentRole:document.querySelector('#current-role').value.trim(),careerGoal:document.querySelector('#career-goal').value.trim(),ninetyDayGoal:document.querySelector('#ninety-day-goal').value.trim(),explainRecommendations:document.querySelector('#explain-recommendations').checked};seedFromProfile();save();onboarding.close();renderAll();requestRecommendation()};
renderAll();if(!state.profile)openOnboarding();else requestRecommendation();
