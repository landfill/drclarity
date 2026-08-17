// 주제 레지스트리 생성기.
//
// 순수 JavaScript로 작성한다 (MUST). TypeScript 타입 주석을 쓰면 Node의 타입 스트리핑이
// 필요해지고(Node 22.18+), 그러면 빌드가 실행 환경의 Node 버전에 의존하게 된다.
// 이 스크립트는 postinstall/prebuild에서 돌기 때문에 어떤 Node 버전에서도 실행돼야 한다.
import fs from 'fs';
import path from 'path';

const TOPICS_DIR = path.join(process.cwd(), 'src/app/(topics)');
const REGISTRY_OUT = path.join(process.cwd(), 'src/content/registry.generated.ts');
const TAGS_DICT = path.join(process.cwd(), 'src/content/tags.json');

function isKebabCase(str) {
  return /^[a-z0-9-]+$/.test(str);
}

function loadAllowedTags() {
  try {
    const raw = JSON.parse(fs.readFileSync(TAGS_DICT, 'utf8'));
    return Array.isArray(raw.allowed) ? new Set(raw.allowed) : null;
  } catch {
    return null;
  }
}

/**
 * meta.ts 원문에서 tags 배열의 문자열 리터럴을 뽑는다.
 * 정적 리터럴이 아니면(변수 참조 등) null 을 돌려주고 검증을 건너뛴다.
 */
function extractTags(metaContent) {
  const match = metaContent.match(/tags:\s*\[([^\]]*)\]/);
  if (!match) return null;
  const body = match[1].trim();
  if (body === '') return [];
  const literals = body.match(/'[^']*'|"[^"]*"/g);
  if (!literals) return null;
  // 리터럴이 아닌 요소가 섞여 있으면 판단하지 않는다.
  if (literals.length !== body.split(',').filter((s) => s.trim() !== '').length) return null;
  return literals.map((s) => s.slice(1, -1));
}

/**
 * 태그 사전 검증. 컨텐츠 품질 점검이라 경고만 한다 — 이 스크립트는 postinstall 에서
 * 돌기 때문에 오타 하나로 npm install 이 실패하면 안 된다.
 */
function warnUnknownTags(allowedTags, label, metaContent) {
  if (!allowedTags) return;
  const tags = extractTags(metaContent);
  if (!tags) return;
  for (const tag of tags) {
    if (!allowedTags.has(tag.normalize('NFC'))) {
      console.warn(
        `${label}: 사전에 없는 태그 '${tag}'. src/content/tags.json 에 추가하거나 표기를 맞추세요.`
      );
    }
  }
}

function run() {
  if (!fs.existsSync(TOPICS_DIR)) {
    fs.mkdirSync(TOPICS_DIR, { recursive: true });
  }

  const categories = fs.readdirSync(TOPICS_DIR).filter((d) => {
    const stat = fs.statSync(path.join(TOPICS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  });

  const allowedTags = loadAllowedTags();

  let imports = '';
  const allTopicsData = [];
  let categoriesArray = '';

  const categoryIds = [];

  for (const catId of categories) {
    if (!isKebabCase(catId)) {
      console.error(`${catId}: 디렉터리명은 kebab-case여야 합니다.`);
      process.exit(1);
    }
    const catPath = path.join(TOPICS_DIR, catId);
    if (!fs.existsSync(path.join(catPath, 'category.ts'))) {
      console.error(`${catId}: category.ts가 없습니다.`);
      process.exit(1);
    }

    categoryIds.push(catId);
    const catImportName = `category_${catId.replace(/-/g, '_')}`;
    imports += `import ${catImportName} from '@/app/(topics)/${catId}/category';\n`;

    const topics = fs.readdirSync(catPath).filter((d) => {
      const stat = fs.statSync(path.join(catPath, d));
      return stat.isDirectory() && !d.startsWith('.');
    });

    const ordersInCat = new Set();

    for (const slug of topics) {
      if (!isKebabCase(slug)) {
        console.error(`${catId}/${slug}: 디렉터리명은 kebab-case여야 합니다.`);
        process.exit(1);
      }
      const topicPath = path.join(catPath, slug);

      const subdirs = fs
        .readdirSync(topicPath)
        .filter((d) => fs.statSync(path.join(topicPath, d)).isDirectory());
      if (subdirs.length > 0) {
        console.error(`${catId}/${slug}: 주제 디렉터리는 2단계까지만 지원합니다.`);
        process.exit(1);
      }

      const hasMeta = fs.existsSync(path.join(topicPath, 'meta.ts'));
      const hasPage = fs.existsSync(path.join(topicPath, 'page.tsx'));

      if (hasMeta && !hasPage) {
        console.error(`${catId}/${slug}: meta.ts는 있으나 page.tsx가 없습니다.`);
        process.exit(1);
      }
      if (hasPage && !hasMeta) {
        console.error(`${catId}/${slug}: page.tsx에 대응하는 meta.ts가 없습니다.`);
        process.exit(1);
      }

      if (hasMeta && hasPage) {
        const metaContent = fs.readFileSync(path.join(topicPath, 'meta.ts'), 'utf8');
        const orderMatch = metaContent.match(/order:\s*(\d+)/);
        if (orderMatch) {
          const order = parseInt(orderMatch[1], 10);
          if (ordersInCat.has(order)) {
            console.warn(
              `${catId}/${slug}: 같은 카테고리 안에 order 중복 발견 (${order}). slug 사전순으로 정렬됩니다.`
            );
          }
          ordersInCat.add(order);
        }

        warnUnknownTags(allowedTags, `${catId}/${slug}`, metaContent);

        const topicImportName = `meta_${catId.replace(/-/g, '_')}_${slug.replace(/-/g, '_')}`;
        imports += `import ${topicImportName} from '@/app/(topics)/${catId}/${slug}/meta';\n`;

        allTopicsData.push(
          `  { ...${topicImportName}, status: ${topicImportName}.status ?? 'published', slug: '${slug}', categoryId: '${catId}', href: '/${catId}/${slug}' }`
        );
      }
    }

    categoriesArray += `  { ...${catImportName}, id: '${catId}', href: '/${catId}', topics: allTopics.filter(t => t.categoryId === '${catId}' && t.status === 'published').sort((a,b) => a.order !== b.order ? a.order - b.order : a.slug.localeCompare(b.slug)) },\n`;
  }

  const categoryIdType =
    categoryIds.length > 0 ? categoryIds.map((c) => `'${c}'`).join(' | ') : 'string';

  const out = `// AUTO-GENERATED by scripts/generate-topic-registry.mjs — DO NOT EDIT.
import type { CategoryEntry, TopicEntry } from './types';

${imports}
export type CategoryId = ${categoryIdType};

export const allTopics: TopicEntry[] = [
${allTopicsData.join(',\n')}
];

export const allCategories: CategoryEntry[] = [
${categoriesArray}
];
allCategories.sort((a,b) => a.order - b.order);
`;

  fs.mkdirSync(path.dirname(REGISTRY_OUT), { recursive: true });
  fs.writeFileSync(REGISTRY_OUT, out, 'utf-8');
}

run();
