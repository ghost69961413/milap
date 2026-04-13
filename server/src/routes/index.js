import { Router } from "express";
import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import chatRoutes from "./chat.routes.js";
import consultantRoutes from "./consultant.routes.js";
import connectionRoutes from "./connection.routes.js";
import decoratorRoutes from "./decorator.routes.js";
import eventRoutes from "./event.routes.js";
import healthRoutes from "./health.routes.js";
import interactionRoutes from "./interaction.routes.js";
import lawyerRoutes from "./lawyer.routes.js";
import matchRoutes from "./match.routes.js";
import premiumRoutes from "./premium.routes.js";
import profileRoutes from "./profile.routes.js";
import roleRoutes from "./role.routes.js";
import serviceBookingRoutes from "./service-booking.routes.js";
import verificationRoutes from "./verification.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);
router.use("/matches", matchRoutes);
router.use("/interactions", interactionRoutes);
router.use("/chats", chatRoutes);
router.use("/premium", premiumRoutes);
router.use("/role-access", roleRoutes);
router.use("/verifications", verificationRoutes);
router.use("/consultants", consultantRoutes);
router.use("/connections", connectionRoutes);
router.use("/lawyers", lawyerRoutes);
router.use("/decorators", decoratorRoutes);
router.use("/events", eventRoutes);
router.use("/bookings", serviceBookingRoutes);

export default router;
