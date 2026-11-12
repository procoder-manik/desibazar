'use client';
import { useRef, useState } from 'react';
import { useApp } from '../Providers';
import { DownloadIcon } from '../Icons';
import { api } from '@/lib/api';

// Minimal RFC4180 CSV parser (quoted fields, commas and newlines inside quotes).
function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  const [head, ...body] = rows;
  const keys = (head || []).map((h) => h.trim().replace(/\s+/g, '').replace(/^./, (x) => x.toLowerCase()));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])));
}

const SAMPLE = `name,category,price,salePrice,stock,unit,description,image,images,featured,color,hex,size
Wild Forest Honey,Honey,850,790,40,500 g,Raw forest honey,https://example.com/honey.jpg,https://example.com/honey2.jpg|https://example.com/honey3.jpg,yes,,,
Cotton Tote Bag,Kitchen & Gifts,450,,0,1 pc,Reusable bag,,,no,Natural,#d8c9a8,
Cotton Tote Bag,Kitchen & Gifts,450,,0,1 pc,Reusable bag,,,no,Black,#222222,
`;

export default function Import() {
  const { token, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef(null);

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setErr(''); setResult(null);
    const parsed = parseCsv(await f.text());
    if (!parsed.length || !('name' in parsed[0])) return setErr('Could not read the file. The first row must be column names such as name, category, price (see the sample).');
    setRows(parsed);
  };
  const run = async () => {
    setBusy(true); setErr('');
    try { const r = await api('/admin/import/products', { method: 'POST', token, body: { rows } }); setResult(r); setRows(null); toast(`Imported: ${r.created} new, ${r.updated} updated`); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const sample = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + SAMPLE], { type: 'text/csv' })), download: 'product-import-sample.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="glass co-card">
      <div className="card-head"><h3>Import products from CSV</h3><button className="btn ghost sm" onClick={sample}><DownloadIcon size={14} /> Sample file</button></div>
      <p className="muted">Bring a whole catalogue in one go from Excel / Google Sheets (save as CSV). Rows with the same <b>name</b> become one product with several colour / size options. Existing products with the same name are updated. Categories are created automatically.</p>
      <p className="fine left">Columns: <code>name, category, price, salePrice, stock, unit, description, image, images (separated by |), featured (yes/no), color, hex, size</code>. Only name, category and price are required. Use your own photos or ones you have permission to use.</p>
      {err && <p className="err boxed">{err}</p>}
      {result && (
        <div className="refund-box"><b>Done:</b> {result.created} created, {result.updated} updated.{result.errors?.length > 0 && <ul>{result.errors.map((x) => <li key={x} className="err">{x}</li>)}</ul>}</div>
      )}
      {!rows ? (
        <button className="import-drop" onClick={() => file.current?.click()}><b>Choose a CSV file</b><small className="muted">or drop it here</small></button>
      ) : (
        <>
          <p><b>{rows.length}</b> rows ready. Preview of the first 8:</p>
          <div className="tablewrap preview-table">
            <table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Colour</th><th>Size</th></tr></thead>
              <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.category}</td><td>{r.price}</td><td>{r.stock}</td><td>{r.color}</td><td>{r.size}</td></tr>)}</tbody></table>
          </div>
          <div className="btnrow left" style={{ marginTop: 12 }}><button className="btn" disabled={busy} onClick={run}>{busy ? 'Importing…' : `Import ${rows.length} rows`}</button><button className="btn ghost" onClick={() => setRows(null)}>Choose another file</button></div>
        </>
      )}
      <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={pick} />
    </div>
  );
}
