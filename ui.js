'use strict';
// Camada visual v4.0 — mantém intactos os dados e a lógica de registro da v3.1.
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
const buttonArg=id=>JSON.stringify(id).replace(/'/g,'\\u0027');
function home(){
 const weekdays=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
 const todayName=weekdays[new Date().getDay()];
 const weekStart=new Date();weekStart.setHours(0,0,0,0);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
 const weekly=db.history.filter(h=>new Date(h.ended)>=weekStart);
 const timeMin=Math.round(weekly.reduce((n,h)=>n+(h.durationSeconds??mins(h.started,h.ended)*60),0)/60);
 const plain=s=>String(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const recommended=db.plans.find(p=>plain(p.day).includes(plain(todayName)))||db.plans[0];
 const a=db.active;
 const hero=a?`<div class="card hero"><div class="hero-caption">Sua sessão</div><div class="row"><h1>${esc(a.planName||'Treino iniciado')}</h1><span class="pill">${a.status==='paused'?'Pausado':'Em andamento'}</span></div><p>${a.items.flatMap(x=>x.sets).filter(s=>s.done).length} séries concluídas. Continue de onde parou.</p><button class="hero-action" onclick="tab('session')">Continuar treino →</button></div>`:
 recommended?`<div class="card hero"><div class="hero-caption">${esc(todayName)} · Seu próximo treino</div><h1>${esc(recommended.name)}</h1><p>${esc(recommended.focus||'Sua ficha está pronta')}${recommended.durationEstimate?' · '+esc(recommended.durationEstimate):''}</p><button class="hero-action" onclick='startPlan(${buttonArg(recommended.id)})'>Iniciar treino →</button></div>`:
 `<div class="card hero"><div class="hero-caption">BEM-VINDO</div><h1>Seu próximo treino começa aqui.</h1><p>Importe uma ficha ou crie seu primeiro programa.</p><button class="hero-action" onclick="tab('settings')">Importar meu treino →</button></div>`;
 $('home').innerHTML=`<div class="eyebrow">PAINEL DE TREINO</div><h1>Vamos treinar?</h1><p class="section-intro">Tudo o que você precisa, sem complicação.</p>${hero}
 <div class="grid"><div class="card statcard"><small>Treinos nesta semana</small><div class="stat">${weekly.length}<span class="stat-suffix">sessões</span></div></div><div class="card statcard"><small>Tempo nesta semana</small><div class="stat">${timeMin}<span class="stat-suffix">min</span></div></div></div>
 <div class="quick-actions"><button class="quick-action" onclick="tab('history')"><span class="quick-icon">◷</span>Histórico</button><button class="quick-action" onclick="tab('stats')"><span class="quick-icon">↗</span>Evolução</button><button class="quick-action" onclick="tab('settings')"><span class="quick-icon">↥</span>Importar</button></div>
 <div class="section-header"><h2>Minhas fichas</h2><button class="action-link" onclick="newPlan()">+ Nova ficha</button></div><div class="plan-list">
 ${db.plans.map(p=>{const match=String(p.name||'').match(/Treino\s+([A-Z])/i),letter=match?match[1].toUpperCase():'✓';return `<div class="card plan-card"><div class="plan-card-top"><div class="plan-letter">${esc(letter)}</div><div style="flex:1;min-width:0"><h3>${esc(p.name)}</h3><div class="plan-meta">${esc(p.day||'Sem dia definido')}${p.focus?' · '+esc(p.focus):''}</div></div></div>
 <div class="plan-tags"><span class="pill pill-neutral">${p.exercises.length} exercícios</span>${p.durationEstimate?`<span class="pill pill-neutral">${esc(p.durationEstimate)}</span>`:''}</div>
 <div class="plan-foot"><button onclick='startPlan(${buttonArg(p.id)})'>Iniciar</button><button class="secondary" onclick='showPlan(${buttonArg(p.id)})'>Ver ficha</button></div>
 <details class="plan-menu"><summary>Editar ou excluir ficha ▾</summary><div class="actions"><button class="secondary smallbtn" onclick='editPlan(${buttonArg(p.id)})'>Editar</button><button class="danger smallbtn" onclick='deletePlan(${buttonArg(p.id)})'>Excluir</button></div></details></div>`}).join('')||`<div class="card empty"><span class="empty-icon">▦</span><strong>Nenhuma ficha cadastrada</strong>Importe seu treino ou crie uma nova ficha.<br><button onclick="tab('settings')">Importar treino</button></div>`}</div>`;
}
function showPlan(id){
 const p=db.plans.find(x=>x.id===id);if(!p)return;
 $('home').innerHTML=`<button class="secondary smallbtn" onclick="home()">← Voltar às fichas</button><div class="eyebrow" style="margin-top:20px">FICHA DE TREINO</div><h1>${esc(p.name)}</h1><p class="section-intro">${esc([p.day,p.focus,p.durationEstimate].filter(Boolean).join(' · '))}</p>
 ${p.notes?`<div class="note">${esc(p.notes)}</div>`:''}
 ${p.exercises.map((e,i)=>`<div class="card exercise-card"><div class="exercise-title"><div class="exercise-index">${i+1}</div><div><div class="exercise-name">${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</div><div class="exercise-subtitle">${esc(e.sets)} séries × ${esc(e.reps)} reps · Descanso: ${esc(e.restMin&&e.restMax&&e.restMin!==e.restMax?e.restMin+'–'+e.restMax:e.rest??60)} s${e.rirTarget?' · RIR '+esc(e.rirTarget):''}</div></div></div>${e.notes?`<p class="note">${esc(e.notes)}</p>`:''}</div>`).join('')}
 <button class="action-full" onclick='startPlan(${buttonArg(p.id)})'>Iniciar ${esc(p.name)} →</button><button class="secondary action-full" style="margin-top:8px" onclick='editPlan(${buttonArg(p.id)})'>Editar esta ficha</button>`;
}
function editPlan(id){planEditor(id)}
function savePlanInfo(id){const p=db.plans.find(x=>x.id===id);if(!p)return;const name=$('editPlanName')?.value.trim();if(!name)return notice('Informe o nome da ficha.');p.name=name;p.day=$('editPlanDay').value.trim();p.focus=$('editPlanFocus').value.trim();p.notes=$('editPlanNotes').value.trim();save();notice('Ficha atualizada!');planEditor(id)}
function planEditor(id){
 const p=db.plans.find(x=>x.id===id);if(!p)return;
 $('home').innerHTML=`<button class="secondary smallbtn" onclick="home()">← Voltar às fichas</button><h2>Editar ficha</h2>
 <div class="card"><label for="editPlanName">Nome da ficha</label><input id="editPlanName" value="${esc(p.name)}"><label for="editPlanDay">Dia da semana</label><input id="editPlanDay" value="${esc(p.day||'')}" placeholder="Ex.: Segunda-feira"><label for="editPlanFocus">Grupos trabalhados</label><input id="editPlanFocus" value="${esc(p.focus||'')}" placeholder="Ex.: Peito e tríceps"><label for="editPlanNotes">Orientações gerais</label><textarea id="editPlanNotes" rows="3">${esc(p.notes||'')}</textarea><button style="margin-top:12px" class="action-full" onclick='savePlanInfo(${buttonArg(id)})'>Salvar informações</button></div>
 <h2>Exercícios (${p.exercises.length})</h2>
 ${p.exercises.map((e,i)=>`<div class="card"><div class="exercise-name">${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</div><p class="exercise-subtitle">${esc(e.sets)} séries · ${esc(e.reps)} reps · ${esc(e.rest??60)}s descanso</p><div class="actions"><button class="secondary smallbtn" onclick='editPlanExercise(${buttonArg(id)},${i})'>Alterar séries</button><button class="outline smallbtn" onclick='moveExercise(${buttonArg(id)},${i},-1)' aria-label="Mover para cima">↑</button><button class="outline smallbtn" onclick='moveExercise(${buttonArg(id)},${i},1)' aria-label="Mover para baixo">↓</button><button class="danger smallbtn" onclick='removeExercise(${buttonArg(id)},${i})'>Excluir</button></div></div>`).join('')}
 <div class="card"><h3>Adicionar exercício</h3><label for="planSearch">Buscar por nome ou número</label><input id="planSearch" placeholder="Ex.: 83 ou Supino" oninput='planResults(${buttonArg(id)})'><div id="planMatches"></div></div><button class="secondary action-full" onclick="home()">Concluir edição</button>`;
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
 ${item.sets.map((s,j)=>`<div class="setrow ${s.done?'completed':''}"><span class="set-number">${j+1}</span><input inputmode="decimal" aria-label="Carga da série ${j+1} do ${esc(item.name)}" value="${esc(s.weight)}" placeholder="0" onchange="updateSet(${i},${j},'weight',this.value)"><input inputmode="numeric" aria-label="Repetições da série ${j+1}" value="${esc(s.reps)}" placeholder="0" onchange="updateSet(${i},${j},'reps',this.value)"><label class="donebox" aria-label="Marcar série ${j+1} concluída" style="margin:0"><input class="check" type="checkbox" ${s.done?'checked':''} onchange="updateSet(${i},${j},'done',this.checked)"></label><button class="delete-set" onclick="removeSet(${i},${j})" aria-label="Remover série ${j+1}">×</button></div>${prev[j]?`<div class="prev-line">Última vez: ${esc(prev[j].weight||'—')} kg × ${esc(prev[j].reps||'—')} reps</div>`:''}`).join('')}
 <div class="actions" style="margin-top:12px"><button class="secondary smallbtn" onclick="addSet(${i})">+ Série</button><button class="outline smallbtn" onclick="startRest(${Number(item.rest)||0})">◷ Descanso ${Number(item.rest)||0}s</button><button class="outline smallbtn" onclick='showExercise(${buttonArg(item.id)},"session")'>Detalhes</button></div></div>`}).join('')}
 <div class="card"><h3>Como foi o treino?</h3><label for="sessionNotes">Observações (opcional)</label><textarea id="sessionNotes" rows="3" placeholder="Ex.: carga fácil, equipamento ocupado..." onchange="db.active.notes=this.value;save()">${esc(a.notes||'')}</textarea><div class="actions" style="margin-top:14px"><button onclick="finish()">✓ Concluir treino</button><button class="danger" onclick="discard()">Descartar</button></div></div>`;
 updateClock();
}
function library(){
 const groups=[...new Set(db.library.map(e=>e.group))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 $('library').innerHTML=`<div class="eyebrow">MOVIMENTOS E APARELHOS</div><h1>Biblioteca</h1><p class="section-intro">Consulte ${db.library.length} exercícios e localize cada aparelho pelo número original.</p>
 <div class="card"><label for="q">O que você procura?</label><input id="q" type="search" autocomplete="off" placeholder="Nome ou número, ex.: 83" value="${esc(searchText)}" oninput="searchText=this.value;filterLibrary(true)"><label for="group">Grupo muscular</label><select id="group" onchange="groupFilter=this.value;filterLibrary(true)"><option value="">Todos os grupos</option>${groups.map(g=>`<option value="${esc(g)}" ${g===groupFilter?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div id="libResults"></div>`;
 filterLibrary();
}
function filterLibrary(reset=false){
 if(reset)libraryDisplayLimit=60;
 const q=searchText.trim().toLocaleLowerCase('pt-BR');
 const items=db.library.filter(e=>(!groupFilter||e.group===groupFilter)&&`${e.name} ${e.originalNumber??''} ${e.equipment||''}`.toLocaleLowerCase('pt-BR').includes(q));
 $('libResults').innerHTML=`<div class="lib-count">${items.length} ${items.length===1?'exercício encontrado':'exercícios encontrados'}</div>${items.slice(0,libraryDisplayLimit).map(e=>`<div class="card lib-card"><div class="lib-body">${e.image?`<img class="thumb" src="${esc(e.image)}" alt="${esc(e.name)}" loading="lazy">`:'<div class="thumb placeholder" aria-hidden="true">⌑</div>'}<div style="min-width:0"><b>${exerciseBadge(e)}${esc(e.name)}</b><div class="muted tiny">${esc(e.group)}${e.equipment&&e.equipment!=='Consultar demonstração'?' · '+esc(e.equipment):''}</div></div></div><button class="secondary smallbtn" onclick='showExercise(${buttonArg(e.id)},"library")'>Ver</button></div>`).join('')||'<div class="card empty">Nenhum exercício encontrado. Tente outro nome ou número.</div>'}
 ${items.length>libraryDisplayLimit?`<button class="secondary action-full" onclick="libraryDisplayLimit+=60;filterLibrary()">Mostrar mais (${items.length-libraryDisplayLimit} restantes)</button>`:''}`;
}
function history(){
 const total=db.history.length;
 $('history').innerHTML=`<div class="eyebrow">SESSÕES REGISTRADAS</div><h1>Histórico</h1><p class="section-intro">${total} ${total===1?'treino concluído':'treinos concluídos'}. Seus registros são preservados quando a ficha muda.</p>
 ${db.history.map((h,i)=>`<div class="card"><div class="row"><div><h3 style="margin:0 0 5px">${esc(h.planName||db.plans.find(p=>p.id===h.planId)?.name||'Treino')}</h3><div class="plan-meta">${date(h.ended)}</div></div><span class="pill pill-neutral">${Math.round((h.durationSeconds??mins(h.started,h.ended)*60)/60)} min</span></div><div class="plan-tags"><span class="pill">${completedSets(h).length} séries concluídas</span><span class="pill pill-neutral">${h.items?.length||0} exercícios</span></div>${h.notes?`<p class="note">${esc(h.notes)}</p>`:''}<details style="margin-top:9px"><summary>Ver exercícios e cargas ▾</summary>${(h.items||[]).map(e=>`<div class="entry"><b>${exerciseBadge(e)}${esc(e.name||ex(e.id).name)}</b><div class="muted tiny" style="margin-top:5px">${(e.sets||[]).filter(s=>s.done).map(s=>`${esc(s.weight||'—')} kg × ${esc(s.reps||'—')} reps`).join(' · ')||'Nenhuma série marcada'}</div></div>`).join('')}<button class="danger smallbtn" style="margin-top:10px" onclick="deleteHistory(${i})">Excluir registro</button></details></div>`).join('')||`<div class="card empty"><span class="empty-icon">◷</span><strong>Seu histórico começa no primeiro treino.</strong>Assim que concluir uma sessão, ela aparecerá aqui.<br><button onclick="tab('home')">Escolher treino</button></div>`}`;
}
function settings(){
 $('settings').innerHTML=`<div class="eyebrow">CONFIGURAÇÕES E FERRAMENTAS</div><h1>Mais opções</h1><p class="section-intro">Importe fichas, acompanhe sua evolução e faça backups.</p>
 <div class="card"><h3>Acompanhar desempenho</h3><div class="link-row"><div><strong>Gráficos e estatísticas</strong><p>Cargas, volume e frequência semanal</p></div><button class="secondary smallbtn" onclick="tab('stats')">Abrir →</button></div><div class="link-row"><div><strong>Histórico de treinos</strong><p>Todos os treinos realizados</p></div><button class="secondary smallbtn" onclick="tab('history')">Abrir →</button></div></div>
 <div class="card"><h3>Importar treino</h3><p class="muted tiny">Selecione o JSON que preparo para você. Você poderá revisar e escolher como importar antes de salvar.</p><button class="action-full" onclick="$('import').click()">Selecionar arquivo JSON →</button><div id="importPreview"></div></div>
 <div class="card"><h3>Proteger seus dados</h3><p class="muted tiny">Exporta fichas, biblioteca, cargas e histórico. Guarde o arquivo no iCloud Drive ou no Mac.</p><button class="secondary action-full" onclick="exportJSON()">↓ Exportar backup completo</button></div>
 <div class="card"><h3>Outras opções</h3><div class="link-row"><div><strong>Modelo para importar fichas</strong><p>Arquivo JSON de exemplo</p></div><button class="outline smallbtn" onclick="downloadTemplate()">Baixar</button></div>${db.plans.some(isDemoPlan)?`<div class="link-row"><div><strong>Remover ficha demonstrativa</strong><p>Exclui somente o exemplo, sem apagar o histórico</p></div><button class="danger smallbtn" onclick="removeDemoPlans()">Remover</button></div>`:''}</div>
 <div class="note">Seus registros ficam armazenados no iPhone. Antes de limpar os dados do site ou remover o app, exporte um backup. O Apple Saúde não pode ser acessado diretamente pelo PWA.</div>
 <p class="footer-note">Meu Treino · versão ${APP_VERSION}</p>`;
}
function removeDemoPlans(){
 if(!db.plans.some(isDemoPlan))return;
 if(!confirm('Remover a ficha de exemplo? Seu histórico será mantido.'))return;
 db.plans=db.plans.filter(p=>!isDemoPlan(p));save();settings();notice('Ficha de exemplo removida.');
}

// Inicializar somente após carregar a nova interface.
init();
