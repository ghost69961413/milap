import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/ApiResponse.js";

export function getHealth(_req, res) {
  return res
    .status(StatusCodes.OK)
    .json(new ApiResponse(StatusCodes.OK, "Server is running", { uptime: process.uptime() }));
}

