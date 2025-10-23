import type { Store } from '@/app/api/store/route';

export function coverageByApartment(store: Store) {
  const latest: Record<string, string> = {};
  for (const l of store.ledger) {
    if (l.type !== 'RENT' || !l.apartmentId || !l.to) continue;
    const cur = latest[l.apartmentId];
    if (!cur || l.to > cur) latest[l.apartmentId] = l.to;
  }
  return latest; // { [apartmentId]: YYYY-MM-DD }
}
