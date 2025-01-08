<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditProgressEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $percentage;

    public function __construct($message, $percentage)
    {
        $this->message = $message;
        $this->percentage = $percentage;
    }

    public function broadcastOn()
    {
        return new Channel('audit-progress');
    }

    public function broadcastAs()
    {
        return 'audit.progress';
    }
} 