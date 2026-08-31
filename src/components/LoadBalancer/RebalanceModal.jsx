export default function RebalanceModal({ open, onClose, onRebalance }) {
  return (
    <div className={`modal-overlay ${open ? 'show' : ''}`}>
      <div className="modal-box">
        <div className="modal-icon">⚠️</div>
        <h3>Heavy load detected</h3>
        <p>
          You've got more Active Waves today than usual. Rebalancing a task or two
          could keep you out of the red.
        </p>
        <div className="modal-actions">
          <button className="btn-rebalance" onClick={onRebalance}>
            Push low-priority tasks to tomorrow
          </button>
          <button className="btn-dismiss" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}