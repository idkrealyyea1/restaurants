'use strict';
(function(){
  const sk = document.getElementById('app-skeleton');
  const offlineBar = document.getElementById('sk-offline');
  const retryBox = document.getElementById('sk-retry');
  let hasHidden = false;
  function hide(){
    if(hasHidden || !sk) return;
    hasHidden = true;
    sk.classList.add('hide');
    setTimeout(()=>{ if(sk && sk.parentNode) sk.remove(); }, 400);
  }
  // Hide after window load + small delay for paint
  function scheduleHide(){
    if(document.readyState === 'complete') hide();
    else window.addEventListener('load', ()=> setTimeout(hide, 320));
    // fallback — hide even if load never fires (e.g. blocked resources)
    setTimeout(hide, 3800);
  }
  scheduleHide();
  // Offline / slow connection handling
  function isSlow(){
    try{
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if(!c) return false;
      return c.saveData || /2g/.test(c.effectiveType) || (c.downlink && c.downlink < 0.7);
    }catch(_){ return false; }
  }
  function updateOnline(){
    const online = navigator.onLine;
    if(!online){
      if(offlineBar) offlineBar.classList.add('show');
      if(retryBox) retryBox.classList.add('show');
    } else {
      if(offlineBar) offlineBar.classList.remove('show');
      if(retryBox) retryBox.classList.remove('show');
      if(isSlow() && offlineBar){
        offlineBar.textContent = 'Slow connection — loading may take longer';
        offlineBar.classList.add('show');
        setTimeout(()=> offlineBar.classList.remove('show'), 4000);
      }
    }
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  try{ if(navigator.connection) navigator.connection.addEventListener('change', updateOnline); }catch(_){}
  // initial check after 1s so skeleton is visible first
  setTimeout(updateOnline, 900);
  // retry button
  const retryBtn = document.getElementById('sk-retry-btn');
  if(retryBtn) retryBtn.addEventListener('click', ()=> location.reload());
  const offlineRetry = document.getElementById('sk-offline-retry');
  if(offlineRetry) offlineRetry.addEventListener('click', ()=> location.reload());
  // If fetch fails for critical API, keep skeleton? No — skeleton is for initial paint only.
})();
