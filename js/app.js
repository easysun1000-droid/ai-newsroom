const grid = document.getElementById('newsGrid');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');

let allNews = [];
let summaryMap = new Map();
let currentLevel = 'all';
let currentRange = '7d';
let currentCategory = 'all';
let searchQuery = '';
let visibleCount = 9;

async function loadData(){
  try{
    const newsRes = await fetch('./data/news.json');
    if(!newsRes.ok) throw new Error('fetch failed');
    const newsData = await newsRes.json();
    if(!Array.isArray(newsData) || newsData.length===0) throw new Error('empty');
    allNews = newsData;
    summaryMap = new Map();
    populateCategories();
  }catch(e){
    console.warn('news.json 로드 실패', e);
    allNews = [];
    summaryMap = new Map();
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
    if(currentCategory!=='all'){ const cats = n.categories||[]; if(!cats.includes(currentCategory)) return false; }
    if(searchQuery){ const q = searchQuery.toLowerCase(); const hayParts = [n.title, n.title_ko, n.source, ...(n.categories||[]), ...(Array.isArray(n.summary_ko)?n.summary_ko:[]), ...(Array.isArray(n.keywords)?n.keywords:[])].filter(Boolean); const hay = hayParts.join(' ').toLowerCase(); if(!hay.includes(q)) return false; }
    if(start){ const d = parseDate(n.date); if(!d) return false; if(d < start) return false; }
    if(currentLevel!=='all'){ const levels = n.levels||[]; if(levels.length>0 && !levels.includes(currentLevel)){ if(!n.is_sample) return true; return false; } }
    return true;
  });
  data.sort((a,b)=>{
    const da = parseDate(a.date);
    const db = parseDate(b.date);
    if(da && db){
      if(db.getTime() !== da.getTime()) return db - da;
    }else if(da) return -1;
    else if(db) return 1;
    const ak = isKorean(a.title);
    const bk = isKorean(b.title);
    if(ak && !bk) return -1;
    if(!ak && bk) return 1;
    return 0;
  });
  return data;
}

function render(){
  const data = filterNews();
  const total = data.length;
  visibleCount = 9;
  grid.innerHTML = '';
  if(total===0){
    const hint = currentRange && currentRange!=='all' ? '기간을 <strong>전체</strong>로 확장해 보세요.' : '필터를 완화해 보세요.';
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b">조건에 맞는 뉴스가 없습니다.<br><small>${hint}</small></p>`;
    if(loadMoreWrap) loadMoreWrap.style.display='none';
    return;
  }
  const toShow = data.slice(0, visibleCount);
  toShow.forEach(n=>{
    const card = document.createElement('article');
    card.className = 'card';

    const header = document.createElement('div');
    header.className = 'card-header';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = n.is_sample ? 'badge sample' : 'badge real';
    badgeSpan.textContent = n.is_sample ? '예시' : '실제';
    header.appendChild(badgeSpan);
    card.appendChild(header);

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    const isReviewed = n.summary_status === 'reviewed';
    const titleToShow = isReviewed && n.title_ko ? n.title_ko : n.title;
    titleEl.textContent = titleToShow || '';
    card.appendChild(titleEl);

    const metaDate = document.createElement('div');
    metaDate.className = 'meta';
    const dateStr = n.date ? String(n.date).replace('T',' ').replace('+00:00','') : '';
    metaDate.textContent = `${dateStr} · ${n.source || ''}`;
    card.appendChild(metaDate);

    const metaCat = document.createElement('div');
    metaCat.className = 'meta';
    const categories = Array.isArray(n.categories) && n.categories.length ? n.categories.join(', ') : '';
    metaCat.textContent = `카테고리: ${categories}`;
    card.appendChild(metaCat);

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary';
    if(isReviewed){
      const summaryKO = n.summary_ko;
      if(Array.isArray(summaryKO) && summaryKO.length){
        summaryKO.forEach(line=>{
          const p = document.createElement('div');
          p.textContent = line || '';
          summaryDiv.appendChild(p);
        });
      }else if(typeof summaryKO === 'string' && summaryKO){
        summaryDiv.textContent = summaryKO;
      }
    }else{
      const summary = Array.isArray(n.summary) && n.summary.length ? n.summary.slice(0,3).join(' ') : '';
      if(summary){
        summaryDiv.textContent = summary;
      }
    }
    if(summaryDiv.children.length > 0 || summaryDiv.textContent){
      card.appendChild(summaryDiv);
    }

    if(n.url){
      const originLink = document.createElement('div');
      originLink.className = 'meta';
      const a = document.createElement('a');
      a.href = n.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = '원문 보기';
      originLink.appendChild(a);
      card.appendChild(originLink);
    }

    grid.appendChild(card);
  });
  if(loadMoreWrap){ if(total > visibleCount){ loadMoreWrap.style.display='block'; } else { loadMoreWrap.style.display='none'; } }
}


function escapeHtml(str){ return String(str).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

document.querySelectorAll('.level-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentLevel = btn.dataset.level; visibleCount = 9; render(); }); });
document.querySelectorAll('.date-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentRange = btn.dataset.range; visibleCount = 9; render(); }); });
if(categorySelect){ categorySelect.addEventListener('change', ()=>{ currentCategory = categorySelect.value; visibleCount = 9; render(); }); }
if(searchInput){ searchInput.addEventListener('input', ()=>{ searchQuery = searchInput.value.trim(); visibleCount = 9; render(); }); }
if(loadMoreBtn){ loadMoreBtn.addEventListener('click', ()=>{ visibleCount += 9; render(); }); }

loadData();
