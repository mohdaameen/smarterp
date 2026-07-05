import { Router } from "express";
import { authenticate, requireCompanyMember } from "../../middlewares/auth.js";
import { validate, validateQuery } from "../../middlewares/validate.js";
import {
    createSalesVoucherSchema,
    createPurchaseVoucherSchema,
    createReceiptVoucherSchema,
    createPaymentVoucherSchema,
    createContraVoucherSchema,
    createCreditNoteVoucherSchema,
    createDebitNoteVoucherSchema,
    createJournalVoucherSchema,
    createInventoryAdjustmentSchema,
    cancelVoucherSchema,
    listVouchersQuerySchema,
} from "./vouchers.schema.js";
import * as ctrl from "./vouchers.controller.js";

const router = Router();

router.use(authenticate, requireCompanyMember("VIEWER"));

router.get("/", validateQuery(listVouchersQuerySchema), ctrl.list);
router.get("/:id", ctrl.getOne);

// Posting requires at least ACCOUNTANT role
router.post("/sales", requireCompanyMember("ACCOUNTANT"), validate(createSalesVoucherSchema), ctrl.postSales);
router.post("/purchase", requireCompanyMember("ACCOUNTANT"), validate(createPurchaseVoucherSchema), ctrl.postPurchase);
router.post("/receipt", requireCompanyMember("ACCOUNTANT"), validate(createReceiptVoucherSchema), ctrl.postReceipt);
router.post("/payment", requireCompanyMember("ACCOUNTANT"), validate(createPaymentVoucherSchema), ctrl.postPayment);
router.post("/contra", requireCompanyMember("ACCOUNTANT"), validate(createContraVoucherSchema), ctrl.postContra);
router.post("/credit-note", requireCompanyMember("ACCOUNTANT"), validate(createCreditNoteVoucherSchema), ctrl.postCreditNote);
router.post("/debit-note", requireCompanyMember("ACCOUNTANT"), validate(createDebitNoteVoucherSchema), ctrl.postDebitNote);
router.post("/journal", requireCompanyMember("ACCOUNTANT"), validate(createJournalVoucherSchema), ctrl.postJournal);
router.post("/inventory-adjustment", requireCompanyMember("ACCOUNTANT"), validate(createInventoryAdjustmentSchema), ctrl.postInventoryAdjustment);

// Cancel requires ADMIN
router.patch("/:id/cancel", requireCompanyMember("ADMIN"), validate(cancelVoucherSchema), ctrl.cancel);

export default router;
