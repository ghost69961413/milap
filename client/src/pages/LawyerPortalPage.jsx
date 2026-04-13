import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openDocumentInNewTab } from "../utils/documentViewer";
import {
  ApiError,
  createLawyerProfile,
  getMyLawyerBookingRequests,
  getMyLawyerProfile,
  getMyVerificationStatus,
  respondLawyerBookingRequest,
  uploadVerificationDocument,
  updateLawyerProfile
} from "../services/matrimonyApi";

const DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const VERIFICATION_DOCUMENT_LABELS = {
  police_verification: "Police Verification",
  government_id: "Government ID Proof",
  law_degree: "Law Degree Certificate",
  additional_optional_document: "Additional Optional Document",
  decorator_owner_government_id: "Decorator Owner Government ID",
  decorator_police_noc: "Police NOC (No Pending Cases)"
};

function createDefaultSlot() {
  return {
    day: "monday",
    startTime: "10:00",
    endTime: "11:00",
    isAvailable: true
  };
}

function createDefaultFormState() {
  return {
    specialization: "",
    experienceYears: "",
    pricingAmount: "",
    pricingCurrency: "INR",
    pricingUnit: "session",
    about: "",
    availabilitySlots: [createDefaultSlot()]
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

function parseCommaSeparatedList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeAvailabilitySlots(slots) {
  if (!Array.isArray(slots)) {
    return [];
  }

  return slots
    .map((slot) => ({
      day: String(slot?.day || "").trim().toLowerCase(),
      startTime: String(slot?.startTime || "").trim(),
      endTime: String(slot?.endTime || "").trim(),
      isAvailable: slot?.isAvailable !== false
    }))
    .filter(
      (slot) =>
        DAY_OPTIONS.includes(slot.day) &&
        slot.startTime &&
        slot.endTime &&
        slot.startTime < slot.endTime
    );
}

function mapProfileToFormState(profile) {
  const slotsFromProfile = sanitizeAvailabilitySlots(profile?.availabilitySlots || []);
  const fallbackSlots =
    profile?.availability?.days &&
    profile?.availability?.startTime &&
    profile?.availability?.endTime
      ? sanitizeAvailabilitySlots(
          profile.availability.days.map((day) => ({
            day,
            startTime: profile.availability.startTime,
            endTime: profile.availability.endTime,
            isAvailable: true
          }))
        )
      : [];

  const slots = slotsFromProfile.length
    ? slotsFromProfile
    : fallbackSlots.length
      ? fallbackSlots
      : [createDefaultSlot()];

  return {
    specialization: Array.isArray(profile?.specialization)
      ? profile.specialization.join(", ")
      : "",
    experienceYears:
      profile?.experienceYears !== undefined && profile?.experienceYears !== null
        ? String(profile.experienceYears)
        : "",
    pricingAmount:
      profile?.pricing?.amount !== undefined && profile?.pricing?.amount !== null
        ? String(profile.pricing.amount)
        : "",
    pricingCurrency: profile?.pricing?.currency || "INR",
    pricingUnit: profile?.pricing?.unit || "session",
    about: profile?.about || "",
    availabilitySlots: slots
  };
}

function buildProfilePayload(formState) {
  const normalizedSpecialization = parseCommaSeparatedList(formState.specialization);
  const normalizedSlots = sanitizeAvailabilitySlots(formState.availabilitySlots);
  const activeSlots = normalizedSlots.filter((slot) => slot.isAvailable);
  const fallbackAvailability = activeSlots.length
    ? {
        days: Array.from(new Set(activeSlots.map((slot) => slot.day))),
        startTime: activeSlots[0].startTime,
        endTime: activeSlots[0].endTime
      }
    : undefined;

  return {
    specialization: normalizedSpecialization,
    experienceYears: Number(formState.experienceYears),
    pricing: {
      amount: Number(formState.pricingAmount),
      currency: String(formState.pricingCurrency || "INR").trim().toUpperCase(),
      unit: formState.pricingUnit === "hour" ? "hour" : "session"
    },
    about: String(formState.about || "").trim(),
    availabilitySlots: normalizedSlots,
    availability: fallbackAvailability
  };
}

function formatDateTime(value) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString("en-IN");
}

function formatSlot(slot) {
  return `${slot.day} ${slot.startTime}-${slot.endTime}`;
}

function getVerificationBadgeClass(status) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
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

function LawyerPortalPage() {
  const { token } = useAuth();
  const verificationFileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState(false);
  const [uploadingVerificationDocumentType, setUploadingVerificationDocumentType] =
    useState("police_verification");
  const [respondingKey, setRespondingKey] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [formState, setFormState] = useState(createDefaultFormState);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [errorList, setErrorList] = useState([]);
  const verificationDocuments = getVerificationDocuments(verificationInfo);

  async function loadLawyerPortalData() {
    setLoading(true);
    setMessage("");
    setErrorList([]);

    try {
      const [profileResult, bookingResult, verificationData] = await Promise.all([
        getMyLawyerProfile(token)
          .then((profile) => ({ ok: true, profile }))
          .catch((error) => ({ ok: false, error })),
        getMyLawyerBookingRequests(token, { limit: 100 }),
        getMyVerificationStatus(token)
      ]);

      if (profileResult.ok) {
        setProfileExists(true);
        setFormState(mapProfileToFormState(profileResult.profile));
      } else if (
        profileResult.error instanceof ApiError &&
        profileResult.error.statusCode === 404
      ) {
        setProfileExists(false);
        setFormState(createDefaultFormState());
      } else {
        throw profileResult.error;
      }

      setBookingRequests(bookingResult.requests || []);
      setVerificationInfo(verificationData || null);
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadLawyerPortalData();
  }, [token]);

  function handleFormFieldChange(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSlotFieldChange(index, field, value) {
    setFormState((current) => ({
      ...current,
      availabilitySlots: current.availabilitySlots.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: value
            }
          : slot
      )
    }));
  }

  function handleAddSlot() {
    setFormState((current) => ({
      ...current,
      availabilitySlots: [...current.availabilitySlots, createDefaultSlot()]
    }));
  }

  function handleRemoveSlot(index) {
    setFormState((current) => {
      const updatedSlots = current.availabilitySlots.filter(
        (_slot, slotIndex) => slotIndex !== index
      );

      return {
        ...current,
        availabilitySlots: updatedSlots.length ? updatedSlots : [createDefaultSlot()]
      };
    });
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setErrorList([]);

    try {
      const payload = buildProfilePayload(formState);
      const profile = profileExists
        ? await updateLawyerProfile(token, payload)
        : await createLawyerProfile(token, payload);

      setProfileExists(true);
      setFormState(mapProfileToFormState(profile));
      setMessage(
        profileExists
          ? "Lawyer profile updated successfully."
          : "Lawyer profile created successfully."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRespond(requestId, status) {
    const actionKey = `${requestId}-${status}`;
    setRespondingKey(actionKey);
    setMessage("");
    setErrorList([]);

    try {
      let responseNote;

      if (status === "rejected") {
        responseNote =
          window.prompt("Add rejection note for user (required):", "") || "";

        if (!responseNote.trim()) {
          setRespondingKey("");
          return;
        }
      } else {
        responseNote = "Request accepted by lawyer";
      }

      const updatedRequest = await respondLawyerBookingRequest(token, requestId, {
        status,
        responseNote: responseNote.trim()
      });

      setBookingRequests((current) =>
        current.map((request) =>
          request.legalConsultationRequestId === requestId ? updatedRequest : request
        )
      );
      setMessage(
        status === "accepted"
          ? "Consultation request accepted."
          : "Consultation request rejected."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setRespondingKey("");
    }
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
      setMessage(`${uploadedLabel} uploaded. Consultant review is pending.`);
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setUploadingVerificationDoc(false);
      setUploadingVerificationDocumentType("police_verification");
      event.target.value = "";
    }
  }

  const filteredBookingRequests = bookingRequests.filter((request) =>
    bookingStatusFilter === "all" ? true : request.status === bookingStatusFilter
  );
  const pendingRequestsCount = bookingRequests.filter(
    (request) => request.status === "pending"
  ).length;
  const activeSlotsCount = sanitizeAvailabilitySlots(formState.availabilitySlots).filter(
    (slot) => slot.isAvailable
  ).length;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <article className="rounded-2xl border border-[#e5dccf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Profile Status</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {profileExists ? "Configured" : "Pending Setup"}
          </p>
        </article>
        <article className="rounded-2xl border border-[#e5dccf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Pending Requests</p>
          <p className="mt-2 font-display text-3xl font-semibold">{pendingRequestsCount}</p>
        </article>
        <article className="rounded-2xl border border-[#e5dccf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Active Slots</p>
          <p className="mt-2 font-display text-3xl font-semibold">{activeSlotsCount}</p>
        </article>
      </motion.section>

      <section className="rounded-3xl border border-[#ddd8f3] bg-white/90 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6a5a86]">
              Verification Documents
            </p>
            <p className="mt-2 text-sm text-[#56607c]">
              Police verification, law degree, and government ID are mandatory.
            </p>
          </div>
          <p
            className={[
              "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
              getVerificationBadgeClass(verificationInfo?.verificationStatus || "pending")
            ].join(" ")}
          >
            {verificationInfo?.verificationStatus || "pending"}
          </p>
        </div>

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

        {verificationInfo?.rejectionReason && (
          <p className="mt-3 text-sm text-rose-700">
            Rejection reason: {verificationInfo.rejectionReason}
          </p>
        )}

        {Array.isArray(verificationInfo?.missingRequiredDocuments) &&
          verificationInfo.missingRequiredDocuments.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Missing required documents:{" "}
              {verificationInfo.missingRequiredDocuments.join(", ")}
            </p>
          )}

        <p className="mt-2 text-xs text-[#6b738d]">
          PDF or image allowed, max size 10MB per document.
        </p>
      </section>

      {message && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      {errorList.length > 0 && (
        <section className="space-y-2">
          {errorList.map((errorItem) => (
            <p
              key={errorItem}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700"
            >
              {errorItem}
            </p>
          ))}
        </section>
      )}

      {loading ? (
        <section className="rounded-3xl border border-[#e7ddcf] bg-white/90 p-6 text-sm text-[#5c6680]">
          Loading lawyer dashboard...
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-3xl border border-[#e6dbc9] bg-white/90 p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#86705b]">
                Lawyer Profile Management
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                Specialization, Experience, Pricing
              </h2>
            </div>

            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                  Specialization (comma separated)
                </span>
                <input
                  type="text"
                  value={formState.specialization}
                  onChange={(event) =>
                    handleFormFieldChange("specialization", event.target.value)
                  }
                  placeholder="Family Law, Divorce, Property Dispute"
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                    Experience (years)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formState.experienceYears}
                    onChange={(event) =>
                      handleFormFieldChange("experienceYears", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                    Pricing Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={formState.pricingAmount}
                    onChange={(event) =>
                      handleFormFieldChange("pricingAmount", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                    Currency
                  </span>
                  <input
                    type="text"
                    value={formState.pricingCurrency}
                    onChange={(event) =>
                      handleFormFieldChange("pricingCurrency", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                    Pricing Unit
                  </span>
                  <select
                    value={formState.pricingUnit}
                    onChange={(event) =>
                      handleFormFieldChange("pricingUnit", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  >
                    <option value="session">Per Session</option>
                    <option value="hour">Per Hour</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6d62]">
                  About
                </span>
                <textarea
                  rows={4}
                  value={formState.about}
                  onChange={(event) => handleFormFieldChange("about", event.target.value)}
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                />
              </label>

              <section className="space-y-3 rounded-2xl border border-[#ebdfd2] bg-[#fffaf5] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f6c5a]">
                    Availability Time Slots
                  </p>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="rounded-full border border-[#cfd7ea] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff]"
                  >
                    Add Slot
                  </button>
                </div>

                <div className="space-y-3">
                  {formState.availabilitySlots.map((slot, index) => (
                    <article
                      key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`}
                      className="rounded-xl border border-[#dfd4c5] bg-white px-3 py-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                            Day
                          </span>
                          <select
                            value={slot.day}
                            onChange={(event) =>
                              handleSlotFieldChange(index, "day", event.target.value)
                            }
                            className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                          >
                            {DAY_OPTIONS.map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                            Start Time
                          </span>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(event) =>
                              handleSlotFieldChange(index, "startTime", event.target.value)
                            }
                            className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                            End Time
                          </span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(event) =>
                              handleSlotFieldChange(index, "endTime", event.target.value)
                            }
                            className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                          />
                        </label>

                        <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6a59]">
                          <input
                            type="checkbox"
                            checked={slot.isAvailable !== false}
                            onChange={(event) =>
                              handleSlotFieldChange(index, "isAvailable", event.target.checked)
                            }
                            className="size-4 rounded border border-[#ccbca8]"
                          />
                          Active
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(index)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-rose-700 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingProfile
                  ? "Saving..."
                  : profileExists
                    ? "Update Lawyer Profile"
                    : "Create Lawyer Profile"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-[#e6dbc9] bg-white/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#86705b]">
                  Booking Requests
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">
                  User Consultation Queue
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/lawyer/chat"
                  className="rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#2d3d63]"
                >
                  Open Chat
                </Link>
                <button
                  type="button"
                  onClick={loadLawyerPortalData}
                  className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff]"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["all", "pending", "accepted", "rejected"].map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => setBookingStatusFilter(statusOption)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition",
                    bookingStatusFilter === statusOption
                      ? "bg-[#1f2a44] text-white"
                      : "border border-[#d7dded] bg-white text-[#526182] hover:bg-[#eef2ff]"
                  ].join(" ")}
                >
                  {statusOption}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredBookingRequests.length === 0 ? (
                <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
                  No consultation requests in this filter.
                </p>
              ) : (
                filteredBookingRequests.map((request) => (
                  <article
                    key={request.legalConsultationRequestId}
                    className="rounded-xl border border-[#e2d8c9] bg-[#fffaf5] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#26314e]">
                          {request.requester?.fullName || "User"}
                        </p>
                        <p className="text-xs text-[#64708c]">{request.requester?.email}</p>
                      </div>
                      <p
                        className={[
                          "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
                          request.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : request.status === "accepted"
                              ? "bg-emerald-100 text-emerald-700"
                              : request.status === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-200 text-slate-700"
                        ].join(" ")}
                      >
                        {request.status}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-[#51607f]">
                      <p>
                        <span className="font-semibold text-[#33405f]">Case:</span>{" "}
                        {request.caseSummary || "Not provided"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#33405f]">Preferred date:</span>{" "}
                        {formatDateTime(request.preferredDate)}
                      </p>
                      {request.responseNote && (
                        <p>
                          <span className="font-semibold text-[#33405f]">Response note:</span>{" "}
                          {request.responseNote}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-[#33405f]">Requested:</span>{" "}
                        {formatDateTime(request.createdAt)}
                      </p>
                    </div>

                    {Array.isArray(request.history) && request.history.length > 0 && (
                      <p className="mt-2 text-xs text-[#6e7893]">
                        Timeline:{" "}
                        {request.history
                          .slice(-3)
                          .map((item) => `${item.action} (${formatDateTime(item.at)})`)
                          .join(" | ")}
                      </p>
                    )}

                    {request.status === "pending" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            respondingKey ===
                            `${request.legalConsultationRequestId}-accepted`
                          }
                          onClick={() =>
                            handleRespond(request.legalConsultationRequestId, "accepted")
                          }
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={
                            respondingKey ===
                            `${request.legalConsultationRequestId}-rejected`
                          }
                          onClick={() =>
                            handleRespond(request.legalConsultationRequestId, "rejected")
                          }
                          className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            <section className="mt-4 rounded-xl border border-[#e3d8c7] bg-[#fffdf9] px-4 py-3 text-xs text-[#6c7691]">
              <p>
                Active availability slots:{" "}
                {sanitizeAvailabilitySlots(formState.availabilitySlots)
                  .filter((slot) => slot.isAvailable)
                  .map(formatSlot)
                  .join(", ") || "No active slots configured"}
              </p>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}

export default LawyerPortalPage;
