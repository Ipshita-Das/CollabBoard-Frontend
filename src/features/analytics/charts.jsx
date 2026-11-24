import { useState, useRef, useEffect } from 'react';
import { Table2, ChartLine } from 'lucide-react';

// Validated categorical pair (blue / orange) – see .viz-root tokens in index.css
const SERIES = [
  { key: 'created', label: 'Tasks created', color: 'var(--series-1)' },
  { key: 'completed', label: 'Tasks completed', color: 'var(--series-2)' },
];

const fmtWeek = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// "Nice" upper bound for the y axis
const niceMax = (v) => {
  if (v <= 5) return 5;
  const step = v <= 20 ? 5 : v <= 50 ? 10 : 20;
  return Math.ceil(v / step) * step;
};

// Weekly created vs completed, two lines, one axis, crosshair + tooltip on hover
export const TrendChart = ({ weeks, height = 260 }) => {
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef(null);
  const boxRef = useRef(null);
  const [W, setW] = useState(720);

  // Draw at the container's real width so text and lines keep their pixel size
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(320, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showTable]);

  const H = height;
  const pad = { top: 16, right: 92, bottom: 30, left: 34 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...weeks.flatMap(w => [w.created, w.completed])));
  const x = (i) => pad.left + (weeks.length === 1 ? innerW / 2 : (i / (weeks.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  const path = (key) => weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(w[key]).toFixed(1)}`).join(' ');

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - pad.left) / innerW) * (weeks.length - 1));
    setHover(Math.max(0, Math.min(weeks.length - 1, i)));
  };

  const last = weeks[weeks.length - 1];
  // Keep the two end labels from overlapping
  let yCreated = y(last.created);
  let yCompleted = y(last.completed);
  if (Math.abs(yCreated - yCompleted) < 16) {
    const mid = (yCreated + yCompleted) / 2;
    const up = last.created >= last.completed;
    yCreated = mid + (up ? -8 : 8);
    yCompleted = mid + (up ? 8 : -8);
  }

  const hw = hover !== null ? weeks[hover] : null;

  return (
    <div className="viz-root">
      <div className="chart-toolbar">
        <div className="legend">
          {SERIES.map(s => <span key={s.key}><i className="legend-line" style={{ background: s.color }} />{s.label}</span>)}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowTable(v => !v)}>
          {showTable ? <><ChartLine size={14} /> Chart</> : <><Table2 size={14} /> Table</>}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Week of</th><th>Created</th><th>Completed</th></tr></thead>
            <tbody>{weeks.map(w => <tr key={w.week}><td>{fmtWeek(w.week)}</td><td>{w.created}</td><td>{w.completed}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="chart-box" ref={boxRef}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img"
            aria-label="Line chart of tasks created and completed per week"
            onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {ticks.map(t => (
              <g key={t}>
                <line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} className="chart-grid" />
                <text x={pad.left - 8} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{t}</text>
              </g>
            ))}
            {weeks.map((w, i) => (i % 2 === (weeks.length - 1) % 2) && (
              <text key={w.week} x={x(i)} y={H - 8} className="chart-axis" textAnchor="middle">{fmtWeek(w.week)}</text>
            ))}

            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} className="chart-crosshair" />}

            {SERIES.map(s => (
              <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {SERIES.map(s => (
              <circle key={s.key} cx={x(weeks.length - 1)} cy={y(last[s.key])} r="4" fill={s.color} className="chart-dot" />
            ))}
            {hover !== null && SERIES.map(s => (
              <circle key={s.key} cx={x(hover)} cy={y(hw[s.key])} r="5" fill={s.color} className="chart-dot" />
            ))}

            <text x={x(weeks.length - 1) + 10} y={yCreated} className="chart-label" dominantBaseline="middle">{last.created} created</text>
            <text x={x(weeks.length - 1) + 10} y={yCompleted} className="chart-label" dominantBaseline="middle">{last.completed} done</text>
          </svg>

          {hw && (
            <div className="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
              <strong>Week of {fmtWeek(hw.week)}</strong>
              {SERIES.map(s => (
                <span key={s.key}><i className="legend-line" style={{ background: s.color }} />{s.label}<b>{hw[s.key]}</b></span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Per-person stacked bar: completed vs open, scaled to the busiest person
export const WorkloadChart = ({ rows }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map(r => r.total));

  if (rows.length === 0) return <p className="member-empty">No team members yet.</p>;

  return (
    <div className="viz-root">
      <div className="chart-toolbar">
        <div className="legend">
          <span><i className="legend-swatch" style={{ background: 'var(--series-1)' }} />Completed</span>
          <span><i className="legend-swatch" style={{ background: 'var(--series-2)' }} />Open</span>
        </div>
      </div>
      <div className="workload">
        {rows.map(r => {
          const open = r.total - r.completed;
          return (
            <div key={r.id} className="workload-row" onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}>
              <span className="workload-name" title={r.name}>{r.name}</span>
              <div className="workload-track">
                {r.completed > 0 && <span className="workload-seg" style={{ width: `${(r.completed / max) * 100}%`, background: 'var(--series-1)' }} />}
                {open > 0 && <span className="workload-seg" style={{ width: `${(open / max) * 100}%`, background: 'var(--series-2)' }} />}
                {hover === r.id && (
                  <div className="chart-tooltip workload-tip">
                    <strong>{r.name}</strong>
                    <span><i className="legend-swatch" style={{ background: 'var(--series-1)' }} />Completed<b>{r.completed}</b></span>
                    <span><i className="legend-swatch" style={{ background: 'var(--series-2)' }} />Open<b>{open}</b></span>
                    {r.overdue > 0 && <span>Overdue<b>{r.overdue}</b></span>}
                  </div>
                )}
              </div>
              <span className="workload-value">
                {r.completed}/{r.total}
                {r.overdue > 0 && <span className="badge badge-danger">{r.overdue} late</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
