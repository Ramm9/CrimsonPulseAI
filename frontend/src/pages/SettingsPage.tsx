import { useState } from 'react'
import {
  Settings,
  User,
  Building,
  Users,
  Bell,
  Sliders,
  Palette,
  Shield,
  Save,
  Plus,
  Trash2,
  Mail,
} from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { formatRelativeTime } from '@/utils/helpers'
import { useAppStore } from '@/store/appStore'

type SettingsTab =
  | 'profile'
  | 'workspace'
  | 'team'
  | 'notifications'
  | 'alerts'
  | 'appearance'

export function SettingsPage() {
  const { addToast } = useAppStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Profile state
  const [profileName, setProfileName] = useState('Alex Chen')
  const [profileEmail, setProfileEmail] = useState('alex.chen@acmecorp.io')

  // Workspace state
  const [wsName, setWsName] = useState('Acme Corporation')
  const [wsRetention, setWsRetention] = useState('30')
  const [wsDefaultEnv, setWsDefaultEnv] = useState('production')

  // Notification toggles
  const [notifyCritical, setNotifyCritical] = useState(true)
  const [notifyAnomaly, setNotifyAnomaly] = useState(true)
  const [notifySlack, setNotifySlack] = useState(true)
  const [notifyWeekly, setNotifyWeekly] = useState(false)
  const [notifyDeploy, setNotifyDeploy] = useState(true)

  // Alert thresholds
  const [errorThreshold, setErrorThreshold] = useState('5.0')
  const [latencyThreshold, setLatencyThreshold] = useState('500')
  const [anomalyThreshold, setAnomalyThreshold] = useState('0.75')
  const [autoCreateIncident, setAutoCreateIncident] = useState(true)

  // Appearance
  const [timeFormat, setTimeFormat] = useState('24h')
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')

  // Team state
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 'm1',
      name: 'Alex Chen',
      email: 'alex.chen@acmecorp.io',
      role: 'Owner',
      joined: '3 months ago',
    },
    {
      id: 'm2',
      name: 'Sarah Kim',
      email: 'sarah.kim@acmecorp.io',
      role: 'Admin',
      joined: '2 months ago',
    },
    {
      id: 'm3',
      name: 'Marcus Johnson',
      email: 'marcus.j@acmecorp.io',
      role: 'Developer',
      joined: '1 month ago',
    },
    {
      id: 'm4',
      name: 'Elena Rodriguez',
      email: 'elena.r@acmecorp.io',
      role: 'Developer',
      joined: '2 weeks ago',
    },
    {
      id: 'm5',
      name: 'James Park',
      email: 'james.park@acmecorp.io',
      role: 'Viewer',
      joined: '5 days ago',
    },
  ])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Developer')

  const handleSave = (section: string) => {
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'Preferences Saved',
      message: `${section} settings updated successfully`,
    })
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setTeamMembers((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        joined: 'Just now',
      },
    ])
    setInviteEmail('')
    setInviteModalOpen(false)
    addToast({
      id: Math.random().toString(),
      type: 'success',
      title: 'Invitation Sent',
      message: `Invite delivered to ${inviteEmail}`,
    })
  }

  const removeMember = (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id))
    addToast({
      id: Math.random().toString(),
      type: 'info',
      title: 'Member Removed',
      message: 'Team member has been removed from organization',
    })
  }

  const navItems: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'workspace', label: 'Workspace', icon: Building },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'alerts', label: 'Alert Thresholds', icon: Sliders },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-cp-text sm:text-3xl flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-cp-crimson" />
          Settings
        </h1>
        <p className="text-sm text-cp-text-secondary">
          Configure organization preferences, member permissions, anomaly sensitivity, and notification delivery
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 rounded-xl border border-cp-border bg-cp-card p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-cp-crimson text-white shadow-sm'
                    : 'text-cp-text-secondary hover:bg-cp-elevated hover:text-cp-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <h3 className="text-base font-semibold text-cp-text">Personal Profile</h3>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cp-crimson text-xl font-bold text-white">
                  AC
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-cp-text">{profileName}</h4>
                  <p className="text-xs text-cp-text-secondary">Platform Owner • Acme Corp</p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Organization Owner"
                    className="w-full rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-xs text-cp-text-secondary cursor-not-allowed"
                  />
                </div>

                <button
                  onClick={() => handleSave('Profile')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Profile
                </button>
              </div>
            </div>
          )}

          {/* WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <h3 className="text-base font-semibold text-cp-text">Workspace Settings</h3>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Workspace Slug
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="acme-corp"
                    className="w-full rounded-lg border border-cp-border bg-cp-elevated px-3 py-2 text-xs font-mono text-cp-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Telemetry Retention Period
                  </label>
                  <select
                    value={wsRetention}
                    onChange={(e) => setWsRetention(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
                  >
                    <option value="14">14 Days (Standard)</option>
                    <option value="30">30 Days (Pro Plan)</option>
                    <option value="90">90 Days (Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Default Active Environment
                  </label>
                  <select
                    value={wsDefaultEnv}
                    onChange={(e) => setWsDefaultEnv(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <button
                  onClick={() => handleSave('Workspace')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Workspace
                </button>
              </div>
            </div>
          )}

          {/* TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-cp-text">Team Members ({teamMembers.length})</h3>
                  <p className="text-xs text-cp-text-secondary">
                    Manage access credentials and role authorizations for your engineering organization
                  </p>
                </div>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-3.5 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" /> Invite Member
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-cp-border bg-cp-secondary/80 text-cp-text-secondary uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Member</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4 text-right">Joined</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cp-border/40">
                    {teamMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-cp-elevated/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-cp-text">{m.name}</div>
                          <div className="text-cp-text-secondary font-mono text-[11px]">{m.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-cp-elevated px-2 py-0.5 font-mono text-[10px] text-cp-text">
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-cp-text-secondary">{m.joined}</td>
                        <td className="py-3 px-4 text-center">
                          {m.role !== 'Owner' && (
                            <button
                              onClick={() => removeMember(m.id)}
                              className="rounded p-1 text-cp-text-secondary hover:text-cp-critical hover:bg-cp-card transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <h3 className="text-base font-semibold text-cp-text">Notification Channels</h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'Critical Incident Alerts',
                    desc: 'Immediate dispatch on outage or P95 degradation exceeding SLA',
                    state: notifyCritical,
                    setState: setNotifyCritical,
                  },
                  {
                    label: 'Anomaly Intelligence Alerts',
                    desc: 'Notify when ML models flag unusual API distribution shifts',
                    state: notifyAnomaly,
                    setState: setNotifyAnomaly,
                  },
                  {
                    label: 'Slack Webhook Forwarding',
                    desc: 'Broadcast correlated incident cards directly into #api-incidents',
                    state: notifySlack,
                    setState: setNotifySlack,
                  },
                  {
                    label: 'Deployment Correlation Notices',
                    desc: 'Notify when a new release tag coincides with an error surge',
                    state: notifyDeploy,
                    setState: setNotifyDeploy,
                  },
                  {
                    label: 'Weekly Engineering Digest',
                    desc: 'Summary report of total requests, latency percentiles, and solved tickets',
                    state: notifyWeekly,
                    setState: setNotifyWeekly,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-cp-border/50 bg-cp-secondary p-4"
                  >
                    <div>
                      <div className="text-xs font-semibold text-cp-text">{item.label}</div>
                      <div className="text-[11px] text-cp-text-secondary">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setState(!item.state)}
                      className={`h-5 w-9 rounded-full transition-colors relative ${
                        item.state ? 'bg-cp-crimson' : 'bg-cp-elevated'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          item.state ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleSave('Notification')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ALERT THRESHOLDS */}
          {activeTab === 'alerts' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <h3 className="text-base font-semibold text-cp-text">SLA & Incident Thresholds</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Error Rate Threshold (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={errorThreshold}
                    onChange={(e) => setErrorThreshold(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                  <span className="text-[10px] text-cp-text-secondary mt-1 block">
                    Trigger warning when 4xx/5xx responses exceed this percentage
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    P95 Latency Ceiling (ms)
                  </label>
                  <input
                    type="number"
                    value={latencyThreshold}
                    onChange={(e) => setLatencyThreshold(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Anomaly Detection Confidence Threshold (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={anomalyThreshold}
                    onChange={(e) => setAnomalyThreshold(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs font-mono text-cp-text focus:outline-none focus:border-cp-crimson"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-cp-border/50 bg-cp-secondary p-3">
                  <div>
                    <span className="text-xs font-semibold text-cp-text block">
                      Auto-Create Incident on Critical Anomaly
                    </span>
                    <span className="text-[10px] text-cp-text-secondary">
                      Automatically escalate high-confidence anomalies to incident triage
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoCreateIncident(!autoCreateIncident)}
                    className={`h-5 w-9 rounded-full transition-colors relative ${
                      autoCreateIncident ? 'bg-cp-crimson' : 'bg-cp-elevated'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        autoCreateIncident ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => handleSave('Alert Thresholds')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Thresholds
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="rounded-xl border border-cp-border bg-cp-card p-6 space-y-6">
              <h3 className="text-base font-semibold text-cp-text">Display & Locale Preferences</h3>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-2">Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-cp-crimson bg-cp-secondary p-3 text-xs font-semibold text-cp-text flex items-center justify-between">
                      <span>Obsidian Crimson (Dark)</span>
                      <span className="h-2 w-2 rounded-full bg-cp-crimson" />
                    </div>
                    <div className="rounded-lg border border-cp-border bg-cp-elevated/40 p-3 text-xs text-cp-text-secondary opacity-50 cursor-not-allowed">
                      <span>Light Theme (Enterprise)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Time Format
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text"
                  >
                    <option value="24h">24-hour (14:30:00 UTC)</option>
                    <option value="12h">12-hour (02:30:00 PM UTC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cp-text-secondary mb-1">
                    Date Format
                  </label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-06)</option>
                    <option value="MMM D, YYYY">MMM D, YYYY (Nov 6, 2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (06/11/2026)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleSave('Appearance')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red transition-colors"
                >
                  <Save className="h-4 w-4" /> Save Appearance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Engineering Colleague"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cp-text-secondary mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="engineer@acmecorp.io"
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cp-text-secondary mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-lg border border-cp-border bg-cp-secondary px-3 py-2 text-xs text-cp-text focus:outline-none focus:border-cp-crimson"
            >
              <option value="Admin">Admin (Full cluster management)</option>
              <option value="Developer">Developer (Incidents & telemetry read/write)</option>
              <option value="Viewer">Viewer (Read-only observation)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="rounded-lg border border-cp-border bg-cp-elevated px-4 py-2 text-xs font-semibold text-cp-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cp-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-cp-red"
            >
              Send Invite
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
export default SettingsPage

