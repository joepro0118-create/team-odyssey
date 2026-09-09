const MAX_CONTEXT = 8000;
const EXCLUDED = 'script, style, noscript, video, canvas, input, textarea, select, [hidden], [aria-hidden="true"], [data-chat-private]';

/** Scan the rendered active module, never the chat, camera or raw form values. */
export function scanPageContext(root = document, source = 'Sample preview') {
  const canvas = root.querySelector('.canvas');
  if (!canvas) return { module: '', content: '' };
  const viewport = canvas.getBoundingClientRect();
  const panels = [...canvas.querySelectorAll(':scope > .column')];
  const panel = panels.sort((a, b) => {
    const overlap = (el) => {
      const box = el.getBoundingClientRect();
      return Math.max(0, Math.min(box.right, viewport.right) - Math.max(box.left, viewport.left));
    };
    return overlap(b) - overlap(a);
  })[0];
  if (!panel) return { module: '', content: '' };
  const module = panel.querySelector('.col-title')?.textContent.trim().slice(0, 100) || 'Odyssey';
  const walker = root.createTreeWalker(panel, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el || el.closest(EXCLUDED) || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const style = getComputedStyle(el);
      if (!el.getClientRects().length || style.visibility === 'hidden' || style.display === 'none') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let content = `Assessment source: ${source}\n`;
  while (walker.nextNode() && content.length < MAX_CONTEXT) {
    content += `${walker.currentNode.textContent.replace(/\s+/g, ' ').trim()}\n`;
  }
  return { module, content: content.slice(0, MAX_CONTEXT) };
}
