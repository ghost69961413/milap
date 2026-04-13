import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openDocumentInNewTab } from "../utils/documentViewer";
import {
  ApiError,
  createDecoratorService,
  getMyDecoratorBookingRequests,
  getMyDecoratorServices,
  getMyVerificationStatus,
  respondDecoratorBookingRequest,
  uploadVerificationDocument,
  updateDecoratorService
} from "../services/matrimonyApi";

const EVENT_TYPE_OPTIONS = [
  "wedding",
  "engagement",
  "reception",
  "sangeet",
  "mehendi",
  "haldi"
];
const BOOKING_STATUS_OPTIONS = ["all", "pending", "accepted", "rejected", "cancelled", "completed"];

const VERIFICATION_DOCUMENT_LABELS = {
  police_verification: "Police Verification",
  government_id: "Government ID Proof",
  law_degree: "Law Degree Certificate",
  additional_optional_document: "Additional Optional Document",
  decorator_owner_government_id: "Decorator Owner Government ID",
  decorator_police_noc: "Police NOC (No Pending Cases)"
};

function createDefaultPricingPackage() {
  return {
    name: "",
    amount: "",
    description: "",
    includes: ""
  };
}

function createDefaultServiceForm() {
  return {
    title: "",
    description: "",
    eventTypes: ["wedding"],
    location: "",
    pricingAmount: "",
    pricingCurrency: "INR",
    pricingType: "per_event",
    pricingPackages: [createDefaultPricingPackage()],
    isActive: true,
    removeImagePublicIds: []
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

function mapServiceToFormState(service) {
  return {
    title: service.title || "",
    description: service.description || "",
    eventTypes: Array.isArray(service.eventTypes) && service.eventTypes.length
      ? service.eventTypes
      : ["wedding"],
    location: service.location || "",
    pricingAmount:
      service.pricing?.amount !== undefined && service.pricing?.amount !== null
        ? String(service.pricing.amount)
        : "",
    pricingCurrency: service.pricing?.currency || "INR",
    pricingType: service.pricing?.pricingType || "per_event",
    pricingPackages:
      Array.isArray(service.pricingPackages) && service.pricingPackages.length
        ? service.pricingPackages.map((pkg) => ({
            name: pkg.name || "",
            amount:
              pkg.amount !== undefined && pkg.amount !== null ? String(pkg.amount) : "",
            description: pkg.description || "",
            includes: Array.isArray(pkg.includes) ? pkg.includes.join(", ") : ""
          }))
        : [createDefaultPricingPackage()],
    isActive: service.isActive !== false,
    removeImagePublicIds: []
  };
}

function buildServicePayload(formState) {
  return {
    title: String(formState.title || "").trim(),
    description: String(formState.description || "").trim(),
    eventTypes: Array.from(
      new Set(
        (Array.isArray(formState.eventTypes) ? formState.eventTypes : [])
          .map((item) => String(item || "").trim().toLowerCase())
          .filter(Boolean)
      )
    ),
    location: String(formState.location || "").trim(),
    pricing: {
      amount: Number(formState.pricingAmount),
      currency: String(formState.pricingCurrency || "INR").trim().toUpperCase(),
      pricingType: String(formState.pricingType || "per_event")
    },
    pricingPackages: (Array.isArray(formState.pricingPackages)
      ? formState.pricingPackages
      : []
    )
      .map((pkg) => ({
        name: String(pkg?.name || "").trim(),
        amount: Number(pkg?.amount),
        description: String(pkg?.description || "").trim(),
        includes: String(pkg?.includes || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      }))
      .filter(
        (pkg) =>
          pkg.name.length >= 2 &&
          Number.isFinite(pkg.amount) &&
          pkg.amount >= 0
      ),
    removeImagePublicIds: formState.removeImagePublicIds || [],
    isActive: Boolean(formState.isActive)
  };
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

function DecoratorPortalPage() {
  const { token } = useAuth();
  const verificationFileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState(false);
  const [uploadingVerificationDocumentType, setUploadingVerificationDocumentType] =
    useState("police_verification");
  const [respondingKey, setRespondingKey] = useState("");
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [serviceForm, setServiceForm] = useState(createDefaultServiceForm);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [errorList, setErrorList] = useState([]);
  const verificationDocuments = getVerificationDocuments(verificationInfo);

  async function loadDecoratorDashboardData() {
    setLoading(true);
    setMessage("");
    setErrorList([]);

    try {
      const [servicesData, bookingData, verificationData] = await Promise.all([
        getMyDecoratorServices(token, { limit: 100 }),
        getMyDecoratorBookingRequests(token, { limit: 100 }),
        getMyVerificationStatus(token)
      ]);

      const fetchedServices = servicesData.services || [];
      setServices(fetchedServices);
      setBookings(bookingData.bookings || []);
      setVerificationInfo(verificationData || null);

      if (selectedServiceId) {
        const selectedService = fetchedServices.find(
          (service) => service.decoratorServiceId === selectedServiceId
        );

        if (selectedService) {
          setServiceForm(mapServiceToFormState(selectedService));
        } else {
          setSelectedServiceId(null);
          setServiceForm(createDefaultServiceForm());
          setPortfolioFiles([]);
        }
      }
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
    loadDecoratorDashboardData();
  }, [token]);

  function handleServiceFieldChange(field, value) {
    setServiceForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleToggleEventType(eventType) {
    setServiceForm((current) => {
      const selectedEventTypes = new Set(current.eventTypes || []);

      if (selectedEventTypes.has(eventType)) {
        selectedEventTypes.delete(eventType);
      } else {
        selectedEventTypes.add(eventType);
      }

      const updatedEventTypes = Array.from(selectedEventTypes);

      return {
        ...current,
        eventTypes: updatedEventTypes.length ? updatedEventTypes : ["wedding"]
      };
    });
  }

  function handlePricingPackageChange(index, field, value) {
    setServiceForm((current) => ({
      ...current,
      pricingPackages: current.pricingPackages.map((pkg, pkgIndex) =>
        pkgIndex === index
          ? {
              ...pkg,
              [field]: value
            }
          : pkg
      )
    }));
  }

  function handleAddPricingPackage() {
    setServiceForm((current) => ({
      ...current,
      pricingPackages: [...current.pricingPackages, createDefaultPricingPackage()]
    }));
  }

  function handleRemovePricingPackage(index) {
    setServiceForm((current) => {
      const updatedPackages = current.pricingPackages.filter(
        (_pkg, pkgIndex) => pkgIndex !== index
      );

      return {
        ...current,
        pricingPackages: updatedPackages.length
          ? updatedPackages
          : [createDefaultPricingPackage()]
      };
    });
  }

  function handlePortfolioImageRemoveToggle(publicId) {
    setServiceForm((current) => {
      const selectedIds = new Set(current.removeImagePublicIds || []);

      if (selectedIds.has(publicId)) {
        selectedIds.delete(publicId);
      } else {
        selectedIds.add(publicId);
      }

      return {
        ...current,
        removeImagePublicIds: Array.from(selectedIds)
      };
    });
  }

  function handlePortfolioFilesChange(event) {
    const files = Array.from(event.target.files || []);
    setPortfolioFiles(files.slice(0, 12));
  }

  function handleStartCreateNewService() {
    setSelectedServiceId(null);
    setServiceForm(createDefaultServiceForm());
    setPortfolioFiles([]);
    setMessage("");
    setErrorList([]);
  }

  function handleSelectServiceForEdit(service) {
    setSelectedServiceId(service.decoratorServiceId);
    setServiceForm(mapServiceToFormState(service));
    setPortfolioFiles([]);
    setMessage("");
    setErrorList([]);
  }

  async function handleSubmitService(event) {
    event.preventDefault();
    setSavingService(true);
    setMessage("");
    setErrorList([]);

    try {
      const payload = buildServicePayload(serviceForm);

      const savedService = selectedServiceId
        ? await updateDecoratorService(token, selectedServiceId, payload, portfolioFiles)
        : await createDecoratorService(token, payload, portfolioFiles);

      setServices((current) => {
        if (selectedServiceId) {
          return current.map((item) =>
            item.decoratorServiceId === selectedServiceId ? savedService : item
          );
        }

        return [savedService, ...current];
      });

      setSelectedServiceId(savedService.decoratorServiceId);
      setServiceForm(mapServiceToFormState(savedService));
      setPortfolioFiles([]);
      setMessage(
        selectedServiceId
          ? "Decorator service listing updated successfully."
          : "Decorator service listing created successfully."
      );
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setSavingService(false);
    }
  }

  async function handleBookingResponse(bookingId, status) {
    const actionKey = `${bookingId}-${status}`;
    setRespondingKey(actionKey);
    setMessage("");
    setErrorList([]);

    try {
      let responseNote;

      if (status === "rejected") {
        responseNote =
          window.prompt("Add rejection note for requester (required):", "") || "";

        if (!responseNote.trim()) {
          setRespondingKey("");
          return;
        }
      } else {
        responseNote = "Booking accepted by decorator";
      }

      const updatedBooking = await respondDecoratorBookingRequest(token, bookingId, {
        status,
        responseNote: responseNote.trim()
      });

      setBookings((current) =>
        current.map((booking) =>
          booking.decoratorBookingId === bookingId ? updatedBooking : booking
        )
      );
      setMessage(
        status === "accepted" ? "Booking accepted." : "Booking rejected."
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

  const pendingBookingsCount = bookings.filter((booking) => booking.status === "pending").length;
  const activeServicesCount = services.filter((service) => service.isActive).length;
  const portfolioImageCount = services.reduce(
    (total, service) => total + (service.portfolioImages?.length || 0),
    0
  );
  const selectedService = selectedServiceId
    ? services.find((service) => service.decoratorServiceId === selectedServiceId) || null
    : null;
  const filteredBookings = bookings.filter((booking) =>
    bookingFilter === "all" ? true : booking.status === bookingFilter
  );

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <article className="rounded-2xl border border-[#f0d9cf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Active Listings</p>
          <p className="mt-2 font-display text-3xl font-semibold">{activeServicesCount}</p>
        </article>
        <article className="rounded-2xl border border-[#f0d9cf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Pending Bookings</p>
          <p className="mt-2 font-display text-3xl font-semibold">{pendingBookingsCount}</p>
        </article>
        <article className="rounded-2xl border border-[#f0d9cf] bg-white/90 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[#8a7a66]">Portfolio Images</p>
          <p className="mt-2 font-display text-3xl font-semibold">{portfolioImageCount}</p>
        </article>
      </motion.section>

      <section className="rounded-3xl border border-[#ddd8f3] bg-white/90 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6a5a86]">
              Verification Documents
            </p>
            <p className="mt-2 text-sm text-[#56607c]">
              Police verification, owner government ID, and police NOC are mandatory.
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
        <section className="rounded-3xl border border-[#e8d6ca] bg-white/90 p-6 text-sm text-[#5b6881]">
          Loading decorator dashboard...
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[#ead8cb] bg-white/90 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#857160]">
                  Service Listings
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">
                  Create and Manage Decorator Services
                </h2>
              </div>
              <button
                type="button"
                onClick={handleStartCreateNewService}
                className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2f3a61] transition hover:bg-[#eef2ff]"
              >
                New Listing
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {services.length === 0 ? (
                <p className="sm:col-span-2 rounded-xl border border-[#e5e2ee] bg-[#fafaff] px-4 py-3 text-sm text-[#5d6884]">
                  No listings yet. Create your first wedding or engagement service.
                </p>
              ) : (
                services.map((service) => (
                  <button
                    key={service.decoratorServiceId}
                    type="button"
                    onClick={() => handleSelectServiceForEdit(service)}
                    className={[
                      "rounded-xl border px-4 py-3 text-left transition",
                      selectedServiceId === service.decoratorServiceId
                        ? "border-[#31406b] bg-[#eff3ff]"
                        : "border-[#e5dacc] bg-[#fffaf5] hover:bg-[#fff5eb]"
                    ].join(" ")}
                  >
                    <p className="font-semibold text-[#25314e]">{service.title}</p>
                    <p className="mt-1 text-xs text-[#61708d]">
                      {service.eventTypes?.join(", ") || "No event types"}
                    </p>
                    <p className="mt-1 text-xs text-[#61708d]">{service.location}</p>
                  </button>
                ))
              )}
            </div>

            <form className="space-y-4" onSubmit={handleSubmitService}>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                  Listing Title
                </span>
                <input
                  type="text"
                  value={serviceForm.title}
                  onChange={(event) => handleServiceFieldChange("title", event.target.value)}
                  placeholder="Premium Wedding Decor Package"
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                  Description
                </span>
                <textarea
                  rows={4}
                  value={serviceForm.description}
                  onChange={(event) =>
                    handleServiceFieldChange("description", event.target.value)
                  }
                  placeholder="Describe themes, stage setup, floral style, and decor quality..."
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                  Event Types
                </span>
                <div className="flex flex-wrap gap-2 rounded-xl border border-[#e5dbcf] bg-[#fffaf5] p-3">
                  {EVENT_TYPE_OPTIONS.map((eventType) => {
                    const selected = serviceForm.eventTypes.includes(eventType);

                    return (
                      <button
                        key={eventType}
                        type="button"
                        onClick={() => handleToggleEventType(eventType)}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition",
                          selected
                            ? "bg-[#1f2a44] text-white"
                            : "border border-[#d7dded] bg-white text-[#526182] hover:bg-[#eef2ff]"
                        ].join(" ")}
                      >
                        {eventType}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                  Location
                </span>
                <input
                  type="text"
                  value={serviceForm.location}
                  onChange={(event) => handleServiceFieldChange("location", event.target.value)}
                  placeholder="Kolkata, West Bengal"
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                    Base Price
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.pricingAmount}
                    onChange={(event) =>
                      handleServiceFieldChange("pricingAmount", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                    Currency
                  </span>
                  <input
                    type="text"
                    value={serviceForm.pricingCurrency}
                    onChange={(event) =>
                      handleServiceFieldChange("pricingCurrency", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6e63]">
                    Pricing Type
                  </span>
                  <select
                    value={serviceForm.pricingType}
                    onChange={(event) =>
                      handleServiceFieldChange("pricingType", event.target.value)
                    }
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  >
                    <option value="per_event">Per Event</option>
                    <option value="per_day">Per Day</option>
                    <option value="custom">Custom Quote</option>
                  </select>
                </label>
              </div>

              <section className="space-y-3 rounded-2xl border border-[#eadfce] bg-[#fffaf5] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f6c5a]">
                    Pricing Packages
                  </p>
                  <button
                    type="button"
                    onClick={handleAddPricingPackage}
                    className="rounded-full border border-[#cfd7ea] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff]"
                  >
                    Add Package
                  </button>
                </div>

                <div className="space-y-3">
                  {serviceForm.pricingPackages.map((pkg, index) => (
                    <article
                      key={`${pkg.name}-${index}`}
                      className="rounded-xl border border-[#e1d6c6] bg-white px-3 py-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                            Package Name
                          </span>
                          <input
                            type="text"
                            value={pkg.name}
                            onChange={(event) =>
                              handlePricingPackageChange(index, "name", event.target.value)
                            }
                            className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                            Amount
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={pkg.amount}
                            onChange={(event) =>
                              handlePricingPackageChange(index, "amount", event.target.value)
                            }
                            className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemovePricingPackage(index)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-rose-700 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                      <label className="mt-3 block">
                        <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                          Includes (comma separated)
                        </span>
                        <input
                          type="text"
                          value={pkg.includes}
                          onChange={(event) =>
                            handlePricingPackageChange(index, "includes", event.target.value)
                          }
                          placeholder="Stage decor, Entrance decor, Floral backdrop"
                          className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.14em] text-[#7f6c5a]">
                          Package Description
                        </span>
                        <textarea
                          rows={2}
                          value={pkg.description}
                          onChange={(event) =>
                            handlePricingPackageChange(index, "description", event.target.value)
                          }
                          className="w-full rounded-lg border border-[#d7c9b8] bg-white px-3 py-2 text-sm outline-none focus:border-[#3e4869]"
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-[#eadfce] bg-[#fffaf5] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f6c5a]">
                  Portfolio Images (Cloudinary)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePortfolioFilesChange}
                  className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none"
                />
                {portfolioFiles.length > 0 && (
                  <p className="text-xs text-[#5e6984]">
                    {portfolioFiles.length} new image(s) selected for upload.
                  </p>
                )}

                {selectedService?.portfolioImages?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedService.portfolioImages.map((image) => {
                      const selectedForRemoval = serviceForm.removeImagePublicIds.includes(
                        image.publicId
                      );

                      return (
                        <label
                          key={image.publicId}
                          className="flex items-center gap-2 rounded-lg border border-[#ddd2c3] bg-white px-3 py-2 text-xs text-[#51607f]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedForRemoval}
                            onChange={() => handlePortfolioImageRemoveToggle(image.publicId)}
                            className="size-4 rounded border border-[#c8b9a7]"
                          />
                          <span className="truncate">{image.publicId}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#51607f]">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(event) =>
                    handleServiceFieldChange("isActive", event.target.checked)
                  }
                  className="size-4 rounded border border-[#ccbca8]"
                />
                Listing is active
              </label>

              <button
                type="submit"
                disabled={savingService}
                className="rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingService
                  ? "Saving..."
                  : selectedServiceId
                    ? "Update Service Listing"
                    : "Create Service Listing"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-[#ead8cb] bg-white/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#86705b]">
                  Booking Management
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">
                  Accept or Reject Requests
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/decorator/chat"
                  className="rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#2d3d63]"
                >
                  Open Chat
                </Link>
                <button
                  type="button"
                  onClick={loadDecoratorDashboardData}
                  className="rounded-full border border-[#cfd7ea] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#2e3a60] transition hover:bg-[#eef2ff]"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {BOOKING_STATUS_OPTIONS.map((statusOption) => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => setBookingFilter(statusOption)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition",
                    bookingFilter === statusOption
                      ? "bg-[#1f2a44] text-white"
                      : "border border-[#d7dded] bg-white text-[#526182] hover:bg-[#eef2ff]"
                  ].join(" ")}
                >
                  {statusOption}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredBookings.length === 0 ? (
                <p className="rounded-xl border border-[#e2e6f3] bg-[#f9faff] px-4 py-3 text-sm text-[#5f6984]">
                  No bookings found in this filter.
                </p>
              ) : (
                filteredBookings.map((booking) => (
                  <article
                    key={booking.decoratorBookingId}
                    className="rounded-xl border border-[#e2d8c9] bg-[#fffaf5] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#26314e]">
                          {booking.requester?.fullName || "User"}
                        </p>
                        <p className="text-xs text-[#64708c]">{booking.requester?.email}</p>
                        <p className="text-xs text-[#64708c]">
                          Service: {booking.service?.title || "N/A"}
                        </p>
                      </div>
                      <p
                        className={[
                          "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]",
                          booking.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : booking.status === "accepted"
                              ? "bg-emerald-100 text-emerald-700"
                              : booking.status === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : booking.status === "completed"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-200 text-slate-700"
                        ].join(" ")}
                      >
                        {booking.status}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-[#51607f]">
                      <p>
                        <span className="font-semibold text-[#33405f]">Event:</span>{" "}
                        {booking.eventType}
                      </p>
                      <p>
                        <span className="font-semibold text-[#33405f]">Event date:</span>{" "}
                        {formatDateTime(booking.eventDate)}
                      </p>
                      <p>
                        <span className="font-semibold text-[#33405f]">Location:</span>{" "}
                        {booking.location}
                      </p>
                      <p>
                        <span className="font-semibold text-[#33405f]">Budget:</span>{" "}
                        {booking.budget ?? "Not provided"}
                      </p>
                      {booking.notes && (
                        <p>
                          <span className="font-semibold text-[#33405f]">Notes:</span>{" "}
                          {booking.notes}
                        </p>
                      )}
                      {booking.responseNote && (
                        <p>
                          <span className="font-semibold text-[#33405f]">Response:</span>{" "}
                          {booking.responseNote}
                        </p>
                      )}
                    </div>

                    {booking.status === "pending" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            respondingKey === `${booking.decoratorBookingId}-accepted`
                          }
                          onClick={() =>
                            handleBookingResponse(booking.decoratorBookingId, "accepted")
                          }
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={
                            respondingKey === `${booking.decoratorBookingId}-rejected`
                          }
                          onClick={() =>
                            handleBookingResponse(booking.decoratorBookingId, "rejected")
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
          </section>
        </div>
      )}
    </div>
  );
}

export default DecoratorPortalPage;
