import { useId, useState } from 'react';

export function ModelChoices({ label, value, options, disabled, onChange }: {
  label: string; value: string; options: { id: string; name: string; detail?: string }[];
  disabled?: boolean; onChange: (id: string) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState('');
  const visible = options.filter(option => `${option.name} ${option.id}`.toLowerCase().includes(search.toLowerCase()));
  return <fieldset className="model-choice-field" disabled={disabled}>
    <legend>{label}</legend>
    {options.length > 8 && <input aria-label={`Search ${label.toLowerCase()}`} type="search" value={search} placeholder={`Search ${label.toLowerCase()}`} onChange={event => setSearch(event.target.value)}/>}
    <div className="model-choice-list">
      {visible.map(option => <label key={option.id} className="model-choice">
        <input type="radio" name={id} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)}/>
        <span><strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}</span>
      </label>)}
      {!visible.length && <p className="connection-note">{options.length ? 'No matches. Try another search.' : 'Connect to load available models.'}</p>}
    </div>
  </fieldset>;
}
