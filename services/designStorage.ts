
import { DesignState, RoomType } from '../types';
import { 
  listUserDesigns, 
  createUserDesign, 
  updateUserDesign, 
  deleteUserDesign as deleteCloudDesign 
} from './cloudDesignStorage';
import { SavedDesign } from './designTypes';

// In-memory counters for auto-naming
const untitledCounts: Record<string, number> = {};

export function generateAutoDesignName(roomType: RoomType | null | undefined): string {
  const typeLabel = getRoomTypeLabel(roomType);
  const currentCount = untitledCounts[typeLabel] || 0;
  const nextCount = currentCount + 1;
  untitledCounts[typeLabel] = nextCount;
  return `Untitled ${typeLabel} ${nextCount}`;
}

function getRoomTypeLabel(roomType: RoomType | null | undefined): string {
  if (!roomType) return "Room";
  
  // Normalize room type string for display
  const lower = roomType.toLowerCase();
  if (lower.includes('bedroom')) return "Bedroom";
  if (lower.includes('living')) return "Living Room";
  if (lower.includes('dining')) return "Dining Room";
  if (lower.includes('kitchen')) return "Kitchen";
  if (lower.includes('office')) return "Home Office";
  if (lower.includes('bathroom')) return "Bathroom";
  
  return roomType; // Fallback to the enum value
}

export interface SaveDesignOptions {
  userId: string;
  existingDesignId?: string;
  explicitName?: string | null;
  roomType: RoomType;
  previewImage?: string;
}

export async function saveDesignToCloud(
  state: DesignState,
  options: SaveDesignOptions
): Promise<{ designId: string; name: string }> {
  const { userId, existingDesignId, explicitName, roomType, previewImage } = options;

  // Determine name
  let finalName = explicitName ? explicitName.trim() : '';
  if (!finalName) {
    finalName = generateAutoDesignName(roomType);
  }

  const designData = {
    name: finalName,
    roomType: roomType,
    previewImage,
    state
  };

  if (existingDesignId) {
    await updateUserDesign(userId, existingDesignId, designData);
    return { designId: existingDesignId, name: finalName };
  } else {
    const newId = await createUserDesign(userId, designData);
    return { designId: newId, name: finalName };
  }
}

export async function loadUserDesigns(userId: string): Promise<SavedDesign[]> {
  const stored = await listUserDesigns(userId);
  // Convert to SavedDesign format for UI compatibility
  return stored.map(d => ({
    id: d.id,
    name: d.name,
    previewImage: d.previewImage || '',
    state: d.state,
    savedAt: d.updatedAt ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
  }));
}

export async function deleteDesign(userId: string, designId: string): Promise<void> {
  await deleteCloudDesign(userId, designId);
}
