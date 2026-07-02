'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, X, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import { 
  addMenuItem, 
  updateMenuItemPrice, 
  toggleMenuItemAvailability, 
  deleteMenuItem 
} from './actions';

interface MenuItem {
  id: string;
  name: string;
  category: 'SNACKS' | 'BEVERAGES' | 'QUICK_MEALS' | 'CHINESE' | 'CUSTOM';
  costPrice: number;
  sellPrice: number;
  isAvailable: boolean;
  imageUrl: string | null;
}

interface MenuManagerClientProps {
  initialMenuItems: MenuItem[];
}

const CATEGORIES_ORDER = [
  { id: 'SNACKS', label: 'Snacks' },
  { id: 'BEVERAGES', label: 'Beverages' },
  { id: 'QUICK_MEALS', label: 'Quick Meals' },
  { id: 'CHINESE', label: 'Chinese' },
  { id: 'CUSTOM', label: 'Custom' },
];

export default function MenuManagerClient({ initialMenuItems }: MenuManagerClientProps) {
  const [items, setItems] = useState<MenuItem[]>(initialMenuItems);
  
  // Inline editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add Item form state
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState<'SNACKS' | 'BEVERAGES' | 'QUICK_MEALS' | 'CHINESE' | 'CUSTOM'>('SNACKS');
  const [isAdding, setIsAdding] = useState(false);

  // General error state
  const [errorMsg, setErrorMsg] = useState('');

  // Add item handler
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!newName.trim()) return setErrorMsg('Item name is required');
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) return setErrorMsg('Please enter a valid price');

    setIsAdding(true);
    try {
      const result = await addMenuItem({
        name: newName.trim(),
        sellPrice: priceNum,
        category: newCategory,
      });

      if (result.success) {
        // Refresh local state by refetching/reloading (or manually appending is fine)
        // Since we are simulating, we will just reload or update state manually.
        // Let's reload to trigger Server Component refresh
        window.location.reload();
      } else {
        setErrorMsg(result.error || 'Failed to add item');
        setIsAdding(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create item');
      setIsAdding(false);
    }
  };

  // Toggle availability with optimistic updates
  const handleToggleAvailable = async (itemId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    
    // Optimistic Update
    setItems((prev) => 
      prev.map((item) => (item.id === itemId ? { ...item, isAvailable: newVal } : item))
    );

    try {
      const result = await toggleMenuItemAvailability(itemId, newVal);
      if (!result.success) {
        // Revert on failure
        setItems((prev) => 
          prev.map((item) => (item.id === itemId ? { ...item, isAvailable: currentVal } : item))
        );
        setErrorMsg(result.error || 'Failed to toggle availability');
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setItems((prev) => 
        prev.map((item) => (item.id === itemId ? { ...item, isAvailable: currentVal } : item))
      );
      setErrorMsg('Failed to update availability');
    }
  };

  // Edit price trigger
  const startEditPrice = (item: MenuItem) => {
    setEditingPriceId(item.id);
    setTempPrice(item.sellPrice.toString());
  };

  // Save price update
  const handleSavePrice = async (itemId: string) => {
    setErrorMsg('');
    const priceNum = parseFloat(tempPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }

    try {
      const result = await updateMenuItemPrice(itemId, priceNum);
      if (result.success) {
        setItems((prev) => 
          prev.map((item) => (item.id === itemId ? { ...item, sellPrice: priceNum } : item))
        );
        setEditingPriceId(null);
      } else {
        setErrorMsg(result.error || 'Failed to update price');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save price changes');
    }
  };

  // Delete item handler
  const handleDeleteItem = async (itemId: string) => {
    setErrorMsg('');
    try {
      const result = await deleteMenuItem(itemId);
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        setConfirmDeleteId(null);
      } else {
        setErrorMsg(result.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete item');
    }
  };

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-6">
        
        {/* Title */}
        <div className="flex justify-between items-center border-b border-brand-deep/10 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-deep">Menu Management</h1>
            <p className="text-xs opacity-60 mt-1">Configure available products, prices, and catalog</p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Menu Items Table Grouped by Category */}
        <div className="flex flex-col gap-8 bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs">
          {CATEGORIES_ORDER.map((cat) => {
            const catItems = items.filter((i) => i.category === cat.id);
            return (
              <section key={cat.id} className="border-b border-brand-deep/5 last:border-0 pb-6 last:pb-0">
                <h3 className="text-xs font-bold text-brand-deep uppercase tracking-wider mb-4 opacity-75">
                  {cat.label} ({catItems.length})
                </h3>

                {catItems.length === 0 ? (
                  <p className="text-xs italic opacity-40 py-2">No items in this category yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-brand-deep border-collapse">
                      <thead>
                        <tr className="border-b border-brand-deep/10 opacity-60 text-xs font-semibold">
                          <th className="py-2.5">Item Name</th>
                          <th className="py-2.5 w-[140px]">Price (₹)</th>
                          <th className="py-2.5 w-[120px] text-center">Available</th>
                          <th className="py-2.5 w-[100px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catItems.map((item) => (
                          <tr key={item.id} className="border-b border-brand-deep/5 last:border-0 hover:bg-bg-warm/15">
                            <td className="py-3 font-semibold">{item.name}</td>
                            <td className="py-3">
                              {editingPriceId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={tempPrice}
                                    onChange={(e) => setTempPrice(e.target.value)}
                                    className="w-16 p-1 text-xs border rounded-sm focus:outline-hidden"
                                    min="1"
                                    step="1"
                                  />
                                  <button
                                    onClick={() => handleSavePrice(item.id)}
                                    className="p-1 bg-fresh text-bg-warm rounded-sm hover:opacity-90"
                                    aria-label="Save price"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingPriceId(null)}
                                    className="p-1 bg-alert/20 text-alert rounded-sm hover:opacity-90"
                                    aria-label="Cancel edit"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => startEditPrice(item)}
                                  className="cursor-pointer hover:underline text-brand-accent font-bold"
                                  title="Click to edit price inline"
                                >
                                  ₹{item.sellPrice}
                                </div>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.isAvailable}
                                onChange={() => handleToggleAvailable(item.id, item.isAvailable)}
                                className="w-4 h-4 accent-fresh cursor-pointer"
                              />
                            </td>
                            <td className="py-3 text-right">
                              {confirmDeleteId === item.id ? (
                                <div className="flex justify-end gap-1.5 items-center">
                                  <span className="text-[10px] text-alert font-bold">Confirm?</span>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="px-2 py-0.5 bg-alert text-bg-warm text-[10px] rounded-md font-bold hover:bg-alert/90"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-0.5 bg-brand-deep/10 text-brand-deep text-[10px] rounded-md font-bold hover:bg-brand-deep/20"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="text-brand-deep/50 hover:text-alert p-1 transition"
                                  aria-label="Delete item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Add Item Form at the bottom */}
        <div className="bg-white p-6 rounded-xl border border-brand-deep/10 shadow-sm">
          <h2 className="text-md font-bold text-brand-deep border-b border-brand-deep/10 pb-2 mb-4 flex items-center gap-1.5">
            <Sparkles size={16} className="text-brand-accent" />
            Add New Menu Item
          </h2>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="sm:col-span-2">
              <label htmlFor="new-name" className="block text-xs font-semibold text-brand-deep mb-1">
                Item Name
              </label>
              <input
                id="new-name"
                type="text"
                placeholder="e.g. Paneer Samosa"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-sm bg-bg-warm/5"
              />
            </div>

            <div>
              <label htmlFor="new-price" className="block text-xs font-semibold text-brand-deep mb-1">
                Price (₹)
              </label>
              <input
                id="new-price"
                type="number"
                placeholder="20"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-sm bg-bg-warm/5"
                min="1"
              />
            </div>

            <div>
              <label htmlFor="new-category" className="block text-xs font-semibold text-brand-deep mb-1">
                Category
              </label>
              <select
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-sm bg-bg-warm/5 font-semibold"
              >
                {CATEGORIES_ORDER.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end mt-2">
              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2.5 bg-brand-deep hover:bg-brand-deep/90 text-bg-warm font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 text-sm"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Item to Menu
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
