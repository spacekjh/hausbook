import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://xmfynndokdelrqodibhi.supabase.co";
const SUPABASE_KEY = "sb_publishable__Oqv33sP_B9ysl08xJ_SNQ_z8MuTwIU";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Prefer": "return=representation",
};

async function apiGet(params) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/transactions?" + params + "&order=date.asc,id.asc", { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiInsert(row) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/transactions", {
    method: "POST", headers, body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiUpdate(date, id, row) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/transactions?date=eq." + date + "&id=eq." + id, {
    method: "PATCH", headers, body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiDelete(date, id) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/transactions?date=eq." + date + "&id=eq." + id, {
    method: "DELETE", headers,
  });
  if (!res.ok) throw new Error(await res.text());
}

var CATEGORIES = [
  "회비","골프","쿠팡","관리비","자동차","경조사","의류비","주유","기타","멤버십",
  "선물","외식","세금","회식","보험료","주차비","당구","물건","간식","점심",
  "교통비","이발","커피","로또","마트","의료비","도서비","세차","통신비"
];
var DAYS = ["일","월","화","수","목","금","토"];
var MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function getDay(dateStr) {
  if (!dateStr) return "";
  return DAYS[new Date(dateStr).getDay()] + "요일";
}
function formatNum(n) {
  if (!n && n !== 0) return "";
  return Number(n).toLocaleString("ko-KR");
}
function parseNum(s) {
  return parseInt(String(s).replace(/,/g, ""), 10) || 0;
}
function emptyRow(date) {
  date = date || "";
  return { _key: Math.random(), date, day: date ? getDay(date) : "", summary:"", expense_opt:"", expense_req:"", category:"기타" };
}
function isMobile() {
  return window.innerWidth <= 768;
}

function Toast(props) {
  useEffect(function() {
    var t = setTimeout(props.onDone, 2000);
    return function() { clearTimeout(t); };
  }, [props.onDone]);
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background: props.type === "error" ? "#ef4444" : "#22c55e",
      color:"#fff", padding:"10px 24px", borderRadius:30,
      fontSize:13, fontWeight:600, zIndex:9999,
      boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap",
    }}>{props.msg}</div>
  );
}

export default function HausbookPage(props) {
  var now = new Date();
  var [year, setYear] = useState(now.getFullYear());
  var [month, setMonth] = useState(now.getMonth());
  var [rows, setRows] = useState([]);
  var [editCells, setEditCells] = useState({});
  var [activeCell, setActiveCell] = useState(null);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [deleteTarget, setDeleteTarget] = useState(null);
  var [toast, setToast] = useState(null);
  var [newRows, setNewRows] = useState([emptyRow()]);
  var [mobile, setMobile] = useState(isMobile());
  var inputRefs = useRef({});

  // 화면 크기 변경 감지
  useEffect(function() {
    function handleResize() { setMobile(isMobile()); }
    window.addEventListener("resize", handleResize);
    return function() { window.removeEventListener("resize", handleResize); };
  }, []);

  var ym = year + "-" + String(month+1).padStart(2,"0");
  var lastDay = new Date(year, month+1, 0).getDate();

  function showToast(msg, type) { setToast({ msg, type: type||"success" }); }

  async function loadData() {
    setLoading(true);
    try {
      var data = await apiGet("date=gte." + ym + "-01&date=lte." + ym + "-" + lastDay);
      setRows(data);
      setEditCells({});
    } catch(e) { showToast("로드 실패: " + e.message, "error"); }
    setLoading(false);
  }

  useEffect(function() {
    loadData();
    var today = new Date();
    setNewRows([emptyRow(ym + "-" + String(today.getDate()).padStart(2,"0"))]);
  // eslint-disable-next-line
  }, [year, month]);

  function prevMonth() { if(month===0){setMonth(11);setYear(function(y){return y-1;});}else setMonth(function(m){return m-1;}); }
  function nextMonth() { if(month===11){setMonth(0);setYear(function(y){return y+1;});}else setMonth(function(m){return m+1;}); }

  function getCellVal(row, col) {
    var k = row.date + "_" + row.id + "_" + col;
    return k in editCells ? editCells[k] : (row[col] !== undefined ? row[col] : "");
  }
  function setCellVal(row, col, val) {
    var k = row.date + "_" + row.id + "_" + col;
    if (col === "date") {
      var dk = row.date + "_" + row.id + "_day";
      setEditCells(function(prev){ var n={};Object.assign(n,prev);n[k]=val;n[dk]=getDay(val);return n; });
    } else {
      setEditCells(function(prev){ var n={};Object.assign(n,prev);n[k]=val;return n; });
    }
  }
  function isDirty(row, col) { return (row.date + "_" + row.id + "_" + col) in editCells; }

  async function saveRow(row) {
    var payload = {
      date: getCellVal(row,"date") || row.date,
      day:  getCellVal(row,"day")  || row.day,
      summary: getCellVal(row,"summary"),
      expense_opt: parseNum(getCellVal(row,"expense_opt")),
      expense_req: parseNum(getCellVal(row,"expense_req")),
      category: getCellVal(row,"category") || row.category,
    };
    setSaving(true);
    try {
      await apiUpdate(row.date, row.id, payload);
      showToast("저장되었습니다");
      loadData();
    } catch(e) { showToast("저장 실패: "+e.message,"error"); }
    setSaving(false);
  }

  function setNewRowVal(idx, col, val) {
    setNewRows(function(prev){
      var u = prev.slice();
      u[idx] = Object.assign({}, u[idx]);
      u[idx][col] = val;
      if(col === "date") u[idx].day = getDay(val);
      return u;
    });
  }
  function addNewRow() {
    var today = new Date();
    setNewRows(function(prev){ return prev.concat([emptyRow(ym + "-" + String(today.getDate()).padStart(2,"0"))]); });
  }
  async function saveNewRow(idx) {
    var nr = newRows[idx];
    if(!nr.date){ showToast("날짜를 입력해주세요","error"); return; }
    if(!nr.expense_opt && !nr.expense_req){ showToast("지출금액을 입력해주세요","error"); return; }
    var payload = {
      date: nr.date, day: nr.day || getDay(nr.date),
      summary: nr.summary || "",
      expense_opt: parseNum(nr.expense_opt),
      expense_req: parseNum(nr.expense_req),
      category: nr.category || "기타",
    };
    setSaving(true);
    try {
      await apiInsert(payload);
      showToast("추가되었습니다");
      setNewRows(function(prev){
        var f = prev.filter(function(_,i){ return i !== idx; });
        return f.length === 0 ? [emptyRow(ym+"-01")] : f;
      });
      loadData();
    } catch(e) { showToast("추가 실패: "+e.message,"error"); }
    setSaving(false);
  }
  function removeNewRow(idx) {
    setNewRows(function(prev){
      return prev.length === 1 ? [emptyRow(ym+"-01")] : prev.filter(function(_,i){ return i !== idx; });
    });
  }
  async function handleDelete() {
    try {
      await apiDelete(deleteTarget.date, deleteTarget.id);
      showToast("삭제되었습니다");
      setDeleteTarget(null);
      loadData();
    } catch(e) { showToast("삭제 실패: "+e.message,"error"); }
  }

  function handleKeyDown(e, rowKey, col, onSave) {
    if(e.key === "Enter"){
      e.preventDefault();
      var cols = ["date","summary","expense_opt","expense_req","category"];
      var ci = cols.indexOf(col);
      if(ci < cols.length-1){
        var next = inputRefs.current[rowKey + "_" + cols[ci+1]];
        if(next) next.focus();
      } else { if(onSave) onSave(); }
    }
    if(e.key === "Escape"){ setActiveCell(null); e.target.blur(); }
  }

  var totalOpt = rows.reduce(function(s,r){ return s+(r.expense_opt||0); }, 0);
  var totalReq = rows.reduce(function(s,r){ return s+(r.expense_req||0); }, 0);
  var totalAll = rows.reduce(function(s,r){ return s+(r.total||0); }, 0);

  // PC: NO 컬럼 포함 / 모바일: NO 컬럼 제외, 날짜 MM-DD 형식
  var pcGrid   = "100px 52px 46px 1fr 118px 118px 108px 118px 88px";
  var mobileGrid = "52px 30px 1fr 72px 72px 72px 72px";

  var gridTemplate = mobile ? mobileGrid : pcGrid;

  function inputSt(active, dirty) {
    return {
      padding:"0 6px", margin:0, border:"none",
      outline: active ? "2px solid #2563eb" : dirty ? "1.5px solid #f59e0b" : "none",
      outlineOffset:"-1px",
      background: active ? "#eff6ff" : dirty ? "#fffbeb" : "transparent",
      borderRadius:2, width:"100%", height:"100%",
      fontSize: mobile ? 11 : 13, color:"#1e293b", fontFamily:"inherit",
    };
  }
  function numSt(active, dirty) {
    var s = inputSt(active, dirty);
    s.padding = "0 4px 0 0";
    s.textAlign = "right";
    return s;
  }

  // 날짜 표시: 모바일은 MM-DD, PC는 YYYY.MM.DD
  function formatDate(dateStr) {
    if (!dateStr) return "";
    if (mobile) return dateStr.slice(5).replace("-", "-"); // MM-DD
    return dateStr.replace(/-/g, ".");
  }

  // 컬럼 헤더 - 모바일은 NO 제외
  var pcHeaders   = ["날짜","요일","NO","적요","지출(선택)","지출(필수)","구분","계",""];
  var mobileHeaders = ["날짜","요일","적요","지출(선택)","지출(필수)","구분","계"];

  var colHeaders = mobile ? mobileHeaders : pcHeaders;

  function renderRow(row, idx) {
    var rk = row.date + "_" + row.id;
    var isEven = idx % 2 === 0;
    var hasDirty = Object.keys(editCells).some(function(k){ return k.indexOf(rk) === 0; });
    var dayVal = getCellVal(row,"day");
    var dayColor = dayVal.indexOf("일") >= 0 ? "#ef4444" : dayVal.indexOf("토") >= 0 ? "#3b82f6" : "#475569";
    var rowHeight = mobile ? 32 : 34;

    return (
      <div key={rk} className="srow" style={{ display:"grid", gridTemplateColumns:gridTemplate, background:isEven?"#fff":"#f8fafc", borderBottom:"1px solid #e2e8f0", height:rowHeight, alignItems:"stretch", transition:"background .1s" }}>
        {/* 날짜 */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", paddingLeft:4 }}>
          {mobile ? (
            <span style={{ fontSize:11, color:"#1e293b" }}>{formatDate(row.date)}</span>
          ) : activeCell && activeCell.key===rk && activeCell.col==="date" ? (
            <input ref={function(el){ inputRefs.current[rk+"_date"]=el; }} type="date" value={getCellVal(row,"date")}
              onChange={function(e){ setCellVal(row,"date",e.target.value); }}
              onFocus={function(){ setActiveCell({key:rk,col:"date"}); }} onBlur={function(){ setActiveCell(null); }}
              onKeyDown={function(e){ handleKeyDown(e,rk,"date",function(){ saveRow(row); }); }}
              style={Object.assign({},inputSt(true,isDirty(row,"date")),{fontSize:12})}/>
          ) : (
            <span onClick={function(){ setActiveCell({key:rk,col:"date"}); setTimeout(function(){ if(inputRefs.current[rk+"_date"]) inputRefs.current[rk+"_date"].focus(); },50); }}
              style={{ fontSize:12, padding:"0 4px", cursor:"pointer", color:"#1e293b", width:"100%",
                background: isDirty(row,"date") ? "#fffbeb" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              {getCellVal(row,"date").replace(/-/g,".")}
              <span style={{ fontSize:11, color:"#94a3b8" }}>&#128197;</span>
            </span>
          )}
        </div>
        {/* 요일 */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize: mobile?11:12, fontWeight:600, color:dayColor }}>{dayVal.replace("요일","")}</span>
        </div>
        {/* NO - PC만 */}
        {!mobile && (
          <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#94a3b8" }}>{row.id}</span>
          </div>
        )}
        {/* 적요 */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
          <input ref={function(el){ inputRefs.current[rk+"_summary"]=el; }} type="text" value={getCellVal(row,"summary")} placeholder="내용..."
            onChange={function(e){ setCellVal(row,"summary",e.target.value); }}
            onFocus={function(){ setActiveCell({key:rk,col:"summary"}); }} onBlur={function(){ setActiveCell(null); }}
            onKeyDown={function(e){ handleKeyDown(e,rk,"summary",function(){ saveRow(row); }); }}
            style={inputSt(activeCell&&activeCell.key===rk&&activeCell.col==="summary",isDirty(row,"summary"))}/>
        </div>
        {/* 지출(선택) */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
          <input ref={function(el){ inputRefs.current[rk+"_expense_opt"]=el; }} type="number" value={getCellVal(row,"expense_opt")}
            onChange={function(e){ setCellVal(row,"expense_opt",e.target.value); }}
            onFocus={function(){ setActiveCell({key:rk,col:"expense_opt"}); }} onBlur={function(){ setActiveCell(null); }}
            onKeyDown={function(e){ handleKeyDown(e,rk,"expense_opt",function(){ saveRow(row); }); }}
            style={Object.assign({},numSt(activeCell&&activeCell.key===rk&&activeCell.col==="expense_opt",isDirty(row,"expense_opt")),{color:"#d97706"})}/>
        </div>
        {/* 지출(필수) */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
          <input ref={function(el){ inputRefs.current[rk+"_expense_req"]=el; }} type="number" value={getCellVal(row,"expense_req")}
            onChange={function(e){ setCellVal(row,"expense_req",e.target.value); }}
            onFocus={function(){ setActiveCell({key:rk,col:"expense_req"}); }} onBlur={function(){ setActiveCell(null); }}
            onKeyDown={function(e){ handleKeyDown(e,rk,"expense_req",function(){ saveRow(row); }); }}
            style={Object.assign({},numSt(activeCell&&activeCell.key===rk&&activeCell.col==="expense_req",isDirty(row,"expense_req")),{color:"#dc2626"})}/>
        </div>
        {/* 구분 */}
        <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
          <select ref={function(el){ inputRefs.current[rk+"_category"]=el; }} value={getCellVal(row,"category")}
            onChange={function(e){ setCellVal(row,"category",e.target.value); }}
            onFocus={function(){ setActiveCell({key:rk,col:"category"}); }} onBlur={function(){ setActiveCell(null); }}
            onKeyDown={function(e){ handleKeyDown(e,rk,"category",function(){ saveRow(row); }); }}
            style={Object.assign({},inputSt(activeCell&&activeCell.key===rk&&activeCell.col==="category",isDirty(row,"category")),{cursor:"pointer",fontSize: mobile?10:12})}>
            {CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
          </select>
        </div>
        {/* 계 - 모바일은 클릭시 저장/삭제 메뉴 */}
        <div onClick={mobile && hasDirty ? function(){ saveRow(row); } : mobile ? function(){ setDeleteTarget(row); } : undefined}
          style={{ borderRight: mobile?"none":"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight: mobile?6:8, cursor: mobile?"pointer":"default" }}>
          <span style={{ fontSize: mobile?11:13, fontWeight:700 }}>{formatNum(row.total)}</span>
          {mobile && hasDirty && <span style={{ fontSize:9, color:"#2563eb", marginLeft:2 }}>저장</span>}
          {mobile && !hasDirty && <span style={{ fontSize:9, color:"#ef4444", marginLeft:2 }}>삭제</span>}
        </div>
        {/* 저장/삭제 버튼 */}
        {!mobile && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
          {hasDirty && (
            <button onClick={function(){ saveRow(row); }} style={{ background:"#2563eb", border:"none", color:"#fff", borderRadius:5, padding: mobile?"2px 4px":"3px 8px", fontSize: mobile?10:11, fontWeight:700, cursor:"pointer" }}>저장</button>
          )}
          <button className="del-btn" onClick={function(){ setDeleteTarget(row); }} style={{ background:"#fef2f2", border:"none", color:"#ef4444", borderRadius:5, padding: mobile?"2px 4px":"3px 8px", fontSize: mobile?10:11, fontWeight:600, cursor:"pointer", opacity: mobile?0.6:0, transition:"opacity .15s" }}>X</button>
        </div>
        )}
      </div>
    );
  }

  function renderNewRow(nr, idx) {
    var nrDayColor = nr.day && nr.day.indexOf("일") >= 0 ? "#ef4444" : nr.day && nr.day.indexOf("토") >= 0 ? "#3b82f6" : "#475569";
    var rowHeight = mobile ? 32 : 34;
    return (
      <div key={nr._key} style={{ display:"grid", gridTemplateColumns:gridTemplate, borderBottom:"1px solid #dcfce7", height:rowHeight, alignItems:"stretch", background:"#f0fdf4" }}>
        {/* 날짜 */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
          <input type="date" value={nr.date} ref={function(el){ inputRefs.current["new_"+idx+"_date"]=el; }}
            onChange={function(e){ setNewRowVal(idx,"date",e.target.value); }}
            onKeyDown={function(e){ handleKeyDown(e,"new_"+idx,"date",null); }}
            style={Object.assign({},inputSt(false,false),{fontSize: mobile?10:11, background:"transparent", letterSpacing:"-0.5px"})}/>
        </div>
        {/* 요일 */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize: mobile?11:12, fontWeight:600, color:nrDayColor }}>{nr.day ? nr.day.replace("요일","") : ""}</span>
        </div>
        {/* NO - PC만 */}
        {!mobile && (
          <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>new</span>
          </div>
        )}
        {/* 적요 */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
          <input type="text" value={nr.summary} placeholder="내용..." ref={function(el){ inputRefs.current["new_"+idx+"_summary"]=el; }}
            onChange={function(e){ setNewRowVal(idx,"summary",e.target.value); }}
            onKeyDown={function(e){ handleKeyDown(e,"new_"+idx,"summary",null); }}
            style={Object.assign({},inputSt(false,false),{background:"transparent"})}/>
        </div>
        {/* 지출(선택) */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
          <input type="number" value={nr.expense_opt} placeholder="0" ref={function(el){ inputRefs.current["new_"+idx+"_expense_opt"]=el; }}
            onChange={function(e){ setNewRowVal(idx,"expense_opt",e.target.value); }}
            onKeyDown={function(e){ handleKeyDown(e,"new_"+idx,"expense_opt",null); }}
            style={Object.assign({},numSt(false,false),{color:"#d97706",background:"transparent"})}/>
        </div>
        {/* 지출(필수) */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
          <input type="number" value={nr.expense_req} placeholder="0" ref={function(el){ inputRefs.current["new_"+idx+"_expense_req"]=el; }}
            onChange={function(e){ setNewRowVal(idx,"expense_req",e.target.value); }}
            onKeyDown={function(e){ handleKeyDown(e,"new_"+idx,"expense_req",null); }}
            style={Object.assign({},numSt(false,false),{color:"#dc2626",background:"transparent"})}/>
        </div>
        {/* 구분 */}
        <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
          <select value={nr.category} ref={function(el){ inputRefs.current["new_"+idx+"_category"]=el; }}
            onChange={function(e){ setNewRowVal(idx,"category",e.target.value); }}
            onKeyDown={function(e){ handleKeyDown(e,"new_"+idx,"category",function(){ saveNewRow(idx); }); }}
            style={Object.assign({},inputSt(false,false),{cursor:"pointer",fontSize: mobile?10:12, background:"transparent"})}>
            {CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
          </select>
        </div>
        {/* 계 - 모바일은 클릭시 저장 */}
        <div onClick={mobile ? function(){ saveNewRow(idx); } : undefined}
          style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight: mobile?6:8, cursor: mobile?"pointer":"default" }}>
          <span style={{ fontSize: mobile?11:13, fontWeight:700, color:"#16a34a" }}>
            {(parseNum(nr.expense_opt)+parseNum(nr.expense_req)) > 0 ? formatNum(parseNum(nr.expense_opt)+parseNum(nr.expense_req)) : ""}
          </span>
          {mobile && <span style={{ fontSize:9, color:"#16a34a", marginLeft:2 }}>저장</span>}
        </div>
        {/* 저장/삭제 버튼 */}
        {!mobile && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
          <button onClick={function(){ saveNewRow(idx); }} disabled={saving} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:5, padding: mobile?"2px 4px":"3px 8px", fontSize: mobile?10:11, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>저장</button>
          <button onClick={function(){ removeNewRow(idx); }} style={{ background:"#fee2e2", border:"none", color:"#ef4444", borderRadius:5, padding: mobile?"2px 4px":"3px 8px", fontSize: mobile?10:11, cursor:"pointer" }}>X</button>
        </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#e8edf2", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif" }}>
      <style>{[
        "*{box-sizing:border-box;}",
        "input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}",
        "input[type=date]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer;}",
        ".srow:hover .del-btn{opacity:1!important;}",
        ".srow:hover{background:#eff6ff!important;}"
      ].join("")}</style>

      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"#fff", padding: mobile?"10px 12px":"14px 16px", boxShadow:"0 2px 12px rgba(37,99,235,0.4)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          {/* 1행: 월 네비게이션(왼쪽) + 타이틀(가운데) + 통계/로그아웃(오른쪽) */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: mobile?6:8 }}>
            {/* 월 네비게이션 */}
            <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"2px" }}>
              <button onClick={prevMonth} style={{ background:"none", border:"none", color:"#fff", fontSize:14, cursor:"pointer", padding:"4px 10px", borderRadius:10 }}>{"<"}</button>
              <span style={{ fontSize: mobile?14:16, fontWeight:800, minWidth: mobile?90:110, textAlign:"center" }}>{year}년 {MONTHS[month]}</span>
              <button onClick={nextMonth} style={{ background:"none", border:"none", color:"#fff", fontSize:14, cursor:"pointer", padding:"4px 10px", borderRadius:10 }}>{">"}</button>
            </div>
            {/* 타이틀 가운데 */}
            <span style={{ fontSize: mobile?16:20, fontWeight:900, position:"absolute", left:"50%", transform:"translateX(-50%)" }}>가계부</span>
            {/* 통계 + 로그아웃 버튼 */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={props.onStats} style={{
                background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)",
                color:"#fff", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer"
              }}>통계</button>
              <button onClick={props.onLogout} style={{
                background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)",
                color:"#fff", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer"
              }}>로그아웃</button>
            </div>
          </div>
          {/* 2행: 합계 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap: mobile?10:16, fontSize: mobile?11:13 }}>
            <span>선택 <b style={{ color:"#fbbf24" }}>{formatNum(totalOpt)}</b></span>
            <span>필수 <b style={{ color:"#fca5a5" }}>{formatNum(totalReq)}</b></span>
            <span>합계 <b style={{ color:"#fff", fontSize: mobile?13:15 }}>{formatNum(totalAll)}</b></span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin: mobile?"8px auto":"16px auto", padding:"0 8px" }}>
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.1)", overflow:"hidden" }}>

          {/* 컬럼 헤더 */}
          <div style={{ display:"grid", gridTemplateColumns:gridTemplate, background:"#1e3a8a", color:"#fff", fontSize: mobile?10:12, fontWeight:700 }}>
            {colHeaders.map(function(h,i){
              var isNum = mobile ? (i>=3&&i<=6) : (i>=4&&i<=7);
              return <div key={i} style={{ padding: mobile?"7px 3px":"10px 8px", textAlign: isNum?"right":"center", borderRight:i<colHeaders.length-1?"1px solid rgba(255,255,255,0.15)":"none" }}>{h}</div>;
            })}
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>데이터를 불러오는 중...</div>
          ) : (
            <div>
              {rows.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:14 }}>이번 달 내역이 없습니다.</div>
              )}
              {rows.map(function(row, idx){ return renderRow(row, idx); })}

              {/* 새 입력 영역 */}
              <div style={{ background:"#f0fdf4", borderTop:"2px solid #86efac" }}>
                <div style={{ padding:"4px 8px 2px", fontSize:11, color:"#16a34a", fontWeight:700 }}>새 입력</div>
                {newRows.map(function(nr, idx){ return renderNewRow(nr, idx); })}
                <div style={{ padding:"6px 10px" }}>
                  <button onClick={addNewRow} style={{ background:"none", border:"1.5px dashed #86efac", color:"#16a34a", borderRadius:8, padding:"5px 16px", fontSize:12, fontWeight:600, cursor:"pointer", width:"100%" }}>+ 행 추가</button>
                </div>
              </div>

              {/* 합계 행 */}
              {rows.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:gridTemplate, background:"#1e3a8a", color:"#fff", fontSize: mobile?11:13, fontWeight:800, height: mobile?32:36, alignItems:"center" }}>
                  <div style={{ textAlign:"center", gridColumn: mobile?"1/3":"1/4", fontSize: mobile?10:12 }}>합계({rows.length}건)</div>
                  {mobile && <div></div>}
                  <div style={{ textAlign:"right", paddingRight: mobile?4:8, color:"#fbbf24" }}>{formatNum(totalOpt)}</div>
                  <div style={{ textAlign:"right", paddingRight: mobile?4:8, color:"#fca5a5" }}>{formatNum(totalReq)}</div>
                  <div></div>
                  <div style={{ textAlign:"right", paddingRight: mobile?4:8 }}>{formatNum(totalAll)}</div>
                  <div></div>
                </div>
              )}
            </div>
          )}
        </div>
        {!mobile && (
          <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#94a3b8" }}>
            셀 클릭 후 바로 입력 / Enter 로 다음 셀 이동 / 수정 후 저장 버튼 / 행에 마우스 올리면 X 삭제
          </div>
        )}
      </div>

      {/* 삭제 확인 팝업 */}
      {deleteTarget && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px", textAlign:"center", maxWidth:300, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>정말 삭제할까요?</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>{deleteTarget.date} / {deleteTarget.summary || deleteTarget.category}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#dc2626", marginBottom:20 }}>{formatNum(deleteTarget.total)}원</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={function(){ setDeleteTarget(null); }} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", color:"#64748b", fontWeight:600, cursor:"pointer" }}>취소</button>
              <button onClick={handleDelete} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"#ef4444", color:"#fff", fontWeight:700, cursor:"pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={function(){ setToast(null); }} />}
    </div>
  );
}
