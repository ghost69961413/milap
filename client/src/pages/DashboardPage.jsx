import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "../components/animations/PageTransition";
import Navbar from "../components/layout/Navbar";
import LoadingPanel from "../components/ui/LoadingPanel";
import DashboardPanels from "../features/dashboard/DashboardPanels";
import { useAuth } from "../context/AuthContext";
import { openDocumentInNewTab } from "../utils/documentViewer";
import {
  applyForConsultantRole,
  ApiError,
  getMyVerificationStatus,
  getPendingVerifications,
  getMyProfile,
  reviewVerification,
  updateProfile,
  uploadPrimaryProfileImage,
  uploadVerificationDocument
} from "../services/matrimonyApi";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80";

const VERIFICATION_DOCUMENT_LABELS = {
  police_verification: "Police Verification",
  government_id: "Government ID Proof",
  additional_optional_document: "Additional Optional Document",
  law_degree: "Law Degree Certificate",
  decorator_owner_government_id: "Decorator Owner Government ID",
  decorator_police_noc: "Police NOC (No Pending Cases)"
};

function buildFormState(profile) {
  return {
    name: profile?.name || "",
    age: profile?.age ? String(profile.age) : "",
    religion: profile?.religion || "",
    caste: profile?.caste || "",
    education: profile?.education || "",
    profession: profile?.profession || "",
    income: profile?.income ? String(profile.income) : "",
    location: profile?.location || "",
    bio: profile?.bio || "",
    interests: Array.isArray(profile?.interests) ? profile.interests.join(", ") : ""
  };
}

function getApiErrorMessages(err) {
  if (!(err instanceof ApiError)) {
    return [err?.message || "Something went wrong"];
  }

  const fieldErrors = err.details?.errors?.fieldErrors;

  if (fieldErrors && typeof fieldErrors === "object") {
    const flattened = Object.entries(fieldErrors).flatMap(([field, messages]) =>
      Array.isArray(messages)
        ? messages.filter(Boolean).map((message) => `${field}: ${message}`)
        : []
    );

    if (flattened.length) {
      return flattened;
    }
  }

  return [err.message || "Request failed"];
}

function calculateCompletion(profile) {
  const checks = [
    Boolean(profile?.name),
    Boolean(profile?.age),
    Boolean(profile?.religion),
    Boolean(profile?.caste),
    Boolean(profile?.education),
    Boolean(profile?.profession),
    Boolean(profile?.income),
    Boolean(profile?.location),
    Boolean(profile?.bio),
    Array.isArray(profile?.interests) && profile.interests.length > 0,
    Array.isArray(profile?.images) && profile.images.length > 0
  ];

  const filledCount = checks.filter(Boolean).length;
  return Math.round((filledCount / checks.length) * 100);
}

function buildStats(profile) {
  const completion = calculateCompletion(profile);
  const photos = profile?.images?.length || 0;
  const interests = profile?.interests?.length || 0;
  const updatedAt = profile?.updatedAt ? new Date(profile.updatedAt) : null;

  return [
    {
      id: "completion",
      label: "Profile Completion",
      value: `${completion}%`,
      trend: completion >= 85 ? "Strong" : "Needs update"
    },
    {
      id: "photos",
      label: "Profile Photos",
      value: String(photos),
      trend: photos >= 1 ? "Visible now" : "Add one photo"
    },
    {
      id: "interests",
      label: "Interests Added",
      value: String(interests),
      trend: interests >= 3 ? "Good detail" : "Add more context"
    },
    {
      id: "lastUpdated",
      label: "Last Updated",
      value: updatedAt ? updatedAt.toLocaleDateString("en-IN") : "Not yet",
      trend: "Keep profile fresh"
    }
  ];
}

function buildActivity(profile) {
  const photoCount = profile?.images?.length || 0;
  const interests = profile?.interests?.length || 0;
  const updatedAt = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleString("en-IN")
    : "Not available";

  return [
    {
      id: "a1",
      title: `Primary photo ${photoCount > 0 ? "set" : "not set yet"}`,
      time: "Profile images"
    },
    {
      id: "a2",
      title: `${interests} interests configured`,
      time: "Preference quality"
    },
    {
      id: "a3",
      title: "Profile details synced to backend",
      time: updatedAt
    }
  ];
}

function getVerificationDocuments(verificationInfo) {
  const requiredDocuments = Array.isArray(verificationInfo?.requiredDocuments)
    ? verificationInfo.requiredDocuments
    : [];
  const optionalDocuments = Array.isArray(verificationInfo?.optionalDocuments)
    ? verificationInfo.optionalDocuments
    : [];

  const allDocuments = [...requiredDocuments, ...optionalDocuments];

  if (allDocuments.length > 0) {
    return allDocuments;
  }

  if (verificationInfo?.document?.url) {
    return [
      {
        type: "police_verification",
        label: VERIFICATION_DOCUMENT_LABELS.police_verification,
        required: true,
        uploaded: true,
        document: verificationInfo.document
      }
    ];
  }

  return [];
}

function DashboardPage() {
  const { token, user } = useAuth();
  const fileInputRef = useRef(null);
  const verificationFileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState(false);
  const [uploadingVerificationDocumentType, setUploadingVerificationDocumentType] =
    useState("police_verification");
  const [applyingConsultant, setApplyingConsultant] = useState(false);
  const [reviewingVerificationKey, setReviewingVerificationKey] = useState("");
  const [profile, setProfile] = useState(null);
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [currentRole, setCurrentRole] = useState(user?.role || "normal_user");
  const [formState, setFormState] = useState(buildFormState(null));
  const [consultantRequestStatus, setConsultantRequestStatus] = useState(
    user?.consultantRequest?.status || "none"
  );
  const [message, setMessage] = useState("");
  const [errorList, setErrorList] = useState([]);

  const stats = useMemo(() => buildStats(profile), [profile]);
  const activity = useMemo(() => buildActivity(profile), [profile]);
  const verificationDocuments = useMemo(
    () => getVerificationDocuments(verificationInfo),
    [verificationInfo]
  );

  async function loadProfile() {
    setLoading(true);
    setMessage("");
    setErrorList([]);

    try {
      const [profileData, verificationData] = await Promise.all([
        getMyProfile(token),
        getMyVerificationStatus(token)
      ]);
      const effectiveRole = verificationData?.role || user?.role || "normal_user";

      const pendingData =
        effectiveRole === "consultant"
          ? await getPendingVerifications(token, { limit: 100 })
          : { users: [] };

      setProfile(profileData);
      setFormState(buildFormState(profileData));
      setVerificationInfo(verificationData);
      setCurrentRole(effectiveRole);
      setPendingVerifications(pendingData.users || []);
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [token, user?.role]);

  async function handleConsultantApply() {
    setApplyingConsultant(true);
    setMessage("");
    setErrorList([]);

    try {
      const response = await applyForConsultantRole(token);
      setConsultantRequestStatus(response.consultantRequestStatus || "pending");
      setMessage("Consultant application submitted. Admin review is pending.");
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setApplyingConsultant(false);
    }
  }

  async function handleOpenDocument(event, documentUrl) {
    event.preventDefault();

    try {
      await openDocumentInNewTab(documentUrl);
    } catch (err) {
      const errorMessage = err?.message || "Unable to open document right now.";
      setErrorList((current) =>
        current.includes(errorMessage) ? current : [...current, errorMessage]
      );
    }
  }

  function handleInputChange(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorList([]);

    try {
      const payload = {
        name: formState.name.trim(),
        age: Number(formState.age),
        religion: formState.religion.trim(),
        caste: formState.caste.trim(),
        education: formState.education.trim(),
        profession: formState.profession.trim(),
        income: Number(formState.income),
        location: formState.location.trim(),
        bio: formState.bio.trim(),
        interests: formState.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      };

      const updatedProfile = await updateProfile(token, payload);
      setProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setMessage("Profile information updated successfully.");
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfilePicSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorList(["Image size must be up to 5MB"]);
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setMessage("");
    setErrorList([]);

    try {
      const currentPrimaryPublicId = profile?.images?.[0]?.publicId;
      const updatedProfile = await uploadPrimaryProfileImage(
        token,
        file,
        currentPrimaryPublicId
      );

      setProfile(updatedProfile);
      setFormState(buildFormState(updatedProfile));
      setMessage("Profile picture changed successfully.");
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  function triggerFilePicker() {
    fileInputRef.current?.click();
  }

  function triggerVerificationFilePicker(documentType = "police_verification") {
    setUploadingVerificationDocumentType(documentType);
    verificationFileInputRef.current?.click();
  }

  async function handleVerificationDocSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorList(["Verification document size must be up to 10MB"]);
      event.target.value = "";
      return;
    }

    setUploadingVerificationDoc(true);
    setMessage("");
    setErrorList([]);

    try {
      const updatedVerification = await uploadVerificationDocument(
        token,
        file,
        uploadingVerificationDocumentType
      );
      setVerificationInfo(updatedVerification);
      const uploadedLabel =
        verificationDocuments.find(
          (documentItem) => documentItem.type === uploadingVerificationDocumentType
        )?.label ||
        VERIFICATION_DOCUMENT_LABELS[uploadingVerificationDocumentType] ||
        "Verification document";
      setMessage(`${uploadedLabel} uploaded successfully. Status is now pending.`);
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setUploadingVerificationDoc(false);
      setUploadingVerificationDocumentType("police_verification");
      event.target.value = "";
    }
  }

  async function refreshPendingVerifications() {
    if (currentRole !== "consultant") {
      return;
    }

    const pendingData = await getPendingVerifications(token, { limit: 100 });
    setPendingVerifications(pendingData.users || []);
  }

  async function handleVerificationReview(targetUserId, status) {
    const actionKey = `${targetUserId}-${status}`;
    setReviewingVerificationKey(actionKey);
    setMessage("");
    setErrorList([]);

    try {
      let rejectionReason;

      if (status === "rejected") {
        rejectionReason =
          window.prompt("Enter rejection reason for this verification:", "") || "";

        if (!rejectionReason.trim()) {
          setReviewingVerificationKey("");
          return;
        }
      }

      await reviewVerification(token, targetUserId, {
        status,
        rejectionReason: rejectionReason?.trim() || undefined
      });

      await refreshPendingVerifications();
      setMessage(
        status === "approved"
          ? "User verification approved successfully."
          : "User verification rejected successfully."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setReviewingVerificationKey("");
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(136,166,220,0.16),transparent_25%),radial-gradient(circle_at_85%_20%,rgba(248,172,129,0.18),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#fcf8f3_100%)] text-[#1f2a44]">
        <Navbar />

        <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f6b51]">
              Dashboard
            </p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
              Manage Your Profile
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#56607c]">
              Update profile details and change profile picture from one place.
            </p>
          </motion.div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2">
              <LoadingPanel lines={4} />
              <LoadingPanel lines={5} />
              <LoadingPanel lines={3} />
              <LoadingPanel lines={4} />
            </div>
          ) : !profile ? (
            <section className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4">
              <p className="text-sm text-rose-700">
                {errorList[0] || "Profile not found. Please create profile from Discover page first."}
              </p>
            </section>
          ) : (
            <section className="mb-8 grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
              <article className="rounded-[2rem] border border-[#e7dbcf] bg-white/85 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#966e4f]">
                  Profile Picture
                </p>
                <div className="mt-4">
                  <img
                    src={profile.images?.[0]?.url || FALLBACK_AVATAR}
                    alt="Profile avatar"
                    className="h-56 w-full rounded-3xl border border-[#ecdfd3] object-cover"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={uploadingImage}
                  className="mt-4 w-full rounded-full bg-[#1f2a44] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c3a5b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploadingImage ? "Uploading..." : "Change Profile Pic"}
                </button>
                <p className="mt-2 text-xs text-[#6b738d]">
                  JPG/PNG, max size 5MB.
                </p>
              </article>

              <article className="rounded-[2rem] border border-[#e7dbcf] bg-white/85 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#966e4f]">
                  Edit Profile Information
                </p>
                <form className="mt-4 space-y-4" onSubmit={handleProfileSave}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Name</span>
                      <input
                        value={formState.name}
                        onChange={(event) => handleInputChange("name", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Age</span>
                      <input
                        type="number"
                        min={18}
                        max={80}
                        value={formState.age}
                        onChange={(event) => handleInputChange("age", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Religion</span>
                      <input
                        value={formState.religion}
                        onChange={(event) => handleInputChange("religion", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Caste</span>
                      <input
                        value={formState.caste}
                        onChange={(event) => handleInputChange("caste", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Education</span>
                      <input
                        value={formState.education}
                        onChange={(event) =>
                          handleInputChange("education", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Profession</span>
                      <input
                        value={formState.profession}
                        onChange={(event) =>
                          handleInputChange("profession", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Income (yearly)</span>
                      <input
                        type="number"
                        min={0}
                        value={formState.income}
                        onChange={(event) => handleInputChange("income", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-[#6b738d]">Location</span>
                      <input
                        value={formState.location}
                        onChange={(event) => handleInputChange("location", event.target.value)}
                        className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                        required
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="mb-1 block text-[#6b738d]">Interests (comma separated)</span>
                    <input
                      value={formState.interests}
                      onChange={(event) => handleInputChange("interests", event.target.value)}
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-[#6b738d]">Bio</span>
                    <textarea
                      rows={4}
                      value={formState.bio}
                      onChange={(event) => handleInputChange("bio", event.target.value)}
                      className="w-full rounded-xl border border-[#deccb9] bg-white px-4 py-2.5 outline-none focus:border-[#1f2a44]"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-[#8a2918] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a23a27] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving..." : "Save Profile Changes"}
                  </button>
                </form>
              </article>
            </section>
          )}

          {message && (
            <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
              <p className="text-sm text-emerald-700">{message}</p>
            </section>
          )}

          {errorList.length > 0 && profile && (
            <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
              {errorList.map((item) => (
                <p key={item} className="text-sm text-rose-700">
                  {item}
                </p>
              ))}
            </section>
          )}

          {profile && currentRole === "normal_user" && (
            <section className="mb-6 rounded-3xl border border-[#e4d8ca] bg-white/85 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f6b51]">
                Consultant Role
              </p>
              <p className="mt-2 text-sm text-[#56607c]">
                Current request status:{" "}
                <span className="font-semibold uppercase">{consultantRequestStatus}</span>
              </p>
              <button
                type="button"
                onClick={handleConsultantApply}
                disabled={applyingConsultant || consultantRequestStatus === "pending"}
                className="mt-4 rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {applyingConsultant ? "Applying..." : "Apply for Consultant Role"}
              </button>
            </section>
          )}

          {profile && (
            <section className="mb-6 rounded-3xl border border-[#ddd8f3] bg-white/85 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6a5a86]">
                Verification Documents
              </p>
              <p className="mt-2 text-sm text-[#56607c]">
                Status:{" "}
                <span className="font-semibold uppercase">
                  {verificationInfo?.verificationStatus || "pending"}
                </span>
              </p>

              <input
                ref={verificationFileInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={handleVerificationDocSelect}
                className="hidden"
              />
              <div className="mt-4 space-y-3">
                {verificationDocuments.length === 0 ? (
                  <p className="rounded-xl border border-[#e0e3f2] bg-[#f9faff] px-4 py-3 text-sm text-[#5b6380]">
                    No document slots available for this role.
                  </p>
                ) : (
                  verificationDocuments.map((documentItem) => (
                    <article
                      key={documentItem.type}
                      className="rounded-xl border border-[#e0e3f2] bg-[#f9faff] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#253053]">
                            {documentItem.label ||
                              VERIFICATION_DOCUMENT_LABELS[documentItem.type] ||
                              documentItem.type}
                          </p>
                          <p className="text-xs text-[#5a6380]">
                            {documentItem.required ? "Mandatory" : "Optional"} •{" "}
                            {documentItem.uploaded ? "Uploaded" : "Not uploaded"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => triggerVerificationFilePicker(documentItem.type)}
                            disabled={uploadingVerificationDoc}
                            className="rounded-full bg-[#3f3268] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#503e81] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {uploadingVerificationDoc &&
                            uploadingVerificationDocumentType === documentItem.type
                              ? "Uploading..."
                              : documentItem.uploaded
                                ? "Replace"
                                : "Upload"}
                          </button>
                          {documentItem.document?.url && (
                            <a
                              href={documentItem.document.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) =>
                                handleOpenDocument(event, documentItem.document.url)
                              }
                              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3f3268] underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {Array.isArray(verificationInfo?.missingRequiredDocuments) &&
                verificationInfo.missingRequiredDocuments.length > 0 && (
                  <p className="mt-3 text-xs text-amber-700">
                    Missing required documents:{" "}
                    {verificationInfo.missingRequiredDocuments.join(", ")}
                  </p>
                )}
              <p className="mt-2 text-xs text-[#6b738d]">
                PDF or image allowed, max size 10MB per document.
              </p>
            </section>
          )}

          {profile && currentRole === "consultant" && (
            <section className="mb-6 rounded-3xl border border-[#d8e1f2] bg-white/85 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5f6b86]">
                Pending User Verifications
              </p>
              <p className="mt-2 text-sm text-[#56607c]">
                Review uploaded documents and approve or reject.
              </p>

              <div className="mt-4 space-y-3">
                {pendingVerifications.length === 0 ? (
                  <p className="rounded-xl border border-[#e5e7f0] bg-[#fafbff] px-4 py-3 text-sm text-[#5d6680]">
                    No verification requests pending right now.
                  </p>
                ) : (
                  pendingVerifications.map((pendingUser) => (
                    <article
                      key={pendingUser.userId}
                      className="rounded-xl border border-[#e0e6f5] bg-[#f8fbff] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{pendingUser.fullName}</p>
                          <p className="text-sm text-[#5d6680]">{pendingUser.email}</p>
                          <a
                            href={pendingUser.document?.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) =>
                              handleOpenDocument(event, pendingUser.document?.url || "")
                            }
                            className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1f2a44] underline"
                          >
                            View Document
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={reviewingVerificationKey === `${pendingUser.userId}-approved`}
                            onClick={() =>
                              handleVerificationReview(pendingUser.userId, "approved")
                            }
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reviewingVerificationKey === `${pendingUser.userId}-rejected`}
                            onClick={() =>
                              handleVerificationReview(pendingUser.userId, "rejected")
                            }
                            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {profile && <DashboardPanels stats={stats} activity={activity} />}
        </main>
      </div>
    </PageTransition>
  );
}

export default DashboardPage;
