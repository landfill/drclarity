import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// 본문 텍스트는 `.mdx` 파일에 두고 `page.tsx` 에서 import 한다 (#40).
// `pageExtensions` 는 확장하지 않는다 — MDX 를 라우트로 쓰지 않으므로,
// 주제 디렉터리의 `content.mdx` 가 라우트로 오인될 여지를 아예 없앤다.
const withMDX = createMDX({});

export default withMDX(nextConfig);
