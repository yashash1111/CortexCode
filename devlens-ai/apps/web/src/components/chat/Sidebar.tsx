'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, MessageSquare, MoreVertical, Edit2, Trash2, Archive,
  Settings, LogOut, ChevronLeft, ChevronRight, Menu, X, Sparkles, Moon
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface Conversation {
  id: string;
  title: string;
  group: string;
  updatedAt: string;
}

interface SidebarProps {
  conversations: Record<string, unknown[]>;
  activeConvId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  onClearAllChats: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  userName: string;
  userEmail: string;
}

export default function Sidebar({
  conversations,
  activeConvId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onArchiveConversation,
  onClearAllChats,
  onOpenSettings,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
  isMobileOpen,
  onMobileClose,
  userName,
  userEmail
}: SidebarProps) {
  const toast = useToast();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (conv: unknown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
      toast.showSuccess('Renamed', 'Conversation title updated');
    }
    setEditingId(null);
  };

  const groups = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

  return (
    <>
      {/* Mobile Drawer Overlay Back-drop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden animate-fade-in-up"
        />
      )}

      {/* Main Collapsible Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-zinc-950/95 border-r border-white/10 flex flex-col justify-between transition-all duration-300 backdrop-blur-2xl ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header Section */}
        <div className="p-4 flex flex-col h-full overflow-hidden">
          
          {/* Logo & Application Identity */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/workspace"
              className="flex items-center gap-3 group px-1 py-1"
            >
              <img
                src="/logo.jpg"
                alt="CortexCode Logo"
                className="w-10 h-10 rounded-xl border border-white/20 shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform object-cover shrink-0"
              />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-200 to-pink-300 truncate">
                    CortexCode
                  </div>
                  <div className="text-[9px] font-semibold text-purple-400 tracking-wider uppercase truncate">
                    Think. Code. Build. Grow.
                  </div>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Primary Button */}
          <button
            onClick={() => {
              onNewChat();
              if (isMobileOpen) onMobileClose();
            }}
            className={`w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] transform hover:scale-[1.02] mb-4 shrink-0 ${
              isCollapsed ? 'px-0' : 'px-4'
            }`}
          >
            <Plus size={18} className="shrink-0" />
            {!isCollapsed && <span>New Chat</span>}
          </button>

          {/* Project Brain Link */}
          <Link
            href="/workspace/brain"
            className={`w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-400/50 text-blue-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all mb-3 shrink-0 ${isCollapsed ? 'px-0' : 'px-4'}`}
          >
            <span className="shrink-0">🧠</span>
            {!isCollapsed && <span>Project Brain</span>}
          </Link>

          {/* Search Conversations Input */}
          {!isCollapsed && (
            <div className="relative mb-4 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search conversations..."
                className="w-full px-3.5 py-2 pl-9 bg-zinc-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 backdrop-blur-md"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          )}

          {/* Grouped Conversations History List */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Clear All Chats button */}
              {Object.values(conversations).some(g => (g as unknown[]).length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all chats? This cannot be undone.')) {
                      onClearAllChats();
                    }
                  }}
                  className="w-full text-[10px] font-bold text-zinc-500 hover:text-red-400 hover:bg-red-950/20 py-1.5 px-3 rounded-lg transition-colors text-left flex items-center gap-1.5"
                >
                  <Trash2 size={11} />
                  Clear all chats
                </button>
              )}
              {groups.map((group) => {
                const list = conversations[group] || [];
                if (list.length === 0) return null;

                return (
                  <div key={group} className="space-y-1">
                    <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                      <MessageSquare size={11} className="text-purple-400" />
                      {group}
                    </div>

                    {list.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          if (isMobileOpen) onMobileClose();
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all ${
                          activeConvId === conv.id
                            ? 'bg-purple-600/30 border border-purple-500/50 text-white font-bold shadow-md'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {editingId === conv.id ? (
                          <form onSubmit={(e) => handleSaveRename(conv.id, e)} className="flex-1 mr-2">
                            <input
                              type="text"
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={(e) => handleSaveRename(conv.id, e as unknown)}
                              className="w-full px-2 py-1 bg-black border border-purple-500 rounded text-xs text-white outline-none"
                            />
                          </form>
                        ) : (
                          <div className="min-w-0 flex-1 mr-2">
                            <div className="text-xs truncate font-medium">{conv.title}</div>
                          </div>
                        )}

                        {/* Hover Action Menu Trigger */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === conv.id ? null : conv.id);
                            }}
                            className="p-1 text-zinc-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {activeMenuId === conv.id && (
                            <div className="absolute right-0 top-6 w-36 bg-zinc-900 border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in-up">
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(conv, e)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Edit2 size={12} /> Rename
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveConversation(conv.id);
                                  setActiveMenuId(null);
                                  toast.showInfo('Archived', 'Conversation archived');
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Archive size={12} /> Archive
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteConversation(conv.id);
                                  setActiveMenuId(null);
                                  toast.showError('Deleted', 'Conversation deleted');
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Bottom User Profile & Settings Drawer Trigger */}
        <div className="p-3 border-t border-white/10 bg-black/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all text-left group min-w-0 ${
                isCollapsed ? 'justify-center w-full' : 'flex-1'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0">
                {userName.charAt(0)}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{userName}</div>
                  <div className="text-[10px] text-purple-400 font-semibold truncate">{userEmail}</div>
                </div>
              )}
            </button>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenSettings}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

      </aside>
    </>
  );
}
