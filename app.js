/*
  Simple PESTEL generator.
  - Collects scores and notes for each factor
  - Produces a concise analysis with priorities
  - Generates a professional PDF report (using jsPDF)
*/
import { jsPDF } from 'jspdf';

const FACTORS = [
  { key: 'political', label: 'Político' },
  { key: 'economic', label: 'Económico' },
  { key: 'social', label: 'Social' },
  { key: 'tech', label: 'Tecnológico' },
  { key: 'env', label: 'Ecológico' },
  { key: 'legal', label: 'Legal' }
];

const get = sel => document.querySelector(sel);
const getAll = sel => Array.from(document.querySelectorAll(sel));

function readInputs() {
  const data = {};
  FACTORS.forEach(f => {
    const scoreInput = document.querySelector(`[data-key="${f.key}-score"]`);
    const noteInput = document.querySelector(`[data-key="${f.key}-note"]`);
    // If the input is empty, treat score as null (no data)
    const raw = (scoreInput?.value ?? '').toString().trim();
    const score = raw === '' ? null : Math.min(5, Math.max(1, Number(raw)));
    const note = (noteInput?.value || '').trim();
    data[f.key] = { label: f.label, score, note };
  });
  return data;
}

/* ---------------------------------------------------------------------------
 * Revisor de observaciones (algoritmo heurístico).
 * Analiza la descripción de cada factor y sugiere mejoras para que el
 * análisis sea más completo, específico y sustentado.
 * ------------------------------------------------------------------------- */
const WEAK_WORDS = ['cambios','cambio','algo','aspectos','aspecto','varios','variaciones','importante','grande','poco','mucho','diversos','relacionado','situación','situacion','condiciones','general','cosas','relevante','diferentes','algunos','ciertos','posible','cierta'];
const EVIDENCE_WORDS = ['evidencia','fuente','informe','dato','estadístic','estadistic','según','segun','estudio','proyección','proyeccion','normativ','regul','legis','referencia','tasa','indicador'];
const ACTION_WORDS = ['riesgo','oportunidad','amenaza','mitigación','mitigacion','acción','accion','estrategia','estrategic','seguimiento','monitorizar','plan','medidas','implicación','implicacion','afectar','benefici','objetivo'];
const NUMBER_PATTERN = /\d/;
const SEVERITY_WEIGHT = { alta: 30, media: 15, baja: 8 };

const unique = arr => [...new Set(arr)];

function reviewNote(label, note) {
  const suggestions = [];
  const text = (note || '').trim();

  if (!text) {
    suggestions.push({ severity: 'alta', msg: `El factor ${label} no tiene observaciones. Agregue evidencias, contexto y fuentes para que el análisis sea significativo.` });
    return suggestions;
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 6) {
    suggestions.push({ severity: 'alta', msg: `La observación de ${label} es muy breve (${words.length} palabra${words.length === 1 ? '' : 's'}). Amplíe con contexto, ejemplos y evidencia concreta.` });
  }

  const lower = text.toLowerCase();
  const weakFound = unique(WEAK_WORDS.filter(w => lower.includes(w)));
  if (weakFound.length) {
    suggestions.push({ severity: 'media', msg: `La observación de ${label} usa términos genéricos (${weakFound.slice(0, 3).join(', ')}). Mencione cifras, actores, plazos o hechos concretos.` });
  }

  if (!NUMBER_PATTERN.test(text)) {
    suggestions.push({ severity: 'media', msg: `La observación de ${label} no incluye datos o cifras. Cuantificar (%, montos, plazos, variaciones) fortalece el análisis.` });
  }

  if (!EVIDENCE_WORDS.some(w => lower.includes(w))) {
    suggestions.push({ severity: 'media', msg: `La observación de ${label} no cita fuentes ni evidencias. Agregue referencias (informes, normativas, datos públicos) para sustentar la conclusión.` });
  }

  if (!ACTION_WORDS.some(w => lower.includes(w))) {
    suggestions.push({ severity: 'baja', msg: `La observación de ${label} no indica implicaciones para la organización. Señale riesgos u oportunidades y qué acciones conviene considerar.` });
  }

  return suggestions.slice(0, 4);
}

function factorQuality(suggestions) {
  return Math.max(0, 100 - suggestions.reduce((sum, s) => sum + (SEVERITY_WEIGHT[s.severity] || 0), 0));
}

function generateAnalysis(data) {
  const reviews = FACTORS.map(f => {
    const entry = data[f.key];
    const suggestions = reviewNote(f.label, entry.note);
    return { ...entry, key: f.key, suggestions, quality: factorQuality(suggestions) };
  });

  const allEmpty = reviews.every(r => r.score === null && !r.note);
  if (allEmpty) return { html: '', text: '' };

  const withScore = reviews.filter(r => r.score !== null).sort((a, b) => b.score - a.score);
  const withoutScore = reviews.filter(r => r.score === null);
  const ordered = withScore.concat(withoutScore);
  const high = withScore.filter(r => r.score >= 4);
  const medium = withScore.filter(r => r.score === 3);
  const low = withScore.filter(r => r.score <= 2);
  const overall = Math.round(reviews.reduce((sum, r) => sum + r.quality, 0) / Math.max(1, reviews.length));

  const dateStr = new Date().toLocaleString();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sevClass = s => s === 'alta' ? 'alta' : s === 'media' ? 'media' : 'baja';
  const impactClass = sc => sc === null ? 'nd' : sc >= 4 ? 'high' : sc === 3 ? 'medium' : 'low';

  /* ------------------------- HTML (presentación) ------------------------- */
  const h = [];
  h.push('<div class="analysis">');
  h.push('<div class="analysis-head"><div class="analysis-title">Resumen PESTEL</div><div class="analysis-date">Generado: ' + esc(dateStr) + '</div></div>');

  h.push('<div class="quality">');
  h.push('<div class="quality-row"><span>Calidad de descripciones</span><strong class="quality-pct">' + overall + '%</strong></div>');
  h.push('<div class="quality-track"><div class="quality-fill" style="width:' + overall + '%"></div></div>');
  h.push('<div class="quality-note">' + (overall >= 80 ? 'Buen nivel. Revise las sugerencias de cada factor para afinar el análisis.' : overall >= 50 ? 'Nivel aceptable. Mejore las observaciones marcadas con sugerencias.' : 'Nivel bajo. Amplíe las observaciones para obtener un análisis sólido.') + '</div>');
  h.push('</div>');

  h.push('<section class="a-section"><h4>Prioridades estratégicas</h4><div class="priorities">');
  h.push('<span class="tag high">Alto (4-5): ' + (high.length ? high.map(x => x.label).join(', ') : 'Ninguna') + '</span>');
  h.push('<span class="tag medium">Medio (3): ' + (medium.length ? medium.map(x => x.label).join(', ') : 'Ninguna') + '</span>');
  h.push('<span class="tag low">Bajo (1-2): ' + (low.length ? low.map(x => x.label).join(', ') : 'Ninguno') + '</span>');
  if (withoutScore.length) h.push('<span class="tag nd">Sin dato: ' + withoutScore.map(x => x.label).join(', ') + '</span>');
  h.push('</div></section>');

  h.push('<section class="a-section"><h4>Factores detallados</h4>');
  ordered.forEach(r => {
    const ic = impactClass(r.score);
    h.push('<div class="factor-card ' + ic + '">');
    h.push('<div class="factor-card-top"><span class="factor-name">' + esc(r.label) + '</span>');
    h.push('<span class="factor-impact ' + ic + '">' + (r.score === null ? 'N/D' : r.score) + '</span></div>');
    h.push('<p class="factor-note">' + esc(r.note || 'Sin observaciones.') + '</p>');
    if (r.suggestions.length) {
      h.push('<ul class="suggestions">');
      r.suggestions.forEach(s => {
        h.push('<li class="sg ' + sevClass(s.severity) + '"><span class="sg-label">' + sevClass(s.severity) + '</span> ' + esc(s.msg) + '</li>');
      });
      h.push('</ul>');
    }
    h.push('</div>');
  });
  h.push('</section>');

  h.push('<section class="a-section"><h4>Recomendaciones</h4><ul class="rec-list">');
  if (high.length) {
    high.forEach(x => h.push('<li><strong>' + esc(x.label) + ':</strong> Priorizar acciones de mitigación y seguimiento (impacto ' + x.score + '). Defina planes, recursos y responsables.</li>'));
  } else {
    h.push('<li>No se detectaron prioridades altas; mantener monitoreo regular y revisar cambios de contexto.</li>');
  }
  if (medium.length) h.push('<li><strong>Impacto medio:</strong> validar acciones tácticas y monitorear indicadores clave.</li>');
  if (low.length) h.push('<li><strong>Impacto bajo:</strong> registrar observaciones y revisar periódicamente; baja prioridad operativa.</li>');
  h.push('</ul></section>');

  h.push('<section class="a-section"><h4>Observaciones finales</h4><p>Para un informe completo, exporte a PDF o copie este resumen y adjunte fuentes/evidencias relevantes. Priorice las áreas con impacto 4-5 y documente evidencia para apoyar decisiones.</p></section>');
  h.push('</div>');

  /* ------------------------- Texto plano (PDF/copia) ------------------------- */
  const lines = [];
  lines.push('Resumen PESTEL — Generado: ' + dateStr);
  lines.push('');
  lines.push('Calidad de descripciones: ' + overall + '%');
  lines.push('');
  lines.push('1) Factores ordenados por impacto (mayor a menor):');
  ordered.forEach(f => lines.push(`- ${f.label}: Impacto = ${f.score === null ? 'N/D' : f.score} — ${f.note || 'Sin observaciones'}`));
  lines.push('');
  lines.push('2) Agrupación por prioridad:');
  if (high.length) { lines.push('  Prioridades altas (Impacto 4-5):'); high.forEach(hh => lines.push(`   • ${hh.label} (Impacto ${hh.score})`)); } else { lines.push('  Prioridades altas (Impacto 4-5): Ninguna identificada.'); }
  if (medium.length) { lines.push('  Impacto medio (Impacto 3):'); medium.forEach(mm => lines.push(`   • ${mm.label} (Impacto ${mm.score})`)); }
  if (low.length) { lines.push('  Impacto bajo (Impacto 1-2):'); low.forEach(ll => lines.push(`   • ${ll.label} (Impacto ${ll.score})`)); }
  lines.push('');
  lines.push('3) Recomendaciones sintetizadas:');
  if (high.length) high.forEach(hh => lines.push(`- ${hh.label}: Priorizar acciones de mitigación y seguimiento (Impacto ${hh.score}).`));
  else lines.push('- No se detectaron prioridades altas; mantener monitoreo regular.');
  if (medium.length) lines.push('- Impacto medio: validar acciones tácticas y monitorizar indicadores clave.');
  if (low.length) lines.push('- Impacto bajo: registrar observaciones y revisar periódicamente; baja prioridad operativa.');
  lines.push('');
  lines.push('4) Sugerencias para mejorar las observaciones:');
  reviews.forEach(r => {
    if (!r.suggestions.length) { lines.push(`- ${r.label}: observación en buen estado.`); return; }
    lines.push(`- ${r.label}:`);
    r.suggestions.forEach(s => lines.push(`   [${s.severity}] ${s.msg}`));
  });
  lines.push('');
  lines.push('5) Observaciones finales:');
  lines.push('- Para un informe completo, exporte a PDF o copie este resumen y adjunte fuentes/evidencias relevantes.');

  return { html: h.join('\n'), text: lines.join('\n') };
}

function renderOutput(analysis) {
  const out = get('#output');
  if (!analysis || !analysis.html) { out.innerHTML = ''; return; }
  out.innerHTML = analysis.html;
}

function generatePDF(filename, data, analysisText) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const usableW = pageW - margin * 2;
  let y = margin;
  const FOOTER_Y = pageH - 36;

  const LETTER = { political: 'P', economic: 'E', social: 'S', tech: 'T', env: 'EA', legal: 'L' };
  const FCOLOR = { political: [31,119,180], economic: [44,160,44], social: [214,40,40], tech: [148,103,189], env: [140,86,75], legal: [110,118,129] };

  const reviews = FACTORS.map(f => {
    const entry = data[f.key] || {};
    const suggestions = reviewNote(f.label, entry.note);
    const quality = factorQuality(suggestions);
    const level = entry.score === null ? 'Sin dato' : entry.score >= 4 ? 'Alto' : entry.score === 3 ? 'Medio' : 'Bajo';
    return { ...entry, key: f.key, suggestions, quality, level };
  });
  const overall = Math.round(reviews.reduce((s, r) => s + r.quality, 0) / Math.max(1, reviews.length));
  const scored = reviews.filter(r => r.score !== null).sort((a, b) => b.score - a.score);
  const high = scored.filter(r => r.score >= 4);
  const medium = scored.filter(r => r.score === 3);
  const low = scored.filter(r => r.score <= 2);
  const withoutScore = reviews.filter(r => r.score === null);

  const qualityColor = pct => pct >= 80 ? [6, 95, 70] : pct >= 50 ? [180, 120, 23] : [185, 30, 30];

  const setTitleBar = () => {
    doc.setFillColor(5, 73, 61);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.text('Informe de Análisis PESTEL', pageW / 2, 38, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Planificación Estratégica — ITCPO', margin, 52);
    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.text('© Carlos Alfredo Castillo Flores - ITCPO - 2026', margin, FOOTER_Y);
    doc.text('Página ' + doc.internal.getNumberOfPages(), pageW - margin, FOOTER_Y, { align: 'right' });
    doc.setTextColor(17, 18, 20);
    y = 86;
  };

  const addWrapped = (text, opts = {}) => {
    const fontSize = opts.fontSize || 11;
    const leading = fontSize * 1.28;
    const color = opts.color || [17, 18, 20];
    doc.setFontSize(fontSize);
    doc.setFont(undefined, opts.bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    const split = doc.splitTextToSize(text, usableW);
    if (y + split.length * leading > pageH - margin - 60) { doc.addPage(); setTitleBar(); }
    doc.text(split, margin, y);
    y += split.length * leading + (opts.gap || 0);
  };

  const ensureSpace = needed => {
    if (y + needed > pageH - margin - 60) { doc.addPage(); setTitleBar(); }
  };

  const drawQualityBar = (x, barY, w, pct) => {
    const track = Math.max(0, Math.min(100, pct));
    const c = qualityColor(pct);
    doc.setFillColor(236, 238, 240);
    doc.roundedRect(x, barY, w, 8, 4, 4, 'F');
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(x, barY, Math.max(2, w * track / 100), 8, 4, 4, 'F');
  };

  const sectionTitle = (num, text) => {
    ensureSpace(30);
    doc.setFillColor(245, 245, 246);
    doc.roundedRect(margin - 4, y - 11, usableW + 8, 24, 5, 5, 'F');
    doc.setFontSize(12.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 73, 61);
    doc.text(num + '.  ' + text, margin, y);
    y += 24;
  };

  // ============ PORTADA / RESUMEN EJECUTIVO ============
  setTitleBar();

  // Meta info block
  addWrapped('Fecha de generación: ' + new Date().toLocaleString(), { fontSize: 10, gap: 2 });
  addWrapped('Organización analizada: ' + (data.org || '_____________________'), { fontSize: 10, gap: 2 });
  addWrapped('Herramienta: PESTEL_Sim (ITCPO) — Autores: Carlos Alfredo Castillo Flores', { fontSize: 10, gap: 6 });

  // ---- Resumen ejecutivo PESTEL ----
  sectionTitle(1, 'Resumen PESTEL');

  // Global quality banner
  const gx = margin;
  doc.setFillColor(250, 250, 251);
  doc.setDrawColor(230);
  doc.roundedRect(gx - 6, y - 12, usableW + 12, 46, 6, 6, 'FD');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(17, 18, 20);
  doc.text('Calidad promedio de las descripciones', gx, y + 4);
  const gc = qualityColor(overall);
  doc.setTextColor(gc[0], gc[1], gc[2]);
  doc.setFontSize(15);
  doc.text(overall + '%', gx + usableW, y, { align: 'right' });
  drawQualityBar(gx, y + 10, usableW, overall);
  const overallLabel = overall >= 80 ? 'Excelente' : overall >= 60 ? 'Buena' : overall >= 40 ? 'Aceptable' : 'Baja';
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120);
  doc.text('Nivel de detalle general: ' + overallLabel + '. Revise las sugerencias de cada factor para mejorar las observaciones.', gx, y + 26);
  y += 48;

  // Executive summary paragraph
  const highNames = high.map(f => f.label).join(', ');
  let exec = 'El análisis evaluó los seis factores PESTEL (Político, Económico, Social, Tecnológico, Ecológico y Legal), clasificando su impacto para la organización y valorando la calidad de las descripciones registradas. ';
  exec += high.length
    ? 'Se identificaron ' + high.length + ' factor' + (high.length === 1 ? '' : 'es') + ' de prioridad alta (impacto 4-5): ' + highNames + '. '
    : 'No se identificaron factores de prioridad alta (impacto 4-5). ';
  if (medium.length) exec += medium.length + ' factor' + (medium.length === 1 ? '' : 'es') + ' de impacto medio requiere(n) seguimiento táctico: ' + medium.map(f => f.label).join(', ') + '. ';
  if (withoutScore.length) exec += 'Sin información para: ' + withoutScore.map(f => f.label).join(', ') + '. ';
  exec += 'La calidad promedio de las descripciones alcanza ' + overall + '%, lo que indica un nivel de sustento ' + overallLabel.toLowerCase() + '.';
  addWrapped(exec, { fontSize: 10.5, gap: 10 });

  // PESTEL dashboard: 3 columns x 2 rows
  addWrapped('Panorama de factores — Impacto y calidad', { fontSize: 11, bold: true, gap: 6 });
  const cols = 3;
  const cellW = usableW / cols;
  const cellH = 64;
  const cellGap = 8;
  ensureSpace(2 * cellH + 30);
  reviews.forEach((r, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = margin + col * cellW;
    const cy = y + row * (cellH + cellGap);
    const fc = FCOLOR[r.key];
    doc.setFillColor(250, 250, 251);
    doc.setDrawColor(228);
    doc.roundedRect(cx, cy, cellW - 4, cellH, 5, 5, 'FD');
    // Letter badge
    doc.setFillColor(fc[0], fc[1], fc[2]);
    doc.roundedRect(cx + 6, cy + 6, 22, 22, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(LETTER[r.key], cx + 17, cy + 20, { align: 'center' });
    doc.setTextColor(17, 18, 20);
    doc.setFontSize(10);
    doc.text(r.label, cx + 34, cy + 16);
    const impactText = r.score === null ? 'N/D' : r.score + ' (' + r.level + ')';
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    const impactCol = r.score === null ? [140, 140, 140] : qualityColor(r.quality);
    doc.setTextColor(impactCol[0], impactCol[1], impactCol[2]);
    doc.text('Impacto: ' + impactText, cx + 34, cy + 27);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.text('Calidad: ' + r.quality + '%', cx + 6, cy + 44);
    drawQualityBar(cx + 6, cy + 48, cellW - 22, r.quality);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.setFont(undefined, 'normal');
    const brief = (r.note || 'Sin observaciones.').replace(/\s+/g, ' ').slice(0, 48) + ((r.note || '').length > 48 ? '…' : '');
    const briefLines = doc.splitTextToSize(brief, cellW - 16);
    doc.setTextColor(110);
    doc.text(briefLines.slice(0, 1), cx + 6, cy + 58);
  });
  y += 2 * (cellH + cellGap) + 14;

  // ============ 2. PRIORIDADES ESTRATÉGICAS ============
  sectionTitle(2, 'Prioridades estratégicas');
  if (high.length) {
    addWrapped('Prioridad alta (impacto 4-5): ' + high.map(f => f.label + ' (' + f.score + ')').join(' · '), { fontSize: 10, bold: true, color: [6, 95, 70], gap: 4 });
  } else {
    addWrapped('Prioridad alta: ninguna. Mantener monitoreo continuo del entorno.', { fontSize: 10, gap: 4 });
  }
  if (medium.length) addWrapped('Prioridad media (impacto 3): ' + medium.map(f => f.label + ' (' + f.score + ')').join(' · '), { fontSize: 10, color: [150, 110, 30], gap: 4 });
  if (low.length) addWrapped('Prioridad baja (impacto 1-2): ' + low.map(f => f.label + ' (' + f.score + ')').join(' · '), { fontSize: 10, color: [120, 120, 130], gap: 2 });
  if (withoutScore.length) addWrapped('Sin dato de impacto: ' + withoutScore.map(f => f.label).join(', '), { fontSize: 10, color: [140, 140, 140], gap: 2 });

  // ============ 3. CUADRO DE IMPACTOS ============
  sectionTitle(3, 'Cuadro de factores — Impactos');
  ensureSpace(150);
  const boxW = usableW;
  const boxX = margin;
  const rows = 2;
  const cols2 = 3;
  const cellW2 = boxW / cols2;
  const cellH2 = 48;
  const headerH2 = 18;
  const cuadroY = y + 4;
  doc.setFillColor(250, 250, 251);
  doc.setDrawColor(220);
  doc.roundedRect(boxX - 6, cuadroY - 6, boxW + 12, rows * cellH2 + headerH2 + 12, 6, 6, 'F');
  doc.setLineWidth(0.8);
  doc.roundedRect(boxX - 6, cuadroY - 6, boxW + 12, rows * cellH2 + headerH2 + 12, 6, 6);
  doc.setFillColor(245, 245, 246);
  doc.rect(boxX - 6, cuadroY - 6, boxW + 12, headerH2 + 6, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 34, 34);
  doc.text('Factor', boxX, cuadroY + 6);
  reviews.forEach((r, idx) => {
    const col = idx % cols2;
    const row = Math.floor(idx / cols2);
    const xCell = boxX + col * cellW2;
    const yCell = cuadroY + headerH2 + row * cellH2;
    doc.setDrawColor(230);
    doc.rect(xCell, yCell, cellW2, cellH2, 'S');
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    doc.text(r.label, xCell + 8, yCell + 14);
    const impactLabel = r.score === null ? 'N/D' : String(r.score);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const impactCol = r.score === null ? [140, 140, 140] : qualityColor(r.quality);
    doc.setTextColor(impactCol[0], impactCol[1], impactCol[2]);
    doc.text(impactLabel, xCell + cellW2 - 12, yCell + cellH2 / 2 + 6, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(130);
    doc.text('Calidad: ' + r.quality + '%  (' + r.level + ')', xCell + 8, yCell + cellH2 - 6);
  });
  y = cuadroY + headerH2 + rows * cellH2 + 20;

  // ============ 4. ANÁLISIS DETALLADO POR FACTOR ============
  sectionTitle(4, 'Análisis detallado por factor');
  reviews.forEach(r => {
    ensureSpace(90);
    const fc = FCOLOR[r.key];
    doc.setFillColor(fc[0], fc[1], fc[2]);
    doc.roundedRect(margin - 4, y - 12, 5, 5, 2, 2, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17, 18, 20);
    addWrapped(r.label.toUpperCase() + ' (' + LETTER[r.key] + ') — Impacto: ' + (r.score === null ? 'N/D' : r.score) + ' | Prioridad: ' + r.level + ' | Calidad: ' + r.quality + '%', { fontSize: 11, bold: true, gap: 2 });
    doc.setFont(undefined, 'normal');
    addWrapped('Observación: ' + (r.note || 'Sin observaciones.'), { fontSize: 10.5, gap: 2 });
    if (r.suggestions.length) {
      addWrapped('Sugerencias para mejorar la descripción:', { fontSize: 10, bold: true, gap: 2 });
      r.suggestions.forEach(s => {
        const sevColor = s.severity === 'alta' ? [185, 30, 30] : s.severity === 'media' ? [150, 110, 30] : [6, 95, 70];
        addWrapped('  • [' + s.severity + '] ' + s.msg, { fontSize: 9.5, color: sevColor });
      });
    }
    y += 6;
  });

  // ============ 5. RECOMENDACIONES ============
  sectionTitle(5, 'Recomendaciones');
  if (high.length) {
    addWrapped('Prioridades altas (Impacto 4-5):', { fontSize: 11, bold: true, gap: 2 });
    high.forEach(h => addWrapped('• ' + h.label + ' (Impacto ' + h.score + '): ' + (h.note || 'Sin observaciones'), { fontSize: 10, gap: 2 }));
  } else {
    addWrapped('- No se identifican prioridades altas. Mantener monitoreo continuo del entorno.', { fontSize: 10, gap: 2 });
  }
  if (medium.length) addWrapped('- Impacto medio: validar acciones tácticas y monitorear indicadores clave.', { fontSize: 10, gap: 2 });
  if (low.length) addWrapped('- Impacto bajo: documentar y revisar periódicamente.', { fontSize: 10, gap: 2 });
  if (withoutScore.length) addWrapped('- Completar el impacto de: ' + withoutScore.map(f => f.label).join(', ') + '.', { fontSize: 10, gap: 2 });
  if (reviews.some(r => r.quality < 80)) {
    addWrapped('- Mejorar la calidad de las descripciones con calidad baja: agregar cifras, fuentes y contexto para reforzar el análisis.', { fontSize: 10, gap: 2 });
  }

  // ============ 6. RESUMEN CONSOLIDADO (tabla) ============
  sectionTitle(6, 'Resumen consolidado');
  const tableX = margin;
  const c1 = usableW * 0.13; // Factor
  const c2 = usableW * 0.10; // Impacto
  const c3 = usableW * 0.12; // Prioridad
  const c4 = usableW * 0.10; // Calidad
  const c5 = usableW * 0.55; // Observaciones
  const baseRowH = 20;
  const paddingY = 8;

  const headerY = y;
  doc.setFillColor(245, 245, 246);
  doc.rect(tableX, headerY, usableW, baseRowH, 'F');
  doc.setDrawColor(220);
  doc.setLineWidth(0.6);
  doc.rect(tableX, headerY, usableW, baseRowH, 'S');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 34, 34);
  doc.text('Factor', tableX + 5, headerY + 13);
  doc.text('Impacto', tableX + c1 + 5, headerY + 13);
  doc.text('Prioridad', tableX + c1 + c2 + 5, headerY + 13);
  doc.text('Calidad', tableX + c1 + c2 + c3 + 5, headerY + 13);
  doc.text('Observaciones', tableX + c1 + c2 + c3 + c4 + 5, headerY + 13);
  y = headerY + baseRowH;

  doc.setFont(undefined, 'normal');
  reviews.forEach((r, idx) => {
    const noteFull = (r.note || 'Sin observaciones').replace(/\s+/g, ' ');
    const noteLines = doc.splitTextToSize(noteFull, c5 - 10);
    const factorLines = doc.splitTextToSize(r.label, c1 - 10);
    const linesCount = Math.max(noteLines.length, factorLines.length, 1);
    const rowH = linesCount * 11 + paddingY;

    if (y + rowH > pageH - margin - 60) {
      doc.addPage();
      setTitleBar();
      doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(34, 34, 34);
      doc.text('Factor', tableX + 5, y + 12);
      doc.text('Impacto', tableX + c1 + 5, y + 12);
      doc.text('Prioridad', tableX + c1 + c2 + 5, y + 12);
      doc.text('Calidad', tableX + c1 + c2 + c3 + 5, y + 12);
      doc.text('Observaciones', tableX + c1 + c2 + c3 + c4 + 5, y + 12);
      y += baseRowH;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 250);
    doc.setDrawColor(228);
    doc.rect(tableX, y, usableW, rowH, 'F');
    doc.rect(tableX, y, usableW, rowH, 'S');
    doc.setFontSize(9);
    doc.setTextColor(17, 18, 20);
    doc.text(factorLines, tableX + 5, y + 12);
    doc.text(r.score === null ? 'N/D' : String(r.score), tableX + c1 + 5, y + 12);
    const impactCol = r.score === null ? [140, 140, 140] : qualityColor(r.quality);
    doc.setTextColor(impactCol[0], impactCol[1], impactCol[2]);
    doc.text(r.level, tableX + c1 + c2 + 5, y + 12);
    doc.setFont(undefined, 'bold');
    doc.text(r.quality + '%', tableX + c1 + c2 + c3 + 5, y + 12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(17, 18, 20);
    doc.text(noteLines, tableX + c1 + c2 + c3 + c4 + 5, y + 12);
    y += rowH;
  });

  // ============ 7. GRÁFICA DE IMPACTOS ============
  const chartTop = scored.slice(0, 6);
  if (chartTop.length) {
    ensureSpace(chartTop.length * 28 + 60);
    sectionTitle(7, 'Gráfica — Impactos principales');
    const chartX = margin + 6;
    const chartW = usableW - 12;
    const barMaxW = chartW * 0.62;
    const labelArea = chartW * 0.26;
    const chartY0 = y;
    const barH = 15;
    const gap = 12;
    chartTop.forEach((f, i) => {
      const rowY = chartY0 + (barH + gap) * i;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 34, 34);
      doc.text(f.label, chartX, rowY + barH - 2);
      const barX = chartX + labelArea;
      const value = f.score || 0;
      const w = (value / 5) * barMaxW;
      const fc = qualityColor(f.quality);
      doc.setFillColor(232, 240, 236);
      doc.rect(barX, rowY, barMaxW, barH, 'F');
      doc.setFillColor(fc[0], fc[1], fc[2]);
      doc.rect(barX, rowY, w, barH, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      if (w > 22) { doc.setTextColor(255, 255, 255); doc.text(String(value), barX + w - 6, rowY + barH - 3, { align: 'right' }); }
      else { doc.setTextColor(6, 95, 70); doc.text(String(value), barX + w + 6, rowY + barH - 3); }
    });
    y = chartY0 + (barH + gap) * chartTop.length + 10;
  }

  // ============ 8. CONCLUSIÓN ============
  sectionTitle(8, 'Conclusión');
  let concl = 'Este informe sintetiza los factores PESTEL registrados y evalúa la calidad de las descripciones. ';
  concl += 'Priorice las áreas con impacto 4-5, atienda las sugerencias para elevar la calidad de las observaciones con menor sustento y documente evidencia (cifras, fuentes, plazos) para apoyar las decisiones. ';
  concl += 'Defina responsables y plazos para cada acción, y repita el análisis periódicamente para captar cambios del entorno.';
  addWrapped(concl, { fontSize: 10.5 });

  // ---- Footer final (asegurar presencia) ----
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('© Carlos Alfredo Castillo Flores - ITCPO - 2026', margin, FOOTER_Y);

  doc.save(filename);
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e){}
    ta.remove();
    return Promise.resolve();
  }
}

let currentSummary = '';

function bind() {
  const genBtn = get('#generateBtn');
  const copyBtn = get('#copyBtn');
  const downloadBtn = get('#downloadBtn');
  const saveJsonBtn = get('#saveJsonBtn');
  const resetBtn = get('#resetBtn');
  const sampleBtn = get('#sampleBtn');
  const helpBtn = get('#helpBtn');
  const helpPanel = get('#helpPanel');
  const closeHelp = get('#closeHelp');

  genBtn.addEventListener('click', ()=>{
    const analysis = generateAnalysis(readInputs());
    currentSummary = analysis.text;
    renderOutput(analysis);
  });

  copyBtn.addEventListener('click', async ()=>{
    const txt = currentSummary;
    if(!txt) return;
    await copyToClipboard(txt);
    copyBtn.textContent = 'Copiado ✓';
    setTimeout(()=>copyBtn.textContent = 'Copiar', 1500);
  });

  downloadBtn.addEventListener('click', ()=>{
    const data = readInputs();
    if(!currentSummary) return;
    generatePDF('pestel_report.pdf', data, currentSummary);
  });

  // Save analysis data as JSON
  if (saveJsonBtn) {
    saveJsonBtn.addEventListener('click', ()=>{
      const data = readInputs();
      const summary = currentSummary || generateAnalysis(data).text;
      const payload = {
        generatedAt: new Date().toISOString(),
        app: 'PESTEL_Sim',
        author: 'Carlos Alfredo Castillo Flores - ITCPO',
        data,
        summary
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pestel_analysis_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // provide quick feedback
      const prev = saveJsonBtn.textContent;
      saveJsonBtn.textContent = 'Guardado ✓';
      setTimeout(()=> saveJsonBtn.textContent = prev, 1400);
    });
  }

  resetBtn.addEventListener('click', ()=>{
    // reset inputs to defaults
    getAll('.score').forEach(s=>s.value = 3);
    getAll('.note').forEach(t=>t.value = '');
    currentSummary = '';
    renderOutput(null);
  });

  // Sample data button: fills inputs with example scores and notes
  sampleBtn.addEventListener('click', ()=>{
    const examples = {
      political: { score: 4, note: 'Inestabilidad política regional y cambios regulatorios.' },
      economic: { score: 5, note: 'Inflación alta y variaciones en tipos de interés.' },
      social: { score: 3, note: 'Cambios demográficos lentos, pero relevantes.' },
      tech: { score: 4, note: 'Rápida adopción de IA por competidores.' },
      env: { score: 2, note: 'Requisitos de sostenibilidad en evolución.' },
      legal: { score: 3, note: 'Nuevas normas de protección de datos en revisión.' }
    };
    Object.keys(examples).forEach(k=>{
      const s = document.querySelector(`[data-key="${k}-score"]`);
      const n = document.querySelector(`[data-key="${k}-note"]`);
      if(s) s.value = examples[k].score;
      if(n) n.value = examples[k].note;
    });
    // Update output immediately
    const analysis = generateAnalysis(readInputs());
    currentSummary = analysis.text;
    renderOutput(analysis);
  });

  // Load JSON button: trigger file selection and parse analysis payload
  const loadJsonBtn = get('#loadJsonBtn');
  const jsonFileInput = get('#jsonFileInput');

  if (loadJsonBtn && jsonFileInput) {
    loadJsonBtn.addEventListener('click', () => jsonFileInput.click());

    jsonFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(String(reader.result));
          // payload expected structure: { data: { political: {score,note}, ... }, summary: '...' }
          if (payload && payload.data) {
            Object.keys(payload.data).forEach(k => {
              const entry = payload.data[k];
              const s = document.querySelector(`[data-key="${k}-score"]`);
              const n = document.querySelector(`[data-key="${k}-note"]`);
              if (s) {
                s.value = (entry && entry.score !== undefined && entry.score !== null) ? entry.score : '';
              }
              if (n) {
                n.value = (entry && entry.note) ? entry.note : '';
              }
            });
            // Populate output: prefer provided summary, otherwise regenerate
            const provided = (payload.summary && typeof payload.summary === 'string') ? payload.summary : null;
            if (provided) { currentSummary = provided; renderOutput({ html: `<pre class="raw">${provided.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>` }); }
            else { const analysis = generateAnalysis(readInputs()); currentSummary = analysis.text; renderOutput(analysis); }
            // quick UI feedback
            const prev = loadJsonBtn.textContent;
            loadJsonBtn.textContent = 'Cargado ✓';
            setTimeout(()=> loadJsonBtn.textContent = prev, 1400);
          } else {
            alert('Archivo JSON inválido: no se encontró la propiedad "data".');
          }
        } catch (err) {
          alert('Error al leer JSON: ' + err.message);
        } finally {
          // reset input to allow reloading same file if needed
          jsonFileInput.value = '';
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  // Help button toggles the floating help panel
  function openHelp(){
    if(!helpPanel) return;
    helpPanel.setAttribute('aria-hidden','false');
    helpBtn.setAttribute('aria-expanded','true');
    helpPanel.classList.add('visible');
  }
  function closeHelpPanel(){
    if(!helpPanel) return;
    helpPanel.setAttribute('aria-hidden','true');
    helpBtn.setAttribute('aria-expanded','false');
    helpPanel.classList.remove('visible');
  }

  helpBtn && helpBtn.addEventListener('click', ()=>{
    if(helpPanel && helpPanel.classList.contains('visible')) closeHelpPanel();
    else openHelp();
  });
  closeHelp && closeHelp.addEventListener('click', closeHelpPanel);

  // Close help when clicking outside
  document.addEventListener('click', (e)=>{
    if(!helpPanel) return;
    if(helpPanel.classList.contains('visible')){
      if(!helpPanel.contains(e.target) && e.target !== helpBtn){
        closeHelpPanel();
      }
    }
  });

  // Live small preview when editing (debounced)
  let timeout = null;
  getAll('.score, .note').forEach(el=>{
    el.addEventListener('input', ()=>{
      clearTimeout(timeout);
      timeout = setTimeout(()=>{
        const analysis = generateAnalysis(readInputs());
        currentSummary = analysis.text;
        renderOutput(analysis);
      }, 650);
    });
  });

  // Start with an empty output until user provides data
  renderOutput('');
}

document.addEventListener('DOMContentLoaded', bind);
