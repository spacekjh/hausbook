import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://xmfynndokdelrqodibhi.supabase.co";
const SUPABASE_KEY = "sb_publishable__Oqv33sP_B9ysl08xJ_SNQ_z8MuTwIU";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

async function apiGet(params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?${params}&order=date.asc,id.asc`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiInsert(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: "POST", headers, body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiUpdate(date, id, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?date=eq.${date}&id=eq.${id}`, {
    method: "PATCH", headers, body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiDelete(date, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?date=eq.${date}&id=eq.${id}`, {
    method: "DELETE", headers,
  });
  if (!res.ok) throw new Error(await res.text());
}

const CATEGORIES = [
  "회비","골프","쿠팡","관리비","자동차","경조사","의류비","주유","기타","멤버십",
  "선물","외식","세금","회식","보험료","주차비","당구","물건","간식","점심",
  "교통비","이발","커피","로또","마트","의료비","도서비","세차","통신비"
];

const DAYS = ["일","월","화","수","목","금","토"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

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

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background: type==="error"?"#ef4444":"#22c55e",
      color:"#fff", padding:"10px 24px", borderRadius:30,
      fontSize:13, fontWeight:600, zIndex:9999,
      boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

function emptyRow(date="") {
  return { _key: Math.random(), date, day: date?getDay(date):"", summary:"", expense_opt:"", expense_req:"", category:"기타" };
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState([]);
  const [editCells, setEditCells] = useState({});
  const [activeCell, setActiveCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [newRows, setNewRows] = useState([emptyRow()]);
  const inputRefs = useRef({});

  const ym = `${year}-${String(month+1).padStart(2,"0")}`;
  const lastDay = new Date(year, month+1, 0).getDate();

  async function loadData() {
    setLoading(true);
    try {
      const data = await apiGet(`date=gte.${ym}-01&date=lte.${ym}-${lastDay}`);
      setRows(data);
      setEditCells({});
    } catch(e) {
      showToast("로드 실패: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setNewRows([emptyRow(`${ym}-${String(now.getDate()).padStart(2,"0")}`)]);
  }, [year, month]);

  function showToast(msg, type="success") { setToast({ msg, type }); }
  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  function getCellVal(row, col) {
    const k = `${row.date}_${row.id}_${col}`;
    return k in editCells ? editCells[k] : row[col] ?? "";
  }
  function setCellVal(row, col, val) {
    const k = `${row.date}_${row.id}_${col}`;
    if (col==="date") {
      const dk = `${row.date}_${row.id}_day`;
      setEditCells(prev=>({...prev,[k]:val,[dk]:getDay(val)}));
    } else {
      setEditCells(prev=>({...prev,[k]:val}));
    }
  }
  function isDirty(row, col) {
    return `${row.date}_${row.id}_${col}` in editCells;
  }

  async function saveRow(row) {
    const payload = {
      date:        getCellVal(row,"date")||row.date,
      day:         getCellVal(row,"day")||row.day,
      summary:     getCellVal(row,"summary")??row.summary,
      expense_opt: parseNum(getCellVal(row,"expense_opt")??row.expense_opt),
      expense_req: parseNum(getCellVal(row,"expense_req")??row.expense_req),
      category:    getCellVal(row,"category")||row.category,
    };
    setSaving(true);
    try {
      await apiUpdate(row.date, row.id, payload);
      showToast("? 저장되었습니다");
      loadData();
    } catch(e) { showToast("저장 실패: "+e.message,"error"); }
    finally { setSaving(false); }
  }

  function setNewRowVal(idx, col, val) {
    setNewRows(prev=>{
      const u=[...prev];
      u[idx]={...u[idx],[col]:val};
      if(col==="date") u[idx].day=getDay(val);
      return u;
    });
  }
  function addNewRow() {
    setNewRows(prev=>[...prev, emptyRow(`${ym}-${String(now.getDate()).padStart(2,"0")}`)]);
  }
  async function saveNewRow(idx) {
    const nr=newRows[idx];
    if(!nr.date){showToast("날짜를 입력해주세요","error");return;}
    if(!nr.expense_opt&&!nr.expense_req){showToast("지출금액을 입력해주세요","error");return;}
    const payload={
      date:nr.date, day:nr.day||getDay(nr.date),
      summary:nr.summary||"",
      expense_opt:parseNum(nr.expense_opt),
      expense_req:parseNum(nr.expense_req),
      category:nr.category||"기타",
    };
    setSaving(true);
    try {
      await apiInsert(payload);
      showToast("? 추가되었습니다");
      setNewRows(prev=>{ const f=prev.filter((_,i)=>i!==idx); return f.length===0?[emptyRow(`${ym}-01`)]:f; });
      loadData();
    } catch(e) { showToast("추가 실패: "+e.message,"error"); }
    finally { setSaving(false); }
  }
  function removeNewRow(idx) {
    setNewRows(prev=>prev.length===1?[emptyRow(`${ym}-01`)]:prev.filter((_,i)=>i!==idx));
  }
  async function handleDelete() {
    try {
      await apiDelete(deleteTarget.date, deleteTarget.id);
      showToast("??? 삭제되었습니다");
      setDeleteTarget(null);
      loadData();
    } catch(e) { showToast("삭제 실패: "+e.message,"error"); }
  }

  function handleKeyDown(e, rowKey, col, onSave) {
    if(e.key==="Enter"){
      e.preventDefault();
      const cols=["date","summary","expense_opt","expense_req","category"];
      const ci=cols.indexOf(col);
      if(ci<cols.length-1){ inputRefs.current[`${rowKey}_${cols[ci+1]}`]?.focus(); }
      else { if(onSave) onSave(); }
    }
    if(e.key==="Escape"){ setActiveCell(null); e.target.blur(); }
  }

  const totalOpt = rows.reduce((s,r)=>s+(r.expense_opt||0),0);
  const totalReq = rows.reduce((s,r)=>s+(r.expense_req||0),0);
  const totalAll = rows.reduce((s,r)=>s+(r.total||0),0);

  const gridTemplate = "100px 52px 46px 1fr 118px 118px 108px 118px 88px";

  const inputSt = (active, dirty) => ({
    padding:"0 6px", margin:0, border:"none",
    outline: active?"2px solid #2563eb":dirty?"1.5px solid #f59e0b":"none",
    outlineOffset:"-1px",
    background: active?"#eff6ff":dirty?"#fffbeb":"transparent",
    borderRadius:2, width:"100%", height:"100%",
    fontSize:13, color:"#1e293b", fontFamily:"inherit",
  });
  const numSt = (active, dirty) => ({
    ...inputSt(active,dirty), padding:"0 8px 0 0", textAlign:"right",
  });

  return (
    <div style={{ minHeight:"100vh", background:"#e8edf2", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer;}
        .srow:hover .del-btn{opacity:1!important;}
        .srow:hover{background:#eff6ff!important;}
      `}</style>

      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"#fff", padding:"14px 16px", boxShadow:"0 2px 12px rgba(37,99,235,0.4)", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, fontWeight:900 }}>?? 가계부</span>
            <span style={{ fontSize:10, background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.35)", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>Supabase PostgreSQL</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:0, background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"2px" }}>
            <button onClick={prevMonth} style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"6px 14px", borderRadius:10 }}>?</button>
            <span style={{ fontSize:16, fontWeight:800, minWidth:110, textAlign:"center" }}>{year}년 {MONTHS[month]}</span>
            <button onClick={nextMonth} style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"6px 14px", borderRadius:10 }}>?</button>
          </div>
          <div style={{ display:"flex", gap:16, fontSize:13 }}>
            <span>선택 <b style={{ color:"#fbbf24" }}>{formatNum(totalOpt)}원</b></span>
            <span>필수 <b style={{ color:"#fca5a5" }}>{formatNum(totalReq)}원</b></span>
            <span>합계 <b style={{ color:"#fff", fontSize:15 }}>{formatNum(totalAll)}원</b></span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"16px auto", padding:"0 12px" }}>
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.1)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:gridTemplate, background:"#1e3a8a", color:"#fff", fontSize:12, fontWeight:700, position:"sticky", top:57, zIndex:10 }}>
            {["날짜","요일","NO","적요","지출(선택)","지출(필수)","구분","계",""].map((h,i)=>(
              <div key={i} style={{ padding:"10px 8px", textAlign:i>=4&&i<=7?"right":"center", borderRight:i<8?"1px solid rgba(255,255,255,0.15)":"none" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>? 데이터를 불러오는 중...</div>
          ) : (
            <>
              {rows.length===0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8", fontSize:14 }}>이번 달 내역이 없습니다. 아래에서 입력해주세요.</div>
              )}
              {rows.map((row, idx) => {
                const rk=`${row.date}_${row.id}`;
                const isEven=idx%2===0;
                const hasDirty=Object.keys(editCells).some(k=>k.startsWith(rk));
                return (
                  <div key={rk} className="srow" style={{ display:"grid", gridTemplateColumns:gridTemplate, background:isEven?"#fff":"#f8fafc", borderBottom:"1px solid #e2e8f0", height:34, alignItems:"stretch", transition:"background .1s" }}>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
                      <input ref={el=>inputRefs.current[`${rk}_date`]=el} type="date" value={getCellVal(row,"date")}
                        onChange={e=>setCellVal(row,"date",e.target.value)}
                        onFocus={()=>setActiveCell({key:rk,col:"date"})} onBlur={()=>setActiveCell(null)}
                        onKeyDown={e=>handleKeyDown(e,rk,"date",()=>saveRow(row))}
                        style={{...inputSt(activeCell?.key===rk&&activeCell?.col==="date",isDirty(row,"date")),fontSize:12}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:getCellVal(row,"day")?.includes("일")?"#ef4444":getCellVal(row,"day")?.includes("토")?"#3b82f6":"#475569" }}>
                        {getCellVal(row,"day")?.replace("요일","")}
                      </span>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>{row.id}</span>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
                      <input ref={el=>inputRefs.current[`${rk}_summary`]=el} type="text" value={getCellVal(row,"summary")} placeholder="내용 입력..."
                        onChange={e=>setCellVal(row,"summary",e.target.value)}
                        onFocus={()=>setActiveCell({key:rk,col:"summary"})} onBlur={()=>setActiveCell(null)}
                        onKeyDown={e=>handleKeyDown(e,rk,"summary",()=>saveRow(row))}
                        style={inputSt(activeCell?.key===rk&&activeCell?.col==="summary",isDirty(row,"summary"))}/>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
                      <input ref={el=>inputRefs.current[`${rk}_expense_opt`]=el} type="number" value={getCellVal(row,"expense_opt")}
                        onChange={e=>setCellVal(row,"expense_opt",e.target.value)}
                        onFocus={()=>setActiveCell({key:rk,col:"expense_opt"})} onBlur={()=>setActiveCell(null)}
                        onKeyDown={e=>handleKeyDown(e,rk,"expense_opt",()=>saveRow(row))}
                        style={{...numSt(activeCell?.key===rk&&activeCell?.col==="expense_opt",isDirty(row,"expense_opt")),color:"#d97706"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
                      <input ref={el=>inputRefs.current[`${rk}_expense_req`]=el} type="number" value={getCellVal(row,"expense_req")}
                        onChange={e=>setCellVal(row,"expense_req",e.target.value)}
                        onFocus={()=>setActiveCell({key:rk,col:"expense_req"})} onBlur={()=>setActiveCell(null)}
                        onKeyDown={e=>handleKeyDown(e,rk,"expense_req",()=>saveRow(row))}
                        style={{...numSt(activeCell?.key===rk&&activeCell?.col==="expense_req",isDirty(row,"expense_req")),color:"#dc2626"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center" }}>
                      <select ref={el=>inputRefs.current[`${rk}_category`]=el} value={getCellVal(row,"category")}
                        onChange={e=>setCellVal(row,"category",e.target.value)}
                        onFocus={()=>setActiveCell({key:rk,col:"category"})} onBlur={()=>setActiveCell(null)}
                        onKeyDown={e=>handleKeyDown(e,rk,"category",()=>saveRow(row))}
                        style={{...inputSt(activeCell?.key===rk&&activeCell?.col==="category",isDirty(row,"category")),cursor:"pointer",fontSize:12}}>
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ borderRight:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:8 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{formatNum(row.total)}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                      {hasDirty && (
                        <button onClick={()=>saveRow(row)} style={{ background:"#2563eb", border:"none", color:"#fff", borderRadius:5, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>저장</button>
                      )}
                      <button className="del-btn" onClick={()=>setDeleteTarget(row)} style={{ background:"#fef2f2", border:"none", color:"#ef4444", borderRadius:5, padding:"3px 8px", fontSize:11, fontWeight:600, cursor:"pointer", opacity:0, transition:"opacity .15s" }}>?</button>
                    </div>
                  </div>
                );
              })}

              {/* 새 입력 행 */}
              <div style={{ background:"#f0fdf4", borderTop:"2px solid #86efac" }}>
                <div style={{ padding:"4px 8px 2px", fontSize:11, color:"#16a34a", fontWeight:700 }}>?? 새 입력</div>
                {newRows.map((nr, idx) => (
                  <div key={nr._key} style={{ display:"grid", gridTemplateColumns:gridTemplate, borderBottom:"1px solid #dcfce7", height:34, alignItems:"stretch", background:"#f0fdf4" }}>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
                      <input type="date" value={nr.date} ref={el=>inputRefs.current[`new_${idx}_date`]=el}
                        onChange={e=>setNewRowVal(idx,"date",e.target.value)}
                        onKeyDown={e=>handleKeyDown(e,`new_${idx}`,"date",null)}
                        style={{...inputSt(false,false),fontSize:12,background:"transparent"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:12, fontWeight:600, color:nr.day?.includes("일")?"#ef4444":nr.day?.includes("토")?"#3b82f6":"#475569" }}>
                        {nr.day?.replace("요일","")}
                      </span>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>new</span>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
                      <input type="text" value={nr.summary} placeholder="내용 입력..." ref={el=>inputRefs.current[`new_${idx}_summary`]=el}
                        onChange={e=>setNewRowVal(idx,"summary",e.target.value)}
                        onKeyDown={e=>handleKeyDown(e,`new_${idx}`,"summary",null)}
                        style={{...inputSt(false,false),background:"transparent"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
                      <input type="number" value={nr.expense_opt} placeholder="0" ref={el=>inputRefs.current[`new_${idx}_expense_opt`]=el}
                        onChange={e=>setNewRowVal(idx,"expense_opt",e.target.value)}
                        onKeyDown={e=>handleKeyDown(e,`new_${idx}`,"expense_opt",null)}
                        style={{...numSt(false,false),color:"#d97706",background:"transparent"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
                      <input type="number" value={nr.expense_req} placeholder="0" ref={el=>inputRefs.current[`new_${idx}_expense_req`]=el}
                        onChange={e=>setNewRowVal(idx,"expense_req",e.target.value)}
                        onKeyDown={e=>handleKeyDown(e,`new_${idx}`,"expense_req",null)}
                        style={{...numSt(false,false),color:"#dc2626",background:"transparent"}}/>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center" }}>
                      <select value={nr.category} ref={el=>inputRefs.current[`new_${idx}_category`]=el}
                        onChange={e=>setNewRowVal(idx,"category",e.target.value)}
                        onKeyDown={e=>handleKeyDown(e,`new_${idx}`,"category",()=>saveNewRow(idx))}
                        style={{...inputSt(false,false),cursor:"pointer",fontSize:12,background:"transparent"}}>
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ borderRight:"1px solid #dcfce7", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#16a34a" }}>
                        {(parseNum(nr.expense_opt)+parseNum(nr.expense_req))>0 ? formatNum(parseNum(nr.expense_opt)+parseNum(nr.expense_req)) : ""}
                      </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                      <button onClick={()=>saveNewRow(idx)} disabled={saving} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:5, padding:"3px 8px", fontSize:11, fontWeight:700, cursor:"pointer", opacity:saving?0.6:1 }}>저장</button>
                      <button onClick={()=>removeNewRow(idx)} style={{ background:"#fee2e2", border:"none", color:"#ef4444", borderRadius:5, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>?</button>
                    </div>
                  </div>
                ))}
                <div style={{ padding:"8px 12px" }}>
                  <button onClick={addNewRow} style={{ background:"none", border:"1.5px dashed #86efac", color:"#16a34a", borderRadius:8, padding:"5px 16px", fontSize:12, fontWeight:600, cursor:"pointer", width:"100%" }}>+ 행 추가</button>
                </div>
              </div>

              {rows.length>0 && (
                <div style={{ display:"grid", gridTemplateColumns:gridTemplate, background:"#1e3a8a", color:"#fff", fontSize:13, fontWeight:800, height:36, alignItems:"center" }}>
                  <div style={{ textAlign:"center", gridColumn:"1/5", fontSize:12 }}>합 계 ({rows.length}건)</div>
                  <div style={{ textAlign:"right", paddingRight:8, color:"#fbbf24" }}>{formatNum(totalOpt)}</div>
                  <div style={{ textAlign:"right", paddingRight:8, color:"#fca5a5" }}>{formatNum(totalReq)}</div>
                  <div></div>
                  <div style={{ textAlign:"right", paddingRight:8 }}>{formatNum(totalAll)}</div>
                  <div></div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#94a3b8" }}>
          ?? 셀 클릭 후 바로 입력 · <b>Enter</b>로 다음 셀 이동 · 수정 후 <b>저장</b> 버튼 · 행에 마우스 올리면 <b>? 삭제</b>
        </div>
      </div>

      {deleteTarget && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px", textAlign:"center", maxWidth:300, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>???</div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>정말 삭제할까요?</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>{deleteTarget.date} · {deleteTarget.summary||deleteTarget.category}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#dc2626", marginBottom:20 }}>{formatNum(deleteTarget.total)}원</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setDeleteTarget(null)} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", color:"#64748b", fontWeight:600, cursor:"pointer" }}>취소</button>
              <button onClick={handleDelete} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"#ef4444", color:"#fff", fontWeight:700, cursor:"pointer" }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
}
