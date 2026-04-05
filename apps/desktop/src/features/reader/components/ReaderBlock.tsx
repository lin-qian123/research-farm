import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { ReaderBlock as ReaderBlockModel } from '../model/blocks';
import type { LoadedBundle } from '../../../shared/contracts';
import { ReaderImage } from './ReaderImage';

const MARKDOWN_LINK_PROPS = { target: '_blank', rel: 'noreferrer' } as const;

const ReaderBlockRenderedContent = memo(function ReaderBlockRenderedContent({
  block,
  bundle,
}: {
  block: ReaderBlockModel;
  bundle: LoadedBundle;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        img: props => <ReaderImage bundle={bundle} src={typeof props.src === 'string' ? props.src : undefined} alt={props.alt} />,
        a: props => <a {...props} {...MARKDOWN_LINK_PROPS} />,
        table: props => (
          <div className="table-scroll">
            <table {...props} />
          </div>
        ),
      }}
    >
      {block.markdown}
    </ReactMarkdown>
  );
}, (prev, next) => prev.block === next.block && prev.bundle === next.bundle);

type ReaderBlockProps = {
  block: ReaderBlockModel;
  bundle: LoadedBundle;
  isEditing: boolean;
  editingValue: string;
  onEditingChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  refCallback: (element: HTMLElement | null) => void;
  onMeasure: (height: number) => void;
};

export const ReaderBlock = memo(function ReaderBlock({
  block,
  bundle,
  isEditing,
  editingValue,
  onEditingChange,
  onSaveEdit,
  onCancelEdit,
  refCallback,
  onMeasure: _onMeasure,
}: ReaderBlockProps) {
  return (
    <article
      ref={refCallback}
      id={`block-${block.block_id}`}
      className={`reader-block role-${block.displayRole}${isEditing ? ' is-editing' : ''}`}
      data-block-id={block.block_id}
    >
      <div className="block-content">
        {isEditing ? (
          <div className="block-inline-editor">
            <textarea
              className="block-inline-textarea"
              value={editingValue}
              onChange={event => onEditingChange(event.target.value)}
              onClick={event => event.stopPropagation()}
              onBlur={() => onSaveEdit()}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onCancelEdit();
                  return;
                }
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  onSaveEdit();
                }
              }}
              rows={Math.max(6, block.markdown.split('\n').length + 2)}
              autoFocus
            />
          </div>
        ) : (
          <ReaderBlockRenderedContent block={block} bundle={bundle} />
        )}
      </div>
    </article>
  );
}, (prev, next) =>
  prev.block === next.block
  && prev.bundle === next.bundle
  && prev.isEditing === next.isEditing
  && prev.editingValue === next.editingValue);
