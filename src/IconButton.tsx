import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  placement?: 'bottom' | 'right';
};

/** Keep compact controls named for screen readers, pointer users, and keyboard users. */
export function IconButton({ label, placement = 'bottom', children, className = 'icon-button', onFocus, onBlur, onMouseEnter, onMouseLeave, onKeyDown, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(placement === 'right'
      ? { left: rect.right + 10, top: Math.min(rect.top, window.innerHeight - 42) }
      : { left: Math.max(8, Math.min(rect.left, window.innerWidth - 204)), top: rect.bottom + 8 });
  }
  useEffect(() => {
    if (!position) return;
    const hide = () => setPosition(null);
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, true);
    return () => { window.removeEventListener('resize', hide); window.removeEventListener('scroll', hide, true); };
  }, [position]);
  return <>
    <button {...props} ref={ref} className={className} aria-label={label} aria-describedby={position ? id : undefined}
      onFocus={event => { show(); onFocus?.(event); }} onBlur={event => { setPosition(null); onBlur?.(event); }}
      onMouseEnter={event => { show(); onMouseEnter?.(event); }} onMouseLeave={event => { setPosition(null); onMouseLeave?.(event); }}
      onKeyDown={event => { if (event.key === 'Escape') { setPosition(null); event.stopPropagation(); } onKeyDown?.(event); }}>
      {children}
    </button>
    {position && createPortal(<span id={id} role="tooltip" className="control-tooltip" style={position}>{label}</span>, document.body)}
  </>;
}
