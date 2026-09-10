'use client';

import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Loader2,
  ChevronRight,
  Building2,
  IndianRupee,
  Shield,
  Paperclip,
  Plus,
  Trash2,
  Calculator,
  ListOrdered,
} from 'lucide-react';
import { updateLead, type LeadInput } from '@/actions/leads';
import { toast } from 'sonner';
import { LeadLineItem, parseLineItemsFromLead, formatLineItemsToPayload, cleanSpecifications } from '@/lib/leadUtils';

interface Category {
  id: string;
  name: string;
}

export function EditLeadModal({
  isOpen,
  onClose,
  lead,
  categories,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  categories: Category[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    customer_name: string;
    lead_name: string;
    category_id: string;
    due_date: string;
    delivery_terms: string;
    warranty: string;
    gst_rate: number;
    remarks: string;
    status: 'draft' | 'ready_to_send' | 'sent' | 'quoted' | 'completed' | 'cancelled';
  }>({
    customer_name: '',
    lead_name: '',
    category_id: '',
    due_date: '',
    delivery_terms: '',
    warranty: '',
    gst_rate: 18,
    remarks: '',
    status: 'draft',
  });

  const [lineItems, setLineItems] = useState<LeadLineItem[]>([]);

  useEffect(() => {
    if (lead) {
      setFormData({
        customer_name: lead.customer_name || '',
        lead_name: lead.lead_name || '',
        category_id: lead.category_id || '',
        due_date: lead.due_date || '',
        delivery_terms: lead.delivery_terms || '',
        warranty: lead.warranty || '',
        gst_rate: lead.gst_rate != null ? Number(lead.gst_rate) : 18,
        remarks: cleanSpecifications(lead.remarks) || cleanSpecifications(lead.specifications),
        status: lead.status || 'draft',
      });

      const parsedItems = parseLineItemsFromLead(lead);
      setLineItems(parsedItems);
    }
  }, [lead]);

  // Keyboard shortcut listener (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const handleAddLineItem = () => {
    const newItem: LeadLineItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      product_item: '',
      quantity: 1,
      unit_price_estimate: undefined,
      specifications: '',
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      toast.error('At least one line item is required.');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof LeadLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Financial calculations
  const subtotalEstimate = lineItems.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.unit_price_estimate || 0),
    0
  );
  const gstAmount = subtotalEstimate * (formData.gst_rate / 100);
  const grandTotalEstimate = subtotalEstimate + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name?.trim() || !formData.lead_name?.trim()) {
      toast.error('Please fill in Customer Name and Lead Title');
      return;
    }

    const invalidItems = lineItems.filter((it) => !it.product_item?.trim() || !it.quantity || it.quantity < 1);
    if (invalidItems.length > 0) {
      toast.error('Please ensure all line items have a product description and quantity.');
      return;
    }

    setLoading(true);

    const payloadFields = formatLineItemsToPayload(lineItems, formData.remarks);

    const updatePayload: Partial<LeadInput> = {
      customer_name: formData.customer_name,
      lead_name: formData.lead_name,
      product_item: payloadFields.product_item,
      quantity: payloadFields.quantity,
      unit_price_estimate: payloadFields.unit_price_estimate,
      specifications: payloadFields.specifications,
      due_date: formData.due_date || undefined,
      category_id: formData.category_id || undefined,
      delivery_terms: formData.delivery_terms || undefined,
      warranty: formData.warranty || undefined,
      gst_rate: formData.gst_rate,
      remarks: formData.remarks,
      status: formData.status,
    };

    const res = await updateLead(lead.id, updatePayload);
    setLoading(false);

    if (res.success) {
      toast.success(`Lead "${lead.lead_number}" updated successfully!`);
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Failed to update lead');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl flex flex-col h-[calc(100dvh-2.5rem)] max-h-[820px] shadow-2xl shadow-slate-950/50 overflow-hidden my-auto"
      >
        {/* Enterprise Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-[#0d1527] shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                <span>Enterprise RFQ Portal</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <span className="font-mono text-slate-500 dark:text-slate-400">{lead.lead_number}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                Edit Lead Requirements & Line Items
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-md">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {/* Client & Metadata */}
          <div className="bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-4.5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  1. Client & Lead Title
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lead / PO Title <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lead_name}
                  onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Category</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Enterprise Multi Line-Item Table */}
          <div className="bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-4.5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  2. Procurement Line Items ({lineItems.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 flex items-center space-x-1.5 transition-all active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line Item</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {lineItems.map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price_estimate || 0);

                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 sm:p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 rounded-xl space-y-3 relative group shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Line Item #{idx + 1}
                        </span>
                      </div>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Product / Item Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lenovo ThinkPad P16 Gen 2 Workstation"
                          value={item.product_item}
                          onChange={(e) => handleUpdateLineItem(idx, 'product_item', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Quantity <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Est. Unit Price (₹ INR)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="e.g. 245000"
                            value={item.unit_price_estimate || ''}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                idx,
                                'unit_price_estimate',
                                parseFloat(e.target.value) || undefined
                              )
                            }
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                          />
                          {lineTotal > 0 && (
                            <span className="absolute right-2.5 top-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Sub: ₹{lineTotal.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-12">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Item Technical Specifications / Model Details
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Intel i9-13900HX, 64GB RAM, 2TB SSD, RTX 4000 Ada 12GB..."
                          value={item.specifications || ''}
                          onChange={(e) => handleUpdateLineItem(idx, 'specifications', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Calculations Summary Bar */}
            <div className="p-3.5 bg-gradient-to-br from-slate-900 to-[#0b1324] text-white rounded-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800 shadow-sm">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  Estimated Financial Summary ({lineItems.reduce((acc, i) => acc + (i.quantity || 0), 0)} Total Units)
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs font-medium">
                <div>
                  <span className="text-slate-400 text-[11px]">Subtotal: </span>
                  <span className="font-mono font-bold text-slate-100">
                    ₹{subtotalEstimate.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">GST ({formData.gst_rate}%): </span>
                  <span className="font-mono font-bold text-slate-300">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pl-2 border-l border-slate-700">
                  <span className="text-slate-300 text-[11px]">Grand Total: </span>
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">
                    ₹{grandTotalEstimate.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Commercial Terms & Workflow */}
          <div className="bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-4.5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  3. Commercial Terms & Workflow Stage
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GST Rate (%)</label>
                <input
                  type="number"
                  value={formData.gst_rate}
                  onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) || 18 })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Due Date</label>
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Terms</label>
                <input
                  type="text"
                  value={formData.delivery_terms || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Workflow Stage</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="draft">Draft</option>
                  <option value="ready_to_send">Ready to Send</option>
                  <option value="sent">Sent to Vendors</option>
                  <option value="quoted">Quotes Received</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Warranty Required</label>
                <input
                  type="text"
                  value={formData.warranty || ''}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks & Internal Notes</label>
                <input
                  type="text"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Pinned Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#0d1527] flex items-center justify-end space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] shadow-md shadow-indigo-600/30 flex items-center space-x-2 disabled:opacity-50 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Lead & Line Items</span>
          </button>
        </div>
      </form>
    </div>
  );
}
