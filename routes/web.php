Route::post('/api/audit', [AuditController::class, 'process']);
Route::get('/api/audits/{id}', [AuditController::class, 'getProgress']); 