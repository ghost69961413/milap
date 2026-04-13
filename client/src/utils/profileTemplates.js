function preferredGenderFor(gender) {
  if (gender === "male") {
    return "female";
  }

  if (gender === "female") {
    return "male";
  }

  return "any";
}

export function buildDefaultProfilePayload(user) {
  const fullName = user?.fullName || "Milap User";
  const gender = user?.gender || "other";

  return {
    name: fullName,
    age: 26,
    gender,
    religion: "Hindu",
    caste: "General",
    education: "Graduate",
    profession: "Private Job",
    income: 700000,
    location: "Bengaluru",
    bio: `Hi, I am ${fullName}. Looking for a respectful and meaningful relationship.`,
    interests: ["music", "travel", "family"],
    partnerPreferences: {
      minAge: 22,
      maxAge: 34,
      gender: preferredGenderFor(gender),
      location: "Bengaluru",
      interests: ["music", "travel"]
    }
  };
}
