import { memo } from 'react'

interface ConfirmationBarProps {
  isOpen: boolean
  type: 'settle' | 'delete'
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

const ConfirmationBar = memo(({ 
  isOpen, 
  type, 
  title, 
  description, 
  onConfirm, 
  onCancel, 
  isLoading,
  error
}: ConfirmationBarProps) => {
  if (!isOpen) return null

  const isDelete = type === 'delete'
  
  return (
    <div className="confirmation-overlay">
      <div className="confirmation-bar">
        <div className={`confirmation-bar-accent ${isDelete ? 'danger' : 'success'}`} />
        <div className="confirmation-content">
          <div className="confirmation-text">
            <h4 className="confirmation-title">{title}</h4>
            <p className="confirmation-desc">{description}</p>
            {error && (
              <p style={{
                color: '#f87171', fontSize: '12px', fontWeight: 500,
                marginTop: '8px', lineHeight: 1.4,
              }}>
                {error}
              </p>
            )}
          </div>
          <div className="confirmation-actions">
            <button 
              className="confirmation-btn-cancel" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className={`confirmation-btn-confirm ${isDelete ? 'danger' : 'success'}`} 
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                isDelete ? 'Delete' : 'Confirm Settle'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

ConfirmationBar.displayName = 'ConfirmationBar'

export default ConfirmationBar
