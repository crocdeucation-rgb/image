/**
 * buildTotalData() — 총매출_전사 탭을 읽어 total.html용 D 객체(JSON)를 생성,
 * "total_data" 탭 A1에 저장한다.
 *
 * [사용법]
 *  1. 매일(3시경) 원장 총매출을 '총매출_전사' 탭에 붙여넣기 (1행 헤더 포함)
 *  2. 메뉴/편집기에서 buildTotalData() 실행
 *  3. total.html이 total_data 탭 CSV(pub)를 읽어 렌더
 *
 * [범위] 1차: 매출카드(tot/web/sang) + branches(지점) + persons(상담개인)
 *        + divpersons(사업개인) + cancel. divs(사업부팀)·head(인원)는 2차(인사 매칭).
 */

var TOTAL_SRC_SHEET = '총매출_전사';   // 원장 데이터 붙여넣는 탭
var TOTAL_OUT_SHEET = 'total_data';    // JSON 출력 탭
var WEB_B = ['웹마케팅팀']; // 웹마케팅팀만 (수호웹마=인스타는 상담/수호에듀로)
var MONTHCLOSE_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTBUBxnTPPn_AebCqxIC8Q2x-5V3VuvIY6MM6QlgKVUUA7Bbjh3jMO7q6i4sDgQse-UKsNGe5Hxt7QF/pub?gid=1739211827&single=true&output=csv';
// 사업부 HR 시트 (이름 → 부서명 매칭용). 사업개인 소속은 팀구분(상담지점) 아니라 여기 부서명.
var SAUP_HR_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsnuROsI7L8HP80yoRQCuaAkcoPnVcK9TY1U2Z-B8AVHmz_Y7rO4_aUBLsgu91bJGj63xJFmNrnPaJ/pub?gid=721147912&single=true&output=csv';
// 상담부 HR 시트 (이름 → 부서명). 팀구분="기타"인 행을 상담자 소속으로 재배치할 때 씀.
var SANG_HR_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsnuROsI7L8HP80yoRQCuaAkcoPnVcK9TY1U2Z-B8AVHmz_Y7rO4_aUBLsgu91bJGj63xJFmNrnPaJ/pub?gid=120536013&single=true&output=csv';
// HR에 없는 채널/퇴사자/그룹 수동 매핑 (기타 재배치용). 값=최종 지점명.
var SANG_OVERRIDE = {
  '수호웹마':'수호에듀',
  '김유진C':'파인더루원',   // 퇴사자
  '최보영':'스카이에듀',    // 퇴사자
  '조소라':'수호에듀',
  '박찬수':'수호에듀',
  '손대현':'더온에듀',
  '송민':'수호에듀',
  '고윤아A':'더온에듀',
  '조수호':'수호에듀',
  '운영팀':'인투본사'       // 회사 본사건 → 지점 제외
};

// H(팀구분) → 지점(branches) 묶기 — prefix 매칭으로 1팀/2팀/과/운영팀 변형 흡수
function _h2branch(h) {
  h = String(h || '').trim();
  if (h.indexOf('부평') === 0) return '부평지점';        // 부평1팀·2팀·운영팀
  if (h.indexOf('메이킷위드') === 0) return '메이킷위드';  // 1과/2과/1팀/2팀/운영팀
  if (h.indexOf('스카이에듀') === 0) return '스카이에듀';  // 1·2·3팀
  if (h.indexOf('수호에듀') === 0) return '수호에듀';      // 1·2팀
  if (h.indexOf('더온에듀') === 0) return '더온에듀';      // 2팀·운영팀
  if (h.indexOf('가산연합') === 0) return '가산연합센터';  // 메이킷위드팀·인투팀 (total에선 별도 지점)
  if (h.indexOf('마포연합') === 0) return '마포연합센터';  // 파인더팀·인투팀·센터 (total에선 별도 지점)
  if (h === '파인더' || h.indexOf('파인더상암') === 0) return '파인더상암';  // 재편 조직 마커 — branchOf에서 사람별 현재 HR소속으로 재매핑
  return h; // 마곡지점/수원지점/파인더루원/오름에듀/마포지점/기타/인투본사 등 그대로
}

// 정식 지점 집합 (스마트체험 사업부 아이디 = 지점명 인정용)
var CANON_BR = {
  '가산연합센터':1,'메이킷위드':1,'부평지점':1,'마포연합센터':1,'수호에듀':1,
  '마곡지점':1,'더온에듀':1,'수원지점':1,'파인더루원':1,'스카이에듀':1,'오름에듀':1,'인투본사':1
};
// 사업부 특수 매핑 (HR에도 CANON_BR에도 없는 것)
var SAUP_OVERRIDE = { '운영팀':'인투본사', '인투지사':'딱공' };  // 본사 / 외부ASP(딱공)
// 지점 개소/연합 월 (지점추이 기준선용) — m=월(1~12·차트축), y=연도, label=표기, pre=전신, off=축밖(작년 등 주석만)
var BRANCH_LAUNCH = {
  '가산연합센터': { m:12, y:2025, label:'오픈', pre:'', off:true },       // 2025년 12월 오픈 (올해 축 밖 → 주석)
  '마포연합센터': { m:4,  y:2026, label:'연합', pre:'전신 · 마포지점/파인더상암', off:false }  // 4월 연합 (마포지점+파인더상암)
};
// 사업개인 소속 판정: HR 부서명 > 특수매핑 > 스마트체험(지점명) > 공란
function _saupTeam(name, saupDept){
  if (saupDept[name]) return saupDept[name];
  if (SAUP_OVERRIDE[name]) return SAUP_OVERRIDE[name];
  var br = _h2branch(name);
  if (br === '파인더상암') return '파인더루원';  // 재편된 상암 스마트체험 계정 → 루원 (사업개인)
  if (CANON_BR[br]) return br;
  return '';
}

function _num(v) { return (typeof v === 'number' && !isNaN(v)) ? v : 0; }

// 따옴표 인식 CSV 파서 (콤마·줄바꿈 든 필드 대응) — 순진한 split(',') 금지
function _parseCSV(text){
  var rows=[], row=[], cur='', q=false;
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else {
      if(c==='"') q=true;
      else if(c===','){ row.push(cur); cur=''; }
      else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
      else if(c==='\r'){}
      else cur+=c;
    }
  }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(function(r){ return r.some(function(c){ return (c||'').trim(); }); });
}

// 날짜 파싱 ("2026-08-01" / "08월 01일" / Date)
function _pdate(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v;
  var s = String(v || '');
  var m = s.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  var m2 = s.match(/(\d{1,2})월\s*(\d{1,2})일/); // "08월 01일"
  if (m2) return new Date(2026, +m2[1]-1, +m2[2]);
  return null;
}
function _ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function _weekMonday(d){ // 그 주 월요일
  var day = (d.getDay()+6)%7; // 월=0
  var m = new Date(d.getFullYear(), d.getMonth(), d.getDate()-day);
  return m;
}

// 월종결 CSV(과거 5·6·7월) 읽어서 rows 반환
function _fetchMonthClose() {
  var out = [];
  try {
    var res = UrlFetchApp.fetch(MONTHCLOSE_CSV, { muteHttpExceptions:true });
    if (res.getResponseCode() !== 200) return out;
    var lines = _parseCSV(res.getContentText()).map(function(r){
      return r.map(function(c){ return String(c||'').trim(); });
    });
    var H = lines.shift();
    function ci(name){ for (var i=0;i<H.length;i++){ if (H[i]===name) return i; } return -1; }
    var iD=ci('날짜'), iB=ci('상담'), iS=ci('매출'), iF=ci('사업부'), iH=ci('팀구분'), iT=ci('형이름'), iG=ci('구분');
    lines.forEach(function(r){
      var b=(r[iB]||'').trim(); if(!b) return;
      var sv=parseFloat(r[iS]); var sales=isNaN(sv)?0:sv;
      out.push({ date:_pdate(r[iD]), b:b, f:(r[iF]||'').trim(), h:(r[iH]||'').trim(), sales:sales, gb:(String(r[iS]||'').indexOf('결보')>=0?1:0), sib:(iG>=0 ? String(r[iG]||'').trim()==='기타' : (iT>=0 && String(r[iT]||'').trim()!=='')) });
    });
  } catch(e){ Logger.log('월종결 로드 실패: '+e); }
  return out;
}

// 사업부 HR 시트에서 이름 → 부서명 맵 (사업개인 소속 표시용)
function _fetchSaupDept() { return _fetchNameDept(SAUP_HR_CSV); }
// 상담부 HR 시트에서 이름 → 부서명 맵 (기타 재배치용)
function _fetchSangDept() { return _fetchNameDept(SANG_HR_CSV); }
// HR 시트에서 이름 → 입사일(Date) 맵 — 신입(새싹) 판별용. 재직자만
function _fetchJoinMap(url) {
  var map = {};
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions:true });
    if (res.getResponseCode() !== 200) return map;
    var lines = _parseCSV(res.getContentText()).map(function(r){ return r.map(function(c){ return String(c||'').trim(); }); });
    var hi = 0;
    for (var i=0;i<Math.min(lines.length,5);i++){ if (lines[i].some(function(c){return (c||'').indexOf('이름')>=0;})){ hi=i; break; } }
    var H = lines[hi];
    function ci(name){ for (var j=0;j<H.length;j++){ if ((H[j]||'').replace(/\s/g,'')===name) return j; } return -1; }
    var iN=ci('이름'), iJ=ci('입사일'), iR=ci('재직'), iQ=ci('퇴사일');
    if (iN<0 || iJ<0) return map;
    for (var r=hi+1;r<lines.length;r++){
      var nm=(lines[r][iN]||'').trim(); if(!nm) continue;
      var jd=_pdate(lines[r][iJ]);
      var quit=(iQ>=0 ? String(lines[r][iQ]||'').trim() : '');
      if(jd && !quit) map[nm]=jd;   // 입사일 있고 퇴사일 없는(재직) 사람만
    }
  } catch(e){ Logger.log('입사일 로드 실패('+url+'): '+e); }
  return map;
}
// 공통: pub CSV에서 이름→부서명 맵
function _fetchNameDept(url) {
  var map = {};
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions:true });
    if (res.getResponseCode() !== 200) return map;
    var lines = _parseCSV(res.getContentText()).map(function(r){
      return r.map(function(c){ return String(c||'').trim(); });
    });
    var hi = 0;
    for (var i=0;i<Math.min(lines.length,5);i++){ if (lines[i].some(function(c){return (c||'').indexOf('이름')>=0;})){ hi=i; break; } }
    var H = lines[hi];
    function ci(name){ for (var j=0;j<H.length;j++){ if ((H[j]||'').replace(/\s/g,'')===name) return j; } return -1; }
    var iN = ci('이름'), iD = ci('부서명');
    if (iN<0 || iD<0) return map;
    for (var r=hi+1;r<lines.length;r++){
      var nm=(lines[r][iN]||'').trim(), dp=(lines[r][iD]||'').trim();
      if (nm && dp) map[nm]=dp;
    }
  } catch(e){ Logger.log('HR 로드 실패('+url+'): '+e); }
  return map;
}


function buildTotalData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TOTAL_SRC_SHEET);
  if (!sh) { throw new Error('탭 없음: ' + TOTAL_SRC_SHEET); }

  var values = sh.getDataRange().getValues();
  if (values.length < 2) { throw new Error('총매출_전사 데이터 없음'); }

  // [보정] U1 = 원장 실입금 총액(원). 영업 자동집계와의 차액 = 본사추가분(연장·코칭·과목추가 등)
  // ⚠️ U1은 매일 붙여넣는 원장 데이터 범위(B~T) 바깥이어야 안 지워짐
  var ledgerTotal = 0;
  try { ledgerTotal = Number(sh.getRange('U1').getValue()) || 0; } catch(e) {}

  // 헤더에서 컬럼 인덱스 찾기 (순서 바뀌어도 안전)
  var H = values[0].map(function(x){ return String(x || '').trim(); });
  function col(name){ for (var i=0;i<H.length;i++){ if (H[i] === name) return i; } return -1; }
  var iDate = col('날짜'), iB = col('상담'), iName = col('학생'),
      iSales = col('매출'), iNote = col('특이사항'), iF = col('사업부'), iH = col('팀구분'),
      iSib = col('형이름'),   // T열: 형제건 복사행
      iGubun = col('구분');   // G열: '기타'면 세팅 제외 (형제건·공부밥추가·재방건 등 1집 2계약)
  if (iB < 0 || iSales < 0 || iH < 0) {
    throw new Error('필수 컬럼(상담/매출/팀구분) 못 찾음. 헤더 확인: ' + H.join(','));
  }

  // [진단] 헤더 + 컬럼 인덱스 (사업부 열 오독 확인용)
  Logger.log('[헤더] ' + H.map(function(h,i){ return i+':'+(h||'(빈)'); }).join(' | '));
  Logger.log('[컬럼인덱스] 날짜='+iDate+' 상담='+iB+' 학생='+iName+' 매출='+iSales+' 특이사항='+iNote+' 사업부='+iF+' 팀구분='+iH);
  // 사업부 열(iF)에 실제로 뭐가 들었는지 앞 15행 샘플
  if (iF>=0) {
    var _samp=[]; for (var _r=1; _r<values.length && _samp.length<15; _r++){ var _v=String(values[_r][iF]||'').trim(); if(_v) _samp.push(_v); }
    Logger.log('[사업부열 샘플] ' + _samp.join(' | '));
  }

  var isWeb = function(b){ return WEB_B.indexOf(String(b||'').trim()) >= 0; };

  // 집계 컨테이너
  var tot = { sales:0, ord:0, set:0 };
  var web = { sales:0, ord:0, set:0, cxa:0, cxc:0 };
  var sang = { sales:0, ord:0, set:0, cxa:0, cxc:0 };
  var brMap = {};   // 지점 → {sales,ord,set,cxa,cxc}
  var perMap = {};  // 상담개인(B) → {team(H지점), sales,ord,set,cxa}
  var divpMap = {}; // 사업개인(F) → {sales,ord,set,cxa}
  var cancelAmt = 0, cancelCnt = 0, _cxLog = [];

  function ensure(map, key, extra){
    if (!map[key]) { map[key] = { sales:0, ord:0, set:0, cxa:0, cxc:0 }; if (extra) for (var k in extra) map[key][k]=extra[k]; }
    return map[key];
  }

  // HR 매칭 (사업 소속·기타 재배치) — main 루프에서 branchOf 쓰므로 먼저 로드
  var saupDept = _fetchSaupDept();  // 사업개인 이름 → 부서명
  var sangDept = _fetchSangDept();  // 상담자 이름 → 부서명 (기타 재배치용)
  // 지점 판정: 팀구분 우선, 기타/공란이면 상담자 HR 소속으로 재배치
  function branchOf(b, h){
    var br = _h2branch(h);
    // 재편 조직(파인더상암·마포지점) → 사람의 현재 HR 소속으로 재매핑 (김원득·문수호 등은 마포연합센터, 나머지·퇴사자는 파인더루원)
    if (br === '파인더상암' || br === '마포지점') {
      if (SANG_OVERRIDE[b]) return SANG_OVERRIDE[b];
      var dd = sangDept[b];
      if (dd) { var bb = _h2branch(dd); if (bb && bb !== '기타' && bb !== '파인더상암' && bb !== '마포지점') return bb; }
      return '파인더루원';  // HR 미등록(퇴사자 등) 기본
    }
    if (br === '기타' || !br) {
      if (SANG_OVERRIDE[b]) return SANG_OVERRIDE[b];
      var d = sangDept[b];
      if (d) { var b2 = _h2branch(d); if (b2 && b2 !== '기타') return b2; }
    }
    return br;
  }

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var b = String(row[iB] || '').trim();
    if (!b) continue;
    var salesRaw = row[iSales];
    var sales = _num(salesRaw);           // 매출(천원)
    var note = iNote>=0 ? String(row[iNote]||'') : '';
    var hRaw = row[iH];
    var fRaw = iF>=0 ? String(row[iF]||'').trim() : '';
    var isOrder = sales > 0;
    var isSet = true; // 시트에 올라온 행 = 세팅 이상 (결보 포함).
    // 세팅 제외 = 구분(G)='기타'만 (형제건 복사·공부밥추가·재방건 등은 전부 G=기타). 오더·매출은 유지
    // ※ 형이름(T) OR 안 씀 — 형제건 원본(구분=정상)까지 잘못 빠지므로. G열이 단일 진실.
    var sib = (iGubun>=0 && String(row[iGubun]||'').trim()==='기타');

    // 취소 추출 (특이사항 "숫자취소" 패턴)
    var cxAmt = 0;
    var m = note.match(/(\d+)\s*취소/);
    if (m) cxAmt = parseInt(m[1], 10);

    // 전사
    if (!sib) tot.set++;
    if (isOrder) { tot.sales += sales; tot.ord++; }

    if (isWeb(b)) {
      if (!sib) web.set++;
      if (isOrder) { web.sales += sales; web.ord++; }
      if (cxAmt) { web.cxa += cxAmt; web.cxc++; }
    } else {
      if (!sib) sang.set++;
      if (isOrder) { sang.sales += sales; sang.ord++; }
      if (cxAmt) { sang.cxa += cxAmt; sang.cxc++; }

      // 지점(branches) — 웹마 제외, 인투본사(웹마 결보 자리) 제외
      var br = branchOf(b, hRaw);
      if (br && br !== '인투본사') {
        var bo = ensure(brMap, br);
        if (!sib) bo.set++;
        if (isOrder) { bo.sales += sales; bo.ord++; }
        if (cxAmt) { bo.cxa += cxAmt; bo.cxc++; }
      }
      // 상담개인(persons) — B별 (웹마 제외 = else 안)
      var po = ensure(perMap, b, { team: br || '' });
      if (!sib) po.set++;
      if (isOrder) { po.sales += sales; po.ord++; }
      if (cxAmt) po.cxa += cxAmt;
    }

    // 사업개인(divpersons) — F별. 웹마/상담 무관, 사업부가 방문·세팅하므로 웹마 리드도 포함 (else 밖)
    if (fRaw) {
      var dpo = ensure(divpMap, fRaw);
      if (!sib) dpo.set++;
      if (isOrder) { dpo.sales += sales; dpo.ord++; }
      if (cxAmt) dpo.cxa += cxAmt;
    }

    if (cxAmt) { cancelAmt += cxAmt; cancelCnt++;
      _cxLog.push(b + '/' + (iName>=0?String(row[iName]||'').trim():'') + ' ' + cxAmt + '취소' + (note?' ['+note.replace(/\s+/g,' ').slice(0,40)+']':''));
    }
  }

  // 천원 → 원 변환 + 정렬/구조화
  function won(n){ return Math.round(n * 1000); }
  function rate(o,s){ return s ? Math.round(o/s*100) : 0; }

  function mapToSortedArr(map, withTeam){
    var arr = [];
    for (var k in map){
      var v = map[k];
      var o = { name:k, sales:won(v.sales), set:v.set, ord:v.ord, cxa:won(v.cxa||0), cxc:v.cxc||0 };
      if (withTeam) o.team = v.team || '';
      arr.push(o);
    }
    arr.sort(function(a,b){ return b.sales - a.sales; });
    return arr;
  }

  var branches = mapToSortedArr(brMap, false).map(function(o){
    o.per = o.ord ? Math.round(o.sales / o.ord) : 0;  // 오더당 매출
    return o;
  });
  var persons = mapToSortedArr(perMap, true);
  var divpersons = mapToSortedArr(divpMap, false).map(function(o){ o.team=_saupTeam(o.name, saupDept); return o; });
  // [진단] 사업부(divpMap) 총합 검산 — 전사(보정전) − 사업부합 = 웹마?
  var _divSetSum=0,_divOrdSum=0,_divSalesSum=0;
  for (var _dk in divpMap){ _divSetSum+=divpMap[_dk].set||0; _divOrdSum+=divpMap[_dk].ord||0; _divSalesSum+=divpMap[_dk].sales||0; }
  Logger.log('[사업부 총합] 세팅 '+_divSetSum+' · 오더 '+_divOrdSum+' · 매출 '+won(_divSalesSum).toLocaleString()
    + '   ||  전사(보정전) 매출 '+won(tot.sales).toLocaleString()
    + '  −  사업부합 '+won(_divSalesSum).toLocaleString()
    + '  =  '+won(tot.sales-_divSalesSum).toLocaleString()+' (웹마 '+won(web.sales).toLocaleString()+'랑 같으면 = 웹마 누락 확정)');

  // ─────────────────────────────────────────────
  // [기간 집계] 이번주/지난주 왕 + 3개월 TOP3 (월종결 5·6·7 + 총매출_전사 8월)
  // ─────────────────────────────────────────────
  var past = _fetchMonthClose();  // 5·6·7월 rows: {date,b,f,h,sales}
  // 8월(총매출_전사) rows도 같은 형식으로 수집
  var cur = [];
  for (var rr = 1; rr < values.length; rr++) {
    var row2 = values[rr];
    var b2 = String(row2[iB]||'').trim(); if(!b2) continue;
    cur.push({
      date: iDate>=0 ? _pdate(row2[iDate]) : null,
      b: b2,
      f: iF>=0 ? String(row2[iF]||'').trim() : '',
      h: String(row2[iH]||'').trim(),
      sales: _num(row2[iSales]),
      gb: (String(row2[iSales]||'').indexOf('결보')>=0) ? 1 : 0,
      sib: (iGubun>=0 && String(row2[iGubun]||'').trim()==='기타')
    });
  }
  var allRows = past.concat(cur);
  var isWebRow = function(b){ return WEB_B.indexOf(String(b||'').trim()) >= 0; };

  // 기간 필터로 상담(B)/사업(F) 개인 매출·세팅 집계 → 소속 포함
  function aggPersons(dateFilter, useF) {
    var m = {}; // key → {sales,set,gb,team}
    allRows.forEach(function(r){
      if (!r.date || !dateFilter(r.date)) return;
      if (!useF && isWebRow(r.b)) return;      // 상담만 웹마 제외 / 사업(useF)은 웹마 포함(사업부가 방문)
      var key = useF ? r.f : r.b;
      if (!key) return;
      if (!m[key]) m[key] = { name:key, sales:0, set:0, ord:0, gb:0, team: useF ? _saupTeam(key, saupDept) : branchOf(r.b, r.h) };
      if (!r.sib) m[key].set++;
      if (r.sales > 0) { m[key].sales += r.sales; m[key].ord++; }
      else if (r.gb) m[key].gb++;              // 결보 카운트 (aggPersons 호출 전 r.gb 세팅)
      if (!useF && !m[key].team && r.h) m[key].team = branchOf(r.b, r.h);
    });
    return m;
  }
  function topBy(m, field, n) {
    var arr = [];
    for (var k in m){ var v=m[k]; arr.push({ name:v.name, team:v.team||'', sales:won(v.sales), set:v.set, ord:v.ord||0, gb:v.gb||0, rate:(v.set>=3&&v.ord?Math.round(v.ord/v.set*100):-1) }); }
    if(field==='rate') arr=arr.filter(function(x){return x.rate>=0;}); // 세팅3+ 만
    arr.sort(function(a,b){ return b[field] - a[field]; });
    return arr.slice(0, n);
  }

  // 주 경계 (오늘 기준 월~일)
  var _today = new Date();
  var _mon = _weekMonday(_today);
  var _lastMon = new Date(_mon.getFullYear(), _mon.getMonth(), _mon.getDate()-7);
  var _nextMon = new Date(_mon.getFullYear(), _mon.getMonth(), _mon.getDate()+7);
  function inThisWeek(d){ return d >= _mon && d < _nextMon; }
  function inLastWeek(d){ return d >= _lastMon && d < _mon; }
  // 3개월(당월 포함 직전 3개월): 이번달 기준 6·7·8월
  var _cm = _today.getMonth(); // 0-based
  function inLast3M(d){
    var diff = (_today.getFullYear()-d.getFullYear())*12 + (_today.getMonth()-d.getMonth());
    return diff >= 0 && diff <= 2;  // 이번달, 1달전, 2달전
  }
  function inLast6M(d){
    var diff = (_today.getFullYear()-d.getFullYear())*12 + (_today.getMonth()-d.getMonth());
    return diff >= 0 && diff <= 5;  // 당월 포함 직전 6개월
  }

  // 이달(당월) 개인 실적 맵 (왕 이름 옆 이달 세팅/매출 표시용)
  function inThisMonth(d){ return d.getMonth()===_today.getMonth() && d.getFullYear()===_today.getFullYear(); }
  var sangMonth = aggPersons(inThisMonth, false), saupMonth = aggPersons(inThisMonth, true);
  function attachMonth(king, monthMap){
    if(!king) return king;
    var m = monthMap[king.name];
    if(m){ king.mSet = m.set; king.mSales = won(m.sales); king.mOrd = m.ord; }
    return king;
  }

  // 이번주/지난주 — 상담·사업 각각 매출왕/세팅왕
  var sangThis = aggPersons(inThisWeek, false), sangLast = aggPersons(inLastWeek, false);
  var saupThis = aggPersons(inThisWeek, true),  saupLast = aggPersons(inLastWeek, true);
  var weekly = {
    thisWeek: {
      sangSales: attachMonth(topBy(sangThis,'sales',1)[0]||null, sangMonth),
      sangSet:   attachMonth(topBy(sangThis,'set',1)[0]||null, sangMonth),
      sangGb:    attachMonth(topBy(sangThis,'gb',1)[0]||null, sangMonth),
      saupSales: attachMonth(topBy(saupThis,'sales',1)[0]||null, saupMonth),
      saupRate:  attachMonth(topBy(saupThis,'rate',1)[0]||null, saupMonth),
      saupGb:    attachMonth(topBy(saupThis,'gb',1)[0]||null, saupMonth)
    },
    lastWeek: {
      sangSales: attachMonth(topBy(sangLast,'sales',1)[0]||null, sangMonth),
      sangSet:   attachMonth(topBy(sangLast,'set',1)[0]||null, sangMonth),
      sangGb:    attachMonth(topBy(sangLast,'gb',1)[0]||null, sangMonth),
      saupSales: attachMonth(topBy(saupLast,'sales',1)[0]||null, saupMonth),
      saupRate:  attachMonth(topBy(saupLast,'rate',1)[0]||null, saupMonth),
      saupGb:    attachMonth(topBy(saupLast,'gb',1)[0]||null, saupMonth)
    }
  };

  // 3개월 누적 TOP3 — 지점/상담/사업
  var sang3 = aggPersons(inLast3M, false), saup3 = aggPersons(inLast3M, true);
  // 지점 3개월
  var br3map = {};
  allRows.forEach(function(r){
    if (!r.date || !inLast3M(r.date)) return;
    if (isWebRow(r.b)) return;
    var br = branchOf(r.b, r.h);
    if (!br || br==='인투본사') return;
    if (!br3map[br]) br3map[br] = { name:br, sales:0, set:0, team:'' };
    if (!r.sib) br3map[br].set++;
    if (r.sales>0) br3map[br].sales += r.sales;
  });
  var top3 = {
    branch:   topBy(br3map,'sales',3),
    sang:     topBy(sang3,'sales',3),
    saup:     topBy(saup3,'sales',3),
    sangGb:   topBy(sang3,'gb',3),
    saupGb:   topBy(saup3,'gb',3)
  };

  // 6개월 누적 TOP3 — 지점/상담/사업
  var sang6 = aggPersons(inLast6M, false), saup6 = aggPersons(inLast6M, true);
  var br6map = {};
  allRows.forEach(function(r){
    if (!r.date || !inLast6M(r.date)) return;
    if (isWebRow(r.b)) return;
    var br = branchOf(r.b, r.h);
    if (!br || br==='인투본사') return;
    if (!br6map[br]) br6map[br] = { name:br, sales:0, set:0, team:'' };
    if (!r.sib) br6map[br].set++;
    if (r.sales>0) br6map[br].sales += r.sales;
  });
  var top6 = {
    branch:   topBy(br6map,'sales',3),
    sang:     topBy(sang6,'sales',3),
    saup:     topBy(saup6,'sales',3),
    sangGb:   topBy(sang6,'gb',3),
    saupGb:   topBy(saup6,'gb',3)
  };

  var salesWon = won(tot.sales);                                   // 영업 자동집계(원)
  var adjustWon = ledgerTotal > 0 ? Math.max(0, ledgerTotal - salesWon) : 0;  // 본사추가 보정분(음수는 0 클램프)
  var ledgerWon = ledgerTotal > 0 ? ledgerTotal : salesWon;        // 실입금(원장) — 미입력 시 영업집계로 폴백

  var D = {
    date: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'),
    tot:  { sales:salesWon, biz:adjustWon, ledger:ledgerWon, set:tot.set, ord:tot.ord, rate:rate(tot.ord,tot.set) },
    web:  { sales:won(web.sales), set:web.set, ord:web.ord, rate:rate(web.ord,web.set), cxa:won(web.cxa), cxc:web.cxc },
    sang: { sales:won(sang.sales), set:sang.set, ord:sang.ord, rate:rate(sang.ord,sang.set), cxa:won(sang.cxa), cxc:sang.cxc },
    cancel: { amt:won(cancelAmt), cnt:cancelCnt },
    branches: branches,
    divs: [],        // 2차 (F→인사부서 매칭)
    persons: persons,
    divpersons: divpersons,
    head: { web:2, sang:0, div:0, total:2 },  // 2차 (인사 4시트)
    weekly: weekly,   // 이번주/지난주 매출왕·세팅왕 (상담/사업)
    top3: top3,       // 3개월 누적 TOP3 (지점/상담/사업)
    top6: top6,       // 6개월 누적 TOP3 (지점/상담/사업)
    dukji: _buildDukji(allRows, saupDept, sangDept, SANG_OVERRIDE)  // 사장님 덕질 스탯
  };

  // total_data 탭에 JSON 저장
  var out = ss.getSheetByName(TOTAL_OUT_SHEET) || ss.insertSheet(TOTAL_OUT_SHEET);
  out.clearContents();
  out.getRange('A1').setValue(JSON.stringify(D));

  // [진단] 지점 매핑 확인 — 원본 팀구분값 → 지점 (기타에 뭐가 들어가는지 확인용)
  var _teamMap = {};
  allRows.forEach(function(r){
    if (!r.h || isWebRow(r.b)) return;
    var _br = branchOf(r.b, r.h); if (_br === '인투본사') return;
    if (!_teamMap[_br]) _teamMap[_br] = {};
    _teamMap[_br][r.h] = (_teamMap[_br][r.h]||0) + 1;
  });
  Logger.log('[지점매핑] ' + Object.keys(_teamMap).map(function(br){
    return br + ' ← ' + Object.keys(_teamMap[br]).map(function(t){return t+'('+_teamMap[br][t]+')';}).join(',');
  }).join('  |  '));
  // [진단] 재편조직(파인더상암·마포지점) 상담자 → 재매핑된 지점 (사람별 확인용)
  var _dissMap = {};
  allRows.forEach(function(r){
    if (!r.h || isWebRow(r.b)) return;
    var _raw = _h2branch(r.h);
    if (_raw !== '파인더상암' && _raw !== '마포지점') return;
    var _to = branchOf(r.b, r.h);
    var _key = r.b + '→' + _to;
    _dissMap[_key] = (_dissMap[_key]||0) + 1;
  });
  Logger.log('[재편조직 재매핑] ' + (Object.keys(_dissMap).length ? Object.keys(_dissMap).sort().map(function(k){return k+'('+_dissMap[k]+')';}).join('  |  ') : '없음'));
  // [진단] 팀구분="기타" 행이 상담자 HR 소속으로 어디에 재배치됐는지 / 못 찾은 잔류
  var _etcMoved = {}, _etcStay = {};
  allRows.forEach(function(r){
    if (!r.h || isWebRow(r.b)) return;
    if (_h2branch(r.h) !== '기타') return;   // 원래 기타였던 것만
    var dest = branchOf(r.b, r.h);
    if (dest && dest !== '기타') { if(!_etcMoved[r.b]) _etcMoved[r.b]={br:dest,n:0}; _etcMoved[r.b].n++; }
    else { _etcStay[r.b]=(_etcStay[r.b]||0)+1; }
  });
  var _mv = Object.keys(_etcMoved);
  Logger.log('[기타→재배치] ' + (_mv.length ? _mv.map(function(n){return n+'→'+_etcMoved[n].br+'('+_etcMoved[n].n+')';}).join(', ') : '없음'));
  var _st = Object.keys(_etcStay);
  Logger.log('[기타 잔류(HR미등록)] ' + (_st.length ? _st.map(function(n){return n+'('+_etcStay[n]+')';}).join(', ') : '없음'));
  // [진단] 당월 취소 목록 (총매출_전사 내용칸 "XX취소" 기준) — 상담자/학생별 확인용
  Logger.log('[취소목록/' + cancelCnt + '건] ' + (_cxLog.length ? _cxLog.join('  |  ') : '없음'));
  // [진단] 사업개인인데 HR 사업부 시트에 이름 없어 부서 매칭 실패 (공란 처리된 사람)
  var _saupUnmatched = {};
  allRows.forEach(function(r){ if(isWebRow(r.b)||!r.f) return; if(!_saupTeam(r.f, saupDept)) _saupUnmatched[r.f]=(_saupUnmatched[r.f]||0)+1; });
  var _suKeys = Object.keys(_saupUnmatched);
  Logger.log('[사업 미매칭] ' + (_suKeys.length ? _suKeys.map(function(n){return n+'('+_saupUnmatched[n]+')';}).join(', ') : '없음'));
  // [진단] 취소 딛고 상위 — 개인 매출순 + 취소액 (취소 큰데 상위인 사람 = 역량 증거)
  function _cxHero(map){
    var arr=[]; for(var k in map){ arr.push({name:k, sales:map[k].sales||0, cxa:map[k].cxa||0}); }
    arr.sort(function(a,b){return b.sales-a.sales;});
    return arr.slice(0,8).map(function(x,i){ return (i+1)+'위 '+x.name+' '+Math.round(won(x.sales)/1e4)+'만'+(x.cxa>0?'(취소'+Math.round(won(x.cxa)/1e4)+'만)':''); }).join(' | ');
  }
  Logger.log('[취소딛고/상담] '+_cxHero(perMap));
  Logger.log('[취소딛고/사업] '+_cxHero(divpMap));

  var _w = D.weekly.thisWeek;
  Logger.log('이번주 상담매출왕 ' + (_w.sangSales?_w.sangSales.name+' '+_w.sangSales.sales.toLocaleString():'-')
    + ' / 사업매출왕 ' + (_w.saupSales?_w.saupSales.name+' '+_w.saupSales.sales.toLocaleString():'-'));
  Logger.log('3개월 지점TOP ' + D.top3.branch.map(function(x){return x.name+' '+x.sales.toLocaleString();}).join(' / '));
  Logger.log('6개월 지점TOP ' + D.top6.branch.map(function(x){return x.name+' '+x.sales.toLocaleString();}).join(' / '));
  Logger.log('덕질 급상승(상담) ' + (D.dukji.risers.sang[0]?D.dukji.risers.sang[0].name+' +'+D.dukji.risers.sang[0].delta.toLocaleString():'-')
    + ' / 커리어하이 ' + D.dukji.records.sang.length + '명 / 지점추이 ' + D.dukji.branchTrend.branches.length + '개');
  Logger.log('이달 급등주(월간) ' + ((D.dukji.surge&&D.dukji.surge.monthly&&D.dukji.surge.monthly.length)?D.dukji.surge.monthly.map(function(x){return x.team+' '+Math.round(x.ratio*100)+'%';}).join(' / '):'없음'));
  Logger.log('이번주 급등주(주간) ' + ((D.dukji.surge&&D.dukji.surge.weekly&&D.dukji.surge.weekly.length)?D.dukji.surge.weekly.map(function(x){return x.team+' '+(x.ratio?Math.round(x.ratio*100)+'%':'신규');}).join(' / '):'없음'));
  Logger.log('total 생성 — 전사 ' + D.tot.sales.toLocaleString()
    + ' / 웹마 ' + D.web.sales.toLocaleString()
    + ' / 상담 ' + D.sang.sales.toLocaleString()
    + ' / 취소 ' + D.cancel.amt.toLocaleString()
    + ' / 지점 ' + branches.length + '개');
  Logger.log('[보정] 원장실입금 ' + D.tot.ledger.toLocaleString() + ' = 영업 ' + D.tot.sales.toLocaleString() + ' + 본사추가 ' + D.tot.biz.toLocaleString() + (ledgerTotal>0?'':'  (U1 미입력 → 영업집계로 표시)'));
  return D;
}


/**
 * _buildDukji(allRows) — 사장님 "덕질 스탯" 데이터 생성
 *
 * allRows = past(5·6·7월 월종결 CSV) + cur(8월 총매출_전사)
 *   각 행: { date, b(상담개인), f(사업개인), h(팀구분→지점), sales(천원), gb }
 * _h2branch 는 위에 이미 정의된 전역 함수를 그대로 씀.
 */
function _buildDukji(allRows, saupDept, sangDept, sangOverride){
  saupDept = saupDept || {}; sangDept = sangDept || {}; sangOverride = sangOverride || {};
  function branchOf(b, h){
    var br = _h2branch(h);
    if (br === '파인더상암' || br === '마포지점') {
      if (sangOverride[b]) return sangOverride[b];
      var dd = sangDept[b];
      if (dd) { var bb = _h2branch(dd); if (bb && bb !== '기타' && bb !== '파인더상암' && bb !== '마포지점') return bb; }
      return '파인더루원';
    }
    if (br === '기타' || !br) {
      if (sangOverride[b]) return sangOverride[b];
      var d = sangDept[b];
      if (d) { var b2 = _h2branch(d); if (b2 && b2 !== '기타') return b2; }
    }
    return br;
  }
  var WEBB = ['웹마케팅팀'];
  var isWebRow = function(b){ return WEBB.indexOf(String(b||'').trim()) >= 0; };
  function won(n){ return Math.round((n||0) * 1000); }

  var today = new Date();
  function weekMon(d){ var day=(d.getDay()+6)%7; return new Date(d.getFullYear(),d.getMonth(),d.getDate()-day); }
  var mon = weekMon(today);
  var lastMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()-7);
  var nextMon = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()+7);
  function inThisWeek(d){ return d>=mon && d<nextMon; }
  function inLastWeek(d){ return d>=lastMon && d<mon; }
  function monthOf(d){ return d.getFullYear()*12 + d.getMonth(); }
  var curMi = today.getFullYear()*12 + today.getMonth();

  // 기간 필터로 인별(상담=b / 사업=f) 매출·세팅 집계
  function aggP(filter, useF){
    var m = {};
    allRows.forEach(function(r){
      if(!r.date || !filter(r.date)) return;
      if(!useF && isWebRow(r.b)) return;        // 상담만 웹마 제외 / 사업(useF)은 웹마 포함(사업부가 방문)
      var key = useF ? r.f : r.b;
      if(!key) return;
      if(!m[key]) m[key] = { name:key, sales:0, set:0, ord:0, team: useF ? _saupTeam(key, saupDept) : branchOf(r.b, r.h) };
      if(!r.sib) m[key].set++;
      if(r.sales>0){ m[key].sales+=r.sales; m[key].ord++; }
      if(!useF && !m[key].team && r.h) m[key].team=branchOf(r.b, r.h);
    });
    return m;
  }

  // ① 급상승왕 — 이번주 vs 지난주 매출 델타 (증가분 상위 3)
  function risers(useF){
    var tw=aggP(inThisWeek,useF), lw=aggP(inLastWeek,useF), names={};
    Object.keys(tw).forEach(function(k){ names[k]=1; });
    Object.keys(lw).forEach(function(k){ names[k]=1; });
    var arr=[];
    Object.keys(names).forEach(function(k){
      var t=tw[k]?tw[k].sales:0, l=lw[k]?lw[k].sales:0;
      var team=(tw[k]&&tw[k].team)||(lw[k]&&lw[k].team)||'';
      if(t-l>0) arr.push({ name:k, team:team, delta:won(t-l), thisW:won(t), lastW:won(l) });
    });
    arr.sort(function(a,b){ return b.delta-a.delta; });
    return arr.slice(0,3);
  }

  // ② 순위변동 — 현재순위 vs 이전기간순위 (move: +상승 / -하락 / null=신규진입)
  function ranked(map){
    var arr=[]; for(var k in map){ arr.push({ name:k, team:map[k].team||'', sales:map[k].sales }); }
    arr.sort(function(a,b){ return b.sales-a.sales; });
    arr.forEach(function(x,i){ x.rank=i+1; });
    return arr;
  }
  function rankMove(curMap, prevMap){
    var cur=ranked(curMap), prev=ranked(prevMap), pr={};
    prev.forEach(function(x){ pr[x.name]=x.rank; });
    return cur.map(function(x){
      var p=pr[x.name];
      return { name:x.name, team:x.team, rank:x.rank, sales:won(x.sales), prevRank:p||null, move:p?(p-x.rank):null };
    });
  }
  function inMonAbs(mi){ return function(d){ return monthOf(d)===mi; }; }
  var _SURGE=[];  // 이달(월간) 급등주(세부팀) — branchTrend에서 채움
  var _SURGE_WK=[];  // 이번주(주간) 급등주(세부팀)

  // [진단] 팀 주간 급등 — 세부팀(H) 이번주 vs 지난주 매출 (급등주 느낌 쓸만한지 확인용)
  var _twk={}, _lwk={};
  allRows.forEach(function(r){
    if(!r.date || isWebRow(r.b) || !r.h || !(r.sales>0)) return;
    var h=String(r.h).trim();
    if(inThisWeek(r.date)) _twk[h]=(_twk[h]||0)+r.sales;
    else if(inLastWeek(r.date)) _lwk[h]=(_lwk[h]||0)+r.sales;
  });
  var _wkKeys={}; Object.keys(_twk).forEach(function(k){_wkKeys[k]=1;}); Object.keys(_lwk).forEach(function(k){_wkKeys[k]=1;});
  var _wkArr=[];
  Object.keys(_wkKeys).forEach(function(k){ var t=_twk[k]||0,l=_lwk[k]||0; _wkArr.push({k:k,t:t,l:l,delta:t-l,r:(l>0?t/l:null)}); });
  _wkArr.sort(function(a,b){return b.delta-a.delta;});
  Logger.log('[팀 주간 급등] '+(_wkArr.length?_wkArr.slice(0,15).map(function(x){return x.k+' 지난주'+Math.round(won(x.l)/1e4)+'만→이번주'+Math.round(won(x.t)/1e4)+'만'+(x.r!=null?'('+Math.round(x.r*100)+'%)':'(신규)');}).join('  |  '):'없음'));

  // ③ 커리어하이 — 당월(8월)이 자기 히스토리 최고월 (직전 기록 갱신자 상위 5)
  function careerHigh(useF){
    var m={};
    allRows.forEach(function(r){
      if(!r.date || isWebRow(r.b)) return;
      var key=useF?r.f:r.b; if(!key) return;
      var mi=monthOf(r.date);
      if(!m[key]) m[key]={ name:key, team: useF ? _saupTeam(key, saupDept) : branchOf(r.b, r.h), byM:{} };
      m[key].byM[mi]=(m[key].byM[mi]||0)+(r.sales>0?r.sales:0);
      if(!useF && !m[key].team && r.h) m[key].team=branchOf(r.b, r.h);
    });
    var arr=[];
    Object.keys(m).forEach(function(k){
      var o=m[k], cur=o.byM[curMi]||0; if(cur<=0) return;
      var prevMax=0, prevN=0;
      Object.keys(o.byM).forEach(function(mi){ mi=+mi; if(mi<curMi){ prevN++; if(o.byM[mi]>prevMax) prevMax=o.byM[mi]; } });
      if(prevN>0 && cur>prevMax) arr.push({ name:k, team:o.team, aug:won(cur), prevMax:won(prevMax), jump:won(cur-prevMax) });
    });
    arr.sort(function(a,b){ return b.aug-a.aug; });
    return arr.slice(0,5);
  }

  // ④ 지점 추이 — 지점별 최근 4개월(5~8) 매출·세팅
  function branchTrend(){
    var m={}, mset={};
    allRows.forEach(function(r){
      if(!r.date || isWebRow(r.b)) return;
      if(monthOf(r.date) > curMi) return;   // 미래월(방문예정 등) 제외 — 실적 추이 아님
      var br=branchOf(r.b, r.h); if(!br || br==='인투본사') return;
      var mi=monthOf(r.date); mset[mi]=1;
      if(!m[br]) m[br]={ name:br, byM:{} };
      if(!m[br].byM[mi]) m[br].byM[mi]={ sales:0, set:0 };
      if(!r.sib) m[br].byM[mi].set++;
      if(r.sales>0) m[br].byM[mi].sales+=r.sales;
    });
    var janMi = curMi - (curMi % 12);          // 올해 1월
    var decMi = janMi + 11;                     // 올해 12월
    var months = [];
    for (var _mi = janMi; _mi <= decMi; _mi++) months.push(_mi);
    var arr=[];
    Object.keys(m).forEach(function(k){
      var o=m[k];
      var series=months.map(function(mi){
        var v=o.byM[mi];
        if (!v) return { m:(mi%12)+1, sales:null, set:null };   // 데이터 없는 달(과거·미래) = 빈칸
        return { m:(mi%12)+1, sales:won(v.sales), set:v.set };
      });
      var total=series.reduce(function(a,s){ return a+(s.sales||0); }, 0);
      arr.push({ name:k, series:series, total:total, launch: BRANCH_LAUNCH[k] || null });
    });
    arr.sort(function(a,b){ return b.total-a.total; });
    // 이달 급등주 — 세부팀(H) 8월(당월) 페이스가 7월(완성) 대비 높은 순. 규모필터(7월 1000만+)로 바닥 뻥튀기 제외
    var _tmBy={};
    allRows.forEach(function(r){
      if(!r.date||isWebRow(r.b)||!r.h||monthOf(r.date)>curMi||!(r.sales>0)) return;
      var mi=monthOf(r.date), h=String(r.h).trim();
      if(!_tmBy[h])_tmBy[h]={};
      _tmBy[h][mi]=(_tmBy[h][mi]||0)+r.sales;
    });
    var _MIN_JUL=10000, _MIN_RATIO=1.30;  // 7월 최소 1000만 + 8월이 7월의 130%+ (제자리 초과 제외, 진짜 급등만)
    var surge=[];
    Object.keys(_tmBy).forEach(function(h){
      var jul=_tmBy[h][curMi-1]||0, aug=_tmBy[h][curMi]||0;
      if(jul>=_MIN_JUL && aug>=jul*_MIN_RATIO){   // 7월 규모 있고 + 8월이 7월의 130%+ = 확실한 급등
        surge.push({ team:h, ratio:aug/jul, jul:won(jul), aug:won(aug) });
      }
    });
    surge.sort(function(a,b){ return b.ratio-a.ratio; });
    _SURGE=surge.slice(0,5);
    // 주간 급등주 — 세부팀 이번주 vs 지난주. 이번주 2000만+ & 전주 200%+ (지난주 baseline 안 봄, 이번주 실적 큰 게 진짜 급등)
    var _twT={}, _lwT={};
    allRows.forEach(function(r){
      if(!r.date||isWebRow(r.b)||!r.h||!(r.sales>0)) return;
      var h=String(r.h).trim();
      if(inThisWeek(r.date)) _twT[h]=(_twT[h]||0)+r.sales;
      else if(inLastWeek(r.date)) _lwT[h]=(_lwT[h]||0)+r.sales;
    });
    var _WK_MIN_THIS=20000, _WK_MIN_RATIO=2.0;  // 이번주 2000만+ & 전주 200%+
    var wsurge=[];
    Object.keys(_twT).forEach(function(h){
      var tw=_twT[h]||0, lw=_lwT[h]||0;
      var ratio = lw>0 ? tw/lw : null;
      if(tw>=_WK_MIN_THIS && (lw===0 || tw>=lw*_WK_MIN_RATIO)){  // 이번주 규모 + (신규 or 전주 200%+)
        wsurge.push({ team:h, ratio:ratio, lastW:won(lw), thisW:won(tw) });
      }
    });
    wsurge.sort(function(a,b){ return b.thisW-a.thisW; });  // 이번주 실적 큰 순
    _SURGE_WK=wsurge.slice(0,5);
    return { months:months.map(function(mi){ return (mi%12)+1; }), branches:arr };
  }

  var _bt = branchTrend();   // 먼저 호출 → _SURGE 채워짐
  return {
    risers: { sang:risers(false), saup:risers(true) },
    rankMove: {
      weekly:  { sang:rankMove(aggP(inThisWeek,false), aggP(inLastWeek,false)), saup:rankMove(aggP(inThisWeek,true), aggP(inLastWeek,true)) },
      monthly: { sang:rankMove(aggP(inMonAbs(curMi),false), aggP(inMonAbs(curMi-1),false)), saup:rankMove(aggP(inMonAbs(curMi),true), aggP(inMonAbs(curMi-1),true)) }
    },
    records: { sang:careerHigh(false), saup:careerHigh(true) },
    branchTrend: _bt,
    surge: { monthly:_SURGE, weekly:_SURGE_WK }
  };
}
