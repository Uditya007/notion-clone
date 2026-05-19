"use client";
import styles from './Modals.module.css';
import { X, Search, Mail, Copy, UserPlus, Globe } from 'lucide-react';
import { useState } from 'react';

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const [members, setMembers] = useState([
    { id: 1, email: 'uditya@example.com', name: 'Uditya (You)', role: 'owner', avatar: 'U' },
    { id: 2, email: 'alex@example.com', name: 'Alex Chen', role: 'editor', avatar: 'A' },
    { id: 3, email: 'sarah@example.com', name: 'Sarah Smith', role: 'viewer', avatar: 'S' },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setMembers([...members, { 
      id: Math.random(), 
      email, 
      name: email.split('@')[0], 
      role, 
      avatar: email.charAt(0).toUpperCase() 
    }]);
    setEmail('');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Share to Workspace</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.shareContent}>
          <form className={styles.inviteForm} onSubmit={handleInvite}>
            <div className={styles.inviteInputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input 
                autoFocus
                className={styles.inviteInput}
                placeholder="Add people, groups, or emails..."
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <select className={styles.roleSelect} value={role} onChange={e => setRole(e.target.value)}>
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
                <option value="owner">Full access</option>
              </select>
            </div>
            <button type="submit" className={styles.inviteBtn}>Invite</button>
          </form>

          <div className={styles.membersList}>
            <div className={styles.listSectionTitle}>People with access</div>
            {members.map(member => (
              <div key={member.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>{member.avatar}</div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.name}</span>
                  <span className={styles.memberEmail}>{member.email}</span>
                </div>
                <div className={styles.memberRole}>
                  {member.role === 'owner' ? 'Owner' : (
                    <select 
                      className={styles.roleDropdown} 
                      value={member.role}
                      onChange={(e) => setMembers(members.map(m => m.id === member.id ? { ...m, role: e.target.value } : m))}
                    >
                      <option value="editor">Can edit</option>
                      <option value="viewer">Can view</option>
                      <option value="remove">Remove</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.shareDivider} />

          <div className={styles.publicShareRow}>
            <div className={styles.publicIconWrapper}>
              <Globe size={18} />
            </div>
            <div className={styles.publicInfo}>
              <span className={styles.publicTitle}>Publish to web</span>
              <span className={styles.publicDesc}>Publish a link to the internet.</span>
            </div>
            <button className={styles.publishBtn}>Publish</button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.copyLinkBtn}>
            <Copy size={14} /> Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
