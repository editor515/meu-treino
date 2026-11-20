'use strict';
// Interface v5.0 — biblioteca visual + editor completo de fichas
let mediaFilter='all';
let planReplaceTarget=null;
let imageExerciseTargetId=null;
const buttonArg=id=>JSON.stringify(id).replace(/'/g,'\\u0027');

function tab(t){
 activeTab=t;
 document.querySelectorAll('main section').forEach(s=>s.classList.toggle('hidden',s.id!==t));
 document.querySelectorAll('.tabs button').forEach(b=>{
  const current=b.dataset.tab===t||(t==='stats'&&b.dataset.tab==='settings');
  b.classList.toggle('active',current);
  if(current)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 ({home,session,library,history,stats,settings})[t]?.();
 window.scrollTo(0,0);
}
function plain(s){return String(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function getPlan(id){return db.plans.find(x=>x.id===id)}
function getLib(id){return db.library.find(x=>x.id===id)}
function mediaCount(){
 const img=db.library.filter(e=>Boolean(e.image)).length;
 const vid=db.library.filter(e=>Boolean(e.video)).length;
 return {img,vid,pending:db.library.filter(e=>!e.image&&!e.video).length};
}
function sortPlansByDay(){
 const order=['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
 db.plans.sort((a,b)=>{
  const ai=order.indexOf(plain(a.day)), bi=order.indexOf(plain(b.day));
  if(ai!==-1||bi!==-1){
    if(ai===-1) return 1; if(bi===-1) return -1; if(ai!==bi) return ai-bi;
  }
  return String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
 })
}
function createPlan(){
 const p={id:uid(),name:'Nova ficha',day:'',focus:'',durationEstimate:'',notes:'',exercises:[]};
 db.plans.push(p); save(); editPlan(p.id);
}
function movePlan(id,dir){
 const idx=db.plans.findIndex(p=>p.id===id); if(idx<0) return;
 const ni=idx+dir; if(ni<0||ni>=db.plans.length) return;
 [db.plans[idx],db.plans[ni]]=[db.plans[ni],db.plans[idx]]; save(); home();
}
function duplicatePlan(id){
 const p=getPlan(id); if(!p) return;
 const copy=structuredClone(p); copy.id=uid(); copy.name=p.name+' (cópia)';
 db.plans.push(copy); save(); notice('Ficha duplicada.'); editPlan(copy.id);
}
function savePlanMeta(id){
 const p=getPlan(id); if(!p) return;
 const name=$('editPlanName')?.value.trim(); if(!name) return notice('Informe o nome da ficha.');
 p.name=name;
 p.day=$('editPlanDay')?.value.trim()||'';
 p.focus=$('editPlanFocus')?.value.trim()||'';
 p.durationEstimate=$('editPlanDuration')?.value.trim()||'';
 p.notes=$('editPlanNotes')?.value.trim()||'';
 save(); notice('Informações da ficha salvas.'); planEditor(id);
}
function setPlanReplaceTarget(planId,index){ planReplaceTarget={planId,index}; planResults(planId); notice('Escolha abaixo o novo exercício para substituir o atual.'); }
function clearPlanReplaceTarget(planId){ if(planReplaceTarget?.planId===planId) planReplaceTarget=null; planResults(planId); }
function addPlanExercise(pid,eid){
 const p=getPlan(pid), lib=getLib(eid); if(!p||!lib) return;
 p.exercises.push({id:eid,name:lib.name,originalNumber:exerciseNumber(lib),sets:3,reps:'8–12',rest:90,rirTarget:'2–3',notes:''});
 save(); planEditor(pid); notice('Exercício adicionado à ficha.');
}
function replacePlanExercise(pid,index,eid){
 const p=getPlan(pid), lib=getLib(eid); if(!p||!lib||!p.exercises[index]) return;
 const curr=p.exercises[index];
 p.exercises[index]={...curr,id:eid,name:lib.name,originalNumber:exerciseNumber(lib)};
 planReplaceTarget=null; save(); planEditor(pid); notice('Exercício substituído.');
}
function editPlanExercise(id,i){
 const p=getPlan(id); if(!p) return; const e=p.exercises[i]; if(!e) return;
 $('home').innerHTML=`<button class="secondary smallbtn" onclick='planEditor(${buttonArg(id)})'>← Voltar para a ficha</button>
 <div class="eyebrow" style="margin-top:16px">EDITAR EXERCÍCIO</div>
 <h1>${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</h1>
 <div class="card">
   <label for="exerciseSets">Séries</label><input id="exerciseSets" inputmode="numeric" value="${esc(e.sets||3)}">
   <label for="exerciseReps">Repetições / meta</label><input id="exerciseReps" value="${esc(e.reps||'8–12')}">
   <label for="exerciseRir">RIR-alvo</label><input id="exerciseRir" value="${esc(e.rirTarget||'')}" placeholder="Ex.: 2–3">
   <label for="exerciseRest">Descanso em segundos</label><input id="exerciseRest" inputmode="numeric" value="${esc(e.rest??60)}">
   <label for="exerciseNotes">Observações</label><textarea id="exerciseNotes" rows="4">${esc(e.notes||'')}</textarea>
   <div class="actions" style="margin-top:12px"><button onclick='savePlanExerciseEdit(${buttonArg(id)},${i})'>Salvar exercício</button><button class="outline" onclick='setPlanReplaceTarget(${buttonArg(id)},${i});planEditor(${buttonArg(id)})'>Trocar exercício</button></div>
 </div>`;
}
function savePlanExerciseEdit(id,i){
 const p=getPlan(id); if(!p) return; const e=p.exercises[i]; if(!e) return;
 const sets=Number($('exerciseSets').value);
 const reps=$('exerciseReps').value.trim();
 const rest=Number($('exerciseRest').value);
 if(!Number.isInteger(sets)||sets<1||sets>30) return notice('Número de séries inválido.');
 if(!reps) return notice('Informe as repetições.');
 if(!Number.isFinite(rest)||rest<0||rest>3600) return notice('Descanso inválido.');
 e.sets=sets; e.reps=reps; e.rest=rest; e.rirTarget=$('exerciseRir').value.trim(); e.notes=$('exerciseNotes').value.trim();
 save(); notice('Exercício atualizado.'); planEditor(id);
}
function planResults(id){
 const p=getPlan(id); if(!p || !$('planMatches')) return;
 const q=($('planSearch')?.value||'').toLowerCase().trim();
 let results=!q?[]:db.library.filter(e=>`${e.name} ${e.originalNumber??''} ${e.equipment||''}`.toLowerCase().includes(q)).sort((a,b)=>(a.originalNumber??9999)-(b.originalNumber??9999)).slice(0,18);
 $('planMatches').innerHTML=!q?'<p class="muted tiny">Digite um nome ou número para localizar exercícios.</p>':results.map(e=>`<div class="entry"><div class="row wrap" style="align-items:center"><div><strong>${exerciseBadge(e)}${esc(e.name)}</strong><div class="muted tiny">${esc(e.group)}${e.equipment&&e.equipment!=='Consultar demonstração'?' · '+esc(e.equipment):''}</div></div><div class="actions">${planReplaceTarget&&planReplaceTarget.planId===id?`<button class="smallbtn" onclick='replacePlanExercise(${buttonArg(id)},${planReplaceTarget.index},${buttonArg(e.id)})'>Trocar aqui</button>`:`<button class="smallbtn" onclick='addPlanExercise(${buttonArg(id)},${buttonArg(e.id)})'>Adicionar</button>`}<button class="outline smallbtn" onclick='showExercise(${buttonArg(e.id)},"library")'>Ver</button></div></div></div>`).join('')||'<p class="muted tiny">Nenhum exercício encontrado.</p>';
}
function planEditor(id){
 const p=getPlan(id); if(!p) return; const replacing=planReplaceTarget&&planReplaceTarget.planId===id;
 $('home').innerHTML=`<button class="secondary smallbtn" onclick="home()">← Voltar às fichas</button>
 <div class="section-header" style="margin-top:18px"><div><div class="eyebrow">EDITOR DE FICHA</div><h1 style="margin:6px 0 0">${esc(p.name)}</h1></div><div class="actions"><button class="outline smallbtn" onclick='duplicatePlan(${buttonArg(id)})'>Duplicar</button><button class="danger smallbtn" onclick='deletePlan(${buttonArg(id)})'>Excluir</button></div></div>
 <div class="card">
   <div class="grid form-grid-1"><div><label for="editPlanName">Nome da ficha</label><input id="editPlanName" value="${esc(p.name)}"></div><div><label for="editPlanDay">Dia</label><input id="editPlanDay" value="${esc(p.day||'')}" placeholder="Ex.: Segunda-feira"></div></div>
   <div class="grid form-grid-1"><div><label for="editPlanFocus">Foco / grupos</label><input id="editPlanFocus" value="${esc(p.focus||'')}" placeholder="Ex.: Peito, ombros e tríceps"></div><div><label for="editPlanDuration">Duração estimada</label><input id="editPlanDuration" value="${esc(p.durationEstimate||'')}" placeholder="Ex.: 45–55 minutos"></div></div>
   <label for="editPlanNotes">Observações gerais</label><textarea id="editPlanNotes" rows="3">${esc(p.notes||'')}</textarea>
   <div class="actions" style="margin-top:12px"><button onclick='savePlanMeta(${buttonArg(id)})'>Salvar informações</button><button class="outline" onclick='movePlan(${buttonArg(id)},-1)'>Mover ficha ↑</button><button class="outline" onclick='movePlan(${buttonArg(id)},1)'>Mover ficha ↓</button></div>
 </div>
 <div class="section-header"><h2>Exercícios da ficha</h2><span class="pill pill-neutral">${p.exercises.length} itens</span></div>
 ${p.exercises.map((e,i)=>`<div class="card compact-card"><div class="row wrap"><div><div class="exercise-name">${i+1}. ${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</div><div class="exercise-subtitle">${esc(e.sets)} séries · ${esc(e.reps)} reps · ${esc(e.rest??60)}s${e.rirTarget?' · RIR '+esc(e.rirTarget):''}</div></div><span class="pill pill-neutral">${esc(ex(e.id).group||'')}</span></div>${e.notes?`<div class="note" style="margin-top:10px">${esc(e.notes)}</div>`:''}<div class="actions" style="margin-top:12px"><button class="secondary smallbtn" onclick='editPlanExercise(${buttonArg(id)},${i})'>Alterar</button><button class="outline smallbtn" onclick='setPlanReplaceTarget(${buttonArg(id)},${i})'>Trocar</button><button class="outline smallbtn" onclick='moveExercise(${buttonArg(id)},${i},-1)'>↑</button><button class="outline smallbtn" onclick='moveExercise(${buttonArg(id)},${i},1)'>↓</button><button class="danger smallbtn" onclick='removeExercise(${buttonArg(id)},${i})'>Excluir</button></div></div>`).join('')||'<div class="card empty empty-compact">Nenhum exercício ainda. Use a busca abaixo para montar a ficha.</div>'}
 <div class="card"><h3>${replacing?'Escolha o novo exercício':'Adicionar exercício'}</h3>${replacing?`<p class="note">Você está substituindo o exercício da posição ${planReplaceTarget.index+1}. Escolha um item abaixo ou <button class="text-action" onclick='clearPlanReplaceTarget(${buttonArg(id)})'>cancelar</button>.</p>`:''}<label for="planSearch">Buscar por nome, marca ou número</label><input id="planSearch" placeholder="Ex.: 83, supino ou hammer" oninput='planResults(${buttonArg(id)})'><div id="planMatches"><p class="muted tiny">Digite um termo para localizar exercícios.</p></div><div class="actions" style="margin-top:12px"><button class="secondary" onclick='newLibraryExercise(${buttonArg(id)})'>+ Criar exercício na biblioteca</button></div></div>`;
}
function showPlan(id){
 const p=getPlan(id); if(!p) return;
 $('home').innerHTML=`<button class="secondary smallbtn" onclick="home()">← Voltar às fichas</button><div class="eyebrow" style="margin-top:18px">FICHA DE TREINO</div><h1>${esc(p.name)}</h1><p class="section-intro">${esc([p.day,p.focus,p.durationEstimate].filter(Boolean).join(' · '))}</p>${p.notes?`<div class="note">${esc(p.notes)}</div>`:''}${p.exercises.map((e,i)=>`<div class="card exercise-card"><div class="exercise-title"><div class="exercise-index">${i+1}</div><div><div class="exercise-name">${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</div><div class="exercise-subtitle">${esc(e.sets)} séries × ${esc(e.reps)} · Descanso ${esc(e.restMin&&e.restMax&&e.restMin!==e.restMax?e.restMin+'–'+e.restMax:e.rest??60)}s${e.rirTarget?' · RIR '+esc(e.rirTarget):''}</div></div></div>${e.notes?`<p class="note">${esc(e.notes)}</p>`:''}</div>`).join('')}<div class="actions"><button onclick='startPlan(${buttonArg(p.id)})'>Iniciar treino</button><button class="secondary" onclick='editPlan(${buttonArg(p.id)})'>Editar ficha</button><button class="outline" onclick='duplicatePlan(${buttonArg(p.id)})'>Duplicar</button></div>`;
}
function home(){
 sortPlansByDay();
 const weekdays=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
 const todayName=weekdays[new Date().getDay()];
 const weekStart=new Date();weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
 const weekly=db.history.filter(h=>new Date(h.ended)>=weekStart);
 const timeMin=Math.round(weekly.reduce((n,h)=>n+(h.durationSeconds??mins(h.started,h.ended)*60),0)/60);
 const recommended=db.plans.find(p=>plain(p.day).includes(plain(todayName)))||db.plans[0];
 const a=db.active;
 const hero=a?`<div class="card hero"><div class="hero-caption">Sua sessão</div><div class="row"><h1>${esc(a.planName||'Treino iniciado')}</h1><span class="pill">${a.status==='paused'?'Pausado':'Em andamento'}</span></div><p>${a.items.flatMap(x=>x.sets).filter(s=>s.done).length} séries concluídas. Continue de onde parou.</p><button class="hero-action" onclick="tab('session')">Continuar treino →</button></div>`:
 recommended?`<div class="card hero"><div class="hero-caption">${esc(todayName)} · Seu próximo treino</div><h1>${esc(recommended.name)}</h1><p>${esc(recommended.focus||'Sua ficha está pronta')}${recommended.durationEstimate?' · '+esc(recommended.durationEstimate):''}</p><button class="hero-action" onclick='startPlan(${buttonArg(recommended.id)})'>Iniciar treino →</button></div>`:
 `<div class="card hero"><div class="hero-caption">BEM-VINDO</div><h1>Seu treino começa aqui.</h1><p>Crie sua primeira ficha ou importe um treino pronto.</p><button class="hero-action" onclick="createPlan()">Criar ficha →</button></div>`;
 $('home').innerHTML=`<div class="eyebrow">PAINEL DE TREINO</div><h1>Vamos treinar?</h1><p class="section-intro">Organize fichas, execute treinos e acompanhe sua evolução.</p>${hero}
 <div class="grid"><div class="card statcard"><small>Treinos nesta semana</small><div class="stat">${weekly.length}<span class="stat-suffix">sessões</span></div></div><div class="card statcard"><small>Tempo nesta semana</small><div class="stat">${timeMin}<span class="stat-suffix">min</span></div></div></div>
 <div class="quick-actions"><button class="quick-action" onclick="createPlan()"><span class="quick-icon">＋</span>Nova ficha</button><button class="quick-action" onclick="tab('library')"><span class="quick-icon">⌑</span>Biblioteca</button><button class="quick-action" onclick="tab('history')"><span class="quick-icon">◷</span>Histórico</button></div>
 <div class="section-header"><h2>Minhas fichas</h2><button class="action-link" onclick="createPlan()">+ Nova ficha</button></div><div class="plan-list">${db.plans.map((p,idx)=>{const match=String(p.name||'').match(/Treino\s+([A-Z])/i),letter=match?match[1].toUpperCase():'✓';return `<div class="card plan-card"><div class="plan-card-top"><div class="plan-letter">${esc(letter)}</div><div style="flex:1;min-width:0"><h3>${esc(p.name)}</h3><div class="plan-meta">${esc(p.day||'Sem dia definido')}${p.focus?' · '+esc(p.focus):''}</div></div></div><div class="plan-tags"><span class="pill pill-neutral">${p.exercises.length} exercícios</span>${p.durationEstimate?`<span class="pill pill-neutral">${esc(p.durationEstimate)}</span>`:''}</div>${p.notes?`<p class="plan-note">${esc(p.notes)}</p>`:''}<div class="plan-foot"><button onclick='startPlan(${buttonArg(p.id)})'>Iniciar</button><button class="secondary" onclick='showPlan(${buttonArg(p.id)})'>Ver ficha</button><button class="plan-more secondary" onclick='editPlan(${buttonArg(p.id)})' title="Editar">✎</button></div><details class="plan-menu"><summary>Mais ações ▾</summary><div class="actions"><button class="secondary smallbtn" onclick='editPlan(${buttonArg(p.id)})'>Editar</button><button class="outline smallbtn" onclick='duplicatePlan(${buttonArg(p.id)})'>Duplicar</button><button class="outline smallbtn" onclick='movePlan(${buttonArg(p.id)},-1)' ${idx===0?'disabled':''}>↑</button><button class="outline smallbtn" onclick='movePlan(${buttonArg(p.id)},1)' ${idx===db.plans.length-1?'disabled':''}>↓</button><button class="danger smallbtn" onclick='deletePlan(${buttonArg(p.id)})'>Excluir</button></div></details></div>`}).join('')||`<div class="card empty"><span class="empty-icon">▦</span><strong>Nenhuma ficha cadastrada</strong>Crie uma ficha nova ou importe seu treino.<br><button onclick="createPlan()">Criar ficha</button></div>`}</div>`;
}
function session(){
 const a=db.active;
 if(!a){$('session').innerHTML=`<div class="eyebrow">SESSÃO DE TREINO</div><h1>Hora de treinar</h1><div class="card empty"><span class="empty-icon">◉</span><strong>Nenhum treino em andamento</strong>Abra a aba Hoje e escolha uma ficha para iniciar.<br><button onclick="tab('home')">Ver minhas fichas</button></div>`;return}
 const all=a.items.flatMap(x=>x.sets),done=all.filter(x=>x.done).length,pct=all.length?done/all.length*100:0;
 $('session').innerHTML=`<div class="eyebrow">${a.status==='paused'?'SESSÃO PAUSADA':'TREINO EM ANDAMENTO'}</div><h1>${esc(a.planName||'Meu treino')}</h1>
 <div class="session-summary"><div class="row"><div class="session-status"><span class="status-dot ${a.status==='paused'?'paused':''}"></span><strong>${done} de ${all.length} séries feitas</strong></div><span class="session-clock" id="elapsed">${formatTime(elapsed())}</span></div><div class="progress" style="margin-top:14px"><div style="width:${pct}%"></div></div><div class="actions"><button class="secondary" onclick="pauseResume()">${a.status==='paused'?'▶ Retomar':'Ⅱ Pausar'}</button><button onclick="finish()">Concluir treino ✓</button></div></div>
 ${a.items.map((item,i)=>{const prev=lastSets(item.id);const count=item.sets.filter(s=>s.done).length;
 return `<div class="card exercise-card" id="exercise-${i}"><div class="exercise-head"><div class="exercise-title"><div class="exercise-index">${i+1}</div><div><div class="exercise-name">${exerciseBadge(item)}${esc(item.name||ex(item.id).name)}</div><div class="exercise-subtitle">${esc(item.repsTarget||'')} repetições · ${esc(item.restMin&&item.restMax&&item.restMin!==item.restMax?item.restMin+'–'+item.restMax:item.rest)}s descanso${item.rirTarget?' · RIR '+esc(item.rirTarget):''}</div></div></div><span class="pill ${count===item.sets.length?'':'pill-neutral'}">${count}/${item.sets.length}</span></div>
 ${item.notes?`<div class="note">${esc(item.notes)}</div>`:''}
 <div class="setrow setrow-header"><span>#</span><span>Carga (kg)</span><span>Reps</span><span>Feita</span><span></span></div>
 ${item.sets.map((s,j)=>`<div class="setrow ${s.done?'completed':''}"><span class="set-number">${j+1}</span><input inputmode="decimal" value="${esc(s.weight)}" placeholder="0" onchange="updateSet(${i},${j},'weight',this.value)"><input inputmode="numeric" value="${esc(s.reps)}" placeholder="0" onchange="updateSet(${i},${j},'reps',this.value)"><label class="donebox" style="margin:0"><input class="check" type="checkbox" ${s.done?'checked':''} onchange="updateSet(${i},${j},'done',this.checked)"></label><button class="delete-set" onclick="removeSet(${i},${j})">×</button></div>${prev[j]?`<div class="prev-line">Última vez: ${esc(prev[j].weight||'—')} kg × ${esc(prev[j].reps||'—')} reps</div>`:''}`).join('')}
 <div class="actions" style="margin-top:12px"><button class="secondary smallbtn" onclick="addSet(${i})">+ Série</button><button class="outline smallbtn" onclick="startRest(${Number(item.rest)||0})">◷ Descanso ${Number(item.rest)||0}s</button><button class="outline smallbtn" onclick='showExercise(${buttonArg(item.id)},"library")'>Detalhes</button></div></div>`}).join('')}
 <div class="card"><h3>Como foi o treino?</h3><label for="sessionNotes">Observações (opcional)</label><textarea id="sessionNotes" rows="3" placeholder="Ex.: carga fácil, equipamento ocupado..." onchange="db.active.notes=this.value;save()">${esc(a.notes||'')}</textarea><div class="actions" style="margin-top:14px"><button onclick="finish()">✓ Concluir treino</button><button class="danger" onclick="discard()">Descartar</button></div></div>`;
 updateClock();
}
function newLibraryExercise(backPlanId){
 const id='custom-'+uid();
 db.library.push({id,name:'Novo exercício',group:'Outros',equipment:'',originalNumber:'',notes:'',mediaStatus:'manual'});
 save(); showExercise(id, backPlanId?`home-plan-${backPlanId}`:'library');
}
function library(){
 const groups=[...new Set(db.library.map(e=>e.group||'Outros'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 const mc=mediaCount();
 $('library').innerHTML=`<div class="eyebrow">MOVIMENTOS E APARELHOS</div><h1>Biblioteca visual</h1><p class="section-intro">Revise os 161 exercícios, associe fotos reais dos aparelhos e salve links de demonstração.</p>
 <div class="grid"><div class="card statcard"><small>Exercícios com foto</small><div class="stat">${mc.img}</div></div><div class="card statcard"><small>Com demonstração</small><div class="stat">${mc.vid}</div></div></div>
 <div class="card"><div class="actions"><button onclick="newLibraryExercise()">+ Novo exercício</button><button class="secondary" onclick="tab('settings')">Importar JSON</button></div><label for="q">Buscar por nome, número ou equipamento</label><input id="q" type="search" autocomplete="off" placeholder="Ex.: 83, hammer ou panturrilha" value="${esc(searchText)}" oninput="searchText=this.value;filterLibrary(true)"><div class="grid form-grid-1"><div><label for="group">Grupo muscular</label><select id="group" onchange="groupFilter=this.value;filterLibrary(true)"><option value="">Todos os grupos</option>${groups.map(g=>`<option value="${esc(g)}" ${g===groupFilter?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div><label for="mediaFilter">Mídia</label><select id="mediaFilter" onchange="mediaFilter=this.value;filterLibrary(true)"><option value="all" ${mediaFilter==='all'?'selected':''}>Todos</option><option value="with-image" ${mediaFilter==='with-image'?'selected':''}>Com foto</option><option value="with-video" ${mediaFilter==='with-video'?'selected':''}>Com demonstração</option><option value="pending" ${mediaFilter==='pending'?'selected':''}>Sem mídia</option></select></div></div></div><div id="libResults"></div>`;
 filterLibrary();
}
function filterLibrary(reset=false){
 if(reset)libraryDisplayLimit=60;
 const q=searchText.trim().toLocaleLowerCase('pt-BR');
 let items=db.library.filter(e=>(!groupFilter||e.group===groupFilter)&&`${e.name} ${e.originalNumber??''} ${e.equipment||''}`.toLocaleLowerCase('pt-BR').includes(q));
 if(mediaFilter==='with-image') items=items.filter(e=>e.image);
 if(mediaFilter==='with-video') items=items.filter(e=>e.video);
 if(mediaFilter==='pending') items=items.filter(e=>!e.image&&!e.video);
 items.sort((a,b)=>{
  const an=a.originalNumber===''||a.originalNumber==null?9999:Number(a.originalNumber);
  const bn=b.originalNumber===''||b.originalNumber==null?9999:Number(b.originalNumber);
  if(an!==bn) return an-bn;
  return String(a.name).localeCompare(String(b.name),'pt-BR');
 });
 $('libResults').innerHTML=`<div class="lib-count">${items.length} ${items.length===1?'exercício encontrado':'exercícios encontrados'}</div>${items.slice(0,libraryDisplayLimit).map(e=>`<div class="card lib-card"><div class="lib-body">${e.image?`<img class="thumb" src="${esc(e.image)}" alt="${esc(e.name)}" loading="lazy">`:'<div class="thumb placeholder" aria-hidden="true">⌑</div>'}<div style="min-width:0"><b>${exerciseBadge(e)}${esc(e.name)}</b><div class="muted tiny">${esc(e.group)}${e.equipment&&e.equipment!=='Consultar demonstração'?' · '+esc(e.equipment):''}</div><div class="plan-tags" style="margin-top:6px">${e.image?'<span class="pill">Foto</span>':''}${e.video?'<span class="pill pill-neutral">Demonstração</span>':''}${!e.image&&!e.video?'<span class="pill pill-warn">Pendente</span>':''}</div></div></div><div class="actions"><button class="secondary smallbtn" onclick='showExercise(${buttonArg(e.id)},"library")'>Ver</button><button class="outline smallbtn" onclick='openExerciseEditor(${buttonArg(e.id)},"library")'>Editar</button></div></div>`).join('')||'<div class="card empty">Nenhum exercício encontrado.</div>'}${items.length>libraryDisplayLimit?`<button class="secondary action-full" onclick="libraryDisplayLimit+=60;filterLibrary()">Mostrar mais (${items.length-libraryDisplayLimit} restantes)</button>`:''}`;
}
function openSearchLinks(exercise){
 const term=encodeURIComponent(`${exercise.name} ${exercise.equipment||''}`.trim());
 window.open(`https://www.youtube.com/results?search_query=${term}`,'_blank','noopener');
}
function showExercise(id,from='library'){
 const e=getLib(id)||ex(id); if(!e) return;
 const usedIn=db.plans.filter(p=>p.exercises.some(x=>x.id===id)).map(p=>p.name);
 const targetSection = from.startsWith('home-plan-') ? 'home' : from;
 $(targetSection).innerHTML=`<button class="secondary smallbtn" onclick="${from.startsWith('home-plan-')?`editPlan(${buttonArg(from.replace('home-plan-',''))})`:`tab('${targetSection}')`}">← Voltar</button>
 <div class="eyebrow" style="margin-top:16px">EXERCÍCIO DA BIBLIOTECA</div><h1>${exerciseBadge(e)}${esc(e.name)}</h1><p class="section-intro">${esc(e.group||'Outros')}${e.equipment?` · ${esc(e.equipment)}`:''}</p>
 <div class="card">${e.image?`<img src="${esc(e.image)}" alt="${esc(e.name)}" style="width:100%;max-height:300px;object-fit:contain;border-radius:14px;background:#f7faf9">`:'<div class="empty empty-compact"><span class="empty-icon">⌑</span><strong>Sem foto cadastrada</strong>Adicione uma imagem real do aparelho para facilitar a identificação.</div>'}
 <div class="actions" style="margin-top:12px"><button class="secondary" onclick='promptImageURL(${buttonArg(id)},${buttonArg(from)})'>URL da foto</button><button class="outline" onclick='pickExerciseImage(${buttonArg(id)},${buttonArg(from)})'>Escolher foto</button>${e.image?`<button class="danger" onclick='removeExerciseImage(${buttonArg(id)},${buttonArg(from)})'>Remover foto</button>`:''}</div>${e.imageSource?`<p class="muted tiny" style="margin-top:10px">Imagem de referência · associação provisória · <a href="${esc(e.imageSource)}" target="_blank" rel="noopener noreferrer">Ver fonte</a></p>`:''}</div>
 <div class="card"><h3>Demonstração</h3>${e.video?`<p><a href="${esc(e.video)}" target="_blank" rel="noopener noreferrer">Abrir link salvo</a></p>`:'<p class="muted tiny">Nenhum link salvo ainda.</p>'}<div class="actions"><button class="secondary" onclick='promptVideoURL(${buttonArg(id)},${buttonArg(from)})'>Salvar link</button><button class="outline" onclick='openSearchLinks(${JSON.stringify(e).replace(/'/g,'\\u0027')})'>Buscar demonstração</button>${e.video?`<button class="danger" onclick='removeVideoURL(${buttonArg(id)},${buttonArg(from)})'>Remover link</button>`:''}</div></div>
 <div class="card"><h3>Dados do exercício</h3><p class="muted tiny">Código: ${e.originalNumber??'—'} · Grupo: ${esc(e.group||'Outros')} · Equipamento: ${esc(e.equipment||'Não informado')}</p>${e.notes?`<div class="note">${esc(e.notes)}</div>`:''}<div class="actions" style="margin-top:12px"><button onclick='openExerciseEditor(${buttonArg(id)},${buttonArg(from)})'>Editar exercício</button><button class="danger" onclick='deleteExerciseFromLibrary(${buttonArg(id)},${buttonArg(from)})'>Excluir da biblioteca</button></div></div>
 <div class="card"><h3>Usado em fichas</h3>${usedIn.length?usedIn.map(n=>`<div class="entry">${esc(n)}</div>`).join(''):'<p class="muted tiny">Ainda não está em nenhuma ficha.</p>'}
 <h3 style="margin-top:12px">Seu histórico</h3>${db.history.flatMap(h=>h.items.filter(i=>i.id===id).map(i=>({h,i}))).slice(0,5).map(({h,i})=>`<div class="entry"><small>${today(h.ended)}</small><p>${i.sets.filter(s=>s.done).map(s=>`${esc(s.weight||'—')}kg × ${esc(s.reps||'—')}`).join(' · ')||'Sem séries concluídas'}</p></div>`).join('')||'<p class="muted tiny">Nenhuma execução registrada.</p>'}</div>`;
}
function openExerciseEditor(id,from='library'){
 const e=getLib(id); if(!e) return;
 const target = from.startsWith('home-plan-')?'home':from;
 $(target).innerHTML=`<button class="secondary smallbtn" onclick='showExercise(${buttonArg(id)},${buttonArg(from)})'>← Voltar ao exercício</button><div class="eyebrow" style="margin-top:16px">EDITAR BIBLIOTECA</div><h1>${exerciseBadge(e)}${esc(e.name)}</h1><div class="card"><label for="libName">Nome do exercício</label><input id="libName" value="${esc(e.name||'')}"><div class="grid form-grid-1"><div><label for="libNumber">Código / número</label><input id="libNumber" value="${esc(e.originalNumber??'')}"></div><div><label for="libGroup">Grupo muscular</label><input id="libGroup" value="${esc(e.group||'Outros')}"></div></div><label for="libEquipment">Equipamento</label><input id="libEquipment" value="${esc(e.equipment||'')}"><label for="libVideo">Link de demonstração</label><input id="libVideo" value="${esc(e.video||'')}" placeholder="https://..."><label for="libNotes">Observações</label><textarea id="libNotes" rows="4">${esc(e.notes||'')}</textarea><div class="actions" style="margin-top:12px"><button onclick='saveExerciseEdit(${buttonArg(id)},${buttonArg(from)})'>Salvar alterações</button><button class="outline" onclick='pickExerciseImage(${buttonArg(id)},${buttonArg(from)})'>Escolher foto</button></div></div>`;
}
function saveExerciseEdit(id,from='library'){
 const e=getLib(id); if(!e) return;
 const name=$('libName').value.trim(); if(!name) return notice('Informe o nome do exercício.');
 e.name=name;
 const number=$('libNumber').value.trim(); e.originalNumber=number===''?'':isNaN(Number(number))?number:Number(number);
 e.group=$('libGroup').value.trim()||'Outros';
 e.equipment=$('libEquipment').value.trim();
 e.video=$('libVideo').value.trim();
 e.notes=$('libNotes').value.trim();
 if(e.image||e.video) e.mediaStatus='revisado';
 // reflect names/numbers inside plans that use the same id
 db.plans.forEach(p=>p.exercises.forEach(x=>{ if(x.id===id){ x.name=e.name; x.originalNumber=e.originalNumber; }}));
 save(); notice('Exercício salvo.'); showExercise(id,from);
}
function promptImageURL(id,from='library'){
 const e=getLib(id); if(!e) return; const val=prompt('Cole a URL da imagem do aparelho:', e.image&&/^https?:/i.test(e.image)?e.image:'');
 if(val===null) return; if(!val.trim()) return notice('URL não informada.');
 e.image=val.trim(); e.imageSource=''; e.mediaCatalogTag=''; e.imageKind='manual'; e.mediaStatus='revisado'; save(); showExercise(id,from); notice('Imagem atualizada.');
}
function pickExerciseImage(id,from='library'){
 imageExerciseTargetId=id; window.__exerciseImageFrom=from; const input=$('exerciseImageInput'); if(input) input.click();
}
function removeExerciseImage(id,from='library'){ const e=getLib(id); if(!e) return; if(!confirm('Remover a foto deste exercício?')) return; delete e.image; e.imageSource=''; e.mediaCatalogTag=''; save(); showExercise(id,from); }
function promptVideoURL(id,from='library'){ const e=getLib(id); if(!e) return; const val=prompt('Cole o link da demonstração:', e.video||''); if(val===null) return; e.video=val.trim(); if(e.video) e.mediaStatus='revisado'; save(); showExercise(id,from); }
function removeVideoURL(id,from='library'){ const e=getLib(id); if(!e) return; if(!confirm('Remover o link de demonstração?')) return; delete e.video; save(); showExercise(id,from); }
function handleExerciseImageFile(ev){
 const file=ev.target.files?.[0]; ev.target.value='';
 if(!file||!imageExerciseTargetId) return;
 const reader=new FileReader();
 reader.onload=async ()=>{
  const e=getLib(imageExerciseTargetId); if(!e) return;
  e.image=String(reader.result); e.imageSource=''; e.mediaCatalogTag=''; e.imageKind='manual'; e.mediaStatus='revisado';
  await save(); const from=window.__exerciseImageFrom||'library'; notice('Foto salva no exercício.'); showExercise(imageExerciseTargetId,from);
  imageExerciseTargetId=null;
 };
 reader.readAsDataURL(file);
}
function deleteExerciseFromLibrary(id,from='library'){
 const used=db.plans.some(p=>p.exercises.some(e=>e.id===id));
 const msg=used?'Este exercício está em uma ou mais fichas. Se você excluir, ele será removido da biblioteca, mas continuará nos históricos e nas fichas apenas pelo nome salvo. Deseja continuar?':'Excluir este exercício da biblioteca?';
 if(!confirm(msg)) return;
 db.library=db.library.filter(e=>e.id!==id);
 save(); notice('Exercício excluído da biblioteca.');
 if(from.startsWith('home-plan-')) editPlan(from.replace('home-plan-','')); else tab('library');
}
function history(){
 const total=db.history.length;
 $('history').innerHTML=`<div class="eyebrow">SESSÕES REGISTRADAS</div><h1>Histórico</h1><p class="section-intro">${total} ${total===1?'treino concluído':'treinos concluídos'}. Seus registros são preservados quando a ficha muda.</p>
 ${db.history.map((h,i)=>`<div class="card"><div class="row"><div><h3 style="margin:0 0 5px">${esc(h.planName||db.plans.find(p=>p.id===h.planId)?.name||'Treino')}</h3><div class="plan-meta">${date(h.ended)}</div></div><span class="pill pill-neutral">${Math.round((h.durationSeconds??mins(h.started,h.ended)*60)/60)} min</span></div><div class="plan-tags"><span class="pill">${completedSets(h).length} séries concluídas</span><span class="pill pill-neutral">${h.items?.length||0} exercícios</span></div>${h.notes?`<p class="note">${esc(h.notes)}</p>`:''}<details style="margin-top:9px"><summary>Ver exercícios e cargas ▾</summary>${(h.items||[]).map(e=>`<div class="entry"><b>${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</b><div class="muted tiny" style="margin-top:5px">${(e.sets||[]).filter(s=>s.done).map(s=>`${esc(s.weight||'—')} kg × ${esc(s.reps||'—')} reps`).join(' · ')||'Nenhuma série marcada'}</div></div>`).join('')}<button class="danger smallbtn" style="margin-top:10px" onclick="deleteHistory(${i})">Excluir registro</button></details></div>`).join('')||`<div class="card empty"><span class="empty-icon">◷</span><strong>Seu histórico começa no primeiro treino.</strong>Assim que concluir uma sessão, ela aparecerá aqui.<br><button onclick="tab('home')">Escolher treino</button></div>`}`;
}
function stats(){
 let cutoff=Date.now()-7*86400000, recent=db.history.filter(h=>new Date(h.ended).getTime()>=cutoff), volume=recent.reduce((n,h)=>n+completedSets(h).reduce((a,s)=>a+(Number(String(s.weight).replace(',','.'))||0)*(Number(s.reps)||0),0),0), series=recent.reduce((n,h)=>n+completedSets(h).length,0), byGroup={};
 for(let h of recent)for(let item of h.items){let group=ex(item.id).group;byGroup[group]=(byGroup[group]||0)+item.sets.filter(s=>s.done&&!s.warmup).length}
 let entries=Object.entries(byGroup).sort((a,b)=>b[1]-a[1]);let exids=[...new Set(db.history.flatMap(h=>h.items.map(i=>i.id)))];
 $('stats').innerHTML=`<div class="eyebrow">EVOLUÇÃO</div><h1>Desempenho</h1><p class="section-intro">Resumo dos últimos 7 dias.</p><div class="grid"><div class="card statcard"><small>Treinos</small><div class="stat">${recent.length}</div></div><div class="card statcard"><small>Séries</small><div class="stat">${series}</div></div><div class="card statcard"><small>Volume</small><div class="stat">${Math.round(volume).toLocaleString('pt-BR')}</div></div><div class="card statcard"><small>Tempo total</small><div class="stat">${Math.round(recent.reduce((n,h)=>n+(h.durationSeconds||0),0)/60)}<span class="stat-suffix">min</span></div></div></div><div class="card"><h3>Séries por grupo muscular</h3>${entries.map(([g,n])=>`<div style="margin-top:12px"><div class="row tiny"><span>${esc(g)}</span><b>${n}</b></div><div class="progress"><div style="width:${entries[0]?100*n/entries[0][1]:0}%"></div></div></div>`).join('')||'<p class="muted">Sem dados nesta semana.</p>'}</div><div class="card"><h3>Evolução de carga por exercício</h3><label>Exercício</label><select id="chartEx" onchange="drawChart(this.value)"><option value="">Selecione</option>${exids.map(id=>`<option value="${esc(id)}">${esc(ex(id).name)}</option>`).join('')}</select><div id="chartArea" class="muted tiny" style="margin-top:14px">Selecione um exercício para visualizar a maior carga de cada sessão.</div></div>`;
}

function removeDemoPlans(){
 if(!db.plans.some(isDemoPlan)) return;
 if(!confirm('Remover a ficha demonstrativa? O histórico será mantido.')) return;
 db.plans=db.plans.filter(p=>!isDemoPlan(p));
 save(); notice('Ficha demonstrativa removida.'); settings();
}

function settings(){
 const mc=mediaCount();
 $('settings').innerHTML=`<div class="eyebrow">CONFIGURAÇÕES E FERRAMENTAS</div><h1>Mais opções</h1><p class="section-intro">Importe treinos, revise a biblioteca e proteja seus dados.</p>
 <div class="card"><h3>Biblioteca visual</h3><div class="link-row"><div><strong>Revisar exercícios</strong><p>${db.library.length} itens · ${mc.img} com foto · ${mc.vid} com demonstração</p></div><button class="secondary smallbtn" onclick="tab('library')">Abrir →</button></div></div>
 <div class="card"><h3>Importar treino</h3><p class="muted tiny">Selecione o JSON que preparo para você. Você poderá revisar e escolher como importar antes de salvar.</p><button class="action-full" onclick="$('import').click()">Selecionar arquivo JSON →</button><div id="importPreview"></div></div>
 <div class="card"><h3>Backup completo</h3><p class="muted tiny">Inclui fichas, biblioteca, histórico, imagens anexadas e sessão ativa.</p><button class="secondary action-full" onclick="exportJSON()">↓ Exportar backup completo</button></div>
 <div class="card"><h3>Ferramentas</h3><div class="link-row"><div><strong>Criar nova ficha</strong><p>Monte seu treino diretamente no app</p></div><button class="outline smallbtn" onclick="createPlan()">Criar</button></div><div class="link-row"><div><strong>Novo exercício na biblioteca</strong><p>Cadastre um aparelho ou variação nova</p></div><button class="outline smallbtn" onclick="newLibraryExercise()">Criar</button></div><div class="link-row"><div><strong>Modelo de JSON</strong><p>Exemplo para importar fichas</p></div><button class="outline smallbtn" onclick="downloadTemplate()">Baixar</button></div>${db.plans.some(isDemoPlan)?`<div class="link-row"><div><strong>Remover ficha demonstrativa</strong><p>Exclui só o exemplo, sem apagar o histórico</p></div><button class="danger smallbtn" onclick="removeDemoPlans()">Remover</button></div>`:''}</div>
 <div class="note">No PWA, a forma mais estável de manter imagens reais dos aparelhos é salvar a foto diretamente no exercício ou informar a URL da imagem. Isso evita depender de links externos instáveis.</div>
 <p class="footer-note">Meu Treino · versão ${APP_VERSION}</p>`;
}

window.addEventListener('DOMContentLoaded',()=>{
 const input=$('exerciseImageInput');
 if(input) input.addEventListener('change',handleExerciseImageFile);
});

// Inicialização permanece controlada pelo app.js
init();
