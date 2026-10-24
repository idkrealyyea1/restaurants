'use strict';
(function(){
  const I = window.I18N;
  function tr(key, vars, fallback){
    try{
      const value = I && I.t ? I.t(key, vars) : key;
      return value && value !== key ? value : fallback;
    }catch(_){ return fallback; }
  }
  const burger=document.getElementById('mk-burger');
  const drawer=document.getElementById('mk-drawer');
  if(burger && drawer){
    burger.addEventListener('click',()=>{
      const open=drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true':'false');
    });
    drawer.addEventListener('click',(e)=>{
      if(e.target.tagName==='A') drawer.classList.remove('open');
    });
  }
  // One pricing fetch shared by every price label on the page.
  const priceEl=document.getElementById('mk-price');
  const pricePeriodEl=document.getElementById('mk-price-period');
  const priceLabels=Array.from(document.querySelectorAll('[data-pricing]'));
  if(priceEl || priceLabels.length){
    let base=String(window.__API_BASE__||'');
    if(!base){ const meta=document.querySelector('meta[name="api-base"]'); base=meta?String(meta.content||''):''; }
    base=base.replace(/\/+$/,'');
    fetch(base+'/api/pricing', {credentials:'include'}).then(r=>r.json()).then(d=>{
      const p=d.pricing||d;
      if(!p || p.pricing_cents==null) return;
      const cur=p.pricing_currency||'USD';
      let formatted;
      try{
        formatted=new Intl.NumberFormat(undefined,{style:'currency',currency:cur}).format(p.pricing_cents/100);
      }catch(_){ formatted='$'+(p.pricing_cents/100).toFixed(2); }
      if(priceEl) priceEl.textContent=formatted;
      if(pricePeriodEl) pricePeriodEl.textContent='/'+(p.pricing_period||'month');
      priceLabels.forEach(el=>{ el.textContent=formatted; });
    }).catch(()=>{});
  }
  // smooth scroll for hash links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const id=a.getAttribute('href').slice(1);
      const t=document.getElementById(id);
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); history.pushState(null,'','#'+id); }
    });
  });
  // analytics hooks (prepare for later)
  const track=(name)=>{ try{ console.log('[analytics]',name); }catch(_){} };
  document.querySelectorAll('[data-track]').forEach(el=>{
    el.addEventListener('click',()=> track(el.getAttribute('data-track')));
  });

  // Hero live button: go to first live restaurant, fallback to /app/
  (function(){
    const btns = [document.getElementById('hero-live-btn'), document.getElementById('live-open-btn'), document.getElementById('nav-live-btn')];
    if(!btns[0] && !btns[1]) return;
    function goLive(e){
      e.preventDefault();
      fetch('/api/restaurants').then(r=>r.json()).then(d=>{
        const list = d.restaurants||[];
        if(list.length && list[0].slug) location.href = '/restaurant?r=' + encodeURIComponent(list[0].slug);
        else location.href = '/app/';
      }).catch(()=> location.href='/app/');
    }
    btns.forEach(b=>{ if(b) b.addEventListener('click', goLive); });
  })();

  // WhatsApp fast button prefill from typed name/restaurant
  (function(){
    const fast=document.getElementById('rq-wa-fast');
    if(!fast) return;
    fast.addEventListener('click', ()=>{
      try{
        const n=(document.getElementById('rq-name')?.value||'').trim();
        const r=(document.getElementById('rq-rest')?.value||'').trim();
        let msg=tr('waRequestMsg', null, 'مرحبا Ordora — أريد صفحة لمطعمي');
        if(r) msg+=' ('+r+')';
        if(n) msg+=' — اسمي '+n;
        fast.href='https://wa.me/972567439846?text='+encodeURIComponent(msg);
      }catch(_){}
    });
  })();

  // Restaurant request form — public, no auth, rate-limited
  (function(){
    const form = document.getElementById('request-form');
    if(!form) return;
    const msg = document.getElementById('rq-msg');
    const btn = document.getElementById('rq-submit');
    function showMsg(text, type){
      if(!msg) return;
      msg.textContent = text;
      msg.className = 'notice mt-1 ' + (type==='ok'?'notice-ok':'notice-error');
      msg.classList.remove('hidden');
    }
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = {
        customerName: document.getElementById('rq-name').value.trim(),
        restaurantName: document.getElementById('rq-rest').value.trim(),
        phone: document.getElementById('rq-phone').value.trim(),
        whatsapp: document.getElementById('rq-wa').value.trim(),
        city: document.getElementById('rq-city').value.trim(),
        notes: document.getElementById('rq-notes').value.trim()
      };
      if(!payload.customerName || !payload.restaurantName || !payload.phone || !payload.whatsapp){
        showMsg(tr('rqRequired', null, 'الرجاء تعبئة الحقول المطلوبة *'), 'error'); return;
      }
      btn.disabled=true; const old=btn.textContent; btn.textContent=tr('rqSending', null, 'جاري الإرسال…');
      try{
        // Split-frontend: send the request to the API host (Render), not the
        // static host (Cloudflare Pages). Empty base = same origin.
        let base=String(window.__API_BASE__||'');
        if(!base){ const meta=document.querySelector('meta[name="api-base"]'); base=meta?String(meta.content||''):''; }
        base=base.replace(/\/+$/,'');
        const r = await fetch(base + '/api/restaurant-requests', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        const data = await r.json().catch(()=>null);
        if(!r.ok) throw new Error(data && data.error && data.error.message || tr('rqError', null, 'تعذّر الإرسال — حاول مجددًا'));
        showMsg(tr('rqSent', { code: (data.request && data.request.code) || '' }, 'تم إرسال طلبك بنجاح — رمز: ' + ((data.request && data.request.code) || '')), 'ok');
        form.reset();
        if(window.App && window.App.toast) window.App.toast(tr('rqSentToast', null, 'تم إرسال طلبك'), 'success');
      }catch(err){
        showMsg(err.message || 'حدث خطأ، حاول مجددًا', 'error');
        if(window.App && window.App.toast) window.App.toast(err.message, 'error');
      }finally{ btn.disabled=false; btn.textContent=old; }
    });
  })();
})();
