'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, MessageSquare, MoreVertical, Edit2, Trash2, Archive,
  Settings, LogOut, ChevronLeft, ChevronRight, X, Home, BookOpen,
  Target, Bot, ShieldCheck, Award, GitBranch, Code2, GitPullRequest,
  FileText, Activity, Shield
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import type { WorkspaceTab } from '@/features/workspace/CommandPalette';

interface Conversation {
  id: string;
  title: string;
  group: string;
  updatedAt: string;
}

interface SidebarProps {
  conversations: Record<string, Conversation[]>;
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
  userRole?: string;
  activeWorkspaceTab?: WorkspaceTab;
  onSelectWorkspaceTab?: (tab: WorkspaceTab) => void;
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
  userEmail,
  userRole,
  activeWorkspaceTab = 'chat',
  onSelectWorkspaceTab,
}: SidebarProps) {
  const toast = useToast();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
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
        className={`fixed md:relative inset-y-0 left-0 z-50 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col justify-between transition-all duration-300 backdrop-blur-2xl ${
          isCollapsed ? 'w-20' : 'w-64 lg:w-68'
        } ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header Section */}
        <div className="p-3.5 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Logo & Application Identity */}
          <div className="flex items-center justify-between mb-3.5 shrink-0">
            <Link href="/workspace" className="flex items-center gap-2.5 group px-1 py-0.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-[1px] shadow-md shadow-violet-600/25 shrink-0">
                <img
                  src="/logo.jpg"
                  alt="CortexCode Logo"
                  className="w-full h-full rounded-[11px] object-cover"
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                    CortexCode
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--accent-primary)] px-1.5 py-0.5 bg-[var(--accent-soft)] border border-[var(--accent-border)] rounded-full">
                    Pro
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] rounded-lg transition-colors shrink-0 cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* New Chat Primary Gradient Button */}
          <button
            onClick={() => {
              onNewChat();
              if (onSelectWorkspaceTab) onSelectWorkspaceTab('chat');
              if (isMobileOpen) onMobileClose();
            }}
            className={`w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-between shadow-lg shadow-violet-600/25 transition-all mb-3 shrink-0 cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : 'px-3.5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus size={15} />
              {!isCollapsed && <span>New Chat</span>}
            </span>
            {!isCollapsed && (
              <kbd className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/15 text-white/90">
                ⌘K
              </kbd>
            )}
          </button>

          {/* Search Conversations Input */}
          {!isCollapsed && (
            <div className="relative mb-3 shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search conversations..."
                className="w-full px-3 py-2 pl-8 bg-[var(--input-bg)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
          )}

          {/* Scrollable Sidebar Navigation + Conversations */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 custom-scrollbar">
            {/* Primary Workspace Modules */}
            <div className="space-y-0.5">
              <Link
                href="/"
                onClick={() => { if (isMobileOpen) onMobileClose(); }}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] transition-colors ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title="Home"
              >
                <Home size={15} className="text-[var(--text-muted)] shrink-0" />
                {!isCollapsed && <span>Home</span>}
              </Link>

              {onSelectWorkspaceTab && (
                <>
                  {[
                    { id: 'chat' as WorkspaceTab, label: 'AI Chat', icon: MessageSquare },
                    { id: 'study' as WorkspaceTab, label: 'Study Mode', icon: BookOpen },
                    { id: 'goals' as WorkspaceTab, label: 'Goal Roadmap', icon: Target },
                    { id: 'agents' as WorkspaceTab, label: 'Multi-Agent', icon: Bot },
                    { id: 'security' as WorkspaceTab, label: 'Security', icon: ShieldCheck },
                    { id: 'assessments' as WorkspaceTab, label: 'Assessments', icon: Award },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeWorkspaceTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectWorkspaceTab(item.id);
                          if (isMobileOpen) onMobileClose();
                        }}
                        title={item.label}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                          isCollapsed ? 'justify-center' : ''
                        } ${
                          active
                            ? 'bg-gradient-to-r from-violet-600/25 to-indigo-600/15 border border-[var(--accent-border)] text-[var(--text-primary)] font-semibold shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] border border-transparent'
                        }`}
                      >
                        <Icon size={15} className={active ? 'text-[var(--accent-primary)] shrink-0' : 'text-[var(--text-muted)] shrink-0'} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Developer Tools Section */}
            <div className="pt-3 border-t border-[var(--sidebar-border)] space-y-0.5">
              {[
                { href: '/github', label: 'GitHub Integration', icon: GitBranch },
                { href: '/github', label: 'Code Analysis', icon: Code2 },
                { href: '/github', label: 'PR Review', icon: GitPullRequest },
                { href: '/docs', label: 'Documentation', icon: FileText, badge: 'New' },
                { href: '/observability', label: 'Observability', icon: Activity },
              ].map((nav) => {
                const Icon = nav.icon;
                return (
                  <Link
                    key={nav.label}
                    href={nav.href}
                    onClick={() => { if (isMobileOpen) onMobileClose(); }}
                    title={nav.label}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] transition-colors ${
                      isCollapsed ? 'justify-center' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon size={15} className="text-[var(--text-muted)] shrink-0" />
                      {!isCollapsed && <span className="truncate">{nav.label}</span>}
                    </span>
                    {!isCollapsed && nav.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-border)]">
                        {nav.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {userRole === 'ADMIN' && (
                <Link
                  href="/admin/ai-providers"
                  onClick={() => { if (isMobileOpen) onMobileClose(); }}
                  title="AI Providers (Admin)"
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                >
                  <Shield size={15} className="text-[var(--accent-primary)] shrink-0" />
                  {!isCollapsed && <span>AI Providers (Admin)</span>}
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  if (isMobileOpen) onMobileClose();
                }}
                title="Settings"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] transition-colors cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <Settings size={15} className="text-[var(--text-muted)] shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </button>
            </div>

            {/* Grouped Conversations History List */}
            {!isCollapsed && (
              <div className="pt-3 border-t border-[var(--sidebar-border)] space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Conversations
                  </span>
                  {Object.values(conversations).some(g => (g as unknown[]).length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all chats? This cannot be undone.')) {
                          onClearAllChats();
                        }
                      }}
                      className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={10} />
                      Clear
                    </button>
                  )}
                </div>

                {groups.map((group) => {
                  const list = conversations[group] || [];
                  if (list.length === 0) return null;

                  return (
                    <div key={group} className="space-y-1">
                      <div className="text-[10px] font-semibold text-[var(--text-muted)] px-2">
                        {group}
                      </div>

                      {list.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            if (onSelectWorkspaceTab) onSelectWorkspaceTab('chat');
                            if (isMobileOpen) onMobileClose();
                          }}
                          className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-left cursor-pointer transition-all ${
                            activeConvId === conv.id
                              ? 'bg-[var(--sidebar-item-active)] border border-[var(--accent-border)] text-[var(--text-primary)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] border border-transparent'
                          }`}
                        >
                          {editingId === conv.id ? (
                            <form onSubmit={(e) => handleSaveRename(conv.id, e)} className="flex-1 mr-2">
                              <input
                                type="text"
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={(e) => handleSaveRename(conv.id, e as unknown as React.FormEvent)}
                                className="w-full px-2 py-1 bg-[var(--input-bg)] border border-[var(--accent-primary)] rounded text-xs text-[var(--text-primary)] outline-none"
                              />
                            </form>
                          ) : (
                            <div className="min-w-0 flex-1 mr-2">
                              <div className="text-xs truncate">{conv.title}</div>
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
                              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {activeMenuId === conv.id && (
                              <div className="absolute right-0 top-6 w-36 bg-[var(--dropdown-bg)] border border-[var(--dropdown-border)] rounded-xl shadow-2xl p-1.5 z-50">
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(conv, e)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
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
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
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
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors"
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
        </div>

        {/* Bottom User Profile & Settings Drawer Trigger */}
        <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--bg-secondary)]/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--sidebar-item-hover)] transition-all text-left group min-w-0 cursor-pointer ${
                isCollapsed ? 'justify-center w-full' : 'flex-1'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-md shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{userName}</div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">{userEmail}</div>
                </div>
              )}
            </button>

            {!isCollapsed && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)] rounded-lg transition-colors cursor-pointer"
                  title="Settings"
                >
                  <Settings size={15} />
                </button>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
