/*
  Lightweight export utilities are intentionally small and browser-native.
  This keeps the frontend fast, avoids heavy PDF/DOCX dependencies, and
  supports the current assessment scope with clipboard, text download, and
  basic print support.

  Production integration could later add connectors for cloud document stores,
  server-side export services, or richer PDF/DOCX generation without changing
  the client export API surface.
*/

export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator?.clipboard?.writeText) {
    throw new Error('Clipboard API not available in this browser.');
  }

  await navigator.clipboard.writeText(text);
}

export function downloadAsText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function printSection(): void {
  // Basic browser print support is sufficient for prototype/demo use.
  // Future versions can extend this by rendering a dedicated printable DOM
  // subtree before invoking window.print().
  window.print();
}
