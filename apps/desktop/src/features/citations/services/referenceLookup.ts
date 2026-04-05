import type { CitationLookupQuery, CitationLookupResult } from '../../../shared/contracts';

export interface ReferenceLookupService {
  lookupReference(query: CitationLookupQuery): Promise<CitationLookupResult>;
}

export function createReferenceLookupService(): ReferenceLookupService {
  return {
    async lookupReference(query) {
      return {
        query,
        candidates: [],
      };
    },
  };
}
