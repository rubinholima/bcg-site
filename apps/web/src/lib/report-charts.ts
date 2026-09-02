/** Print-safe vector charts: explicit units, observed values only, no inferred scores. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export type ReportObservation = { date: string; value: number };

export function reportTrend(title: string, unit: string, observations: ReportObservation[]): string {
  const points = observations.filter(p => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (points.length < 2 || new Set(points.map(p => p.date.slice(0, 10))).size < 2) return "";
  const first = points[0], last = points[points.length - 1];
  const min = Math.min(...points.map(p => p.value)), max = Math.max(...points.map(p => p.value));
  const low = Math.min(0, min), range = Math.max(max - low, 1);
  const start = Date.parse(first.date), span = Math.max(Date.parse(last.date) - start, 1);
  const xy = points.map(p => [40 + (Date.parse(p.date) - start) / span * 340, 132 - (p.value - low) / range * 100]);
  const delta = Math.round((last.value - first.value) * 100) / 100;
  return `<figure class="report-atomic report-chart" style="margin:0 0 12px;padding:12px;border:1px solid #dbe3ef;border-radius:8px">
    <figcaption style="font-weight:700;color:#00205b">${esc(title)} (${esc(unit)})</figcaption>
    <svg viewBox="0 0 420 164" role="img" aria-label="${esc(title)}" style="width:100%;height:auto;max-height:48mm">
      <path d="M40 28V132H385" fill="none" stroke="#cbd5e1"/>
      <text x="4" y="36" font-size="10">${max}</text><text x="4" y="134" font-size="10">${low}</text>
      <polyline points="${xy.map(p => p.join(',')).join(' ')}" fill="none" stroke="#003087" stroke-width="2.5"/>
      ${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#c8102e"><title>${esc(points[i].date.slice(0, 10))}: ${points[i].value} ${esc(unit)}</title></circle>`).join('')}
      <text x="40" y="154" font-size="10">${esc(first.date.slice(0,10))}</text><text x="380" y="154" text-anchor="end" font-size="10">${esc(last.date.slice(0,10))}</text>
    </svg><div style="font-size:9px;color:#475569">${first.value} → ${last.value} ${esc(unit)} · Variação ${delta > 0 ? '+' : ''}${delta} ${esc(unit)} · ${points.length} registros</div>
  </figure>`;
}

export function reportRadar(title: string, dimensions: Array<{ label: string; value: number | null | undefined }>, maximum: number): string {
  const data = dimensions.filter((p): p is {label: string; value: number} => typeof p.value === 'number' && Number.isFinite(p.value) && p.value >= 0 && p.value <= maximum);
  if (data.length < 3 || maximum <= 0) return "";
  const coord = (i: number, ratio: number) => {
    const angle = i * Math.PI * 2 / data.length - Math.PI / 2;
    return [160 + Math.cos(angle) * 78 * ratio, 115 + Math.sin(angle) * 78 * ratio];
  };
  return `<figure class="report-atomic report-chart" style="margin:0 0 12px;border:1px solid #dbe3ef;padding:12px;border-radius:8px">
    <figcaption style="font-weight:700;color:#00205b">${esc(title)} · escala 0–${maximum}</figcaption>
    <svg viewBox="0 0 320 240" role="img" aria-label="${esc(title)}" style="width:100%;max-height:65mm">
      ${[.25,.5,.75,1].map(r => `<polygon points="${data.map((_,i) => coord(i,r).join(',')).join(' ')}" fill="none" stroke="#cbd5e1"/>`).join('')}
      <polygon points="${data.map((p,i) => coord(i,p.value/maximum).join(',')).join(' ')}" fill="#003087" fill-opacity=".18" stroke="#003087" stroke-width="2"/>
      ${data.map((p,i) => {const [x,y]=coord(i,1.28);return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10">${esc(p.label)} ${p.value}</text>`;}).join('')}
    </svg>
  </figure>`;
}
