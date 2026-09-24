'use strict';
(function(){
  const { api, esc, toast } = window.App;
  const APP_URL = location.origin;
  const LOGIN_URL = APP_URL + '/login.html';
  let currentPage=1, selected=new Set(), currentLeads=[];

  async function guard(){
    const g=document.getElementById('guard'), a=document.getElementById('app');
    try{
      const me=await api.get('/api/auth/me');
      if(!me.user || me.user.role!=='owner'){ g.innerHTML='<p class="notice notice-error">للمالك فقط</p>'; return false; }
      g.classList.add('hidden'); a.classList.remove('hidden'); return true;
    }catch(e){ g.innerHTML='<p class="notice notice-error">سجل دخول</p><a class="btn" href="/login.html">دخول</a>'; return false; }
  }

  function statusToBadge(s){
    const m={NEW:'NEW',RESEARCHED:'READY',QUALIFIED:'READY',DEMO_GENERATED:'READY',CONTACTED:'CONTACTED',REPLIED:'REPLIED',DEMO_VIEWED:'REPLIED',TRIAL:'TRIAL ACTIVE',CONVERTED:'CUSTOMER',LOST:'DO NOT CONTACT',NOT_INTERESTED:'NOT INTERESTED',POSSIBLE_DUPLICATE:'DO NOT CONTACT'};
    const label=m[s]||s;
    const cls= s==='NEW'?'badge-new': s==='RESEARCHED'||s==='QUALIFIED'||s==='DEMO_GENERATED'?'badge-ready': s==='CONTACTED'?'badge-contacted': s==='REPLIED'||s==='DEMO_VIEWED'?'badge-replied': s==='TRIAL'?'badge-trial': s==='CONVERTED'?'badge-customer': s==='NOT_INTERESTED'?'badge-not':'badge-dnc';
    return `<span class="badge ${cls}">${label}</span>`;
  }

  async function loadStats(){
    try{
      const s=await api.get('/api/owner/leads/stats');
      const totalNew = s.new_leads||0;
      const ready = (await api.get('/api/owner/leads?status=DEMO_GENERATED&limit=1')).total + (await api.get('/api/owner/leads?status=QUALIFIED&limit=1')).total;
      document.getElementById('summary').innerHTML = `
        <div class="sum-card"><b>${s.total}</b><span>Total Leads</span></div>
        <div class="sum-card"><b>${totalNew}</b><span>New Leads</span></div>
        <div class="sum-card ready"><b>${ready}</b><span>Ready to Contact</span></div>
        <div class="sum-card"><b>${s.contacted||0}</b><span>Contacted</span></div>
        <div class="sum-card"><b>${s.replied||0}</b><span>Interested</span></div>
        <div class="sum-card"><b>${s.active_trials||0}</b><span>Trial Active</span></div>
        <div class="sum-card"><b>${s.converted||0}</b><span>Converted</span></div>
        <div class="sum-card"><b>${s.not_interested||0}</b><span>Not Interested</span></div>
      `;
      const ls=document.getElementById('last-sync');
      if(ls && s.recentRuns && s.recentRuns[0]){
        const r=s.recentRuns[0];
        ls.textContent = new Date(r.created_at).toLocaleString() + ` — ${r.new_leads} new / ${r.duplicates} dup`;
      } else if(ls) ls.textContent = '—';
    }catch(_){}
  }

  async function loadLeads(){
    const tb=document.getElementById('lead-tbody');
    const pi=document.getElementById('page-info');
    try{
      const p=new URLSearchParams();
      const s=document.getElementById('f-search')?.value.trim(); if(s) p.set('search',s);
      const city=document.getElementById('f-city')?.value; if(city) p.set('city',city);
      let st=document.getElementById('f-status')?.value; 
      // map friendly to actual
      const map={NEW:'NEW',READY:'DEMO_GENERATED',CONTACTED:'CONTACTED',REPLIED:'REPLIED',INTERESTED:'REPLIED', 'TRIAL ACTIVE':'TRIAL', CUSTOMER:'CONVERTED', 'NOT INTERESTED':'NOT_INTERESTED', 'DO NOT CONTACT':'LOST'};
      if(map[st]) st=map[st];
      if(st) p.set('status',st);
      p.set('includePossible','true');
      p.set('page',currentPage); p.set('limit',15);
      const sort=document.getElementById('f-sort')?.value;
      if(sort) p.set('sortBy',sort);
      const data=await api.get('/api/owner/leads?'+p.toString());
      currentLeads=data.leads;
      if(!data.leads.length){ tb.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:24px" class="muted">لا يوجد leads — اكتشف عبر Agent Reach</td></tr>`; pi.textContent=`${data.total} total`; return; }
      tb.innerHTML = data.leads.map(l=>{
        const perm = l.permanent_id || l.display_code || l.code;
        const trial = l.trial_status==='ACTIVE' ? `ACTIVE ${l.trial_expires? new Date(l.trial_expires).toLocaleDateString():''}` : l.trial_status==='EXPIRED'?'EXPIRED': l.trial_status;
        const last = l.contact_date ? new Date(l.contact_date).toLocaleDateString() : '-';
        const next = l.next_followup ? new Date(l.next_followup).toLocaleDateString() : (l.trial_status==='ACTIVE' ? 'Trial +7d' : '-');
        const contact = [l.phone, l.whatsapp].filter(Boolean).join(' / ') || '-';
        const social = [l.instagram?`IG:${l.instagram}`:'', l.facebook?`FB`:'', l.website?`Web`:''].filter(Boolean).join(' ') || '-';
        return `<tr data-id="${esc(l.id)}" style="cursor:pointer">
          <td><input type="checkbox" data-sel="${esc(l.id)}" ${selected.has(l.id)?'checked':''}></td>
          <td><div style="display:flex;gap:8px;align-items:center"><img class="avatar" src="${esc(l.logo_url||l.cover_url||'/icons/icon.svg')}" loading="lazy" onerror="this.src='/icons/icon.svg'"><div><strong>${esc(l.restaurant_name)}</strong><br><small class="muted">${esc(l.city)} · ${esc(l.category||'')}</small></div></div></td>
          <td>${esc(l.city)}<br><small class="muted">${esc(l.category||'')}</small></td>
          <td><small>${esc(contact)}<br>${esc(social)}</small></td>
          <td><small>${esc(l.source||'manual')}<br>${new Date(l.date_discovered).toLocaleDateString()}</small></td>
          <td>${statusToBadge(l.status)}</td>
          <td><small>${esc(trial)}</small></td>
          <td><small>${last}</small></td>
          <td><small>${esc(next)}</small></td>
          <td><div class="quick-actions">
            <button type="button" class="btn btn-outline btn-sm" data-open="${esc(l.id)}">Open</button>
            <button type="button" class="btn btn-sm" data-wa="${esc(l.id)}">WA</button>
            <button type="button" class="btn btn-outline btn-sm" data-more="${esc(l.id)}">⋯</button>
          </div></td>
        </tr>`;
      }).join('');
      pi.textContent = `Page ${currentPage} — ${data.total} total`;
      bindRows();
    }catch(e){
      tb.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:20px" class="notice notice-error">${esc(e.message)}</td></tr>`;
    }
  }

  function bindRows(){
    document.querySelectorAll('[data-sel]').forEach(cb=>{
      cb.addEventListener('change',()=>{
        const id=cb.getAttribute('data-sel');
        if(cb.checked) selected.add(id); else selected.delete(id);
      });
    });
    document.querySelectorAll('[data-open]').forEach(b=>{
      b.addEventListener('click',()=> openDrawer(b.getAttribute('data-open')));
    });
    document.querySelectorAll('[data-wa]').forEach(b=>{
      b.addEventListener('click', async()=>{
        const id=b.getAttribute('data-wa');
        const lead=currentLeads.find(x=>x.id===id) || (await api.get(`/api/owner/leads/${id}`)).lead;
        const msg=lead.messages?.whatsapp||`مرحبا ${lead.restaurant_name}`;
        const phone=(lead.whatsapp||lead.phone||'').replace(/[^0-9]/g,'');
        if(!phone){ toast('لا يوجد واتساب','error'); return; }
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
      });
    });
    document.querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', (e)=>{
        if(e.target.closest('button')||e.target.closest('input')||e.target.closest('a')) return;
        openDrawer(tr.getAttribute('data-id'));
      });
    });
  }

  async function openDrawer(id){
    const lead=(await api.get(`/api/owner/leads/${id}`)).lead;
    const offer=lead.offer_data||{};
    const msgs=lead.messages||{};
    const perm=lead.permanent_id||lead.display_code||lead.code;
    const trialActive=lead.trial_status==='ACTIVE' && lead.trial_expires && new Date(lead.trial_expires)>new Date();
    const demoStatus = !lead.restaurant_id ? 'NOT READY' : trialActive ? 'ACTIVE' : lead.trial_status==='EXPIRED' ? 'EXPIRED' : 'READY';
    const daysLeft = lead.trial_expires ? Math.ceil((new Date(lead.trial_expires)-new Date())/86400000) : null;
    document.getElementById('drawer-title').textContent = `${lead.restaurant_name} — ${perm}`;
    document.getElementById('drawer-body').innerHTML = `
      <div class="section">
        <h3>Restaurant</h3>
        <div style="display:flex;gap:12px">
          <img src="${esc(lead.logo_url||lead.cover_url||'/icons/icon.svg')}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:1px solid var(--border)" onerror="this.src='/icons/icon.svg'">
          <div style="flex:1">
            <strong>${esc(lead.restaurant_name)}</strong> <span class="muted">${esc(lead.city)} · ${esc(lead.category||'')}</span><br>
            <small>Phone: ${esc(lead.phone||'-')} · WhatsApp: ${esc(lead.whatsapp||'-')}</small><br>
            <small>Instagram: ${lead.instagram?`<a href="https://instagram.com/${esc(lead.instagram.replace('@',''))}" target="_blank">@${esc(lead.instagram)}</a>`:'-'} · Facebook: ${lead.facebook?`<a href="${esc(lead.facebook)}" target="_blank">FB</a>`:'-'} · Website: ${lead.website?`<a href="${esc(lead.website)}" target="_blank">${esc(lead.website)}</a>`:'-'}</small><br>
            <small>Google: ${esc(lead.google_listing||lead.google_place_id||'-')} · Source: ${esc(lead.source||'')} · Discovered: ${new Date(lead.date_discovered).toLocaleDateString()}</small>
          </div>
        </div>
      </div>
      <div class="section">
        <h3>Lead Intelligence</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge ${lead.score_level==='HOT'?'badge-hot':lead.score_level==='WARM'?'badge-warm':'badge-cold'}">${lead.score_level} ${lead.score}/100</span> <span class="badge">${esc(lead.score_reason||'')}</span> <span class="badge">${esc(lead.priority||'')}</span></div>
        <p class="small muted" style="margin-top:8px">${esc(lead.score_reason||'')}${lead.notes? ' — '+esc(lead.notes):''}</p>
        <small class="muted">Images: ${(Array.isArray(lead.images)?lead.images.length:0)} · Source URLs: ${(Array.isArray(lead.source_urls)?lead.source_urls.join(', '):'')}</small>
      </div>
      <div class="section">
        <h3>AI Prepared Offer</h3>
        <div class="offer-box">
          <strong>${esc(offer.headline||lead.restaurant_name+' — اطلب أونلاين')}</strong><br>
          <small class="muted">${esc(offer.sub||'موقع طلب خاص + واتساب + حجز طاولات — $8.99/شهر')}</small>
          <p class="small" style="white-space:pre-wrap;background:var(--surface);padding:8px;border-radius:8px;margin-top:8px;border:1px solid var(--border)">${esc(msgs.whatsapp||'— بعد Prepare —')}</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            <button type="button" class="btn btn-sm" id="copy-msg">COPY MESSAGE</button>
            <button type="button" class="btn btn-outline btn-sm" id="edit-msg">Edit</button>
            <button type="button" class="btn btn-outline btn-sm" id="copy-offer">COPY OFFER</button>
            <a class="btn btn-outline btn-sm" href="/offer/${esc(lead.code)}" target="_blank">OPEN OFFER PAGE</a>
          </div>
          <textarea id="edit-area" class="hidden" style="width:100%;height:100px;margin-top:8px">${esc(msgs.whatsapp||'')}</textarea>
        </div>
      </div>
      <div class="section">
        <h3>Demo / 7-Day Trial — ${esc(demoStatus)}</h3>
        ${lead.restaurant_id ? `
          <div class="demo-card">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <span class="badge ${trialActive?'badge-trial':'badge-not'}">${trialActive? daysLeft+' days remaining' : demoStatus}</span>
              <span class="small muted">Trial: ${lead.trial_expires? new Date(lead.trial_expires).toLocaleString() : '-'}</span>
            </div>
            <div style="margin-top:8px;display:grid;gap:6px">
              <div><small>Demo URL</small><br><a href="${esc(offer.demoUrl||'')}" target="_blank">${esc(offer.demoUrl||'')}</a> <button type="button" class="btn btn-outline btn-sm" data-copy="demoUrl">COPY LINK</button></div>
              <div><small>Username</small><br><code>${esc(lead.trial_username||'')}</code> <button type="button" class="btn btn-outline btn-sm" data-copy="user">COPY USERNAME</button></div>
              <div><small>Password</small><br><code>••••••••</code> <button type="button" class="btn btn-outline btn-sm" data-copy="pass">COPY PASSWORD</button> <small class="muted">(shown once after Generate)</small></div>
              <div><small>Login</small><br><a href="${esc(offer.loginUrl||LOGIN_URL)}" target="_blank">${esc(offer.loginUrl||LOGIN_URL)}</a></div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <a class="btn btn-sm" href="${esc(offer.demoUrl||'')}" target="_blank">OPEN DEMO</a>
              <button type="button" class="btn btn-outline btn-sm" data-copy-all>COPY ALL LOGIN DETAILS</button>
            </div>
          </div>
        ` : `<p class="small muted">No demo yet.</p><button type="button" class="btn btn-sm" id="create-demo">CREATE DEMO</button>`}
      </div>
      <div class="section">
        <h3>Outreach Actions</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn btn-sm" data-wa2>OPEN WHATSAPP</button>
          <button type="button" class="btn btn-sm" data-ig2>OPEN INSTAGRAM</button>
          <button type="button" class="btn btn-sm" data-email2>OPEN EMAIL</button>
          <button type="button" class="btn btn-outline btn-sm" data-copy2>COPY MESSAGE</button>
          <button type="button" class="btn btn-outline btn-sm" data-copy-offer2>COPY OFFER</button>
          <button type="button" class="btn btn-outline btn-sm" data-open-demo2>OPEN DEMO</button>
        </div>
        <small class="muted">Clicking Open WhatsApp = CONTACTING / READY TO CONTACT, not MESSAGE SENT. Mark manually.</small>
      </div>
      <div class="section">
        <h3>Pipeline</h3>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${['NEW','READY','CONTACTED','REPLIED','INTERESTED','TRIAL ACTIVE','CUSTOMER'].map(s=>`<span class="badge ${lead.status===s?'badge-ready':''}">${s}</span>`).join('')} <span class="badge badge-not">NOT INTERESTED</span> <span class="badge badge-dnc">DO NOT CONTACT</span></div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" data-mark="CONTACTED">Mark as contacted</button>
          <button type="button" class="btn btn-outline btn-sm" data-mark="REPLIED">Mark as replied</button>
          <button type="button" class="btn btn-outline btn-sm" data-mark="NOT_INTERESTED">Mark as not interested</button>
          <button type="button" class="btn btn-outline btn-sm" data-mark="CONVERTED">Mark customer</button>
        </div>
      </div>
      <div class="section">
        <h3>Contact History</h3>
        <div class="timeline">
          ${(lead.pipeline_history||[]).map(h=>`<div><small>${new Date(h.at).toLocaleString()} — ${esc(h.from||'')} → ${esc(h.to||h.status||'')}</small></div>`).join('') || '<small class="muted">No history</small>'}
          ${(lead.followups||[]).map(f=>`<div><small>${new Date(f.at).toLocaleString()} — ${esc(f.note||'')}</small></div>`).join('')}
        </div>
      </div>
      <div class="section">
        <h3>Notes</h3>
        <textarea id="note-input" placeholder="Owner said he wants to check demo tomorrow." style="width:100%;height:60px">${esc(lead.notes||'')}</textarea>
        <button type="button" class="btn btn-sm mt-1" id="add-note">ADD NOTE</button>
        <div style="margin-top:8px">${(lead.followups||[]).map(f=>`<div class="small" style="padding:6px;border-bottom:1px solid var(--border)">${new Date(f.at).toLocaleDateString()} — ${esc(f.note)}</div>`).join('')}</div>
      </div>
      <div class="section">
        <h3>Follow-Up</h3>
        <div style="display:flex;gap:8px;align-items:center"><input type="date" id="follow-date" value="${lead.next_followup? new Date(lead.next_followup).toISOString().slice(0,10):''}"><button type="button" class="btn btn-sm" id="save-follow">Save</button></div>
        <small class="muted">Next: ${lead.next_followup? new Date(lead.next_followup).toLocaleDateString() : '—'}</small>
      </div>
    `;
    document.getElementById('drawer').classList.add('open');
    // bind drawer actions
    document.getElementById('copy-msg')?.addEventListener('click', async()=>{ try{ await navigator.clipboard.writeText(msgs.whatsapp||''); toast('Copied','success'); }catch(_){} });
    document.getElementById('edit-msg')?.addEventListener('click', ()=> document.getElementById('edit-area').classList.toggle('hidden'));
    document.getElementById('copy-offer')?.addEventListener('click', async()=>{ try{ await navigator.clipboard.writeText(offer.headline||''); toast('Copied','success'); }catch(_){} });
    document.querySelectorAll('[data-copy]').forEach(b=>{
      b.addEventListener('click', async()=>{
        const k=b.getAttribute('data-copy');
        const v=k==='demoUrl'?offer.demoUrl: k==='user'?lead.trial_username: lead.trial_username; // password not stored
        try{ await navigator.clipboard.writeText(v); toast('Copied','success'); }catch(_){}
      });
    });
    document.querySelector('[data-copy-all]')?.addEventListener('click', async()=>{
      const txt=`Demo: ${offer.demoUrl}\nUser: ${lead.trial_username}\nLogin: ${offer.loginUrl}`;
      try{ await navigator.clipboard.writeText(txt); toast('Copied','success'); }catch(_){}
    });
    document.getElementById('create-demo')?.addEventListener('click', async()=>{
      try{ await api.post(`/api/owner/leads/${lead.id}/generate-demo`); toast('Demo created','success'); openDrawer(lead.id); }catch(e){ toast(e.message,'error'); }
    });
    document.querySelectorAll('[data-wa2]').forEach(b=> b.addEventListener('click', async()=>{
      const m=lead.messages?.whatsapp||''; const phone=(lead.whatsapp||lead.phone||'').replace(/[^0-9]/g,'');
      if(phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(m)}`,'_blank');
    }));
    document.querySelectorAll('[data-ig2]').forEach(b=> b.addEventListener('click', ()=>{
      const h=(lead.instagram||'').replace('@',''); window.open(h?`https://instagram.com/${h}`:'https://instagram.com/direct/inbox/','_blank');
    }));
    document.querySelectorAll('[data-email2]').forEach(b=> b.addEventListener('click', ()=>{
      const m=lead.messages||{}; window.location.href=`mailto:${lead.email||''}?subject=${encodeURIComponent(m.email_subject||'')}&body=${encodeURIComponent(m.email_body||'')}`;
    }));
    document.querySelectorAll('[data-mark]').forEach(b=>{
      b.addEventListener('click', async()=>{
        const st=b.getAttribute('data-mark');
        const map={CONTACTED:'CONTACTED',REPLIED:'REPLIED', 'NOT INTERESTED':'NOT_INTERESTED', CONVERTED:'CONVERTED'};
        try{ await api.request(`/api/owner/leads/${lead.id}/status`,{method:'PATCH',body:{status: map[st]||st}}); toast('Updated','success'); openDrawer(lead.id); loadLeads(); }catch(e){ toast(e.message,'error'); }
      });
    });
    document.getElementById('add-note')?.addEventListener('click', async()=>{
      const note=document.getElementById('note-input').value.trim();
      if(!note) return;
      await api.post(`/api/owner/leads/${lead.id}/contact`,{ note }); toast('Added','success'); openDrawer(lead.id);
    });
    document.getElementById('save-follow')?.addEventListener('click', async()=>{
      const d=document.getElementById('follow-date').value;
      if(!d) return;
      await api.post(`/api/owner/leads/${lead.id}/contact`,{ nextFollowup: new Date(d).toISOString() }); toast('Saved','success'); openDrawer(lead.id);
    });
  }

  async function boot(){
    if(!await guard()) return;
    const on = (id, ev, fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener(ev, fn); };
    on('logout-btn','click', async()=>{ await api.post('/api/auth/logout').catch(()=>{}); location.href='/login.html'; });
    on('discover-btn','click', ()=> document.getElementById('discover-box')?.classList.toggle('hidden'));
    on('new-lead-btn','click', ()=> document.getElementById('manual-box')?.classList.toggle('hidden'));
    on('show-merge','click', ()=> document.getElementById('merge-box')?.classList.toggle('hidden'));
    on('show-history','click', async()=>{
      const z=document.getElementById('history-zone');
      if(!z) return;
      z.classList.toggle('hidden');
      if(!z.classList.contains('hidden')){
        try{
          const data=await api.get('/api/owner/leads/search-runs?limit=10');
          z.innerHTML = '<h3>سجل البحث</h3>' + data.runs.map(r=>`<div class="small" style="padding:6px;border-bottom:1px solid var(--border)">#${new Date(r.created_at).toLocaleString()} — ${esc(r.city)} "${esc(r.search_query||r.query||'')}" — وجد:${r.results_found} جديد:${r.new_leads} مكرر:${r.duplicates} محتمل:${r.possible_duplicates} محدث:${r.updated_existing}</div>`).join('') || '<p class="small muted">لا يوجد سجل</p>';
        }catch(e){ z.innerHTML='<p class="small muted">'+esc(e.message)+'</p>'; }
      }
    });
    on('d-run','click', async()=>{
      const btn=document.getElementById('d-run'); if(!btn) return; btn.disabled=true;
      try{
        const city=document.getElementById('d-city')?.value||'';
        const q=document.getElementById('d-query')?.value||'';
        const findNew=document.getElementById('d-findnew')?.checked||false;
        const res=await api.post('/api/owner/leads/discover', { city, query:q, limit:8, findNew });
        const el=document.getElementById('d-result');
        if(el) el.textContent=`Found ${res.discovered} New ${res.created} Dup ${res.duplicates}`;
        await loadStats(); await loadLeads();
      }catch(e){ toast(e.message,'error'); } finally{ btn.disabled=false; }
    });
    on('m-create','click', async()=>{
      const body={ restaurant_name: document.getElementById('m-name')?.value.trim()||'', city: document.getElementById('m-city')?.value.trim()||'', phone: document.getElementById('m-phone')?.value.trim()||'', whatsapp: document.getElementById('m-whatsapp')?.value.trim()||'', instagram: document.getElementById('m-insta')?.value.trim()||'', website: document.getElementById('m-website')?.value.trim()||'', menu_url: document.getElementById('m-menu')?.value.trim()||'', category: document.getElementById('m-category')?.value.trim()||'', notes: document.getElementById('m-notes')?.value.trim()||'' };
      if(!body.restaurant_name){ toast('اسم المطعم مطلوب','error'); return; }
      try{ await api.post('/api/owner/leads', body); toast('تم','success'); await loadStats(); await loadLeads(); }catch(e){ toast(e.message,'error'); }
    });
    on('merge-run','click', async()=>{
      const t=document.getElementById('merge-target')?.value.trim().toUpperCase()||'';
      const s=document.getElementById('merge-source')?.value.trim().toUpperCase()||'';
      if(!t||!s){ toast('أدخل الكودين','error'); return; }
      try{
        const all=await api.get('/api/owner/leads?limit=100');
        const findByCode=(c)=> all.leads.find(l=>l.code===c || l.permanent_id===c || l.display_code===c);
        const target=findByCode(t), source=findByCode(s);
        if(!target||!source){ toast('لم يوجد أحد الأكواد','error'); return; }
        await api.post('/api/owner/leads/merge', { targetId: target.id, sourceId: source.id });
        toast('تم الدمج','success'); await loadStats(); await loadLeads();
      }catch(e){ toast(e.message,'error'); }
    });
    on('f-apply','click', ()=>{ currentPage=1; loadLeads(); });
    on('f-clear','click', ()=>{
      const sEl=document.getElementById('f-search'); if(sEl) sEl.value='';
      const cEl=document.getElementById('f-city'); if(cEl) cEl.value='';
      const stEl=document.getElementById('f-status'); if(stEl) stEl.value='';
      loadLeads();
    });
    on('prev-page','click', ()=>{ if(currentPage>1){ currentPage--; loadLeads(); }});
    on('next-page','click', ()=>{ currentPage++; loadLeads(); });
    const closeDrawer=()=> document.getElementById('drawer')?.classList.remove('open');
    on('drawer-close','click', closeDrawer);
    on('drawer-x','click', closeDrawer);
    const drawerEl=document.getElementById('drawer');
    if(drawerEl) drawerEl.addEventListener('click', (e)=>{ if(e.target.id==='drawer') closeDrawer(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });
    await loadStats(); await loadLeads();
    setInterval(loadStats, 30000);
  }
  boot();
})();
