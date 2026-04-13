import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "../components/animations/PageTransition";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  createServiceBooking,
  getConsultantServices,
  getDecoratorServices,
  getLawyerServices,
  getMyVerificationStatus,
  requestConsultantConnection
} from "../services/matrimonyApi";

const DEFAULT_BOOKING_STATE = {
  isOpen: false,
  serviceType: "",
  serviceTitle: "",
  providerName: "",
  providerUserId: "",
  serviceListingId: "",
  message: "",
  preferredDate: "",
  eventDate: "",
  eventType: "",
  location: "",
  budget: ""
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

function formatCurrency(pricing) {
  if (!pricing || pricing.amount === undefined || pricing.amount === null) {
    return "Pricing not available";
  }

  const currency = String(pricing.currency || "INR").toUpperCase();
  const amount = Number(pricing.amount);
  const pricingType = pricing.pricingType || pricing.unit || "session";

  if (!Number.isFinite(amount)) {
    return "Pricing not available";
  }

  return `${currency} ${amount.toLocaleString("en-IN")} (${pricingType})`;
}

function UserServicesPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consultants, setConsultants] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [decorators, setDecorators] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [bookingState, setBookingState] = useState(DEFAULT_BOOKING_STATE);
  const [message, setMessage] = useState("");
  const [errorList, setErrorList] = useState([]);

  const isVerifiedForBooking = useMemo(
    () => verificationStatus === "approved",
    [verificationStatus]
  );

  async function loadServices() {
    setLoading(true);
    setMessage("");
    setErrorList([]);

    try {
      const [consultantData, lawyerData, decoratorData, verificationData] =
        await Promise.all([
          getConsultantServices(token, { limit: 40 }),
          getLawyerServices(token, { limit: 40 }),
          getDecoratorServices(token, { limit: 40 }),
          getMyVerificationStatus(token)
        ]);

      setConsultants(consultantData.services || []);
      setLawyers(lawyerData.services || []);
      setDecorators(decoratorData.services || []);
      setVerificationStatus(verificationData?.verificationStatus || "pending");
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [token]);

  function openBookingFlow(service) {
    setMessage("");
    setErrorList([]);

    setBookingState({
      isOpen: true,
      serviceType: service.serviceType,
      serviceTitle: service.title || "Service",
      providerName: service.displayName || "Provider",
      providerUserId: service.providerUserId,
      serviceListingId: service.serviceListingId,
      message: "",
      preferredDate: "",
      eventDate: "",
      eventType:
        service.serviceType === "decorator"
          ? String(service.eventTypes?.[0] || "wedding")
          : "",
      location:
        service.serviceType === "decorator" ? String(service.location || "") : "",
      budget: ""
    });
  }

  function closeBookingFlow() {
    setBookingState(DEFAULT_BOOKING_STATE);
  }

  function handleBookingInputChange(field, value) {
    setBookingState((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setErrorList([]);

    try {
      if (!isVerifiedForBooking) {
        throw new ApiError(
          "Police verification approved status is required before booking services",
          403
        );
      }

      const payload = {
        message: bookingState.message.trim() || undefined
      };

      if (bookingState.serviceType === "consultant") {
        await requestConsultantConnection(token, {
          consultantUserId: bookingState.providerUserId,
          message: payload.message,
          preferredDate: bookingState.preferredDate || undefined
        });
      } else {
        payload.serviceType = bookingState.serviceType;
        payload.providerUserId = bookingState.providerUserId;
        payload.serviceListingId = bookingState.serviceListingId;

        if (bookingState.serviceType === "decorator") {
          payload.eventDate = bookingState.eventDate;
          payload.eventType = bookingState.eventType.trim();
          payload.location = bookingState.location.trim();
          payload.budget = bookingState.budget ? Number(bookingState.budget) : undefined;
        } else {
          payload.preferredDate = bookingState.preferredDate || undefined;
        }

        await createServiceBooking(token, payload);
      }

      setMessage(`Booking request sent to ${bookingState.providerName} successfully.`);
      closeBookingFlow();
    } catch (err) {
      setErrorList(getApiErrorMessages(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,rgba(112,150,214,0.18),transparent_28%),radial-gradient(circle_at_88%_14%,rgba(245,168,124,0.18),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#fff8f2_100%)] text-[#1f2a44]">
        <Navbar />

        <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-3xl border border-[#dfe6f5] bg-white/90 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6e7590]">
              Service Access
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              Book Expert Services From User Portal
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#5a6480]">
              Explore consultants, lawyers, and decorators in one place and request
              bookings directly.
            </p>
          </motion.section>

          {!isVerifiedForBooking && (
            <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
              <p className="text-sm text-amber-700">
                Service booking is locked until police verification is approved. Current status:{" "}
                <span className="font-semibold uppercase">{verificationStatus}</span>
              </p>
            </section>
          )}

          {message && (
            <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3">
              <p className="text-sm text-emerald-700">{message}</p>
            </section>
          )}

          {errorList.length > 0 && (
            <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
              {errorList.map((errorItem) => (
                <p key={errorItem} className="text-sm text-rose-700">
                  {errorItem}
                </p>
              ))}
            </section>
          )}

          {loading ? (
            <section className="rounded-2xl border border-[#e4daca] bg-white/90 px-5 py-4 text-sm text-[#5a6480]">
              Loading services...
            </section>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-[#e4daca] bg-white/90 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-3xl font-semibold">Consult Experts</h2>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#6f7692]">
                    {consultants.length} consultant services
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {consultants.length === 0 ? (
                    <p className="md:col-span-2 rounded-xl border border-[#e7eaf5] bg-[#f9faff] px-4 py-3 text-sm text-[#5e6984]">
                      No consultant services found.
                    </p>
                  ) : (
                    consultants.map((service) => (
                      <article
                        key={service.serviceListingId}
                        className="rounded-2xl border border-[#e2d7c8] bg-[#fffaf5] p-4"
                      >
                        <p className="font-semibold text-[#233052]">{service.displayName}</p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Expertise: {service.expertise?.join(", ") || "Not specified"}
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Pricing: {formatCurrency(service.pricing)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openBookingFlow(service)}
                          className="mt-3 rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2d3d63]"
                        >
                          Request Consultation
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-[#e4daca] bg-white/90 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-3xl font-semibold">Legal Assistance</h2>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#6f7692]">
                    {lawyers.length} lawyer services
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {lawyers.length === 0 ? (
                    <p className="md:col-span-2 rounded-xl border border-[#e7eaf5] bg-[#f9faff] px-4 py-3 text-sm text-[#5e6984]">
                      No lawyer services found.
                    </p>
                  ) : (
                    lawyers.map((service) => (
                      <article
                        key={service.serviceListingId}
                        className="rounded-2xl border border-[#e2d7c8] bg-[#fffaf5] p-4"
                      >
                        <p className="font-semibold text-[#233052]">{service.displayName}</p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Specialization:{" "}
                          {service.specialization?.join(", ") || "Not specified"}
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Experience: {service.experienceYears ?? "N/A"} years
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Pricing: {formatCurrency(service.pricing)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openBookingFlow(service)}
                          className="mt-3 rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2d3d63]"
                        >
                          Book Lawyer
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-[#e4daca] bg-white/90 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-3xl font-semibold">Event Planning</h2>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#6f7692]">
                    {decorators.length} decorator services
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {decorators.length === 0 ? (
                    <p className="md:col-span-2 rounded-xl border border-[#e7eaf5] bg-[#f9faff] px-4 py-3 text-sm text-[#5e6984]">
                      No decorator services found.
                    </p>
                  ) : (
                    decorators.map((service) => (
                      <article
                        key={service.serviceListingId}
                        className="rounded-2xl border border-[#e2d7c8] bg-[#fffaf5] p-4"
                      >
                        <p className="font-semibold text-[#233052]">{service.title}</p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Decorator: {service.displayName}
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Event Types: {service.eventTypes?.join(", ") || "Not specified"}
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Location: {service.location || "Not specified"}
                        </p>
                        <p className="mt-1 text-sm text-[#596482]">
                          Pricing: {formatCurrency(service.pricing)}
                        </p>
                        <button
                          type="button"
                          onClick={() => openBookingFlow(service)}
                          className="mt-3 rounded-full bg-[#1f2a44] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2d3d63]"
                        >
                          Book Decorator
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </main>

        {bookingState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 md:items-center">
            <section className="w-full max-w-2xl rounded-3xl border border-[#e3d8c8] bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#826a56]">
                    Booking Flow
                  </p>
                  <h3 className="mt-1 font-display text-3xl font-semibold text-[#1f2a44]">
                    {bookingState.serviceTitle}
                  </h3>
                  <p className="mt-1 text-sm text-[#5c6680]">
                    Provider: {bookingState.providerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeBookingFlow}
                  className="rounded-full border border-[#d8deee] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#4f5c7e] transition hover:bg-[#f3f6ff]"
                >
                  Close
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleBookingSubmit}>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                    Message
                  </span>
                  <textarea
                    rows={3}
                    value={bookingState.message}
                    onChange={(event) => handleBookingInputChange("message", event.target.value)}
                    placeholder="Share your requirement..."
                    className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                  />
                </label>

                {bookingState.serviceType === "decorator" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                        Event Date
                      </span>
                      <input
                        type="date"
                        required
                        value={bookingState.eventDate}
                        onChange={(event) =>
                          handleBookingInputChange("eventDate", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                        Event Type
                      </span>
                      <input
                        type="text"
                        required
                        value={bookingState.eventType}
                        onChange={(event) =>
                          handleBookingInputChange("eventType", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                        Event Location
                      </span>
                      <input
                        type="text"
                        required
                        value={bookingState.location}
                        onChange={(event) =>
                          handleBookingInputChange("location", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                        Budget (optional)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={bookingState.budget}
                        onChange={(event) =>
                          handleBookingInputChange("budget", event.target.value)
                        }
                        className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[#7b6f63]">
                      Preferred Consultation Date (optional)
                    </span>
                    <input
                      type="date"
                      value={bookingState.preferredDate}
                      onChange={(event) =>
                        handleBookingInputChange("preferredDate", event.target.value)
                      }
                      className="w-full rounded-xl border border-[#dccfbe] bg-white px-4 py-3 text-sm outline-none focus:border-[#3e4869]"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#1f2a44] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Sending..." : "Send Booking Request"}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default UserServicesPage;
