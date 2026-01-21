// Cuisine hierarchy mapping
// Maps parent cuisines to their children cuisines
export const CUISINE_HIERARCHY: Record<string, string[]> = {
  'Asian': [
    'Japanese',
    'Chinese',
    'Thai',
    'Korean',
    'Vietnamese',
    'Indian',
    'Filipino',
    'Indonesian',
    'Malaysian',
    'Singaporean',
    'Taiwanese',
    'Burmese',
    'Cambodian',
    'Laotian',
  ],
  'European': [
    'Italian',
    'French',
    'Spanish',
    'Greek',
    'German',
    'British',
    'Irish',
    'Portuguese',
    'Dutch',
    'Belgian',
    'Swiss',
    'Austrian',
    'Scandinavian',
    'Swedish',
    'Norwegian',
    'Danish',
    'Polish',
    'Russian',
    'Ukrainian',
  ],
  'Middle Eastern': [
    'Lebanese',
    'Turkish',
    'Israeli',
    'Persian',
    'Moroccan',
    'Egyptian',
    'Syrian',
    'Jordanian',
  ],
  'Latin American': [
    'Mexican',
    'Brazilian',
    'Peruvian',
    'Argentinian',
    'Colombian',
    'Cuban',
    'Puerto Rican',
    'Venezuelan',
    'Chilean',
  ],
  'African': [
    'Ethiopian',
    'Moroccan',
    'South African',
    'Nigerian',
    'Kenyan',
  ],
  'Caribbean': [
    'Jamaican',
    'Haitian',
    'Dominican',
    'Trinidadian',
    'Barbadian',
  ],
};

// Get all cuisines that should match when filtering by a parent cuisine
// For example, filtering by "Asian" should return recipes marked as Asian, Japanese, Chinese, etc.
export function getCuisinesForFilter(selectedCuisine: string): string[] {
  // If this is a parent cuisine, return parent + all children
  if (CUISINE_HIERARCHY[selectedCuisine]) {
    return [selectedCuisine, ...CUISINE_HIERARCHY[selectedCuisine]];
  }

  // Otherwise just return the selected cuisine
  return [selectedCuisine];
}

// Get the parent cuisine for a given cuisine (if any)
export function getParentCuisine(cuisine: string): string | null {
  for (const [parent, children] of Object.entries(CUISINE_HIERARCHY)) {
    if (children.includes(cuisine)) {
      return parent;
    }
  }
  return null;
}

// Get all parent cuisines
export function getParentCuisines(): string[] {
  return Object.keys(CUISINE_HIERARCHY);
}
