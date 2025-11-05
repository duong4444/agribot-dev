# FTS Test Script
# Run this after starting the server with: pnpm run dev

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FTS SETUP TEST SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Test 1: Check if server is running
Write-Host "[1/5] Checking if server is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/public/debug/chunks?limit=1" -Method Get -TimeoutSec 5
    Write-Host "✅ Server is running`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running!" -ForegroundColor Red
    Write-Host "Please start server with: pnpm run dev`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Verify FTS setup
Write-Host "[2/5] Verifying FTS setup..." -ForegroundColor Yellow
try {
    $verify = Invoke-RestMethod -Uri "$baseUrl/public/debug/verify-fts" -Method Get
    
    Write-Host "  Functions exist: " -NoNewline
    if ($verify.verification.functionsExist) {
        Write-Host "✅ YES" -ForegroundColor Green
    } else {
        Write-Host "❌ NO" -ForegroundColor Red
    }
    
    Write-Host "  Index exists: " -NoNewline
    if ($verify.verification.indexExists) {
        Write-Host "✅ YES" -ForegroundColor Green
    } else {
        Write-Host "❌ NO" -ForegroundColor Red
    }
    
    Write-Host "  Chunks with vector: " -NoNewline
    Write-Host "$($verify.verification.chunksWithVector)" -ForegroundColor Cyan
    
    Write-Host "  Chunks missing vector: " -NoNewline
    if ($verify.verification.chunksMissingVector -eq 0) {
        Write-Host "$($verify.verification.chunksMissingVector) ✅" -ForegroundColor Green
    } else {
        Write-Host "$($verify.verification.chunksMissingVector) ⚠️" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # If setup is incomplete, offer to fix
    if (-not $verify.verification.functionsExist -or $verify.verification.chunksMissingVector -gt 0) {
        Write-Host "⚠️  FTS setup is incomplete!" -ForegroundColor Yellow
        Write-Host "Run this command to fix:" -ForegroundColor White
        Write-Host "  psql -U postgres -d agri_chatbot -f fix-fts-setup.sql" -ForegroundColor Cyan
        Write-Host "Or rebuild vectors via API:" -ForegroundColor White
        Write-Host "  Invoke-RestMethod -Uri '$baseUrl/public/debug/rebuild-vectors' -Method Post`n" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Failed to verify FTS setup" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: View sample chunks
Write-Host "[3/5] Viewing sample chunks..." -ForegroundColor Yellow
try {
    $chunks = Invoke-RestMethod -Uri "$baseUrl/public/debug/chunks?limit=3" -Method Get
    Write-Host "  Total chunks in DB: $($chunks.total)" -ForegroundColor Cyan
    
    foreach ($chunk in $chunks.data) {
        Write-Host "  [$($chunk.chunk_id)] $($chunk.loai_cay) - $($chunk.tieu_de_chunk)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed to retrieve chunks`n" -ForegroundColor Red
}

# Test 4: Test search with simple query
Write-Host "[4/5] Testing search: 'bưởi'" -ForegroundColor Yellow
try {
    $search1 = Invoke-RestMethod -Uri "$baseUrl/public/debug/test-search?query=buoi" -Method Get
    
    if ($search1.result.found) {
        Write-Host "  ✅ Found result!" -ForegroundColor Green
        Write-Host "  Confidence: $([math]::Round($search1.result.confidence, 3))" -ForegroundColor Cyan
        Write-Host "  Match: $($search1.result.metadata.loai_cay) - $($search1.result.metadata.tieu_de_chunk)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ No results found" -ForegroundColor Red
        Write-Host "  Confidence: $($search1.result.confidence)" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Search failed`n" -ForegroundColor Red
}

# Test 5: Test search with complex query
Write-Host "[5/5] Testing search: 'cách trị bệnh loét cho bưởi da xanh'" -ForegroundColor Yellow
try {
    $search2 = Invoke-RestMethod -Uri "$baseUrl/public/debug/test-search?query=cach+tri+benh+loet+cho+buoi+da+xanh" -Method Get
    
    if ($search2.result.found) {
        Write-Host "  ✅ Found result!" -ForegroundColor Green
        Write-Host "  Confidence: $([math]::Round($search2.result.confidence, 3))" -ForegroundColor Cyan
        Write-Host "  Match: $($search2.result.metadata.loai_cay) - $($search2.result.metadata.tieu_de_chunk)" -ForegroundColor Gray
        Write-Host "  Rank: $([math]::Round($search2.result.metadata.rank, 4))" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ No results found (This is the problem!)" -ForegroundColor Red
        Write-Host "  Confidence: $($search2.result.confidence)" -ForegroundColor Yellow
        Write-Host "`n  This query should match chunk: 'Bưởi Da Xanh - Bệnh loét'" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Search failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "If tests failed, follow these steps:" -ForegroundColor White
Write-Host "1. Run: psql -U postgres -d agri_chatbot -f fix-fts-setup.sql" -ForegroundColor Cyan
Write-Host "2. Or: Invoke-RestMethod -Uri '$baseUrl/public/debug/rebuild-vectors' -Method Post" -ForegroundColor Cyan
Write-Host "3. Re-run this test script`n" -ForegroundColor Cyan
