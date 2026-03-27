import { useState } from "react";

const SUPABASE_URL = "https://xmfynndokdelrqodibhi.supabase.co";
const SUPABASE_KEY = "sb_publishable__Oqv33sP_B9ysl08xJ_SNQ_z8MuTwIU";

async function apiLogin(email, password) {
  var res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify({ email: email, password: password }),
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "로그인 실패");
  return data;
}

export default function LoginPage(props) {
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    setError("");
    try {
      var data = await apiLogin(email, password);
      props.onLogin(data);
    } catch(err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#1e3a8a,#2563eb)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif"
    }}>
      <div style={{
        background:"#fff", borderRadius:24, padding:"48px 40px",
        width:"100%", maxWidth:380,
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* 제목 */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:28, fontWeight:900, color:"#1e3a8a", marginBottom:6 }}>가계부</div>
          <div style={{ fontSize:13, color:"#94a3b8" }}>로그인 후 이용하실 수 있습니다</div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div style={{
            background:"#fef2f2", border:"1px solid #fecaca",
            borderRadius:10, padding:"10px 14px",
            fontSize:13, color:"#dc2626", marginBottom:16
          }}>{error}</div>
        )}

        {/* 이메일 입력 */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>이메일</div>
          <input
            type="email" value={email} placeholder="이메일 입력"
            onChange={function(e){ setEmail(e.target.value); }}
            onKeyDown={function(e){ if(e.key==="Enter") handleLogin(e); }}
            onFocus={function(e){ e.target.style.border="1.5px solid #2563eb"; }}
            onBlur={function(e){ e.target.style.border="1.5px solid #e2e8f0"; }}
            style={{
              width:"100%", padding:"12px 14px", borderRadius:10,
              border:"1.5px solid #e2e8f0", fontSize:14,
              outline:"none", boxSizing:"border-box"
            }}
          />
        </div>

        {/* 비밀번호 입력 */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>비밀번호</div>
          <input
            type="password" value={password} placeholder="비밀번호 입력"
            onChange={function(e){ setPassword(e.target.value); }}
            onKeyDown={function(e){ if(e.key==="Enter") handleLogin(e); }}
            onFocus={function(e){ e.target.style.border="1.5px solid #2563eb"; }}
            onBlur={function(e){ e.target.style.border="1.5px solid #e2e8f0"; }}
            style={{
              width:"100%", padding:"12px 14px", borderRadius:10,
              border:"1.5px solid #e2e8f0", fontSize:14,
              outline:"none", boxSizing:"border-box"
            }}
          />
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin} disabled={loading}
          style={{
            width:"100%", padding:"14px 0", borderRadius:12, border:"none",
            background: loading ? "#93c5fd" : "linear-gradient(135deg,#1e3a8a,#2563eb)",
            color:"#fff", fontSize:15, fontWeight:700,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow:"0 4px 12px rgba(37,99,235,0.4)",
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </div>
  );
}
