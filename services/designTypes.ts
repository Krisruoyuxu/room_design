
import { Timestamp } from 'firebase/firestore';
import { 
  RoomType, 
  DesignState 
} from '../types';

export type { DesignState };

export interface StoredDesign {
  id: string;
  userId: string;
  name: string;
  roomType: RoomType;
  previewImage?: string;
  state: DesignState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SavedDesign {
  id: string;
  name: string;
  previewImage: string;
  state: DesignState;
  savedAt: string;
}
