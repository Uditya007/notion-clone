"use client";
import styles from './Views.module.css';
import { Copy, Folder, Briefcase, Rocket, Download } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const TEMPLATES = [
  {
    id: 't1',
    category: 'Personal',
    icon: '📔',
    title: 'Daily Journal',
    description: 'Track your thoughts, habits, and daily reflections.',
    type: 'editor',
    content: '<h2>Morning Routine</h2><ul><li><p>Meditation</p></li><li><p>Read 10 pages</p></li></ul><h2>Thoughts</h2><p>Today is going to be a great day because...</p>'
  },
  {
    id: 't2',
    category: 'Work',
    icon: '📊',
    title: 'Project Roadmap',
    description: 'A visual board to track features and sprint progress.',
    type: 'board',
    content: ''
  },
  {
    id: 't3',
    category: 'Startup',
    icon: '🚀',
    title: 'Company OKRs',
    description: 'Align your entire company around quarterly goals.',
    type: 'editor',
    content: '<h2>Q3 Company Objectives</h2><h3>Objective 1: Increase Revenue</h3><ul><li><p>KR 1: Launch new pricing tier</p></li><li><p>KR 2: Close 5 enterprise deals</p></li></ul>'
  },
  {
    id: 't4',
    category: 'Personal',
    icon: '📚',
    title: 'Reading List',
    description: 'Keep track of the books you are reading or want to read.',
    type: 'board',
    content: ''
  },
  {
    id: 't5',
    category: 'Work',
    icon: '🤝',
    title: 'Meeting Notes',
    description: 'A structured format for capturing minutes and action items.',
    type: 'editor',
    content: '<h2>Attendees</h2><ul><li><p></p></li></ul><h2>Agenda</h2><ol><li><p></p></li></ol><h2>Action Items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>'
  }
];

export default function TemplatesView() {
  const { applyTemplate } = useAppStore();

  const categories = [
    { name: 'Personal', icon: <Folder size={16} /> },
    { name: 'Work', icon: <Briefcase size={16} /> },
    { name: 'Startup', icon: <Rocket size={16} /> }
  ];

  const handleUseTemplate = (template: any) => {
    applyTemplate(template.title, template.icon, template.content, template.type);
  };

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <Copy className={styles.viewIcon} size={24} />
          <h2>Template Gallery</h2>
        </div>
      </div>

      <div className={styles.templatesNotice}>
        <p>Start with a pre-built page. Click "Use Template" to instantly copy it into your workspace.</p>
      </div>

      {categories.map(category => (
        <div key={category.name} className={styles.templateCategory}>
          <div className={styles.categoryHeader}>
            <span className={styles.categoryIcon}>{category.icon}</span>
            <h3 className={styles.categoryTitle}>{category.name}</h3>
          </div>
          
          <div className={styles.templateGrid}>
            {TEMPLATES.filter(t => t.category === category.name).map(template => (
              <div key={template.id} className={styles.templateCard}>
                <div className={styles.templateCardHeader}>
                  <div className={styles.templateIconWrapper}>{template.icon}</div>
                  <span className={styles.templateTypeBadge}>
                    {template.type === 'board' ? 'Board' : 'Document'}
                  </span>
                </div>
                <h4 className={styles.templateName}>{template.title}</h4>
                <p className={styles.templateDesc}>{template.description}</p>
                <button 
                  className={styles.useTemplateBtn}
                  onClick={() => handleUseTemplate(template)}
                >
                  <Download size={14} /> Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
