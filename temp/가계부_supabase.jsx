import { useState, useEffect, useRef } from "react";

// ─── Supabase 설정 ───────────────────────────────────────────────────
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
    method: "POST", headers,
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiUpdate(date, id, row) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/transactions?date=eq.${date}&id=eq.${id}`,
    { method: "PATCH", headers, body: JSON.stringify(row) }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(date, id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/transactions?date=eq.${date}&id=eq.${id}`,
    { method: "DELETE", headers }
  );
  if (!res.ok) throw new Error(await res.text());
}
// ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "회비","골프","쿠팡","관리비","자동차","경조사","의류비","주유","기타","멤버십",
  "선물","외식","세금","회식","보험료","주차비","당구","물건","간식","점심",
  "교통비","이발","커피","로또","마트","의료비","도서비","세차","통신비"
];

const DAYS = ["일","월","화","수","목","금","토"];

function getDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return DAYS[d.getDay()] + "요일";
}

function formatNum(n) {
  if (!n && n !== 0) return "";
  return Number(n).toLocaleString("ko-KR");
}

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position:"fixed", bottom:30, left:"50%", transform:"translateX(-50%)",
      background: type==="error" ? "#ef4444" : "#22c55e",
      color:"#fff", padding:"10px 24px", borderRadius:30,
      fontSize:13, fontWeight:600, zIndex:9999,
      boxShadow:"0 4px 20px rgba(0,0,0,0.3)", whiteSpace:"nowrap",
      animation:"fadeUp .25s ease",
    }}>{msg}</div>
  );
}

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    date: now.toISOString().slice(0,10),
    day: getDay(now.toISOString().slice(0,10)),
    summary: "",
    expense_opt: "",
    expense_req: "",
    category: "기타",
  });

  const ym = `${year}-${String(month+1).padStart(2,"0")}`;

  // 데이터 로드
  async function loadData() {
    setLoading(true);
    try {
      const data = await apiGet(`date=gte.${ym}-01&date=lte.${ym}-31`);
      setRows(data);
    } catch(e) {
      showToast("데이터 로드 실패: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [year, month]);

  function showToast(msg, type="success") { setToast({ msg, type }); }

  function prevMonth() {
    if (month===0) { setMonth(11); setYear(y=>y-1); }
    else setMonth(m=>m-1);
  }
  function nextMonth() {
    if (month===11) { setMonth(0); setYear(y=>y+1); }
    else setMonth(m=>m+1);
  }

  function openAdd() {
    setEditRow(null);
    const today = now.toISOString().slice(0,10);
    setForm({ date: today, day: getDay(today), summary:"", expense_opt:"", expense_req:"", category:"기타" });
    setShowModal(true);
  }

  function openEdit(row) {
    setEditRow(row);
    setForm({
      date: row.date,
      day: row.day,
      summary: row.summary || "",
      expense_opt: row.expense_opt || "",
      expense_req: row.expense_req || "",
      category: row.category || "기타",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.date) { showToast("날짜를 입력해주세요", "error"); return; }
    if (!form.expense_opt && !form.expense_req) { showToast("지출금액을 입력해주세요", "error"); return; }

    const payload = {
      date: form.date,
      day: form.day || getDay(form.date),
      summary: form.summary,
      expense_opt: Number(form.expense_opt) || 0,
      expense_req: Number(form.expense_req) || 0,
      category: form.category,
    };

    try {
      if (editRow) {
        await apiUpdate(editRow.date, editRow.id, payload);
        showToast("✅ 수정되었습니다");
      } else {
        await apiInsert(payload);
        showToast("✅ 추가되었습니다");
      }
      setShowModal(false);
      loadData();
    } catch(e) {
      showToast("저장 실패: " + e.message, "error");
    }
  }

  async function handleDelete() {
    try {
      await apiDelete(deleteTarget.date, deleteTarget.id);
      showToast("🗑️ 삭제되었습니다");
      setDeleteTarget(null);
      loadData();
    } catch(e) {
      showToast("삭제 실패: " + e.message, "error");
    }
  }

  // 합계
  const totalOpt = rows.reduce((s,r)=>s+(r.expense_opt||0),0);
  const totalReq = rows.reduce((s,r)=>s+(r.expense_req||0),0);
  const totalAll = rows.reduce((s,r)=>s+(r.total||0),0);

  return (
    <div style={{
      minHeight:"100vh",
      background:"#f0f4f8",
      fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif",
      color:"#1e293b",
    }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid #3b82f6 !important; }
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#f1f5f9} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      `}</style>

      {/* 헤더 */}
      <div style={{
        background:"linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)",
        color:"#fff", padding:"20px 20px 0",
        boxShadow:"0 4px 20px rgba(59,130,246,0.4)",
        position:"sticky", top:0, zIndex:10,
      }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:24, fontWeight:900, letterSpacing:"-1px" }}>📒 가계부</span>
              <span style={{
                fontSize:10, background:"rgba(255,255,255,0.2)",
                border:"1px solid rgba(255,255,255,0.4)",
                borderRadius:20, padding:"2px 8px", fontWeight:600,
              }}>Supabase DB</span>
            </div>
            <button onClick={openAdd} style={{
              background:"#fff", color:"#1e40af",
              border:"none", borderRadius:20, padding:"8px 20px",
              fontWeight:800, fontSize:14, cursor:"pointer",
              boxShadow:"0 2px 10px rgba(0,0,0,0.15)",
              transition:"transform .1s",
            }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.96)"}
               onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>
              + 추가
            </button>
          </div>

          {/* 월 네비게이션 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:16 }}>
            <button onClick={prevMonth} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:18, cursor:"pointer", borderRadius:8, padding:"4px 12px" }}>‹</button>
            <span style={{ fontSize:20, fontWeight:800, minWidth:120, textAlign:"center" }}>{year}년 {MONTHS[month]}</span>
            <button onClick={nextMonth} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:18, cursor:"pointer", borderRadius:8, padding:"4px 12px" }}>›</button>
          </div>

          {/* 요약 카드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"지출(선택)", value:totalOpt, color:"#fbbf24" },
              { label:"지출(필수)", value:totalReq, color:"#f87171" },
              { label:"합계", value:totalAll, color:"#fff" },
            ].map(c=>(
              <div key={c.label} style={{
                background:"rgba(255,255,255,0.15)",
                borderRadius:12, padding:"12px 10px", textAlign:"center",
                backdropFilter:"blur(10px)",
              }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>{c.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:c.color }}>
                  {formatNum(c.value)}<span style={{ fontSize:10 }}>원</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ maxWidth:900, margin:"20px auto", padding:"0 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>
            <div style={{ fontSize:36, marginBottom:12, animation:"fadeIn 1s infinite alternate" }}>⏳</div>
            <div>데이터를 불러오는 중...</div>
          </div>
        ) : (
          <div style={{
            background:"#fff", borderRadius:20,
            boxShadow:"0 4px 24px rgba(0,0,0,0.08)",
            overflow:"hidden",
          }}>
            {/* 테이블 헤더 */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"90px 60px 60px 1fr 110px 110px 90px 110px 80px",
              background:"#1e40af", color:"#fff",
              fontSize:12, fontWeight:700,
              padding:"12px 16px",
            }}>
              {["날짜","요일","ID","적요","지출(선택)","지출(필수)","구분","계",""].map((h,i)=>(
                <div key={i} style={{ textAlign: i>=4&&i<=7 ? "right" : "center", paddingRight: i>=4&&i<=7 ? 8 : 0 }}>{h}</div>
              ))}
            </div>

            {/* 데이터 행 */}
            {rows.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
                <div style={{ fontSize:14 }}>이번 달 내역이 없어요</div>
                <div style={{ fontSize:12, marginTop:4 }}>+ 추가 버튼을 눌러 기록해보세요</div>
              </div>
            ) : rows.map((row, idx) => (
              <div key={`${row.date}-${row.id}`} style={{
                display:"grid",
                gridTemplateColumns:"90px 60px 60px 1fr 110px 110px 90px 110px 80px",
                padding:"11px 16px",
                background: idx%2===0 ? "#fff" : "#f8fafc",
                borderBottom:"1px solid #f1f5f9",
                fontSize:13, alignItems:"center",
                transition:"background .15s",
              }}
                onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?"#fff":"#f8fafc"}
              >
                <div style={{ textAlign:"center", color:"#475569" }}>{row.date?.slice(5)}</div>
                <div style={{ textAlign:"center", color:
                  row.day?.includes("일")?"#ef4444":
                  row.day?.includes("토")?"#3b82f6":"#475569",
                  fontWeight:600,
                }}>{row.day?.replace("요일","")}</div>
                <div style={{ textAlign:"center", color:"#94a3b8", fontSize:11 }}>{row.id}</div>
                <div style={{ color:"#1e293b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>{row.summary}</div>
                <div style={{ textAlign:"right", paddingRight:8, color:"#d97706", fontWeight:600 }}>
                  {row.expense_opt ? formatNum(row.expense_opt) : ""}
                </div>
                <div style={{ textAlign:"right", paddingRight:8, color:"#dc2626", fontWeight:600 }}>
                  {row.expense_req ? formatNum(row.expense_req) : ""}
                </div>
                <div style={{ textAlign:"center" }}>
                  <span style={{
                    background:"#eff6ff", color:"#1d4ed8",
                    borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600,
                  }}>{row.category}</span>
                </div>
                <div style={{ textAlign:"right", paddingRight:8, color:"#1e293b", fontWeight:800 }}>
                  {formatNum(row.total)}
                </div>
                <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                  <button onClick={()=>openEdit(row)} style={{
                    background:"#eff6ff", border:"none", color:"#1d4ed8",
                    borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer",
                  }}>수정</button>
                  <button onClick={()=>setDeleteTarget(row)} style={{
                    background:"#fef2f2", border:"none", color:"#ef4444",
                    borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer",
                  }}>삭제</button>
                </div>
              </div>
            ))}

            {/* 합계 행 */}
            {rows.length > 0 && (
              <div style={{
                display:"grid",
                gridTemplateColumns:"90px 60px 60px 1fr 110px 110px 90px 110px 80px",
                padding:"12px 16px",
                background:"#1e40af", color:"#fff",
                fontSize:13, fontWeight:800, alignItems:"center",
              }}>
                <div style={{ textAlign:"center", gridColumn:"1/5" }}>합 계</div>
                <div style={{ textAlign:"right", paddingRight:8, color:"#fbbf24" }}>{formatNum(totalOpt)}</div>
                <div style={{ textAlign:"right", paddingRight:8, color:"#fca5a5" }}>{formatNum(totalReq)}</div>
                <div></div>
                <div style={{ textAlign:"right", paddingRight:8 }}>{formatNum(totalAll)}</div>
                <div></div>
              </div>
            )}
          </div>
        )}

        {/* 건수 표시 */}
        {!loading && rows.length > 0 && (
          <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:"#94a3b8" }}>
            총 {rows.length}건 · Supabase PostgreSQL 연동
          </div>
        )}
      </div>

      {/* 입력/수정 모달 */}
      {showModal && (
        <div style={{
          position:"fixed", inset:0, zIndex:100,
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"flex-end", justifyContent:"center",
        }} onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div style={{
            background:"#fff", borderRadius:"24px 24px 0 0",
            padding:"28px 24px 40px",
            width:"100%", maxWidth:520,
            animation:"slideUp .3s cubic-bezier(.4,0,.2,1)",
          }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:24, color:"#1e293b" }}>
              {editRow ? "✏️ 내역 수정" : "➕ 내역 추가"}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {/* 날짜 */}
              <div style={{ gridColumn:"1/2" }}>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>날짜</label>
                <input type="date" value={form.date}
                  onChange={e=>setForm(f=>({...f, date:e.target.value, day:getDay(e.target.value)}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14, color:"#1e293b" }}/>
              </div>

              {/* 요일 */}
              <div>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>요일 (자동)</label>
                <input type="text" value={form.day || getDay(form.date)} readOnly
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14, color:"#94a3b8", background:"#f8fafc" }}/>
              </div>

              {/* 적요 */}
              <div style={{ gridColumn:"1/3" }}>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>적요</label>
                <input type="text" placeholder="내용을 입력하세요" value={form.summary}
                  onChange={e=>setForm(f=>({...f,summary:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14 }}/>
              </div>

              {/* 지출(선택) */}
              <div>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>지출 (선택)</label>
                <input type="number" placeholder="0" value={form.expense_opt}
                  onChange={e=>setForm(f=>({...f,expense_opt:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14 }}/>
                {form.expense_opt>0 && <div style={{ fontSize:11, color:"#d97706", marginTop:3 }}>{Number(form.expense_opt).toLocaleString()}원</div>}
              </div>

              {/* 지출(필수) */}
              <div>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>지출 (필수)</label>
                <input type="number" placeholder="0" value={form.expense_req}
                  onChange={e=>setForm(f=>({...f,expense_req:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14 }}/>
                {form.expense_req>0 && <div style={{ fontSize:11, color:"#dc2626", marginTop:3 }}>{Number(form.expense_req).toLocaleString()}원</div>}
              </div>

              {/* 구분 */}
              <div style={{ gridColumn:"1/3" }}>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>구분</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", fontSize:14, color:"#1e293b", background:"#fff" }}>
                  {CATEGORIES.map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 계 (자동) */}
              <div style={{ gridColumn:"1/3" }}>
                <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>계 (자동계산)</label>
                <div style={{
                  padding:"10px 12px", borderRadius:10,
                  background:"#f0f9ff", border:"1.5px solid #bae6fd",
                  fontSize:16, fontWeight:800, color:"#1e40af",
                }}>
                  {formatNum((Number(form.expense_opt)||0)+(Number(form.expense_req)||0))}원
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button onClick={()=>setShowModal(false)} style={{
                flex:1, padding:"14px 0", borderRadius:12,
                border:"1.5px solid #e2e8f0", background:"#fff",
                color:"#64748b", fontWeight:600, fontSize:15, cursor:"pointer",
              }}>취소</button>
              <button onClick={handleSave} style={{
                flex:2, padding:"14px 0", borderRadius:12, border:"none",
                background:"linear-gradient(135deg,#1e40af,#3b82f6)",
                color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer",
                boxShadow:"0 4px 15px rgba(59,130,246,0.4)",
              }}>{editRow?"수정완료":"추가하기"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div style={{
          position:"fixed", inset:0, zIndex:200,
          background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"#fff", borderRadius:24, padding:"32px 28px",
            textAlign:"center", maxWidth:320, width:"90%",
            boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>정말 삭제할까요?</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:6 }}>
              {deleteTarget.date} · {deleteTarget.summary || deleteTarget.category}
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:"#dc2626", marginBottom:24 }}>
              {formatNum(deleteTarget.total)}원
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setDeleteTarget(null)} style={{
                flex:1, padding:"12px 0", borderRadius:12,
                border:"1.5px solid #e2e8f0", background:"#fff",
                color:"#64748b", fontWeight:600, cursor:"pointer",
              }}>취소</button>
              <button onClick={handleDelete} style={{
                flex:1, padding:"12px 0", borderRadius:12, border:"none",
                background:"#ef4444", color:"#fff", fontWeight:700, cursor:"pointer",
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
}
