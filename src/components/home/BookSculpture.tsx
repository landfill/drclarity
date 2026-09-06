import { useId } from 'react';
import styles from './PopupBook.module.css';

interface BookSculptureProps {
  subject: 'math' | 'cs' | 'ai';
  page: string;
}

/** Layered paper cutouts, V-fold supports and fanned leaves share the book's central hinge. */
export function BookSculpture({ subject, page }: BookSculptureProps) {
  const theme = {
    math: { cloth: ['#365F50', '#12392D', '#285241'], edge: '#173E30', ribbon: '#B46546', label: 'GEOMETRY' },
    cs: { cloth: ['#365F50', '#12392D', '#285241'], edge: '#173E30', ribbon: '#A68C60', label: 'PIXELS & INFORMATION' },
    ai: { cloth: ['#365F50', '#12392D', '#285241'], edge: '#173E30', ribbon: '#A68C60', label: 'CONTEXT & CONVERSATION' },
  }[subject];
  const id = useId();
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className={styles.book} viewBox="0 60 680 440" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cloth`} x1="60" y1="390" x2="580" y2="460" gradientUnits="userSpaceOnUse"><stop stopColor={theme.cloth[0]} /><stop offset=".5" stopColor={theme.cloth[1]} /><stop offset="1" stopColor={theme.cloth[2]} /></linearGradient>
        <linearGradient id={`${id}-left`} x1="100" y1="340" x2="341" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="#FDF8E7" /><stop offset=".73" stopColor="#F1E9D2" /><stop offset="1" stopColor="#B8B29A" /></linearGradient>
        <linearGradient id={`${id}-right`} x1="340" y1="400" x2="591" y2="340" gradientUnits="userSpaceOnUse"><stop stopColor="#AAA58E" /><stop offset=".12" stopColor="#E8DEC2" /><stop offset=".48" stopColor="#FFF9E8" /><stop offset="1" stopColor="#EEE7D0" /></linearGradient>
        <linearGradient id={`${id}-sage`} x1="181" y1="160" x2="353" y2="355" gradientUnits="userSpaceOnUse"><stop stopColor="#B2C5A2" /><stop offset="1" stopColor="#6C926E" /></linearGradient>
        <linearGradient id={`${id}-forest`} x1="380" y1="145" x2="440" y2="345" gradientUnits="userSpaceOnUse"><stop stopColor="#6A9478" /><stop offset="1" stopColor="#315D46" /></linearGradient>
        <linearGradient id={`${id}-cream`} x1="235" y1="160" x2="393" y2="371" gradientUnits="userSpaceOnUse"><stop stopColor="#FFFDF1" /><stop offset=".7" stopColor="#F1E7CB" /><stop offset="1" stopColor="#D5C8A7" /></linearGradient>
        <linearGradient id={`${id}-coral`} x1="304" y1="145" x2="442" y2="282" gradientUnits="userSpaceOnUse"><stop stopColor="#E9AE87" /><stop offset="1" stopColor="#B86B50" /></linearGradient>
        <radialGradient id={`${id}-shadow`}><stop stopColor="#183827" stopOpacity=".3" /><stop offset="1" stopColor="#183827" stopOpacity="0" /></radialGradient>
        <pattern id={`${id}-grid`} width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" stroke="#476D4D" strokeOpacity=".18" strokeWidth=".7" /></pattern>
        <filter id={`${id}-paperShadow`} x="-30%" y="-20%" width="170%" height="170%"><feDropShadow dx="4" dy="6" stdDeviation="3" floodColor="#263F29" floodOpacity=".22" /></filter>
        <filter id={`${id}-softShadow`} x="-30%" y="-40%" width="170%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <ellipse cx="344" cy="453" rx="302" ry="42" fill={paint('shadow')} />
      {/* Cloth covers and individually drawn leaves, seen at a shallow reading angle. */}
      <path d="M73 321Q206 312 338 360Q474 312 606 320L635 431Q486 440 352 470Q341 476 327 470Q194 441 44 431Z" fill={theme.edge} stroke={theme.edge} strokeWidth="2" />
      <path d="M73 315Q207 307 340 352Q474 307 605 314L632 424Q474 436 351 464Q340 470 328 464Q193 435 47 424Z" fill={paint('cloth')} stroke="#66806A" />
      <path d="M56 421Q207 434 329 460Q341 466 351 460Q480 431 624 422" stroke="#BEAF78" strokeWidth=".9" />
      <path d="M84 310Q221 309 340 351Q460 311 594 309L616 417Q473 424 343 453Q215 424 63 416Z" fill="#E7DDC3" stroke="#B4A98B" />
      {[0, 1, 2, 3, 4, 5].map(n => <path key={n} d={`M${67 + n} ${400 + n * 2.7}Q208 ${404 + n * 2.8} 339 ${441 + n * 2}Q468 ${403 + n * 3} ${612 - n} ${400 + n * 2.7}`} stroke={n % 2 ? '#B4A78D' : '#FFFAE6'} strokeWidth="1" />)}
      <path d="M339 352Q349 401 357 446L370 475L381 465L394 469L374 439Q354 386 344 352" fill={theme.ribbon} />
      <path d="M86 302Q221 299 340 346V445Q216 414 67 400Z" fill={paint('left')} stroke="#BEB398" />
      <path d="M340 346Q466 299 592 301L613 400Q472 411 340 445Z" fill={paint('right')} stroke="#C5BA9E" />
      <g className={styles.leaves}>
        <path d="M96 287Q222 289 340 342V443Q224 400 76 389Z" fill="#E6DFC3" stroke="#BDB798" />
        <path d="M584 287Q452 289 340 342V443Q463 401 604 389Z" fill="#E8E0C6" stroke="#C4B99A" />
        <path d="M110 269Q234 286 340 339V441Q230 393 88 373Z" fill={paint('left')} stroke="#D5CBB0" />
        <path d="M571 269Q449 281 340 339V441Q454 393 593 373Z" fill={paint('right')} stroke="#D7CBAF" />
        <path d="M125 252Q234 273 340 337V436Q228 380 102 357Z" fill="#F7F0DA" stroke="#C9BEA1" />
        <path d="M555 250Q449 270 340 337V436Q457 378 578 355Z" fill="#F9F3DD" stroke="#C5B99A" />
        <path d="M137 265Q241 286 326 337M116 349Q225 371 324 419M548 264Q442 290 356 338M563 349Q452 374 355 419" stroke="#B9B295" strokeWidth=".7" />
        <path d="M340 337V444" stroke="#9C9880" strokeWidth="1.5" /><path d="M344 341V438" stroke="#FFF9E6" />
      </g>
      <g fill="#8E846D" fontSize="9" fontFamily="Georgia, serif">
        <text transform="matrix(1 .14 -.14 1 112 401)">DR. CLARITY / {theme.label}</text>
        <text transform="matrix(1 -.17 .17 1 555 402)">{page}</text>
      </g>

      <g className={styles.scene}>
        <ellipse cx="346" cy="352" rx="170" ry="34" fill="#365036" opacity=".16" filter={paint('softShadow')} />
        {subject === 'math' && <>
        {/* The rear V-fold is one continuous cut sheet: the bright edge marks its crease. */}
        <g className={styles.rearLayer} filter={paint('paperShadow')}>
          <path d="M159 311L176 213L207 225L219 153L249 174L270 110L303 146L340 81V361Z" fill={paint('sage')} stroke="#728D64" />
          <path d="M340 81L367 134L402 110L418 164L452 145L472 214L499 204L521 307L340 361Z" fill={paint('forest')} stroke="#3A6349" />
          <path d="M340 82V360" stroke="#D9E4BD" strokeWidth="1.5" />
          <path d="M177 305L202 236L232 251L248 189L277 215L300 168L322 195V329Z" fill="#E6ECD1" opacity=".65" />
          <path d="M359 163L388 203L411 181L430 245L457 231L486 299L359 337Z" fill="#234F39" opacity=".5" />
          <path d="M159 311L176 331L340 379L521 326L521 307L340 361Z" fill="#C3CBA6" stroke="#879972" />
          <path d="M159 311L340 361L521 307M340 361V379" stroke="#59734F" strokeDasharray="3 3" />
        </g>

        </>}

        {subject === 'ai' ? <>
          <g className={styles.rearLayer} filter={paint('paperShadow')}>
            {/* Speech-shaped paper leaves give this spread a rounded silhouette. */}
            <path d="M178 291V156Q178 137 198 137H301Q321 137 321 157V225Q321 244 301 244H252L221 273V245H196V320Z" fill="#E1E4D3" stroke="#9EAA8B" />
            <path d="M311 304V115Q311 96 332 96H441Q461 96 461 116V188Q461 207 441 207H403L374 234V207H331V320Z" fill="#A4B295" stroke="#718267" />
            <path d="M418 307V186Q418 170 435 170H486Q503 170 503 187V242Q503 257 486 257H475L454 278V257H438V329Z" fill="#C6CEB5" stroke="#8B9B7B" />
            <path d="M201 162H287M201 176H268M335 123H435M335 140H408M440 193H481M440 208H470" stroke="#FAF9E9" strokeWidth="5" strokeLinecap="round" />
            <path d="M178 291L195 330L340 377L503 328L503 307L340 356Z" fill="#D9DFC8" stroke="#9EAA8B" />
            <path d="M178 291L340 356L503 307M340 356V377" stroke="#98A384" strokeDasharray="3 3" />
          </g>
          {/* Separate conversation ribbons pass through an open, cut-paper window. */}
          <g className={styles.middleLayer} filter={paint('paperShadow')}>
            <path d="M199 333V183L215 168H439L461 188V333L340 373Z M223 209V316L340 351L435 319V209Z" fill={paint('cream')} fillRule="evenodd" stroke="#B3A27C" strokeWidth="1.5" />
            <path d="M207 181L224 174H435L451 189M223 209L231 217V313M435 209L426 217V312" stroke="#FFFEF0" strokeWidth="2" />
            <text x="248" y="196" fill="#5F7756" fontSize="13" letterSpacing="2">CONTEXT WINDOW</text>
            <path d="M223 209H435L426 217H231Z" fill="#B7AD88" />
            <path d="M435 209V319L426 312V217Z" fill="#B7AD88" />
            <path d="M199 333L211 352L340 391L461 352V333L340 373Z" fill="#DCD7B6" stroke="#A9A37E" />
            <path d="M340 373V391M199 333L340 373L461 333" stroke="#8E926D" strokeDasharray="3 3" />
          </g>
          <g className={styles.frontLayer} filter={paint('paperShadow')}>
            <path d="M155 224L234 240L244 218L330 234L351 219L475 231V261L351 249L330 265L244 249L234 270L155 255Z" fill="#D5DEC7" stroke="#8B9A76" />
            <path d="M234 240V270L244 249V218M330 234V265L351 249V219" stroke="#7D8F69" />
            <path d="M155 224L234 240M244 218L330 234M351 219L475 231" stroke="#FAF8E8" strokeWidth="2" />
            <path d="M264 233L309 242M369 235L451 243" stroke="#A2B28B" strokeWidth="3" />
            <path d="M177 272L257 289L275 269L344 285L366 270L491 285V318L366 303L344 318L275 302L257 322L177 305Z" fill="#E4D6B6" stroke="#AD9A70" />
            <path d="M257 289V322L275 302V269M344 285V318L366 303V270" stroke="#AE9E78" />
            <text transform="matrix(1 .12 0 1 378 292)" fill="#6F6246" fontSize="11">내 이름이 뭐였지?</text>
            <path d="M165 226L165 339L195 353V264" fill="#B8C4A4" stroke="#8B9A76" />
            <path d="M488 317L502 337L479 349L478 316" fill="#D3C9AC" stroke="#A69B79" />
          </g>
          <g className={styles.foregroundLayer} filter={paint('paperShadow')}>
            <path d="M198 327L288 349L309 335L357 351L376 338L487 323V353L376 370L357 383L309 366L288 381L198 358Z" fill="#839571" stroke="#5F7756" />
            <path d="M288 349V381L309 366V335M357 351V383L376 370V338" stroke="#E5E8CD" strokeWidth="1.2" />
            <text transform="matrix(1 .23 0 1 211 347)" fill="#FCF8E2" fontSize="10">대화가 쌓이면…</text>
          </g>
        </> : subject === 'cs' ? <>
          <g className={styles.rearLayer} filter={paint('paperShadow')}>
            {/* Stepped edges, square apertures and right-angle traces form a digital paper skyline. */}
            <path d="M164 315V214H200V161H238V119H284V154H316V94H355V351Z" fill="#CBD5C0" stroke="#8D9F7B" />
            <path d="M355 94H391V133H429V169H463V211H503V311L355 351Z" fill="#688675" stroke="#49664F" />
            <path d="M355 95V351" stroke="#F2F3DE" strokeWidth="1.5" />
            <g stroke="#EDF0D9" strokeWidth="2"><path d="M223 238V180H263V145M374 132V197H447V238M397 294V225H474V276" /><path d="M279 266V197H326V125" /></g>
            <g fill="#F5E0B1" stroke="#F2F3E5">{[[259,141],[322,121],[219,234],[443,234],[470,272]].map(([x,y]) => <rect key={x} x={x} y={y} width="8" height="8" />)}</g>
            <text x="373" y="164" fill="#F9F8E8" fontSize="12" fontFamily="monospace" letterSpacing="3">0101</text>
            <path d="M164 315L181 336L355 373L503 330V311L355 351Z" fill="#D9DFC9" stroke="#A0AE8A" />
            <path d="M164 315L355 351L503 311M355 351V373" stroke="#8B9B78" strokeDasharray="3 3" />
          </g>
          <g className={styles.middleLayer} filter={paint('paperShadow')}>
            <g transform="matrix(1 .12 0 1 188 168)">
              <path d="M-8-8H173V170H-8Z" fill="#EDF0E2" stroke="#90A17E" />
              <path d="M-5-5H170" stroke="#FFFDF0" strokeWidth="2" />
              <PixelMosaic />
              <rect x="80" y="40" width="40" height="40" stroke="#FFF5D4" strokeWidth="3" />
              <path d="M-8 170L9 187H157L173 170Z" fill="#CBD5BA" stroke="#91A17C" />
              <path d="M-8 170H173M9 187L0 160M157 187L160 160" stroke="#91A17C" strokeDasharray="3 3" />
              <text x="9" y="177" fill="#5C7556" fontSize="8" fontFamily="monospace">8 × 8 PIXELS</text>
            </g>
          </g>
          <g className={styles.frontLayer} filter={paint('paperShadow')}>
            {/* A square paper loupe enlarges the same four cells marked on the mosaic. */}
            <path d="M368 210L474 191L506 211V325L396 354L368 333Z" fill="#E0E5D0" stroke="#849773" />
            <path d="M368 210L397 229L506 211M397 229V354" stroke="#FAF9ED" strokeWidth="2" />
            <path d="M376 222L389 231V338L376 329Z" fill="#B9C8AA" />
            <g transform="matrix(1 -.2 0 1 405 239)">
              <rect x="-4" y="-4" width="88" height="88" fill="#3E604B" />
              <PixelMosaic enlarged />
              <path d="M40 0V80M0 40H80" stroke="#F2F4E4" />
            </g>
            <path d="M396 354L410 373L519 342L506 325Z" fill="#CBD7BC" stroke="#8C9F7B" />
            <path d="M396 354L506 325" stroke="#8B9B78" strokeDasharray="3 3" />
            <path d="M308 222L367 217M308 262L367 305" stroke="#879A75" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>
          <g className={styles.foregroundLayer} filter={paint('paperShadow')}>
            <path d="M181 349L265 364L291 346L356 370L404 356L426 368L500 347V373L426 395L404 382L356 396L291 372L265 390L181 375Z" fill="#597B5E" stroke="#3E604B" />
            <path d="M265 364V390L291 372V346M356 370V396M404 356V382L426 395V368" stroke="#C7D6B5" />
            <text transform="matrix(1 .18 0 1 194 367)" fill="#F6F3DF" fontFamily="monospace" fontSize="12">0 1 0 0 1</text>
            <text transform="matrix(1 -.27 0 1 442 380)" fill="#F6F3DF" fontSize="10">색을 담는 칸</text>
          </g>
        </> : <>
          {/* An arch is actually cut out; the layers behind remain visible through it. */}
          <g className={styles.middleLayer} filter={paint('paperShadow')}>
            <path d="M173 330V263C173 179 237 133 308 155C367 173 391 237 385 323L340 361Z M202 315L340 341L358 312C364 247 343 201 301 187C246 168 202 204 202 266Z" fill={paint('cream')} fillRule="evenodd" stroke="#B5AB87" strokeWidth="1.2" />
            <path d="M177 326V263C177 182 239 139 307 159" stroke="#FFFFF5" strokeWidth="2" />
            <path d="M202 315V266C202 205 246 168 301 187" stroke="#9A9C75" strokeWidth="2" />
            <path d="M173 330L190 349L340 380L385 343V323L340 361Z" fill="#D8D5B2" stroke="#A3A784" />
            <path d="M173 330L340 361L385 323M340 361V380" stroke="#87946D" strokeDasharray="3 3" />
            <g transform="matrix(.85 .15 0 1 213 250)" fill="#516C48" fontFamily="Georgia, serif" fontStyle="italic"><text fontSize="39">π</text></g>
            <path d="M213 258V317L243 323V254" stroke="#B5B494" />
          </g>
          <g className={styles.frontLayer} filter={paint('paperShadow')}>
            {/* The quarter-circle silhouette is the paper itself, without a rectangular backing. */}
            <g transform="matrix(1 .13 0 1 294 135)">
              <path d="M-6-8C105-8 188 82 188 189H-6Z" fill="#EDE3C7" stroke="#A8A583" strokeWidth="1.2" />
              <path d="M0 0A180 180 0 0 1 180 180H0Z" fill={paint('cream')} stroke="#5D7954" strokeWidth="2" />
              <path d="M0 0A180 180 0 0 1 180 180A90 90 0 0 0 90 90A90 90 0 0 0 0 0Z" fill={paint('coral')} stroke="#AD6B49" />
              <path d="M0 0A90 90 0 0 1 0 180M0 180A90 90 0 0 1 180 180" stroke="#5E7B53" strokeWidth="2" />
              <path d="M0 0V180H180M0 167H13V180" stroke="#5D7954" strokeWidth="1.5" />
              <path d="M-4-6C102-6 184 83 184 183" stroke="#FFFAE9" strokeWidth="1.5" />
              <text x="122" y="65" fill="#874830" fontSize="28" fontFamily="Georgia, serif" fontStyle="italic">?</text>
              <path d="M-6 189L10 207H168L188 189" fill="#CECEAB" stroke="#969E7B" />
              <path d="M0 180L10 207M180 180L168 207M-6 189H188" stroke="#8D9974" strokeDasharray="3 3" />
            </g>
            {/* A slit-in disc crosses the main sheet and folds back toward the centre. */}
            <path d="M221 326C221 280 252 249 291 251L339 364Z" fill="#B5C999" stroke="#72905D" />
            <path d="M291 251C329 257 355 300 355 350L339 364Z" fill="#779B6B" stroke="#5D8256" />
            <path d="M291 251L339 364" stroke="#EDF1CF" strokeWidth="1.5" />
            <path d="M221 326L235 345L339 381L355 366V350L339 364Z" fill="#D7DDBC" stroke="#8F9F77" />
            <path d="M221 326L339 364L355 350M339 364V381" stroke="#82986D" strokeDasharray="3 3" />
          </g>
          <g className={styles.foregroundLayer} filter={paint('paperShadow')}>
            {/* A low accordion strip joins the foreground on both sides of the gutter. */}
            <path d="M171 341L247 359L270 339L340 365L407 341L433 356L503 333V358L433 382L407 367L340 391L270 364L247 385L171 367Z" fill="#F0E7C7" stroke="#ADA881" />
            <path d="M247 359V385L270 364V339M340 365V391M407 341V367L433 382V356" stroke="#B8AE8B" />
            <path d="M171 341L247 359L270 339L340 365L407 341L433 356L503 333" stroke="#FFFEED" strokeWidth="2" />
            <text transform="matrix(1 .24 0 1 184 359)" fill="#6B7956" fontSize="12" fontFamily="Georgia, serif" fontStyle="italic">A = ?</text>
            <text transform="matrix(1 -.32 0 1 447 364)" fill="#6B7956" fontSize="10">한 조각의 발견</text>
          </g>
        </>}
        <g stroke="#6F7958" strokeWidth="1" opacity=".7">
          <path d="M142 363L172 370M146 372L171 378M516 366L539 359M514 375L544 365" />
        </g>
      </g>
    </svg>
  );
}

/** The full raster and its magnified four cells use the same source colors. */
function PixelMosaic({ enlarged = false }: { enlarged?: boolean }) {
  const rows = [
    '00000000',
    '00001100',
    '00000100',
    '00002000',
    '00022200',
    '02222220',
    '22233222',
    '33333333',
  ];
  const colors = ['#BDCAAD', '#DCC291', '#809B76', '#365C49'];
  const visibleRows = enlarged ? rows.slice(2, 4).map(row => row.slice(4, 6)) : rows;
  const size = enlarged ? 40 : 20;
  return <g>{visibleRows.flatMap((row, y) => [...row].map((cell, x) => <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size} height={size} fill={colors[Number(cell)]} stroke="#EDF1E0" strokeWidth=".6" />))}</g>;
}
