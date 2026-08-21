function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function inlineMd(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
}

// Minimal markdown-lite renderer for the AI's free-text report: headers, bold/italic,
// bullet lists, pipe tables and horizontal rules become real HTML so each section of the
// answer has a proper heading instead of being one unstructured block of text.
export function renderReportHtml(md?: string | null): string {
  if (!md || !md.trim()) return '<div style="color:#666;font-size:14px">No report available.</div>';
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let tableRows: string[] = [];

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  function flushTable() {
    if (!tableRows.length) return;
    const cells = (row: string) =>
      row
        .split("|")
        .map((c) => c.trim())
        .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));
    const head = cells(tableRows[0]);
    const body = tableRows.slice(1).filter((r) => !/^[\s|:-]+$/.test(r));
    html +=
      '<div style="overflow-x:auto"><table><thead><tr>' +
      head.map((c) => `<th>${inlineMd(c)}</th>`).join("") +
      "</tr></thead><tbody>" +
      body.map((r) => "<tr>" + cells(r).map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>").join("") +
      "</tbody></table></div>";
    tableRows = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (/^\|.*\|$/.test(line)) {
      tableRows.push(line);
      continue;
    }
    flushTable();
    if (!line) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      closeList();
      const lvl = Math.min(h[1].length + 2, 5);
      html += `<h${lvl} style="margin:16px 0 8px;font-size:${lvl <= 3 ? "16px" : "14px"}">${inlineMd(h[2].replace(/\*\*/g, ""))}</h${lvl}>`;
      continue;
    }
    if (/^-{3,}$/.test(line)) {
      closeList();
      html += '<div style="height:1px;background:#141414;margin:12px 0"></div>';
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) {
        html += '<ul style="margin:6px 0;padding-left:20px">';
        inList = true;
      }
      html += `<li style="margin:3px 0;font-size:14px">${inlineMd(li[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p style="font-size:14px;margin:8px 0;line-height:1.65">${inlineMd(line)}</p>`;
  }
  closeList();
  flushTable();
  return html;
}
