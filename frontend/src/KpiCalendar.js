import React from 'react';

const COLORS = {
  safety:  { main: '#b91c1c', label: '+', fullName: 'SAFETY' },
  quality: { main: '#059669', label: 'Q', fullName: 'QUALITY' },
  delivery:{ main: '#2563eb', label: 'D', fullName: 'DELIVERY' },
  cost:    { main: '#ca8a04', label: 'C', fullName: 'COST' },
};

const MONTH_EN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function KpiCalendar({ type = 'quality', data = [], month, year }) {
  const cfg = COLORS[type] || COLORS.quality;
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = now.getMonth() + 1 === m && now.getFullYear() === y ? now.getDate() : -1;

  const lookup = {};
  data.filter(d => d.kpi_type === type).forEach(d => {
    lookup[`${d.day}-${d.shift}`] = d.passed;
  });

  const cx = 160, cy = 160, size = 320;
  const rInner = 42;
  const rStart = 56;
  const rEnd = 145;
  const rNum = 152;
  const cellGap = 1.5;
  const shiftWidth = (rEnd - rStart - cellGap) / 2;

  // Ca 1 = outer ring, Ca 2 = inner ring
  const getRadii = (shift) => {
    if (shift === 2) return [rStart, rStart + shiftWidth];
    return [rStart + shiftWidth + cellGap, rEnd];
  };

  const makeArc = (r1, r2, startAngle, endAngle) => {
    const s1 = startAngle * Math.PI / 180;
    const e1 = endAngle * Math.PI / 180;
    const x1 = cx + r2 * Math.sin(s1), y1 = cy - r2 * Math.cos(s1);
    const x2 = cx + r2 * Math.sin(e1), y2 = cy - r2 * Math.cos(e1);
    const x3 = cx + r1 * Math.sin(e1), y3 = cy - r1 * Math.cos(e1);
    const x4 = cx + r1 * Math.sin(s1), y4 = cy - r1 * Math.cos(s1);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M${x1},${y1} A${r2},${r2} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${large} 0 ${x4},${y4} Z`;
  };

  const cells = [];
  const labels = [];
  const sliceAngle = 360 / 31;
  const pad = 0.6;

  for (let day = 1; day <= 31; day++) {
    const startA = (day - 1) * sliceAngle + pad;
    const endA = day * sliceAngle - pad;
    const midA = ((day - 1) * sliceAngle + day * sliceAngle) / 2;
    const isValid = day <= daysInMonth;
    const isToday = day === today;

    const lx = cx + rNum * Math.sin(midA * Math.PI / 180);
    const ly = cy - rNum * Math.cos(midA * Math.PI / 180);
    labels.push(
      <text key={`lbl-${day}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
        fontSize={day <= daysInMonth ? 8 : 7} fontWeight={isToday ? 900 : 600}
        fill={isToday ? cfg.main : !isValid ? '#ccc' : 'var(--text-secondary)'}>
        {day}
      </text>
    );

    if (!isValid) {
      for (let s = 1; s <= 2; s++) {
        const [r1, r2] = getRadii(s);
        cells.push(<path key={`c-${day}-${s}`} d={makeArc(r1, r2, startA, endA)} fill="#f3f4f6" stroke="white" strokeWidth={0.5} />);
      }
      continue;
    }

    for (let s = 1; s <= 2; s++) {
      const [r1, r2] = getRadii(s);
      const val = lookup[`${day}-${s}`];
      let fill = 'var(--bg-secondary)';
      if (val === true) fill = '#059669';
      else if (val === false) fill = '#ef4444';

      cells.push(
        <path key={`c-${day}-${s}`} d={makeArc(r1, r2, startA, endA)}
          fill={fill} stroke="white" strokeWidth={0.5} opacity={isToday ? 1 : 0.85} />
      );
    }

    if (isToday) {
      cells.push(
        <path key={`today-${day}`} d={makeArc(rStart - 2, rEnd + 2, startA - 0.3, endA + 0.3)}
          fill="none" stroke={cfg.main} strokeWidth={1.5} opacity={0.5} />
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
      <circle cx={cx} cy={cy} r={rEnd + 5} fill="none" stroke="var(--border-color)" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={rStart - 2} fill="none" stroke="var(--border-color)" strokeWidth={0.3} />

      {cells}
      {labels}

      {/* Center circle */}
      <circle cx={cx} cy={cy} r={rInner} fill={cfg.main} opacity={0.9} />
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        fontSize={28} fontWeight={900} fill="white">{cfg.label}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
        fontSize={6} fontWeight={700} fill="rgba(255,255,255,0.9)" letterSpacing="1">{cfg.fullName}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
        fontSize={6} fontWeight={600} fill="rgba(255,255,255,0.7)">{MONTH_EN[m]} {y}</text>

      {/* Legend */}
      <g transform={`translate(${size - 70}, ${size - 25})`}>
        <rect x={0} y={0} width={8} height={8} rx={1} fill="#059669" />
        <text x={11} y={7} fontSize={6} fill="var(--text-muted)">Đạt</text>
        <rect x={28} y={0} width={8} height={8} rx={1} fill="#ef4444" />
        <text x={39} y={7} fontSize={6} fill="var(--text-muted)">K.Đạt</text>
      </g>
    </svg>
  );
}
