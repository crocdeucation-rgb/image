/* 아라온 스태티즈 — 공통 로그인 게이트 (2026-09)
 * 사용법: <head>에 아래 3줄 추가
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
 *   <script src="gate.js"></script>
 * 통과 못하면 페이지 전체를 로그인 벽으로 덮음. 33명 화이트리스트.
 * switcher.html 안 iframe으로 뜰 땐 이미 부모가 인증했으므로 자동 통과(로그인 세션 공유).
 */
(function(){
  var CFG={apiKey:"AIzaSyCBDimk0MyGAHf762mvInS_H4K9HkW6Ol0",authDomain:"dashboard-88ba4.firebaseapp.com",projectId:"dashboard-88ba4",storageBucket:"dashboard-88ba4.firebasestorage.app",messagingSenderId:"857535538974",appId:"1:857535538974:web:999d190f28e14964eb4b0f"};
  var ALLOW=['032100jesus@gmail.com','christuhm@gmail.com','crocdeucation@gmail.com','90younho@gmail.com','deuk1992@gmail.com','goodida486@gmail.com','jeffkorea27@gmail.com','jjoon0804@gmail.com','skfkr4@gmail.com','w0wwiam1004@gmail.com','whkimts@gmail.com','dbgpfla97@gmail.com','mjhsingle@gmail.com','qkfka3090@gmail.com','ggh0305@gmail.com','ahlee.sep@gmail.com','xpxmfltm5678@gmail.com','alsk102qpwoal@gmail.com','minsung32383238@gmail.com','happy1004elle@gmail.com','gh3541@gmail.com','ghtn1346@gmail.com','uss20182@gmail.com','dltjrgjs56@gmail.com','hr3213@gmail.com','starlim2723@gmail.com','100heamin7678@gmail.com','codud010802@gmail.com','01046153497a@gmail.com','lsmlsmopop@gmail.com','pjskimbo8@gmail.com','ksj245180@gmail.com','eunbini592@gmail.com','kanghansara@gmail.com'];

  if(!window.firebase||!firebase.auth){ console.error('[gate] firebase SDK 필요'); return; }
  try{ firebase.app(); }catch(e){ firebase.initializeApp(CFG); }
  var auth=firebase.auth();

  var CSS='#agate{position:fixed;inset:0;z-index:2147483647;background:linear-gradient(160deg,#0F1626,#1E2C48);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Pretendard,sans-serif}'
    +'#agate.hidden{display:none}'
    +'#agate .c{background:#fff;border-radius:22px;padding:38px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.4);opacity:0;transition:opacity .25s ease}'
    +'#agate.ready .c{opacity:1}'
    +'#agate .lg{font-size:34px;margin-bottom:6px}'
    +'#agate .t{font-size:20px;font-weight:900;color:#1B2436;letter-spacing:-.5px}'
    +'#agate .s{font-size:13px;color:#8A97AC;font-weight:600;margin-top:8px;line-height:1.5}'
    +'#agate .b{margin-top:24px;width:100%;height:48px;border:1px solid #DCE3EE;border-radius:12px;background:#fff;font-size:14px;font-weight:800;font-family:inherit;color:#3A4356;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px}'
    +'#agate .b:hover{background:#F7F9FC;box-shadow:0 3px 12px rgba(27,36,54,.1)}'
    +'#agate .b svg{width:19px;height:19px}'
    +'#agate .m{margin-top:16px;font-size:12.5px;font-weight:700;min-height:18px}'
    +'#agate .m.err{color:#E23A22}#agate .m.wait{color:#8A97AC}'
    +'#agate .f{margin-top:20px;font-size:11px;color:#B6C2DC;font-weight:600}';

  var HTML='<div class="c"><div class="lg">🔒</div><div class="t">아라온 스태티즈</div>'
    +'<div class="s">사내 임직원 전용 대시보드입니다.<br>등록된 계정으로 로그인해 주세요.</div>'
    +'<button class="b" id="agBtn"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>Google로 로그인</button>'
    +'<div class="m" id="agMsg"></div><div class="f">문의: 신상준 이사 · crocedu@naver.com</div></div>';

  function mount(){
    if(document.getElementById('agate')) return;
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    var g=document.createElement('div'); g.id='agate'; g.innerHTML=HTML; document.body.appendChild(g);
    document.getElementById('agBtn').onclick=login;
    document.body.style.overflow='hidden';
  }
  function login(){
    var m=document.getElementById('agMsg');
    if(m){ m.className='m wait'; m.textContent='로그인 창을 여는 중...'; }
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(function(e){
      if(m){ m.className='m err'; m.textContent='로그인 실패: '+(e.message||e.code); }
    });
  }
  function ready(fn){ if(document.body) fn(); else document.addEventListener('DOMContentLoaded',fn); }

  ready(mount);
  auth.onAuthStateChanged(function(u){
    ready(function(){
      var g=document.getElementById('agate'); if(!g){ mount(); g=document.getElementById('agate'); }
      var m=document.getElementById('agMsg');
      if(u && ALLOW.indexOf((u.email||'').toLowerCase())>=0){
        g.classList.add('hidden'); document.body.style.overflow='';
      } else if(u){
        if(m){ m.className='m err'; m.textContent='접근 권한이 없는 계정입니다 ('+u.email+')'; }
        g.classList.remove('hidden'); g.classList.add('ready'); document.body.style.overflow='hidden';
        setTimeout(function(){ try{auth.signOut();}catch(e){} },2500);
      } else {
        if(m){ m.className='m'; m.textContent=''; }
        g.classList.remove('hidden'); g.classList.add('ready'); document.body.style.overflow='hidden';
      }
    });
  });
})();
