/**
 * Service Worker Notifications Component
 * 
 * UI components for service worker status and notifications
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 3 Optimizations
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Download, 
  CloudDrizzle, 
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useServiceWorker, useServiceWorkerNotifications } from '@/hooks/useServiceWorker';

/**
 * Service Worker Update Banner
 */
export function ServiceWorkerUpdateBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  if (!updateAvailable) {
    return null;
  }

  const handleUpdate = async () => {
    try {
      await applyUpdate();
    } catch (error) {
      console.error('Failed to apply update:', error);
    }
  };

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
          <Download className="h-4 w-4" />
          Update Available
        </CardTitle>
        <CardDescription className="text-blue-600">
          A new version of the app is ready to install
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button 
            onClick={handleUpdate}
            size="sm" 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Update Now
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Network Status Indicator
 */
export function NetworkStatusIndicator() {
  const { isOnline, pendingActions } = useServiceWorker();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className={`transition-all duration-300 ${
        isOnline ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
      }`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-600" />
              )}
              <span className={`text-sm font-medium ${
                isOnline ? 'text-green-800' : 'text-amber-800'
              }`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {pendingActions > 0 && (
              <Badge variant="secondary" className="text-xs">
                <CloudDrizzle className="mr-1 h-3 w-3" />
                {pendingActions} pending
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Service Worker Notifications Toast
 */
export function ServiceWorkerNotifications() {
  const { notifications, removeNotification } = useServiceWorkerNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationCard 
          key={notification.id} 
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Notification Card
 */
interface NotificationCardProps {
  notification: {
    id: string;
    type: 'update' | 'offline' | 'sync' | 'error';
    message: string;
    timestamp: number;
  };
  onRemove: () => void;
}

function NotificationCard({ notification, onRemove }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'update':
        return <Download className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      case 'sync':
        return <CloudDrizzle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'update':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'offline':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'sync':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <Card className={`w-80 transition-all duration-300 ${getColorClasses()}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{notification.message}</p>
            <p className="text-xs opacity-75 mt-1">
              <Clock className="inline h-3 w-3 mr-1" />
              {new Date(notification.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 hover:bg-black/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Service Worker Status Panel (for development)
 */
export function ServiceWorkerStatusPanel() {
  const { 
    isRegistered, 
    isActive, 
    updateAvailable, 
    isOnline, 
    pendingActions,
    register,
    cleanupCaches,
    forceSync
  } = useServiceWorker();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Service Worker Status</CardTitle>
        <CardDescription className="text-xs">
          Development panel for SW monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant={isRegistered ? "default" : "secondary"} className="text-xs">
              {isRegistered ? "Registered" : "Not Registered"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={updateAvailable ? "destructive" : "secondary"} className="text-xs">
              {updateAvailable ? "Update Available" : "Up to Date"}
            </Badge>
          </div>
        </div>

        {pendingActions > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Pending Actions</span>
              <span className="font-mono">{pendingActions}</span>
            </div>
            <Progress value={(pendingActions / 10) * 100} className="h-1" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={register}
            disabled={isRegistered}
          >
            Register SW
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={cleanupCaches}
          >
            Cleanup Cache
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={forceSync}
            disabled={pendingActions === 0}
          >
            Force Sync
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Offline Action Queue Display
 */
export function OfflineActionQueue() {
  const { pendingActions, isOnline } = useServiceWorker();

  if (pendingActions === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CloudDrizzle className="h-4 w-4" />
          Offline Actions
        </CardTitle>
        <CardDescription>
          {pendingActions} action{pendingActions !== 1 ? 's' : ''} waiting to sync
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={(pendingActions / 10) * 100} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span>Status:</span>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Syncing..." : "Waiting for connection"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Your changes are safely stored and will sync automatically when you're back online.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}