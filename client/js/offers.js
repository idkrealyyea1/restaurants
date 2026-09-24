'use strict';
(function(){
  const { api, esc, toast } = window.App;
  const APP_URL = location.origin;
  const OWNER_WA = '+972567439846';
  const OWNER_WA_CLEAN = OWNER_WA.replace(/[^0-9]/g,'');
  const LOGIN_URL = APP_URL + '/login.html';

  // Amman leads — only phone is guaranteed, insta/email filled where known; ponytail: channels filter by existing field
  const LEADS = [
    { id:'shai', name:'Shai Wna3na3', phone:'96265923322', addr:'Cairo St 21 Amman', insta:'shai.wna3na3', email:'shai.wna3na3@gmail.com' },
    { id:'bayt', name:'Bayt Sara', phone:'962789004242', addr:'Omar Bin Al Khattab St 38 Amman', insta:'baytsara.amman', email:'' },
    { id:'tomyum', name:'TomYum', phone:'962795008600', addr:'Amman', insta:'tomyum.jo', email:'info@tomyumjo.com' },
    { id:'mijana', name:'Mijana', phone:'962799381474', addr:'Rainbow St Jabal Amman', insta:'mijana.amman', email:'' },
    { id:'sumac', name:'Sumac Co.', phone:'962796868408', addr:'Dabouq Amman', insta:'thesumacco', email:'hello@thesumacco.com' },
    { id:'sheen', name:'Sheen', phone:'962777774047', addr:'2nd Circle Amman', insta:'', email:'info@sheenrestaurant.com' },
    { id:'zuwwadeh', name:'Zuwwadeh', phone:'962795602858', addr:'Al-Hjiaz St Amman', insta:'zuwwadeh.jo', email:'' },
    { id:'rakoon', name:'Rakoon Indian', phone:'962797070096', addr:'Amman', insta:'', email:'info@rakoonindian.com' },
  ];

  function buildMessage(lead, plan, creds){
    const price = plan === 'growth' ? '$8.99' : '$8.99';
    // ponytail: no fake slug before trial exists — caller must create trial first
    const hasCreds = creds && creds.slug;
    const restUrl = hasCreds ? APP_URL + '/restaurant/' + creds.slug : '— سيُنشأ بعد إنشاء التجربة (اضغط "إنشاء تجربة 7 أيام" أولاً) —';
    const user = hasCreds ? creds.username : lead.id + '_admin (سيُنشأ)';
    const pass = hasCreds ? creds.password : '•••••••• (بعد الإنشاء)';
    const restLine = hasCreds ? `✅ رابط وموقع خاص فيكم: ${restUrl}` : `✅ رابط وموقع خاص فيكم: — أنشئ التجربة أولاً —`;
    const trialBlock = hasCreds ? `جربونا 7 أيام مجاناً:\n🔗 رابط مطعمكم التجريبي: ${restUrl}\n🔐 دخول الإدارة: ${LOGIN_URL}\n👤 المستخدم: ${user}\n🔑 الباسورد: ${pass}\n⏳ التجربة 7 أيام — بعدها يظهر "انتهت التجربة" عند الدخول، للتجديد تواصل واتساب ${OWNER_WA} (${price}/شهر)` : `جربونا 7 أيام مجاناً:\n— أنشئ التجربة أولاً لتحصل على الرابط + اليوزر + الباسورد —\n🔐 دخول الإدارة: ${LOGIN_URL}\n⏳ بعد الإنشاء: 7 أيام ثم "انتهت التجربة" — للتجديد واتساب ${OWNER_WA}`;
    return `مرحبا ${lead.name} 👋
أنا من Restivo — شفت مطعمكم في عمان ومنيوكم ممتاز.

نعطيكم حل كامل بـ ${price}/شهر ثابت بدون أي عمولة (بدل 18-25% للمنصات):
${restLine}
✅ الطلب عبر الموقع مباشرة + يوصل واتساب + لوحة تحكم لحظية مع كود تتبع
✅ حجز طاولات — الزبون يحجز تاريخ/وقت/عدد الطاولات من نفس الموقع
✅ QR للطاولات + مشاركة على انستغرام/جوجل

${trialBlock}

تحبوا أرسل لكم الرابط التجريبي الآن؟`;
  }

  function waLink(phone, msg){
    const clean = String(phone).replace(/[^0-9]/g,'');
    return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(msg);
  }

  // Guard — owner only
  async function guard(){
    const zone = document.getElementById('guard-zone');
    const app = document.getElementById('offers-app');
    try{
      const me = await api.get('/api/auth/me');
      if(!me.user || me.user.role !== 'owner'){
        zone.innerHTML = '<p class="notice notice-error">هذه الصفحة للمالك فقط (owner). Staff لا يمكنهم رؤيتها.</p><a class="btn btn-outline btn-sm" href="/owner.html">العودة للوحة المالك</a>';
        return false;
      }
      zone.classList.add('hidden');
      app.classList.remove('hidden');
      return true;
    }catch(e){
      zone.innerHTML = '<p class="notice notice-error">سجل دخول كمالك أولاً</p><a class="btn" href="/login.html">دخول</a>';
      return false;
    }
  }

  function isSent(chan, id){ try{ return localStorage.getItem('offers_sent_' + chan + '_' + id) === '1'; }catch(_){ return false; } }
  function markSent(chan, id){
    try{ localStorage.setItem('offers_sent_' + chan + '_' + id, '1'); }catch(_){}
    const badge = document.getElementById('sent-' + chan + '-' + id);
    if(badge){ badge.textContent = 'تم الإرسال ✓'; badge.classList.add('show'); }
    toast('تم وضع علامة إرسال', 'success');
  }
  // Trial per-lead — ponytail: one localStorage map covers all channels, slug matches message
  function getTrial(leadId){
    try{ const m = JSON.parse(localStorage.getItem('offers_trials')||'{}'); return m[leadId]||null; }catch(_){ return null; }
  }
  function setTrial(leadId, creds){
    try{
      const m = JSON.parse(localStorage.getItem('offers_trials')||'{}');
      m[leadId]=creds;
      localStorage.setItem('offers_trials', JSON.stringify(m));
    }catch(_){}
  }
  async function createTrialForLead(lead, btn){
    const existing = getTrial(lead.id);
    if(existing){ toast('تم إنشاؤه مسبقاً: /restaurant/'+existing.slug, 'success'); return existing; }
    if(btn){ btn.disabled=true; btn.textContent='جاري الإنشاء…'; }
    try{
      const slug = lead.id + '-trial';
      const username = lead.id + '_admin';
      const body = { name: lead.name, slug, maxMenuItems:30, adminUsername: username, trialDays:7 };
      let res;
      try{ res = await api.post('/api/owner/restaurants', body); }
      catch(e){
        if(e.code==='SLUG_TAKEN' || (e.message&&e.message.includes('SLUG_TAKEN'))){
          body.slug = slug + '-' + Date.now().toString(36).slice(-4);
          res = await api.post('/api/owner/restaurants', body);
        } else throw e;
      }
      const creds = { slug: res.restaurant.slug, username: res.admin ? res.admin.username : username, password: res.admin && res.admin.generatedPassword ? res.admin.generatedPassword : '— راجع السجل —' };
      setTrial(lead.id, creds);
      toast('تم إنشاء مطعم '+creds.slug+' + يوزر '+creds.username, 'success');
      // re-render current channel to show real links
      const activeChan = document.querySelector('.chan-tab.active')?.getAttribute('data-chan') || 'whatsapp';
      renderChannel(activeChan);
      return creds;
    }catch(e){ toast(e.message, 'error'); return null; }
    finally{ if(btn){ btn.disabled=false; btn.textContent='إنشاء مطعم'; } }
  }

  function renderChannel(chan){
    const container = document.getElementById('chan-' + chan);
    // ponytail: channel alone — only leads that have that contact
    const filtered = LEADS.filter(lead => {
      if(chan==='whatsapp') return !!lead.phone;
      if(chan==='instagram') return !!lead.insta;
      if(chan==='email') return !!lead.email;
      return true;
    });
    if(filtered.length===0){
      container.innerHTML = `<div class="empty-state small">لا يوجد عملاء لديهم ${chan==='instagram'?'انستغرام':chan==='email'?'إيميل':'واتساب'} — استخدم قناة أخرى أو أضف البيانات لليد</div>`;
      return;
    }
    container.innerHTML = filtered.map(lead => {
      const trial = getTrial(lead.id);
      const msg = buildMessage(lead, 'starter', trial);
      const sent = isSent(chan, lead.id);
      const hasTrial = !!trial;
      let actionBtn = '';
      if(chan === 'whatsapp'){
        const link = waLink(lead.phone, msg);
        actionBtn = `<a class="btn btn-sm" href="${esc(link)}" target="_blank" rel="noopener" data-send="${chan}:${lead.id}">فتح واتساب</a>`;
      } else if(chan === 'instagram'){
        actionBtn = `<button type="button" class="btn btn-sm" data-ig="${lead.id}">فتح انستغرام + نسخ</button>`;
      } else if(chan === 'email'){
        const subject = encodeURIComponent('عرض Restivo — 7 أيام تجربة مجانية');
        const body = encodeURIComponent(msg);
        const mailto = `mailto:${esc(lead.email)}?subject=${subject}&body=${body}`;
        actionBtn = `<a class="btn btn-sm" href="${mailto}" data-send="${chan}:${lead.id}">فتح الإيميل</a>`;
      }
      const createBtn = hasTrial
        ? `<span class="small muted">✓ /restaurant/${esc(trial.slug)} — ${esc(trial.username)}</span>`
        : `<button type="button" class="btn btn-outline btn-sm" data-create="${lead.id}">إنشاء مطعم</button>`;
      return `<div class="lead-row">
        <div class="lead-main">
          <strong>${esc(lead.name)}</strong> <span class="muted small">— ${esc(lead.addr)}</span><br>
          <span class="small muted">${chan==='whatsapp'? esc(lead.phone): chan==='instagram'? '@'+esc(lead.insta): esc(lead.email)}${hasTrial?' · <span class="badge badge-open">مطعم جاهز</span>':''}</span>
          <div class="msg-preview" id="msg-${chan}-${lead.id}">${esc(msg)}</div>
          ${hasTrial?`<div class="small muted mt-1">رابط: ${esc(APP_URL)}/restaurant/${esc(trial.slug)} — يوزر: <strong>${esc(trial.username)}</strong> — باس: <code>${esc(trial.password)}</code> — <a href="${esc(APP_URL)}/login.html" target="_blank">دخول</a></div>`:''}
        </div>
        <div class="lead-actions">
          <button type="button" class="btn btn-outline btn-sm" data-toggle="${chan}:${lead.id}">عرض الرسالة</button>
          <button type="button" class="btn btn-outline btn-sm" data-copy="${chan}:${lead.id}">نسخ</button>
          ${createBtn}
          ${actionBtn}
          <span class="sent-badge ${sent?'show':''}" id="sent-${chan}-${lead.id}">${sent?'تم الإرسال ✓':''}</span>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-toggle]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const [c,id] = b.getAttribute('data-toggle').split(':');
        const el = document.getElementById('msg-' + c + '-' + id);
        el.classList.toggle('show');
      });
    });
    container.querySelectorAll('[data-copy]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const [c,id] = b.getAttribute('data-copy').split(':');
        const lead = LEADS.find(l=>l.id===id);
        const trial = getTrial(id);
        const msg = buildMessage(lead, 'starter', trial);
        try{ await navigator.clipboard.writeText(msg); toast('تم النسخ', 'success'); }catch(_){ toast(msg); }
      });
    });
    // Instagram: copy message + open chat — Instagram web has no prefill, so copy is required
    container.querySelectorAll('[data-ig]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const id = b.getAttribute('data-ig');
        const lead = LEADS.find(l=>l.id===id);
        const trial = getTrial(id);
        const msg = buildMessage(lead, 'starter', trial);
        try{ await navigator.clipboard.writeText(msg); }catch(_){}
        markSent('instagram', id);
        toast('تم نسخ الرسالة — الصقها في محادثة انستغرام', 'success');
        window.open('https://www.instagram.com/' + lead.insta.replace('@','') + '/', '_blank', 'noopener');
      });
    });
    container.querySelectorAll('[data-create]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const id = b.getAttribute('data-create');
        const lead = LEADS.find(l=>l.id===id);
        await createTrialForLead(lead, b);
      });
    });
    container.querySelectorAll('[data-send]').forEach(a=>{
      a.addEventListener('click', ()=>{
        const [c,id] = a.getAttribute('data-send').split(':');
        markSent(c,id);
      });
    });
  }

  async function boot(){
    const ok = await guard();
    if(!ok) return;

    document.getElementById('logout-btn').addEventListener('click', async ()=>{
      await api.post('/api/auth/logout').catch(()=>{});
      location.href = '/login.html';
    });

    // Offer copy buttons
    document.querySelectorAll('.offer-cta').forEach(b=>{
      b.addEventListener('click', async ()=>{
        const plan = b.getAttribute('data-plan');
        const price = '$8.99';
        const msg = `نعطيكم موقع طلب + واتساب + حجز طاولات بـ ${price}/شهر ثابت 0% عمولة — تجربة 7 أيام مجانية. رابط تجريبي: ${APP_URL}/restaurant/demo — دخول: ${LOGIN_URL} — للتجديد واتساب ${OWNER_WA}`;
        try{ await navigator.clipboard.writeText(msg); toast('تم نسخ رسالة ' + plan, 'success'); }catch(_){ toast(msg); }
      });
    });

    // Channels
    renderChannel('whatsapp');
    renderChannel('instagram');
    renderChannel('email');

    document.querySelectorAll('.chan-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.chan-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const chan = btn.getAttribute('data-chan');
        document.querySelectorAll('.chan-panel').forEach(p=>p.classList.add('hidden'));
        document.getElementById('chan-' + chan).classList.remove('hidden');
      });
    });

    // ponytail: counts reflect real filtered leads, not hard-coded
    (function updateBadges(){
      const w = LEADS.filter(l=>!!l.phone).length;
      const i = LEADS.filter(l=>!!l.insta).length;
      const e = LEADS.filter(l=>!!l.email).length;
      const wt = document.querySelector('[data-chan=\"whatsapp\"]');
      const it = document.querySelector('[data-chan=\"instagram\"]');
      const et = document.querySelector('[data-chan=\"email\"]');
      if(wt) wt.textContent = `واتساب · ${w}`;
      if(it) it.textContent = `انستغرام · ${i}`;
      if(et) et.textContent = `إيميل · ${e}`;
    })();
    document.getElementById('export-csv-btn').addEventListener('click', ()=>{
      let csv = 'name,phone,address,whatsapp_link\n';
      LEADS.filter(l=>!!l.phone).forEach(l=>{
        const trial = getTrial(l.id);
        const msg = buildMessage(l,'starter',trial);
        const link = waLink(l.phone, msg);
        csv += `"${l.name}","${l.phone}","${l.addr}","${link}"\n`;
      });
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'amman-offers-wa-links.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('تم تصدير CSV', 'success');
    });

    document.getElementById('reset-sent-btn').addEventListener('click', ()=>{
      if(!confirm('إعادة تعيين كل علامات "تم الإرسال"؟')) return;
      LEADS.forEach(l=>{ ['whatsapp','instagram','email'].forEach(c=>{ try{ localStorage.removeItem('offers_sent_'+c+'_'+l.id); }catch(_){} }); });
      document.querySelectorAll('.sent-badge').forEach(b=>{ b.textContent=''; b.classList.remove('show'); });
      toast('تمت الإعادة', 'success');
    });

    // Trial creator
    document.getElementById('create-trial-btn').addEventListener('click', async ()=>{
      const name = document.getElementById('trial-name').value.trim();
      const slug = document.getElementById('trial-slug').value.trim();
      const user = document.getElementById('trial-user').value.trim();
      const pass = document.getElementById('trial-pass').value;
      if(!name || !user){ toast('أدخل اسم المطعم ويوزر المدير', 'error'); return; }
      if(pass && pass.length < 10){ toast('الباسورد ≥10 أحرف', 'error'); return; }
      const btn = document.getElementById('create-trial-btn');
      btn.disabled = true;
      try{
        const body = { name, maxMenuItems:30, adminUsername:user, trialDays:7 };
        if(slug) body.slug = slug;
        if(pass) body.adminPassword = pass;
        const res = await api.post('/api/owner/restaurants', body);
        const r = res.restaurant;
        const creds = { slug: r.slug, username: res.admin ? res.admin.username : user, password: res.admin && res.admin.generatedPassword ? res.admin.generatedPassword : (pass || '— تم التوليد، راجع السجل —') };
        const restUrl = APP_URL + '/restaurant/' + creds.slug;
        document.getElementById('trial-result').textContent = 'تم إنشاء التجربة — 7 أيام';
        const out = document.getElementById('trial-output');
        out.classList.remove('hidden');
        const fullMsg = buildMessage({id:creds.slug, name:r.name, phone:''}, 'starter', creds);
        out.innerHTML = `<div class="small"><strong>${esc(r.name)}</strong> — /restaurant/${esc(r.slug)} — ينتهي خلال 7 أيام</div>
          <div class="mt-1"><span class="muted small">رابط المطعم:</span> <a href="${esc(restUrl)}" target="_blank">${esc(restUrl)}</a></div>
          <div><span class="muted small">دخول:</span> <a href="${esc(LOGIN_URL)}" target="_blank">${esc(LOGIN_URL)}</a> — يوزر <strong>${esc(creds.username)}</strong> — باس <code>${esc(creds.password)}</code></div>
          <div class="mt-1"><button type="button" class="btn btn-sm" id="copy-trial-msg">نسخ رسالة كاملة للعميل</button> <button type="button" class="btn btn-outline btn-sm" id="open-trial">فتح المطعم</button></div>
          <div class="msg-preview show mt-1" style="display:block">${esc(fullMsg)}</div>`;
        document.getElementById('copy-trial-msg').addEventListener('click', async ()=>{
          try{ await navigator.clipboard.writeText(fullMsg); toast('تم نسخ رسالة التجربة', 'success'); }catch(_){ toast(fullMsg); }
        });
        document.getElementById('open-trial').addEventListener('click', ()=> window.open(restUrl, '_blank'));
        toast('تم إنشاء تجربة 7 أيام', 'success');
      }catch(err){
        toast(err.message, 'error');
      }finally{ btn.disabled = false; }
    });
  }

  boot();
})();
