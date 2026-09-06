export default function RebalanceModal({ open, onClose, onRebalance }) {
  return (
    <div className={`modal-overlay ${open ? 'show' : ''}`}>
      <div className="modal-box">
        <div className="modal-icon">⚠️</div>
        <h3>Explore a lighter tomorrow</h3>
        <p>
          Preview moving one unfinished work or study task from today to tomorrow.
          Deadlines stay on their original date. This changes your forecast plan only.
        </p>
        <div className="modal-actions">
          <button className="btn-rebalance" onClick={onRebalance}>
            Move one work/study task to tomorrow
          </button>
          <button className="btn-dismiss" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
