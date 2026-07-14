export function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 60 ? "text-emerald-500" : score >= 30 ? "text-amber-500" : "text-red-500";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${score} 100`}
          className={color}
        />
      </svg>
      <div className="absolute text-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <p className="text-[10px] text-muted-foreground">visibility</p>
      </div>
    </div>
  );
}
