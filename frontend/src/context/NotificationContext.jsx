import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => {
    let intervalId;
    if (user) {
      fetchNotifications();
      intervalId = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
    } else {
      setNotifications([]);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, fetchNotifications]);

  const addNotification = useCallback(async (title, message, type = 'info') => {
    try {
      let payload;
      if (typeof title === 'object' && title !== null) {
        payload = {
          title: title.title,
          message: title.message,
          type: title.type || 'info',
        };
      } else {
        payload = { title, message, type };
      }
      const res = await notificationAPI.create(payload);
      setNotifications((prev) => [res.data.data, ...prev]);
    } catch (err) {
      console.error('Failed to add notification', err);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  }, []);

  const value = useMemo(
    () => ({ notifications, addNotification, markAsRead, markAllAsRead, clearNotifications }),
    [notifications, addNotification, markAsRead, markAllAsRead, clearNotifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
