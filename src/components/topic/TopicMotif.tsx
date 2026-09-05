export function TopicMotif({ categoryId }: { categoryId: string }) {
  return (
    <svg viewBox="0 0 100 72" fill="none" aria-hidden="true" focusable="false">
      {categoryId === 'math' ? <>
        <circle cx="39" cy="35" r="23" stroke="currentColor" strokeWidth="1.5" />
        <path d="M39 12 78 58H18Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.5" />
        <path d="M39 12v46" stroke="currentColor" strokeDasharray="3 3" />
        <circle cx="39" cy="35" r="2.5" fill="currentColor" />
      </> : categoryId === 'ai' ? <>
        <path d="m18 19 31 17-31 17m31-17 32-22M49 36l32 22M18 19l63 39M18 53l63-39" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" />
        {[[18,19],[18,53],[49,36],[81,14],[81,58]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="7" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" />)}
        <circle cx="49" cy="36" r="3" fill="currentColor" />
      </> : <>
        {[0,1,2,3].flatMap(x => [0,1,2].map(y => <rect key={`${x}-${y}`} x={18+x*17} y={12+y*17} width="13" height="13" rx="2" fill="currentColor" fillOpacity={(x+y)%3===0 ? .75 : .08} stroke="currentColor" strokeOpacity=".45" />))}
      </>}
    </svg>
  );
}
