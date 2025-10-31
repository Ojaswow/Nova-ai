/* script.js
  Frontend minimal logic:
  - local history in localStorage
  - send prompt to server endpoint: /.netlify/functions/gemini
  - display typing animation while waiting
*/

const chatEl = document.querySelector('.messages');
const form = document.getElementById('chatForm');
const textarea = document.getElementById('prompt');

const STORAGE_KEY = 'nova_chat_history_v1';

function mkMsg(text, who='bot'){
  const d = document.createElement('div');
  d.className = 'msg ' + (who==='user' ? 'user' : 'bot');
  d.textContent = text;
  return d;
}

function appendAndScroll(node){
  chatEl.appendChild(node);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function saveHistory(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function loadHistory(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function renderHistory(){
  chatEl.innerHTML = '';
  const h = loadHistory();
  h.forEach(item=>{
    appendAndScroll(mkMsg(item.text, item.who));
  });
}

async function sendPrompt(prompt, options={}){
  // show user message
  appendAndScroll(mkMsg(prompt, 'user'));
  pushHistory({who:'user', text:prompt});

  // typing indicator
  const typing = mkMsg('…thinking', 'bot');
  typing.dataset.typing = '1';
  appendAndScroll(typing);

  try {
    const resp = await fetch('/.netlify/functions/gemini', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, options})
    });

    if(!resp.ok){
      const txt = await resp.text();
      throw new Error(txt || 'Server error');
    }
    const data = await resp.json();
    const answer = data.text || 'No response from assistant.';

    // replace typing with real answer (simple fade)
    typing.remove();
    appendAndScroll(mkMsg(answer, 'bot'));
    pushHistory({who:'bot', text:answer});
  } catch(err){
    typing.remove();
    appendAndScroll(mkMsg('Error: ' + (err.message||err), 'bot'));
    pushHistory({who:'bot', text: 'Error: ' + (err.message||err)});
  }
}

function pushHistory(item){
  const h = loadHistory();
  h.push(item);
  if(h.length>80) h.splice(0,h.length-80); // cap
  saveHistory(h);
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderHistory();

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const prompt = textarea.value.trim();
    if(!prompt) return;
    textarea.value = '';
    sendPrompt(prompt);
  });

  // example presets
  document.querySelectorAll('.preset').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const val = btn.dataset.preset;
      textarea.value = val;
      textarea.focus();
    });
  });
});