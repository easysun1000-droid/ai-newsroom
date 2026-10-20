Set-Content -Path 'c:\Users\easys\OneDrive\Desktop\2026_2학기\ai-newsroom\js\app.js' -Value @'
const grid = document.getElementById('newsGrid');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');

let allNews = [];
let currentLevel = 'all';
let currentType = 'real';
let currentRange = '7d';
let currentCategory = 'all';
let searchQuery = '';
let visibleCount = 9;

async function loadData(){
  try{
    const res = await fetch('./data/news.json');
    if(!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    if(!Array.isArray(data) || data.length===0) throw new Error('empty');
    allNews = data;
    populateCategories();
  }catch(e){
    console.warn('news.json 로드 실패', e);
    allNews = [];
  }
  render();
}

function populateCategories(){
  const cats = new Set();
  allNews.forEach(n=>{ (n.categories||[]).forEach(c=>cats.add(c)); });
  const options = Array.from(cats).sort();
  if(categorySelect){
    categorySelect.innerHTML = '<option value="all">전체</option>' + options.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }
}

function parseDate(d){ if(!d) return null; try{ return new Date(d); }catch{ return null; } }
function isKorean(str){ return /[가-힣]/.test(str||''); }

function filterNews(){
  const now = new Date();
  let start = null;
  if(currentRange==='today'){ start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
  else if(currentRange==='7d'){ start = new Date(now.getTime() - 7*24*60*60*1000); }
  else if(currentRange==='30d'){ start = new Date(now.getTime() - 30*24*60*60*1000); }
  let data = allNews.filter(n=>{
    if(currentType==='real' && n.is_sample) return false;
    if(currentType==='sample' && !n.is_sample) return false;
    if(currentCategory!=='all'){ const cats = n.categories||[]; if(!cats.includes(currentCategory)) return false; }
    if(searchQuery){ const q = searchQuery.toLowerCase(); const hay = `${n.title} ${n.source} ${(n.categories||[]).join(' ')}`.toLowerCase(); if(!hay.includes(q)) return false; }
    if(start){ const d = parseDate(n.date); if(!d) return false; if(d < start) return false; }
    if(currentLevel!=='all'){ const levels = n.levels||[]; if(levels.length>0 && !levels.includes(currentLevel)){ if(!n.is_sample) return true; return false; } }
    return true;
  });
  data.sort((a,b)=>{ const da = parseDate(a.date); const db = parseDate(b.date); if(da && db) return db - da; if(da) return -1; if(db) return 1; return 0; });
  data.sort((a,b)=>{ const ak = isKorean(a.title); const bk = isKorean(b.title); if(ak && !bk) return -1; if(!ak && bk) return 1; return 0; });
  return data;
}

function render(){
  const data = filterNews();
  const total = data.length;
  visibleCount = 9;
  grid.innerHTML = '';
  if(total===0){ grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#64748b">조건에 맞는 뉴스가 없습니다.</p>'; if(loadMoreWrap) loadMoreWrap.style.display='none'; return; }
  const toShow = data.slice(0, visibleCount);
  toShow.forEach(n=>{
    const card = document.createElement('article');
    card.className = 'card';
    const badge = n.is_sample ? '<span class="badge sample">예시</span>' : '<span class="badge real">실제</span>';
    const dateStr = n.date ? String(n.date).replace('T',' ').replace('+00:00','') : '';
    const categories = Array.isArray(n.categories) && n.categories.length ? n.categories.join(', ') : '';
    const summary = Array.isArray(n.summary) && n.summary.length ? n.summary.slice(0,3).join(' ') : '';
    const originLink = n.url ? `<div class="meta"><a href="${escapeHtml(n.url)}" target="_blank" rel="noopener">원문 보기</a></div>` : '';
    card.innerHTML = `<div class="card-header">${badge}</div><h3 class="card-title">${escapeHtml(n.title)}</h3><div class="meta">${dateStr} · ${escapeHtml(n.source)}</div><div class="meta">카테고리: ${escapeHtml(categories)}</div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${originLink}`;
    grid.appendChild(card);
  });
  if(loadMoreWrap){ if(total > visibleCount){ loadMoreWrap.style.display='block'; } else { loadMoreWrap.style.display='none'; } }
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

document.querySelectorAll('.level-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentLevel = btn.dataset.level; visibleCount = 9; render(); }); });
document.querySelectorAll('.type-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentType = btn.dataset.type; visibleCount = 9; render(); }); });
document.querySelectorAll('.date-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentRange = btn.dataset.range; visibleCount = 9; render(); }); });
if(categorySelect){ categorySelect.addEventListener('change', ()=>{ currentCategory = categorySelect.value; visibleCount = 9; render(); }); }
if(searchInput){ searchInput.addEventListener('input', ()=>{ searchQuery = searchInput.value.trim(); visibleCount = 9; render(); }); }
if(loadMoreBtn){ loadMoreBtn.addEventListener('click', ()=>{ visibleCount += 9; render(); }); }

loadData();
'@
