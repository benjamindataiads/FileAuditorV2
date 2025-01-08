<template>
    <div class="progress-container">
        <div class="progress" style="height: 25px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                 :class="{
                     'bg-success': percentage === 100,
                     'bg-danger': hasError
                 }"
                 :style="{ width: `${percentage}%` }" 
                 role="progressbar">
                {{ percentage }}%
            </div>
        </div>
        
        <div class="status-details mt-2">
            <small>
                {{ status }} ({{ processedRules }} of {{ totalRules }} rules processed)
            </small>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            percentage: 0,
            processedRules: 0,
            totalRules: 0,
            status: 'Initializing...',
            hasError: false,
            pollInterval: null
        }
    },
    mounted() {
        this.startPolling();
    },
    methods: {
        startPolling() {
            this.pollInterval = setInterval(this.checkProgress, 1000); // Check every second
        },
        async checkProgress() {
            try {
                const response = await axios.get('/audit/progress');
                const data = response.data;
                
                this.percentage = data.percentage;
                this.processedRules = data.processed_rules;
                this.totalRules = data.total_rules;
                this.status = data.status;
                this.hasError = data.status.toLowerCase().includes('error');

                // Stop polling when complete or on error
                if (this.percentage === 100 || this.hasError) {
                    clearInterval(this.pollInterval);
                }
            } catch (error) {
                console.error('Error checking progress:', error);
                this.hasError = true;
                this.status = 'Error checking progress';
                clearInterval(this.pollInterval);
            }
        }
    },
    beforeDestroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}
</script>

<style scoped>
.progress-container {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 4px;
}
.status-details {
    color: #666;
    margin-top: 8px;
}
</style> 