// src/features/admin/components/scheduling/WorkingBlockedDatesManager.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";
import { delightfulToast } from "@/lib/delightful-toast";
import { api } from "@/lib/api";

interface BlockedDatesManagerProps {
  className?: string;
}

export function WorkingBlockedDatesManager({ className }: BlockedDatesManagerProps) {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "TRAVEL" as "TRAVEL" | "COMPETITION" | "OTHER"
  });

  // Get utils context for invalidating queries
  const utils = api.useContext();
  
  // Fetch blocked dates
  const { data: blockedDates, refetch } = api.admin.schedule.getBlockedDates.useQuery({});

  // Create mutation
  const createMutation = api.admin.schedule.createBlockedDate.useMutation({
    onSuccess: (result) => {
      delightfulToast.success(`Perfect! ${result.message} ✨`, "Your schedule is protected!", "admin");
      setIsCreateFormOpen(false);
      setFormData({ title: "", description: "", startDate: "", endDate: "", type: "TRAVEL" });
      refetch();
      
      // Also invalidate calendar data to refresh without page reload
      utils.admin.schedule.getTimeSlots.invalidate();
      utils.admin.schedule.getBlockedDates.invalidate();
    },
    onError: (error) => {
      delightfulToast.error(error.message, "admin");
    },
  });

  // Delete mutation
  const deleteMutation = api.admin.schedule.deleteBlockedDate.useMutation({
    onSuccess: (result) => {
      delightfulToast.success(`Perfect! ${result.message} ✨`, "Your calendar is beautifully organized!", "admin");
      refetch();
    },
    onError: (error) => {
      delightfulToast.error(error.message, "admin");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error("Error", { description: "Please fill in all required fields" });
      return;
    }

    // Fix timezone issue by creating dates at local time (not UTC)
    const startDate = new Date(formData.startDate + 'T00:00:00');
    const endDate = new Date(formData.endDate + 'T23:59:59');
    
    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      startDate,
      endDate,
      type: formData.type,
    });
  };

  const handleDelete = (id: string) => {
    showDeleteConfirmation("blocked period", () => {
      deleteMutation.mutate({ id });
    });
  };

  return (
    <div style={{ padding: '16px', maxWidth: '480px', fontSize: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Blocked Dates</h2>
        <button
          onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
          style={{
            padding: '6px 12px',
            backgroundColor: isCreateFormOpen ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          {isCreateFormOpen ? 'Cancel' : '+ Block Dates'}
        </button>
      </div>

      {isCreateFormOpen && (
        <form onSubmit={handleSubmit} style={{ 
          marginBottom: '20px', 
          padding: '14px', 
          border: '1px solid #ddd', 
          borderRadius: '6px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Create Blocked Period</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Regional Competition"
              style={{
                width: '100%',
                padding: '7px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              style={{
                width: '100%',
                padding: '7px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            >
              <option value="TRAVEL">Travel</option>
              <option value="COMPETITION">Competition</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '7px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '7px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '13px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this blocked period"
              rows={2}
              style={{
                width: '100%',
                padding: '7px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            style={{
              padding: '8px 16px',
              backgroundColor: createMutation.isPending ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {createMutation.isPending ? 'Creating...' : 'Block Dates'}
          </button>
        </form>
      )}

      {/* Existing blocked dates */}
      <div>
        <h3>Existing Blocked Periods</h3>
        {!blockedDates || blockedDates.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No blocked date ranges configured
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blockedDates.map((blockedDate) => (
              <div
                key={blockedDate.id}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {blockedDate.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {new Date(blockedDate.startDate).toLocaleDateString()} - {new Date(blockedDate.endDate).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {blockedDate.type.toLowerCase()} • Created by {blockedDate.User.name}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(blockedDate.id)}
                  disabled={deleteMutation.isPending}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}