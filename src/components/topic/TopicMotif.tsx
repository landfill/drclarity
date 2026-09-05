import type { ReactNode } from 'react';

interface TopicMotifProps {
  categoryId: string;
  slug: string;
}

/** Each topic gets a small visual cue; shared strokes and category colors keep the set coherent. */
function illustration(slug: string, categoryId: string): ReactNode {
  switch (slug) {
    case 'tokenizer':
      return <>
        <path d="M16 16h68M36 12v12m29-12v12" strokeDasharray="3 4" opacity=".5" />
        <rect x="13" y="29" width="22" height="28" rx="4" fill="currentColor" fillOpacity=".08" />
        <rect x="40" y="29" width="29" height="28" rx="4" fill="currentColor" fillOpacity=".16" />
        <rect x="74" y="29" width="13" height="28" rx="4" />
        <path d="m19 48 5-12 5 12m-8-4h6m20-8v12h9m24-12v12" />
      </>;
    case 'autoregressive':
      return <>
        {[14,39,64].map((x,i) => <rect key={x} x={x} y="22" width="20" height="23" rx="4" fill="currentColor" fillOpacity={i === 2 ? .25 : .06} />)}
        <path d="M34 34h5m20 0h5M74 50v9H24v-9m-4 4 4-4 4 4" />
        <path d="M74 28v11m-5-5h10" />
        <path d="M24 15h50" strokeDasharray="2 4" opacity=".4" />
      </>;
    case 'next-word':
      return <>
        <path d="M20 16v43h64" opacity=".5" />
        <rect x="29" y="36" width="10" height="23" rx="2" fill="currentColor" fillOpacity=".12" />
        <rect x="47" y="22" width="10" height="37" rx="2" fill="currentColor" fillOpacity=".3" />
        <rect x="65" y="45" width="10" height="14" rx="2" fill="currentColor" fillOpacity=".08" />
        <path d="m47 12 5 4 5-4" />
      </>;
    case 'prefill-decode':
      return <>
        <rect x="13" y="17" width="34" height="15" rx="3" fill="currentColor" fillOpacity=".2" />
        {[52,60,68,76,84].map(x => <path key={x} d={`M${x} 19v11`} />)}
        <rect x="13" y="43" width="14" height="15" rx="3" fill="currentColor" fillOpacity=".2" />
        {[32,40,48,56,64,72,80,88].map(x => <path key={x} d={`M${x} 45v11`} />)}
        <path d="M48 12v24M28 38v24" strokeDasharray="2 3" opacity=".5" />
      </>;
    case 'kv-cache':
      return <>
        <ellipse cx="33" cy="21" rx="18" ry="7" fill="currentColor" fillOpacity=".12" />
        <path d="M15 21v27c0 9 36 9 36 0V21M15 34c0 9 36 9 36 0" />
        <path d="M60 23a15 15 0 1 1-2 24m-1-10 1 10 10-1" />
        <path d="M26 45h14M63 34h12" opacity=".5" />
      </>;
    case 'context-limit':
      return <>
        <path d="M15 17h48M15 24h40" strokeDasharray="3 4" opacity=".45" />
        <rect x="11" y="30" width="77" height="31" rx="5" fill="currentColor" fillOpacity=".06" />
        <path d="M22 40h54M22 49h38M72 11v14m-4-4 4 4 4-4" />
        <path d="M65 49h11" strokeWidth="4" />
      </>;
    case 'cursor-context-cost':
      return <>
        <rect x="13" y="17" width="28" height="38" rx="4" />
        <path d="M19 25h16m-16 7h16m-16 7h10M47 36h12m-4-4 4 4-4 4" />
        <rect x="66" y="14" width="20" height="10" rx="2" fill="currentColor" fillOpacity=".08" />
        <rect x="66" y="28" width="20" height="12" rx="2" fill="currentColor" fillOpacity=".16" />
        <rect x="66" y="44" width="20" height="15" rx="2" fill="currentColor" fillOpacity=".3" />
      </>;
    case 'cursor-agent-loop-cost':
      return <>
        <path d="M15 17h21l6 6h36v34H15Z" fill="currentColor" fillOpacity=".06" />
        <path d="M15 23h26" />
        <circle cx="47" cy="39" r="10" fill="var(--color-surface)" />
        <path d="m54 46 12 12M76 11v16m-4-4 4 4 4-4" />
      </>;
    case 'geometry-area':
      return <>
        <path d="M21 60V12a48 48 0 0 1 48 48Z" fill="var(--color-danger-soft)" fillOpacity=".32" />
        <path d="M21 60a24 24 0 0 1 48 0M21 12a24 24 0 0 1 0 48" fill="var(--color-surface)" />
        <path d="M21 12v48h48" />
        <path d="M75 60h9m-63 6v-9" opacity=".45" />
      </>;
    case 'honey-pots':
      return <>
        {[13,39,65].map((x,i) => <g key={x}>
          <rect x={x+3} y="21" width="16" height="5" rx="2" />
          <rect x={x} y="29" width="22" height="28" rx="7" fill="currentColor" fillOpacity={i === 1 ? .22 : .04} />
          <path d={`M${x+5} 43h12`} opacity=".5" />
        </g>)}
        <path d="M50 9v6m-9-3 3 3m15-3-3 3" />
      </>;
    case 'monty-hall':
      return <>
        <path d="M12 60h77" opacity=".5" />
        <rect x="15" y="18" width="19" height="42" rx="2" />
        <path d="M42 18h19v42H42Zm0 0 13 8v40l-13-6" fill="currentColor" fillOpacity=".12" />
        <rect x="69" y="18" width="19" height="42" rx="2" />
        <path d="M29 40h1m52 0h1M22 11h57m-4-4 4 4-4 4" />
      </>;
    case 'monte-carlo-pi':
      return <>
        <rect x="23" y="10" width="52" height="52" rx="1" opacity=".5" />
        <circle cx="49" cy="36" r="26" />
        {[[29,17],[61,17],[43,22],[34,32],[57,31],[68,46],[27,51],[46,48],[59,57],[69,15],[39,57],[49,37]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="currentColor" stroke="none" />)}
      </>;
    case 'birthday-problem':
      return <>
        <rect x="12" y="18" width="33" height="39" rx="4" />
        <rect x="55" y="18" width="33" height="39" rx="4" />
        <path d="M12 29h33m10 0h33M21 13v10m15-10v10m28-10v10m15-10v10" />
        <circle cx="29" cy="42" r="7" fill="currentColor" fillOpacity=".2" />
        <circle cx="72" cy="42" r="7" fill="currentColor" fillOpacity=".2" />
        <path d="M45 43h10" strokeDasharray="2 3" />
      </>;
    case 'repeating-nines':
      return <>
        <text x="14" y="32" fontSize="21" fill="currentColor" stroke="none" fontFamily="var(--font-main), sans-serif">0.99…</text>
        <path d="M14 52h70m-5-5 5 5-5 5M40 47v10m15-10v10m10-10v10m6-10v10" />
        <circle cx="84" cy="52" r="3" fill="currentColor" />
      </>;
    case 'infinite-hotel':
      return <>
        {[12,32,52].map(x => <g key={x}><rect x={x} y="29" width="16" height="30" rx="2" /><path d={`M${x+11} 46h1M${x+8} 22h16m-4-4 4 4-4 4`} /></g>)}
        {[78,85,92].map(x => <circle key={x} cx={x} cy="46" r="1.4" fill="currentColor" stroke="none" />)}
        <path d="M12 62h80" opacity=".35" />
      </>;
    case 'floating-point':
      return <>
        <rect x="22" y="10" width="48" height="53" rx="5" />
        <rect x="29" y="17" width="34" height="13" rx="2" fill="currentColor" fillOpacity=".08" />
        <path d="M48 22h10m-7 4h7" />
        {[32,46,60].flatMap(x => [39,50].map(y => <rect key={`${x}-${y}`} x={x-2} y={y-2} width="4" height="4" rx="1" fill="currentColor" fillOpacity=".25" />))}
      </>;
    case 'sorting-race':
      return <>
        {[29,43,18,35,51].map((y,i) => <rect key={i} x={16+i*14} y={y} width="8" height={60-y} rx="2" fill="currentColor" fillOpacity={i === 2 ? .35 : .08} />)}
        <path d="M14 64h75M38 12h24m-4-4 4 4-4 4" />
      </>;
    case 'pixels':
      return <>
        {[0,1,2].flatMap(x => [0,1,2].map(y => <rect key={`${x}-${y}`} x={13+x*12} y={18+y*12} width="10" height="10" fill="currentColor" fillOpacity={(x+y)%2 ? .06 : .22} />))}
        <circle cx="69" cy="37" r="15" />
        <path d="m80 48 9 10" strokeWidth="3" />
        <path d="M64 37h10m-5-5v10" />
      </>;
    case 'utf8':
      return <>
        <text x="11" y="39" fontSize="25" fill="currentColor" stroke="none">가</text>
        <path d="M42 32h13m-4-4 4 4-4 4" />
        {[15,31,47].map((y,i) => <g key={y}><rect x="62" y={y} width="25" height="11" rx="2" fill="currentColor" fillOpacity={i === 0 ? .2 : .04} /><path d={`M67 ${y+4}v3m5-3v3m5-3v3m5-3v3`} strokeWidth="1" /></g>)}
      </>;
    case 'hashing':
      return <>
        <path d="M25 32c0-27 48-27 48 0v8M32 35c0-25 34-25 34-2v12c0 8-5 15-10 19M39 33c0-15 20-15 20 0v12c0 7-3 13-8 17M46 33c0-5 6-5 6 0v13c0 8-4 13-8 16M25 40c0 10-3 15-6 19M33 42c0 8-2 16-6 21M40 41c0 9-1 15-4 19M73 47c0 6-2 11-4 15" />
      </>;
    case 'key-exchange':
      return <>
        <circle cx="25" cy="26" r="9" fill="currentColor" fillOpacity=".08" />
        <path d="M33 26h18m-7 0v6m7-6v6M20 46h20m-4-4 4 4-4 4" />
        <circle cx="75" cy="46" r="9" fill="currentColor" fillOpacity=".18" />
        <path d="M66 46H49m7 0v-6m-7 6v-6M79 23H59m4-4-4 4 4 4" />
      </>;
    default:
      // New topics remain usable before a dedicated illustration is designed.
      return categoryId === 'ai'
        ? <><circle cx="29" cy="35" r="10" /><circle cx="70" cy="35" r="10" /><path d="M39 35h21m-5-5 5 5-5 5" /></>
        : <><circle cx="43" cy="34" r="22" /><path d="M43 12v44h35Z" fill="currentColor" fillOpacity=".1" /></>;
  }
}

/** Decorative SVG: the card title supplies the accessible topic name. */
export function TopicMotif({ categoryId, slug }: TopicMotifProps) {
  return (
    <svg viewBox="0 0 100 72" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-topic-motif={slug}>
      {illustration(slug, categoryId)}
    </svg>
  );
}
