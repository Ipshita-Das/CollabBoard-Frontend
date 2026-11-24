import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, subtitle, icon, iconTone, width = 480, footer, children, dismissable = true }) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen || !dismissable) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, dismissable, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {icon && <div className={`modal-icon ${iconTone || ''}`}>{icon}</div>}
          <div className="modal-titles">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} disabled={!dismissable} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
