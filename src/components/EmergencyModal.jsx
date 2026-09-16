import React from 'react';
import { useAppState, isEmergencyUsedToday } from '../state/AppStateContext';

export const EmergencyModal = ({ isOpen, onClose, appId, appName, onConfirmed }) => {
  const { state, dispatch } = useAppState();

  if (!isOpen) return null;

  const lastUsedAt = state.emergencyMode?.lastUsedAt;
  const alreadyUsedToday = isEmergencyUsedToday(lastUsedAt);

  const pendingDebt = state.pendingEmergencyDebtSeconds || 0;
  const balance = state.balanceSeconds || 0;
  const hasExistingDebtOrNegative = pendingDebt > 0 || balance < 0;

  const handleConfirm = () => {
    dispatch({
      type: 'START_EMERGENCY_UNLOCK',
      appId: String(appId),
      appName: appName || 'App',
    });
    if (onConfirmed) {
      onConfirmed();
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ gap: '16px' }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Emergency Mode</h2>

        {alreadyUsedToday ? (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
              Already used today — resets at midnight
            </p>
            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button 
                type="button" 
                className="modal-cancel-btn" 
                onClick={onClose}
                style={{ width: '100%', flex: 'none' }}
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <>
            {hasExistingDebtOrNegative && (
              <div 
                style={{
                  backgroundColor: 'var(--gold-bg)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {pendingDebt > 0 && (
                  <div>
                    <strong>Existing debt:</strong> {Math.ceil(pendingDebt / 60)} min pending
                  </div>
                )}
                {balance < 0 && (
                  <div>
                    <strong>Current balance:</strong> −{Math.ceil(Math.abs(balance) / 60)} min · earn it back tomorrow
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.45, margin: 0 }}>
              5 minutes now, deducted from tomorrow's Winning Time.
            </p>

            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button 
                type="button" 
                className="modal-cancel-btn" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-confirm-btn"
                onClick={handleConfirm}
                style={{
                  backgroundColor: 'var(--dark-banner-bg)',
                  color: 'var(--dark-banner-text)',
                }}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmergencyModal;
