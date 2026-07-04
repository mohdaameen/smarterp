import { Router } from "express";
import { authenticate, requireCompanyMember } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
    createCompanySchema,
    updateCompanySchema,
    createFinancialYearSchema,
    addMemberSchema,
} from "./companies.schema.js";
import * as controller from "./companies.controller.js";

const router = Router();

router.use(authenticate);

// Company CRUD
router.post("/", validate(createCompanySchema), controller.create);
router.get("/", controller.list);

// Company-specific routes (company membership checked per route)
router.get("/:companyId", requireCompanyMember("VIEWER"), controller.getOne);
router.patch("/:companyId", requireCompanyMember("ADMIN"), validate(updateCompanySchema), controller.update);

// Financial years
router.get("/:companyId/financial-years", requireCompanyMember("VIEWER"), controller.listFY);
router.post("/:companyId/financial-years", requireCompanyMember("ADMIN"), validate(createFinancialYearSchema), controller.createFY);

// Members
router.get("/:companyId/members", requireCompanyMember("ADMIN"), controller.listMembers);
router.post("/:companyId/members", requireCompanyMember("OWNER"), validate(addMemberSchema), controller.addMember);

export default router;
