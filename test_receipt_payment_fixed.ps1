$BASE_URL = "http://localhost:4000/api/v1"
$ErrorActionPreference = "Stop"

function Assert-HasValue {
    param(
        $Value,
        [string]$Label,
        $Response = $null
    )
    if (-not $Value) {
        Write-Host "[FAIL] $Label" -ForegroundColor Red
        if ($Response) {
            Write-Host ($Response.data | ConvertTo-Json -Depth 10)
        }
        exit 1
    }
}

function Invoke-API {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [hashtable]$Body,
        [string]$Token
    )
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $params = @{
        Uri = $Uri
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
    }
    
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        return @{status = $response.StatusCode; data = $content}
    }
    catch {
        if ($_.Exception.Response.StatusCode) {
            $statusCode = $_.Exception.Response.StatusCode
            $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $content = $streamReader.ReadToEnd() | ConvertFrom-Json
            return @{status = $statusCode; data = $content}
        } else {
            Write-Error "API Call Failed: $_"
            return $null
        }
    }
}

Write-Host "=== Registration ===" -ForegroundColor Cyan
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$testEmail = "test_receipt_payment_$timestamp@example.com"
$testPassword = "Test@123456"

$registerBody = @{
    email = $testEmail
    password = $testPassword
    fullName = "Test User"
}
$registerResp = Invoke-API -Uri "$BASE_URL/auth/register" -Method Post -Body $registerBody
Assert-HasValue -Value $registerResp.data.data.id -Label "Registration failed" -Response $registerResp
Write-Host "[OK] User registered" -ForegroundColor Green

Write-Host "
=== Login ===" -ForegroundColor Cyan
$loginBody = @{
    email = $testEmail
    password = $testPassword
}
$loginResp = Invoke-API -Uri "$BASE_URL/auth/login" -Method Post -Body $loginBody
$TOKEN = $loginResp.data.data.accessToken
Assert-HasValue -Value $TOKEN -Label "Login failed" -Response $loginResp
Write-Host "[OK] Login successful" -ForegroundColor Green

Write-Host "
=== Create Company ===" -ForegroundColor Cyan
$companyBody = @{
    name = "Test Company Receipt Payment"
    registrationNumber = "REG-$timestamp"
    gstNumber = "27AABCT1234H1Z0"
}
$companyResp = Invoke-API -Uri "$BASE_URL/companies" -Method Post -Body $companyBody -Token $TOKEN
$COMPANY_ID = $companyResp.data.data.id
Assert-HasValue -Value $COMPANY_ID -Label "Company creation failed" -Response $companyResp
Write-Host "[OK] Company created" -ForegroundColor Green

Write-Host "
=== Create Financial Year ===" -ForegroundColor Cyan
$fyBody = @{
    label = "2026-27"
    startDate = "2026-04-01"
    endDate = "2027-03-31"
    isCurrent = $true
}
$fyResp = Invoke-API -Uri "$BASE_URL/companies/$COMPANY_ID/financial-years" -Method Post -Body $fyBody -Token $TOKEN
$FY_ID = $fyResp.data.data.id
Assert-HasValue -Value $FY_ID -Label "Financial Year creation failed" -Response $fyResp
Write-Host "[OK] Financial Year created" -ForegroundColor Green

Write-Host "
=== Create Ledger Groups ===" -ForegroundColor Cyan
$lgAssetsBody = @{
    name = "Assets"
    nature = "ASSET"
}
$lgAssetsResp = Invoke-API -Uri "$BASE_URL/masters/ledger-groups?companyId=$COMPANY_ID" -Method Post -Body $lgAssetsBody -Token $TOKEN
$LG_ASSETS_ID = $lgAssetsResp.data.data.id
Assert-HasValue -Value $LG_ASSETS_ID -Label "Assets Ledger Group creation failed" -Response $lgAssetsResp
Write-Host "[OK] Assets Ledger Group created" -ForegroundColor Green

$lgDebtorsBody = @{
    name = "Sundry Debtors"
    parentGroupId = $LG_ASSETS_ID
    nature = "ASSET"
}
$lgDebtorsResp = Invoke-API -Uri "$BASE_URL/masters/ledger-groups?companyId=$COMPANY_ID" -Method Post -Body $lgDebtorsBody -Token $TOKEN
$LG_DEBTORS_ID = $lgDebtorsResp.data.data.id
Assert-HasValue -Value $LG_DEBTORS_ID -Label "Debtors Ledger Group creation failed" -Response $lgDebtorsResp
Write-Host "[OK] Debtors Ledger Group created" -ForegroundColor Green

$lgCreditorsBody = @{
    name = "Sundry Creditors"
    nature = "LIABILITY"
}
$lgCreditorsResp = Invoke-API -Uri "$BASE_URL/masters/ledger-groups?companyId=$COMPANY_ID" -Method Post -Body $lgCreditorsBody -Token $TOKEN
$LG_CREDITORS_ID = $lgCreditorsResp.data.data.id
Assert-HasValue -Value $LG_CREDITORS_ID -Label "Creditors Ledger Group creation failed" -Response $lgCreditorsResp
Write-Host "[OK] Creditors Ledger Group created" -ForegroundColor Green

Write-Host "
=== Create Bank Ledger ===" -ForegroundColor Cyan
$bankBody = @{
    ledgerGroupId = $LG_ASSETS_ID
    name = "State Bank of India"
    code = "BNK-001"
    ledgerType = "BANK"
}
$bankResp = Invoke-API -Uri "$BASE_URL/masters/ledgers?companyId=$COMPANY_ID" -Method Post -Body $bankBody -Token $TOKEN
$BANK_ID = $bankResp.data.data.id
Assert-HasValue -Value $BANK_ID -Label "Bank ledger creation failed" -Response $bankResp
Write-Host "[OK] Bank Ledger created" -ForegroundColor Green

Write-Host "
=== Create Customer ===" -ForegroundColor Cyan
$customerBody = @{
    name = "Acme Corp"
    email = "acme@example.com"
    mobile = "9876543210"
    addressJson = @{ billingAddress = "123 Main St" }
    creditLimit = 100000
    ledgerGroupId = $LG_DEBTORS_ID
}
$customerResp = Invoke-API -Uri "$BASE_URL/masters/customers?companyId=$COMPANY_ID" -Method Post -Body $customerBody -Token $TOKEN
$CUSTOMER_ID = $customerResp.data.data.id
$CUSTOMER_LEDGER = $customerResp.data.data.ledgerId
Assert-HasValue -Value $CUSTOMER_ID -Label "Customer creation failed" -Response $customerResp
Assert-HasValue -Value $CUSTOMER_LEDGER -Label "Customer ledger auto-link failed" -Response $customerResp
Write-Host "[OK] Customer created" -ForegroundColor Green

Write-Host "
=== Create Supplier ===" -ForegroundColor Cyan
$supplierBody = @{
    name = "XYZ Traders"
    email = "xyz@example.com"
    mobile = "9988776655"
    addressJson = @{ billingAddress = "456 Industrial Ave" }
    ledgerGroupId = $LG_CREDITORS_ID
}
$supplierResp = Invoke-API -Uri "$BASE_URL/masters/suppliers?companyId=$COMPANY_ID" -Method Post -Body $supplierBody -Token $TOKEN
$SUPPLIER_ID = $supplierResp.data.data.id
$SUPPLIER_LEDGER = $supplierResp.data.data.ledgerId
Assert-HasValue -Value $SUPPLIER_ID -Label "Supplier creation failed" -Response $supplierResp
Assert-HasValue -Value $SUPPLIER_LEDGER -Label "Supplier ledger auto-link failed" -Response $supplierResp
Write-Host "[OK] Supplier created" -ForegroundColor Green

Write-Host "
=== POST Receipt Voucher ===" -ForegroundColor Cyan
$receiptBody = @{
    companyId = $COMPANY_ID
    financialYearId = $FY_ID
    customerId = $CUSTOMER_ID
    bankCashLedgerId = $BANK_ID
    voucherDate = "2026-07-04"
    amount = 10000
    paymentMode = "BANK_TRANSFER"
    narration = "Advance from Acme Corp"
}
$receiptResp = Invoke-API -Uri "$BASE_URL/vouchers/receipt?companyId=$COMPANY_ID" -Method Post -Body $receiptBody -Token $TOKEN
$RECEIPT_ID = $receiptResp.data.data.voucher.id
$RECEIPT_NUM = $receiptResp.data.data.voucher.voucherNumber
$RECEIPT_AMOUNT = $receiptResp.data.data.voucher.totalAmount
Assert-HasValue -Value $RECEIPT_ID -Label "Receipt voucher posting failed" -Response $receiptResp
Write-Host "[OK] Receipt Voucher posted: $RECEIPT_NUM (Rs. $RECEIPT_AMOUNT)" -ForegroundColor Green

Write-Host "
=== POST Payment Voucher ===" -ForegroundColor Cyan
$paymentBody = @{
    companyId = $COMPANY_ID
    financialYearId = $FY_ID
    supplierId = $SUPPLIER_ID
    bankCashLedgerId = $BANK_ID
    voucherDate = "2026-07-04"
    amount = 5000
    paymentMode = "CHEQUE"
    chequeNumber = "CHQ-2025-456"
    narration = "Payment to XYZ Traders"
}
$paymentResp = Invoke-API -Uri "$BASE_URL/vouchers/payment?companyId=$COMPANY_ID" -Method Post -Body $paymentBody -Token $TOKEN
$PAYMENT_ID = $paymentResp.data.data.voucher.id
$PAYMENT_NUM = $paymentResp.data.data.voucher.voucherNumber
$PAYMENT_AMOUNT = $paymentResp.data.data.voucher.totalAmount
Assert-HasValue -Value $PAYMENT_ID -Label "Payment voucher posting failed" -Response $paymentResp
Write-Host "[OK] Payment Voucher posted: $PAYMENT_NUM (Rs. $PAYMENT_AMOUNT)" -ForegroundColor Green

Write-Host "
=== List All Vouchers ===" -ForegroundColor Cyan
$vouchersResp = Invoke-API -Uri "$BASE_URL/vouchers?companyId=$COMPANY_ID" -Method Get -Token $TOKEN
$totalVouchers = @($vouchersResp.data.data).Count
Assert-HasValue -Value $vouchersResp.data.data -Label "Voucher list failed" -Response $vouchersResp
Write-Host "[OK] Total Vouchers: $totalVouchers" -ForegroundColor Green
$vouchersResp.data.data | ForEach-Object {
    Write-Host "    - $($_.voucherNumber) [$($_.voucherType)]: Rs. $($_.totalAmount)" -ForegroundColor Gray
}

Write-Host "
=== GET Receipt Details ===" -ForegroundColor Cyan
$receiptDetailUrl = $BASE_URL + "/vouchers/" + $RECEIPT_ID + "?companyId=" + $COMPANY_ID
$receiptDetailResp = Invoke-API -Uri $receiptDetailUrl -Method Get -Token $TOKEN
$voucher = $receiptDetailResp.data.data
Assert-HasValue -Value $voucher.id -Label "Receipt voucher detail fetch failed" -Response $receiptDetailResp
Write-Host "[OK] Receipt Voucher: $($voucher.voucherNumber)" -ForegroundColor Green
Write-Host "    Type: $($voucher.voucherType), Amount: Rs. $($voucher.totalAmount), Status: $($voucher.status)" -ForegroundColor Gray
$voucher.ledgerEntries | ForEach-Object {
    $debit = if ($_.debitAmount -gt 0) { "DR Rs. $($_.debitAmount)" } else { "" }
    $credit = if ($_.creditAmount -gt 0) { "CR Rs. $($_.creditAmount)" } else { "" }
    Write-Host "      $debit $credit - $($_.remarks)" -ForegroundColor Gray
}

Write-Host "
=== GET Payment Details ===" -ForegroundColor Cyan
$paymentDetailUrl = $BASE_URL + "/vouchers/" + $PAYMENT_ID + "?companyId=" + $COMPANY_ID
$paymentDetailResp = Invoke-API -Uri $paymentDetailUrl -Method Get -Token $TOKEN
$voucher = $paymentDetailResp.data.data
Assert-HasValue -Value $voucher.id -Label "Payment voucher detail fetch failed" -Response $paymentDetailResp
Write-Host "[OK] Payment Voucher: $($voucher.voucherNumber)" -ForegroundColor Green
Write-Host "    Type: $($voucher.voucherType), Amount: Rs. $($voucher.totalAmount), Status: $($voucher.status)" -ForegroundColor Gray
$voucher.ledgerEntries | ForEach-Object {
    $debit = if ($_.debitAmount -gt 0) { "DR Rs. $($_.debitAmount)" } else { "" }
    $credit = if ($_.creditAmount -gt 0) { "CR Rs. $($_.creditAmount)" } else { "" }
    Write-Host "      $debit $credit - $($_.remarks)" -ForegroundColor Gray
}

Write-Host "
[SUCCESS] Receipt and Payment Voucher Test Complete!" -ForegroundColor Green