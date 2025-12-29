'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Shield,
  Key,
  Bell,
  Palette,
  Keyboard,
  Globe,
  Save,
  Check,
  Copy,
  RefreshCw,
  Moon,
  Sun,
  Monitor,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/lib/use-toast';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  role: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    webhookAlerts: true,
    workflowUpdates: true,
  });
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const shortcuts = [
    { keys: ['⌘', 'K'], action: 'Open command palette' },
    { keys: ['⌘', 'N'], action: 'Create new project' },
    { keys: ['⌘', '/'], action: 'Focus search' },
    { keys: ['⌘', 'B'], action: 'Toggle sidebar' },
    { keys: ['⌘', '.'], action: 'Open settings' },
    { keys: ['Esc'], action: 'Close modal/dialog' },
  ];

  const isAdmin = user?.role === 'ADMIN';

  // Load users for admins
  useEffect(() => {
    if (isAdmin) {
      loadPendingUsers();
      loadApprovedUsers();
    }
  }, [isAdmin]);

  const loadPendingUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await api.getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadApprovedUsers = async () => {
    try {
      const users = await api.getApprovedUsers();
      setApprovedUsers(users);
    } catch (error) {
      // Silently fail for approved users
      console.error('Failed to load approved users', error);
    }
  };

  const handleApproveUser = async (userId: string, approved: boolean) => {
    setProcessingUser(userId);
    try {
      await api.approveUser(userId, approved);
      toast({
        title: approved ? 'User approved' : 'User rejected',
        description: approved 
          ? 'The user has been approved and can now log in. An email notification has been sent.'
          : 'The user has been rejected and removed from pending list. An email notification has been sent.',
      });
      // Reload both lists
      await loadPendingUsers();
      await loadApprovedUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${approved ? 'approve' : 'reject'} user`,
        variant: 'destructive',
      });
    } finally {
      setProcessingUser(null);
    }
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[@$!%*?&]/.test(pwd)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSaved(false);

    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    setPasswordSaving(true);

    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
      });
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password';
      setPasswordError(errorMessage);
      toast({
        title: 'Password update failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} lg:w-[${isAdmin ? '600' : '500'}px]`}>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Shortcuts</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-3xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge className="mt-2" variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    {user?.role || 'User'}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={user?.email} />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError('');
                    }}
                    disabled={passwordSaving}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError('');
                    }}
                    disabled={passwordSaving}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must contain: uppercase, lowercase, number, and special character (@$!%*?&)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError('');
                    }}
                    disabled={passwordSaving}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : passwordSaved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Password Updated!
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Manage your API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <Key className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">Personal API Key</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ak_••••••••••••••••
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: 'email',
                  icon: Mail,
                  title: 'Email Notifications',
                  description: 'Receive notifications via email',
                },
                {
                  key: 'webhookAlerts',
                  icon: Globe,
                  title: 'Webhook Alerts',
                  description: 'Get notified when webhooks fail or succeed',
                },
                {
                  key: 'workflowUpdates',
                  icon: RefreshCw,
                  title: 'Workflow Updates',
                  description: 'Notifications when workflows are updated',
                },
              ].map((item) => {
                const Icon = item.icon;
                const enabled = notifications[item.key as keyof typeof notifications];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof typeof prev],
                        }))
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        enabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Select your preferred color theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = theme === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setTheme(item.value);
                        localStorage.setItem('theme', item.value);
                        document.documentElement.classList.toggle('dark', item.value === 'dark');
                        document.documentElement.classList.toggle('light', item.value === 'light');
                      }}
                      className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shortcuts Tab */}
        <TabsContent value="shortcuts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Quick keyboard shortcuts to navigate the app faster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <span className="text-sm">{shortcut.action}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="px-2 py-1 text-xs font-mono font-medium bg-muted rounded border border-border">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending User Approvals</CardTitle>
                    <CardDescription>
                      Review and approve or reject new user registrations
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await loadPendingUsers();
                      await loadApprovedUsers();
                    }}
                    disabled={loadingUsers}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending user approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((pendingUser) => (
                      <div
                        key={pendingUser.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-lg font-bold text-white">
                            {pendingUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{pendingUser.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {pendingUser.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{pendingUser.email}</p>
                            <div className="flex items-center gap-3">
                              {pendingUser.emailVerified ? (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                  Email Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                                  Email Not Verified
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Registered {new Date(pendingUser.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveUser(pendingUser.id, false)}
                            disabled={processingUser === pendingUser.id}
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveUser(pendingUser.id, true)}
                            disabled={processingUser === pendingUser.id}
                          >
                            {processingUser === pendingUser.id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approved Users Section */}
            <Card>
              <CardHeader>
                <CardTitle>Approved Users</CardTitle>
                <CardDescription>
                  Users who have been approved and can access the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {approvedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No approved users yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedUsers.map((approvedUser) => (
                      <div
                        key={approvedUser.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-green-500/5"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-lg font-bold text-white">
                            {approvedUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{approvedUser.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {approvedUser.role}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{approvedUser.email}</p>
                            <div className="flex items-center gap-3">
                              {approvedUser.emailVerified ? (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                                  Email Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                                  Email Not Verified
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Approved {new Date(approvedUser.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

