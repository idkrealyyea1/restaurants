'use strict';

const { query, withTx } = require('../db/pool');
const { badRequest, notFound, conflict } = require('../utils/errors');
const { orderCode } = require('../utils/ids');

const STATUSES = ['NEW','RESEARCHED','QUALIFIED','DEMO_GENERATED','CONTACTED','REPLIED','DEMO_VIEWED','TRIAL','CONVERTED','LOST','NOT_INTERESTED','POSSIBLE_DUPLICATE'];
const SCORE_LEVELS = ['HOT','WARM','COLD'];

const TRANSITIONS = {
  NEW: ['RESEARCHED','QUALIFIED','DEMO_GENERATED','CONTACTED','LOST','NOT_INTERESTED','POSSIBLE_DUPLICATE'],
  RESEARCHED: ['QUALIFIED','DEMO_GENERATED','LOST','NOT_INTERESTED'],
  QUALIFIED: ['DEMO_GENERATED','LOST','NOT_INTERESTED'],
  DEMO_GENERATED: ['CONTACTED','LOST','NOT_INTERESTED'],
  CONTACTED: ['REPLIED','LOST','NOT_INTERESTED'],
  REPLIED: ['DEMO_VIEWED','TRIAL','CONVERTED','LOST','NOT_INTERESTED'],
  DEMO_VIEWED: ['TRIAL','CONVERTED','LOST','NOT_INTERESTED'],
  TRIAL: ['CONVERTED','LOST','NOT_INTERESTED'],
  CONVERTED: ['LOST'],
  LOST: ['NEW','NOT_INTERESTED'],
  NOT_INTERESTED: ['NEW','QUALIFIED','LOST'],
  POSSIBLE_DUPLICATE: ['NEW','LOST','NOT_INTERESTED'],
};

function assertTransition(from, to){
  if(!STATUSES.includes(to)) throw badRequest('Unknown lead status');
  const allowed = TRANSITIONS[from]||[];
  if(!allowed.includes(to)) throw conflict('INVALID_STATUS_TRANSITION', `Cannot move ${from} → ${to}`);
}

// === Normalization helpers — ponytail: simple, upgrade to lib if mis-match ===
function normalizeName(name){
  return String(name||'').toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim();
}
function normalizePhone(phone){
  const digits = String(phone||'').replace(/[^0-9]/g,'');
  // keep last 9 digits for JO (+962) vs local 07 — ponytail: last 9 is ceiling, use full if need country
  return digits.length>9 ? digits.slice(-9) : digits;
}
function normalizeInstagram(insta){
  let s = String(insta||'').trim().toLowerCase();
  if(!s) return '';
  // extract from URL like https://instagram.com/burgerhousegaza?hl=en
  const m = s.match(/instagram\.com\/([a-z0-9._]+)/);
  if(m) s = m[1];
  s = s.replace(/^@/,'').split(/[?\/]/)[0].trim();
  return s;
}
function extractDomain(url){
  try{
    const u = new URL(String(url).startsWith('http')? String(url): 'https://'+String(url));
    let h = u.hostname.toLowerCase().replace(/^www\./,'');
    return h;
  }catch(_){ return String(url||'').toLowerCase().replace(/^www\./,'').split('/')[0].trim(); }
}
function normalizeInstagramUrl(insta){
  const u = normalizeInstagram(insta);
  return u ? `https://instagram.com/${u}` : '';
}
function levenshtein(a,b){
  const m=a.length, n=b.length;
  if(!m) return n;
  if(!n) return m;
  const dp=Array(n+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=m;i++){
    let prev=dp[0]; dp[0]=i;
    for(let j=1;j<=n;j++){
      const tmp=dp[j];
      dp[j]= a[i-1]===b[j-1] ? prev : Math.min(prev,dp[j],dp[j-1])+1;
      prev=tmp;
    }
  }
  return dp[n];
}
function nameSimilarity(a,b){
  const na=normalizeName(a), nb=normalizeName(b);
  if(!na||!nb) return 0;
  if(na===nb) return 1;
  const max=Math.max(na.length, nb.length);
  const d=levenshtein(na,nb);
  return 1 - d/max;
}

function scoreLead(lead){
  let score = 0;
  const reasons = [];
  if(!lead.website){ score+=25; reasons.push('No website'); }
  else if(lead.website && !lead.menu_url) { score+=15; reasons.push('No online menu'); }
  if(!lead.menu_url && lead.instagram) { score+=10; reasons.push('Menu only via social'); }
  if(lead.instagram){ score+=10; reasons.push('Active Instagram'); }
  if(lead.facebook){ score+=5; reasons.push('Has Facebook'); }
  if(lead.google_listing || lead.google_place_id) { score+=5; reasons.push('Google listing'); }
  if(lead.website && lead.menu_url && /order|delivery|shop/i.test(lead.menu_url)) { score-=10; reasons.push('Has ordering (reduce)'); }
  if(/delivery|توصيل/i.test(lead.notes||'')) { score+=5; reasons.push('Delivery available'); }
  if(/branch|فرع|branches/i.test(lead.restaurant_name + ' ' + (lead.notes||''))) { score+=10; reasons.push('Multiple branches'); }
  if(lead.phone || lead.whatsapp) { score+=10; reasons.push('Has contact'); }
  if(!lead.menu_url) { score+=10; reasons.push('No direct ordering'); }
  score = Math.max(0, Math.min(100, score));
  let level = 'COLD';
  if(score>=75) level='HOT';
  else if(score>=45) level='WARM';
  const reason = reasons.slice(0,3).join(' + ') || 'Low digital presence';
  const priority = level==='HOT' ? 'HIGH' : level==='WARM' ? 'MEDIUM' : 'LOW';
  return { score, level, reason, priority };
}

// === Dedup ===
async function findDuplicate(candidate){
  const normName = normalizeName(candidate.restaurant_name);
  const normPhone = normalizePhone(candidate.phone||candidate.whatsapp||'');
  const normInsta = normalizeInstagram(candidate.instagram||'');
  const domain = candidate.website ? extractDomain(candidate.website) : '';
  const placeId = String(candidate.google_place_id||candidate.google_listing||'').trim();

  // 1. place_id exact
  if(placeId){
    const r = await query('SELECT * FROM leads WHERE google_place_id=$1 LIMIT 1', [placeId]);
    if(r.rows[0]) return { type:'MATCH', lead: r.rows[0], reason:'google_place_id' };
  }
  // 2. instagram exact
  if(normInsta){
    const r = await query('SELECT * FROM leads WHERE LOWER(instagram)=LOWER($1) OR LOWER(instagram)=LOWER($2) LIMIT 1', [normInsta, normalizeInstagramUrl(candidate.instagram)]);
    if(r.rows[0]) return { type:'MATCH', lead: r.rows[0], reason:'instagram' };
    // also check instagram URL contains username
    const r2 = await query("SELECT * FROM leads WHERE instagram<>'' AND $1 ILIKE '%'||LOWER(instagram)||'%' LIMIT 1", [normInsta]);
    if(r2.rows[0]) return { type:'MATCH', lead: r2.rows[0], reason:'instagram_url' };
  }
  // 3. website domain
  if(domain){
    const r = await query("SELECT * FROM leads WHERE LOWER(website) LIKE '%'||$1||'%' LIMIT 1", [domain]);
    if(r.rows[0]) return { type:'MATCH', lead: r.rows[0], reason:'website_domain' };
  }
  // 4. phone/whatsapp last 9 digits
  if(normPhone && normPhone.length>=7){
    const r = await query("SELECT * FROM leads WHERE REGEXP_REPLACE(phone,'[^0-9]','','g') LIKE '%'||$1 OR REGEXP_REPLACE(whatsapp,'[^0-9]','','g') LIKE '%'||$1 LIMIT 1", [normPhone]);
    if(r.rows[0]) return { type:'MATCH', lead: r.rows[0], reason:'phone' };
  }
  // 5. normalized name + location exact
  if(normName){
    const city = String(candidate.city||'').toLowerCase().trim();
    const r = await query('SELECT * FROM leads WHERE normalized_name=$1 AND LOWER(city)=LOWER($2) LIMIT 1', [normName, city]);
    if(r.rows[0]) return { type:'MATCH', lead: r.rows[0], reason:'name+city' };
  }
  // UNCERTAIN: fuzzy name same city only — ponytail: cross-city same name is different restaurant, don't flag
  if(normName){
    const city = String(candidate.city||'').toLowerCase().trim();
    if(city){
      const candidates = await query("SELECT * FROM leads WHERE LOWER(city)=LOWER($1) LIMIT 20", [city]);
      for(const row of candidates.rows){
        const sim = nameSimilarity(candidate.restaurant_name, row.restaurant_name);
        if(sim>=0.8) return { type:'UNCERTAIN', lead: row, reason:`name_similarity ${(sim*100).toFixed(0)}%`, similarity: sim };
      }
    }
  }
  return { type:'NEW', lead:null, reason:'no_match' };
}

async function updateExistingLead(id, newData){
  const lead = await getById(id);
  // preserve status/history, only update newly discovered fields if empty or newer
  const fields = {};
  const updatable = ['phone','whatsapp','instagram','facebook','website','menu_url','google_listing','google_place_id','logo_url','cover_url','category','notes'];
  for(const f of updatable){
    const v = newData[f];
    if(v && String(v).trim() && !String(lead[f]||'').trim()){
      fields[f]=String(v).trim();
    } else if(v && f==='notes' && String(v).trim() && !String(lead.notes||'').includes(String(v).trim().slice(0,30))){
      fields[f] = (lead.notes? lead.notes+'\n':'') + String(v).trim();
    }
  }
  // merge source_urls
  let source_urls = Array.isArray(lead.source_urls)? lead.source_urls: [];
  if(newData.source_urls && Array.isArray(newData.source_urls)){
    for(const u of newData.source_urls){ if(u && !source_urls.includes(u)) source_urls.push(u); }
    fields.source_urls = JSON.stringify(source_urls);
  }
  // merge images
  if(newData.images && Array.isArray(newData.images) && newData.images.length){
    let imgs = Array.isArray(lead.images)? lead.images: [];
    for(const im of newData.images){ 
      const u = typeof im==='string'? im: im.url;
      if(u && !imgs.some(x=> (typeof x==='string'?x:x.url)===u )) imgs.push(im);
    }
    fields.images = JSON.stringify(imgs);
  }
  // social_links merge
  if(newData.social_links && typeof newData.social_links==='object'){
    const cur = typeof lead.social_links==='object' ? lead.social_links : {};
    fields.social_links = JSON.stringify({ ...cur, ...newData.social_links });
  }
  fields.last_discovered = new Date().toISOString();
  // normalized_name update if name changed
  if(newData.restaurant_name && normalizeName(newData.restaurant_name)!==lead.normalized_name){
    // keep original name, don't overwrite restaurant_name, but update normalized
  }
  if(Object.keys(fields).length===0) return lead;
  const sets = Object.keys(fields).map((k,i)=> `${k}=$${i+2}`).join(', ');
  const vals = Object.values(fields);
  const { rows } = await query(`UPDATE leads SET ${sets}, updated_at=now() WHERE id=$1 RETURNING *`, [id, ...vals]);
  return rows[0];
}

async function createLead(data){
  const code = orderCode();
  const {
    restaurant_name, city='', phone='', whatsapp='', instagram='', facebook='', website='',
    menu_url='', google_listing='', google_place_id='', social_links={}, logo_url='', cover_url='', images=[],
    category='', notes='', source_urls=[], score, score_reason, score_level, priority, source,
  } = data;
  if(!restaurant_name || restaurant_name.length<2) throw badRequest('restaurant_name required');
  const norm = normalizeName(restaurant_name);
  const dup = await query('SELECT id FROM leads WHERE normalized_name=$1 AND LOWER(city)=LOWER($2) LIMIT 1', [norm, city]);
  if(dup.rowCount) throw conflict('DUPLICATE_LEAD', 'Lead already exists for this restaurant/city');
  let s = score, sl = score_level, sr = score_reason, pri = priority;
  if(s===undefined){
    const sc = scoreLead({restaurant_name, city, phone, whatsapp, instagram, facebook, website, menu_url, google_listing, google_place_id, notes, category});
    s=sc.score; sl=sc.level; sr=sc.reason; pri=sc.priority;
  }
  if(!pri) pri = sl==='HOT' ? 'HIGH' : sl==='WARM' ? 'MEDIUM' : 'LOW';
  const src = source || (Array.isArray(source_urls) && source_urls.length ? 'agent-reach' : 'manual');
  const { rows } = await query(
    `INSERT INTO leads (code, restaurant_name, normalized_name, city, phone, whatsapp, instagram, facebook, website, menu_url, google_listing, google_place_id, social_links, logo_url, cover_url, images, category, notes, source_urls, score, score_reason, score_level, priority, source, last_discovered, last_synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
    [code, restaurant_name, norm, city, phone||'', whatsapp||'', normalizeInstagram(instagram)||'', facebook||'', website||'', menu_url||'', google_listing||'', google_place_id||'', JSON.stringify(social_links), logo_url||'', cover_url||'', JSON.stringify(images), category||'', notes||'', JSON.stringify(source_urls), s, sr, sl, pri, src, new Date().toISOString(), new Date().toISOString()]
  );
  return rows[0];
}

async function getById(id){
  const { rows } = await query('SELECT * FROM leads WHERE id=$1', [id]);
  if(!rows[0]) throw notFound('Lead not found');
  return rows[0];
}

async function getByCode(code){
  const { rows } = await query('SELECT * FROM leads WHERE code=$1', [code]);
  if(!rows[0]) throw notFound('Lead not found');
  return rows[0];
}

async function listForOwner({ search, status, city, scoreLevel, priority, source, trialStatus, contacted, sortBy, sortDir, limit, offset, includePossible }){
  const params=[];
  let where='TRUE';
  if(search){
    const esc = search.toLowerCase().replace(/[%_\\]/g,'\\$&');
    params.push(`%${esc}%`);
    const idx = params.length;
    where+=` AND (LOWER(restaurant_name) LIKE $${idx} ESCAPE '\\' OR LOWER(city) LIKE $${idx} ESCAPE '\\' OR LOWER(instagram) LIKE $${idx} ESCAPE '\\' OR LOWER(normalized_name) LIKE $${idx} ESCAPE '\\' OR UPPER(code) LIKE UPPER($${idx}) ESCAPE '\\' OR UPPER('LEAD-'||LPAD(display_id::text,6,'0')) LIKE UPPER($${idx}) ESCAPE '\\')`;
  }
  if(status && STATUSES.includes(status)){ params.push(status); where+=` AND status=$${params.length}`; }
  else if(!includePossible){ where+=` AND status<>'POSSIBLE_DUPLICATE'`; }
  if(city){ params.push(city); where+=` AND LOWER(city)=LOWER($${params.length})`; }
  if(scoreLevel && SCORE_LEVELS.includes(scoreLevel)){ params.push(scoreLevel); where+=` AND score_level=$${params.length}`; }
  if(priority && ['HIGH','MEDIUM','LOW'].includes(priority)){ params.push(priority); where+=` AND priority=$${params.length}`; }
  if(source){ params.push(source); where+=` AND source=$${params.length}`; }
  if(trialStatus){ params.push(trialStatus); where+=` AND trial_status=$${params.length}`; }
  if(contacted==='true'){ where+=` AND contact_date IS NOT NULL`; }
  else if(contacted==='false'){ where+=` AND contact_date IS NULL`; }

  const countRes = await query(`SELECT COUNT(*)::int AS n FROM leads WHERE ${where}`, params);
  // sorting
  let orderBy = 'score DESC, date_discovered DESC';
  const allowedSort = { newest:'date_discovered DESC', oldest:'date_discovered ASC', last_contacted:'contact_date DESC NULLS LAST', priority:"CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, score DESC" };
  if(sortBy && allowedSort[sortBy]) orderBy = allowedSort[sortBy];
  if(sortDir && (sortDir==='asc' || sortDir==='desc') && sortBy && allowedSort[sortBy]){
    // already handled, keep as is
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT *, LPAD(display_id::text,6,'0') AS display_code, ('LEAD-'||LPAD(display_id::text,6,'0')) AS permanent_id FROM leads WHERE ${where} ORDER BY ${orderBy} LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  return { total: countRes.rows[0].n, leads: rows };
}

async function updateStatus(id, nextStatus, opts={}){
  const lead = await getById(id);
  // cooldown check: if NOT_INTERESTED and still in cooldown, block re-activation unless forced
  if(lead.status==='NOT_INTERESTED' && lead.cooldown_ends_at && new Date(lead.cooldown_ends_at) > new Date() && nextStatus!=='LOST' && nextStatus!=='NOT_INTERESTED'){
    if(!opts.force) throw conflict('COOLDOWN_ACTIVE', `Cooldown until ${new Date(lead.cooldown_ends_at).toLocaleDateString()}`);
  }
  assertTransition(lead.status, nextStatus);
  const history = Array.isArray(lead.pipeline_history) ? lead.pipeline_history : [];
  history.push({ from: lead.status, to: nextStatus, at: new Date().toISOString(), note: opts.note||'' });
  const updates = { status: nextStatus, pipeline_history: JSON.stringify(history) };
  if(nextStatus==='NOT_INTERESTED'){
    const cooldownDays = opts.cooldownDays || 90;
    updates.not_interested_at = new Date().toISOString();
    updates.cooldown_ends_at = new Date(Date.now()+cooldownDays*24*60*60*1000).toISOString();
    updates.response_status = opts.response_status||'NOT_INTERESTED';
    if(opts.note) updates.not_interested_note = opts.note;
  }
  if(nextStatus==='CONVERTED'){
    updates.trial_status = 'CONVERTED';
  }
  const sets = Object.keys(updates).map((k,i)=> `${k}=$${i+2}`).join(', ');
  const vals = Object.values(updates);
  const { rows } = await query(`UPDATE leads SET ${sets}, updated_at=now() WHERE id=$1 RETURNING *`, [id, ...vals]);
  return rows[0];
}

async function setContact(id, { contactDate, nextFollowup, note }){
  const lead = await getById(id);
  const followups = Array.isArray(lead.followups) ? lead.followups : [];
  if(note) followups.push({ at: new Date().toISOString(), note });
  const { rows } = await query(
    'UPDATE leads SET contact_date=$2, next_followup=$3, followups=$4, notes=CASE WHEN $5<>$$ THEN $5 ELSE notes END, contact_status=$6, updated_at=now() WHERE id=$1 RETURNING *',
    [id, contactDate||lead.contact_date||new Date().toISOString(), nextFollowup||lead.next_followup, JSON.stringify(followups), note||lead.notes, 'CONTACTED']
  );
  return rows[0];
}

async function setResponseStatus(id, { response_status, note, cooldownDays }){
  const lead = await getById(id);
  const allowed = ['Interested','Maybe Later','Not Interested','Wants Pricing','Wants Demo','Wrong Contact','Other'];
  if(!allowed.includes(response_status)) throw badRequest('Invalid response_status');
  const mappedStatus = response_status==='Not Interested' ? 'NOT_INTERESTED' : lead.status;
  const updates = { response_status };
  if(response_status==='Not Interested'){
    updates.status = 'NOT_INTERESTED';
    updates.not_interested_at = new Date().toISOString();
    updates.cooldown_ends_at = new Date(Date.now()+(cooldownDays||90)*24*60*60*1000).toISOString();
    updates.not_interested_note = note||'';
  }
  const history = Array.isArray(lead.pipeline_history) ? lead.pipeline_history : [];
  if(mappedStatus!==lead.status) history.push({ from: lead.status, to: mappedStatus, at: new Date().toISOString(), response_status });
  const sets = Object.keys(updates).map((k,i)=> `${k}=$${i+2}`).join(', ');
  const vals = Object.values(updates);
  if(mappedStatus!==lead.status){
    vals.push(JSON.stringify(history));
    const { rows } = await query(`UPDATE leads SET ${sets}, pipeline_history=$${vals.length+1}, updated_at=now() WHERE id=$1 RETURNING *`, [id, ...vals]);
    return rows[0];
  } else {
    const { rows } = await query(`UPDATE leads SET ${sets}, updated_at=now() WHERE id=$1 RETURNING *`, [id, ...vals]);
    return rows[0];
  }
}

async function attachDemo(id, { restaurant_id, trial_username, trial_expires }){
  const { rows } = await query(
    `UPDATE leads SET restaurant_id=$2, trial_username=$3, trial_expires=$4, trial_status='ACTIVE', demo_status='GENERATED', status=CASE WHEN status IN ('NEW','RESEARCHED','QUALIFIED') THEN 'DEMO_GENERATED' ELSE status END, last_researched=now(), updated_at=now() WHERE id=$1 RETURNING *`,
    [id, restaurant_id, trial_username, trial_expires]
  );
  return rows[0];
}

async function setOfferAndMessages(id, { offer_data, messages, assets }){
  const { rows } = await query(
    'UPDATE leads SET offer_data=$2, messages=$3, assets=$4, updated_at=now() WHERE id=$1 RETURNING *',
    [id, JSON.stringify(offer_data||{}), JSON.stringify(messages||{}), JSON.stringify(assets||{})]
  );
  return rows[0];
}

async function researchAndScore(id){
  const lead = await getById(id);
  const sc = scoreLead(lead);
  const nextStatus = lead.status==='NEW' ? 'RESEARCHED' : lead.status;
  const history = Array.isArray(lead.pipeline_history) ? lead.pipeline_history : [];
  if(nextStatus!==lead.status) history.push({ from: lead.status, to: nextStatus, at: new Date().toISOString() });
  const { rows } = await query(
    'UPDATE leads SET score=$2, score_reason=$3, score_level=$4, status=$5, pipeline_history=$6, last_researched=now(), updated_at=now() WHERE id=$1 RETURNING *',
    [id, sc.score, sc.reason, sc.level, nextStatus, JSON.stringify(history)]
  );
  return rows[0];
}

async function refreshLead(id, newData){
  const lead = await getById(id);
  // preserve status, update only discovered fields
  const updated = await updateExistingLead(id, newData);
  // re-score
  const rescored = await researchAndScore(id);
  return rescored;
}

async function mergeLeads(targetId, sourceId){
  const target = await getById(targetId);
  const source = await getById(sourceId);
  if(targetId===sourceId) throw badRequest('Cannot merge same lead');
  // keep best contact: prefer non-empty
  const best = (a,b)=> (a && String(a).trim()) ? a : b;
  const merged = {
    phone: best(target.phone, source.phone),
    whatsapp: best(target.whatsapp, source.whatsapp),
    instagram: best(target.instagram, source.instagram),
    facebook: best(target.facebook, source.facebook),
    website: best(target.website, source.website),
    menu_url: best(target.menu_url, source.menu_url),
    google_listing: best(target.google_listing, source.google_listing),
    google_place_id: best(target.google_place_id, source.google_place_id),
    logo_url: best(target.logo_url, source.logo_url),
    cover_url: best(target.cover_url, source.cover_url),
    category: best(target.category, source.category),
    notes: [target.notes, source.notes].filter(Boolean).join('\n---\n'),
    city: best(target.city, source.city),
  };
  // merge arrays
  const source_urls = [...new Set([...(Array.isArray(target.source_urls)?target.source_urls:[]), ...(Array.isArray(source.source_urls)?source.source_urls:[])])];
  const images = [...(Array.isArray(target.images)?target.images:[]), ...(Array.isArray(source.images)?source.images:[])].slice(0,20);
  const social_links = { ...(target.social_links||{}), ...(source.social_links||{}) };
  const followups = [...(Array.isArray(target.followups)?target.followups:[]), ...(Array.isArray(source.followups)?source.followups:[])];
  const pipeline_history = [...(Array.isArray(target.pipeline_history)?target.pipeline_history:[]), ...(Array.isArray(source.pipeline_history)?source.pipeline_history:[]), { from: source.status, to: `MERGED_INTO_${target.code}`, at: new Date().toISOString() }];
  const restaurant_id = target.restaurant_id || source.restaurant_id;
  const trial_username = target.trial_username || source.trial_username;
  const trial_expires = target.trial_expires || source.trial_expires;
  const trial_status = target.trial_status!=='NONE'? target.trial_status : source.trial_status;
  const status = target.status; // keep target status
  const offer_data = target.offer_data && Object.keys(target.offer_data).length ? target.offer_data : source.offer_data;
  const messages = target.messages && Object.keys(target.messages).length ? target.messages : source.messages;
  const assets = target.assets && Object.keys(target.assets).length ? target.assets : source.assets;

  await query(
    `UPDATE leads SET phone=$2, whatsapp=$3, instagram=$4, facebook=$5, website=$6, menu_url=$7, google_listing=$8, google_place_id=$9, logo_url=$10, cover_url=$11, images=$12, category=$13, notes=$14, source_urls=$15, social_links=$16, followups=$17, pipeline_history=$18, restaurant_id=COALESCE($19, restaurant_id), trial_username=COALESCE(NULLIF($20,''), trial_username), trial_expires=COALESCE($21, trial_expires), trial_status=$22, offer_data=$23, messages=$24, assets=$25, city=$26, updated_at=now() WHERE id=$1`,
    [targetId, merged.phone, merged.whatsapp, merged.instagram, merged.facebook, merged.website, merged.menu_url, merged.google_listing, merged.google_place_id, merged.logo_url, merged.cover_url, JSON.stringify(images), merged.category, merged.notes, JSON.stringify(source_urls), JSON.stringify(social_links), JSON.stringify(followups), JSON.stringify(pipeline_history), restaurant_id, trial_username, trial_expires, trial_status, JSON.stringify(offer_data), JSON.stringify(messages), JSON.stringify(assets), merged.city]
  );
  // delete source
  await query('DELETE FROM leads WHERE id=$1', [sourceId]);
  return getById(targetId);
}

async function stats(){
  const r = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE score_level='HOT')::int AS hot,
      COUNT(*) FILTER (WHERE score_level='WARM')::int AS warm,
      COUNT(*) FILTER (WHERE score_level='COLD')::int AS cold,
      COUNT(*) FILTER (WHERE restaurant_id IS NOT NULL)::int AS demos,
      COUNT(*) FILTER (WHERE contact_date IS NOT NULL)::int AS contacted,
      COUNT(*) FILTER (WHERE status='REPLIED')::int AS replied,
      COUNT(*) FILTER (WHERE trial_status='ACTIVE')::int AS active_trials,
      COUNT(*) FILTER (WHERE trial_status='ACTIVE' AND trial_expires < now() + INTERVAL '2 days')::int AS expiring_trials,
      COUNT(*) FILTER (WHERE status='CONVERTED')::int AS converted,
      COUNT(*) FILTER (WHERE status='NOT_INTERESTED')::int AS not_interested,
      COUNT(*) FILTER (WHERE status='POSSIBLE_DUPLICATE')::int AS possible_duplicates,
      COUNT(*) FILTER (WHERE status='NEW')::int AS new_leads
    FROM leads`);
  const s2 = await query(`SELECT COUNT(*)::int AS n FROM search_runs`);
  const s3 = await query(`SELECT COALESCE(SUM(duplicates),0)::int AS dup, COALESCE(SUM(possible_duplicates),0)::int AS poss FROM search_runs WHERE created_at >= date_trunc('month', now())`);
  const row = r.rows[0];
  const convRate = row.total ? Math.round((row.converted/row.total)*100) : 0;
  const unique = row.total - (row.possible_duplicates||0);
  return { ...row, unique_leads: unique, total_searches: s2.rows[0].n, duplicates_prevented: s3.rows[0].dup, possible_duplicates_month: s3.rows[0].poss, conversion_rate: convRate, duplicates_prevented_month: s3.rows[0].dup };
}

async function createSearchRun({ query: qParam, search_query, city, location, results_found, new_leads, duplicates, possible_duplicates, updated_existing }){
  const q = search_query || qParam || '';
  // ponytail: handle both column names for backward compat (query vs search_query)
  try{
    const { rows } = await query(
      `INSERT INTO search_runs (search_query, city, location, results_found, new_leads, duplicates, possible_duplicates, updated_existing)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [q, city||'', location||'', results_found||0, new_leads||0, duplicates||0, possible_duplicates||0, updated_existing||0]
    );
    return rows[0];
  }catch(e){
    if(e.code==='42703'){ // undefined_column
      const { rows } = await query(
        `INSERT INTO search_runs (query, city, location, results_found, new_leads, duplicates, possible_duplicates, updated_existing)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [q, city||'', location||'', results_found||0, new_leads||0, duplicates||0, possible_duplicates||0, updated_existing||0]
      );
      return rows[0];
    }
    throw e;
  }
}

async function listSearchRuns(limit=20){
  const { rows } = await query('SELECT * FROM search_runs ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

module.exports = {
  STATUSES, SCORE_LEVELS, TRANSITIONS,
  scoreLead, createLead, getById, getByCode, listForOwner, updateStatus, setContact, setResponseStatus, attachDemo, setOfferAndMessages, researchAndScore, refreshLead, findDuplicate, updateExistingLead, mergeLeads, stats, createSearchRun, listSearchRuns, assertTransition,
  normalizeName, normalizePhone, normalizeInstagram, extractDomain, nameSimilarity
};
