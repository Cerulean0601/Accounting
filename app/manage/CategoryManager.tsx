'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category } from './types';

interface CategoryManagerProps {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  onReload: () => void;
}

function SortableItem({ subCategory, onEdit, onDelete }: {
  subCategory: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: subCategory.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="nes-container">
      <span>🔸 {subCategory.name}</span>
      <div>
        <button className="nes-btn is-warning" style={{ marginRight: '5px' }} onClick={() => onEdit(subCategory)}>編輯</button>
        <button className="nes-btn is-error" onClick={() => onDelete(subCategory.id)}>刪除</button>
      </div>
    </div>
  );
}

export default function CategoryManager({ categories, setCategories, onReload }: CategoryManagerProps) {
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' as 'income' | 'expense', parent_id: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const mainCategories = categories.filter(cat => !cat.parent_id);
  const getSubCategories = (parentId: string) =>
    categories.filter(cat => cat.parent_id === parentId).sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        alert('編輯功能尚未實作');
        return;
      }
      if (categoryForm.parent_id) {
        const response = await fetch('/api/subcategories', {
          method: 'POST',
          body: JSON.stringify({ category_id: categoryForm.parent_id, name: categoryForm.name }),
        });
        if (response.ok) { onReload(); setCategoryForm({ name: '', type: 'expense', parent_id: '' }); alert('子分類新增成功！'); }
        else alert('子分類新增失敗');
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: categoryForm.name, color: '#ff6b6b', type: categoryForm.type }),
        });
        if (response.ok) { onReload(); setCategoryForm({ name: '', type: 'expense', parent_id: '' }); alert('分類新增成功！'); }
        else alert('分類新增失敗');
      }
    } catch (error) {
      console.error('分類操作失敗:', error);
      alert('操作失敗');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('確定要刪除此分類嗎？')) return;
    try {
      const category = categories.find(cat => cat.id === id);
      const endpoint = category?.parent_id ? `/api/subcategories/${id}` : `/api/categories/${id}`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (response.ok) { onReload(); alert('刪除成功！'); }
      else { const errorData = await response.json(); alert(errorData.error || '刪除失敗'); }
    } catch (error) {
      console.error('刪除分類失敗:', error);
      alert('刪除失敗');
    }
  };

  const handleDragEnd = async (event: DragEndEvent, parentId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const subCategories = getSubCategories(parentId);
      const oldIndex = subCategories.findIndex(item => item.id === active.id);
      const newIndex = subCategories.findIndex(item => item.id === over?.id);
      const newOrder = arrayMove(subCategories, oldIndex, newIndex);

      setCategories(categories.map(cat => {
        if (cat.parent_id === parentId) {
          const newIdx = newOrder.findIndex(item => item.id === cat.id);
          return { ...cat, sort_order: newIdx + 1 };
        }
        return cat;
      }));

      try {
        await fetch('/api/subcategories/reorder', { method: 'PUT', body: JSON.stringify({ subcategory_ids: newOrder.map(item => item.id) }) });
      } catch (error) {
        console.error('排序更新失敗:', error);
        onReload();
      }
    }
  };

  const onEdit = (cat: Category) => {
    setCategoryForm({ name: cat.name, type: cat.type, parent_id: cat.parent_id || '' });
    setEditingCategory(cat.id);
  };

  return (
    <div>
      <style jsx global>{`.nes-container:active { z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }`}</style>

      <div className="nes-container">
        <p className="title">{editingCategory ? '編輯' : '新增'}分類</p>
        <form onSubmit={handleSubmit}>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>分類名稱</label>
            <input className="nes-input" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button type="button" className={`nes-btn ${categoryForm.type === 'expense' ? 'is-error' : ''}`} onClick={() => setCategoryForm({ ...categoryForm, type: 'expense' })}>支出</button>
            <button type="button" className={`nes-btn ${categoryForm.type === 'income' ? 'is-success' : ''}`} onClick={() => setCategoryForm({ ...categoryForm, type: 'income' })}>收入</button>
          </div>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>主分類</label>
            <div className="nes-select">
              <select value={categoryForm.parent_id} onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}>
                <option value="">無（作為主分類）</option>
                {mainCategories.filter(cat => cat.type === categoryForm.type).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="nes-btn is-primary">{editingCategory ? '更新' : '新增'}</button>
            {editingCategory && (
              <button type="button" className="nes-btn" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', type: 'expense', parent_id: '' }); }}>取消</button>
            )}
          </div>
        </form>
      </div>

      <div className="nes-container">
        <p className="title">分類列表</p>
        {mainCategories.map(category => (
          <div key={category.id} style={{ marginBottom: '15px' }}>
            <div className="nes-container is-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className={`nes-icon ${category.type === 'income' ? 'like' : 'coin'}`}></i>{category.name}</span>
              <div>
                <button className="nes-btn is-warning" style={{ marginRight: '5px' }} onClick={() => onEdit(category)}>編輯</button>
                <button className="nes-btn is-error" onClick={() => deleteCategory(category.id)}>刪除</button>
              </div>
            </div>
            {getSubCategories(category.id).length > 0 && (
              <div style={{ marginLeft: '20px' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, category.id)}>
                  <SortableContext items={getSubCategories(category.id).map(item => item.id)} strategy={verticalListSortingStrategy}>
                    {getSubCategories(category.id).map((sub) => (
                      <SortableItem key={sub.id} subCategory={sub} onEdit={onEdit} onDelete={deleteCategory} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
