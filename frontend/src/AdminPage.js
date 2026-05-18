import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import './Admin.css';

const API = `${window.location.origin}/api`;
const BACKEND = window.location.origin;
const ROLE_LABELS = { pd: 'Phòng PD (Production)', qc: 'Phòng QC (Quality Control)', qa: 'Phòng QA (Quality Assurance)' };

// Toast
function Toast({message,type,onClose}){useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose]);return<div className={`toast ${type}`}>{message}</div>}

// File Upload
function FileUpload({value,onChange}){
  const ref=useRef(null);const[preview,setPreview]=useState(value||null);
  useEffect(()=>setPreview(value||null),[value]);
  const handle=async(e)=>{const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append('image',f);
    try{const r=await fetch(`${API}/upload`,{method:'POST',body:fd});const d=await r.json();const url=`${BACKEND}${d.url}`;setPreview(url);onChange(url)}catch(e){console.error(e)}};
  const remove=(e)=>{e.stopPropagation();setPreview(null);onChange(null);if(ref.current)ref.current.value=''};
  return(<div className={`f-upload ${preview?'has':''}`} onClick={()=>!preview&&ref.current?.click()}>
    <input ref={ref} type="file" accept="image/*" onChange={handle}/>
    {preview?<><img src={preview} alt="" className="f-preview"/><button className="f-remove" onClick={remove}>✕</button></>:
    <><div className="f-upload-icon">📁</div><div className="f-upload-text"><strong>Click chọn ảnh</strong><br/>hoặc kéo thả</div></>}
  </div>);
}

// Section
function Sec({icon,bg,color,title,children,open:defOpen=false}){
  const[open,setOpen]=useState(defOpen);
  return(<div className="adm-section"><div className="adm-section-hdr" onClick={()=>setOpen(!open)}>
    <div className="adm-section-icon" style={{background:bg,color}}>{icon}</div>
    <div className="adm-section-title" style={{color}}>{title}</div>
    <div className={`adm-section-toggle ${open?'open':''}`}>▼</div>
  </div>{open&&<div className="adm-section-body">{children}</div>}</div>);
}

export default function AdminPage({role}){
  const[authed,setAuthed]=useState(false);
  const[pw,setPw]=useState('');
  const[err,setErr]=useState('');
  const[toast,setToast]=useState(null);
  const show=useCallback((m,t='success')=>setToast({message:m,type:t}),[]);

  // Data
  const[goodNews,setGoodNews]=useState([]);
  const[announcements,setAnnouncements]=useState([]);
  const[problems,setProblems]=useState([]);
  const[others,setOthers]=useState([]);
  const[monthlyStar,setMonthlyStar]=useState(null);
  const[kpiForms,setKpiForms]=useState({safety:{image_url:null},quality:{image_url:null},delivery:{image_url:null},cost:{image_url:null}});
  const[actionPlans,setActionPlans]=useState([]);
  const[coa,setCoa]=useState([]);
  const[planForm,setPlanForm]=useState({image_url:null,notes:''});
  const[shiftForm,setShiftForm]=useState({image_url:null,notes:''});
  const[qualityCal,setQualityCal]=useState([]);

  // Forms
  const[newGoodNews,setNewGoodNews]=useState('');
  const[newAnn,setNewAnn]=useState('');
  const[newOther,setNewOther]=useState('');
  const[starForm,setStarForm]=useState({employee_name:'',employee_image:null,content:''});
  const[probForm,setProbForm]=useState({department:'',description:'',severity:'info'});
  const[apForm,setApForm]=useState({date:'',phenomenon:'',rootcause:'',action:'',pic:'',status:'Open'});
  const[coaForm,setCoaForm]=useState({product:'',batch_number:'',stage:'Granulation',submit_coa:'',approve_coa:''});

  // Force scroll
  useEffect(()=>{if(!authed)return;/*no-op*/},[authed]);

  // Login
  const login=async()=>{
    try{const r=await fetch(`${API}/auth`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,password:pw})});
      if(r.ok){setAuthed(true);setErr('')}else{setErr('Sai mật khẩu')}}catch(e){setErr('Lỗi kết nối')}};

  // Fetch data after auth
  useEffect(()=>{if(!authed)return;
    fetch(`${API}/dashboard`).then(r=>r.json()).then(d=>{
      setGoodNews(d.goodNews||[]);setAnnouncements(d.announcements||[]);setProblems(d.problems||[]);
      setOthers(d.others||[]);setMonthlyStar(d.monthlyStar);setActionPlans(d.actionPlan||[]);setCoa(d.coa||[]);
      if(d.productionPlan)setPlanForm({image_url:d.productionPlan.image_url,notes:d.productionPlan.notes||''});
      if(d.shiftSchedule)setShiftForm({image_url:d.shiftSchedule.image_url,notes:d.shiftSchedule.notes||''});
      if(d.monthlyStar)setStarForm({employee_name:d.monthlyStar.employee_name||'',employee_image:d.monthlyStar.employee_image,content:d.monthlyStar.content||''});
      (d.kpi||[]).forEach(k=>setKpiForms(p=>({...p,[k.kpi_type]:{image_url:k.image_url}})));
      if(d.kpiCalendar) setQualityCal(d.kpiCalendar.filter(x=>x.kpi_type==='quality'));
    }).catch(console.error);
  },[authed]);

  // Helpers
  const post=async(url,body)=>{const r=await fetch(`${API}${url}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json()};
  const put=async(url,body)=>{const r=await fetch(`${API}${url}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json()};
  const archive=async(url,id,list,setList,label)=>{await put(`${url}/${id}/archive`);setList(list.filter(x=>x.id!==id));show(`Đã lưu trữ ${label}`)};

  // Submits
  const submitGoodNews=async()=>{if(!newGoodNews.trim())return;const n=await post('/good-news',{content:newGoodNews,created_by:role.toUpperCase()});setGoodNews(p=>[n,...p]);setNewGoodNews('');show('Đã thêm tin tốt')};
  const submitAnn=async()=>{if(!newAnn.trim())return;const a=await post('/announcements',{content:newAnn,created_by:role.toUpperCase()});setAnnouncements(p=>[a,...p]);setNewAnn('');show('Đã thêm thông báo')};
  const submitOther=async()=>{if(!newOther.trim())return;const o=await post('/others',{content:newOther,created_by:role.toUpperCase()});setOthers(p=>[o,...p]);setNewOther('');show('Đã thêm mục khác')};
  const submitStar=async()=>{if(!starForm.content.trim())return;const s=await put('/monthly-star',{...starForm,created_by:role.toUpperCase()});setMonthlyStar(s);show('Đã cập nhật ngôi sao tháng')};
  const submitProblem=async()=>{if(!probForm.department||!probForm.description)return;const p=await post('/problems',{...probForm,reported_by:role.toUpperCase()});setProblems(prev=>[p,...prev]);setProbForm({department:'',description:'',severity:'info'});show('Đã báo cáo sự cố')};
  const resolveProblem=async(id)=>{await put(`/problems/${id}/resolve`);setProblems(p=>p.filter(x=>x.id!==id));show('Đã xử lý sự cố')};
  const submitKpi=async(type)=>{await put(`/kpi/${type}`,{image_url:kpiForms[type].image_url,updated_by:role.toUpperCase()});show(`Đã cập nhật ${type.toUpperCase()}`)};
  const toggleQualityCal=async(day,shift,currentPassed)=>{
    const now=new Date();const m=now.getMonth()+1;const y=now.getFullYear();
    // Cycle: null → true (đạt) → false (không đạt) → null (xóa/reset)
    let newVal;
    if(currentPassed===undefined||currentPassed===null) newVal=true;
    else if(currentPassed===true) newVal=false;
    else newVal=null;
    const r=await put('/kpi-calendar/quality',{day,shift,passed:newVal,month:m,year:y,updated_by:role.toUpperCase()});
    setQualityCal(prev=>{
      const exists=prev.find(x=>x.day===day&&x.shift===shift);
      if(exists) return prev.map(x=>x.day===day&&x.shift===shift?{...x,passed:newVal}:x);
      return[...prev,{...r,kpi_type:'quality',day,shift,month:m,year:y,passed:newVal}];
    });
  };
  const submitAp=async()=>{if(!apForm.phenomenon)return;const a=await post('/action-plan',{...apForm,created_by:role.toUpperCase()});setActionPlans(p=>[a,...p]);setApForm({date:'',phenomenon:'',rootcause:'',action:'',pic:'',status:'Open'});show('Đã thêm Action Plan')};
  const submitCoa=async()=>{if(!coaForm.product.trim()||!coaForm.batch_number.trim())return;const c=await post('/coa',{...coaForm,created_by:role.toUpperCase()});setCoa(p=>[c,...p]);setCoaForm({product:'',batch_number:'',stage:'Granulation',submit_coa:'',approve_coa:''});show('Đã thêm COA')};
  const submitPlan=async()=>{const t=new Date(),ws=new Date(t);ws.setDate(t.getDate()-t.getDay()+1);const we=new Date(ws);we.setDate(ws.getDate()+6);
    await put('/production-plan',{week_start:ws.toISOString().split('T')[0],week_end:we.toISOString().split('T')[0],image_url:planForm.image_url,notes:planForm.notes,updated_by:role.toUpperCase()});show('Đã cập nhật kế hoạch SX')};
  const submitShift=async()=>{await put('/shift-schedule',{image_url:shiftForm.image_url,notes:shiftForm.notes,updated_by:role.toUpperCase()});show('Đã cập nhật phân ca')};
  const archiveAll=async()=>{if(!window.confirm('Xác nhận lưu trữ TẤT CẢ nội dung hiện tại?'))return;await post('/archive-all',{});
    setGoodNews([]);setAnnouncements([]);setProblems([]);setOthers([]);setActionPlans([]);setCoa([]);show('Đã lưu trữ tất cả')};

  const isPD=role==='pd';

  // LOGIN SCREEN
  if(!authed){
    return(<div className="login-page"><div className="login-box">
      <h2>🔐 Đăng Nhập</h2>
      <div className="login-role">{ROLE_LABELS[role]||role}</div>
      <input className="login-input" type="password" placeholder="Nhập mật khẩu..." value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
      <button className="login-btn" onClick={login}>Đăng Nhập</button>
      {err&&<div className="login-err">{err}</div>}
    </div></div>);
  }

  // ADMIN PAGE
  return(
    <div className="admin-page" style={{position:'fixed',top:0,left:0,right:0,bottom:0,overflowY:'scroll',zIndex:99999,background:'var(--bg-primary)'}}>
      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
      <div className="admin-hdr">
        <div className="admin-hdr-left">
          <span style={{fontSize:20}}>📝</span><h1>Nhập Liệu</h1><span className="admin-hdr-role">{role.toUpperCase()}</span>
        </div>
        <Link to="/" className="admin-back">← Dashboard</Link>
      </div>

      <div className="admin-content">
        {/* ===== PAGE 1 SECTIONS (All roles) ===== */}

        {/* Good News */}
        <Sec icon="📰" bg="rgba(245,158,11,.12)" color="var(--accent-yellow)" title="Tin Tốt / Good News" open>
          <div className="f-row full"><div className="f-group"><div className="f-label">Nội dung</div>
            <textarea className="f-textarea" placeholder="Nhập tin tốt..." value={newGoodNews} onChange={e=>setNewGoodNews(e.target.value)}/></div></div>
          <div className="f-actions"><button className="btn primary" onClick={submitGoodNews}>📰 Thêm</button></div>
          {goodNews.length>0&&<div className="ex-items"><div className="ex-title">Đang hiển thị ({goodNews.length})</div>
            {goodNews.map(n=><div key={n.id} className="ex-item"><div className="ex-item-content">{n.content}</div>
              <button className="ex-item-btn archive" onClick={()=>archive('/good-news',n.id,goodNews,setGoodNews,'tin tốt')}>📦 Lưu trữ</button></div>)}</div>}
        </Sec>

        {/* Monthly Star */}
        <Sec icon="⭐" bg="rgba(236,72,153,.12)" color="var(--accent-pink)" title="Ngôi Sao Tháng / Monthly Star">
          <div className="f-row"><div className="f-group"><div className="f-label">Tên nhân viên</div>
            <input className="f-input" placeholder="VD: Nguyễn Văn A" value={starForm.employee_name} onChange={e=>setStarForm(p=>({...p,employee_name:e.target.value}))}/></div>
            <div className="f-group"><div className="f-label">Ảnh nhân viên</div>
            <FileUpload value={starForm.employee_image} onChange={url=>setStarForm(p=>({...p,employee_image:url}))}/></div></div>
          <div className="f-row full"><div className="f-group"><div className="f-label">Nội dung tuyên dương</div>
            <textarea className="f-textarea" placeholder="Lý do tuyên dương..." value={starForm.content} onChange={e=>setStarForm(p=>({...p,content:e.target.value}))}/></div></div>
          <div className="f-actions"><button className="btn primary" onClick={submitStar}>⭐ Cập Nhật</button></div>
        </Sec>

        {/* Announcements */}
        <Sec icon="📢" bg="rgba(139,92,246,.12)" color="var(--accent-purple)" title="Thông Báo / Announce">
          <div className="f-row full"><div className="f-group"><div className="f-label">Nội dung</div>
            <textarea className="f-textarea" placeholder="Nhập thông báo..." value={newAnn} onChange={e=>setNewAnn(e.target.value)}/></div></div>
          <div className="f-actions"><button className="btn primary" onClick={submitAnn}>📢 Thêm</button></div>
          {announcements.length>0&&<div className="ex-items"><div className="ex-title">Đang hiển thị ({announcements.length})</div>
            {announcements.map(a=><div key={a.id} className="ex-item"><div className="ex-item-content">{a.content}</div>
              <button className="ex-item-btn archive" onClick={()=>archive('/announcements',a.id,announcements,setAnnouncements,'thông báo')}>📦 Lưu trữ</button></div>)}</div>}
        </Sec>

        {/* New Problem */}
        <Sec icon="🚨" bg="rgba(239,68,68,.12)" color="var(--accent-red)" title="Báo Cáo Sự Cố / New Problem" open>
          <div className="f-row"><div className="f-group"><div className="f-label">Bộ phận</div>
            <select className="f-select" value={probForm.department} onChange={e=>setProbForm(p=>({...p,department:e.target.value}))}>
              <option value="">-- Chọn --</option><option>Sản xuất</option><option>Chất lượng</option><option>Kế hoạch</option><option>Kỹ thuật</option><option>Kho vận</option><option>Khác</option>
            </select></div>
            <div className="f-group"><div className="f-label">Mức độ</div><div className="sev-sel">
              {['info','warning','critical'].map(s=><button key={s} className={`sev-opt ${s} ${probForm.severity===s?'active':''}`}
                onClick={()=>setProbForm(p=>({...p,severity:s}))}>{s==='info'?'ℹ️ Info':s==='warning'?'⚠️ Warning':'🚨 Critical'}</button>)}
            </div></div></div>
          <div className="f-row full"><div className="f-group"><div className="f-label">Mô tả</div>
            <textarea className="f-textarea" placeholder="Mô tả sự cố..." value={probForm.description} onChange={e=>setProbForm(p=>({...p,description:e.target.value}))}/></div></div>
          <div className="f-actions"><button className="btn primary" onClick={submitProblem}>🚨 Gửi</button></div>
          {problems.length>0&&<div className="ex-items"><div className="ex-title">Sự cố hiện tại ({problems.length})</div>
            {problems.map(p=><div key={p.id} className="ex-item"><div style={{flex:1}}><div className="ex-item-content"><strong>[{p.severity.toUpperCase()}]</strong> {p.department}: {p.description}</div></div>
              <button className="ex-item-btn resolve" onClick={()=>resolveProblem(p.id)}>✓ Xử lý</button>
              <button className="ex-item-btn archive" onClick={()=>archive('/problems',p.id,problems,setProblems,'sự cố')}>📦 Lưu trữ</button></div>)}</div>}
        </Sec>

        {/* Others */}
        <Sec icon="📋" bg="rgba(16,185,129,.12)" color="var(--accent-green)" title="Khác / Others">
          <div className="f-row full"><div className="f-group"><div className="f-label">Nội dung</div>
            <textarea className="f-textarea" placeholder="Nhập nội dung..." value={newOther} onChange={e=>setNewOther(e.target.value)}/></div></div>
          <div className="f-actions"><button className="btn primary" onClick={submitOther}>📋 Thêm</button></div>
          {others.length>0&&<div className="ex-items"><div className="ex-title">Đang hiển thị ({others.length})</div>
            {others.map(o=><div key={o.id} className="ex-item"><div className="ex-item-content">{o.content}</div>
              <button className="ex-item-btn archive" onClick={()=>archive('/others',o.id,others,setOthers,'mục khác')}>📦 Lưu trữ</button></div>)}</div>}
        </Sec>

        {/* Release COA (all roles) */}
        <Sec icon="📄" bg="rgba(139,92,246,.12)" color="var(--accent-purple)" title="Kế Hoạch CoA / Release COA">
          <div className="f-row cols3">
            <div className="f-group"><div className="f-label">Product *</div>
              <input className="f-input" placeholder="VD: TIDILON FORTE" value={coaForm.product} onChange={e=>setCoaForm(p=>({...p,product:e.target.value}))}/></div>
            <div className="f-group"><div className="f-label">Batch Number *</div>
              <input className="f-input" placeholder="VD: 260122" value={coaForm.batch_number} onChange={e=>setCoaForm(p=>({...p,batch_number:e.target.value}))}/></div>
            <div className="f-group"><div className="f-label">Stage</div>
              <select className="f-select" value={coaForm.stage} onChange={e=>setCoaForm(p=>({...p,stage:e.target.value}))}>
                <option>Granulation</option><option>Coated</option><option>Blending</option><option>Compression</option><option>Packaging</option><option>Other</option>
              </select></div>
          </div>
          <div className="f-row">
            <div className="f-group"><div className="f-label">Submit CoA</div>
              <input className="f-input" placeholder="VD: 9h- 18/05/2026" value={coaForm.submit_coa} onChange={e=>setCoaForm(p=>({...p,submit_coa:e.target.value}))}/></div>
            <div className="f-group"><div className="f-label">Approve CoA</div>
              <input className="f-input" placeholder="VD: 10h- 18/05/2026" value={coaForm.approve_coa} onChange={e=>setCoaForm(p=>({...p,approve_coa:e.target.value}))}/></div>
          </div>
          <div className="f-actions"><button className="btn primary" onClick={submitCoa}>📄 Thêm COA</button></div>
          {coa.length>0&&<div className="ex-items"><div className="ex-title">Đang hiển thị ({coa.length})</div>
            {coa.map(c=><div key={c.id} className="ex-item">
              <div className="ex-item-content"><strong>{c.product}</strong> — Lô {c.batch_number} — {c.stage} {c.submit_coa&&<span>| Submit: {c.submit_coa}</span>} {c.approve_coa&&<span>| Approve: {c.approve_coa}</span>}</div>
              <button className="ex-item-btn archive" onClick={()=>archive('/coa',c.id,coa,setCoa,'COA')}>📦 Lưu trữ</button></div>)}</div>}
        </Sec>

        {/* ===== PAGE 2 SECTIONS (PD only) ===== */}
        {isPD&&<>
          <div style={{borderTop:'2px solid var(--accent-cyan)',margin:'8px 0',paddingTop:8}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--accent-cyan)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>📊 Dữ liệu sản xuất (chỉ PD)</div>
          </div>

          {/* Quality Calendar */}
          <Sec icon="🔵" bg="rgba(37,99,235,.12)" color="var(--accent-blue)" title="Quality Calendar — Nhập theo ca" open>
            {(()=>{
              const now=new Date();const m=now.getMonth()+1;const y=now.getFullYear();
              const dim=new Date(y,m,0).getDate();
              const lookup={};
              qualityCal.forEach(d=>{lookup[`${d.day}-${d.shift}`]=d.passed});
              const monthNames=['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
              return(<div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--accent-blue)',marginBottom:12}}>📅 {monthNames[m]} {y} — Click ô để chuyển: ⬜ Chưa → 🟢 Đạt → 🔴 Không đạt → ⬜ Chưa</div>
                <div className="qcal-grid">
                  <div className="qcal-hdr-row">
                    <div className="qcal-hdr-cell">Ngày</div>
                    <div className="qcal-hdr-cell">Ca 1</div>
                    <div className="qcal-hdr-cell">Ca 2</div>
                  </div>
                  {Array.from({length:dim},(_,i)=>i+1).map(day=>{
                    const isToday=day===now.getDate();
                    const isFuture=day>now.getDate();
                    return(<div key={day} className={`qcal-row ${isToday?'qcal-today':''} ${isFuture?'qcal-future':''}`}>
                      <div className="qcal-day">{day}</div>
                      {[1,2].map(shift=>{
                        const val=lookup[`${day}-${shift}`];
                        let cls='qcal-cell';
                        if(isFuture) cls+=' qcal-disabled';
                        else if(val===true) cls+=' qcal-pass';
                        else if(val===false) cls+=' qcal-fail';
                        return(<div key={shift} className={cls} onClick={isFuture?undefined:()=>toggleQualityCal(day,shift,val)}>
                          {val===true?'✓':val===false?'✗':''}
                        </div>);
                      })}
                    </div>);
                  })}
                </div>
              </div>);
            })()}
          </Sec>

          {/* Daily KPI */}
          <Sec icon="📊" bg="rgba(59,130,246,.12)" color="var(--accent-blue)" title="Daily KPI (Upload hình)" open>
            <div className="kpi-grid">
              {['safety','quality','delivery','cost'].map(t=>(
                <div key={t} className={`kpi-input-card ${t}`}>
                  <div className="kpi-input-title"><div className="kpi-input-badge">{t[0].toUpperCase()}</div>{t.toUpperCase()}</div>
                  <div className="f-group" style={{marginBottom:8}}><div className="f-label">Hình KPI</div>
                    <FileUpload value={kpiForms[t].image_url} onChange={url=>setKpiForms(p=>({...p,[t]:{image_url:url}}))}/></div>
                  <button className="btn primary" style={{width:'100%'}} onClick={()=>submitKpi(t)}>💾 Lưu {t.toUpperCase()}</button>
                </div>))}
            </div>
          </Sec>

          {/* Action Plan */}
          <Sec icon="📊" bg="rgba(59,130,246,.12)" color="var(--accent-blue)" title="Action Plan">
            <div className="f-row cols3">
              <div className="f-group"><div className="f-label">Date</div><input className="f-input" type="date" value={apForm.date} onChange={e=>setApForm(p=>({...p,date:e.target.value}))}/></div>
              <div className="f-group"><div className="f-label">Phenomenon</div><input className="f-input" placeholder="Hiện tượng..." value={apForm.phenomenon} onChange={e=>setApForm(p=>({...p,phenomenon:e.target.value}))}/></div>
              <div className="f-group"><div className="f-label">Rootcause</div><input className="f-input" placeholder="Nguyên nhân..." value={apForm.rootcause} onChange={e=>setApForm(p=>({...p,rootcause:e.target.value}))}/></div>
            </div>
            <div className="f-row cols3">
              <div className="f-group"><div className="f-label">Action</div><input className="f-input" placeholder="Hành động..." value={apForm.action} onChange={e=>setApForm(p=>({...p,action:e.target.value}))}/></div>
              <div className="f-group"><div className="f-label">PIC</div><input className="f-input" placeholder="Người phụ trách..." value={apForm.pic} onChange={e=>setApForm(p=>({...p,pic:e.target.value}))}/></div>
              <div className="f-group"><div className="f-label">Status</div><select className="f-select" value={apForm.status} onChange={e=>setApForm(p=>({...p,status:e.target.value}))}><option>Open</option><option>In Progress</option><option>Done</option></select></div>
            </div>
            <div className="f-actions"><button className="btn primary" onClick={submitAp}>📊 Thêm Action</button></div>
            {actionPlans.length>0&&<div className="ex-items"><div className="ex-title">Đang hiển thị ({actionPlans.length})</div>
              {actionPlans.map(a=><div key={a.id} className="ex-item"><div className="ex-item-content">{a.phenomenon} → {a.action} ({a.status})</div>
                <button className="ex-item-btn archive" onClick={()=>archive('/action-plan',a.id,actionPlans,setActionPlans,'action')}>📦 Lưu trữ</button></div>)}</div>}
          </Sec>

          {/* Production Plan */}
          <Sec icon="📋" bg="rgba(6,182,212,.12)" color="var(--accent-cyan)" title="Kế Hoạch SX Tuần">
            <div className="f-row"><div className="f-group"><div className="f-label">Hình kế hoạch</div>
              <FileUpload value={planForm.image_url} onChange={url=>setPlanForm(p=>({...p,image_url:url}))}/></div>
              <div className="f-group"><div className="f-label">Ghi chú</div>
              <textarea className="f-textarea" value={planForm.notes} onChange={e=>setPlanForm(p=>({...p,notes:e.target.value}))}/></div></div>
            <div className="f-actions"><button className="btn primary" onClick={submitPlan}>📋 Cập Nhật</button></div>
          </Sec>

          {/* Shift Schedule */}
          <Sec icon="🕐" bg="rgba(249,115,22,.12)" color="var(--accent-orange)" title="Phân Ca / Shift Schedule">
            <div className="f-row"><div className="f-group"><div className="f-label">Hình phân ca</div>
              <FileUpload value={shiftForm.image_url} onChange={url=>setShiftForm(p=>({...p,image_url:url}))}/></div>
              <div className="f-group"><div className="f-label">Ghi chú</div>
              <textarea className="f-textarea" value={shiftForm.notes} onChange={e=>setShiftForm(p=>({...p,notes:e.target.value}))}/></div></div>
            <div className="f-actions"><button className="btn primary" onClick={submitShift}>🕐 Cập Nhật</button></div>
          </Sec>
        </>}

        {/* Archive All */}
        <div className="archive-all-section">
          <p>Lưu trữ tất cả nội dung hiện tại (để bắt đầu ngày mới)</p>
          <button className="btn danger" onClick={archiveAll}>📦 Kết Thúc Ngày — Lưu Trữ Tất Cả</button>
        </div>
      </div>
    </div>
  );
}
