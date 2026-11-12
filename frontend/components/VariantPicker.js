'use client';
import { useEffect, useState } from 'react';
import { findVariant, options } from '@/lib/product';

// Colour swatches + size chips. Calls onChange(variant | null) whenever the selection resolves.
export default function VariantPicker({ product: p, onChange }) {
  const { colors, sizes } = options(p);
  const first = (p.variants || []).find((v) => v.stock > 0) || p.variants?.[0];
  const [color, setColor] = useState(first?.color || '');
  const [size, setSize] = useState(first?.size || '');

  useEffect(() => { onChange(p.variants?.length ? findVariant(p, color, size) || null : null); }, [color, size, p]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p.variants?.length) return null;
  const stockOf = (c, s) => findVariant(p, c, s)?.stock ?? 0;
  const v = findVariant(p, color, size);

  return (
    <div className="vpick">
      {colors.length > 0 && (
        <div className="vrow">
          <small>Colour <b>{color}</b></small>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {colors.map((c) => {
              const out = stockOf(c.name, size || undefined) < 1 && stockOf(c.name) < 1;
              return (
                <button key={c.name} type="button" role="radio" aria-checked={color === c.name} aria-label={c.name} title={c.name}
                  className={'swatch' + (color === c.name ? ' on' : '') + (out ? ' out' : '')} style={{ '--sw': c.hex }}
                  onClick={() => { setColor(c.name); if (size && !findVariant(p, c.name, size)) setSize(findVariant(p, c.name)?.size || ''); }} />
              );
            })}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div className="vrow">
          <small>Size <b>{size}</b></small>
          <div className="chipsel" role="radiogroup" aria-label="Size">
            {sizes.map((s) => {
              const exists = !!findVariant(p, color || undefined, s);
              const out = !exists || stockOf(color || undefined, s) < 1;
              return <button key={s} type="button" role="radio" aria-checked={size === s} disabled={!exists} className={(size === s ? 'on' : '') + (out ? ' out' : '')} onClick={() => setSize(s)}>{s}</button>;
            })}
          </div>
        </div>
      )}
      {v && <p className={'stock ' + (v.stock < 1 ? 'out' : v.stock <= 5 ? 'low' : 'in')}>{v.stock < 1 ? 'This option is sold out' : v.stock <= 5 ? `Only ${v.stock} left` : 'In stock'}</p>}
    </div>
  );
}
