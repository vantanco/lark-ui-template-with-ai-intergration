
import React from 'react';

export const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-green-100 text-green-800',
  'Blocked': 'bg-red-100 text-red-800',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'text-gray-500',
  'Medium': 'text-yellow-600',
  'High': 'text-orange-600',
  'Critical': 'text-red-600 font-bold',
};
