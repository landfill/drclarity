import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * dev 서버는 자기가 초기화된 호스트(`localhost`)에서 온 요청만 dev 전용 asset 에
   * 응답한다. 다른 origin 은 기본 차단이다.
   *
   * 그래서 `127.0.0.1:3000` 으로 열면 HTML 은 멀쩡히 오지만 hydration 이 조용히
   * 끝나지 않는다 — 콘솔에 에러 한 줄 없이 모든 버튼과 애니메이션이 죽고, 라디오만
   * 브라우저 기본 동작으로 체크된다. 같은 페이지가 `localhost:3000` 에서는 멀쩡해서
   * 앱 결함으로 오인하기 쉽다.
   *
   * `localhost` 와 `127.0.0.1` 은 같은 곳을 가리키므로 둘 다 열어 둔다.
   * 개발 전용 설정이고 프로덕션 빌드에는 영향이 없다.
   */
  allowedDevOrigins: ['127.0.0.1'],
};

// 본문 텍스트는 `.mdx` 파일에 두고 `page.tsx` 에서 import 한다 (#40).
// `pageExtensions` 는 확장하지 않는다 — MDX 를 라우트로 쓰지 않으므로,
// 주제 디렉터리의 `content.mdx` 가 라우트로 오인될 여지를 아예 없앤다.
const withMDX = createMDX({});

export default withMDX(nextConfig);
