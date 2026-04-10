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

function summarize(data) {
  // If there's no user-provided scores or notes, return empty (keep template blank)
  const allEmpty = Object.values(data).every(d => d.score === null && !d.note);
  if (allEmpty) return '';

  // Build a list including factors without scores (N/D)
  const withScore = Object.values(data).filter(d => d.score !== null);
  const withoutScore = Object.values(data).filter(d => d.score === null);

  // Sort scored factors descending by impact
  withScore.sort((a, b) => b.score - a.score);

  // Combined ordered list: highest impacts first, then N/D
  const ordered = withScore.concat(withoutScore);

  const lines = [];
  lines.push(`Resumen PESTEL — Generado: ${new Date().toLocaleString()}`);
  lines.push('');

  // Section: Ordered factors with details
  lines.push('1) Factores ordenados por impacto (mayor a menor):');
  ordered.forEach(f => {
    const scoreLabel = f.score === null ? 'N/D' : f.score;
    const note = f.note ? f.note : 'Sin observaciones';
    lines.push(`- ${f.label}: Impacto = ${scoreLabel} — ${note}`);
  });
  lines.push('');

  // Section: Agrupación por prioridad
  const high = withScore.filter(x => x.score >= 4);
  const medium = withScore.filter(x => x.score === 3);
  const low = withScore.filter(x => x.score <= 2);

  lines.push('2) Agrupación por prioridad:');
  if (high.length) {
    lines.push('  Prioridades altas (Impacto 4-5):');
    high.forEach(h => lines.push(`   • ${h.label} (Impacto ${h.score}) — ${h.note || 'Sin observaciones'}`));
  } else {
    lines.push('  Prioridades altas (Impacto 4-5): Ninguna identificada.');
  }
  if (medium.length) {
    lines.push('  Impacto medio (Impacto 3):');
    medium.forEach(m => lines.push(`   • ${m.label} (Impacto ${m.score}) — ${m.note || 'Sin observaciones'}`));
  }
  if (low.length) {
    lines.push('  Impacto bajo (Impacto 1-2):');
    low.forEach(l => lines.push(`   • ${l.label} (Impacto ${l.score}) — ${l.note || 'Sin observaciones'}`));
  }
  lines.push('');

  // Section: Recommendations synthesized from highest impacts
  lines.push('3) Recomendaciones sintetizadas:');
  if (high.length) {
    high.forEach(h => {
      lines.push(`- ${h.label}: Priorizar acciones de mitigación y seguimiento (Impacto ${h.score}). Considerar: políticas, recursos o planes contingentes relacionados.`);
    });
  } else {
    lines.push('- No se detectaron prioridades altas; mantener monitoreo regular y revisar cambios de contexto.');
  }

  // Additional targeted suggestions for medium and low impacts
  if (medium.length) {
    lines.push('- Impacto medio: validar acciones tácticas y monitorizar indicadores clave.');
  }
  if (low.length) {
    lines.push('- Impacto bajo: registrar observaciones y revisar periódicamente; baja prioridad operativa.');
  }

  lines.push('');
  lines.push('4) Observaciones finales:');
  lines.push('- Para un informe completo, exporte a PDF o copie este resumen y adjunte fuentes/evidencias relevantes.');

  return lines.join('\n');
}

function renderOutput(text) {
  const out = get('#output');
  out.textContent = text;
}

function generatePDF(filename, data, analysisText) {
  // Enhanced, professional multi-section PDF with a framed "cuadro de factores", table summary and chart
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const usableW = pageW - margin * 2;
  let y = margin;

  const setTitleBar = () => {
    doc.setFillColor(7, 73, 61);
    doc.rect(0, 0, pageW, 64, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Informe PESTEL', pageW / 2, 40, { align: 'center' });
    doc.setFontSize(9);
    doc.text('Powered by ITCPO', margin, 52);
    doc.setTextColor(17, 18, 20);
    y = 86;
  };

  const addWrapped = (text, opts = {}) => {
    const fontSize = opts.fontSize || 11;
    doc.setFontSize(fontSize);
    const split = doc.splitTextToSize(text, usableW);
    doc.text(split, margin, y);
    y += split.length * (fontSize * 1.25);
    if (y > pageH - margin - 80) {
      doc.addPage();
      setTitleBar();
    }
  };

  // Header
  setTitleBar();

  // Document meta
  doc.setFont(undefined, 'normal');
  addWrapped(`Fecha de generación: ${new Date().toLocaleString()}`, { fontSize: 10 });
  addWrapped(`Generado por: PESTEL_Sim — Copy Rigth Carlos Alfredo Castillo Flores - ITCPO - 2026`, { fontSize: 10 });
  y += 4;

  // Executive summary (concise)
  doc.setFont(undefined, 'bold');
  addWrapped('1. Resumen ejecutivo', { fontSize: 12 });
  doc.setFont(undefined, 'normal');
  addWrapped((analysisText && analysisText.split('\n').slice(0,6).join(' ')) || 'No hay resumen disponible. Complete los puntajes y notas para generar el análisis.', { fontSize: 11 });
  y += 6;

  // Small framed "cuadro de factores" for quick visualization
  // Prepare a compact grid with factor labels and large impact numbers
  const boxW = usableW;
  const boxX = margin;
  const boxY = y;
  const rows = 2;
  const cols = 3;
  const cellW = boxW / cols;
  const cellH = 44;
  const headerH = 16;

  // Add a title for the cuadro
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('Cuadro de factores — Impactos', boxX, boxY);
  y += 12;

  // Draw framed box background
  const cuadroY = y + 6;
  doc.setDrawColor(200);
  doc.setFillColor(250, 250, 251);
  doc.roundedRect(boxX - 4, cuadroY - 6, boxW + 8, rows * cellH + headerH + 12, 6, 6, 'F');
  doc.setLineWidth(0.8);
  doc.setDrawColor(220);
  doc.roundedRect(boxX - 4, cuadroY - 6, boxW + 8, rows * cellH + headerH + 12, 6, 6);

  // Draw grid and populate cells
  const factorKeys = Object.keys(data);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  // header area background
  doc.setFillColor(245, 245, 246);
  doc.rect(boxX - 4, cuadroY - 6, boxW + 8, headerH + 6, 'F');
  doc.setTextColor(34,34,34);
  doc.text('Factor', boxX, cuadroY + 6);

  // populate each cell
  factorKeys.forEach((k, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const xCell = boxX + col * cellW;
    const yCell = cuadroY + headerH + row * cellH;
    // cell border
    doc.setDrawColor(230);
    doc.rect(xCell, yCell, cellW, cellH, 'S');

    const f = data[k];
    // Factor label (small)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(17,17,17);
    doc.text(f.label, xCell + 8, yCell + 14);
    // Impact big number centered vertically
    const impactLabel = (f.score === null ? 'N/D' : String(f.score));
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    // color by severity
    if (f.score >= 4) doc.setTextColor(6,95,70);
    else if (f.score === 3) doc.setTextColor(102,102,102);
    else doc.setTextColor(140,140,140);
    // place impact number near right side of cell
    doc.text(impactLabel, xCell + cellW - 12, yCell + cellH / 2 + 6, { align: 'right' });
  });

  // advance y below cuadro
  y = cuadroY + headerH + rows * cellH + 18;

  // Detailed sections per factor with clear headings
  doc.setFont(undefined, 'bold');
  addWrapped('2. Análisis detallado por factor', { fontSize: 12 });
  doc.setFont(undefined, 'normal');
  Object.keys(data).forEach((k) => {
    const f = data[k];
    // Heading line
    doc.setFont(undefined, 'bold');
    addWrapped(`${f.label} — Impacto: ${f.score === null ? 'N/D' : f.score}`, { fontSize: 11 });
    doc.setFont(undefined, 'normal');
    addWrapped(f.note || 'Sin observaciones.', { fontSize: 11 });
    y += 4;
  });

  // Recommendations section
  y += 6;
  doc.setFont(undefined, 'bold');
  addWrapped('3. Recomendaciones', { fontSize: 12 });
  doc.setFont(undefined, 'normal');

  const scored = Object.values(data).filter(d => d.score !== null).sort((a, b) => b.score - a.score);
  const high = scored.filter(x => x.score >= 4);
  const medium = scored.filter(x => x.score === 3);
  const low = scored.filter(x => x.score <= 2);

  if (high.length) {
    addWrapped('Prioridades altas (Impacto 4-5):', { fontSize: 11 });
    high.forEach(h => addWrapped(`• ${h.label} (Impacto ${h.score}): ${h.note || 'Sin observaciones'}`, { fontSize: 10 }));
  } else {
    addWrapped('- No se identifican prioridades altas. Mantener monitoreo continuo.', { fontSize: 10 });
  }
  if (medium.length) addWrapped('- Impacto medio: validar acciones tácticas y monitorizar indicadores clave.', { fontSize: 10 });
  if (low.length) addWrapped('- Impacto bajo: documentación y revisión periódica.', { fontSize: 10 });

  // Insert a page break if needed before summary table and chart
  if (y > pageH - margin - 220) {
    doc.addPage();
    setTitleBar();
  }

  // Summary section with table
  y += 8;
  doc.setFont(undefined, 'bold');
  addWrapped('4. Resumen consolidado', { fontSize: 12 });
  doc.setFont(undefined, 'normal');
  y += 6;

  // Table header
  const tableX = margin;
  const tableY = y;
  // Adjusted column widths: more space for observations (notes)
  const col1W = usableW * 0.35; // Factor
  const col2W = usableW * 0.10; // Impacto
  const col3W = usableW * 0.55; // Observaciones (resumen)
  const baseRowH = 18;
  const paddingY = 6;

  doc.setFillColor(245, 245, 246);
  doc.rect(tableX, tableY, usableW, baseRowH + paddingY, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Factor', tableX + 6, tableY + 12);
  doc.text('Impacto', tableX + col1W + 6, tableY + 12);
  doc.text('Observaciones (resumen)', tableX + col1W + col2W + 6, tableY + 12);
  y = tableY + baseRowH + paddingY;

  doc.setFont(undefined, 'normal');
  Object.keys(data).forEach((k, idx) => {
    const f = data[k];
    const noteFull = (f.note || 'Sin observaciones').replace(/\s+/g, ' ');
    // Prepare wrapped text for observations column
    const noteLines = doc.splitTextToSize(noteFull, col3W - 10);
    const factorLines = doc.splitTextToSize(f.label, col1W - 10);

    // Determine row height based on the tallest cell (factor label or note)
    const linesCount = Math.max(noteLines.length, factorLines.length, 1);
    const rowH = linesCount * 12 + paddingY; // 12pt per line + padding

    // Add page if not enough space
    if (y + rowH > pageH - margin - 120) {
      doc.addPage();
      setTitleBar();
      y = margin + 20;
    }

    // row background alternating
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(250, 250, 251);
    }
    doc.rect(tableX, y, usableW, rowH, 'F');

    // Draw cell contents with wrapping where needed
    doc.setFontSize(10);
    doc.setTextColor(17, 18, 20);
    // Factor (may wrap)
    doc.text(factorLines, tableX + 6, y + 12);
    // Impact value centered vertically in that row area (left-aligned)
    doc.text(f.score === null ? 'N/D' : String(f.score), tableX + col1W + 6, y + 12);
    // Observations (wrapped)
    doc.text(noteLines, tableX + col1W + col2W + 6, y + 12);

    y += rowH;
  });

  // Chart: simple horizontal bar chart for scored factors (top 5)
  const chartTop = scored.slice(0, 6);
  if (chartTop.length) {
    // Ensure space
    if (y > pageH - margin - (chartTop.length * 28) - 120) {
      doc.addPage();
      setTitleBar();
      y = margin + 20;
    }
    y += 12;
    doc.setFont(undefined, 'bold');
    addWrapped('5. Gráfica — Impactos principales', { fontSize: 12 });
    y += 6;

    const chartX = margin + 6;
    const chartW = usableW - 12;
    const barMaxW = chartW * 0.65;
    const labelArea = chartW * 0.30;
    const chartStartY = y;
    const barH = 14;
    const gap = 10;

    // Draw axis baseline
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);

    chartTop.forEach((f, i) => {
      const rowY = chartStartY + (barH + gap) * i;
      // label
      doc.setFontSize(10);
      doc.setTextColor(34, 34, 34);
      doc.text(f.label, chartX, rowY + barH - 2);
      // bar background
      const barX = chartX + labelArea;
      const value = f.score || 0;
      const w = (value / 5) * barMaxW;
      doc.setFillColor(230, 243, 235);
      doc.rect(barX, rowY, barMaxW, barH, 'F');
      // bar fill
      doc.setFillColor(6, 95, 70);
      doc.rect(barX, rowY, w, barH, 'F');
      // value label
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      if (w > 22) {
        doc.text(String(value), barX + w - 6, rowY + barH - 3, { align: 'right' });
      } else {
        doc.setTextColor(6, 95, 70);
        doc.text(String(value), barX + w + 6, rowY + barH - 3);
      }
    });

    // advance y past chart
    y = chartStartY + (barH + gap) * chartTop.length + 8;
  }

  // Final summary paragraph
  y += 6;
  doc.setFont(undefined, 'bold');
  addWrapped('6. Conclusión', { fontSize: 12 });
  doc.setFont(undefined, 'normal');
  addWrapped('Este informe sintetiza los factores PESTEL introducidos. Priorice las áreas con impacto 4-5 y documente evidencia para apoyar decisiones. Exporte y comparta según sea necesario.', { fontSize: 11 });

  // Footer
  const footerY = pageH - 36;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('© Carlos Alfredo Castillo Flores - ITCPO - 2026', margin, footerY);
  doc.setTextColor(17, 18, 20);

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
    const data = readInputs();
    const text = summarize(data);
    renderOutput(text);
  });

  copyBtn.addEventListener('click', async ()=>{
    const txt = get('#output').textContent || '';
    if(!txt) return;
    await copyToClipboard(txt);
    copyBtn.textContent = 'Copiado ✓';
    setTimeout(()=>copyBtn.textContent = 'Copiar', 1500);
  });

  downloadBtn.addEventListener('click', ()=>{
    const data = readInputs();
    const txt = get('#output').textContent || '';
    if(!txt) return;
    generatePDF('pestel_report.pdf', data, txt);
  });

  // Save analysis data as JSON
  if (saveJsonBtn) {
    saveJsonBtn.addEventListener('click', ()=>{
      const data = readInputs();
      const summary = get('#output').textContent || summarize(data);
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
    renderOutput('');
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
    const txt = summarize(readInputs());
    renderOutput(txt);
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
            const summaryText = (payload.summary && typeof payload.summary === 'string') ? payload.summary : summarize(readInputs());
            renderOutput(summaryText);
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
        const data = readInputs();
        const text = summarize(data);
        renderOutput(text);
      }, 650);
    });
  });

  // Start with an empty output until user provides data
  renderOutput('');
}

document.addEventListener('DOMContentLoaded', bind);