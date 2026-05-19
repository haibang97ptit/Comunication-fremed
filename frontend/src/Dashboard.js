import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import KpiCalendar from './KpiCalendar';
import './Dashboard.css';

const _origin = window.location.origin; // e.g. http://192.168.1.100:3000
const SOCKET_URL = _origin;
const API_URL = `${_origin}/api`;
const SLIDE_INTERVAL = 15000;

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(i%2===0?880:660, ctx.currentTime);
      g.gain.setValueAtTime(.25, ctx.currentTime+i*.3);
      g.gain.exponentialRampToValueAtTime(.01, ctx.currentTime+i*.3+.25);
      o.start(ctx.currentTime+i*.3); o.stop(ctx.currentTime+i*.3+.25);
    }
  } catch(e){}
}

function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Tiếng "ting" 2 nốt ngắn
    [0, 0.15].forEach((delay, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(i === 0 ? 1200 : 1600, ctx.currentTime + delay);
      g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.2);
    });
  } catch(e){}
}

const NOTIF_MESSAGES = {
  'good-news-added': { icon: '📰', text: 'Tin tốt mới', color: '#f59e0b' },
  'monthly-star-updated': { icon: '⭐', text: 'Ngôi sao tháng cập nhật', color: '#ec4899' },
  'announcement-added': { icon: '📢', text: 'Thông báo mới', color: '#8b5cf6' },
  'new-problem': { icon: '🚨', text: 'Sự cố mới', color: '#ef4444' },
  'others-added': { icon: '📋', text: 'Mục khác mới', color: '#10b981' },
  'kpi-updated': { icon: '📊', text: 'KPI cập nhật', color: '#3b82f6' },
  'action-plan-added': { icon: '📊', text: 'Action Plan mới', color: '#3b82f6' },
  'action-plan-updated': { icon: '📊', text: 'Action Plan cập nhật', color: '#3b82f6' },
  'production-plan-updated': { icon: '📋', text: 'Kế hoạch SX cập nhật', color: '#06b6d4' },
  'shift-schedule-updated': { icon: '🕐', text: 'Phân ca cập nhật', color: '#f97316' },
  'coa-added': { icon: '📄', text: 'COA mới ban hành', color: '#8b5cf6' },
};

function fmtDate(d) {
  const days=['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function fmtTime(d) { return d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }

export default function Dashboard() {
  const [slide, setSlide] = useState(1);
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(100);
  const [now, setNow] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState({ kpi:[], actionPlan:[], goodNews:[], monthlyStar:[], announcements:[], productionPlan:null, shiftSchedule:null, problems:[], coa:[], others:[], kpiCalendar:[] });
  const [critAlert, setCritAlert] = useState(null);
  const [pageShake, setPageShake] = useState(false);
  const [flashIds, setFlashIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const socketRef = useRef(null);

  const showNotif = useCallback((eventName, detail) => {
    const cfg = NOTIF_MESSAGES[eventName];
    if (!cfg) return;
    playNotification();
    const id = ++notifIdRef.current;
    const byWho = detail?.created_by || detail?.updated_by || detail?.reported_by || '';
    setNotifications(prev => [...prev, { id, ...cfg, by: byWho ? ` (${byWho})` : '' }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const triggerCritical = useCallback((p) => {
    playAlarm(); setCritAlert(p); setPageShake(true);
    setTimeout(()=>setPageShake(false),1500);
    setFlashIds(prev=>new Set([...prev,p.id]));
    setTimeout(()=>setFlashIds(prev=>{const n=new Set(prev);n.delete(p.id);return n}),4000);
    setTimeout(()=>setCritAlert(prev=>prev?.id===p.id?null:prev),6000);
    setSlide(1);
  },[]);

  // Lock body
  useEffect(()=>{
    const s='overflow:hidden!important;height:100vh!important;width:100vw!important';
    document.documentElement.style.cssText=s;
    document.body.style.cssText=s;
    document.getElementById('root').style.cssText=s;
    return()=>{document.documentElement.style.cssText='';document.body.style.cssText='';document.getElementById('root').style.cssText=''};
  },[]);

  // Fetch
  useEffect(()=>{
    fetch(`${API_URL}/dashboard`).then(r=>r.json()).then(d=>setData(d)).catch(console.error);
  },[]);

  // Socket
  useEffect(()=>{
    const s=io(SOCKET_URL); socketRef.current=s;
    s.on('connect',()=>setConnected(true));
    s.on('disconnect',()=>setConnected(false));
    s.on('kpi-updated',kpi=>{setData(p=>({...p,kpi:p.kpi.find(k=>k.kpi_type===kpi.kpi_type&&k.date===kpi.date)?p.kpi.map(k=>k.kpi_type===kpi.kpi_type&&k.date===kpi.date?kpi:k):[...p.kpi,kpi]}));showNotif('kpi-updated',kpi)});
    s.on('action-plan-added',ap=>{setData(p=>({...p,actionPlan:[ap,...p.actionPlan]}));showNotif('action-plan-added',ap)});
    s.on('action-plan-updated',ap=>{setData(p=>({...p,actionPlan:p.actionPlan.map(a=>a.id===ap.id?ap:a)}));showNotif('action-plan-updated',ap)});
    s.on('action_plan-archived',ap=>setData(p=>({...p,actionPlan:p.actionPlan.filter(a=>a.id!==ap.id)})));
    s.on('good-news-added',n=>{setData(p=>({...p,goodNews:[n,...p.goodNews]}));showNotif('good-news-added',n)});
    s.on('good_news-archived',n=>setData(p=>({...p,goodNews:p.goodNews.filter(x=>x.id!==n.id)})));
    s.on('monthly-star-added',ms=>{setData(p=>({...p,monthlyStar:[ms,...p.monthlyStar]}));showNotif('monthly-star-updated',ms)});
    s.on('monthly_star-archived',ms=>setData(p=>({...p,monthlyStar:p.monthlyStar.filter(x=>x.id!==ms.id)})));
    s.on('announcement-added',a=>{setData(p=>({...p,announcements:[a,...p.announcements]}));showNotif('announcement-added',a)});
    s.on('announcements-archived',a=>setData(p=>({...p,announcements:p.announcements.filter(x=>x.id!==a.id)})));
    s.on('production-plan-updated',pp=>{setData(p=>({...p,productionPlan:pp}));showNotif('production-plan-updated',pp)});
    s.on('shift-schedule-updated',ss=>{setData(p=>({...p,shiftSchedule:ss}));showNotif('shift-schedule-updated',ss)});
    s.on('coa-added',c=>{setData(p=>({...p,coa:[c,...p.coa]}));showNotif('coa-added',c)});
    s.on('coa-updated',c=>{setData(p=>({...p,coa:p.coa.map(x=>x.id===c.id?c:x)}));showNotif('coa-added',c)});
    s.on('release_coa-archived',c=>setData(p=>({...p,coa:p.coa.filter(x=>x.id!==c.id)})));
    s.on('new-problem',pr=>{setData(p=>({...p,problems:[pr,...p.problems]}));if(pr.severity==='critical')triggerCritical(pr);else showNotif('new-problem',pr)});
    s.on('problem-resolved',pr=>setData(p=>({...p,problems:p.problems.filter(x=>x.id!==pr.id)})));
    s.on('problems-archived',pr=>setData(p=>({...p,problems:p.problems.filter(x=>x.id!==pr.id)})));
    s.on('others-added',o=>{setData(p=>({...p,others:[o,...p.others]}));showNotif('others-added',o)});
    s.on('others-archived',o=>setData(p=>({...p,others:p.others.filter(x=>x.id!==o.id)})));
    s.on('kpi-calendar-updated',entry=>{
      setData(p=>({...p,kpiCalendar:
        p.kpiCalendar.find(k=>k.kpi_type===entry.kpi_type&&k.day===entry.day&&k.shift===entry.shift&&k.month===entry.month&&k.year===entry.year)
          ?p.kpiCalendar.map(k=>k.kpi_type===entry.kpi_type&&k.day===entry.day&&k.shift===entry.shift&&k.month===entry.month&&k.year===entry.year?entry:k)
          :[...p.kpiCalendar,entry]
      }));
    });
    s.on('all-archived',()=>setData(p=>({...p,kpi:[],actionPlan:[],goodNews:[],monthlyStar:[],announcements:[],productionPlan:null,shiftSchedule:null,problems:[],coa:[],others:[]})));
    return()=>s.disconnect();
  },[triggerCritical,showNotif]);

  // Clock
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);

  // Auto slide
  useEffect(()=>{
    if (paused) return;
    setCountdown(100);
    const start=Date.now();
    const ci=setInterval(()=>setCountdown(Math.max(0,100-(Date.now()-start)/SLIDE_INTERVAL*100)),100);
    const ti=setTimeout(()=>setSlide(p=>p===1?2:1),SLIDE_INTERVAL);
    return()=>{clearTimeout(ti);clearInterval(ci)};
  },[slide,paused]);

  const {kpi,actionPlan,goodNews,monthlyStar,announcements,productionPlan,shiftSchedule,problems,coa,others,kpiCalendar} = data;
  const BACKEND = SOCKET_URL;

  const DeptTag = ({by}) => {
    if (!by) return null;
    const label = by.toUpperCase();
    const colors = { PD: '#3b82f6', QC: '#f59e0b', QA: '#10b981' };
    return <span className="dept-tag" style={{background: colors[label] || '#8899b8'}}>{label}</span>;
  };

  return (
    <div className={`dashboard-page ${pageShake?'page-shake':''}`}>
      {/* Notification toasts */}
      <div className="notif-stack">
        {notifications.map(n=>(
          <div key={n.id} className="notif-toast" style={{'--notif-color':n.color}}>
            <span className="notif-icon">{n.icon}</span>
            <span className="notif-text">{n.text}{n.by}</span>
          </div>
        ))}
      </div>
      {critAlert&&<div className="crit-overlay"/>}
      {critAlert&&(
        <div className="crit-banner" onClick={()=>setCritAlert(null)}>
          <div className="crit-banner-icon">🚨</div>
          <h2>⚠️ SỰ CỐ NGHIÊM TRỌNG ⚠️</h2>
          <p><strong>{critAlert.department}</strong>: {critAlert.description}</p>
          <div className="dismiss">Click để đóng</div>
        </div>
      )}

      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">PI</div>
          <div className="dash-title">Dashboard</div>
        </div>
        <div className="dash-header-right">
          <button className="pause-btn" onClick={()=>setPaused(p=>!p)} title={paused?'Tiếp tục':'Tạm dừng'}>{paused?'▶':'⏸'}</button>
          <div className="slide-indicators">
            <div className={`s-dot ${slide===1?'active':''}`} onClick={()=>setSlide(1)} style={{cursor:'pointer'}}/>
            <div className={`s-dot ${slide===2?'active':''}`} onClick={()=>setSlide(2)} style={{cursor:'pointer'}}/>
          </div>
          {paused&&<span className="paused-label">TẠM DỪNG</span>}
          <div className="dash-date">{fmtDate(now)}</div>
          <div className="dash-time">{fmtTime(now)}</div>
          <div className={`conn-status ${connected?'on':'off'}`}><div className="conn-dot"/>{connected?'ONLINE':'OFFLINE'}</div>
        </div>
      </div>
      <div className="countdown-bar"><div className="countdown-fill" style={{width:`${countdown}%`}}/></div>

      {/* Slide nav arrows - ẩn, hover mới hiện */}
      <div className="slide-arrow slide-arrow-left" onClick={()=>setSlide(1)}>‹</div>
      <div className="slide-arrow slide-arrow-right" onClick={()=>setSlide(2)}>›</div>

      <div className={`slides-wrap s${slide}`}>
        {/* ===== SLIDE 1: Information ===== */}
        <div className="slide">
          <div className="s1-grid">
            {/* Good News */}
            <div className="card good-news">
              <div className="card-hdr"><div className="card-icon">📰</div><div className="card-title">Tin Tốt / Good News</div></div>
              <div className="card-body">
                {goodNews.length===0?<div className="empty"><div className="empty-icon">📰</div><div className="empty-text">Chưa có tin tốt</div></div>:
                goodNews.map((n,i)=><div key={n.id} className="news-item"><span className="news-idx">{i+1}</span><DeptTag by={n.created_by}/>{n.content}</div>)}
              </div>
            </div>

            {/* Monthly Star */}
            <div className="card monthly-star">
              <div className="card-hdr"><div className="card-icon">⭐</div><div className="card-title">Ngôi Sao Tháng / Monthly Star</div></div>
              <div className="card-body">
                {monthlyStar.length===0?<div className="empty"><div className="empty-icon">⭐</div><div className="empty-text">Chưa có ngôi sao tháng</div></div>:
                monthlyStar.map(ms=>(
                  <div key={ms.id} className="star-item">
                    {ms.employee_image?<img src={ms.employee_image.startsWith('/')?BACKEND+ms.employee_image:ms.employee_image} alt="" className="star-photo"/>:<div className="star-photo-placeholder">👤</div>}
                    <div className="star-info">
                      <div className="star-name">{ms.employee_name||'Chưa có tên'}</div>
                      <div className="star-desc">{ms.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 1 pos 3: Release COA */}
            <div className="card release-coa">
              <div className="card-hdr"><div className="card-icon">📄</div><div className="card-title">Kế Hoạch CoA</div></div>
              <div className="card-body">
                {coa.length===0?<div className="empty"><div className="empty-icon">📄</div><div className="empty-text">Chưa có COA</div></div>:(
                <table className="coa-table">
                  <thead><tr><th>Product</th><th>Batch</th><th>Stage</th><th>Submit CoA</th><th>Approve CoA</th></tr></thead>
                  <tbody>{coa.map(c=>(
                    <tr key={c.id} className={c.approve_coa?'coa-done':''}>
                      <td className="coa-product">{c.product}</td>
                      <td>{c.batch_number}</td>
                      <td>{c.stage}</td>
                      <td className="coa-time">{c.submit_coa||'—'}</td>
                      <td className="coa-time">{c.approve_coa||'—'}</td>
                    </tr>))}</tbody>
                </table>)}
              </div>
            </div>

            {/* Row 2 pos 1: Announcements */}
            <div className="card announcements">
              <div className="card-hdr"><div className="card-icon">📢</div><div className="card-title">Thông Báo / Announce</div></div>
              <div className="card-body">
                {announcements.length===0?<div className="empty"><div className="empty-icon">📢</div><div className="empty-text">Chưa có thông báo</div></div>:
                announcements.map(a=><div key={a.id} className="ann-item"><DeptTag by={a.created_by}/>{a.content}</div>)}
              </div>
            </div>

            {/* Row 2 pos 2: New Problems */}
            <div className="card new-problems">
              <div className="card-hdr"><div className="card-icon">🚨</div><div className="card-title">New Problem</div></div>
              <div className="card-body">
                {problems.length===0?<div className="empty"><div className="empty-icon">✅</div><div className="empty-text">Không có sự cố</div></div>:
                problems.map(p=>(
                  <div key={p.id} className={`prob-item sev-${p.severity} ${flashIds.has(p.id)?'flash':''}`}>
                    <div className="prob-hdr"><span className="prob-dept">{p.department}</span><span className={`prob-badge ${p.severity}`}>{p.severity==='critical'?'🚨 CRITICAL':p.severity.toUpperCase()}</span></div>
                    <div className="prob-desc">{p.description}</div>
                    <div className="prob-meta"><DeptTag by={p.reported_by}/>{p.created_at&&new Date(p.created_at).toLocaleString('vi-VN')}</div>
                  </div>))}
              </div>
            </div>

            {/* Row 2 pos 3: Others */}
            <div className="card others">
              <div className="card-hdr"><div className="card-icon">📋</div><div className="card-title">Khác / Others</div></div>
              <div className="card-body">
                {others.length===0?<div className="empty"><div className="empty-icon">📋</div><div className="empty-text">Chưa có nội dung</div></div>:
                others.map(o=><div key={o.id} className="other-item"><DeptTag by={o.created_by}/>{o.content}</div>)}
              </div>
            </div>
          </div>
        </div>

        {/* ===== SLIDE 2: Production ===== */}
        <div className="slide">
          <div className="s2-grid-v2">
            {/* Daily KPI section with header */}
            <div className="card kpi-section">
              <div className="card-hdr"><div className="card-icon" style={{background:'rgba(59,130,246,.15)',color:'var(--accent-blue)'}}>📊</div><div className="card-title" style={{color:'var(--accent-blue)'}}>Daily KPI</div></div>
              <div className="kpi-row-inner">
                {['safety','quality','delivery','cost'].map(t=>(
                  <div key={t} className={`kpi-card-lg ${t} kpi-calendar-card`}>
                    <KpiCalendar type={t} data={kpiCalendar}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plan - full width with KPI column */}
            <div className="card action-plan-lg">
              <div className="card-hdr"><div className="card-icon">📊</div><div className="card-title">Action Plan</div></div>
              <div className="card-body">
                {actionPlan.length===0?<div className="empty"><div className="empty-icon">📊</div><div className="empty-text">Chưa có action plan</div></div>:(
                <table className="ap-table-lg">
                  <thead><tr><th>Date</th><th>KPI</th><th>Phenomenon</th><th>Rootcause</th><th>Action</th><th>PIC</th><th>Status</th></tr></thead>
                  <tbody>{actionPlan.map(a=>{
                    const kpiCfg={Safety:{color:'#b91c1c',bg:'rgba(185,28,28,.12)'},Quality:{color:'#059669',bg:'rgba(5,150,105,.12)'},Delivery:{color:'#2563eb',bg:'rgba(37,99,235,.12)'},Cost:{color:'#ca8a04',bg:'rgba(202,138,4,.12)'}};
                    const kc=kpiCfg[a.kpi_topic];
                    return(
                    <tr key={a.id}>
                      <td>{a.date&&new Date(a.date).toLocaleDateString('vi-VN')}</td>
                      <td>{kc?<span className="ap-kpi-tag blink" style={{background:kc.bg,color:kc.color,borderColor:kc.color}}>{a.kpi_topic}</span>:'—'}</td>
                      <td>{a.phenomenon}</td><td>{a.rootcause}</td><td>{a.action}</td><td>{a.pic}</td>
                      <td><span className={`ap-status ${a.status==='Open'?'open':'done'}`}>{a.status}</span></td>
                    </tr>)})}</tbody>
                </table>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
