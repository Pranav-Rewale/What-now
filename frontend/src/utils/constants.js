export const CATEGORIES = [
  { value: "outdoors",      label: "Outdoors",      bg: "#2DFF72", text: "#000000" },
  { value: "crafts",        label: "Crafts",        bg: "#FF4757", text: "#FFFFFF" },
  { value: "cooking",       label: "Cooking",       bg: "#FFE100", text: "#000000" },
  { value: "painting",      label: "Painting",      bg: "#00E5FF", text: "#000000" },
  { value: "entertainment", label: "Entertainment", bg: "#FF6B35", text: "#FFFFFF" },
  { value: "music",         label: "Music",         bg: "#5D2EFF", text: "#FFFFFF" },
  { value: "reading",       label: "Reading",       bg: "#06D6A0", text: "#000000" },
  { value: "gaming",        label: "Gaming",        bg: "#A78BFA", text: "#000000" },
  { value: "fitness",       label: "Fitness",       bg: "#FF8C00", text: "#000000" },
  { value: "social",        label: "Social",        bg: "#4ADE80", text: "#000000" },
  { value: "learning",      label: "Learning",      bg: "#38BDF8", text: "#000000" },
  { value: "relaxing",      label: "Relaxing",      bg: "#F472B6", text: "#000000" },
];

export const TIME_OPTIONS = [
  "5 mins",
  "15 mins",
  "30 mins",
  "1 hr",
  "1-2 hrs",
  "2+ hrs",
];

export const getCategoryColor = (category) => {
  const cat = CATEGORIES.find((c) => c.value === category?.toLowerCase());
  return cat ? cat.bg : "#E6E6E6";
};

export const getCategoryTextColor = (category) => {
  const cat = CATEGORIES.find((c) => c.value === category?.toLowerCase());
  return cat ? cat.text : "#1A1A1A";
};

export const getCategoryLabel = (category) => {
  const cat = CATEGORIES.find((c) => c.value === category?.toLowerCase());
  return cat ? cat.label : category;
};
