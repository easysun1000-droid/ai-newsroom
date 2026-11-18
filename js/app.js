const grid = document.getElementById('newsGrid');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');

const params = new URLSearchParams(window.location.search);
const useSupabase = params.get('source') === 'supabase';
const usePreview = params.get('source') === 'preview';
const useConcise = params.get('source') === 'concise';

let allNews = [];
let summaryMap = new Map();
let levelExpMap = new Map();
let currentLevel = 'all';
let currentRange = 'all';
let currentCategory = 'all';
let searchQuery = '';
let currentPage = 1;
const pageSize = 9;
let ttsState = { utter:null, playing:false, currentCard:null };
const levelLabels = {elementary:'초등', middle:'중등', high:'고등', adult:'성인', senior:'시니어', special:'특수교육'};
function renderExplanation(n, expContent, selectedLevel){
  if(selectedLevel === 'all'){
    if(n.summary_status === 'reviewed'){
      const summaryKO = n.summary_ko;
      if(Array.isArray(summaryKO) && summaryKO.length){
        let html = '<strong>기본 한국어 요약</strong><ol>';
        summaryKO.forEach(line=>{ html += `<li>${escapeHtml(line||'')}</li>`; });
        html += '</ol>';
        expContent.innerHTML = html;
        return;
      } else if(typeof summaryKO === 'string' && summaryKO){
        expContent.innerHTML = `<strong>기본 한국어 요약</strong><p>${escapeHtml(summaryKO)}</p>`;
        return;
      }
    }
    expContent.innerHTML = `<strong>기본 한국어 요약</strong><p style="color:#64748b">기본 한국어 요약이 준비 중입니다.</p>`;
    return;
  }
  const entry = levelExpMap.get(n.id);
  const lvlData = entry && entry.levels ? entry.levels[selectedLevel] : null;
  const label = levelLabels[selectedLevel] || selectedLevel;
  if(lvlData && lvlData.status === 'reviewed'){
    const summary = lvlData.summary || '';
    const explanation = lvlData.explanation || '';
    expContent.innerHTML = `<strong>${label} 설명</strong><p>${escapeHtml(summary)}</p><p>${escapeHtml(explanation)}</p>`;
  } else {
    expContent.innerHTML = `<strong>${label} 설명</strong><p style="color:#64748b">해당 학습대상 설명은 준비 중입니다.</p>`;
  }
}

async function loadData(){
  try{
    const leRes = await fetch('./data/level_explanations.json');
    if(leRes.ok){
      const leData = await leRes.json();
      const items = leData.items || {};
      levelExpMap = new Map(Object.entries(items));
    }
  }catch(e){ console.warn('level_explanations.json load failed', e); }
  if(useSupabase){
    try{
      const cfg = await import('./supabase-config.js');
      const SUPABASE_URL = cfg.SUPABASE_URL;
      const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
      if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
        throw new Error('Supabase 설정이 없습니다. js/supabase-config.js를 생성하고 값을 입력하세요.');
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/public_news_view?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if(!res.ok) throw new Error('Supabase fetch failed');
      const data = await res.json();
      allNews = data.map(item => ({
        id: item.external_id,
        external_id: item.external_id,
        url: item.url,
        title: item.title_en || item.title_display || '',
        title_ko: item.title_display || item.title_ko || '',
        summary: Array.isArray(item.summary_en) ? item.summary_en : [],
        summary_ko: Array.isArray(item.summary_ko) ? item.summary_ko : [],
        source: item.source,
        date: item.published_at,
        collected_at: item.collected_at || null,
        is_sample: false,
        is_real: true,
        categories: item.categories || [],
        levels: item.levels || [],
        keywords: item.keywords || [],
        whyImportant: item.whyimportant || '',
        concepts: item.concepts || [],
        summary_status: item.summary_status || 'generated',
        summary_locked: false
      }));
      summaryMap = new Map();
      populateCategories();
      render();
    }catch(e){
      console.error('Supabase 로드 실패', e);
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#b91c1c">Supabase 모드: ${escapeHtml(e.message)}. 기본 JSON 모드로 전환하려면 URL 파라미터를 제거하세요.</p>`;
      if(loadMoreWrap) loadMoreWrap.style.display='none';
    }
    return;
  }
  if(useConcise){
    try{
      const res = await fetch('./data/news_preview_concise.json');
      if(!res.ok) throw new Error('concise fetch failed');
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      allNews = items.filter(it => it.summary_status === 'reviewed' && Array.isArray(it.summary_ko) && it.summary_ko.length === 3);
      summaryMap = new Map();
      populateCategories();
      render();
    }catch(e){
      console.warn('news_preview_concise.json 로드 실패', e);
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#b91c1c">간결 요약 미리보기 로드 실패: ${escapeHtml(e.message)}</p>`;
      if(loadMoreWrap) loadMoreWrap.style.display='none';
      return;
    }
    return;
  }
  if(usePreview){
    try{
      const res = await fetch('./data/news_preview_with_summaries.json');
      if(!res.ok) throw new Error('preview fetch failed');
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      allNews = items;
      summaryMap = new Map();
      populateCategories();
      render();
    }catch(e){
      console.warn('news_preview_integrated.json 로드 실패', e);
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#b91c1c">미리보기 데이터 로드 실패: ${escapeHtml(e.message)}</p>`;
      if(loadMoreWrap) loadMoreWrap.style.display='none';
      return;
    }
    return;
  }
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
function isKorean(str){ return /[\uAC00-\uD7A3]/.test(str||''); }

function filterNews(){
  const now = new Date();
  let start = null;
  if(currentRange==='today'){ start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
  else if(currentRange==='7d'){ start = new Date(now.getTime() - 7*24*60*60*1000); }
  else if(currentRange==='30d'){ start = new Date(now.getTime() - 30*24*60*60*1000); }
  let data = allNews.filter(n=>{
    const access_type = n.access_type;
    if(access_type && access_type !== 'free') return false;
    if(currentCategory!=='all'){ const cats = n.categories||[]; if(!cats.includes(currentCategory)) return false; }
    if(searchQuery){ const q = searchQuery.toLowerCase(); const hayParts = [n.title, n.title_ko, n.source, ...(n.categories||[]), ...(Array.isArray(n.summary_ko)?n.summary_ko:[]), ...(Array.isArray(n.keywords)?n.keywords:[])].filter(Boolean); const hay = hayParts.join(' ').toLowerCase(); if(!hay.includes(q)) return false; }
    if(start){ const d = parseDate(n.date); if(!d) return false; if(d < start) return false; }
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
  grid.innerHTML = '';
  if(total===0){
    const hint = currentRange && currentRange!=='all' ? '기간을 <strong>전체</strong>로 확장해 보세요.' : '필터를 완화해 보세요.';
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#64748b">조건에 맞는 뉴스가 없습니다.<br><small>${hint}</small></p>`;
    if(loadMoreWrap) loadMoreWrap.style.display='none';
    return;
  }
  const totalPages = Math.ceil(total / pageSize);
  if(currentPage > totalPages) currentPage = totalPages;
  if(currentPage < 1) currentPage = 1;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const toShow = data.slice(startIdx, endIdx);
  toShow.forEach(n=>{
    const card = document.createElement('article');
    card.className = 'card';

    const header = document.createElement('div');
    header.className = 'card-header';
    const badgeSpan = document.createElement('span');
    badgeSpan.className = n.is_sample ? 'badge sample' : 'badge real';
    badgeSpan.textContent = n.is_sample ? '샘플' : '실제';
    header.appendChild(badgeSpan);
    card.appendChild(header);

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    const isReviewed = n.summary_status === 'reviewed';
    const titleToShow = isReviewed && n.title_ko ? n.title_ko : n.title;
    titleEl.textContent = titleToShow || '';
    titleEl.title = titleToShow || '';
    card.appendChild(titleEl);

    const metaDate = document.createElement('div');
    metaDate.className = 'meta';
    function formatKoreanDate(ds){
      if(!ds) return '';
      try{
        const d = new Date(ds);
        if(isNaN(d)) return String(ds).slice(0,10).replace(/-/g,'.');
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        return `${y}.${m}.${day}`;
      }catch(e){ return String(ds).slice(0,10).replace(/-/g,'.'); }
    }
    const dateStr = formatKoreanDate(n.date);
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
        const ol = document.createElement('ol');
        ol.className = 'summary-list';
        summaryKO.forEach(line=>{
          const li = document.createElement('li');
          li.textContent = line || '';
          ol.appendChild(li);
        });
        summaryDiv.appendChild(ol);
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

    // Level status note for senior/special
    if(currentLevel !== 'all' && ['senior','special'].includes(currentLevel)){
      const entry = levelExpMap.get(n.id);
      const lvlEntry = entry && entry.levels ? entry.levels[currentLevel] : null;
      if(!lvlEntry || lvlEntry.status !== 'reviewed'){
        const note = document.createElement('div');
        note.className = 'explain-note';
        note.textContent = '해당 수준 설명이 준비 중입니다.';
        card.appendChild(note);
      }
    }

    // Keywords tags
    const kw = Array.isArray(n.keywords) ? n.keywords.slice(0,3) : [];
    if(kw.length){
      const tagWrap = document.createElement('div');
      tagWrap.className = 'tags';
      kw.forEach(k => {
        const sp = document.createElement('span');
        sp.className = 'tag';
        sp.textContent = k;
        tagWrap.appendChild(sp);
      });
      card.appendChild(tagWrap);
    }

    // Level explanation toggle
    const expToggle = document.createElement('button');
    expToggle.className = 'explain-toggle';
    expToggle.textContent = '수준별 설명 보기';
    expToggle.type = 'button';
    expToggle.setAttribute('aria-expanded','false');
    card.appendChild(expToggle);

    const expWrap = document.createElement('div');
    expWrap.className = 'level-explanation-wrap';
    expWrap.id = 'expWrap-' + n.id;
    expWrap.style.display = 'none';
    card.appendChild(expWrap);
    expToggle.setAttribute('aria-controls', expWrap.id);
    const expContent = document.createElement('div');
    expContent.className = 'level-explanation-content';
    expWrap.appendChild(expContent);
    expToggle.addEventListener('click', ()=>{
      const show = expWrap.style.display === 'none';
      expWrap.style.display = show ? 'block' : 'none';
      expToggle.textContent = show ? '수준별 설명 숨기기' : '수준별 설명 보기';
      expToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
      if(show){
        renderExplanation(n, expContent, currentLevel);
      }
    });

    if(n.url){
      const originLink = document.createElement('div');
      originLink.className = 'origin-link';
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
  if(loadMoreWrap){
    if(total > 0 && totalPages > 1){
      loadMoreWrap.style.display = 'block';
      loadMoreWrap.innerHTML = '';
      let paginationHTML = '<div style="text-align:center;margin-top:20px;">';
      paginationHTML += `<button ${currentPage === 1 ? 'disabled' : ''} style="margin:0 4px;">이전</button>`;
      for(let i=1; i<= totalPages; i++){
        const active = i === currentPage ? 'style="background-color:#3b82f6;color:#fff;margin:0 4px;"' : 'style="margin:0 4px;"';
        paginationHTML += `<button ${active}>${i}</button>`;
      }
      paginationHTML += `<button ${currentPage === totalPages ? 'disabled' : ''} style="margin:0 4px;">다음</button>`;
      paginationHTML += '</div>';
      loadMoreWrap.innerHTML = paginationHTML;
      // attach events
      const btns = loadMoreWrap.querySelectorAll('button');
      let idx = 0;
      // first button is prev
      btns[idx++].addEventListener('click', ()=>{ if(currentPage > 1){ currentPage--; render(); }});
      for(let i=1; i<= totalPages; i++){
        btns[idx++].addEventListener('click', ()=>{ currentPage = i; render(); });
      }
      btns[idx].addEventListener('click', ()=>{ if(currentPage < totalPages){ currentPage++; render(); }});
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }
}


function getKoreanVoice(){ if(!('speechSynthesis' in window)) return null; const v=speechSynthesis.getVoices(); const ko=v.filter(x=>x.lang.toLowerCase().startsWith('ko')); return ko[0]||v[0]||null; }
function ttsShowStatus(msg){ const el=document.getElementById('ttsStatus'); if(!el) return; el.textContent=msg; el.style.display='block'; setTimeout(()=>{el.style.display='none';},3000); }
function ttsStop(){ if('speechSynthesis' in window) speechSynthesis.cancel(); ttsState.playing=false; ttsState.utter=null; ttsState.currentCard=null; }
function ttsSpeak(text,cardId){ if(!('speechSynthesis' in window)){ttsShowStatus('TTS 지원 안됨');return;} if(!text||!text.trim()){ttsShowStatus('읽을 내용 없음');return;} ttsStop(); const utter=new SpeechSynthesisUtterance(text); utter.lang='ko-KR'; const voice=getKoreanVoice(); if(voice) utter.voice=voice; utter.onend=()=>{ttsState.playing=false;ttsShowStatus('읽기 완료');}; utter.onerror=()=>{ttsState.playing=false;ttsShowStatus('읽기 오류');}; speechSynthesis.speak(utter); ttsState.utter=utter; ttsState.playing=true; ttsState.currentCard=cardId; ttsShowStatus('읽기 시작'); }

function escapeHtml(str){ return String(str).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

document.querySelectorAll('.level-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentLevel = btn.dataset.level; currentPage = 1; render(); }); });
document.querySelectorAll('.date-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ document.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); currentRange = btn.dataset.range; currentPage = 1; render(); }); });
if(categorySelect){ categorySelect.addEventListener('change', ()=>{ currentCategory = categorySelect.value; currentPage = 1; render(); }); }
if(searchInput){ searchInput.addEventListener('input', ()=>{ searchQuery = searchInput.value.trim(); currentPage = 1; render(); }); }
// loadMoreBtn removed for pagination


function initA11y(){
  const savedFont = localStorage.getItem('a11y_font') || '100';
  document.documentElement.setAttribute('data-font-size', savedFont);
  document.querySelectorAll('[data-font]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const v=b.dataset.font;
      document.documentElement.setAttribute('data-font-size', v);
      localStorage.setItem('a11y_font', v);
    });
  });
  const savedContrast = localStorage.getItem('a11y_contrast') === '1';
  document.documentElement.setAttribute('data-high-contrast', savedContrast ? 'true' : 'false');
  const ct = document.getElementById('contrastToggle');
  if(ct){
    ct.setAttribute('aria-pressed', savedContrast ? 'true' : 'false');
    ct.addEventListener('click', ()=>{
      const on = document.documentElement.getAttribute('data-high-contrast') === 'true';
      const next = !on;
      document.documentElement.setAttribute('data-high-contrast', next ? 'true' : 'false');
      localStorage.setItem('a11y_contrast', next ? '1' : '0');
      ct.setAttribute('aria-pressed', next ? 'true' : 'false');
    });
  }
}
initA11y();
loadData();