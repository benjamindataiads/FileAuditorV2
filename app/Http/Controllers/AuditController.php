<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Events\AuditProgressEvent;

class AuditController extends Controller
{
    public function process(Request $request)
    {
        try {
            \Log::info('Starting audit process', [
                'request_data' => [
                    'rules' => $request->input('rules'),
                    'name' => $request->input('name'),
                    'has_file' => $request->hasFile('file'),
                    'has_mapping' => $request->has('columnMapping')
                ]
            ]);

            // Generate audit ID first thing
            $auditId = uniqid('audit_', true);
            \Log::info('Generated audit ID:', ['auditId' => $auditId]);

            // Get basic info and validate
            $selectedRules = json_decode($request->input('rules', '[]'));
            if (empty($selectedRules)) {
                throw new \Exception('No rules selected');
            }

            $products = Product::all();
            if ($products->isEmpty()) {
                throw new \Exception('No products found');
            }

            $totalProducts = $products->count();
            $rulesPerProduct = count($selectedRules);
            $totalRules = $totalProducts * $rulesPerProduct;

            \Log::info('Calculated totals:', [
                'totalProducts' => $totalProducts,
                'rulesPerProduct' => $rulesPerProduct,
                'totalRules' => $totalRules
            ]);

            // Initialize cache
            $initialProgress = [
                'processed_rules' => 0,
                'total_rules' => $totalRules,
                'status' => 'Starting...'
            ];
            Cache::put("audit_progress_{$auditId}", $initialProgress, 3600);
            \Log::info('Initialized progress cache', ['auditId' => $auditId]);

            // Prepare response
            $responseData = [
                'auditId' => $auditId,
                'totalRules' => $totalRules
            ];

            // Queue background job
            dispatch(function () use ($auditId, $products, $selectedRules, $totalRules) {
                \Log::info('Starting background job', ['auditId' => $auditId]);
                $this->processAuditInBackground($auditId, $products, $selectedRules, $totalRules);
            })->afterResponse();

            \Log::info('Sending response', $responseData);
            return response()->json($responseData);

        } catch (\Exception $e) {
            \Log::error('Process error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getProgress($auditId)
    {
        try {
            $progress = Cache::get("audit_progress_{$auditId}");
            
            \Log::info('Getting progress:', [
                'auditId' => $auditId,
                'cached_data' => $progress,
                'cache_exists' => Cache::has("audit_progress_{$auditId}")
            ]);

            if (!$progress) {
                return response()->json([
                    'progress' => 0,
                    'rulesProcessed' => 0,
                    'totalRules' => 0,
                    'errorCount' => 0
                ]);
            }

            $percentage = $progress['total_rules'] > 0 
                ? round(($progress['processed_rules'] / $progress['total_rules']) * 100) 
                : 0;

            $response = [
                'progress' => $percentage,
                'rulesProcessed' => $progress['processed_rules'],
                'totalRules' => $progress['total_rules'],
                'errorCount' => 0
            ];

            \Log::info('Sending progress response:', ['auditId' => $auditId, 'response' => $response]);
            return response()->json($response);
        } catch (\Exception $e) {
            \Log::error('Error getting progress:', [
                'auditId' => $auditId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function processAuditInBackground($auditId, $products, $selectedRules, $totalRules)
    {
        try {
            $processedRules = 0;

            foreach ($products as $product) {
                foreach ($selectedRules as $ruleId) {
                    $this->processRule($product, $ruleId);
                    $processedRules++;
                    
                    $currentProgress = [
                        'processed_rules' => $processedRules,
                        'total_rules' => $totalRules,
                        'status' => 'Processing...'
                    ];
                    
                    Cache::put("audit_progress_{$auditId}", $currentProgress, 3600);
                    
                    // Broadcast progress event
                    event(new AuditProgressEvent(
                        "Processing rules...",
                        round(($processedRules / $totalRules) * 100)
                    ));
                    
                    if ($processedRules % 10 === 0) {
                        \Log::info("Progress update:", [
                            'auditId' => $auditId,
                            'processed' => $processedRules,
                            'total' => $totalRules,
                            'percentage' => round(($processedRules / $totalRules) * 100)
                        ]);
                    }
                }
            }

            // Update final progress
            Cache::put("audit_progress_{$auditId}", [
                'processed_rules' => $totalRules,
                'total_rules' => $totalRules,
                'status' => 'Completed'
            ], 3600);

            \Log::info("Audit completed:", ['auditId' => $auditId]);

        } catch (\Exception $e) {
            \Log::error('Background processing error:', [
                'auditId' => $auditId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            Cache::put("audit_progress_{$auditId}", [
                'processed_rules' => $processedRules,
                'total_rules' => $totalRules,
                'status' => 'Error: ' . $e->getMessage()
            ], 3600);
        }
    }

    protected function processRule($product, $ruleId)
    {
        // Simulate processing time for testing
        usleep(100000); // 100ms delay
    }
} 