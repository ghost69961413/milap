import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/animations/PageTransition";
import { useAuth } from "../context/AuthContext";
import {
  ApiError,
  deleteUserByAdmin,
  getAdminUsers,
  getPendingConsultantApprovals,
  promoteConsultantToSecondaryAdmin,
  promoteUserToConsultant,
  reviewConsultantApproval
} from "../services/matrimonyApi";

function getApiErrorMessage(err) {
  if (err instanceof ApiError) {
    return err.message || "Request failed";
  }

  return err?.message || "Request failed";
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "N/A";
  }

  return new Date(dateValue).toLocaleString("en-IN");
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token, user, clearAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewActionKey, setReviewActionKey] = useState("");
  const [userActionKey, setUserActionKey] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [pendingConsultants, setPendingConsultants] = useState([]);

  async function loadDashboard({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [usersData, consultantData] = await Promise.all([
        getAdminUsers(token, { limit: 200 }),
        getPendingConsultantApprovals(token, { limit: 100 })
      ]);

      setUsers(usersData.users || []);
      setPendingConsultants(consultantData.consultants || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [token]);

  async function handleConsultantReview(userId, status) {
    const reviewAction = `consultant-${userId}-${status}`;
    setReviewActionKey(reviewAction);
    setError("");

    try {
      let rejectionReason;

      if (status === "rejected") {
        rejectionReason = window.prompt("Enter consultant rejection reason:", "") || "";
        if (!rejectionReason.trim()) {
          setReviewActionKey("");
          return;
        }
      }

      await reviewConsultantApproval(token, userId, {
        status,
        rejectionReason: rejectionReason?.trim() || undefined
      });
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReviewActionKey("");
    }
  }

  async function handlePromoteUser(userRow) {
    const actionKey = `promote-${userRow.userId}`;
    setUserActionKey(actionKey);
    setError("");

    try {
      await promoteUserToConsultant(token, userRow.userId);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUserActionKey("");
    }
  }

  async function handlePromoteSecondaryAdmin(userRow) {
    const actionKey = `promote-secondary-${userRow.userId}`;
    setUserActionKey(actionKey);
    setError("");

    try {
      await promoteConsultantToSecondaryAdmin(token, userRow.userId);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUserActionKey("");
    }
  }

  async function handleDeleteUser(userRow) {
    const confirmDelete = window.confirm(
      `Delete user "${userRow.fullName}" (${userRow.email})? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    const actionKey = `delete-${userRow.userId}`;
    setUserActionKey(actionKey);
    setError("");

    try {
      await deleteUserByAdmin(token, userRow.userId);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUserActionKey("");
    }
  }

  function handleLogout() {
    clearAuth();
    navigate("/admin/login", { replace: true });
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,rgba(92,118,192,0.2),transparent_30%),radial-gradient(circle_at_88%_15%,rgba(244,171,120,0.2),transparent_30%),linear-gradient(180deg,#f6f9ff_0%,#fff8f2_100%)] px-5 pb-14 pt-8 text-[#1f2a44] lg:px-8">
        <main className="mx-auto max-w-7xl">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-3xl border border-[#dde2f1] bg-white/90 p-6 shadow-xl shadow-[#1f2a44]/5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6e7592]">
                  Admin Dashboard
                </p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                  Control Center
                </h1>
                <p className="mt-2 text-sm text-[#56607a]">
                  Signed in as {user?.fullName} ({user?.email})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadDashboard({ silent: true })}
                  disabled={loading || refreshing}
                  className="rounded-full border border-[#cfd8ee] bg-white px-5 py-2 text-sm font-semibold text-[#2b3658] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-[#1f2a44] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2d3d63]"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.section>

          <section className="mb-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-[#dbe4f8] bg-white/90 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#6a7392]">Total Users</p>
              <p className="mt-2 font-display text-4xl font-semibold">{users.length}</p>
            </article>
            <article className="rounded-2xl border border-[#f2ddce] bg-white/90 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8a6a54]">
                Pending Consultants
              </p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {pendingConsultants.length}
              </p>
            </article>
          </section>

          {error && (
            <p className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {loading ? (
            <section className="rounded-3xl border border-[#dbe2f3] bg-white/90 p-8 text-sm text-[#5a6480]">
              Loading admin data...
            </section>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-[#f0dbc7] bg-white/90 p-6">
                <h2 className="font-display text-2xl font-semibold">Consultant Applications</h2>
                <p className="mt-2 text-sm text-[#5d6680]">
                  Review normal users applying for consultant role.
                </p>

                <div className="mt-4 space-y-3">
                  {pendingConsultants.length === 0 ? (
                    <p className="rounded-xl border border-[#e5e7f0] bg-[#fafbff] px-4 py-3 text-sm text-[#5d6680]">
                      No consultant applications pending.
                    </p>
                  ) : (
                    pendingConsultants.map((consultant) => (
                      <article
                        key={consultant.userId}
                        className="rounded-xl border border-[#eadfce] bg-[#fffbf8] px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{consultant.fullName}</p>
                            <p className="text-sm text-[#5d6680]">{consultant.email}</p>
                            <p className="text-xs text-[#6c7391]">
                              Applied: {formatDate(consultant.consultantRequest?.appliedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={
                                reviewActionKey === `consultant-${consultant.userId}-approved`
                              }
                              onClick={() =>
                                handleConsultantReview(consultant.userId, "approved")
                              }
                              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={
                                reviewActionKey === `consultant-${consultant.userId}-rejected`
                              }
                              onClick={() =>
                                handleConsultantReview(consultant.userId, "rejected")
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

              <section className="rounded-3xl border border-[#dce2f1] bg-white/90 p-6">
                <h2 className="font-display text-2xl font-semibold">All Users</h2>
                <p className="mt-2 text-sm text-[#5d6680]">
                  Combined user registry across roles.
                </p>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[#e1e5f2]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#f5f7ff] text-[#4f5874]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Verification</th>
                        <th className="px-4 py-3 font-semibold">Consultant Request</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((row) => {
                        const currentAdminLevel = user?.adminLevel || "secondary";
                        const isPrimaryAdmin = currentAdminLevel === "primary";
                        const isLawyerOrDecorator =
                          row.role === "lawyer" || row.role === "decorator";
                        const isAdminRow = row.role === "admin";
                        const isSecondaryAdminRow =
                          isAdminRow && (row.adminLevel || "secondary") === "secondary";
                        const isPrimaryAdminRow =
                          isAdminRow && (row.adminLevel || "secondary") === "primary";
                        const canPromoteToConsultant =
                          row.role === "normal_user" && !isLawyerOrDecorator;
                        const canPromoteToSecondaryAdmin =
                          isPrimaryAdmin && row.role === "consultant";
                        const canDeleteUser = isAdminRow
                          ? isPrimaryAdmin &&
                            isSecondaryAdminRow &&
                            row.userId !== user?.id
                          : true;

                        return (
                          <tr key={row.userId} className="border-t border-[#e9ecf7]">
                            <td className="px-4 py-3">{row.fullName}</td>
                            <td className="px-4 py-3">{row.email}</td>
                            <td className="px-4 py-3 uppercase">
                              {row.role}
                              {row.role === "admin" && (
                                <span className="ml-1 text-[0.65rem] font-semibold tracking-[0.08em] text-[#5f6c8d]">
                                  ({row.adminLevel || "secondary"})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 uppercase">
                              {row.policeVerification?.status || "pending"}
                            </td>
                            <td className="px-4 py-3 uppercase">
                              {row.consultantRequest?.status || "none"}
                            </td>
                            <td className="px-4 py-3">
                              {isPrimaryAdminRow ? (
                                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8c95ad]">
                                  Protected
                                </span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  {canPromoteToConsultant && (
                                    <button
                                      type="button"
                                      disabled={userActionKey === `promote-${row.userId}`}
                                      onClick={() => handlePromoteUser(row)}
                                      className="rounded-full bg-[#1f2a44] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#2d3d63] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {userActionKey === `promote-${row.userId}`
                                        ? "Updating..."
                                        : "Make Consultant"}
                                    </button>
                                  )}
                                  {isLawyerOrDecorator && (
                                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8c95ad]">
                                      Consultant N/A
                                    </span>
                                  )}
                                  {canPromoteToSecondaryAdmin && (
                                    <button
                                      type="button"
                                      disabled={
                                        userActionKey ===
                                        `promote-secondary-${row.userId}`
                                      }
                                      onClick={() =>
                                        handlePromoteSecondaryAdmin(row)
                                      }
                                      className="rounded-full bg-[#2d4a2f] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#345838] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {userActionKey ===
                                      `promote-secondary-${row.userId}`
                                        ? "Updating..."
                                        : "Make Secondary Admin"}
                                    </button>
                                  )}
                                  {canDeleteUser && (
                                    <button
                                      type="button"
                                      disabled={userActionKey === `delete-${row.userId}`}
                                      onClick={() => handleDeleteUser(row)}
                                      className="rounded-full bg-rose-600 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {userActionKey === `delete-${row.userId}`
                                        ? "Deleting..."
                                        : "Delete User"}
                                    </button>
                                  )}
                                  {!canPromoteToConsultant &&
                                    !canPromoteToSecondaryAdmin &&
                                    !canDeleteUser && (
                                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8c95ad]">
                                      No Action
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}

export default AdminDashboardPage;
