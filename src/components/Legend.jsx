const ITEMS = [
  { level: 'low', color: '#4C9A6A', desc: 'Sun low/behind you or blocked' },
  { level: 'moderate', color: '#E8B93A', desc: 'Some direct exposure' },
  { level: 'high', color: '#D64545', desc: 'High UV, straight into the sun' },
];

export default function Legend() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface/90 backdrop-blur px-4 py-2.5">
      {ITEMS.map((item) => (
        <div key={item.level} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-muted whitespace-nowrap">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}
