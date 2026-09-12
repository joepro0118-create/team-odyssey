import { useState, useEffect } from 'react';
import { SUPPORT_HOTLINES } from '../../data/supportHotlines';

const STORAGE_KEY = 'odyssey_trusted_contacts';

function formatWhatsAppNumber(phone) {
  // Normalize digits
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('60')) return cleaned;
  if (cleaned.startsWith('0')) return `60${cleaned.slice(1)}`;
  return cleaned;
}

export default function SupportCallCard() {
  const [contacts, setContacts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [phone, setPhone] = useState('');
  const [hasContactPicker, setHasContactPicker] = useState(false);
  const [expandedHotlines, setExpandedHotlines] = useState({});

  const toggleHotline = (id) => {
    setExpandedHotlines((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.warn('Failed to persist contacts in localStorage:', e);
    }
  }, [contacts]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      setHasContactPicker(true);
    }
  }, []);

  const handleAddContact = (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const newContact = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tc-${Date.now()}`,
      name: name.trim(),
      relationship: relationship.trim() || 'Trusted Person',
      phone: phone.trim(),
    };

    setContacts((prev) => [newContact, ...prev]);
    setName('');
    setPhone('');
    setRelationship('Parent');
    setIsAdding(false);
  };

  const handleDeleteContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handlePickFromDevice = async () => {
    try {
      const props = ['name', 'tel'];
      const picked = await navigator.contacts.select(props, { multiple: false });
      if (picked && picked.length > 0) {
        const contact = picked[0];
        if (contact.name?.[0]) setName(contact.name[0]);
        if (contact.tel?.[0]) setPhone(contact.tel[0]);
        setIsAdding(true);
      }
    } catch (err) {
      // User cancelled or not supported
      console.info('Device contact picker cancelled or unavailable:', err);
    }
  };

  const defaultCheckInMessage = encodeURIComponent(
    "Hey, I'm feeling a bit overwhelmed right now. Do you have a moment to talk?"
  );

  return (
    <div className="support-call-container">
      {/* ── Warm Intro Banner ── */}
      <div className="support-intro-card">
        <div className="support-intro-header">
          <span className="support-intro-icon">🤝</span>
          <div>
            <h3 className="support-intro-title">You don&rsquo;t have to carry this alone</h3>
            <p className="support-intro-subtitle">
              Reaching out takes courage. Connect immediately with confidential counsellors or someone you trust.
            </p>
          </div>
        </div>
        <div className="support-emergency-badge">
          🚨 Immediate medical or physical emergency? Please dial <strong>999</strong>
        </div>
      </div>

      {/* ── Section 1: Official Malaysian Hotlines ── */}
      <div className="support-section">
        <div className="support-section-header">
          <h4 className="support-section-title">
            <span className="section-title-icon">🇲🇾</span> Verified Support Hotlines
          </h4>
          <span className="support-verified-tag">100% Official Verified</span>
        </div>

        <div className="support-hotlines-list">
          {SUPPORT_HOTLINES.map((hotline) => {
            const isHeal = hotline.id === 'heal-15555';
            const isExpanded = Boolean(expandedHotlines[hotline.id]);

            return (
              <div
                key={hotline.id}
                className={`support-hotline-item ${isExpanded ? 'is-expanded' : ''}`}
                style={{ '--accent-color': hotline.color }}
              >
                {/* ── Top Header Row (Always Visible, Clickable to Toggle) ── */}
                <div
                  className="hotline-header-toggle"
                  onClick={() => toggleHotline(hotline.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleHotline(hotline.id);
                    }
                  }}
                  title={isExpanded ? 'Click to collapse details' : 'Click to expand details'}
                >
                  <div className="hotline-title-row">
                    <div className="hotline-title-group">
                      <h5 className="hotline-name">{hotline.name}</h5>
                      <span className={`hotline-hours-badge ${hotline.is24x7 ? 'is-24x7' : 'is-scheduled'}`}>
                        {hotline.badge}
                      </span>
                    </div>

                    <div className={`hotline-chevron-indicator ${isExpanded ? 'open' : ''}`}>
                      <span className="hotline-toggle-hint">{isExpanded ? 'Hide info' : 'Info'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── Middle Details (Hidden by default, Expands when pressed) ── */}
                {isExpanded && (
                  <div className="hotline-expandable-details">
                    <div className="hotline-org">{hotline.organization}</div>
                    <div className="hotline-hours">
                      ⏱ <strong>Hours:</strong> {hotline.operatingHours}
                    </div>
                    <p className="hotline-desc">{hotline.description}</p>

                    {/* After-hours fallback nudge for HEAL 15555 */}
                    {isHeal && (
                      <div className="hotline-after-hours-nudge">
                        <span className="nudge-moon">🌙</span>
                        <span>
                          <strong>Outside 8:00 AM – 12:00 Midnight?</strong> Befrienders KL and Talian Kasih are available <strong>24/7</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Action Buttons (Always Visible) ── */}
                <div className="hotline-actions">
                  <a
                    href={hotline.telLink}
                    className="hotline-action-btn hotline-call-btn"
                    title={`Direct call to ${hotline.name}`}
                  >
                    <span className="btn-icon">📞</span>
                    <span>Call {hotline.displayPhone || hotline.phone}</span>
                  </a>

                  {hotline.whatsappLink && (
                    <a
                      href={hotline.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hotline-action-btn hotline-wa-btn"
                      title={`Open WhatsApp chat with ${hotline.name}`}
                    >
                      <span className="btn-icon">💬</span>
                      <span>WhatsApp {hotline.displayWhatsapp || hotline.whatsapp}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: My Trusted Circle (Personal Contacts) ── */}
      <div className="support-section trusted-circle-section">
        <div className="support-section-header">
          <div>
            <h4 className="support-section-title">
              <span className="section-title-icon">❤️</span> My Trusted Circle
            </h4>
            <p className="support-section-subtitle">
              Saved privately on your device. Only you can see these contacts.
            </p>
          </div>

          {!isAdding && (
            <button
              type="button"
              className="support-add-contact-btn"
              onClick={() => setIsAdding(true)}
            >
              + Add Contact
            </button>
          )}
        </div>

        {/* Inline Add Contact Form */}
        {isAdding && (
          <form className="support-add-form" onSubmit={handleAddContact}>
            <div className="add-form-title">
              <span>Add Anchor Contact</span>
              {hasContactPicker && (
                <button
                  type="button"
                  className="device-pick-btn"
                  onClick={handlePickFromDevice}
                  title="Select from your device contacts"
                >
                  📱 Pick from phone
                </button>
              )}
            </div>

            <div className="add-form-grid">
              <div className="form-group">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="e.g. Mom, Dad, Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact-rel">Relationship</label>
                <select
                  id="contact-rel"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                >
                  <option value="Parent">Parent</option>
                  <option value="Friend">Friend</option>
                  <option value="Partner">Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Mentor / Counselor">Mentor / Counselor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contact-phone">Phone Number</label>
                <input
                  id="contact-phone"
                  type="tel"
                  placeholder="e.g. 0123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="add-form-actions">
              <button
                type="button"
                className="form-cancel-btn"
                onClick={() => {
                  setIsAdding(false);
                  setName('');
                  setPhone('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="form-save-btn" disabled={!name.trim() || !phone.trim()}>
                Save Contact
              </button>
            </div>
          </form>
        )}

        {/* Contacts List */}
        {contacts.length === 0 && !isAdding ? (
          <div className="support-empty-circle">
            <span className="empty-circle-icon">🫂</span>
            <p>No trusted contacts added yet.</p>
            <span>Add a parent, friend, or partner so you can reach them with a single tap.</span>
          </div>
        ) : (
          <div className="trusted-contacts-list">
            {contacts.map((c) => {
              const cleanPhone = c.phone.replace(/\s+/g, '');
              const waNumber = formatWhatsAppNumber(cleanPhone);

              return (
                <div key={c.id} className="trusted-contact-card">
                  <div className="contact-avatar-col">
                    <div className="contact-avatar">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="contact-info-col">
                    <div className="contact-name-row">
                      <span className="contact-name">{c.name}</span>
                      <span className="contact-rel-badge">{c.relationship}</span>
                    </div>
                    <span className="contact-phone-number">{c.phone}</span>
                  </div>

                  <div className="contact-actions-col">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="contact-quick-btn call-btn"
                      title={`Call ${c.name}`}
                    >
                      📞 Call
                    </a>
                    <a
                      href={`https://wa.me/${waNumber}?text=${defaultCheckInMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-quick-btn wa-btn"
                      title={`Send WhatsApp check-in to ${c.name}`}
                    >
                      💬 WhatsApp
                    </a>
                    <button
                      type="button"
                      className="contact-delete-btn"
                      onClick={() => handleDeleteContact(c.id)}
                      title="Remove contact"
                      aria-label={`Remove ${c.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
