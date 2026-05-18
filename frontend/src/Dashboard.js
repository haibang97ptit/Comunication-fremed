import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
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
  const [data, setData] = useState({ kpi:[], actionPlan:[], goodNews:[], monthlyStar:null, announcements:[], productionPlan:null, shiftSchedule:null, problems:[], coa:[], others:[] });
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
    s.on('monthly-star-updated',ms=>{setData(p=>({...p,monthlyStar:ms}));showNotif('monthly-star-updated',ms)});
    s.on('announcement-added',a=>{setData(p=>({...p,announcements:[a,...p.announcements]}));showNotif('announcement-added',a)});
    s.on('announcements-archived',a=>setData(p=>({...p,announcements:p.announcements.filter(x=>x.id!==a.id)})));
    s.on('production-plan-updated',pp=>{setData(p=>({...p,productionPlan:pp}));showNotif('production-plan-updated',pp)});
    s.on('shift-schedule-updated',ss=>{setData(p=>({...p,shiftSchedule:ss}));showNotif('shift-schedule-updated',ss)});
    s.on('coa-added',c=>{setData(p=>({...p,coa:[c,...p.coa]}));showNotif('coa-added',c)});
    s.on('release_coa-archived',c=>setData(p=>({...p,coa:p.coa.filter(x=>x.id!==c.id)})));
    s.on('new-problem',pr=>{setData(p=>({...p,problems:[pr,...p.problems]}));if(pr.severity==='critical')triggerCritical(pr);else showNotif('new-problem',pr)});
    s.on('problem-resolved',pr=>setData(p=>({...p,problems:p.problems.filter(x=>x.id!==pr.id)})));
    s.on('problems-archived',pr=>setData(p=>({...p,problems:p.problems.filter(x=>x.id!==pr.id)})));
    s.on('others-added',o=>{setData(p=>({...p,others:[o,...p.others]}));showNotif('others-added',o)});
    s.on('others-archived',o=>setData(p=>({...p,others:p.others.filter(x=>x.id!==o.id)})));
    s.on('all-archived',()=>setData(p=>({...p,kpi:[],actionPlan:[],goodNews:[],monthlyStar:null,announcements:[],productionPlan:null,shiftSchedule:null,problems:[],coa:[],others:[]})));
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

  const {kpi,actionPlan,goodNews,monthlyStar,announcements,productionPlan,shiftSchedule,problems,coa,others} = data;
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
          <div><div className="dash-title">Thông Tin Sản Xuất</div><div className="dash-subtitle">Production Information</div></div>
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
            <div className="card monthly-star" style={{gridRow:'1/-1'}}>
              <div className="card-hdr"><div className="card-icon">⭐</div><div className="card-title">Ngôi Sao Tháng / Monthly Star</div></div>
              <div className="card-body">
                {monthlyStar?(
                  <div className="star-content">
                    {monthlyStar.employee_image?<img src={monthlyStar.employee_image.startsWith('/')?BACKEND+monthlyStar.employee_image:monthlyStar.employee_image} alt="" className="star-photo"/>:<div className="star-photo-placeholder">👤</div>}
                    <div className="star-name">{monthlyStar.employee_name||'Chưa có tên'}</div>
                    <div className="star-desc">{monthlyStar.content}</div>
                  </div>
                ):<div className="empty"><div className="empty-icon">⭐</div><div className="empty-text">Chưa có ngôi sao tháng</div></div>}
              </div>
            </div>

            {/* Announcements */}
            <div className="card announcements">
              <div className="card-hdr"><div className="card-icon">📢</div><div className="card-title">Thông Báo / Announce</div></div>
              <div className="card-body">
                {announcements.length===0?<div className="empty"><div className="empty-icon">📢</div><div className="empty-text">Chưa có thông báo</div></div>:
                announcements.map(a=><div key={a.id} className="ann-item"><DeptTag by={a.created_by}/>{a.content}</div>)}
              </div>
            </div>

            {/* New Problems */}
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

            {/* Others */}
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
          <div className="s2-grid">
            {/* KPI column */}
            <div className="kpi-col">
              {['safety','quality','delivery','cost'].map(t=>{
                const k=kpi.find(x=>x.kpi_type===t);
                return(
                  <div key={t} className={`kpi-card ${t}`}>
                    <div className="kpi-lbl"><div className="kpi-badge">{t[0].toUpperCase()}</div><span className="kpi-name">{t}</span></div>
                    <div className="kpi-img">{k?.image_url?<img src={k.image_url.startsWith('/')?BACKEND+k.image_url:k.image_url} alt={t}/>:<span>Chưa có</span>}</div>
                  </div>);
              })}
            </div>

            {/* Action Plan */}
            <div className="card action-plan">
              <div className="card-hdr"><div className="card-icon">📊</div><div className="card-title">Action Plan</div></div>
              <div className="card-body">
                {actionPlan.length===0?<div className="empty"><div className="empty-icon">📊</div><div className="empty-text">Chưa có action plan</div></div>:(
                <table className="ap-table">
                  <thead><tr><th>Date</th><th>Phenomenon</th><th>Rootcause</th><th>Action</th><th>PIC</th><th>Status</th></tr></thead>
                  <tbody>{actionPlan.map(a=>(
                    <tr key={a.id}>
                      <td>{a.date&&new Date(a.date).toLocaleDateString('vi-VN')}</td>
                      <td>{a.phenomenon}</td><td>{a.rootcause}</td><td>{a.action}</td><td>{a.pic}</td>
                      <td><span className={`ap-status ${a.status==='Open'?'open':'done'}`}>{a.status}</span></td>
                    </tr>))}</tbody>
                </table>)}
              </div>
            </div>

            {/* Bottom: Plan + Shift + COA */}
            <div className="s2-bottom" style={{gridColumn:'1/-1'}}>
              <div className="card production-plan">
                <div className="card-hdr"><div className="card-icon">📋</div><div className="card-title">Kế Hoạch SX Tuần</div></div>
                <div className="card-body">
                  {productionPlan?.image_url?<div className="img-placeholder"><img src={productionPlan.image_url.startsWith('/')?BACKEND+productionPlan.image_url:productionPlan.image_url} alt="Plan"/></div>:
                  <div className="img-placeholder"><div className="img-ph-icon">📋</div><span>Chưa có hình</span></div>}
                </div>
              </div>
              <div className="card shift-schedule">
                <div className="card-hdr"><div className="card-icon">🕐</div><div className="card-title">Phân Ca / Shift</div></div>
                <div className="card-body">
                  {shiftSchedule?.image_url?<div className="img-placeholder"><img src={shiftSchedule.image_url.startsWith('/')?BACKEND+shiftSchedule.image_url:shiftSchedule.image_url} alt="Shift"/></div>:
                  <div className="img-placeholder"><div className="img-ph-icon">🕐</div><span>Chưa có hình</span></div>}
                </div>
              </div>
              <div className="card release-coa">
                <div className="card-hdr"><div className="card-icon">📄</div><div className="card-title">Ban Hành COA</div></div>
                <div className="card-body">
                  {coa.length===0?<div className="empty"><div className="empty-icon">📄</div><div className="empty-text">Chưa có COA</div></div>:
                  coa.map(c=><div key={c.id} className="coa-item"><DeptTag by={c.created_by}/>{c.content}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
