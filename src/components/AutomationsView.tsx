"use client";
import styles from './Views.module.css';
import { Zap, Plus, ArrowRight, Play, Settings, Clock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
};

export default function AutomationsView() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');
  const [isBuilding, setIsBuilding] = useState(false);
  
  const [automations, setAutomations] = useState<Automation[]>([
    { id: '1', name: 'Notify Team on High Priority', trigger: 'Property "Priority" changes to "High"', action: 'Send Slack Notification', active: true },
    { id: '2', name: 'Archive Old Tasks', trigger: 'Date "Due" arrives', action: 'Update property "Status" to "Archived"', active: false },
  ]);

  const mockLogs = [
    { id: 1, name: 'Notify Team on High Priority', time: '10 mins ago', status: 'Success' },
    { id: 2, name: 'Notify Team on High Priority', time: '2 hours ago', status: 'Success' },
    { id: 3, name: 'Archive Old Tasks', time: 'Yesterday', status: 'Failed' },
  ];

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <Zap className={styles.viewIcon} size={24} />
          <h2>Automations & Workflows</h2>
        </div>
        <button className={styles.primaryBtn} onClick={() => setIsBuilding(true)}>
          <Plus size={16} /> New Workflow
        </button>
      </div>

      <div className={styles.tabsHeader}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'workflows' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          Workflows
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Run History
        </button>
      </div>

      {isBuilding ? (
        <div className={styles.builderCard}>
          <div className={styles.builderHeader}>
            <h3>Build New Automation</h3>
            <button className={styles.cancelBtn} onClick={() => setIsBuilding(false)}>Cancel</button>
          </div>
          
          <div className={styles.builderFlow}>
            {/* Trigger Block */}
            <div className={styles.builderNode}>
              <div className={styles.nodeLabel}>WHEN THIS HAPPENS...</div>
              <select className={styles.nodeSelect}>
                <option>Row is created in Database</option>
                <option>Property value changes</option>
                <option>Date arrives</option>
              </select>
            </div>
            
            <div className={styles.flowArrow}><ArrowRight size={20} /></div>

            {/* Action Block */}
            <div className={styles.builderNode}>
              <div className={styles.nodeLabel}>THEN DO THIS...</div>
              <select className={styles.nodeSelect}>
                <option>Send a notification</option>
                <option>Update a property</option>
                <option>Create a new page</option>
                <option>Send Webhook</option>
                <option>Send Email</option>
              </select>
            </div>
          </div>
          
          <div className={styles.builderFooter}>
            <button className={styles.primaryBtn} onClick={() => setIsBuilding(false)}>Save Automation</button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'workflows' && (
            <div className={styles.automationList}>
              {automations.map(auto => (
                <div key={auto.id} className={styles.automationCard}>
                  <div className={styles.automationInfo}>
                    <div className={styles.automationTitle}>
                      {auto.name}
                      <span className={`${styles.statusBadge} ${auto.active ? styles.statusActive : ''}`}>
                        {auto.active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className={styles.automationFlow}>
                      <span className={styles.flowText}><strong>When:</strong> {auto.trigger}</span>
                      <ArrowRight size={14} className={styles.flowIcon} />
                      <span className={styles.flowText}><strong>Then:</strong> {auto.action}</span>
                    </div>
                  </div>
                  <div className={styles.automationActions}>
                    <button className={styles.actionIcon} title="Edit"><Settings size={16} /></button>
                    <button className={styles.actionIcon} title="Run Now"><Play size={16} /></button>
                    <div 
                      className={`${styles.toggleSwitch} ${auto.active ? styles.toggleOn : ''}`}
                      onClick={() => toggleAutomation(auto.id)}
                    >
                      <div className={styles.toggleKnob} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className={styles.logsList}>
              <div className={styles.logsHeader}>
                <span>Automation</span>
                <span>Run Time</span>
                <span>Status</span>
              </div>
              {mockLogs.map(log => (
                <div key={log.id} className={styles.logRow}>
                  <span className={styles.logName}>{log.name}</span>
                  <span className={styles.logTime}><Clock size={12} /> {log.time}</span>
                  <span className={`${styles.logStatus} ${log.status === 'Success' ? styles.success : styles.failed}`}>
                    {log.status === 'Success' && <CheckCircle2 size={14} />}
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
