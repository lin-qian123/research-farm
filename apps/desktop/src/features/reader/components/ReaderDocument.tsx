import { memo, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { LoadedBundle } from '../../../shared/contracts';
import type { ReaderBlock as ReaderBlockModel } from '../model/blocks';
import { ReaderBlock } from './ReaderBlock';

type ReaderDocumentProps = {
  blocks: ReaderBlockModel[];
  bundle: LoadedBundle;
  scrollContainerRef: RefObject<HTMLElement | null>;
  selectedBlockId: string;
  onSelect: (blockId: string) => void;
  onBlockContextMenu: (event: ReactMouseEvent, block: ReaderBlockModel) => void;
  onStartEdit: (block: ReaderBlockModel) => void;
  editingBlockId: string | null;
  editingValue: string;
  onEditingChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  scrollTargetBlockId: string | null;
  onScrollTargetHandled: () => void;
};

export const ReaderDocument = memo(function ReaderDocument({
  blocks,
  bundle,
  scrollContainerRef,
  selectedBlockId,
  onSelect,
  onBlockContextMenu,
  onStartEdit,
  editingBlockId,
  editingValue,
  onEditingChange,
  onSaveEdit,
  onCancelEdit,
  scrollTargetBlockId,
  onScrollTargetHandled,
}: ReaderDocumentProps) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  const blockMap = useMemo(() => new Map(blocks.map(block => [block.block_id, block])), [blocks]);
  const targetIndex = useMemo(
    () => (scrollTargetBlockId ? blocks.findIndex(block => block.block_id === scrollTargetBlockId) : -1),
    [blocks, scrollTargetBlockId],
  );

  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller || !selectedBlockId) {
      if (selectedElementRef.current) {
        selectedElementRef.current.classList.remove('is-selected');
        selectedElementRef.current = null;
      }
      return;
    }

    let frame = 0;
    let attempts = 0;

    const syncSelectedClass = () => {
      const nextSelected = scroller.querySelector<HTMLElement>(`[data-block-id="${selectedBlockId}"]`);
      if (!nextSelected) {
        attempts += 1;
        if (attempts <= 12) {
          frame = window.requestAnimationFrame(syncSelectedClass);
        }
        return;
      }

      if (selectedElementRef.current && selectedElementRef.current !== nextSelected) {
        selectedElementRef.current.classList.remove('is-selected');
      }

      nextSelected.classList.add('is-selected');
      selectedElementRef.current = nextSelected;
    };

    frame = window.requestAnimationFrame(syncSelectedClass);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [scrollContainerRef, selectedBlockId, blocks]);

  useEffect(() => {
    if (!scrollTargetBlockId) return;
    if (targetIndex < 0) {
      onScrollTargetHandled();
      return;
    }

    let frame = 0;
    let attempts = 0;
    let stableFrames = 0;
    const desiredTop = 12;

    const alignToTarget = () => {
      const scroller = scrollContainerRef.current;
      if (!scroller) {
        onScrollTargetHandled();
        return;
      }

      if (attempts === 0 || attempts === 8 || attempts === 16) {
        virtuosoRef.current?.scrollToIndex({
          index: targetIndex,
          align: 'start',
          behavior: 'auto',
        });
      }

      const target = scroller.querySelector<HTMLElement>(`[data-block-id="${scrollTargetBlockId}"]`);
      if (!target) {
        attempts += 1;
        if (attempts > 24) {
          onScrollTargetHandled();
          return;
        }
        frame = window.requestAnimationFrame(alignToTarget);
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const delta = (targetRect.top - scrollerRect.top) - desiredTop;

      if (Math.abs(delta) > 1) {
        scroller.scrollTop += delta;
        stableFrames = 0;
      } else {
        stableFrames += 1;
      }

      attempts += 1;
      if (stableFrames >= 2 || attempts > 28) {
        onScrollTargetHandled();
        return;
      }

      frame = window.requestAnimationFrame(alignToTarget);
    };

    frame = window.requestAnimationFrame(alignToTarget);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [onScrollTargetHandled, scrollTargetBlockId, targetIndex]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      className="reader-document-virtuoso"
      style={{ height: '100%' }}
      data={blocks}
      increaseViewportBy={{ top: 900, bottom: 1400 }}
      scrollerRef={element => {
        scrollContainerRef.current = (element as HTMLElement | null) || null;
      }}
      computeItemKey={(_index, block) => block.block_id}
      itemContent={(_index, block) => (
        <ReaderBlock
          block={block}
          bundle={bundle}
          isEditing={editingBlockId === block.block_id}
          editingValue={editingBlockId === block.block_id ? editingValue : block.markdown}
          onEditingChange={onEditingChange}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          refCallback={element => {
            if (element && block.block_id === selectedBlockId) {
              if (selectedElementRef.current && selectedElementRef.current !== element) {
                selectedElementRef.current.classList.remove('is-selected');
              }
              element.classList.add('is-selected');
              selectedElementRef.current = element;
            }
          }}
          onMeasure={() => {}}
        />
      )}
      components={{
        List: ({ style, children, ...props }) => (
          <div
            {...props}
            style={style}
            className="reader-document"
            onClick={event => {
              const target = event.target as HTMLElement | null;
              const blockElement = target?.closest<HTMLElement>('[data-block-id]');
              const blockId = blockElement?.dataset.blockId;
              if (blockId) {
                onSelect(blockId);
              }
            }}
            onDoubleClick={event => {
              const target = event.target as HTMLElement | null;
              if (target?.closest('.block-inline-textarea')) return;
              const blockElement = target?.closest<HTMLElement>('[data-block-id]');
              const blockId = blockElement?.dataset.blockId;
              if (!blockId) return;
              const block = blockMap.get(blockId);
              if (!block) return;
              onSelect(blockId);
              onStartEdit(block);
            }}
            onContextMenu={event => {
              const target = event.target as HTMLElement | null;
              const blockElement = target?.closest<HTMLElement>('[data-block-id]');
              const blockId = blockElement?.dataset.blockId;
              if (!blockId) return;
              const block = blockMap.get(blockId);
              if (!block) return;
              event.preventDefault();
              onSelect(blockId);
              onBlockContextMenu(event as unknown as ReactMouseEvent, block);
            }}
          >
            {children}
          </div>
        ),
      }}
    />
  );
});
