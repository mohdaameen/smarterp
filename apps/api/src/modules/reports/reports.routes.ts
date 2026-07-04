import { Router } from "express";
import { authenticate, requireCompanyMember } from "../../middlewares/auth.js";
import * as ctrl from "./reports.controller.js";

const router = Router();

router.use(authenticate, requireCompanyMember("VIEWER"));

router.get("/stock-summary", ctrl.stockSummary);
router.get("/sales-register", ctrl.salesRegister);
router.get("/purchase-register", ctrl.purchaseRegister);
router.get("/outstanding-customers", ctrl.outstandingCustomers);
router.get("/outstanding-suppliers", ctrl.outstandingSuppliers);

export default router;
