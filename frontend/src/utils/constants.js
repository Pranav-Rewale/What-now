export const CATEGORIES = [
  { value: "outdoors", label: "Outdoors", bg: "#4ADE80" },
  { value: "crafts", label: "Crafts", bg: "#F472B6" },
  { value: "cooking", label: "Cooking", bg: "#FACC15" },
  { value: "painting", label: "Painting", bg: "#60A5FA" },
  { value: "entertainment", label: "Entertainment", bg: "#FB923C" },
  { value: "music", label: "Music", bg: "#C084FC" },
  { value: "reading", label: "Reading", bg: "#2DD4BF" },
  { value: "gaming", label: "Gaming", bg: "#818CF8" },
  { value: "fitness", label: "Fitness", bg: "#F87171" },
  { value: "social", label: "Social", bg: "#A3E635" },
  { value: "learning", label: "Learning", bg: "#38BDF8" },
  { value: "relaxing", label: "Relaxing", bg: "#FDA4AF" },
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
  return cat ? cat.bg : "#E2E8F0";
};

export const getCategoryLabel = (category) => {
  const cat = CATEGORIES.find((c) => c.value === category?.toLowerCase());
  return cat ? cat.label : category;
};
