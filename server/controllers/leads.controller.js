'use strict';
const crypto = require('crypto');
const leads = require('../services/leads.service');
const enrichment = require('../services/enrichment.service');
const restaurants = require('../services/restaurants.service');
const users = require('../services/users.service');
const menuService = require('../services/menu.service');
const categoriesService = require('../services/categories.service');
const { normalizeSlug } = require('../utils/checks');
const { badRequest } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const config = require('../../config');

async function list(req,res){
  const page = Math.max(1, parseInt(req.query.page)||1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit)||25));
  const offset=(page-1)*limit;
  const { total, leads: rows } = await leads.listForOwner({
    search: req.query.search||null,
    status: req.query.status||null,
    city: req.query.city||null,
    scoreLevel: req.query.scoreLevel||null,
    priority: req.query.priority||null,
    source: req.query.source||null,
    trialStatus: req.query.trialStatus||null,
    contacted: req.query.contacted||null,
    sortBy: req.query.sortBy||null,
    sortDir: req.query.sortDir||null,
    limit, offset
  });
  res.json({ total, page, limit, leads: rows });
}

async function getOne(req,res){
  const lead = await leads.getById(req.params.id);
  // include display permanent ID
  res.json({ lead });
}

async function create(req,res){
  const b=req.body||{};
  const candidate = {
    restaurant_name: String(b.restaurant_name||'').trim(),
    city: String(b.city||'').trim(),
    phone: String(b.phone||'').trim(),
    whatsapp: String(b.whatsapp||b.phone||'').trim(),
    instagram: String(b.instagram||'').trim(),
    facebook: String(b.facebook||'').trim(),
    website: String(b.website||'').trim(),
    menu_url: String(b.menu_url||'').trim(),
    google_listing: String(b.google_listing||'').trim(),
    google_place_id: String(b.google_place_id||'').trim(),
    social_links: b.social_links||{},
    logo_url: String(b.logo_url||'').trim(),
    cover_url: String(b.cover_url||'').trim(),
    images: Array.isArray(b.images)?b.images:[],
    category: String(b.category||'').trim(),
    notes: String(b.notes||'').trim(),
    source_urls: Array.isArray(b.source_urls)?b.source_urls:[],
  };
  if(!candidate.restaurant_name) throw badRequest('restaurant_name required');
  const dup = await leads.findDuplicate(candidate);
  if(dup.type==='MATCH'){
    const ex = dup.lead;
    if(ex.status==='CONVERTED' || (ex.trial_status==='ACTIVE' && ex.trial_expires && new Date(ex.trial_expires)>new Date())){
      return res.status(409).json({ error:{ code:'DUPLICATE_CONVERTED', message:'Already converted/customer' }, existing: ex, duplicate: dup });
    }
    if(ex.status==='NOT_INTERESTED' && ex.cooldown_ends_at && new Date(ex.cooldown_ends_at)>new Date()){
      return res.status(409).json({ error:{ code:'DUPLICATE_COOLDOWN', message:`Cooldown until ${new Date(ex.cooldown_ends_at).toLocaleDateString()}` }, existing: ex, duplicate: dup });
    }
    const updated = await leads.updateExistingLead(ex.id, candidate);
    // auto-prepare if requested (chat flow)
    if(b.prepare){
      try{ const r=await prepareOne(updated.id); return res.json({ lead:r.lead, existing:true, duplicate:dup, prepared:true }); }catch(_){}
    }
    return res.json({ lead: updated, existing: true, duplicate: dup });
  }
  if(dup.type==='UNCERTAIN'){
    const lead = await leads.createLead({ ...candidate, status:'POSSIBLE_DUPLICATE', possible_duplicate_of: dup.lead.id });
    await require('../db/pool').query('UPDATE leads SET status=$2, is_possible_duplicate=true, possible_duplicate_of=$3 WHERE id=$1', [lead.id, 'POSSIBLE_DUPLICATE', dup.lead.id]);
    const fresh = await leads.getById(lead.id);
    if(b.prepare){
      try{ const r=await prepareOne(fresh.id); return res.status(201).json({ lead:r.lead, possibleDuplicate: dup.lead, duplicate:dup, prepared:true }); }catch(_){}
    }
    return res.status(201).json({ lead: fresh, possibleDuplicate: dup.lead, duplicate: dup });
  }
  const lead = await leads.createLead(candidate);
  if(b.prepare){
    try{ const r=await prepareOne(lead.id); return res.status(201).json({ lead:r.lead, prepared:true }); }catch(_){}
  }
  res.status(201).json({ lead });
}

async function bulkImport(req,res){
  const items = Array.isArray(req.body.leads) ? req.body.leads : Array.isArray(req.body) ? req.body : [];
  if(!items.length) throw badRequest('leads array required');
  const results=[];
  for(const b of items.slice(0,20)){
    const candidate = {
      restaurant_name: String(b.restaurant_name||b.name||'').trim(),
      city: String(b.city||'').trim(),
      phone: String(b.phone||'').trim(),
      whatsapp: String(b.whatsapp||b.phone||'').trim(),
      instagram: String(b.instagram||'').trim(),
      facebook: String(b.facebook||'').trim(),
      website: String(b.website||'').trim(),
      menu_url: String(b.menu_url||'').trim(),
      google_listing: String(b.google_listing||'').trim(),
      google_place_id: String(b.google_place_id||'').trim(),
      social_links: b.social_links||{},
      logo_url: String(b.logo_url||'').trim(),
      cover_url: String(b.cover_url||'').trim(),
      images: Array.isArray(b.images)?b.images:[],
      category: String(b.category||'').trim(),
      notes: String(b.notes||'').trim(),
      source_urls: Array.isArray(b.source_urls)?b.source_urls:(b.source_url?[b.source_url]:[]),
    };
    if(!candidate.restaurant_name){ results.push({ name:'', action:'ERROR', error:'missing name' }); continue; }
    try{
      const dup = await leads.findDuplicate(candidate);
      if(dup.type==='MATCH'){
        if(dup.lead.status==='CONVERTED' || (dup.lead.status==='NOT_INTERESTED' && dup.lead.cooldown_ends_at && new Date(dup.lead.cooldown_ends_at)>new Date())){
          results.push({ name:candidate.restaurant_name, action:'SKIP_COOLDOWN', existing:dup.lead.code });
          continue;
        }
        await leads.updateExistingLead(dup.lead.id, candidate);
        if(req.body.prepare){
          try{ await prepareOne(dup.lead.id); }catch(_){}
        }
        results.push({ name:candidate.restaurant_name, action:'UPDATED', existing:dup.lead.code });
      } else if(dup.type==='UNCERTAIN'){
        const lead = await leads.createLead({ ...candidate, status:'POSSIBLE_DUPLICATE' });
        await require('../db/pool').query('UPDATE leads SET is_possible_duplicate=true, possible_duplicate_of=$2 WHERE id=$1', [lead.id, dup.lead.id]);
        if(req.body.prepare){ try{ await prepareOne(lead.id); }catch(_){} }
        results.push({ name:candidate.restaurant_name, action:'POSSIBLE', code:lead.code, matches:dup.lead.code });
      } else {
        const lead = await leads.createLead(candidate);
        if(req.body.prepare){
          try{ await prepareOne(lead.id); }catch(e){ results.push({ name:candidate.restaurant_name, action:'NEW', code:lead.code, prepareError:e.message }); continue; }
        }
        results.push({ name:candidate.restaurant_name, action:'NEW', code:lead.code });
      }
    }catch(e){ results.push({ name:candidate.restaurant_name, action:'ERROR', error:e.message }); }
  }
  // create search run for bulk
  try{
    await leads.createSearchRun({ query:'bulk import via chat', city: items[0]?.city||'', location: items[0]?.city||'', results_found: items.length, new_leads: results.filter(r=>r.action==='NEW').length, duplicates: results.filter(r=>r.action.startsWith('SKIP')||r.action==='UPDATED').length, possible_duplicates: results.filter(r=>r.action==='POSSIBLE').length, updated_existing: results.filter(r=>r.action==='UPDATED').length });
  }catch(_){}
  res.json({ total: items.length, results });
}

async function prepareOne(id){
  let lead = await leads.getById(id);
  const { assets, menu_url } = await enrichment.researchLead(lead);
  await require('../db/pool').query('UPDATE leads SET assets=$2, menu_url=COALESCE(NULLIF($3,\'\'), menu_url), last_researched=now() WHERE id=$1', [id, JSON.stringify(assets), menu_url]);
  lead = await leads.researchAndScore(id);
  let demo=null;
  if(!lead.restaurant_id){
    const r = await generateDemoForLead(lead);
    demo=r; lead = await leads.getById(id);
  } else {
    const r = await restaurants.getById(lead.restaurant_id);
    demo = r ? { slug: r.slug, admin:{ username: lead.trial_username, password:'••••••••'} } : null;
  }
  const offer = buildOffer(lead, demo);
  const messages = buildMessages(lead, demo);
  await leads.setOfferAndMessages(id, { offer_data: offer, messages, assets });
  return { lead: await leads.getById(id), offer, messages, demo };
}

async function discover(req,res){
  const { city, query, limit, findNew } = req.body||{};
  let found=[];
  try{ found = await enrichment.discoverViaAgentReach({ city: city||'Amman', query, limit: Math.min(20, parseInt(limit)||8) }); }
  catch(e){ return res.status(500).json({ error:{ code:'DISCOVER_FAILED', message:e.message } }); }
  let new_leads=0, duplicates=0, possible=0, updated=0;
  const created=[];
  const details=[];
  for(const f of found){
    try{
      const dup = await leads.findDuplicate(f);
      if(dup.type==='NEW'){
        const lead = await leads.createLead(f);
        new_leads++; created.push(lead); details.push({ name:f.restaurant_name, action:'NEW', code:lead.code });
    } else if(dup.type==='MATCH'){
      const ex = dup.lead;
      if(ex.status==='CONVERTED'){
        duplicates++; details.push({ name:f.restaurant_name, action:'SKIP_CONVERTED', existing:ex.code });
        continue;
      }
      if(ex.status==='NOT_INTERESTED' && ex.cooldown_ends_at && new Date(ex.cooldown_ends_at)>new Date()){
        duplicates++; details.push({ name:f.restaurant_name, action:'SKIP_COOLDOWN', existing:ex.code });
        continue;
      }
      if(findNew){
        // ponytail: Find New Only — don't update, just count as duplicate
        duplicates++; details.push({ name:f.restaurant_name, action:'SKIP_FINDNEW', existing:ex.code });
        continue;
      }
      if(ex.trial_status==='ACTIVE' && ex.trial_expires && new Date(ex.trial_expires)>new Date() && !req.body.refresh){
        duplicates++; details.push({ name:f.restaurant_name, action:'SKIP_ACTIVE_TRIAL', existing:ex.code });
        continue;
      }
      await leads.updateExistingLead(ex.id, f);
      updated++; duplicates++; details.push({ name:f.restaurant_name, action:'UPDATED', existing:ex.code });
      } else if(dup.type==='UNCERTAIN'){
        const lead = await leads.createLead({ ...f });
        await require('../db/pool').query('UPDATE leads SET status=$2, is_possible_duplicate=true, possible_duplicate_of=$3 WHERE id=$1', [lead.id, 'POSSIBLE_DUPLICATE', dup.lead.id]);
        possible++; details.push({ name:f.restaurant_name, action:'POSSIBLE', code:lead.code, matches: dup.lead.code });
      }
    }catch(e){
      // per-lead error shouldn't kill whole run
      details.push({ name:f.restaurant_name||'unknown', action:'ERROR', error:e.message });
      continue;
    }
  }
  let searchRun=null;
  try{
    searchRun = await leads.createSearchRun({
      query: query||'', city: city||'', location: city||'', results_found: found.length,
      new_leads, duplicates, possible_duplicates: possible, updated_existing: updated
    });
  }catch(e){ /* ignore */ }
  const filteredLeads = findNew ? created : [...created];
  res.json({ discovered: found.length, created: new_leads, duplicates, possible_duplicates: possible, updated_existing: updated, leads: filteredLeads, details, searchRun });
}

async function research(req,res){
  const lead = await leads.getById(req.params.id);
  const { assets, menu_url } = await enrichment.researchLead(lead);
  const { query } = require('../db/pool');
  await query('UPDATE leads SET assets=$2, menu_url=COALESCE(NULLIF($3,\'\'), menu_url), last_researched=now(), updated_at=now() WHERE id=$1', [lead.id, JSON.stringify(assets), menu_url]);
  const updated = await leads.researchAndScore(req.params.id);
  res.json({ lead: updated, assets });
}

async function refresh(req,res){
  const lead = await leads.getById(req.params.id);
  if(lead.status==='CONVERTED'){
    return res.status(409).json({ error:{ code:'CONVERTED', message:'Converted customer — refresh only if explicitly requested' } });
  }
  // allow refresh even in cooldown if explicit refresh
  const { assets, menu_url } = await enrichment.researchLead(lead);
  const updatedLead = await leads.refreshLead(req.params.id, { ...lead, ...assets, menu_url, last_researched: new Date().toISOString() });
  // also re-score
  const rescored = await leads.researchAndScore(req.params.id);
  res.json({ lead: rescored, assets });
}

async function generateDemoForLead(lead){
  const slugBase = normalizeSlug(lead.restaurant_name).slice(0,40) || 'demo-'+lead.code.slice(0,6).toLowerCase();
  let slug = slugBase;
  for(let i=0;i<3;i++){
    try{
      const restaurant = await restaurants.createRestaurant({ name: lead.restaurant_name, slug, maxMenuItems: 100, subscriptionEndsAt: new Date(Date.now()+7*24*60*60*1000).toISOString() });
      const username = slug.replace(/[^a-z0-9]/g,'_').slice(0,20) + '_admin';
      const password = crypto.randomBytes(9).toString('base64url');
      const admin = await users.createAdmin({ restaurantId: restaurant.id, username, email: null, password });
      const cat1 = await categoriesService.createOwned(restaurant.id, { name: 'الأطباق الرئيسية', position: 0 });
      const cat2 = await categoriesService.createOwned(restaurant.id, { name: 'المشروبات والحلويات', position: 1 });
      const demoItems = [
        { categoryId: cat1.id, name: 'شاورما دجاج', description: 'شاورما طازجة مع صوص خاص', priceCents: 1200 },
        { categoryId: cat1.id, name: 'كباب لحم', description: 'لحم بلدي مشوي', priceCents: 1800 },
        { categoryId: cat1.id, name: 'فلافل', description: 'فلافل مقرمش', priceCents: 600 },
        { categoryId: cat2.id, name: 'كنافة نابلسية', description: 'حلوى شرقية', priceCents: 900 },
        { categoryId: cat2.id, name: 'عصير برتقال', description: 'طازج', priceCents: 400 },
        { categoryId: cat2.id, name: 'شاي بالنعنع', description: '', priceCents: 200 },
      ];
      for(const it of demoItems){ await menuService.createOwned(restaurant.id, it); }
      await leads.attachDemo(lead.id, { restaurant_id: restaurant.id, trial_username: username, trial_expires: new Date(Date.now()+7*24*60*60*1000).toISOString() });
      try{ await leads.updateStatus(lead.id, 'DEMO_GENERATED'); }catch(_){}
      return { restaurant, admin: { username, password }, slug };
    }catch(e){
      if(e.code==='SLUG_TAKEN' || e.code==='DUPLICATE'){
        slug = slugBase + '-' + Math.random().toString(36).slice(2,6);
        continue;
      }
      throw e;
    }
  }
  throw badRequest('Could not create demo restaurant');
}

async function generateDemo(req,res){
  const lead = await leads.getById(req.params.id);
  if(lead.restaurant_id){
    const rest = await restaurants.getById(lead.restaurant_id);
    if(rest) return res.json({ lead, restaurant: rest, already: true });
  }
  if(lead.status==='CONVERTED') throw badRequest('Already converted');
  const result = await generateDemoForLead(lead);
  const updatedLead = await leads.getById(req.params.id);
  const offer = buildOffer(updatedLead, result);
  const messages = buildMessages(updatedLead, result);
  await leads.setOfferAndMessages(lead.id, { offer_data: offer, messages, assets: { demo: result } });
  res.json({ lead: await leads.getById(req.params.id), restaurant: result.restaurant, credentials: { username: result.admin.username, password: result.admin.password }, offer, messages });
}

function buildOffer(lead, demo){
  const appUrl = config.appUrl || 'https://restaurants-platform.wasmer.app';
  const demoUrl = demo ? `${appUrl}/restaurant/${demo.slug}` : '';
  const loginUrl = `${appUrl}/login.html`;
  // ponytail: personalized headline that sells outcome, not feature
  const headline = `لـ ${lead.restaurant_name} — استقبل طلباتك مباشرة بدون وسيط`;
  const sub = `جهزنا لك موقع طلب باسم مطعمك — زبونك يطلب من رابطك الخاص، الطلب يوصلك واتساب + لوحة تحكم، بدون عمولة Talabat (20%).`;
  return {
    headline, sub,
    demoUrl, loginUrl,
    username: demo?.admin?.username||lead.trial_username||'',
    logo: lead.logo_url||'',
    cover: lead.cover_url||'',
    restaurant_name: lead.restaurant_name,
    city: lead.city,
    score: lead.score,
    score_level: lead.score_level,
    reason: lead.score_reason||'',
  };
}

function buildMessages(lead, demo){
  const appUrl = config.appUrl || 'https://restaurants-platform.wasmer.app';
  const demoUrl = demo ? `${appUrl}/restaurant/${demo.slug}` : `${appUrl}/restaurant/demo`;
  const loginUrl = `${appUrl}/login.html`;
  const user = demo?.admin?.username || lead.trial_username || `${lead.restaurant_name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,15)}_admin`;
  const pass = demo?.admin?.password || '••••••••';
  const hasWebsite = !!lead.website;
  const hasMenu = !!lead.menu_url;
  const hasInsta = !!lead.instagram;
  // Personalized situation — the hook that proves we researched them
  let hook='';
  let problem='';
  if(!hasWebsite && hasInsta){
    hook = `شفت مطعمكم ${lead.restaurant_name} في ${lead.city||'نابلس'} — انستغرامكم نشط ومنيوكم بشهّي`;
    problem = `لكن لاحظت أن الطلب عندكم فقط عبر الخاص — الزبون ببعت رسالة، بتردوا يدوياً، بصير تأخير وأخطاء، وما في رابط منيو بأسعار واضحة`;
  } else if(!hasWebsite){
    hook = `شفت ${lead.restaurant_name} في ${lead.city} — سمعتكم طيبة`;
    problem = `لكن ما لقيت لكم موقع للطلب — الزبون اليوم بدو رابط يطلب منه مباشرة`;
  } else if(!hasMenu){
    hook = `شفت موقعكم ${lead.website.replace(/^https?:\/\//,'')} — مرتب`;
    problem = `لكن ما في منيو أونلاين بأسعار — الزبون بضطر يسأل عن كل صنف`;
  } else if(hasMenu && !/order/i.test(lead.menu_url)){
    hook = `شفت منيو الصور عندكم`;
    problem = `حلو لكن بدون سلة طلب — الزبون بشوف الصور وبعدين برجع يحكيكم خاص ليطلب`;
  } else {
    hook = `شفت أنكم تستقبلوا طلبات أونلاين`;
    problem = `لكن عبر وسيط بياخذ 18-25% من كل طلب — من 100 طلب بـ 5000 شيكل، بتخسروا 1000`;
  }
  const solution = `عشان هيك جهزت لكم **ديمو حي باسم مطعمكم** — نفس منيوكم، بألوانكم، جاهز للطلب:`;
  const benefits = `✓ رابط خاص فيكم (مثلاً ${demoUrl}) + QR للطاولات\n✓ الزبون بطلب من موقعكم — الطلب بوصلك واتساب + لوحة تحكم مع كود تتبع\n✓ حجز طاولات بنفس الموقع\n✓ **0% عمولة** — $19.99/شهر ثابت، لو بعت بـ 10,000 بتوفر 2000 مقارنة بـ Talabat`;
  const cta = `جربوه الآن 7 أيام مجاناً — بدون بطاقة، أنا جهزت كل شيء:`;
  // WhatsApp — short, punchy, proof + demo + CTA
  const whatsapp = `مرحبا ${lead.restaurant_name} 👋\n${hook} ${problem}.\n\n${solution}\n${benefits}\n\n${cta}\n🔗 ${demoUrl}\n🔐 دخول: ${loginUrl}\n👤 ${user}\n🔑 ${pass}\n\nلو عجبكم بتخلوه، لو لا بحذفه — شو رأيكم أبعتلكم فيديو 30 ثانية كيف الزبون بطلب؟\n— Restivo | واتساب: +972567439846`;
  // Instagram — even shorter (people skim)
  const instagram = `مرحبا ${lead.restaurant_name} 👋 ${hook.split('—')[0]} — جهزت لكم ديمو حي: ${demoUrl} (طلب مباشر + واتساب + حجز طاولات، 0% عمولة $19.99/شهر).\nتجربة 7 أيام: ${loginUrl} | ${user} / ${pass}\nتحبوا تشوفوه؟`;
  // Email — full story with subject that gets opened
  const email_subject = `لـ ${lead.restaurant_name}: وفر 20% من كل طلب — ديمو جاهز باسمكم`;
  const email_body = `مرحبا فريق ${lead.restaurant_name}،\n\n${hook}.\n${problem}.\n\n${solution}\n${demoUrl}\n\n${benefits}\n\n${cta}\n• رابط الديمو: ${demoUrl}\n• لوحة الإدارة: ${loginUrl}\n• المستخدم: ${user}\n• الباسورد: ${pass}\n• المدة: 7 أيام مجاناً\n\nمثال: مطعم في ${lead.city||'عمان'} كان يدفع 900 شيكل عمولة شهرياً، الآن يدفع $19.99 ثابت ويحتفظ ببيانات زبائنه.\n\nلو حابين أعدل الأصناف/الأسعار حسب منيوكم الحقيقي، ابعتولي منيو وصور وأنا أحدثه خلال ساعة.\n\nبانتظار رأيكم،\nRestivo — +972567439846\nhttps://restaurants-platform.wasmer.app\n\nP.S. الديمو فيه 6 أصناف مؤقتة للعرض — بنبدلها بمنيوكم الحقيقي مجاناً.`;
  // Short version for offer card
  const short_whatsapp = `مرحبا ${lead.restaurant_name} — جهزت لكم موقع طلب خاص ${demoUrl} (0% عمولة $19.99/شهر) — تجربة 7 أيام: ${user}/${pass}`;
  return {
    whatsapp, short_whatsapp,
    instagram,
    email_subject, email_body,
    situation: hook + ' — ' + problem,
    hook, problem, benefits,
  };
}

async function prepareEverything(req,res){
  const id = req.params.id;
  let lead = await leads.getById(id);
  const steps = [];
  try{
    const { assets, menu_url } = await enrichment.researchLead(lead);
    await require('../db/pool').query('UPDATE leads SET assets=$2, menu_url=COALESCE(NULLIF($3,\'\'), menu_url), last_researched=now() WHERE id=$1', [id, JSON.stringify(assets), menu_url]);
    lead = await leads.researchAndScore(id);
    steps.push({ step:'research', ok:true, score: lead.score, level: lead.score_level });
    let demo=null;
    if(!lead.restaurant_id){
      const r = await generateDemoForLead(lead);
      demo=r;
      lead = await leads.getById(id);
      steps.push({ step:'demo', ok:true, slug: r.slug });
    } else {
      demo = { slug: (await restaurants.getById(lead.restaurant_id))?.slug, admin:{ username: lead.trial_username, password:'••••••••'} };
      steps.push({ step:'demo', ok:true, existing:true });
    }
    const offer = buildOffer(lead, demo);
    const messages = buildMessages(lead, demo);
    await leads.setOfferAndMessages(id, { offer_data: offer, messages, assets });
    steps.push({ step:'offer', ok:true });
    steps.push({ step:'messages', ok:true });
    lead = await leads.getById(id);
    const qc = await qualityCheck(lead, demo, offer, messages);
    steps.push({ step:'quality', ok: qc.ok, issues: qc.issues });
    res.json({ lead, steps, demo, offer, messages, qc });
  }catch(e){
    res.status(e.status||500).json({ error:{ code:e.code||'PREPARE_FAILED', message:e.message }, steps });
  }
}

async function qualityCheck(lead, demo, offer, messages){
  const issues=[];
  if(!lead.restaurant_name) issues.push('Missing restaurant name');
  if(!demo || !demo.slug) issues.push('Demo slug missing');
  else {
    try{
      const pv = await restaurants.getPublicView(demo.slug);
      if(!pv) issues.push('Demo URL not reachable');
      if(!pv || pv.items.length===0) issues.push('No menu items');
    }catch(_){ issues.push('Demo URL error'); }
    if(!lead.trial_username && !(demo.admin&&demo.admin.username)) issues.push('Missing trial username');
    const exp = lead.trial_expires || (demo && demo.expires);
    if(!exp || new Date(exp) <= new Date()) issues.push('Trial expiry invalid');
  }
  const msgs = messages || lead.messages||{};
  if(!msgs.whatsapp || !msgs.whatsapp.includes(lead.restaurant_name)) issues.push('WhatsApp missing restaurant name');
  const off = offer || lead.offer_data||{};
  if(!off.demoUrl) issues.push('Offer missing demo URL');
  return { ok: issues.length===0, issues };
}

async function updateStatus(req,res){
  const { status, note, cooldownDays, response_status } = req.body||{};
  if(response_status){
    const lead = await leads.setResponseStatus(req.params.id, { response_status, note, cooldownDays });
    return res.json({ lead });
  }
  const lead = await leads.updateStatus(req.params.id, status, { note, cooldownDays });
  res.json({ lead });
}

async function setResponse(req,res){
  const { response_status, note, cooldownDays } = req.body||{};
  const lead = await leads.setResponseStatus(req.params.id, { response_status, note, cooldownDays });
  res.json({ lead });
}

async function contact(req,res){
  const { note, nextFollowup } = req.body||{};
  const lead = await leads.setContact(req.params.id, { note, nextFollowup, contactDate: new Date().toISOString() });
  try{
    if(['NEW','RESEARCHED','QUALIFIED','DEMO_GENERATED'].includes(lead.status)){
      await leads.updateStatus(req.params.id, 'CONTACTED');
    }
  }catch(_){}
  res.json({ lead: await leads.getById(req.params.id) });
}

async function merge(req,res){
  const { targetId, sourceId } = req.body||{};
  if(!targetId || !sourceId) throw badRequest('targetId and sourceId required');
  const merged = await leads.mergeLeads(targetId, sourceId);
  res.json({ lead: merged });
}

async function stats(req,res){
  const s = await leads.stats();
  const runs = await leads.listSearchRuns(5);
  res.json({ ...s, recentRuns: runs });
}

async function searchRuns(req,res){
  const rows = await leads.listSearchRuns(parseInt(req.query.limit)||20);
  res.json({ runs: rows });
}

async function offerPreview(req,res){
  const lead = await leads.getById(req.params.id);
  const offer = lead.offer_data||{};
  res.json({ offer, lead: { restaurant_name: lead.restaurant_name, city: lead.city, score: lead.score, score_level: lead.score_level, code: lead.code } });
}

async function publicOffer(req,res){
  const lead = await leads.getByCode(String(req.params.code).trim().toUpperCase());
  res.json({ code: lead.code, restaurant_name: lead.restaurant_name, city: lead.city, score: lead.score, score_level: lead.score_level, offer: lead.offer_data, messages: { whatsapp: (lead.messages||{}).whatsapp, instagram: (lead.messages||{}).instagram } });
}

module.exports = {
  list: asyncHandler(list),
  getOne: asyncHandler(getOne),
  create: asyncHandler(create),
  bulkImport: asyncHandler(bulkImport),
  discover: asyncHandler(discover),
  research: asyncHandler(research),
  refresh: asyncHandler(refresh),
  generateDemo: asyncHandler(generateDemo),
  prepareEverything: asyncHandler(prepareEverything),
  updateStatus: asyncHandler(updateStatus),
  setResponse: asyncHandler(setResponse),
  contact: asyncHandler(contact),
  merge: asyncHandler(merge),
  stats: asyncHandler(stats),
  searchRuns: asyncHandler(searchRuns),
  offerPreview: asyncHandler(offerPreview),
  publicOffer: asyncHandler(publicOffer),
};
