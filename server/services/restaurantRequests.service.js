'use strict';
const { query } = require('../db/pool');
const { badRequest, notFound } = require('../utils/errors');
const { orderCode } = require('../utils/ids');

async function create(payload){
  // generate readable code, retry on collision
  for(let i=0;i<5;i++){
    const code = orderCode(); // 6-8 alnum
    try{
      const { rows } = await query(
        `INSERT INTO restaurant_requests (code, customer_name, restaurant_name, phone, whatsapp, city, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [code, payload.customerName, payload.restaurantName, payload.phone, payload.whatsapp, payload.city||'', payload.notes||'']
      );
      return rows[0];
    }catch(e){ if(e.code==='23505') continue; throw e; }
  }
  throw badRequest('Could not create request, try again');
}
async function list({status, limit, offset}){
  const params=[];
  let where='TRUE';
  if(status){ params.push(status); where+=` AND status=$${params.length}`; }
  const cnt = await query(`SELECT COUNT(*)::int n FROM restaurant_requests WHERE ${where}`, params);
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT * FROM restaurant_requests WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  return { total: cnt.rows[0].n, requests: rows };
}
async function getById(id){
  const { rows } = await query('SELECT * FROM restaurant_requests WHERE id=$1', [id]);
  if(!rows[0]) throw notFound('Request not found');
  return rows[0];
}
async function setStatus(id, status){
  const allowed=['pending','contacted','approved','rejected'];
  if(!allowed.includes(status)) throw badRequest('Invalid status');
  const { rows } = await query('UPDATE restaurant_requests SET status=$2 WHERE id=$1 RETURNING *', [id, status]);
  if(!rows[0]) throw notFound('Request not found');
  return rows[0];
}
async function remove(id){
  const { rowCount } = await query('DELETE FROM restaurant_requests WHERE id=$1', [id]);
  if(!rowCount) throw notFound('Request not found');
}
module.exports={ create, list, getById, setStatus, remove };
