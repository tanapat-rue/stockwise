import { useState } from 'react';
import {
  Building2,
  User,
  FileText,
  Bell,
  Globe,
  Palette,
  Shield,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from '@/components/ui/toast';

export function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // Organization settings (mock)
  const [orgSettings, setOrgSettings] = useState({
    name: 'My Company Ltd.',
    email: 'contact@mycompany.com',
    phone: '02-123-4567',
    address: '123 Business Road, Bangkok 10110',
    taxId: '0123456789012',
    branchNumber: '00000',
    website: 'https://mycompany.com',
  });

  // Document settings (mock)
  const [docSettings, setDocSettings] = useState({
    invoicePrefix: 'INV',
    receiptPrefix: 'RCP',
    poPrefix: 'PO',
    orderPrefix: 'SO',
    taxRate: 7,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    lowStockAlert: true,
    orderConfirmation: true,
    paymentReceived: true,
    dailySummary: false,
  });

  // Display settings
  const [displaySettings, setDisplaySettings] = useState({
    language: 'en',
    currency: 'THB',
    dateFormat: 'DD/MM/YYYY',
    theme: 'light',
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your organization and preferences"
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Basic information about your company. This will appear on documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Company Name</Label>
                  <Input
                    id="orgName"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={orgSettings.email}
                    onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Phone</Label>
                  <Input
                    id="orgPhone"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgWebsite">Website</Label>
                  <Input
                    id="orgWebsite"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgAddress">Address</Label>
                <Textarea
                  id="orgAddress"
                  value={orgSettings.address}
                  onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                  rows={3}
                />
              </div>

              <Separator />

              <h3 className="text-lg font-medium">Tax Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={orgSettings.taxId}
                    onChange={(e) => setOrgSettings({ ...orgSettings, taxId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchNumber">Branch Number</Label>
                  <Input
                    id="branchNumber"
                    value={orgSettings.branchNumber}
                    onChange={(e) => setOrgSettings({ ...orgSettings, branchNumber: e.target.value })}
                    placeholder="00000 for head office"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Settings</CardTitle>
              <CardDescription>
                Configure document numbering and tax settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <h3 className="text-lg font-medium">Number Prefixes</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input
                    id="invoicePrefix"
                    value={docSettings.invoicePrefix}
                    onChange={(e) => setDocSettings({ ...docSettings, invoicePrefix: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">e.g., INV-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
                  <Input
                    id="receiptPrefix"
                    value={docSettings.receiptPrefix}
                    onChange={(e) => setDocSettings({ ...docSettings, receiptPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poPrefix">Purchase Order Prefix</Label>
                  <Input
                    id="poPrefix"
                    value={docSettings.poPrefix}
                    onChange={(e) => setDocSettings({ ...docSettings, poPrefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderPrefix">Sales Order Prefix</Label>
                  <Input
                    id="orderPrefix"
                    value={docSettings.orderPrefix}
                    onChange={(e) => setDocSettings({ ...docSettings, orderPrefix: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <h3 className="text-lg font-medium">Tax Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    value={docSettings.taxRate}
                    onChange={(e) => setDocSettings({ ...docSettings, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when products fall below reorder point
                    </p>
                  </div>
                  <Switch
                    checked={notifications.lowStockAlert}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, lowStockAlert: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Order Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new orders
                    </p>
                  </div>
                  <Switch
                    checked={notifications.orderConfirmation}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, orderConfirmation: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Payment Received</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when payments are received
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentReceived}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, paymentReceived: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily summary email of activity
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailySummary}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dailySummary: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>
                Customize how data is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={displaySettings.language}
                    onValueChange={(value) => setDisplaySettings({ ...displaySettings, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="th">Thai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={displaySettings.currency}
                    onValueChange={(value) => setDisplaySettings({ ...displaySettings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">Thai Baht (THB)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select
                    value={displaySettings.dateFormat}
                    onValueChange={(value) => setDisplaySettings({ ...displaySettings, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={displaySettings.theme}
                    onValueChange={(value) => setDisplaySettings({ ...displaySettings, theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your personal account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="john@company.com" />
                </div>
              </div>

              <Separator />

              <h3 className="text-lg font-medium">Change Password</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" />
                </div>
              </div>
              <Button variant="outline">Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
