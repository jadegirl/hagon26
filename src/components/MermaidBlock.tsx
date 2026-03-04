'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidIdCounter = 0;

interface MermaidBlockProps {
  chart: string;
}

/** Mermaid 다이어그램을 SVG로 렌더링하는 컴포넌트 */
export default function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 다크모드 감지
    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      themeVariables: isDark
        ? {
            primaryColor: '#3b82f6',
            primaryTextColor: '#f1f5f9',
            primaryBorderColor: '#60a5fa',
            lineColor: '#64748b',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            background: '#0f172a',
            mainBkg: '#1e293b',
            nodeBorder: '#475569',
            clusterBkg: '#1e293b',
            titleColor: '#f1f5f9',
            edgeLabelBackground: '#1e293b',
          }
        : {
            primaryColor: '#dbeafe',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#93c5fd',
            lineColor: '#94a3b8',
            secondaryColor: '#f0fdf4',
            tertiaryColor: '#fefce8',
            background: '#ffffff',
            mainBkg: '#f8fafc',
            nodeBorder: '#cbd5e1',
            clusterBkg: '#f8fafc',
            titleColor: '#1e293b',
            edgeLabelBackground: '#ffffff',
          },
    });

    const renderChart = async () => {
      try {
        const id = `mermaid-${++mermaidIdCounter}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
        setSvg(renderedSvg);
        setError('');
      } catch (err) {
        console.error('Mermaid 렌더링 오류:', err);
        setError(String(err));
        setSvg('');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 my-4">
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
          다이어그램 렌더링 오류
        </p>
        <pre className="text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center py-8 my-4">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">다이어그램 로딩 중...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
