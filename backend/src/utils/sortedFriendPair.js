/**
 * Canonical order for Friend documents and queries: lexicographically smaller id is userA.
 */
export function sortedFriendPair(idA, idB) {
  const a = idA.toString();
  const b = idB.toString();
  return a < b ? [a, b] : [b, a];
}
