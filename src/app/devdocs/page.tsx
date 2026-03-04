import fs from 'fs';
import path from 'path';
import DevDocsClient from './DevDocsClient';

interface DocFile {
  key: string;
  label: string;
  content: string;
}

const DOC_FILES: { key: string; label: string; filename: string }[] = [
  { key: 'plan', label: '계획서', filename: '01_계획서.md' },
  { key: 'screen', label: '화면 구조도', filename: '02_화면구조도.md' },
  { key: 'flowchart', label: '플로우차트', filename: '06_플로우차트.md' },
  { key: 'datamap', label: '데이터맵', filename: '03_데이터맵.md' },
  { key: 'db', label: 'DB 설계', filename: '04_DB설계.md' },
  { key: 'checklist', label: '체크리스트', filename: '05_체크리스트.md' },
  { key: 'changelog', label: '화면 변경이력', filename: '' },
  { key: 'wizard-improvement', label: '마법사 개선안', filename: '07_마법사_개선안.md' },
];

export default function DevDocsPage() {
  const docsDir = path.join(process.cwd(), 'docs');

  const docs: DocFile[] = DOC_FILES.map((doc) => {
    // changelog는 커스텀 컴포넌트로 렌더링하므로 마크다운 불필요
    if (!doc.filename) {
      return { key: doc.key, label: doc.label, content: '' };
    }
    const filePath = path.join(docsDir, doc.filename);
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content = `# ${doc.label}\n\n문서를 찾을 수 없습니다.`;
    }
    return { key: doc.key, label: doc.label, content };
  });

  return <DevDocsClient docs={docs} />;
}
