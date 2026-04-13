import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openDocumentInNewTab } from "../utils/documentViewer";
import {
  ApiError,
  createConsultantProfile,
  getMyConsultantProfile,
  getPendingVerifications,
  getMyConsultantConnections,
  reviewVerification,
  respondConsultantConnection,
  updateConsultantProfile
} from "../services/matrimonyApi";

const STATUS_FILTER_OPTIONS = ["all", "pending", "accepted", "rejected", "completed"];
const VERIFICATION_DOCUMENT_LABELS = {
  police_verification: "Police Verification",
  government_id: "Government ID Proof",
  additional_optional_document: "Additional Optional Document",
  law_degree: "Law Degree Certificate",
  decorator_owner_government_id: "Decorator Owner Government ID",
  decorator_police_noc: "Police NOC (No Pending Cases)"
};
const AVAILABLE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];
const DEFAULT_PROFILE_FORM = {
  expertiseInput: "",
  about: "",
  availabilityDays: "monday,tuesday,wednesday,thursday,friday",
  startTime: "10:00",
  endTime: "18:00",
  mode: "online",
  availabilityNotes: "",
  amount: "1500",
  currency: "INR",
  unit: "session",
  isActive: true
};

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

function parseCsv(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function toProfileForm(profile) {
  if (!profile) {
    return DEFAULT_PROFILE_FORM;
  }

  return {
    expertiseInput: (profile.expertise || []).join(", "),
    about: profile.about || "",
    availabilityDays: (profile.availability?.days || []).join(", "),
    startTime: profile.availability?.startTime || "10:00",
    endTime: profile.availability?.endTime || "18:00",
    mode: profile.availability?.mode || "online",
    availabilityNotes: profile.availability?.notes || "",
    amount:
      profile.pricing?.amount === undefined || profile.pricing?.amount === null
        ? ""
        : String(profile.pricing.amount),
    currency: profile.pricing?.currency || "INR",
    unit: profile.pricing?.unit || "session",
    isActive: profile.isActive !== false
  };
}

function buildConsultantProfilePayload(form) {
  const expertise = parseCsv(form.expertiseInput);
  const availabilityDays = parseCsv(form.availabilityDays)
    .map((day) => day.toLowerCase())
    .filter((day) => AVAILABLE_DAYS.includes(day));
  const amountNumber = Number(form.amount);

  const validationErrors = [];

  if (expertise.length === 0) {
    validationErrors.push("Please add at least one expertise value.");
  }

  if (availabilityDays.length === 0) {
    validationErrors.push("Please add at least one availability day.");
  }

  if (!Number.isFinite(amountNumber) || amountNumber < 0) {
    validationErrors.push("Pricing amount must be a valid number.");
  }

  if (form.startTime >= form.endTime) {
    validationErrors.push("Availability start time must be earlier than end time.");
  }

  if (validationErrors.length > 0) {
    return {
      payload: null,
      validationErrors
    };
  }

  return {
    payload: {
      expertise,
      about: form.about.trim() || undefined,
      availability: {
        days: availabilityDays,
        startTime: form.startTime,
        endTime: form.endTime,
        mode: form.mode,
        notes: form.availabilityNotes.trim() || undefined
      },
      pricing: {
        amount: amountNumber,
        currency: form.currency.trim() || "INR",
        unit: form.unit
      },
      isActive: Boolean(form.isActive)
    },
    validationErrors: []
  };
}

function getUserVerificationDocuments(verificationUser) {
  const requiredDocuments = Array.isArray(verificationUser?.requiredDocuments)
    ? verificationUser.requiredDocuments
    : [];
  const optionalDocuments = Array.isArray(verificationUser?.optionalDocuments)
    ? verificationUser.optionalDocuments
    : [];
  const allDocuments = [...requiredDocuments, ...optionalDocuments];

  if (allDocuments.length > 0) {
    return allDocuments;
  }

  if (verificationUser?.document?.url) {
    return [
      {
        type: "police_verification",
        label: VERIFICATION_DOCUMENT_LABELS.police_verification,
        required: true,
        uploaded: true,
        document: verificationUser.document
      }
    ];
  }

  return [];
}

function ConsultantPortalPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingKey, setRespondingKey] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [connections, setConnections] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [pendingVerificationsLoading, setPendingVerificationsLoading] = useState(true);
  const [pendingVerificationsRefreshing, setPendingVerificationsRefreshing] = useState(false);
  const [verificationReviewKey, setVerificationReviewKey] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [consultantProfile, setConsultantProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE_FORM);
  const [message, setMessage] = useState("");
  const [errorList, setErrorList] = useState([]);

  async function loadConnections({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    if (!silent) {
      setErrorList([]);
    }

    try {
      const response = await getMyConsultantConnections(token, {
        direction: "incoming",
        limit: 100
      });

      setConnections(response.bookings || []);
    } catch (err) {
      if (!silent) {
        setErrorList(getApiErrorMessages(err));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadPendingVerificationQueue({ silent = false } = {}) {
    if (silent) {
      setPendingVerificationsRefreshing(true);
    } else {
      setPendingVerificationsLoading(true);
      setErrorList([]);
    }

    try {
      const response = await getPendingVerifications(token, { limit: 100 });
      setPendingVerifications(response.users || []);
    } catch (err) {
      if (!silent) {
        setErrorList(getApiErrorMessages(err));
      }
    } finally {
      setPendingVerificationsLoading(false);
      setPendingVerificationsRefreshing(false);
    }
  }

  async function loadConsultantServiceProfile({ silent = false } = {}) {
    if (!silent) {
      setProfileLoading(true);
      setErrorList([]);
    }

    try {
      const profile = await getMyConsultantProfile(token);
      setConsultantProfile(profile);
      setProfileForm(toProfileForm(profile));
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        setConsultantProfile(null);
        setProfileForm(DEFAULT_PROFILE_FORM);
        return;
      }

      if (!silent) {
        setErrorList(getApiErrorMessages(err));
      }
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
    loadPendingVerificationQueue();
    loadConsultantServiceProfile();

    const autoRefreshTimer = window.setInterval(() => {
      loadConnections({ silent: true });
      loadPendingVerificationQueue({ silent: true });
      loadConsultantServiceProfile({ silent: true });
    }, 12000);

    return () => {
      window.clearInterval(autoRefreshTimer);
    };
  }, [token]);

  async function refreshConsultantPortalData() {
    await Promise.all([
      loadConnections({ silent: true }),
      loadPendingVerificationQueue({ silent: true }),
      loadConsultantServiceProfile({ silent: true })
    ]);
  }

  function handleProfileInputChange(field, value) {
    setProfileForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setErrorList([]);

    const { payload, validationErrors } = buildConsultantProfilePayload(profileForm);

    if (validationErrors.length > 0) {
      setErrorList(validationErrors);
      setSavingProfile(false);
      return;
    }

    try {
      const savedProfile = consultantProfile
        ? await updateConsultantProfile(token, payload)
        : await createConsultantProfile(token, payload);

      setConsultantProfile(savedProfile);
      setProfileForm(toProfileForm(savedProfile));
      setMessage(
        consultantProfile
          ? "Consultant service listing updated successfully."
          : "Consultant service listing created successfully."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRespond(connectionId, status) {
    const actionKey = `${connectionId}-${status}`;
    setRespondingKey(actionKey);
    setMessage("");
    setErrorList([]);

    try {
      let responseNote = "";

      if (status === "rejected") {
        responseNote =
          window.prompt("Add rejection reason for this consultation request:", "") || "";

        if (!responseNote.trim()) {
          setRespondingKey("");
          return;
        }
      } else if (status === "completed") {
        responseNote = "Consultation completed";
      } else {
        responseNote = "Consultation accepted";
      }

      const updatedConnection = await respondConsultantConnection(token, connectionId, {
        status,
        responseNote: responseNote.trim()
      });

      setConnections((current) =>
        current.map((item) =>
          item.serviceBookingId === connectionId ? updatedConnection : item
        )
      );
      setMessage(
        status === "accepted"
          ? "Consultation request accepted. Chat is now available."
          : status === "rejected"
            ? "Consultation request rejected."
            : "Consultation marked as completed."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setRespondingKey("");
    }
  }

  async function handleVerificationReview(userId, status) {
    const actionKey = `${userId}-${status}`;
    setVerificationReviewKey(actionKey);
    setMessage("");
    setErrorList([]);

    try {
      let rejectionReason = "";

      if (status === "rejected") {
        rejectionReason =
          window.prompt("Add rejection reason for this verification document:", "") || "";

        if (!rejectionReason.trim()) {
          setVerificationReviewKey("");
          return;
        }
      }

      await reviewVerification(token, userId, {
        status,
        rejectionReason: rejectionReason.trim() || undefined
      });

      await loadPendingVerificationQueue({ silent: true });
      setMessage(
        status === "approved"
          ? "User verification approved successfully."
          : "User verification rejected successfully."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setVerificationReviewKey("");
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

  const filteredConnections = connections.filter((item) =>
    statusFilter === "all" ? true : item.status === statusFilter
  );

  const pendingCount = connections.filter((item) => item.status === "pending").length;
  const acceptedCount = connections.filter((item) => item.status === "accepted").length;
  const completedCount = connections.filter((item) => item.status === "completed").length;
  const pendingVerificationCount = pendingVerifications.length;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <article className="rounded-2xl border border-[#d4e1f6] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6d7893]">Pending</p>
          <p className="mt-2 font-display text-3xl font-semibold">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-[#d4e1f6] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6d7893]">Accepted</p>
          <p className="mt-2 font-display text-3xl font-semibold">{acceptedCount}</p>
        </article>
        <article className="rounded-2xl border border-[#d4e1f6] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6d7893]">Completed</p>
          <p className="mt-2 font-display text-3xl font-semibold">{completedCount}</p>
        </article>
        <article className="rounded-2xl border border-[#d4e1f6] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6d7893]">
            Pending Verifications
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {pendingVerificationCount}
          </p>
        </article>
      </motion.section>

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

      <section className="rounded-3xl border border-[#d6e2f5] bg-white/90 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7893]">
              Consultant Service Listing
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Create or Update Your Service
            </h2>
            <p className="mt-2 text-sm text-[#5a6787]">
              This listing appears in the user service page so users can book you directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadConsultantServiceProfile({ silent: true })}
            disabled={profileLoading || savingProfile}
            className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {profileLoading ? "Loading..." : "Refresh Listing"}
          </button>
        </div>

        {profileLoading ? (
          <p className="mt-4 rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
            Loading your consultant listing...
          </p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Expertise (comma separated)
                </span>
                <input
                  type="text"
                  value={profileForm.expertiseInput}
                  onChange={(event) =>
                    handleProfileInputChange("expertiseInput", event.target.value)
                  }
                  placeholder="marriage planning, family counselling"
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Availability Days (comma separated)
                </span>
                <input
                  type="text"
                  value={profileForm.availabilityDays}
                  onChange={(event) =>
                    handleProfileInputChange("availabilityDays", event.target.value)
                  }
                  placeholder="monday,tuesday,wednesday"
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Start Time
                </span>
                <input
                  type="time"
                  value={profileForm.startTime}
                  onChange={(event) =>
                    handleProfileInputChange("startTime", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  End Time
                </span>
                <input
                  type="time"
                  value={profileForm.endTime}
                  onChange={(event) =>
                    handleProfileInputChange("endTime", event.target.value)
                  }
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Session Mode
                </span>
                <select
                  value={profileForm.mode}
                  onChange={(event) => handleProfileInputChange("mode", event.target.value)}
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="both">Both</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Pricing Amount
                </span>
                <input
                  type="number"
                  min="0"
                  value={profileForm.amount}
                  onChange={(event) => handleProfileInputChange("amount", event.target.value)}
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Currency
                </span>
                <input
                  type="text"
                  value={profileForm.currency}
                  onChange={(event) =>
                    handleProfileInputChange("currency", event.target.value.toUpperCase())
                  }
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm uppercase outline-none focus:border-[#2e3a60]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                  Pricing Unit
                </span>
                <select
                  value={profileForm.unit}
                  onChange={(event) => handleProfileInputChange("unit", event.target.value)}
                  className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#2e3a60]"
                >
                  <option value="session">Per Session</option>
                  <option value="hour">Per Hour</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                About
              </span>
              <textarea
                rows={3}
                value={profileForm.about}
                onChange={(event) => handleProfileInputChange("about", event.target.value)}
                placeholder="Share your consulting experience and style..."
                className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2e3a60]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6988]">
                Availability Notes
              </span>
              <textarea
                rows={2}
                value={profileForm.availabilityNotes}
                onChange={(event) =>
                  handleProfileInputChange("availabilityNotes", event.target.value)
                }
                placeholder="Optional notes about slots and response time..."
                className="w-full rounded-xl border border-[#d7def0] bg-white px-4 py-3 text-sm outline-none focus:border-[#2e3a60]"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-[#344260]">
              <input
                type="checkbox"
                checked={profileForm.isActive}
                onChange={(event) =>
                  handleProfileInputChange("isActive", event.target.checked)
                }
                className="h-4 w-4 rounded border-[#c5cde3] text-[#1f2a44] focus:ring-[#1f2a44]"
              />
              Listing Active
            </label>

            {consultantProfile && (
              <p className="text-xs text-[#5f6c8a]">
                Current listing status:{" "}
                <span className="font-semibold uppercase">
                  {consultantProfile.isActive ? "active" : "inactive"}
                </span>{" "}
                • Last updated: {formatDateTime(consultantProfile.updatedAt)}
              </p>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-full bg-[#1f2a44] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingProfile
                ? "Saving..."
                : consultantProfile
                  ? "Update Listing"
                  : "Create Listing"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-3xl border border-[#d6e2f5] bg-white/90 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7893]">
              User Verification Queue
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Pending Police Verification Documents
            </h2>
          </div>
          <button
            type="button"
            onClick={refreshConsultantPortalData}
            disabled={pendingVerificationsLoading || pendingVerificationsRefreshing}
            className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingVerificationsRefreshing ? "Refreshing..." : "Refresh Queue"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {pendingVerificationsLoading ? (
            <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
              Loading pending verifications...
            </p>
          ) : pendingVerifications.length === 0 ? (
            <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
              No user verification documents are pending right now.
            </p>
          ) : (
            pendingVerifications.map((pendingUser) => (
              <article
                key={pendingUser.userId}
                className="rounded-xl border border-[#dce6f6] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#243154]">
                      {pendingUser.fullName || "User"}
                    </p>
                    <p className="text-xs text-[#60708d]">
                      {pendingUser.email || "No email"}
                    </p>
                  </div>
                  <p className="rounded-full bg-amber-100 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-amber-700">
                    Pending
                  </p>
                </div>

                <div className="mt-3 space-y-1 text-sm text-[#51607f]">
                  <p>
                    <span className="font-semibold text-[#33405f]">Submitted at:</span>{" "}
                    {formatDateTime(pendingUser.submittedAt)}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {getUserVerificationDocuments(pendingUser).map((documentItem) => (
                    <div
                      key={`${pendingUser.userId}-${documentItem.type}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e2e8f6] bg-white px-3 py-2"
                    >
                      <p className="text-xs text-[#394565]">
                        <span className="font-semibold">
                          {documentItem.label ||
                            VERIFICATION_DOCUMENT_LABELS[documentItem.type] ||
                            documentItem.type}
                        </span>{" "}
                        • {documentItem.required ? "Mandatory" : "Optional"}
                      </p>
                      {documentItem.document?.url ? (
                        <a
                          href={documentItem.document.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) =>
                            handleOpenDocument(event, documentItem.document.url)
                          }
                          className="rounded-full border border-[#d0d9ef] bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#2e3a60] transition hover:bg-[#eef2ff]"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#8a95b0]">
                          Not Uploaded
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={verificationReviewKey === `${pendingUser.userId}-approved`}
                    onClick={() => handleVerificationReview(pendingUser.userId, "approved")}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={verificationReviewKey === `${pendingUser.userId}-rejected`}
                    onClick={() => handleVerificationReview(pendingUser.userId, "rejected")}
                    className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6e2f5] bg-white/90 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d7893]">
              Consultant Connection System
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Direct Consultation Requests
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/consultant/chat"
              className="rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#2d3d63]"
            >
              Open Chat
            </Link>
            <button
              type="button"
              onClick={refreshConsultantPortalData}
              disabled={loading || refreshing}
              className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTER_OPTIONS.map((statusOption) => (
            <button
              key={statusOption}
              type="button"
              onClick={() => setStatusFilter(statusOption)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition",
                statusFilter === statusOption
                  ? "bg-[#1f2a44] text-white"
                  : "border border-[#d7dded] bg-white text-[#526182] hover:bg-[#eef2ff]"
              ].join(" ")}
            >
              {statusOption}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
              Loading consultation requests...
            </p>
          ) : filteredConnections.length === 0 ? (
            <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
              No consultant connection requests in this filter.
            </p>
          ) : (
            filteredConnections.map((connection) => (
              <article
                key={connection.serviceBookingId}
                className="rounded-xl border border-[#dce6f6] bg-[#f8fbff] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#243154]">
                      {connection.requester?.fullName || "User"}
                    </p>
                    <p className="text-xs text-[#60708d]">
                      {connection.requester?.email || "No email"}
                    </p>
                  </div>
                  <p
                    className={[
                      "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
                      connection.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : connection.status === "accepted"
                          ? "bg-emerald-100 text-emerald-700"
                          : connection.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-sky-100 text-sky-700"
                    ].join(" ")}
                  >
                    {connection.status}
                  </p>
                </div>

                <div className="mt-3 space-y-1 text-sm text-[#51607f]">
                  <p>
                    <span className="font-semibold text-[#33405f]">Message:</span>{" "}
                    {connection.message || "Not provided"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#33405f]">Preferred date:</span>{" "}
                    {formatDateTime(connection.preferredDate)}
                  </p>
                  <p>
                    <span className="font-semibold text-[#33405f]">Requested at:</span>{" "}
                    {formatDateTime(connection.createdAt)}
                  </p>
                  {connection.responseNote && (
                    <p>
                      <span className="font-semibold text-[#33405f]">Response:</span>{" "}
                      {connection.responseNote}
                    </p>
                  )}
                </div>

                {connection.status === "pending" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        respondingKey === `${connection.serviceBookingId}-accepted`
                      }
                      onClick={() =>
                        handleRespond(connection.serviceBookingId, "accepted")
                      }
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={
                        respondingKey === `${connection.serviceBookingId}-rejected`
                      }
                      onClick={() =>
                        handleRespond(connection.serviceBookingId, "rejected")
                      }
                      className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {connection.status === "accepted" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        respondingKey === `${connection.serviceBookingId}-completed`
                      }
                      onClick={() =>
                        handleRespond(connection.serviceBookingId, "completed")
                      }
                      className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Mark Completed
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default ConsultantPortalPage;
