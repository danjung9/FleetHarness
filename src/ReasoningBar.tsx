import { useEffect, useId, useRef, useState } from 'react';
import type { ReasoningEffort } from '../shared/reasoning';
import './reasoning-bar.css';

const labels: Record<ReasoningEffort, string> = {
  none: 'Off', minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'Extra high', max: 'Max', ultra: 'Ultra',
};

export function ReasoningBar({ levels, value, disabled, hint, onChange }: {
  levels: ReasoningEffort[]; value?: ReasoningEffort; disabled: boolean; hint: string;
  onChange: (effort: ReasoningEffort) => Promise<boolean>;
}) {
  const id = useId();
  const savedIndex = value ? Math.max(0, levels.indexOf(value)) : 0;
  const [index, setIndex] = useState(savedIndex);
  const saving = useRef(false);
  const levelKey = levels.join(',');
  useEffect(() => { setIndex(savedIndex); }, [savedIndex, levelKey]);
  const selected = levels[index];
  const label = selected ? labels[selected] : 'Model default';
  const locked = disabled || levels.length < 2;

  async function commit(next: number) {
    const effort = levels[next];
    if (locked || saving.current || !effort || effort === value) return;
    saving.current = true;
    try { if (!await onChange(effort)) setIndex(savedIndex); }
    finally { saving.current = false; }
  }

  return <div className={'reasoning-bar' + (locked ? ' is-disabled' : '')} title={hint}>
    <label className="reasoning-label" htmlFor={id}><span>Reasoning</span><span className="reasoning-value">{label}</span></label>
    <div className="reasoning-track">
      <div className="reasoning-steps" aria-hidden="true">
        {(levels.length ? levels : [undefined]).map((level, step) => <span key={level ?? 'default'} className={selected && step <= index ? 'filled' : ''}/>)}
      </div>
      <input id={id} type="range" min={0} max={Math.max(1, levels.length - 1)} step={1} value={index}
        disabled={locked} aria-label="Reasoning effort" aria-valuetext={label} aria-describedby={`${id}-hint`}
        onChange={event => setIndex(Number(event.target.value))}
        onPointerUp={event => void commit(Number(event.currentTarget.value))}
        onKeyUp={event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) void commit(Number(event.currentTarget.value)); }}
        onBlur={event => void commit(Number(event.currentTarget.value))}/>
    </div>
    <div className="reasoning-scale" aria-hidden="true"><span>Faster</span><span>Deeper</span></div>
    <span id={`${id}-hint`} className="model-selector-hint">{hint}</span>
  </div>;
}
