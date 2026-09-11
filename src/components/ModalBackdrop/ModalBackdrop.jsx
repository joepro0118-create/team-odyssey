import { useEffect, useRef, useState } from 'react';

export default function ModalBackdrop({
  isOpen,
  onClose,
  children,
  className = '',
  contentClassName = '',
  ariaLabel = 'Modal overlay',
}) {
  const [rendered, setRendered] = useState(isOpen);
  const [exiting, setExiting] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const backdropRef = useRef(null);

  // Synchronize state during render when isOpen prop changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setRendered(true);
      setExiting(false);
    } else if (rendered) {
      setExiting(true);
    }
  }

  // Handle exit animation completion
  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(() => {
        setRendered(false);
        setExiting(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [exiting]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal with children is open
  useEffect(() => {
    if (isOpen && children) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen, children]);

  if (!rendered) return null;

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose?.();
    }
  };

  const isVisible = isOpen && !exiting;

  return (
    <div
      ref={backdropRef}
      className={`modal-backdrop ${isVisible ? 'modal-backdrop-visible' : 'modal-backdrop-exiting'} ${className}`}
      onClick={handleBackdropClick}
      role="presentation"
      aria-label={ariaLabel}
    >
      {children && (
        <div
          className={`modal-backdrop-content ${isVisible ? 'modal-content-visible' : 'modal-content-exiting'} ${contentClassName}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
