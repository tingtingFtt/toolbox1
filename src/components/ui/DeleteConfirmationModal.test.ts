import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeleteConfirmationModal, DeleteConfirmationModalProps } from './UnifiedModal';

function render(props: DeleteConfirmationModalProps) {
  let tree: React.ReactNode;
  function Capture() { tree = DeleteConfirmationModal(props); return tree; }
  const html = renderToStaticMarkup(React.createElement(Capture));
  const elements: React.ReactElement[] = [];
  const visit = (value: React.ReactNode) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!React.isValidElement(value)) return;
    elements.push(value); visit(value.props.children);
  };
  visit(tree);
  return { html, elements };
}

test('bound deletion cannot start confirmation without explicit acknowledgement', () => {
  let confirmed = 0, closed = 0;
  const modal = render({ isOpen: true, onConfirm: () => confirmed++, onClose: () => closed++, message: '绑定世界书将从角色卡移除', requireAcknowledgement: true });
  assert.match(modal.html, /type="checkbox"/);
  const button = modal.elements.find(element => element.props.children === '确认删除 (第 1 次确认)')!;
  assert.equal(button.props.disabled, true);
  button.props.onClick();
  assert.equal(confirmed, 0); assert.equal(closed, 0);
});

test('busy deletion cannot confirm or close through its buttons or backdrop', () => {
  let confirmed = 0, closed = 0;
  const modal = render({ isOpen: true, onConfirm: () => confirmed++, onClose: () => closed++, message: '处理中', busy: true, closeOnConfirm: false });
  const confirm = modal.elements.find(element => element.props.children === '确认删除 (第 1 次确认)')!;
  const cancel = modal.elements.find(element => element.props.children === '取消')!;
  assert.equal(confirm.props.disabled, true); assert.equal(cancel.props.disabled, true);
  confirm.props.onClick();
  modal.elements.find(element => element.props['aria-label'] === '关闭遮罩')!.props.onClick();
  assert.equal(confirmed, 0); assert.equal(closed, 0);
  assert.match(modal.html, /z-\[2400\]/);
});

test('ordinary record deletion retains the existing confirmation flow', () => {
  const modal = render({ isOpen: true, onConfirm: () => {}, onClose: () => {}, message: '仅删除记录，资源保留' });
  assert.ok(!modal.html.includes('type="checkbox"'));
  const button = modal.elements.find(element => element.props.children === '确认删除 (第 1 次确认)')!;
  assert.equal(button.props.disabled, false);
  assert.equal(render({ isOpen: false, onConfirm: () => {}, onClose: () => {} }).html, '');
});
