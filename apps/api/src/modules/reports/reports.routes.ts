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
router.get("/trial-balance", ctrl.trialBalance);
router.get("/balance-sheet", ctrl.balanceSheet);
router.get("/profit-loss", ctrl.profitLoss);
router.get("/cash-flow", ctrl.cashFlow);

export default router;
