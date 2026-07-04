import { Router } from "express";
import { authenticate, requireCompanyMember } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import * as ctrl from "./masters.controller.js";
import {
    createLedgerGroupSchema, updateLedgerGroupSchema,
    createLedgerSchema, updateLedgerSchema,
    createUnitSchema, updateUnitSchema,
    createStockGroupSchema, updateStockGroupSchema,
    createStockItemSchema, updateStockItemSchema,
    createCustomerSchema, updateCustomerSchema,
    createSupplierSchema, updateSupplierSchema,
} from "./masters.schema.js";

const router = Router();

// All masters routes require auth + company membership (companyId via query)
router.use(authenticate, requireCompanyMember("VIEWER"));

// ─── Ledger Groups ────────────────────────────────────────────────────────────
router.get("/ledger-groups", ctrl.listLedgerGroups);
router.post("/ledger-groups", requireCompanyMember("ACCOUNTANT"), validate(createLedgerGroupSchema), ctrl.createLedgerGroup);
router.get("/ledger-groups/:id", ctrl.getLedgerGroup);
router.patch("/ledger-groups/:id", requireCompanyMember("ACCOUNTANT"), validate(updateLedgerGroupSchema), ctrl.updateLedgerGroup);
router.delete("/ledger-groups/:id", requireCompanyMember("ADMIN"), ctrl.deleteLedgerGroup);

// ─── Ledgers ──────────────────────────────────────────────────────────────────
router.get("/ledgers", ctrl.listLedgers);
router.post("/ledgers", requireCompanyMember("ACCOUNTANT"), validate(createLedgerSchema), ctrl.createLedger);
router.get("/ledgers/:id", ctrl.getLedger);
router.patch("/ledgers/:id", requireCompanyMember("ACCOUNTANT"), validate(updateLedgerSchema), ctrl.updateLedger);
router.delete("/ledgers/:id", requireCompanyMember("ADMIN"), ctrl.deleteLedger);

// ─── Units ────────────────────────────────────────────────────────────────────
router.get("/units", ctrl.listUnits);
router.post("/units", requireCompanyMember("OPERATOR"), validate(createUnitSchema), ctrl.createUnit);
router.get("/units/:id", ctrl.getUnit);
router.patch("/units/:id", requireCompanyMember("OPERATOR"), validate(updateUnitSchema), ctrl.updateUnit);
router.delete("/units/:id", requireCompanyMember("ADMIN"), ctrl.deleteUnit);

// ─── Stock Groups ─────────────────────────────────────────────────────────────
router.get("/stock-groups", ctrl.listStockGroups);
router.post("/stock-groups", requireCompanyMember("OPERATOR"), validate(createStockGroupSchema), ctrl.createStockGroup);
router.get("/stock-groups/:id", ctrl.getStockGroup);
router.patch("/stock-groups/:id", requireCompanyMember("OPERATOR"), validate(updateStockGroupSchema), ctrl.updateStockGroup);
router.delete("/stock-groups/:id", requireCompanyMember("ADMIN"), ctrl.deleteStockGroup);

// ─── Stock Items ──────────────────────────────────────────────────────────────
router.get("/stock-items", ctrl.listStockItems);
router.post("/stock-items", requireCompanyMember("OPERATOR"), validate(createStockItemSchema), ctrl.createStockItem);
router.get("/stock-items/:id", ctrl.getStockItem);
router.patch("/stock-items/:id", requireCompanyMember("OPERATOR"), validate(updateStockItemSchema), ctrl.updateStockItem);
router.delete("/stock-items/:id", requireCompanyMember("ADMIN"), ctrl.deleteStockItem);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get("/customers", ctrl.listCustomers);
router.post("/customers", requireCompanyMember("OPERATOR"), validate(createCustomerSchema), ctrl.createCustomer);
router.get("/customers/:id", ctrl.getCustomer);
router.patch("/customers/:id", requireCompanyMember("OPERATOR"), validate(updateCustomerSchema), ctrl.updateCustomer);
router.delete("/customers/:id", requireCompanyMember("ADMIN"), ctrl.deleteCustomer);

// ─── Suppliers ────────────────────────────────────────────────────────────────
router.get("/suppliers", ctrl.listSuppliers);
router.post("/suppliers", requireCompanyMember("OPERATOR"), validate(createSupplierSchema), ctrl.createSupplier);
router.get("/suppliers/:id", ctrl.getSupplier);
router.patch("/suppliers/:id", requireCompanyMember("OPERATOR"), validate(updateSupplierSchema), ctrl.updateSupplier);
router.delete("/suppliers/:id", requireCompanyMember("ADMIN"), ctrl.deleteSupplier);

export default router;
