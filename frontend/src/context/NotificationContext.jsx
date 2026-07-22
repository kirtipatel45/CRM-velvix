import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

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
  }, [user]);

  const addNotification = async (title, message, type = 'info') => {
    try {
      const res = await notificationAPI.create({ title, message, type });
      setNotifications((prev) => [res.data.data, ...prev]);
    } catch (err) {
      console.error('Failed to add notification', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const clearNotifications = async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
