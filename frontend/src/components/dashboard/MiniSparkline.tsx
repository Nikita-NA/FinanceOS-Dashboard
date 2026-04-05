import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  values: number[];
  color: string;
  height?: number;
}

export function MiniSparkline({ values, color, height = 36 }: MiniSparklineProps) {
  const data = values.map((v, i) => ({ i, v }));
  if (data.length < 2) {
    return <div style={{ height }} className="w-full rounded bg-slate-100" />;
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
