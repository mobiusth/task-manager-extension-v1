import type { JSONContent } from '@tiptap/react';
import React from 'react';
import type { RichTextContent } from './types';
import { vscode } from './vscode';

export const emptyRichText: RichTextContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }]
};

const taskContentGuideItems = [
  '개요',
  '진행상황',
  '관련 링크',
  '관련 메일'
];

export function createTaskContentTemplate(): RichTextContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: taskContentGuideItems.map((text) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text }]
            }
          ]
        }))
      }
    ]
  };
}

export function textToRichText(text: string): RichTextContent {
  const lines = text.trim() ? text.split(/\r?\n/) : [''];

  return linkifyRichTextContent({
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : undefined
    }))
  });
}

export function richTextToPlainText(content: JSONContent | string | undefined): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (content.text) {
    return content.text;
  }

  return (content.content || []).map(richTextToPlainText).join(' ').replace(/\s+/g, ' ').trim();
}

export function normalizeRichText(content: JSONContent | string | undefined): RichTextContent {
  if (typeof content === 'string') {
    return textToRichText(content);
  }

  if (content?.type === 'doc') {
    return linkifyRichTextContent(content as RichTextContent);
  }

  return emptyRichText;
}

export function linkifyRichTextContent(content: RichTextContent): RichTextContent {
  return linkifyNode(content) as RichTextContent;
}

export function renderRichText(content: JSONContent | undefined): React.ReactNode {
  if (!content) {
    return null;
  }

  if (content.type === 'doc') {
    return <>{(content.content || []).map((node, index) => renderNode(node, index))}</>;
  }

  return renderNode(content, 0);
}

function renderNode(node: JSONContent, key: React.Key): React.ReactNode {
  if (node.type === 'text') {
    return applyMarks(node.text || '', node.marks || [], key);
  }

  const children = (node.content || []).map((child, index) => renderNode(child, index));

  switch (node.type) {
    case 'heading': {
      const level = Number(node.attrs?.level || 2);
      return level === 1 ? <h3 key={key}>{children}</h3> : <h4 key={key}>{children}</h4>;
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return <ol key={key}>{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return <pre key={key}><code>{richTextToPlainText(node)}</code></pre>;
    case 'hardBreak':
      return <br key={key} />;
    case 'paragraph':
    default:
      return <p key={key}>{children.length > 0 ? children : <br />}</p>;
  }
}

function applyMarks(text: string, marks: NonNullable<JSONContent['marks']>, key: React.Key): React.ReactNode {
  const linkMark = marks.find((mark) => mark.type === 'link');
  const base = linkMark ? text : renderTextWithLinks(text, key);
  const formatted = marks.filter((mark) => mark.type !== 'link').reduce<React.ReactNode>((value, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{value}</strong>;
      case 'italic':
        return <em>{value}</em>;
      case 'strike':
        return <s>{value}</s>;
      case 'code':
        return <code>{value}</code>;
      default:
        return value;
    }
  }, <React.Fragment key={key}>{base}</React.Fragment>);

  if (linkMark) {
    const href = normalizeHref(String(linkMark.attrs?.href || ''));
    return href ? <ExternalLink key={key} href={href}>{formatted}</ExternalLink> : formatted;
  }

  return formatted;
}

function renderTextWithLinks(text: string, key: React.Key): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    appendLinkedText(parts, text.slice(lastIndex, match.index), `${key}-plain-${lastIndex}`);
    parts.push(renderAnchor(match[1], match[2], `${key}-md-${match.index}`));
    lastIndex = match.index + match[0].length;
  }

  appendLinkedText(parts, text.slice(lastIndex), `${key}-plain-${lastIndex}`);
  return <>{parts}</>;
}

function appendLinkedText(parts: React.ReactNode[], text: string, keyPrefix: string): void {
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  plainUrlRegex.lastIndex = 0;

  while ((match = plainUrlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<React.Fragment key={`${keyPrefix}-${lastIndex}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
    }
    parts.push(renderAnchor(match[0], match[0], `${keyPrefix}-url-${match.index}`));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<React.Fragment key={`${keyPrefix}-${lastIndex}`}>{text.slice(lastIndex)}</React.Fragment>);
  }
}

function renderAnchor(label: string, href: string, key: React.Key): React.ReactNode {
  const normalizedHref = normalizeHref(href);
  if (!normalizedHref) {
    return <React.Fragment key={key}>{label}</React.Fragment>;
  }

  return <ExternalLink key={key} href={normalizedHref}>{label}</ExternalLink>;
}

export function normalizeExternalHref(href: string): string {
  if (/^https?:\/\//i.test(href)) {
    return href;
  }

  if (/^www\./i.test(href)) {
    return `https://${href}`;
  }

  return '';
}

function normalizeHref(href: string): string {
  return normalizeExternalHref(href);
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        vscode?.postMessage({ action: 'openExternal', url: href });
      }}
    >
      {children}
    </a>
  );
}

const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
const plainUrlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;

function linkifyNode(node: JSONContent): JSONContent {
  if (node.type === 'text' || node.type === 'codeBlock' || !node.content) {
    return node;
  }

  return {
    ...node,
    content: linkifyChildren(node.content)
  };
}

function linkifyChildren(children: JSONContent[]): JSONContent[] {
  return children.flatMap((child) => {
    if (child.type !== 'text') {
      return [linkifyNode(child)];
    }

    return linkifyTextNode(child);
  });
}

function linkifyTextNode(node: JSONContent): JSONContent[] {
  const text = node.text || '';
  const marks = node.marks || [];

  if (!text || marks.some((mark) => mark.type === 'link' || mark.type === 'code')) {
    return [node];
  }

  const nodes: JSONContent[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  markdownLinkRegex.lastIndex = 0;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    appendTextNodes(nodes, text.slice(lastIndex, match.index), marks);
    appendMarkedTextNode(nodes, match[1], match[2], marks);
    lastIndex = match.index + match[0].length;
  }

  appendTextNodes(nodes, text.slice(lastIndex), marks);
  return nodes.length > 0 ? nodes : [node];
}

function appendTextNodes(nodes: JSONContent[], text: string, marks: NonNullable<JSONContent['marks']>): void {
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  plainUrlRegex.lastIndex = 0;

  while ((match = plainUrlRegex.exec(text)) !== null) {
    appendPlainTextNode(nodes, text.slice(lastIndex, match.index), marks);
    appendMarkedTextNode(nodes, match[0], match[0], marks);
    lastIndex = match.index + match[0].length;
  }

  appendPlainTextNode(nodes, text.slice(lastIndex), marks);
}

function appendPlainTextNode(nodes: JSONContent[], text: string, marks: NonNullable<JSONContent['marks']>): void {
  if (!text) {
    return;
  }

  nodes.push(marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text });
}

function appendMarkedTextNode(nodes: JSONContent[], text: string, href: string, marks: NonNullable<JSONContent['marks']>): void {
  const normalizedHref = normalizeExternalHref(href);
  if (!text || !normalizedHref) {
    appendPlainTextNode(nodes, text, marks);
    return;
  }

  nodes.push({
    type: 'text',
    text,
    marks: [
      ...marks,
      {
        type: 'link',
        attrs: {
          href: normalizedHref,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          class: null
        }
      }
    ]
  });
}
