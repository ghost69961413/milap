import { StatusCodes } from "http-status-codes";

export function notFound(_req, res) {
  return res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Route not found"
  });
}

