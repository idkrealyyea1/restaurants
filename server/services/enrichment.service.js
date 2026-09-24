'use strict';
const { spawn } = require('child_process');
const { query } = require('../db/pool');

// ponytail: shell mcporter if present, else mock — upgrade to persistent MCP client if discovery throughput matters
async function discoverViaAgentReach({ city, query: q, limit=8 }){
  const searchQuery = q || `restaurants ${city||'Amman'} menu phone WhatsApp`;
  try{
    const result = await exaSearch(searchQuery, limit);
    if(result && result.length){
      return result.map(r=>({
        restaurant_name: extractName(r.title) || 'Unknown',
        city: city||'Amman',
        phone: extractPhone(r.highlights||'')||'',
        whatsapp: extractPhone(r.highlights||'')||'',
        website: r.url||'',
        menu_url: /menu/i.test(r.url||'')?r.url:'',
        google_listing: '',
        instagram: '',
        facebook: '',
        category: 'Restaurant',
        notes: (r.highlights||'').slice(0,300),
        source_urls: [r.url],
        social_links: {},
      }));
    }
  }catch(e){ /* fallback */ }
  // fallback mock — amman-leads sample
  return [
    { restaurant_name:'Shai Wna3na3', city:city||'Amman', phone:'96265923322', whatsapp:'96265923322', website:'https://shai-wna3na3.menufyy.com', menu_url:'', instagram:'shai.wna3na3', facebook:'', category:'Cafe', notes:'Hosted on menufyy — pitch own link', source_urls:['https://shai-wna3na3.menufyy.com'], social_links:{} },
    { restaurant_name:'Bayt Sara', city:city||'Amman', phone:'962789004242', whatsapp:'962789004242', website:'', menu_url:'', instagram:'baytsara.amman', facebook:'', category:'Restaurant', notes:'No website — directory only', source_urls:['https://menuweb.menu/restaurants/amman-1/bayt-sara'], social_links:{} },
    { restaurant_name:'Sumac Co.', city:city||'Amman', phone:'962796868408', whatsapp:'962796868408', website:'https://thesumacco.com', menu_url:'', instagram:'thesumacco', facebook:'', category:'Levantine', notes:'Custom site but WhatsApp only', source_urls:['https://thesumacco.com'], social_links:{} },
  ].slice(0, limit);
}

function extractName(title){
  if(!title) return '';
  return title.split('|')[0].split('-')[0].trim().slice(0,80);
}
function extractPhone(text){
  const m = text.match(/\+962\d{7,10}|07\d{7,8}|962\d{7,10}/);
  return m? m[0].replace(/[^0-9+]/g,'').slice(0,20) : '';
}

function exaSearch(query, numResults=5){
  return new Promise((resolve, reject)=>{
    const child = spawn('mcporter', ['call','exa.web_search_exa', `query=${query}`, `numResults=${numResults}`], { timeout: 15000 });
    let out='', err='';
    child.stdout.on('data', d=> out+=d);
    child.stderr.on('data', d=> err+=d);
    child.on('error', reject);
    child.on('close', code=>{
      if(code!==0) return reject(new Error(err||'mcporter failed'));
      try{
        // mcporter outputs human readable, try to parse titles/urls
        const results=[];
        const blocks = out.split('---');
        for(const b of blocks){
          const url = (b.match(/URL:\s*(https?:\/\/[^\s]+)/)||[])[1]||'';
          const title = (b.match(/Title:\s*(.+)/)||[])[1]||'';
          const highlights = (b.match(/Highlights:\s*([\s\S]*?)(?:\n\n|$)/)||[])[1]||'';
          if(url) results.push({ title: title.trim(), url: url.trim(), highlights: highlights.trim() });
        }
        resolve(results);
      }catch(e){ reject(e); }
    });
  });
}

async function researchLead(lead){
  // ponytail: fetch website for og:image and menu detection — skip heavy scraping, upgrade to Jina if needed
  let assets = { logo: lead.logo_url||'', cover: lead.cover_url||'', images: [] };
  let menu_url = lead.menu_url||'';
  if(lead.website){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 5000);
      const res = await fetch(lead.website, { signal: ctrl.signal, headers:{'User-Agent':'Mozilla/5.0'}});
      clearTimeout(t);
      const html = await res.text();
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if(og && !assets.cover) assets.cover = og[1];
      if(!menu_url && /menu/i.test(html)) menu_url = lead.website;
      // collect 2-3 food images from img tags
      const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).filter(u=>/\.(jpg|png|webp)/i.test(u)).slice(0,3);
      assets.images = imgs.map(u=>({ url: u.startsWith('http')?u: new URL(u, lead.website).href, source: lead.website }));
    }catch(_){ /* ignore, keep existing */ }
  }
  return { assets, menu_url };
}

module.exports = { discoverViaAgentReach, researchLead, exaSearch };
