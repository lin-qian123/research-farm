import { memo, useEffect, useState } from 'react';
import type { LoadedBundle } from '../../../shared/contracts';
import { useAppServices } from '../../../app/providers/AppServicesProvider';

const NATIVE_ASSET_CACHE = new Map<string, string>();
const IMAGE_META_CACHE = new Map<string, { width: number; height: number }>();

function normalizeAssetPath(value: string) {
  return decodeURIComponent(value).replace(/\\/g, '/').replace(/^\.?\//, '');
}

type ReaderImageProps = {
  bundle: LoadedBundle;
  src?: string;
  alt?: string;
};

export const ReaderImage = memo(function ReaderImage({ bundle, src, alt }: ReaderImageProps) {
  const { assetService } = useAppServices();
  const normalized = src ? normalizeAssetPath(src) : '';
  const cacheKey = bundle.bundlePath && normalized ? `${bundle.bundlePath}:${normalized}` : '';
  const initialResolvedSrc =
    (!src ? '' : /^(https?:|data:|blob:)/.test(src) ? src : bundle.assetUrls?.[normalized] || (cacheKey ? NATIVE_ASSET_CACHE.get(cacheKey) || '' : ''));
  const initialDimensions = initialResolvedSrc ? IMAGE_META_CACHE.get(initialResolvedSrc) || null : null;
  const [resolvedSrc, setResolvedSrc] = useState(initialResolvedSrc);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(initialDimensions);
  const [isDecoded, setIsDecoded] = useState(Boolean(initialResolvedSrc && initialDimensions));

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!src) {
        setResolvedSrc('');
        setDimensions(null);
        setIsDecoded(false);
        return;
      }

      if (/^(https?:|data:|blob:)/.test(src)) {
        setResolvedSrc(src);
        return;
      }

      if (bundle.assetUrls?.[normalized]) {
        setResolvedSrc(bundle.assetUrls[normalized]!);
        return;
      }

      if (bundle.bundlePath) {
        if (NATIVE_ASSET_CACHE.has(cacheKey)) {
          setResolvedSrc(NATIVE_ASSET_CACHE.get(cacheKey)!);
          return;
        }

        try {
          const nextSrc = await assetService.loadAsset(bundle.bundlePath, normalized);
          NATIVE_ASSET_CACHE.set(cacheKey, nextSrc);
          if (!cancelled) {
            setResolvedSrc(nextSrc);
          }
          return;
        } catch {
          if (!cancelled) {
            setResolvedSrc('');
          }
          return;
        }
      }

      setResolvedSrc(src);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [assetService, bundle, cacheKey, normalized, src]);

  useEffect(() => {
    let cancelled = false;

    if (!resolvedSrc) {
      setDimensions(null);
      setIsDecoded(false);
      return;
    }

    if (IMAGE_META_CACHE.has(resolvedSrc)) {
      setDimensions(IMAGE_META_CACHE.get(resolvedSrc)!);
      setIsDecoded(true);
      return;
    }

    setIsDecoded(false);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const nextDimensions = {
        width: image.naturalWidth || 4,
        height: image.naturalHeight || 3,
      };
      IMAGE_META_CACHE.set(resolvedSrc, nextDimensions);
      setDimensions(nextDimensions);
      setIsDecoded(true);
    };
    image.onerror = () => {
      if (cancelled) return;
      setDimensions({ width: 4, height: 3 });
      setIsDecoded(true);
    };
    image.src = resolvedSrc;

    return () => {
      cancelled = true;
    };
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return (
      <div className="image-frame is-loading" style={{ aspectRatio: '4 / 3' }}>
        <span className="image-placeholder">Loading image...</span>
      </div>
    );
  }

  const aspectRatio = dimensions ? `${dimensions.width} / ${dimensions.height}` : '4 / 3';

  return (
    <div className={isDecoded ? 'image-frame' : 'image-frame is-loading'} style={{ aspectRatio }}>
      {!isDecoded ? <span className="image-placeholder">Loading image...</span> : null}
      <img className={isDecoded ? 'reader-image is-visible' : 'reader-image'} src={resolvedSrc} alt={alt || ''} loading="eager" />
    </div>
  );
});
