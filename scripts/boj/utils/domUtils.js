/**
 * 안전하게 DOM 요소를 선택하는 함수
 * @param {string} selector - CSS 선택자
 * @param {Document|Element} context - 검색 컨텍스트 (기본값: document)
 * @throws {parseException} 요소를 찾지 못한 경우
 */
export const safeQuerySelector = (selector, context = document) => {
  const element = $(selector, context);
  if (!element || element.length === 0) {
    throw new parseException(`Element not found for selector: ${selector}`);
  }
  return element;
};

/**
 * 안전하게 요소의 텍스트를 가져오는 함수
 * @param {JQuery<HTMLElement>} element - jQuery 요소
 * @param {string} errorMessage - 실패 시 에러 메시지
 * @throws {parseException} 텍스트가 비어있는 경우
 */
export const safeGetText = (element, errorMessage) => {
  const text = element.text();
  if (util.isEmpty(text)) {
    throw new parseException(errorMessage);
  }
  return text;
};

/**
 * DOM 요소 생성 함수
 * @param {string} tag - HTML 태그명
 * @param {Object} attributes - 요소 속성
 * @param {Array|Element} children - 자식 요소들
 */
export const createElement = (tag, attributes = {}, children = []) => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });

  if (Array.isArray(children)) {
    children.forEach((child) => element.appendChild(child));
  } else if (children) {
    element.appendChild(children);
  }

  return element;
};
