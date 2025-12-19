import { GoogleGenAI, Modality, Type } from "@google/genai";
import { RoomType, StyleGuide, FurnitureItem, PlacedFurniture, Room, WallElement, Wall, DesignState } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateStyleGuide = async (
  vibe: string,
  roomType: RoomType,
  budget: number,
  furnitureNames: string[]
): Promise<StyleGuide> => {
  const furnitureKeys = [...new Set(furnitureNames.map(name => name.replace(/\s+/g, '')))];

  // Dynamically build the prompt
  let prompt = `You are an expert interior designer. Create a style guide for a ${roomType} with a "${vibe}" aesthetic and a budget of around $${budget}.`;
  if (furnitureKeys.length > 0) {
    prompt += `\n\nThe room contains the following furniture types: ${furnitureNames.join(', ')}.`;
  }
  prompt += `\n\nProvide the following:
1.  A descriptive prompt for a photorealistic, seamless, tileable wall texture.
2.  A descriptive prompt for a photorealistic, seamless, tileable floor texture.
3.  A single hex color code for the ceiling.`;
  if (furnitureKeys.length > 0) {
    prompt += `\n4.  A JSON object for furniture colors where the keys are the camelCased furniture names (${furnitureKeys.join(', ')}) and the values are their corresponding hex color codes.`;
  }

  // Dynamically build the schema
  const schemaProperties: any = {
    wallTexturePrompt: { type: Type.STRING, description: 'A descriptive prompt for a photorealistic, seamless, tileable wall texture.' },
    floorTexturePrompt: { type: Type.STRING, description: 'A descriptive prompt for a photorealistic, seamless, tileable floor texture.' },
    ceilingColor: { type: Type.STRING, description: 'A hex color code for the ceiling (e.g., "#F0F8FF").' },
  };
  const requiredFields = ['wallTexturePrompt', 'floorTexturePrompt', 'ceilingColor'];

  if (furnitureKeys.length > 0) {
    const furnitureColorProperties: Record<string, { type: Type; description: string }> = {};
    furnitureKeys.forEach(key => {
      furnitureColorProperties[key] = {
        type: Type.STRING,
        description: `Hex color code for ${key}.`
      };
    });

    schemaProperties.furnitureColors = {
      type: Type.OBJECT,
      properties: furnitureColorProperties,
      description: 'An object where keys are furniture names (camelCased, no spaces, e.g., "coffeeTable") and values are hex color codes.'
    };
    requiredFields.push('furnitureColors');
  }


  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: schemaProperties,
        required: requiredFields,
      },
    }
  });

  const jsonString = response.text.trim();
  try {
    const styleGuide = JSON.parse(jsonString);
    // Ensure furnitureColors is always present on the returned object for type safety
    if (!styleGuide.furnitureColors) {
      styleGuide.furnitureColors = {};
    }
    return styleGuide as StyleGuide;
  } catch (e) {
    console.error("Failed to parse style guide JSON:", jsonString);
    throw new Error("Could not generate a style guide from the model's response.");
  }
};

export const generateShoppingList = async (
  placedFurniture: PlacedFurniture[],
  vibe: string,
  roomType: RoomType,
  budget: number
): Promise<FurnitureItem[]> => {
  const furnitureNames = [...new Set(placedFurniture.map(f => f.name))];
  if (furnitureNames.length === 0) {
    return [];
  }

  const prompt = `You are an expert interior design shopping assistant.
  For a ${roomType} with a "${vibe}" aesthetic and a total furniture budget of around $${budget}, create a shopping list. The room contains the following furniture types: ${furnitureNames.join(', ')}. Please suggest one product for each of these types.

  For each suggested product, provide the following details in a JSON array format:
  1. "name": A descriptive name for the furniture item that fits the vibe (e.g., "Cozy Boucle Armchair" for an Armchair).
  2. "description": A brief one-sentence description.
  3. "price": A realistic estimated price in USD, as a number. The sum of all prices should be close to the budget of $${budget}.
  4. "searchQuery": A concise and effective Google Shopping search query to find a similar item.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Descriptive name of the furniture item." },
            description: { type: Type.STRING, description: "A brief one-sentence description." },
            price: { type: Type.NUMBER, description: "Realistic estimated price in USD." },
            searchQuery: { type: Type.STRING, description: "A concise Google Shopping search query." },
          },
          required: ['name', 'description', 'price', 'searchQuery'],
        },
      },
    }
  });

  const jsonString = response.text.trim();
  try {
    const furnitureList: FurnitureItem[] = JSON.parse(jsonString);
    return furnitureList;
  } catch (e) {
    console.error("Failed to parse furniture list JSON:", jsonString);
    throw new Error("Could not get furniture list from the model's response.");
  }
};

export const generateTextureImage = async (
  prompt: string
): Promise<string> => {
    const fullPrompt = `A photorealistic, high-resolution, seamless, tileable texture of: ${prompt}. The image should be perfectly tileable horizontally and vertically without any visible seams. Focus on the texture itself.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
  
    throw new Error('Could not generate texture image from the provided prompt.');
};

export const generatePhotorealisticImage = async (
  design: {
    room: Room;
    elements: WallElement[];
    roomType: RoomType;
    placedFurniture: PlacedFurniture[];
    vibe: string;
  }
): Promise<string> => {
  const { room, elements, placedFurniture, vibe, roomType } = design;

  const furnitureDescriptions = placedFurniture.length > 0 ? placedFurniture.map(f =>
    `- A ${f.name} (Width: ${f.width}m, Depth: ${f.depth}m) is placed at X=${f.x.toFixed(2)}m, Z=${f.z.toFixed(2)}m, rotated ${f.rotationY} degrees.`
  ).join('\n') : "The room is empty of primary furniture.";

  const elementDescriptions = (wall: Wall) => {
    const wallElements = elements.filter(e => e.wall === wall);
    const wallIdentifier = (wall === 'front' || wall === 'back') ? 'left edge' : 'back edge';
    if (wallElements.length === 0) return `The ${wall} wall is solid.`;
    return `The ${wall} wall has:\n` + wallElements.map(e =>
      `  - A ${e.type} (${e.width}m wide, ${e.height}m high) centered ${e.x.toFixed(2)}m from the ${wallIdentifier} and ${e.y.toFixed(2)}m from the floor.`
    ).join('\n');
  }

  const prompt = `
Generate a single, ultra-photorealistic, magazine-quality interior design photograph of a ${roomType}.

---
**MANDATORY LAYOUT CONSTRAINTS (ABSOLUTE & NON-NEGOTIABLE)**

**Your primary and most critical task is to render the room's architecture and furniture layout with absolute precision according to the specifications below. Accuracy is paramount. Do not deviate, adjust, or "creatively interpret" any dimension, position, or rotation. The layout must be an exact match.**

**1. Coordinate System & Dimensions:**
- The room's floor is on the X-Z plane. The center of the floor is at coordinate (X=0, Z=0).
- **X-axis:** Runs from the left wall (-) to the right wall (+). Total room width is ${room.width.toFixed(1)}m.
- **Z-axis:** Runs from the front wall (-) to the back wall (+). Total room depth is ${room.depth.toFixed(1)}m.
- **Y-axis:** Represents height from the floor. Total room height is ${room.height.toFixed(1)}m.
- **Rotations:** In degrees around the vertical Y-axis. 0° means the furniture's 'front' faces the back wall (+Z direction). 90° means it faces the left wall (-X direction).

**2. Room Architecture:**
- The following elements are on the walls. Their positions are exact and must be rendered precisely.
  - ${elementDescriptions('front')}
  - ${elementDescriptions('back')}
  - ${elementDescriptions('left')}
  - ${elementDescriptions('right')}
- **Lighting Note:** Assume windows are the main light sources. Doors should be rendered as closed.

**3. Furniture Layout:**
- The following furniture items **MUST** be placed at the exact coordinates and rotations specified. This is not a suggestion.
${furnitureDescriptions}

**4. Verification Step (Internal Check):**
Before generating the final image, you must perform an internal check. Mentally overlay the provided coordinates and dimensions for every single furniture piece, door, and window onto your planned scene to confirm a perfect match. If there is any discrepancy, you must correct it before proceeding.

---
**CREATIVE STYLING INSTRUCTIONS**

After you have precisely constructed the scene based on the mandatory constraints above, your secondary task is to apply the specified aesthetic.

**Style & Vibe:** The aesthetic is strictly "${vibe}". All materials, colors, and secondary decor must reflect this style.

**Secondary Decor:**
- Fill the space with appropriate items to make the room feel complete and professionally styled.
- Add items like: wall art, rugs, plants, lamps, curtains/blinds, books, throws, pillows, and other small decorative objects that fit the "${vibe}" style.
- Ensure all materials, textures, and the overall color palette are harmonious.

**Camera & Lighting:**
- **Camera View:** Position the camera at an adult's eye-level (approx 1.6m high), standing just inside the room near the front wall, looking in. The view should be wide but natural, with no dramatic tilting or strange angles.
- **Lighting:** The lighting should be inviting and realistic, originating primarily from the windows. It must create natural shadows that respect the geometry of the room and furniture.

**Final Output:** A single, beautiful, aspirational photograph of the fully furnished and styled room, which is a perfect and accurate representation of the core layout instructions.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseModalities: [Modality.IMAGE],
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error('Could not generate photorealistic image from the provided prompt.');
};


export const getFurnitureFromImage = async (
  imageBase64: string,
  vibe: string,
  budget: number
): Promise<FurnitureItem[]> => {
  const prompt = `Analyze the provided image of a decorated room. The room has a "${vibe}" aesthetic and a total furniture budget of around $${budget}.
  
Identify the main furniture items in the image. For each item, provide the following details in a JSON array format:
1.  "name": A descriptive name for the furniture item (e.g., "Mid-Century Modern Sofa").
2.  "description": A brief one-sentence description.
3.  "price": A realistic estimated price in USD, as a number. The total price of all items should be close to the budget of $${budget}.
4.  "searchQuery": A concise and effective Google Shopping search query to find a similar item.`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg', // Assuming jpeg, adjust if needed
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }, imagePart] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            searchQuery: { type: Type.STRING },
          },
          required: ['name', 'description', 'price', 'searchQuery'],
        },
      },
    },
  });

  const jsonString = response.text.trim();
  try {
    const furnitureList: FurnitureItem[] = JSON.parse(jsonString);
    return furnitureList;
  } catch (e) {
    console.error("Failed to parse furniture list JSON from image:", jsonString);
    throw new Error("Could not get furniture list from the model's response.");
  }
};


export const paintWallInImage = async (
  imageBase64: string,
  mimeType: string,
  paintPoints: { position: { x: number; y: number; }; color: string }[]
): Promise<string> => {
  let prompt = "You are an expert photo editor. A user wants to repaint a wall in their room. They have provided an image and marked points on the wall(s) they want to paint with specific colors.\n\n";
  prompt += "Your task is to repaint ONLY the wall surfaces indicated by the user's points. Maintain the original lighting, shadows, and textures of the room. The result should be photorealistic.\n\n";
  prompt += "Here are the paint points (normalized coordinates from 0 to 1, where {x:0, y:0} is top-left) and their desired hex colors:\n";
  paintPoints.forEach((p, i) => {
    prompt += `- Point ${i + 1}: at (x: ${p.position.x.toFixed(3)}, y: ${p.position.y.toFixed(3)}) should be painted with color ${p.color}\n`;
  });
  prompt += "\nDo not change anything else in the image, including furniture, windows, floors, or ceilings.";

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('Could not generate the painted image.');
};


export const decorateRoomFromImage = async (
    imageBase64: string,
    mimeType: string,
    vibe: string,
    budget: number,
    roomType: RoomType,
    decorationPurpose: 'Permanent' | 'Party',
    selectedDecorations: string[],
    inspirationImageBase64?: string,
    inspirationMimeType?: string
): Promise<string> => {
    
    let prompt;
    if (decorationPurpose === 'Permanent') {
        prompt = `You are a world-class AI interior designer specializing in virtual room makeovers. Your task is to perform a major renovation on the provided room image.

**Primary Goal:** Transform the room into a photorealistic **${roomType}**. The user's selection of "${roomType}" is the absolute priority and must be achieved, regardless of the room's original function.

**CRITICAL, NON-NEGOTIABLE RULES:**
1.  **Preserve Architecture:** The room's core structure **MUST NOT** be changed. This includes the exact position, size, and shape of walls, windows, doors, and any other permanent architectural features (like fireplaces or built-in shelving).
2.  **Maintain Perspective:** The camera angle and perspective must remain identical to the original photo. The new image must look like it was taken from the exact same spot.
3.  **Complete Furnishing Revamp:** **REMOVE ALL** existing furniture and decor. Treat the room as an empty architectural shell, then fill it with completely new furniture, flooring, wall treatments, lighting, and decorative items.

**Styling Instructions:**
- **New Room Type:** ${roomType}
- **Aesthetic:** "${vibe}"
- **Budget:** Around $${budget} for all new items.
- **Task:** The final output should be a single, photorealistic image showing a complete transformation of the room's function and style, perfectly respecting its original architectural shell.`;
    } else { // Party
        prompt = `You are a world-class AI interior designer. A user has uploaded a photo of their ${roomType} and wants you to decorate it for a party. Your goal is to generate a new, photorealistic image of the same room, but with festive decorations added. It is crucial that you maintain the original room's architecture and existing furniture, including the position of walls, windows, and doors. The camera angle and perspective must remain identical to the original photo.\n\n`;
    
        prompt += `**Decoration Style:**\n`;
        prompt += `- **Purpose:** Party Decoration\n`;
        prompt += `- **Aesthetic/Theme:** "${vibe}"\n`;
        prompt += `- **Budget:** Around $${budget} for decorations.\n`;
        prompt += `- **Task:** Keep the existing furniture but add festive decorations on top of it and around the room. The decorations should match the party theme.\n`;
        if (selectedDecorations.length > 0) {
            prompt += `- **Include these elements:** ${selectedDecorations.join(', ')}.\n`;
        }
    }

    const parts: any[] = [
        { text: "This is the user's original room:" },
        { inlineData: { data: imageBase64, mimeType: mimeType } },
    ];
    
    if (inspirationImageBase64 && inspirationMimeType) {
        prompt += `\n\n**Inspiration:** The user has also provided an inspiration image. Use its style, color palette, and general feel as a strong reference for your new design, while still adhering to all rules above.`;
        parts.push({ text: "This is the inspiration image:" });
        parts.push({ inlineData: { data: inspirationImageBase64, mimeType: inspirationMimeType } });
    }

    parts.unshift({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    throw new Error('Could not generate the decorated room image.');
};