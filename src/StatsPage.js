import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const SUPABASE_URL = "https://xmfynndokdelrqodibhi.supabase.co";
const SUPABASE_KEY = "sb_publishable__Oqv33sP_B9ysl08xJ_SNQ_z8MuTwIU";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
};

async function apiGet(params) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/transactions?" + params, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

var MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

var PIE_COLORS = [
  "#2563eb","#16a34a","#dc2626","#d97706","#7c3aed","#0891b2",
  "#be185d","#065f46","#92400e","#1e3a8a","#166534","#991b1b",
  "#6b21a8","#0e7490","#9f1239","#134e4a"
];

function formatNum(n) {
  if (!n && n !== 0) return "0";
  return Number(n).toLocaleString("ko-KR");
}

// 커스텀 툴팁
function CustomTooltip(props) {
  if (!props.active || !props.payload || !props.payload.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:4 }}>{props.label}</div>
      {props.payload.map(function(p, i) {
        return (
          <div key={i} style={{ fontSize:12, color: p.color, marginBottom:2 }}>
            {p.name}: {formatNum(p.value)}원
          </div>
        );
      })}
    </div>
  );
}

// 파이차트 커스텀 라벨
function PieLabel(props) {
  var { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  if (percent < 0.04) return null;
  var RADIAN = Math.PI / 180;
  var radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  var x = cx + radius * Math.cos(-midAngle * RADIAN);
  var y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
}

export default function StatsPage(props) {
  var now = new Date();
  var [year, setYear] = useState(now.getFullYear());
  var [monthlyData, setMonthlyData] = useState([]);
  var [categoryData, setCategoryData] = useState([]);
  var [yearlyTable, setYearlyTable] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");

  useEffect(function() {
    loadStats();
  // eslint-disable-next-line
  }, [year]);

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      // 해당 연도 전체 데이터 조회
      var data = await apiGet(
        "date=gte." + year + "-01-01&date=lte." + year + "-12-31&select=date,expense_opt,expense_req,total,category"
      );

      // 월별 데이터 집계
      var monthly = MONTHS.map(function(m, idx) {
        var mm = String(idx + 1).padStart(2, "0");
        var rows = data.filter(function(r) { return r.date && r.date.startsWith(year + "-" + mm); });
        var opt = rows.reduce(function(s, r) { return s + (r.expense_opt || 0); }, 0);
        var req = rows.reduce(function(s, r) { return s + (r.expense_req || 0); }, 0);
        return { month: m, "지출(선택)": opt, "지출(필수)": req, "합계": opt + req };
      });
      setMonthlyData(monthly);

      // 연간 월별 합계 표
      setYearlyTable(monthly);

      // 카테고리별 집계
      var catMap = {};
      data.forEach(function(r) {
        var cat = r.category || "기타";
        if (!catMap[cat]) catMap[cat] = 0;
        catMap[cat] += (r.total || 0);
      });
      var catArr = Object.keys(catMap)
        .filter(function(k) { return catMap[k] > 0; })
        .map(function(k) { return { name: k, value: catMap[k] }; })
        .sort(function(a, b) { return b.value - a.value; });
      setCategoryData(catArr);

    } catch(e) {
      setError("데이터 로드 실패: " + e.message);
    }
    setLoading(false);
  }

  var totalOpt = monthlyData.reduce(function(s, r) { return s + r["지출(선택)"]; }, 0);
  var totalReq = monthlyData.reduce(function(s, r) { return s + r["지출(필수)"]; }, 0);
  var totalAll = totalOpt + totalReq;

  return (
    <div style={{ minHeight:"100vh", background:"#e8edf2", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif" }}>

      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"#fff", padding:"14px 16px", boxShadow:"0 2px 12px rgba(37,99,235,0.4)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20, fontWeight:900 }}>지출 통계</span>
            {/* 년도 선택 */}
            <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"2px" }}>
              <button onClick={function(){ setYear(function(y){ return y-1; }); }}
                style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"4px 12px", borderRadius:10 }}>{"<"}</button>
              <span style={{ fontSize:16, fontWeight:800, minWidth:60, textAlign:"center" }}>{year}년</span>
              <button onClick={function(){ setYear(function(y){ return y+1; }); }}
                style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"4px 12px", borderRadius:10 }}>{">"}</button>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            {/* 연간 합계 */}
            <div style={{ display:"flex", gap:16, fontSize:13 }}>
              <span>선택 <b style={{ color:"#fbbf24" }}>{formatNum(totalOpt)}원</b></span>
              <span>필수 <b style={{ color:"#fca5a5" }}>{formatNum(totalReq)}원</b></span>
              <span>합계 <b style={{ color:"#fff", fontSize:15 }}>{formatNum(totalAll)}원</b></span>
            </div>
            {/* 가계부로 이동 */}
            <button onClick={props.onBack}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              가계부
            </button>
            {/* 로그아웃 */}
            <button onClick={props.onLogout}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"16px auto", padding:"0 12px" }}>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"12px 16px", color:"#dc2626", marginBottom:16 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#94a3b8", fontSize:16 }}>데이터를 불러오는 중...</div>
        ) : (
          <div>

            {/* 1. 월별 지출 추이 막대 그래프 */}
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.08)", padding:"20px 16px", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#1e3a8a", marginBottom:16 }}>월별 지출 추이</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top:5, right:20, left:20, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize:12 }} />
                  <YAxis tickFormatter={function(v){ return (v/10000) + "만"; }} tick={{ fontSize:11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Bar dataKey="지출(선택)" fill="#d97706" radius={[4,4,0,0]} />
                  <Bar dataKey="지출(필수)" fill="#dc2626" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. 카테고리별 파이 차트 + 목록 */}
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.08)", padding:"20px 16px", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#1e3a8a", marginBottom:16 }}>카테고리별 지출 비율</div>
              {categoryData.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>데이터가 없습니다.</div>
              ) : (
                <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"center" }}>
                  {/* 파이 차트 */}
                  <div style={{ flex:"0 0 auto" }}>
                    <PieChart width={300} height={300}>
                      <Pie data={categoryData} cx={150} cy={150} outerRadius={130}
                        dataKey="value" labelLine={false} label={PieLabel}>
                        {categoryData.map(function(_, idx) {
                          return <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={function(v){ return formatNum(v) + "원"; }} />
                    </PieChart>
                  </div>
                  {/* 카테고리 목록 */}
                  <div style={{ flex:1, minWidth:200 }}>
                    {categoryData.map(function(cat, idx) {
                      var pct = totalAll > 0 ? ((cat.value / totalAll) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                          <div style={{ width:12, height:12, borderRadius:3, background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink:0 }}></div>
                          <span style={{ fontSize:12, color:"#475569", minWidth:60 }}>{cat.name}</span>
                          <div style={{ flex:1, background:"#f1f5f9", borderRadius:4, height:8, overflow:"hidden" }}>
                            <div style={{ width: pct + "%", background: PIE_COLORS[idx % PIE_COLORS.length], height:"100%", borderRadius:4 }}></div>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:"#1e293b", minWidth:80, textAlign:"right" }}>{formatNum(cat.value)}원</span>
                          <span style={{ fontSize:11, color:"#94a3b8", minWidth:36 }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. 연간 월별 합계 표 */}
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 16px rgba(0,0,0,0.08)", padding:"20px 16px", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#1e3a8a", marginBottom:16 }}>{year}년 월별 합계</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr style={{ background:"#1e3a8a", color:"#fff" }}>
                      <th style={{ padding:"10px 12px", textAlign:"center", fontWeight:700 }}>월</th>
                      <th style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>지출(선택)</th>
                      <th style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>지출(필수)</th>
                      <th style={{ padding:"10px 12px", textAlign:"right", fontWeight:700 }}>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyTable.map(function(row, idx) {
                      var isEven = idx % 2 === 0;
                      var hasData = row["합계"] > 0;
                      return (
                        <tr key={idx} style={{ background: isEven ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding:"9px 12px", textAlign:"center", fontWeight:600, color:"#1e3a8a" }}>{row.month}</td>
                          <td style={{ padding:"9px 12px", textAlign:"right", color: hasData ? "#d97706" : "#94a3b8" }}>
                            {hasData ? formatNum(row["지출(선택)"]) : "-"}
                          </td>
                          <td style={{ padding:"9px 12px", textAlign:"right", color: hasData ? "#dc2626" : "#94a3b8" }}>
                            {hasData ? formatNum(row["지출(필수)"]) : "-"}
                          </td>
                          <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:700, color: hasData ? "#1e293b" : "#94a3b8" }}>
                            {hasData ? formatNum(row["합계"]) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* 합계 행 */}
                  <tfoot>
                    <tr style={{ background:"#1e3a8a", color:"#fff", fontWeight:800 }}>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>합계</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"#fbbf24" }}>{formatNum(totalOpt)}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"#fca5a5" }}>{formatNum(totalReq)}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right" }}>{formatNum(totalAll)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
