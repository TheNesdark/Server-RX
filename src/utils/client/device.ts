// src/utils/client/device.ts

/**
 * Utility to detect if the current device or connection is considered "low-end"
 * or "slow" based on hardware and network information.
 */
export const isSlowDeviceOrConnection = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  // 1. Memory check (Chrome/Edge) - Less than 4GB is usually a bottleneck for DICOM
  // @ts-ignore
  const ram = navigator.deviceMemory;
  if (ram && ram < 4) return true;

  // 2. CPU check (2 cores or less)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;

  // 3. Network check (Chrome/Edge/Firefox) - Slow connection or Data Saver
  // @ts-ignore
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (conn.saveData) return true; // User enabled Data Saver
    if (['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return true;
  }

  // 4. Mobile User Agent check - Good indicator for suggesting Lite version
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) return true;

  return false;
};
