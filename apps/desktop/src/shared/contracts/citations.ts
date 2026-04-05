export type CitationLookupQuery = {
  rawText: string;
  blockId: string;
  bundleId: string;
};

export type CitationLookupCandidate = {
  title?: string | null;
  authors?: string[];
  year?: string | null;
  doi?: string | null;
  arxivId?: string | null;
  source?: string | null;
  confidence?: number | null;
};

export type CitationLookupResult = {
  query: CitationLookupQuery;
  candidates: CitationLookupCandidate[];
};
