// 휴대폰(안드로이드 · PWA)의 뒤로 가기 버튼을 앱 안 화면 이동에 연결한다.
//
// history.state 모양
//   { nav: 'tab', tab: 'schedule' | 'fees' | 'concert' }  ← 탭 화면
//   { nav: 'modal' }                                      ← 모달 · 팝업 · 상세 창
//
// · 모달을 열면 히스토리 칸을 하나 쌓고, 뒤로 가기를 누르면 그 칸이 사라지면서
//   앱이 꺼지지 않고 열려 있던 모달부터 닫힌다.
// · 탭을 바꾸면 칸을 쌓고, 뒤로 가기를 누르면 이전 탭으로 돌아간다.
// · 모달의 닫기 · 저장 · 취소 버튼으로 닫을 때도 쌓아 둔 칸을 함께 지워
//   히스토리가 꼬이지 않게 한다.

import { useCallback, useEffect, useRef } from 'react';

const modalClosers = new Set();
let initialized = false;
let modalSeq = 0;

function currentState() {
  if (typeof window === 'undefined') return {};
  const state = window.history.state;
  return state && typeof state === 'object' ? state : {};
}

// 앱이 처음 열렸을 때의 칸을 '탭 화면' 칸으로 표시해 둔다.
export function initHistoryNav(initialTab) {
  if (initialized) return;
  initialized = true;
  const current = currentState();
  if (current.nav === 'tab' || current.nav === 'modal') return;
  try {
    window.history.replaceState(
      { ...current, nav: 'tab', tab: initialTab || 'schedule' },
      ''
    );
  } catch (e) {
    // 히스토리를 건드릴 수 없는 환경이면 그대로 둔다.
  }
}

// 탭 이동: 히스토리에 칸을 남겨 뒤로 가기로 이전 탭에 돌아올 수 있게 한다.
export function pushTabState(tab) {
  const current = currentState();
  try {
    if (current.nav === 'tab' && current.tab === tab) return;
    if (current.nav === 'modal') {
      // 모달이 열려 있던 칸을 새 탭 칸으로 바꿔 쓴다.
      // (모달은 아래에서 함께 닫히므로 빈칸이 남지 않는다)
      window.history.replaceState({ nav: 'tab', tab }, '');
    } else {
      window.history.pushState({ nav: 'tab', tab }, '');
    }
  } catch (e) {
    // noop
  }
}

export function pushModalState() {
  const navId = `modal-${++modalSeq}`;
  try {
    window.history.pushState({ nav: 'modal', navId }, '');
  } catch (e) {
    // noop
  }
  return navId;
}

// 모달을 화면에서 닫은 뒤, 그 모달이 차지하던 히스토리 칸 하나를 없앤다.
// 다른 창이 차지한 칸은 건드리지 않도록 navId로 확인한다.
export function popModalState(navId) {
  const current = currentState();
  if (current.nav !== 'modal') return;
  if (navId && current.navId !== navId) return;
  try {
    window.history.back();
  } catch (e) {
    // noop
  }
}

export function registerModalCloser(closeFn) {
  modalClosers.add(closeFn);
  return () => {
    modalClosers.delete(closeFn);
  };
}

// 뒤로 가기로 탭 화면에 도착했을 때: 열려 있던 모달 · 팝업을 모두 닫는다.
export function closeAllModals() {
  Array.from(modalClosers).forEach((closeFn) => {
    try {
      closeFn();
    } catch (e) {
      // noop
    }
  });
}

/**
 * 모달 · 팝업 · 상세 창에 뒤로 가기를 연결하는 훅.
 * 돌려주는 함수를 화면의 닫기 · 저장 · 취소 버튼(onClose)에 그대로 넘기면 된다.
 */
export function useModalBack(isOpen, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pushedRef = useRef(false);
  const navIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      pushedRef.current = false;
      navIdRef.current = null;
      return undefined;
    }
    if (!pushedRef.current) {
      pushedRef.current = true;
      navIdRef.current = pushModalState();
    }
    return registerModalCloser(() => closeRef.current());
  }, [isOpen]);

  return useCallback(() => {
    closeRef.current();
    popModalState(navIdRef.current);
  }, []);
}
