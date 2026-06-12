// sf3-generated | useViewMode: 전체/집중 뷰 모드 토글 훅

import { useState, useEffect } from 'react';

export type ViewMode = 'full' | 'focus';

export function useViewMode(initial: ViewMode = 'full') {
  const [mode, setMode] = useState<ViewMode>(initial);

  // body 클래스로 CSS 집중모드 트리거
  useEffect(() => {
    if (mode === 'focus') {
      document.body.classList.add('focus');
    } else {
      document.body.classList.remove('focus');
    }
    return () => {
      document.body.classList.remove('focus');
    };
  }, [mode]);

  const toggleMode = () =>
    setMode(m => (m === 'full' ? 'focus' : 'full'));

  return { mode, setMode, toggleMode };
}
