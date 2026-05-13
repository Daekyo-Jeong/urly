// isInternalNavigation 로직 단위 테스트
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isInternalNavigation(targetUrl, baseUrl) {
  const targetDomain = getDomain(targetUrl);
  const baseDomain = getDomain(baseUrl);
  if (!targetDomain || !baseDomain) return true;

  const baseParts = baseDomain.split('.').slice(-2).join('.');
  const targetParts = targetDomain.split('.').slice(-2).join('.');

  if (targetParts === baseParts) return true;

  const oauthDomains = [
    'accounts.google.com',
    'login.microsoftonline.com',
    'appleid.apple.com',
    'github.com',
    'auth0.com',
  ];
  if (oauthDomains.some(d => targetDomain.includes(d))) return true;

  return false;
}

const tests = [
  // 같은 도메인
  ['https://mail.google.com', 'https://www.google.com', true, '같은 루트 도메인 (google.com)'],
  ['https://docs.google.com', 'https://www.google.com', true, '서브도메인 (docs)'],

  // 외부 도메인 → 시스템 브라우저
  ['https://www.naver.com', 'https://www.google.com', false, '완전 외부 도메인'],
  ['https://stackoverflow.com/questions', 'https://github.com', false, '외부 링크'],

  // OAuth 허용
  ['https://accounts.google.com/signin', 'https://www.notion.so', true, 'Google OAuth'],
  ['https://login.microsoftonline.com/auth', 'https://www.notion.so', true, 'Microsoft OAuth'],

  // 같은 사이트 내부
  ['https://www.notion.so/page/123', 'https://www.notion.so', true, 'Notion 내부 페이지'],
  ['https://github.com/user/repo', 'https://github.com', true, 'GitHub 내부 링크'],
];

let passed = 0;
let failed = 0;

for (const [target, base, expected, desc] of tests) {
  const result = isInternalNavigation(target, base);
  if (result === expected) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.log(`  ✗ ${desc}: expected ${expected}, got ${result}`);
    console.log(`    target=${target} base=${base}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
