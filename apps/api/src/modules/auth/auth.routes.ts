import { Router } from "express";
import { register, login, refresh, me } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/auth.js";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.get("/me", authenticate, me);

export default router;
