'use client';

import { useState } from 'react';
import { Tag } from './types';

interface TagManagerProps {
  tags: Tag[];
  setTags: (updater: (prev: Tag[]) => Tag[]) => void;
}

export default function TagManager({ tags, setTags }: TagManagerProps) {
  const [tagForm, setTagForm] = useState({ name: '', color: '#ff6b6b' });
  const [editingTag, setEditingTag] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      setTags(prev => prev.map(tag => tag.id === editingTag ? { ...tag, ...tagForm } : tag));
      setEditingTag(null);
    } else {
      setTags(prev => [...prev, { id: Date.now().toString(), ...tagForm }]);
    }
    setTagForm({ name: '', color: '#ff6b6b' });
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
  };

  return (
    <div>
      <div className="nes-container">
        <p className="title">{editingTag ? '編輯' : '新增'}標籤</p>
        <form onSubmit={handleSubmit}>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>標籤名稱</label>
            <input className="nes-input" value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} required />
          </div>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>顏色</label>
            <input type="color" className="nes-input" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="nes-btn is-primary">{editingTag ? '更新' : '新增'}</button>
            {editingTag && (
              <button type="button" className="nes-btn" onClick={() => { setEditingTag(null); setTagForm({ name: '', color: '#ff6b6b' }); }}>取消</button>
            )}
          </div>
        </form>
      </div>

      <div className="nes-container">
        <p className="title">標籤列表</p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {tags.map(tag => (
            <div key={tag.id} className="nes-container is-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: tag.color, border: '2px solid #fff' }}></div>
                {tag.name}
              </span>
              <div>
                <button className="nes-btn is-warning" style={{ marginRight: '5px' }} onClick={() => { setTagForm({ name: tag.name, color: tag.color }); setEditingTag(tag.id); }}>編輯</button>
                <button className="nes-btn is-error" onClick={() => deleteTag(tag.id)}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
