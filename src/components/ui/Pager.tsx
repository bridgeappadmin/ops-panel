import { Button } from './Button';

/** "Page n of N" with Previous / Next, as a card's footer. Renders nothing for a single page. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
      <span className="text-small text-ink-muted">Page {page} of {totalPages}</span>
      <span className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </span>
    </nav>
  );
}
