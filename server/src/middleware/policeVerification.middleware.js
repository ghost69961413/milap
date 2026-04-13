import { assertPoliceVerifiedForCoreAccess } from "../services/verification.service.js";

export async function requirePoliceVerification(req, _res, next) {
  try {
    const verificationInfo = await assertPoliceVerifiedForCoreAccess(req.user.id);
    req.user.policeVerificationStatus = verificationInfo.status;
    next();
  } catch (error) {
    next(error);
  }
}
