import { storage } from "./storage";
import { deleteChatRoomFiles } from "./supabaseStorage";

let cleanupInterval: NodeJS.Timeout | null = null;
let isRunning = false;

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredChatRooms(): Promise<void> {
  if (isRunning) {
    console.log('[Chat Lifecycle] Cleanup already in progress, skipping...');
    return;
  }
  
  isRunning = true;
  
  try {
    const expiredRooms = await storage.getExpiredChatRooms();
    
    if (expiredRooms.length === 0) {
      return;
    }
    
    console.log('[Chat Lifecycle] Found', expiredRooms.length, 'expired chat rooms to clean up');
    
    for (const room of expiredRooms) {
      try {
        await deleteChatRoomFiles(room.id);
        await storage.endChatRoom(room.id, 'system');
        console.log('[Chat Lifecycle] Cleaned up expired room:', room.id);
      } catch (roomError) {
        console.error('[Chat Lifecycle] Error cleaning up room:', room.id, roomError);
      }
    }
    
    console.log('[Chat Lifecycle] Cleanup complete');
  } catch (error) {
    console.error('[Chat Lifecycle] Error during cleanup:', error);
  } finally {
    isRunning = false;
  }
}

export function startChatLifecycleService(): void {
  if (cleanupInterval) {
    console.log('[Chat Lifecycle] Service already running');
    return;
  }
  
  console.log('[Chat Lifecycle] Starting service (interval: 1 hour)');
  
  cleanupExpiredChatRooms();
  
  cleanupInterval = setInterval(cleanupExpiredChatRooms, CLEANUP_INTERVAL_MS);
}

export function stopChatLifecycleService(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Chat Lifecycle] Service stopped');
  }
}

export { cleanupExpiredChatRooms };
