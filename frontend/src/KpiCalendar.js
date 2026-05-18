import React from 'react';

const COLORS = {
  quality: { main: '#2563eb', light: '#dbeafe', label: 'Q' },
  safety: { main: '#059669', light: '#d1fae5', label: 'S' },
  delivery: { main: '#d97706', light: '#fef3c7', label: 'D' },
  cost: { main: '#dc2626', light: '#fee2e2', label: 'C' },
};

export default function KpiCalendar({ type = 'quality', data = [], month, year }) {
  const cfg = COLORS[type] || COLORS.quality;
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = now.getMonth() + 1 === m && now.getFullYear() === y ? now.getDate() : -1;

  // Build lookup: { "day-shift": passed }
  const lookup = {};
  data.filter(d => d.kpi_type === type).forEach(d => {
    lookup[`${d.day}-${d.shift}`] = d.passed;
  });

  const cx = 160, cy = 160, size = 320;
  const rInner = 45;    // center circle
  const rStart = 58;    // start of cells
  const rEnd = 148;     // end of cells
  const rNum = 153;     // number labels
  const cellGap = 1;    // gap between rings
  const shiftWidth = (rEnd - rStart - cellGap) / 2;

  const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

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
  const pad = 0.6; // padding between slices in degrees

  for (let day = 1; day <= 31; day++) {
    const startA = (day - 1) * sliceAngle + pad;
    const endA = day * sliceAngle - pad;
    const midA = ((day - 1) * sliceAngle + day * sliceAngle) / 2;
    const isValid = day <= daysInMonth;
    const isToday = day === today;

    // Number label
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
      // Gray out invalid days
      for (let s = 0; s < 2; s++) {
        const r1 = rStart + s * (shiftWidth + cellGap);
        const r2 = r1 + shiftWidth;
        cells.push(<path key={`c-${day}-${s}`} d={makeArc(r1, r2, startA, endA)} fill="#f3f4f6" stroke="white" strokeWidth={0.5} />);
      }
      continue;
    }

    // Shift 1 (inner ring) and Shift 2 (outer ring)
    for (let s = 1; s <= 2; s++) {
      const r1 = rStart + (s - 1) * (shiftWidth + cellGap);
      const r2 = r1 + shiftWidth;
      const key = `${day}-${s}`;
      const val = lookup[key];
      let fill = 'var(--bg-secondary)'; // default: not filled
      if (val === true) fill = '#059669';       // passed = xanh lá cây
      else if (val === false) fill = '#ef4444'; // failed = đỏ

      cells.push(
        <path key={`c-${day}-${s}`} d={makeArc(r1, r2, startA, endA)}
          fill={fill} stroke="white" strokeWidth={0.5} opacity={isToday ? 1 : 0.85} />
      );
    }

    // Today highlight ring
    if (isToday) {
      cells.push(
        <path key={`today-${day}`} d={makeArc(rStart - 2, rEnd + 2, startA - 0.3, endA + 0.3)}
          fill="none" stroke={cfg.main} strokeWidth={1.5} opacity={0.5} />
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
      {/* Background circles for reference */}
      <circle cx={cx} cy={cy} r={rEnd + 5} fill="none" stroke="var(--border-color)" strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={rStart - 2} fill="none" stroke="var(--border-color)" strokeWidth={0.3} />

      {/* Cells */}
      {cells}

      {/* Number labels */}
      {labels}

      {/* Center circle */}
      <circle cx={cx} cy={cy} r={rInner} fill={cfg.main} opacity={0.85} />
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={32} fontWeight={900} fill="white">{cfg.label}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight={600} fill="rgba(255,255,255,0.8)">{monthNames[m]} {y}</text>

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
