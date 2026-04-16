import { USER_ROLES } from "../constants/roles.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

const MATCH_WEIGHTS = {
  ageCompatibility: 0.3,
  locationMatch: 0.25,
  educationMatch: 0.2,
  interestsMatch: 0.25
};

const MAX_LIMIT = 5000;
const BOOST_DISCOVERY_BONUS = 8;
const MAX_CANDIDATE_POOL = 5000;

function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

function toNormalizedArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeText(value)).filter(Boolean);
}

function hasAnyIntersection(source, target) {
  const sourceSet = new Set(toNormalizedArray(source));

  return toNormalizedArray(target).some((item) => sourceSet.has(item));
}

function countIntersection(source, target) {
  const sourceSet = new Set(toNormalizedArray(source));
  const targetSet = new Set(toNormalizedArray(target));

  let commonCount = 0;

  sourceSet.forEach((item) => {
    if (targetSet.has(item)) {
      commonCount += 1;
    }
  });

  return {
    commonCount,
    unionCount: new Set([...sourceSet, ...targetSet]).size
  };
}

function scoreAgeCompatibility(candidateAge, partnerPreferences) {
  const minAge = partnerPreferences?.minAge ?? 18;
  const maxAge = partnerPreferences?.maxAge ?? 80;

  if (candidateAge >= minAge && candidateAge <= maxAge) {
    return 100;
  }

  const distance = candidateAge < minAge ? minAge - candidateAge : candidateAge - maxAge;

  return Math.max(0, 100 - distance * 15);
}

function scoreLocationMatch(candidateLocation, currentProfile, partnerPreferences) {
  const preferredLocation = normalizeText(partnerPreferences?.location);
  const normalizedCandidateLocation = normalizeText(candidateLocation);

  if (preferredLocation) {
    if (normalizedCandidateLocation === preferredLocation) {
      return 100;
    }

    if (normalizedCandidateLocation.includes(preferredLocation)) {
      return 80;
    }

    return 0;
  }

  const currentLocation = normalizeText(currentProfile.location);

  if (!currentLocation || !normalizedCandidateLocation) {
    return 40;
  }

  if (normalizedCandidateLocation === currentLocation) {
    return 75;
  }

  if (normalizedCandidateLocation.includes(currentLocation) || currentLocation.includes(normalizedCandidateLocation)) {
    return 55;
  }

  return 0;
}

function scoreEducationMatch(candidateEducation, currentProfile, partnerPreferences) {
  const preferredEducations = toNormalizedArray(partnerPreferences?.education);
  const normalizedCandidateEducation = normalizeText(candidateEducation);

  if (preferredEducations.length) {
    return preferredEducations.includes(normalizedCandidateEducation) ? 100 : 0;
  }

  const currentEducation = normalizeText(currentProfile.education);

  if (!currentEducation || !normalizedCandidateEducation) {
    return 40;
  }

  return currentEducation === normalizedCandidateEducation ? 70 : 20;
}

function scoreInterestsMatch(candidateInterests, currentProfile, partnerPreferences) {
  const baseInterests = partnerPreferences?.interests?.length
    ? partnerPreferences.interests
    : currentProfile.interests;

  const { commonCount, unionCount } = countIntersection(baseInterests, candidateInterests);

  if (!unionCount) {
    return 50;
  }

  return Math.round((commonCount / unionCount) * 100);
}

function buildMatchScore(candidate, currentProfile, partnerPreferences) {
  const scoreBreakdown = {
    ageCompatibility: scoreAgeCompatibility(candidate.age, partnerPreferences),
    locationMatch: scoreLocationMatch(candidate.location, currentProfile, partnerPreferences),
    educationMatch: scoreEducationMatch(candidate.education, currentProfile, partnerPreferences),
    interestsMatch: scoreInterestsMatch(
      candidate.interests || [],
      currentProfile,
      partnerPreferences
    )
  };

  const matchScore = Math.round(
    Object.entries(MATCH_WEIGHTS).reduce((total, [metric, weight]) => {
      return total + scoreBreakdown[metric] * weight;
    }, 0)
  );

  const matchedOn = Object.entries(scoreBreakdown)
    .filter(([, score]) => score >= 60)
    .map(([metric]) => metric);

  return {
    matchScore,
    scoreBreakdown,
    matchedOn
  };
}

function isBoostActive(candidate) {
  return Boolean(candidate.boostExpiresAt && candidate.boostExpiresAt > new Date());
}

function toMatchResult(candidate, scoreData) {
  const boosted = isBoostActive(candidate);
  const discoveryScore = Math.min(
    100,
    scoreData.matchScore + (boosted ? BOOST_DISCOVERY_BONUS : 0)
  );

  return {
    profileId: candidate._id.toString(),
    userId: candidate.user.toString(),
    name: candidate.name,
    age: candidate.age,
    gender: candidate.gender,
    religion: candidate.religion,
    caste: candidate.caste,
    education: candidate.education,
    profession: candidate.profession,
    income: candidate.income,
    location: candidate.location,
    bio: candidate.bio,
    interests: candidate.interests || [],
    images: candidate.images || [],
    isBoosted: boosted,
    boostExpiresAt: candidate.boostExpiresAt || null,
    matchScore: scoreData.matchScore,
    discoveryScore,
    scoreBreakdown: scoreData.scoreBreakdown,
    matchedOn: scoreData.matchedOn
  };
}

function parseNumber(value, fallbackValue) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return fallbackValue;
  }

  return parsedValue;
}

function getProfileUserId(profile) {
  if (!profile || !profile.user) {
    return null;
  }

  if (typeof profile.user === "object" && profile.user._id) {
    return profile.user._id.toString();
  }

  return profile.user.toString();
}

function resolveDiscoverableGenders(currentGender) {
  if (currentGender === "male") {
    return ["female"];
  }

  if (currentGender === "female") {
    return ["male"];
  }

  return ["male", "female"];
}

async function filterProfilesByRole(profiles, role = USER_ROLES.NORMAL_USER) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return [];
  }

  const candidateUserIds = Array.from(
    new Set(
      profiles
        .map((profile) => getProfileUserId(profile))
        .filter(Boolean)
    )
  );

  if (candidateUserIds.length === 0) {
    return [];
  }

  const eligibleUsers = await User.find({
    _id: { $in: candidateUserIds },
    role
  }).select("_id");

  const eligibleUserIds = new Set(eligibleUsers.map((user) => user._id.toString()));

  return profiles.filter((profile) => {
    const profileUserId = getProfileUserId(profile);
    return profileUserId ? eligibleUserIds.has(profileUserId) : false;
  });
}

function buildCandidateQuery(currentProfile) {
  const conditions = [
    {
      user: {
        $ne: currentProfile.user
      }
    }
  ];

  const discoverableGenders = resolveDiscoverableGenders(currentProfile.gender);

  if (discoverableGenders.length) {
    conditions.push({
      gender: {
        $in: discoverableGenders
      }
    });
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    $and: conditions
  };
}

export async function findMatchesForUser(userId, options = {}) {
  const limit = Math.min(Math.max(parseNumber(options.limit, 20), 1), MAX_LIMIT);
  const minScore = Math.min(Math.max(parseNumber(options.minScore, 0), 0), 100);

  const currentProfile = await Profile.findOne({ user: userId });

  if (!currentProfile) {
    throw new ApiError(404, "Please create your profile before finding matches");
  }

  const partnerPreferences = currentProfile.partnerPreferences || {};
  const candidatePoolLimit = Math.min(Math.max(limit * 12, 120), MAX_CANDIDATE_POOL);
  const candidateQuery = buildCandidateQuery(currentProfile);

  const candidates = await Profile.find(candidateQuery)
    .sort({ boostExpiresAt: -1, updatedAt: -1 })
    .limit(candidatePoolLimit);
  const eligibleCandidates = await filterProfilesByRole(candidates);

  const scoredMatches = eligibleCandidates
    .map((candidate) => {
      const scoreData = buildMatchScore(candidate, currentProfile, partnerPreferences);

      return toMatchResult(candidate, scoreData);
    })
    .filter((candidate) => candidate.discoveryScore >= minScore)
    .sort((a, b) => b.discoveryScore - a.discoveryScore || b.matchScore - a.matchScore)
    .slice(0, limit);

  if (scoredMatches.length > 0) {
    return {
      totalMatches: scoredMatches.length,
      minScore,
      limit,
      matches: scoredMatches
    };
  }

  // Graceful fallback: show recent profiles when strict preference filters yield no results.
  const relaxedCandidates = await Profile.find(candidateQuery)
    .sort({ boostExpiresAt: -1, updatedAt: -1 })
    .limit(candidatePoolLimit);
  const eligibleRelaxedCandidates = await filterProfilesByRole(relaxedCandidates);

  const relaxedMatches = eligibleRelaxedCandidates
    .map((candidate) => {
      const scoreData = buildMatchScore(candidate, currentProfile, partnerPreferences);

      return toMatchResult(candidate, scoreData);
    })
    .filter((candidate) => candidate.discoveryScore >= minScore)
    .sort((a, b) => b.discoveryScore - a.discoveryScore || b.matchScore - a.matchScore)
    .slice(0, limit);

  return {
    totalMatches: relaxedMatches.length,
    minScore,
    limit,
    matches: relaxedMatches
  };
}
