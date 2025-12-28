import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Highlighter from 'web-highlighter';
import { Block, Annotation, AnnotationType, EditorMode } from '../types';
import { Toolbar } from './Toolbar';
import { TaterSpriteSitting } from './TaterSpriteSitting';
import { getIdentity } from '../utils/identity';

declare const hljs: { highlightAll: () => void };

interface ViewerProps {
  blocks: Block[];
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  onSelectAnnotation: (id: string | null) => void;
  selectedAnnotationId: string | null;
  mode: EditorMode;
  taterMode: boolean;
}

export interface ViewerHandle {
  removeHighlight: (id: string) => void;
  clearAllHighlights: () => void;
  applySharedAnnotations: (annotations: Annotation[]) => void;
}

export const Viewer = forwardRef<ViewerHandle, ViewerProps>(({
  blocks,
  annotations,
  onAddAnnotation,
  onSelectAnnotation,
  selectedAnnotationId,
  mode,
  taterMode
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlighterRef = useRef<Highlighter | null>(null);
  const modeRef = useRef<EditorMode>(mode);
  const onAddAnnotationRef = useRef(onAddAnnotation);
  const pendingSourceRef = useRef<any>(null);
  const [toolbarState, setToolbarState] = useState<{ element: HTMLElement; source: any } | null>(null);
  const [hoveredCodeBlock, setHoveredCodeBlock] = useState<{ block: Block; element: HTMLElement } | null>(null);
  const [isCodeBlockToolbarExiting, setIsCodeBlockToolbarExiting] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with props
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onAddAnnotationRef.current = onAddAnnotation;
  }, [onAddAnnotation]);

  // Helper to create annotation from highlighter source
  const createAnnotationFromSource = (
    highlighter: Highlighter,
    source: any,
    type: AnnotationType,
    text?: string
  ) => {
    const doms = highlighter.getDoms(source.id);
    let blockId = '';
    let startOffset = 0;

    if (doms?.length > 0) {
      const el = doms[0] as HTMLElement;
      let parent = el.parentElement;
      while (parent && !parent.dataset.blockId) {
        parent = parent.parentElement;
      }
      if (parent?.dataset.blockId) {
        blockId = parent.dataset.blockId;
        const blockText = parent.textContent || '';
        const beforeText = blockText.split(source.text)[0];
        startOffset = beforeText?.length || 0;
      }
    }

    const newAnnotation: Annotation = {
      id: source.id,
      blockId,
      startOffset,
      endOffset: startOffset + source.text.length,
      type,
      text,
      originalText: source.text,
      createdA: Date.now(),
      author: getIdentity(),
      startMeta: source.startMeta,
      endMeta: source.endMeta,
    };

    if (type === AnnotationType.DELETION) {
      highlighter.addClass('deletion', source.id);
    } else if (type === AnnotationType.COMMENT) {
      highlighter.addClass('comment', source.id);
    }

    onAddAnnotationRef.current(newAnnotation);
  };

  // Helper to find text in DOM and create a range
  const findTextInDOM = useCallback((searchText: string): Range | null => {
    if (!containerRef.current) return null;

    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.textContent || '';
      const index = text.indexOf(searchText);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchText.length);
        return range;
      }
    }

    // Try across multiple text nodes for multi-line content
    const fullText = containerRef.current.textContent || '';
    const searchIndex = fullText.indexOf(searchText);
    if (searchIndex === -1) return null;

    // Use Selection API to find and select the text
    const selection = window.getSelection();
    if (!selection) return null;

    // Reset walker
    const walker2 = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let charCount = 0;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    while ((node = walker2.nextNode() as Text | null)) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && charCount + nodeLength > searchIndex) {
        startNode = node;
        startOffset = searchIndex - charCount;
      }

      if (startNode && charCount + nodeLength >= searchIndex + searchText.length) {
        endNode = node;
        endOffset = searchIndex + searchText.length - charCount;
        break;
      }

      charCount += nodeLength;
    }

    if (startNode && endNode) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    }

    return null;
  }, []);

  useImperativeHandle(ref, () => ({
    removeHighlight: (id: string) => {
      // Try highlighter first (for regular text selections)
      highlighterRef.current?.remove(id);

      // Also handle manually created highlights (for code blocks)
      const manualHighlight = containerRef.current?.querySelector(`[data-bind-id="${id}"]`);
      if (manualHighlight) {
        // Unwrap the mark element, preserving its contents
        const parent = manualHighlight.parentNode;
        while (manualHighlight.firstChild) {
          parent?.insertBefore(manualHighlight.firstChild, manualHighlight);
        }
        manualHighlight.remove();
      }
    },

    clearAllHighlights: () => {
      // Clear all manual highlights (shared annotations and code blocks)
      const manualHighlights = containerRef.current?.querySelectorAll('[data-bind-id]');
      manualHighlights?.forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        el.remove();
      });

      // Clear web-highlighter highlights
      const webHighlights = containerRef.current?.querySelectorAll('.annotation-highlight');
      webHighlights?.forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        el.remove();
      });
    },

    applySharedAnnotations: (sharedAnnotations: Annotation[]) => {
      const highlighter = highlighterRef.current;
      if (!highlighter || !containerRef.current) return;

      sharedAnnotations.forEach(ann => {
        // Skip if already highlighted
        const existingDoms = highlighter.getDoms(ann.id);
        if (existingDoms && existingDoms.length > 0) return;

        // Also skip if manually highlighted
        const existingManual = containerRef.current?.querySelector(`[data-bind-id="${ann.id}"]`);
        if (existingManual) return;

        // Find the text in the DOM
        const range = findTextInDOM(ann.originalText);
        if (!range) {
          console.warn(`Could not find text for annotation ${ann.id}: "${ann.originalText.slice(0, 50)}..."`);
          return;
        }

        try {
          // Create a unique ID for this restored highlight
          const newId = ann.id;

          // Wrap the range with a mark element
          const wrapper = document.createElement('mark');
          wrapper.className = 'annotation-highlight';
          wrapper.dataset.bindId = newId;

          // Add type-specific class
          if (ann.type === AnnotationType.DELETION) {
            wrapper.classList.add('deletion');
          } else if (ann.type === AnnotationType.COMMENT) {
            wrapper.classList.add('comment');
          }

          // surroundContents can fail if range spans multiple elements
          // In that case, we need to use extractContents + appendChild
          try {
            range.surroundContents(wrapper);
          } catch (e) {
            // Range spans multiple elements - extract and wrap
            const fragment = range.extractContents();
            wrapper.appendChild(fragment);
            range.insertNode(wrapper);
          }

          // Make it clickable
          wrapper.addEventListener('click', () => {
            onSelectAnnotation(ann.id);
          });
        } catch (e) {
          console.warn(`Failed to apply highlight for annotation ${ann.id}:`, e);
        }
      });
    }
  }), [findTextInDOM, onSelectAnnotation]);

  useEffect(() => {
    if (!containerRef.current) return;

    const highlighter = new Highlighter({
      $root: containerRef.current,
      exceptSelectors: ['.annotation-toolbar', 'button'],
      wrapTag: 'mark',
      style: { className: 'annotation-highlight' }
    });

    highlighterRef.current = highlighter;

    highlighter.on(Highlighter.event.CREATE, ({ sources }: { sources: any[] }) => {
      if (sources.length > 0) {
        const source = sources[0];
        const doms = highlighter.getDoms(source.id);
        if (doms?.length > 0) {
          // Clean up previous pending highlight if exists
          if (pendingSourceRef.current) {
            highlighter.remove(pendingSourceRef.current.id);
            pendingSourceRef.current = null;
          }

          if (modeRef.current === 'redline') {
            // Auto-delete in redline mode
            createAnnotationFromSource(highlighter, source, AnnotationType.DELETION);
            window.getSelection()?.removeAllRanges();
          } else {
            // Show toolbar in selection mode
            pendingSourceRef.current = source;
            setToolbarState({ element: doms[0] as HTMLElement, source });
          }
        }
      }
    });

    highlighter.on(Highlighter.event.CLICK, ({ id }: { id: string }) => {
      onSelectAnnotation(id);
    });

    highlighter.run();

    return () => highlighter.dispose();
  }, [onSelectAnnotation]);

  useEffect(() => {
    if (typeof hljs !== 'undefined') {
      hljs.highlightAll();
    }
  }, [blocks]);

  useEffect(() => {
    const highlighter = highlighterRef.current;
    if (!highlighter) return;

    annotations.forEach(ann => {
      try {
        const doms = highlighter.getDoms(ann.id);
        if (doms?.length > 0) {
          if (ann.type === AnnotationType.DELETION) {
            highlighter.addClass('deletion', ann.id);
          } else if (ann.type === AnnotationType.COMMENT) {
            highlighter.addClass('comment', ann.id);
          }
        }
      } catch (e) {}
    });
  }, [annotations]);

  const handleAnnotate = (type: AnnotationType, text?: string) => {
    const highlighter = highlighterRef.current;
    if (!toolbarState || !highlighter) return;

    createAnnotationFromSource(highlighter, toolbarState.source, type, text);
    pendingSourceRef.current = null;
    setToolbarState(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleToolbarClose = () => {
    if (toolbarState && highlighterRef.current) {
      highlighterRef.current.remove(toolbarState.source.id);
    }
    pendingSourceRef.current = null;
    setToolbarState(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCodeBlockAnnotate = (type: AnnotationType, text?: string) => {
    const highlighter = highlighterRef.current;
    if (!hoveredCodeBlock || !highlighter) return;

    // Find the code element inside the pre
    const codeEl = hoveredCodeBlock.element.querySelector('code');
    if (!codeEl) return;

    // Create a range that selects all content in the code block
    const range = document.createRange();
    range.selectNodeContents(codeEl);

    // Set the browser selection to this range
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Use highlighter.fromRange which triggers CREATE event internally
    // We need to handle this synchronously, so we'll create the annotation directly
    const id = `codeblock-${Date.now()}`;
    const codeText = codeEl.textContent || '';

    // Wrap the content manually
    const wrapper = document.createElement('mark');
    wrapper.className = 'annotation-highlight';
    wrapper.dataset.bindId = id;

    // Extract and wrap content
    range.surroundContents(wrapper);

    // Add the appropriate class
    if (type === AnnotationType.DELETION) {
      wrapper.classList.add('deletion');
    } else if (type === AnnotationType.COMMENT) {
      wrapper.classList.add('comment');
    }

    // Create the annotation
    const newAnnotation: Annotation = {
      id,
      blockId: hoveredCodeBlock.block.id,
      startOffset: 0,
      endOffset: codeText.length,
      type,
      text,
      originalText: codeText,
      createdA: Date.now(),
      author: getIdentity(),
    };

    onAddAnnotationRef.current(newAnnotation);

    // Clear selection
    selection?.removeAllRanges();
    setHoveredCodeBlock(null);
  };

  const handleCodeBlockToolbarClose = () => {
    setHoveredCodeBlock(null);
  };

  return (
    <div className="relative z-50">
      {taterMode && <TaterSpriteSitting />}
      <article
        ref={containerRef}
        className="w-full max-w-3xl bg-card border border-border/50 rounded-xl shadow-xl p-5 md:p-10 lg:p-14"
      >
        {blocks.map(block => (
          block.type === 'code' ? (
            <CodeBlock
              key={block.id}
              block={block}
              onHover={(element) => {
                // Clear any pending leave timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                // Cancel exit animation if re-entering
                setIsCodeBlockToolbarExiting(false);
                // Only show hover toolbar if no selection toolbar is active
                if (!toolbarState) {
                  setHoveredCodeBlock({ block, element });
                }
              }}
              onLeave={() => {
                // Delay then start exit animation
                hoverTimeoutRef.current = setTimeout(() => {
                  setIsCodeBlockToolbarExiting(true);
                  // After exit animation, unmount
                  setTimeout(() => {
                    setHoveredCodeBlock(null);
                    setIsCodeBlockToolbarExiting(false);
                  }, 150);
                }, 100);
              }}
              isHovered={hoveredCodeBlock?.block.id === block.id}
            />
          ) : (
            <BlockRenderer key={block.id} block={block} />
          )
        ))}

        <Toolbar
          highlightElement={toolbarState?.element ?? null}
          onAnnotate={handleAnnotate}
          onClose={handleToolbarClose}
        />

        {/* Code block hover toolbar */}
        {hoveredCodeBlock && !toolbarState && (
          <CodeBlockToolbar
            element={hoveredCodeBlock.element}
            onAnnotate={handleCodeBlockAnnotate}
            onClose={handleCodeBlockToolbarClose}
            isExiting={isCodeBlockToolbarExiting}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              setIsCodeBlockToolbarExiting(false);
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                setIsCodeBlockToolbarExiting(true);
                setTimeout(() => {
                  setHoveredCodeBlock(null);
                  setIsCodeBlockToolbarExiting(false);
                }, 150);
              }, 100);
            }}
          />
        )}
      </article>
    </div>
  );
});

const BlockRenderer: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'heading':
      const Tag = `h${block.level || 1}` as keyof JSX.IntrinsicElements;
      const styles = {
        1: 'text-2xl font-bold mb-4 mt-6 first:mt-0 tracking-tight',
        2: 'text-xl font-semibold mb-3 mt-8 text-foreground/90',
        3: 'text-base font-semibold mb-2 mt-6 text-foreground/80',
      }[block.level || 1] || 'text-base font-semibold mb-2 mt-4';

      return <Tag className={styles} data-block-id={block.id}>{block.content}</Tag>;

    case 'blockquote':
      return (
        <blockquote
          className="border-l-2 border-primary/50 pl-4 my-4 text-muted-foreground italic"
          data-block-id={block.id}
        >
          {block.content}
        </blockquote>
      );

    case 'list-item':
      return (
        <div className="flex gap-3 my-1.5" data-block-id={block.id}>
          <span className="text-primary/60 select-none">•</span>
          <span className="text-foreground/90 text-sm leading-relaxed">{block.content}</span>
        </div>
      );

    case 'code':
      return <CodeBlock block={block} />;

    case 'hr':
      return <hr className="border-border/30 my-8" data-block-id={block.id} />;

    default:
      return (
        <p
          className="mb-4 leading-relaxed text-foreground/90 text-[15px]"
          data-block-id={block.id}
        >
          {block.content}
        </p>
      );
  }
};

interface CodeBlockProps {
  block: Block;
  onHover: (element: HTMLElement) => void;
  onLeave: () => void;
  isHovered: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ block, onHover, onLeave, isHovered }) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [block.content]);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      onHover(containerRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative group my-5"
      data-block-id={block.id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
    >
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      <pre className="rounded-lg text-[13px] overflow-x-auto bg-muted/50 border border-border/30">
        <code className="hljs font-mono">{block.content}</code>
      </pre>
    </div>
  );
};

const CodeBlockToolbar: React.FC<{
  element: HTMLElement;
  onAnnotate: (type: AnnotationType, text?: string) => void;
  onClose: () => void;
  isExiting: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ element, onAnnotate, onClose, isExiting, onMouseEnter, onMouseLeave }) => {
  const [step, setStep] = useState<'menu' | 'input'>('menu');
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'input') inputRef.current?.focus();
  }, [step]);

  // Update position on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.top - 40,
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [element]);

  const { top, right } = position;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAnnotate(AnnotationType.COMMENT, inputValue);
    }
  };

  return createPortal(
    <div
      className="annotation-toolbar fixed z-[100] bg-popover border border-border rounded-lg shadow-2xl"
      style={{
        top,
        right,
        animation: isExiting ? 'code-toolbar-out 0.15s ease-in forwards' : 'code-toolbar-in 0.2s ease-out',
      }}
      onMouseDown={e => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <style>{`
        @keyframes code-toolbar-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes code-toolbar-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(8px);
          }
        }
      `}</style>
      {step === 'menu' ? (
        <div className="flex items-center p-1 gap-0.5">
          <button
            onClick={() => onAnnotate(AnnotationType.DELETION)}
            title="Delete"
            className="p-1.5 rounded-md transition-colors text-destructive hover:bg-destructive/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setStep('input')}
            title="Comment"
            className="p-1.5 rounded-md transition-colors text-accent hover:bg-accent/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>
          <div className="w-px h-5 bg-border mx-0.5" />
          <button
            onClick={onClose}
            title="Cancel"
            className="p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-muted"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-1.5 pl-3">
          <input
            ref={inputRef}
            type="text"
            className="bg-transparent border-none outline-none text-sm w-44 placeholder:text-muted-foreground"
            placeholder="Add a comment..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setStep('menu')}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-2 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setStep('menu')}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}
    </div>,
    document.body
  );
};
