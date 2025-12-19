
import { Room, VibeGroup, Wall, RoomType, FurniturePiece } from './types';

export const VIBES: VibeGroup[] = [
  {
      label: "Modern & Minimalist",
      options: [
          { name: 'Minimalist Zen', description: 'Simplicity, clean lines, neutral palette.' },
          { name: 'Scandinavian', description: 'Clean, simple lines, functionality, and light colors.' },
          { name: 'Japandi', description: 'Hybrid of Japanese minimalism and Scandinavian warmth.' },
          { name: 'Mid-Century Modern', description: 'Organic shapes, functional, timeless.' },
          { name: 'Contemporary', description: 'Sleek, current, with a focus on form and line.' },
      ]
  },
  {
      label: "Classic & Elegant",
      options: [
          { name: 'Traditional', description: 'Classic details, plush furniture, and timeless elegance.' },
          { name: 'Coastal Grandmother', description: 'Light, airy, natural fabrics, blue and white.' },
          { name: 'French Country', description: 'Warm, earthy, with rustic finishes and soft patterns.' },
          { name: 'Hollywood Regency', description: 'Opulent, glamorous, with bold colors and metallic finishes.' },
          { name: 'Transitional', description: 'A blend of traditional and contemporary for a classic, timeless look.' },
      ]
  },
  {
      label: "Bold & Eclectic",
      options: [
          { name: 'Boho Chic', description: 'Eclectic, layered textures, earthy tones.' },
          { name: 'Maximalist', description: 'Vibrant colors, eclectic patterns, and "more is more" philosophy.' },
          { name: 'Art Deco', description: 'Bold geometry, rich colors, and glamorous metallic details.' },
          { name: 'Eclectic', description: 'A mix of styles, periods, and colors, unified by a common vision.' },
          { name: 'Art Nouveau', description: 'Flowing lines, nature-inspired motifs, and artistic craftsmanship.' },
      ]
  },
  {
      label: "Rustic & Raw",
      options: [
          { name: 'Industrial Loft', description: 'Raw materials, exposed brick, metal accents.' },
          { name: 'Modern Farmhouse', description: 'Rustic charm meets modern simplicity and clean lines.' },
          { name: 'Rustic', description: 'Natural, rough, aged, and casual design.' },
          { name: 'Brutalist', description: 'Raw concrete, geometric shapes, and a monolithic feel.' },
      ]
  },
  {
      label: "Vintage & Ornate",
      options: [
          { name: 'Shabby Chic', description: 'Distressed furniture, vintage feel, and soft, romantic colors.' },
          { name: 'Victorian', description: 'Ornate details, rich materials, and a sense of grandeur.' },
          { name: 'Gothic', description: 'Dramatic, dark, with intricate details and a medieval feel.' },
      ]
  }
];

export const PARTY_THEMES: VibeGroup[] = [
    {
        label: "Classic Celebrations",
        options: [
            { name: 'Birthday Bash', description: 'Colorful balloons, streamers, and a festive atmosphere.' },
            { name: 'Holiday Festive', description: 'Seasonal decorations, warm lighting, and cozy elements.' },
            { name: 'New Year\'s Eve Gala', description: 'Glitz and glamour with gold, silver, and confetti.' },
            { name: 'Garden Party', description: 'Floral decor, fairy lights, and natural elements.' },
        ]
    },
    {
        label: "Elegant Events",
        options: [
            { name: 'Elegant Soirée', description: 'Sophisticated decor, soft lighting, and classy touches.' },
            { name: 'Masquerade Ball', description: 'Mysterious and elegant with masks and dramatic lighting.' },
            { name: 'Roaring \'20s Gatsby', description: 'Art Deco glam, feathers, and gold accents.' },
            { name: 'Murder Mystery Dinner', description: 'Dark, moody, with clues and vintage props.' },
            { name: 'Casino Night', description: 'Red, black, and gold with playing card motifs.'},
        ]
    },
    {
        label: "Fun & Fantasy",
        options: [
            { name: 'Kids Fun Zone', description: 'Bright colors, playful themes, and fun props.' },
            { name: 'Under the Sea', description: 'Oceanic colors, coral, and marine life decorations.' },
            { name: 'Outer Space Adventure', description: 'Planets, stars, and futuristic elements.' },
            { name: 'Superhero Academy', description: 'Bold primary colors and comic book action.' },
            { name: 'Tropical Luau', description: 'Hawaiian-themed decorations, flowers, and tiki torches.' },
            { name: 'Winter Wonderland', description: 'Snowflakes, ice sculptures, and cool blue lighting.' },
        ]
    },
    {
        label: "Themed Parties",
        options: [
            { name: 'Spooky Halloween', description: 'Pumpkins, cobwebs, and eerie lighting for a haunted feel.' },
            { name: 'Retro \'80s Night', description: 'Neon colors, geometric shapes, and vintage vibes.' },
            { name: 'Wild West', description: 'Hay bales, bandanas, and rustic cowboy decor.' },
            { name: 'Fiesta', description: 'Vibrant colors, papel picado, and festive Mexican flair.' },
            { name: 'White Party', description: 'An all-white theme for a chic and clean look.' },
        ]
    }
];

export const DECORATION_ELEMENTS: string[] = [
    'Balloons',
    'Streamers/Banners',
    'Table Settings',
    'Lighting Accents',
    'Floral Arrangements',
    'Themed Props',
    'Food/Drink Station'
];

export const INITIAL_ROOM_DIMENSIONS: Room = {
  width: 5,
  depth: 4,
  height: 2.5,
};

export const WALL_NAMES: Wall[] = ['front', 'back', 'left', 'right'];

export const ROOM_TYPES: RoomType[] = ['Living Room', 'Bedroom', 'Kitchen', 'Office', 'Dining Room'];

export const FURNITURE_CATALOG: Record<RoomType, FurniturePiece[]> = {
  'Living Room': [
    { name: 'Sofa', width: 2.2, depth: 0.9, height: 0.8 },
    { name: 'Loveseat', width: 1.6, depth: 0.9, height: 0.8 },
    { name: 'Armchair', width: 0.9, depth: 0.9, height: 0.9 },
    { name: 'Coffee Table', width: 1.2, depth: 0.6, height: 0.4 },
    { name: 'End Table', width: 0.5, depth: 0.5, height: 0.6 },
    { name: 'TV Stand', width: 1.8, depth: 0.4, height: 0.5 },
    { name: 'Console Table', width: 1.4, depth: 0.35, height: 0.75 },
    { name: 'Bookshelf', width: 0.8, depth: 0.3, height: 1.8 },
    { name: 'Ottoman', width: 0.7, depth: 0.7, height: 0.45 },
    { name: 'Floor Lamp', width: 0.4, depth: 0.4, height: 1.6 },
  ],
  'Bedroom': [
    { name: 'King Bed', width: 2.0, depth: 2.1, height: 1.0 },
    { name: 'Queen Bed', width: 1.6, depth: 2.1, height: 1.0 },
    { name: 'Nightstand', width: 0.5, depth: 0.4, height: 0.6 },
    { name: 'Dresser', width: 1.5, depth: 0.5, height: 0.8 },
    { name: 'Wardrobe', width: 1.2, depth: 0.6, height: 2.0 },
    { name: 'Bench', width: 1.2, depth: 0.4, height: 0.45 },
    { name: 'Vanity Table', width: 1.1, depth: 0.5, height: 0.75 },
    { name: 'Full Length Mirror', width: 0.5, depth: 0.05, height: 1.7 },
  ],
  'Kitchen': [
    { name: 'Kitchen Island', width: 1.8, depth: 0.9, height: 0.9 },
    { name: 'Dining Table', width: 1.5, depth: 0.9, height: 0.75 },
    { name: 'Small Table', width: 0.8, depth: 0.8, height: 0.75 },
    { name: 'Stool', width: 0.4, depth: 0.4, height: 0.65 },
    { name: 'Fridge', width: 0.9, depth: 0.8, height: 1.8 },
    { name: 'Pantry Cabinet', width: 0.8, depth: 0.6, height: 2.0 },
    { name: 'Bar Cart', width: 0.8, depth: 0.4, height: 0.85 },
    { name: 'Baker\'s Rack', width: 0.9, depth: 0.4, height: 1.8 },
  ],
  'Office': [
    { name: 'Desk', width: 1.4, depth: 0.7, height: 0.75 },
    { name: 'Large Desk', width: 1.8, depth: 0.8, height: 0.75 },
    { name: 'Office Chair', width: 0.6, depth: 0.6, height: 1.0 },
    { name: 'Visitor Chair', width: 0.5, depth: 0.5, height: 0.9 },
    { name: 'Filing Cabinet', width: 0.4, depth: 0.5, height: 0.7 },
    { name: 'Short Bookshelf', width: 1.0, depth: 0.3, height: 1.0 },
    { name: 'Tall Bookshelf', width: 0.8, depth: 0.3, height: 2.0 },
    { name: 'Printer Stand', width: 0.6, depth: 0.5, height: 0.6 },
  ],
  'Dining Room': [
    { name: 'Dining Table', width: 2.0, depth: 1.0, height: 0.75 },
    { name: 'Round Table', width: 1.2, depth: 1.2, height: 0.75 },
    { name: 'Dining Chair', width: 0.5, depth: 0.5, height: 0.9 },
    { name: 'Sideboard', width: 1.6, depth: 0.45, height: 0.8 },
    { name: 'Display Cabinet', width: 0.9, depth: 0.4, height: 1.9 },
    { name: 'Bar Cabinet', width: 0.9, depth: 0.45, height: 1.0 },
    { name: 'Plant Stand', width: 0.3, depth: 0.3, height: 0.8 },
  ],
};