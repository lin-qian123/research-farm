import type { BundleSummary } from '../contracts';

export type TreeNode = {
  groups: Map<string, TreeNode>;
  bundles: BundleSummary[];
};

export function buildBundleTree(bundles: BundleSummary[]) {
  const root: TreeNode = { groups: new Map(), bundles: [] };

  for (const bundle of bundles) {
    const segments = bundle.relativePath.split('/').filter(Boolean);
    const groupSegments = segments.slice(0, -1);
    let cursor = root;
    for (const segment of groupSegments) {
      if (!cursor.groups.has(segment)) {
        cursor.groups.set(segment, { groups: new Map(), bundles: [] });
      }
      cursor = cursor.groups.get(segment)!;
    }
    cursor.bundles.push(bundle);
  }

  return root;
}

export function collectAncestorGroupPaths(relativePath: string) {
  const segments = relativePath.split('/').filter(Boolean);
  const groupSegments = segments.slice(0, -1);
  const paths: string[] = [];
  const current: string[] = [];
  for (const segment of groupSegments) {
    current.push(segment);
    paths.push(current.join('/'));
  }
  return paths;
}
